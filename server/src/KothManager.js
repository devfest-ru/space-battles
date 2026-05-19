import fs from 'fs';
import path from 'path';
import { KOTH_CONSTANTS } from './kothConstants.js';
import { GameEngine } from '@space-battles/shared';

// Ensure data directories exist
function ensureDirectories() {
  const dirs = [KOTH_CONSTANTS.DATA_DIR, KOTH_CONSTANTS.REPLAYS_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// King of the Hill tournament manager - fully isolated from the olympic ArenaManager.
export class KothManager {
  constructor() {
    ensureDirectories();
    this.teams = new Map();      // name -> { name, code, codeUpdatedAt, registeredAt }
    this.tournament = null;      // current KOTH tournament or null
    this.onUpdate = null;        // callback for public state updates

    this.loadData();
  }

  // ============ PERSISTENCE ============

  getDataPath(filename) {
    return path.join(KOTH_CONSTANTS.DATA_DIR, filename);
  }

  loadData() {
    try {
      const teamsPath = this.getDataPath('teams.json');
      if (fs.existsSync(teamsPath)) {
        const data = JSON.parse(fs.readFileSync(teamsPath, 'utf-8'));
        this.teams = new Map(Object.entries(data));
      }

      const tournamentPath = this.getDataPath('tournament.json');
      if (fs.existsSync(tournamentPath)) {
        this.tournament = JSON.parse(fs.readFileSync(tournamentPath, 'utf-8'));
        // A round left mid-battle by a server restart cannot continue - mark it collecting again.
        const round = this.getCurrentRound();
        if (round && round.status === 'battling') {
          round.status = 'collecting';
        }
      }
    } catch (error) {
      console.error('Error loading KOTH data:', error);
    }
  }

  saveData() {
    try {
      fs.writeFileSync(
        this.getDataPath('teams.json'),
        JSON.stringify(Object.fromEntries(this.teams), null, 2)
      );
      if (this.tournament) {
        fs.writeFileSync(
          this.getDataPath('tournament.json'),
          JSON.stringify(this.tournament, null, 2)
        );
      }
    } catch (error) {
      console.error('Error saving KOTH data:', error);
    }
  }

  // ============ TEAM REGISTRATION ============

  registerTeam(name) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return { success: false, error: 'Name is required' };
    }
    const trimmedName = name.trim();

    if (this.tournament) {
      return { success: false, error: 'Registration is closed - tournament already started' };
    }
    if (trimmedName === KOTH_CONSTANTS.ADMIN_KING) {
      return { success: false, error: 'Reserved name' };
    }
    if (this.teams.has(trimmedName)) {
      return { success: false, error: 'Name already taken' };
    }

    this.teams.set(trimmedName, {
      name: trimmedName,
      code: null,
      codeUpdatedAt: null,
      registeredAt: Date.now(),
    });

    this.saveData();
    this.notifyUpdate();
    return { success: true };
  }

  // ============ CODE SUBMISSION ============

  submitCode(name, code) {
    if (!this.teams.has(name)) {
      return { success: false, error: 'Team not found' };
    }
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return { success: false, error: 'Code is required' };
    }
    // Code can be changed before the tournament starts or while a round is collecting code,
    // but not while battles are running.
    const round = this.getCurrentRound();
    if (round && round.status === 'battling') {
      return { success: false, error: 'Cannot change code while battles are running' };
    }

    const team = this.teams.get(name);
    team.code = code;
    team.codeUpdatedAt = Date.now();

    this.saveData();
    this.notifyUpdate();
    return { success: true };
  }

  // ============ TOURNAMENT LIFECYCLE ============

  createTournament(kingCode) {
    if (this.tournament) {
      return { success: false, error: 'Tournament already exists' };
    }
    if (!kingCode || typeof kingCode !== 'string' || kingCode.trim().length === 0) {
      return { success: false, error: 'Starting king code is required' };
    }
    if (this.teams.size < KOTH_CONSTANTS.MIN_TEAMS) {
      return { success: false, error: `Need at least ${KOTH_CONSTANTS.MIN_TEAMS} registered team(s)` };
    }

    this.tournament = {
      id: Date.now().toString(),
      status: 'running',
      kingName: KOTH_CONSTANTS.ADMIN_KING,
      adminKingCode: kingCode,
      rounds: [],
      winner: null,
      createdAt: Date.now(),
      completedAt: null,
    };

    this.saveData();
    this.notifyUpdate();
    return { success: true };
  }

  // Update the starting king's code (only valid while king is the admin pseudo-team).
  updateKingCode(code) {
    if (!this.tournament) {
      return { success: false, error: 'No tournament' };
    }
    if (this.tournament.kingName !== KOTH_CONSTANTS.ADMIN_KING) {
      return { success: false, error: 'Current king is a team - edit its code via the team editor' };
    }
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return { success: false, error: 'Code is required' };
    }
    const round = this.getCurrentRound();
    if (round && round.status === 'battling') {
      return { success: false, error: 'Cannot change code while battles are running' };
    }

    this.tournament.adminKingCode = code;
    this.saveData();
    this.notifyUpdate();
    return { success: true, message: 'King algorithm updated' };
  }

  // Open a new round - teams may now (re)submit their code.
  startRound(K) {
    if (!this.tournament || this.tournament.status !== 'running') {
      return { success: false, error: 'No running tournament' };
    }
    const k = parseInt(K, 10);
    if (!Number.isInteger(k) || k < 1) {
      return { success: false, error: 'K must be a positive integer' };
    }
    const current = this.getCurrentRound();
    if (current && current.status !== 'finished') {
      return { success: false, error: 'Previous round is not finished' };
    }

    this.tournament.rounds.push({
      index: this.tournament.rounds.length,
      K: k,
      status: 'collecting',
      kingName: this.tournament.kingName,
      kingCode: null,        // frozen when battles start
      series: {},
      newKing: null,
      startedAt: Date.now(),
      finishedAt: null,
    });

    this.saveData();
    this.notifyUpdate();
    return { success: true };
  }

  // Freeze the king's code and run every challenger's series against it.
  async runRound() {
    if (!this.tournament || this.tournament.status !== 'running') {
      return { success: false, error: 'No running tournament' };
    }
    const round = this.getCurrentRound();
    if (!round || round.status !== 'collecting') {
      return { success: false, error: 'No round awaiting battles' };
    }

    round.kingCode = this.getKingCode(round.kingName);
    if (!round.kingCode) {
      return { success: false, error: 'King has no code' };
    }
    round.status = 'battling';

    // Challengers = every team except the team that is currently king.
    const challengers = Array.from(this.teams.values())
      .filter(t => t.name !== round.kingName);

    for (const team of challengers) {
      round.series[team.name] = {
        teamName: team.name,
        status: 'pending',
        gamesPlayed: 0,
        teamWins: 0,
        kingWins: 0,
        draws: 0,
        beatKing: false,
        survivingShipsInWins: 0,
        totalSeriesTime: 0,
        games: [],
      };
    }

    this.saveData();
    this.notifyUpdate();

    // All series run concurrently - every team fights the king at the same time.
    await Promise.all(
      challengers.map((team, i) => this.runSeries(round, team, i))
    );

    this.finishRound(round);
    return { success: true };
  }

  finishRound(round) {
    const winners = Object.values(round.series).filter(s => s.beatKing);

    let newKing;
    if (winners.length === 0) {
      newKing = round.kingName; // king holds
    } else if (winners.length === 1) {
      newKing = winners[0].teamName;
    } else {
      // Tie-break: more surviving ships across winning games, then less total series time.
      winners.sort((a, b) => {
        if (b.survivingShipsInWins !== a.survivingShipsInWins) {
          return b.survivingShipsInWins - a.survivingShipsInWins;
        }
        return a.totalSeriesTime - b.totalSeriesTime;
      });
      newKing = winners[0].teamName;
    }

    round.newKing = newKing;
    round.status = 'finished';
    round.finishedAt = Date.now();
    this.tournament.kingName = newKing;

    this.saveData();
    this.notifyUpdate();
  }

  // Run one challenger's series against the frozen king.
  async runSeries(round, team, teamIndex) {
    const series = round.series[team.name];
    const challengerCode = team.code;

    if (!challengerCode) {
      series.status = 'no_code';
      this.saveData();
      this.notifyUpdate();
      return;
    }

    series.status = 'running';
    this.notifyUpdate();

    const K = round.K;
    const gameLimit = (2 * K - 1) + KOTH_CONSTANTS.MAX_DRAWS;
    const seriesId = `${this.tournament.id}_r${round.index}_t${teamIndex}`;
    let gameIndex = 0;

    while (series.teamWins < K && series.kingWins < K && series.gamesPlayed < gameLimit) {
      const result = await this.runGame(challengerCode, round.kingCode, seriesId, gameIndex);

      series.games.push({
        seriesId,
        gameIndex,
        winner: result.winner,
        duration: result.duration,
      });
      series.gamesPlayed++;
      series.totalSeriesTime += result.duration;

      if (result.winner === 1) {
        series.teamWins++;
        series.survivingShipsInWins += result.challengerShipsAlive;
      } else if (result.winner === 2) {
        series.kingWins++;
      } else {
        series.draws++; // draw - replayed, counts for nobody
      }

      gameIndex++;

      if (series.teamWins < K && series.kingWins < K && series.gamesPlayed < gameLimit) {
        if (KOTH_CONSTANTS.DELAY_BETWEEN_GAMES > 0) {
          await this.delay(KOTH_CONSTANTS.DELAY_BETWEEN_GAMES);
        }
      }
    }

    // Series outcome: K wins decides it; if the game limit is hit first, more wins decides,
    // and an equal score means the king holds.
    if (series.teamWins >= K) {
      series.beatKing = true;
    } else if (series.kingWins >= K) {
      series.beatKing = false;
    } else {
      series.beatKing = series.teamWins > series.kingWins;
    }
    series.status = 'done';

    this.saveData();
    this.notifyUpdate();
  }

  // Simulate a single game: challenger is player 1, king is player 2.
  runGame(challengerCode, kingCode, seriesId, gameIndex) {
    return new Promise((resolve) => {
      const engine = new GameEngine();
      engine.setPlayerCode(1, challengerCode);
      engine.setPlayerCode(2, kingCode);

      const startResult = engine.startGame();
      if (!startResult.success) {
        resolve({ winner: 'draw', duration: 0, challengerShipsAlive: 0 });
        return;
      }

      const snapshots = [];
      let lastSnapshotTime = 0;

      const gameLoop = setInterval(() => {
        const state = engine.tick();

        if (engine.gameTime - lastSnapshotTime >= 100) {
          snapshots.push({
            time: engine.gameTime,
            ships: state.ships,
            rockets: state.rockets,
            events: state.events,
          });
          lastSnapshotTime = engine.gameTime;
        }

        if (!state.isRunning) {
          clearInterval(gameLoop);

          const challengerShipsAlive = state.ships
            .filter(s => s.playerId === 1 && s.isAlive).length;

          const replay = {
            seriesId,
            gameIndex,
            winner: state.winner,
            duration: engine.gameTime,
            snapshots,
            finalState: state,
          };
          this.saveReplay(seriesId, gameIndex, replay);

          resolve({
            winner: state.winner,
            duration: engine.gameTime,
            challengerShipsAlive,
          });
        }
      }, 16);
    });
  }

  // ============ REPLAYS ============

  saveReplay(seriesId, gameIndex, replay) {
    const filename = `${seriesId}_g${gameIndex}.json`;
    const filepath = path.join(KOTH_CONSTANTS.REPLAYS_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(replay));
  }

  getReplay(seriesId, gameIndex) {
    const filename = `${seriesId}_g${gameIndex}.json`;
    const filepath = path.join(KOTH_CONSTANTS.REPLAYS_DIR, filename);
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
    return null;
  }

  // ============ FINISH / RESET ============

  finishTournament() {
    if (!this.tournament || this.tournament.status !== 'running') {
      return { success: false, error: 'No running tournament' };
    }
    const round = this.getCurrentRound();
    if (round && round.status === 'battling') {
      return { success: false, error: 'Cannot finish while battles are running' };
    }

    this.tournament.status = 'completed';
    this.tournament.winner = this.tournament.kingName;
    this.tournament.completedAt = Date.now();

    this.saveData();
    this.notifyUpdate();
    return { success: true, winner: this.tournament.winner };
  }

  // Wipe everything and reopen registration.
  resetAll() {
    const round = this.getCurrentRound();
    if (round && round.status === 'battling') {
      return { success: false, error: 'Cannot reset while battles are running' };
    }

    this.teams.clear();
    this.tournament = null;

    const tournamentPath = this.getDataPath('tournament.json');
    if (fs.existsSync(tournamentPath)) fs.unlinkSync(tournamentPath);
    const teamsPath = this.getDataPath('teams.json');
    if (fs.existsSync(teamsPath)) fs.unlinkSync(teamsPath);

    if (fs.existsSync(KOTH_CONSTANTS.REPLAYS_DIR)) {
      for (const f of fs.readdirSync(KOTH_CONSTANTS.REPLAYS_DIR)) {
        fs.unlinkSync(path.join(KOTH_CONSTANTS.REPLAYS_DIR, f));
      }
    }

    this.notifyUpdate();
    return { success: true };
  }

  // ============ HELPERS ============

  getCurrentRound() {
    if (!this.tournament || this.tournament.rounds.length === 0) return null;
    return this.tournament.rounds[this.tournament.rounds.length - 1];
  }

  getKingCode(kingName) {
    if (kingName === KOTH_CONSTANTS.ADMIN_KING) {
      return this.tournament ? this.tournament.adminKingCode : null;
    }
    const team = this.teams.get(kingName);
    return team ? team.code : null;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  notifyUpdate() {
    if (this.onUpdate) {
      this.onUpdate(this.getPublicState());
    }
  }

  // Public state - never exposes any team's or king's code.
  getPublicState() {
    return {
      registrationOpen: !this.tournament,
      teams: Array.from(this.teams.values()).map(t => ({
        name: t.name,
        hasCode: !!t.code,
        codeUpdatedAt: t.codeUpdatedAt,
        registeredAt: t.registeredAt,
      })),
      tournament: this.tournament ? {
        id: this.tournament.id,
        status: this.tournament.status,
        kingName: this.tournament.kingName,
        winner: this.tournament.winner,
        createdAt: this.tournament.createdAt,
        completedAt: this.tournament.completedAt,
        rounds: this.tournament.rounds.map(r => ({
          index: r.index,
          K: r.K,
          status: r.status,
          kingName: r.kingName,
          newKing: r.newKing,
          startedAt: r.startedAt,
          finishedAt: r.finishedAt,
          series: Object.values(r.series),
        })),
      } : null,
    };
  }

  // Admin state - includes every team's code and the admin king's code.
  getAdminState() {
    const pub = this.getPublicState();
    return {
      ...pub,
      teamsCode: Array.from(this.teams.values()).map(t => ({
        name: t.name,
        code: t.code,
      })),
      adminKingCode: this.tournament ? this.tournament.adminKingCode : null,
    };
  }
}

export default KothManager;

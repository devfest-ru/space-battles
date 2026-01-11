import fs from 'fs';
import path from 'path';
import { TOURNAMENT_CONSTANTS } from './tournamentConstants.js';
import { GameEngine } from '@space-battles/shared';

// Ensure data directories exist
function ensureDirectories() {
  const dirs = [TOURNAMENT_CONSTANTS.DATA_DIR, TOURNAMENT_CONSTANTS.REPLAYS_DIR];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

export class ArenaManager {
  constructor() {
    ensureDirectories();
    this.players = new Map();        // name -> { name, code, submittedAt }
    this.tournament = null;          // Current tournament state
    this.matches = new Map();        // matchId -> match data
    this.tournamentHistory = [];     // Array of past tournaments
    this.currentChampion = null;     // Current champion name
    this.onUpdate = null;            // Callback for state updates
    
    // Load existing data
    this.loadData();
    
    // Auto-archive any completed tournament from previous session
    if (this.tournament && this.tournament.status === 'completed') {
      console.log('Found completed tournament from previous session, auto-archiving...');
      this.autoArchiveTournament();
    }
  }

  // ============ PERSISTENCE ============
  
  getDataPath(filename) {
    return path.join(TOURNAMENT_CONSTANTS.DATA_DIR, filename);
  }

  loadData() {
    try {
      const playersPath = this.getDataPath('players.json');
      if (fs.existsSync(playersPath)) {
        const data = JSON.parse(fs.readFileSync(playersPath, 'utf-8'));
        this.players = new Map(Object.entries(data));
      }
      
      const tournamentPath = this.getDataPath('tournament.json');
      if (fs.existsSync(tournamentPath)) {
        this.tournament = JSON.parse(fs.readFileSync(tournamentPath, 'utf-8'));
      }
      
      const matchesPath = this.getDataPath('matches.json');
      if (fs.existsSync(matchesPath)) {
        const data = JSON.parse(fs.readFileSync(matchesPath, 'utf-8'));
        this.matches = new Map(Object.entries(data));
      }
      
      const historyPath = this.getDataPath('history.json');
      if (fs.existsSync(historyPath)) {
        const data = JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
        const history = data.history || [];
        // Deduplicate history by tournament ID
        const seenIds = new Set();
        this.tournamentHistory = history.filter(t => {
          if (seenIds.has(t.id)) {
            console.log(`Removing duplicate tournament ${t.id} from history`);
            return false;
          }
          seenIds.add(t.id);
          return true;
        });
        this.currentChampion = data.currentChampion || null;
      }
    } catch (error) {
      console.error('Error loading arena data:', error);
    }
  }

  saveData() {
    try {
      fs.writeFileSync(
        this.getDataPath('players.json'),
        JSON.stringify(Object.fromEntries(this.players), null, 2)
      );
      
      if (this.tournament) {
        fs.writeFileSync(
          this.getDataPath('tournament.json'),
          JSON.stringify(this.tournament, null, 2)
        );
      }
      
      fs.writeFileSync(
        this.getDataPath('matches.json'),
        JSON.stringify(Object.fromEntries(this.matches), null, 2)
      );
      
      // Save tournament history and current champion
      fs.writeFileSync(
        this.getDataPath('history.json'),
        JSON.stringify({
          history: this.tournamentHistory,
          currentChampion: this.currentChampion
        }, null, 2)
      );
    } catch (error) {
      console.error('Error saving arena data:', error);
    }
  }

  // ============ PLAYER MANAGEMENT ============
  
  registerPlayer(name) {
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return { success: false, error: 'Name is required' };
    }
    
    const trimmedName = name.trim();
    
    if (trimmedName.length < 2 || trimmedName.length > 20) {
      return { success: false, error: 'Name must be 2-20 characters' };
    }
    
    if (this.players.has(trimmedName)) {
      return { success: false, error: 'Name already taken' };
    }
    
    if (this.tournament && this.tournament.status === 'running') {
      return { success: false, error: 'Cannot register during active tournament' };
    }
    
    this.players.set(trimmedName, {
      name: trimmedName,
      code: null,
      submittedAt: null,
      registeredAt: Date.now(),
    });
    
    this.saveData();
    this.notifyUpdate();
    
    return { success: true, player: this.players.get(trimmedName) };
  }

  submitCode(name, code) {
    if (!this.players.has(name)) {
      return { success: false, error: 'Player not found' };
    }
    
    if (this.tournament && this.tournament.status === 'running') {
      return { success: false, error: 'Cannot update code during active tournament' };
    }
    
    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return { success: false, error: 'Code is required' };
    }
    
    const player = this.players.get(name);
    player.code = code;
    player.submittedAt = Date.now();
    
    this.saveData();
    this.notifyUpdate();
    
    return { success: true };
  }

  getPlayers() {
    return Array.from(this.players.values()).map(p => ({
      name: p.name,
      hasCode: !!p.code,
      submittedAt: p.submittedAt,
      registeredAt: p.registeredAt,
    }));
  }

  getPlayerCode(name) {
    const player = this.players.get(name);
    return player ? player.code : null;
  }

  // ============ TOURNAMENT MANAGEMENT ============
  
  createTournament(options = {}) {
    // Get players with submitted code
    const eligiblePlayers = Array.from(this.players.values())
      .filter(p => p.code)
      .map(p => p.name);
    
    if (eligiblePlayers.length < TOURNAMENT_CONSTANTS.MIN_PLAYERS) {
      return { 
        success: false, 
        error: `Need at least ${TOURNAMENT_CONSTANTS.MIN_PLAYERS} players with code submitted` 
      };
    }
    
    // Shuffle players for random seeding
    const shuffled = this.shuffleArray([...eligiblePlayers]);
    
    // Generate bracket
    const bracket = this.generateBracket(shuffled);
    
    // Use custom settings or fall back to defaults
    const bestOf = options.bestOf || TOURNAMENT_CONSTANTS.BEST_OF;
    const maxDraws = options.maxDraws || TOURNAMENT_CONSTANTS.MAX_DRAWS;
    
    this.tournament = {
      id: Date.now().toString(),
      status: 'running',
      players: shuffled,
      bracket: bracket,
      currentRound: 0,
      createdAt: Date.now(),
      completedAt: null,
      winner: null,
      settings: { bestOf, maxDraws },  // Store tournament settings
    };
    
    this.saveData();
    this.notifyUpdate();
    
    // Start running the tournament
    this.runTournament();
    
    return { success: true, tournament: this.getTournamentState() };
  }

  generateBracket(players) {
    const numPlayers = players.length;
    
    // Calculate number of rounds needed
    const numRounds = Math.ceil(Math.log2(numPlayers));
    const bracketSize = Math.pow(2, numRounds);
    
    // First round matches
    const firstRoundMatches = [];
    const numByes = bracketSize - numPlayers;
    
    // Players who get byes advance directly
    const byePlayers = players.slice(0, numByes);
    const matchPlayers = players.slice(numByes);
    
    // Create first round matches
    for (let i = 0; i < matchPlayers.length; i += 2) {
      const matchId = `r0_m${firstRoundMatches.length}`;
      firstRoundMatches.push({
        id: matchId,
        round: 0,
        player1: matchPlayers[i],
        player2: matchPlayers[i + 1] || null, // Could be bye
        games: [],
        winner: null,
        status: 'pending',
      });
    }
    
    // Build bracket structure
    const bracket = {
      rounds: numRounds,
      byePlayers: byePlayers,
      matches: [firstRoundMatches],
    };
    
    // Generate placeholder matches for subsequent rounds
    let prevRoundSize = Math.ceil(bracketSize / 2);
    for (let round = 1; round < numRounds; round++) {
      const roundMatches = [];
      const numMatches = prevRoundSize / 2;
      
      for (let i = 0; i < numMatches; i++) {
        roundMatches.push({
          id: `r${round}_m${i}`,
          round: round,
          player1: null, // TBD from previous round
          player2: null,
          games: [],
          winner: null,
          status: 'pending',
        });
      }
      
      bracket.matches.push(roundMatches);
      prevRoundSize = numMatches;
    }
    
    return bracket;
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  async runTournament() {
    if (!this.tournament || this.tournament.status !== 'running') return;
    
    const bracket = this.tournament.bracket;
    
    // Process bye players first - they advance to round 1
    if (bracket.byePlayers.length > 0 && bracket.matches.length > 1) {
      const round1 = bracket.matches[1];
      let byeIndex = 0;
      
      for (const match of round1) {
        if (!match.player1 && byeIndex < bracket.byePlayers.length) {
          match.player1 = bracket.byePlayers[byeIndex++];
        }
      }
    }
    
    // Run each round
    for (let roundIndex = 0; roundIndex < bracket.matches.length; roundIndex++) {
      this.tournament.currentRound = roundIndex;
      this.saveData();
      this.notifyUpdate();
      
      const round = bracket.matches[roundIndex];
      
      // Run all matches in this round
      for (const match of round) {
        if (match.status === 'completed') continue;
        if (!match.player1 || !match.player2) {
          // If only one player, they auto-advance
          if (match.player1 && !match.player2) {
            match.winner = match.player1;
            match.status = 'completed';
            this.advanceWinner(roundIndex, match);
          }
          continue;
        }
        
        await this.runMatch(match);
        this.advanceWinner(roundIndex, match);
        
        this.saveData();
        this.notifyUpdate();
        
        // Delay between matches
        await this.delay(TOURNAMENT_CONSTANTS.DELAY_BETWEEN_MATCHES);
      }
    }
    
    // Tournament complete
    const finalMatch = bracket.matches[bracket.matches.length - 1][0];
    this.tournament.winner = finalMatch.winner;
    this.tournament.status = 'completed';
    this.tournament.completedAt = Date.now();
    
    // Update current champion
    this.currentChampion = finalMatch.winner;
    
    this.saveData();
    this.notifyUpdate();
    
    // Auto-archive completed tournament after a short delay
    setTimeout(() => {
      this.autoArchiveTournament();
    }, 3000); // 3 second delay so users can see the final result
  }
  
  autoArchiveTournament() {
    if (!this.tournament || this.tournament.status !== 'completed') {
      return;
    }
    
    const tournamentId = this.tournament.id;
    
    // Check if already archived (prevent duplicates)
    if (this.tournamentHistory.some(t => t.id === tournamentId)) {
      console.log(`Tournament ${tournamentId} already in history, skipping archive`);
      // Still clear the active tournament to prevent future attempts
      this.tournament = null;
      this.matches.clear();
      this.saveData();
      this.notifyUpdate();
      return;
    }
    
    console.log(`Auto-archiving tournament ${tournamentId}, winner: ${this.tournament.winner}`);
    
    // Archive to history
    this.tournamentHistory.unshift({
      id: tournamentId,
      winner: this.tournament.winner,
      playerCount: this.tournament.players.length,
      players: this.tournament.players,
      bracket: this.tournament.bracket,
      completedAt: this.tournament.completedAt,
      createdAt: this.tournament.createdAt,
      settings: this.tournament.settings,
    });
    
    // Keep only last 10 tournaments
    if (this.tournamentHistory.length > 10) {
      this.tournamentHistory = this.tournamentHistory.slice(0, 10);
    }
    
    // Clear tournament (keep players and their code)
    this.tournament = null;
    this.matches.clear();
    
    this.saveData();
    this.notifyUpdate();
    
    console.log('Tournament archived. Ready for next tournament.');
  }

  advanceWinner(roundIndex, match) {
    const bracket = this.tournament.bracket;
    const nextRound = bracket.matches[roundIndex + 1];
    
    if (!nextRound) return; // Final match
    
    // Find the next match for this winner
    const matchIndexInRound = bracket.matches[roundIndex].indexOf(match);
    const nextMatchIndex = Math.floor(matchIndexInRound / 2);
    const nextMatch = nextRound[nextMatchIndex];
    
    if (matchIndexInRound % 2 === 0) {
      nextMatch.player1 = match.winner;
    } else {
      nextMatch.player2 = match.winner;
    }
  }

  async runMatch(match) {
    const player1Code = this.getPlayerCode(match.player1);
    const player2Code = this.getPlayerCode(match.player2);
    
    if (!player1Code || !player2Code) {
      console.error('Missing player code for match:', match.id);
      return;
    }
    
    match.status = 'running';
    match.games = [];
    
    let p1Wins = 0;
    let p2Wins = 0;
    let drawCount = 0;
    // Use tournament-specific settings or fall back to defaults
    const bestOf = this.tournament?.settings?.bestOf || TOURNAMENT_CONSTANTS.BEST_OF;
    const winsNeeded = Math.ceil(bestOf / 2);
    const maxDraws = this.tournament?.settings?.maxDraws || TOURNAMENT_CONSTANTS.MAX_DRAWS;
    
    let gameIndex = 0;
    
    while (p1Wins < winsNeeded && p2Wins < winsNeeded) {
      this.notifyUpdate();
      
      const gameResult = await this.runGame(player1Code, player2Code, match.id, gameIndex);
      match.games.push(gameResult);
      
      if (gameResult.winner === 1) {
        p1Wins++;
      } else if (gameResult.winner === 2) {
        p2Wins++;
      } else {
        // Draw
        drawCount++;
        
        // Draw breaker: if too many draws, end the match
        if (drawCount > maxDraws) {
          let finalWinner;
          let reason;
          
          if (p1Wins > p2Wins) {
            // Player 1 has more wins
            finalWinner = 1;
            reason = 'more wins';
          } else if (p2Wins > p1Wins) {
            // Player 2 has more wins
            finalWinner = 2;
            reason = 'more wins';
          } else {
            // Equal wins - pick randomly
            finalWinner = Math.random() < 0.5 ? 1 : 2;
            reason = 'random (equal wins)';
          }
          
          console.log(`Draw breaker activated! Winner: Player ${finalWinner} (${reason})`);
          
          // Give the deciding win to end the match
          if (finalWinner === 1) {
            p1Wins = winsNeeded; // Force match end
          } else {
            p2Wins = winsNeeded; // Force match end
          }
          
          // Mark this game as having a draw-breaker decision
          gameResult.drawBreaker = true;
          gameResult.drawBreakerWinner = finalWinner;
          gameResult.drawBreakerReason = reason;
        }
      }
      
      gameIndex++;
      
      // Delay between games
      if (p1Wins < winsNeeded && p2Wins < winsNeeded) {
        await this.delay(TOURNAMENT_CONSTANTS.DELAY_BETWEEN_GAMES);
      }
    }
    
    match.winner = p1Wins > p2Wins ? match.player1 : match.player2;
    match.status = 'completed';
    match.p1Wins = p1Wins;
    match.p2Wins = p2Wins;
    
    this.matches.set(match.id, match);
  }

  async runGame(player1Code, player2Code, matchId, gameIndex) {
    return new Promise((resolve) => {
      const engine = new GameEngine();
      engine.setPlayerCode(1, player1Code);
      engine.setPlayerCode(2, player2Code);
      
      const savedCodes = { 1: player1Code, 2: player2Code };
      engine.initializeGame();
      engine.playerCodes = savedCodes;
      engine.gameStartTime = Date.now();
      engine.lastTickTime = Date.now();
      engine.isRunning = true;
      
      const snapshots = [];
      let lastSnapshotTime = 0;
      
      const gameLoop = setInterval(() => {
        const state = engine.tick();
        
        // Save snapshot every 100ms for smooth replay
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
          
          // Save replay
          const replay = {
            matchId,
            gameIndex,
            winner: state.winner,
            duration: engine.gameTime,
            snapshots,
            finalState: state,
          };
          
          this.saveReplay(matchId, gameIndex, replay);
          
          resolve({
            gameIndex,
            winner: state.winner,
            duration: engine.gameTime,
            replayFile: `${matchId}_game${gameIndex}.json`,
          });
        }
      }, 16); // ~60 FPS
    });
  }

  saveReplay(matchId, gameIndex, replay) {
    const filename = `${matchId}_game${gameIndex}.json`;
    const filepath = path.join(TOURNAMENT_CONSTANTS.REPLAYS_DIR, filename);
    fs.writeFileSync(filepath, JSON.stringify(replay));
  }

  getReplay(matchId, gameIndex) {
    const filename = `${matchId}_game${gameIndex}.json`;
    const filepath = path.join(TOURNAMENT_CONSTANTS.REPLAYS_DIR, filename);
    
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
    return null;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getTournamentState() {
    if (!this.tournament) return null;
    
    return {
      ...this.tournament,
      bracket: this.tournament.bracket,
    };
  }

  getMatch(matchId) {
    return this.matches.get(matchId) || null;
  }

  // Reset arena for new tournament
  resetArena() {
    if (this.tournament && this.tournament.status === 'running') {
      return { success: false, error: 'Cannot reset during active tournament' };
    }
    
    // If tournament exists and completed but wasn't auto-archived yet, archive it now
    if (this.tournament && this.tournament.status === 'completed') {
      this.autoArchiveTournament();
    }
    
    // If no tournament (already auto-archived), just confirm success
    return { success: true, message: 'Ready for next tournament' };
  }

  // Full clear
  clearAll() {
    if (this.tournament && this.tournament.status === 'running') {
      return { success: false, error: 'Cannot clear during active tournament' };
    }
    
    this.players.clear();
    this.tournament = null;
    this.matches.clear();
    this.tournamentHistory = [];
    this.currentChampion = null;
    
    // Clear files
    const files = ['players.json', 'tournament.json', 'matches.json', 'history.json'];
    for (const file of files) {
      const filepath = this.getDataPath(file);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }
    
    this.notifyUpdate();
    
    return { success: true };
  }

  notifyUpdate() {
    if (this.onUpdate) {
      this.onUpdate(this.getArenaState());
    }
  }

  getArenaState() {
    return {
      players: this.getPlayers(),
      tournament: this.getTournamentState(),
      tournamentHistory: this.tournamentHistory,
      currentChampion: this.currentChampion,
    };
  }
}

export default ArenaManager;


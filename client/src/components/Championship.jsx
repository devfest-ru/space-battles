import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import ReplayViewer from './ReplayViewer';
import { useT } from '../i18n/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const ADMIN_KING = '__admin__';

const DEFAULT_CODE = `// Your Fleet AI - climb the hill, dethrone the king!
// Available: state.myShips, state.enemyShips, state.rockets, state.field

for (const ship of state.myShips) {
  if (!ship.isAlive) continue;

  // Find the closest living enemy
  let target = null;
  let minDist = Infinity;
  for (const enemy of state.enemyShips) {
    if (!enemy.isAlive) continue;
    const dx = enemy.x - ship.x;
    const dy = enemy.y - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) { minDist = dist; target = enemy; }
  }

  if (target) {
    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    const angleToEnemy = Math.atan2(dy, dx) * 180 / Math.PI;

    let aimDiff = angleToEnemy - ship.bodyAngle;
    while (aimDiff > 180) aimDiff -= 360;
    while (aimDiff < -180) aimDiff += 360;

    commands[ship.id] = {
      rotate: aimDiff > 5 ? 1 : aimDiff < -5 ? -1 : 0,
      boost: Math.abs(aimDiff) < 30 ? 1 : 0,
      shoot: Math.abs(aimDiff) < 12 && ship.canShoot
    };
  }
}`;

// Human-readable king name (the starting king is an admin pseudo-team).
// Takes the t() function so labels respect the current language.
export function kingLabel(name, t) {
  if (!name) return t ? t('koth.kingLabel.none') : '—';
  if (name === ADMIN_KING) return t ? t('koth.kingLabel.admin') : 'Admin (starting king)';
  return name;
}

function Championship({ kothState, onBack }) {
  const { t } = useT();
  const [teamName, setTeamName] = useState('');
  const [registeredName, setRegisteredName] = useState(null);
  const [code, setCode] = useState(DEFAULT_CODE);
  const [message, setMessage] = useState(null);
  const [selectedReplay, setSelectedReplay] = useState(null);
  const [activeTab, setActiveTab] = useState('register'); // 'register' | 'standings'

  // Restore identity from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('kothTeamName');
    if (saved && kothState?.teams?.some(t => t.name === saved)) {
      setRegisteredName(saved);
    }
  }, [kothState]);

  const showMessage = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 5000);
  };

  const tournament = kothState?.tournament || null;
  const rounds = tournament?.rounds || [];
  const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
  const registrationOpen = kothState?.registrationOpen;
  const teams = kothState?.teams || [];
  const myTeam = teams.find(t => t.name === registeredName) || null;
  const battlesRunning = currentRound?.status === 'battling';
  const codeLocked = battlesRunning;

  const handleRegister = async () => {
    const name = teamName.trim();
    if (!name) {
      showMessage(t('koth.messages.enterTeamName'), true);
      return;
    }
    // Existing team -> just log in
    if (teams.some(tm => tm.name === name)) {
      setRegisteredName(name);
      localStorage.setItem('kothTeamName', name);
      showMessage(t('koth.messages.welcomeBack', { name }));
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/koth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const result = await res.json();
      if (result.success) {
        setRegisteredName(name);
        localStorage.setItem('kothTeamName', name);
        showMessage(t('koth.messages.registered'));
      } else {
        showMessage(result.error, true);
      }
    } catch {
      showMessage(t('koth.messages.failedRegister'), true);
    }
  };

  const handleSubmitCode = async () => {
    if (!registeredName) {
      showMessage(t('koth.messages.registerFirst'), true);
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/koth/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: registeredName, code }),
      });
      const result = await res.json();
      if (result.success) {
        showMessage(t('koth.messages.submitted'));
      } else {
        showMessage(result.error, true);
      }
    } catch {
      showMessage(t('koth.messages.failedSubmit'), true);
    }
  };

  const handleViewReplay = async (seriesId, gameIndex, teamName, kingName) => {
    try {
      const res = await fetch(`${API_URL}/api/koth/replay/${seriesId}/${gameIndex}`);
      if (!res.ok) {
        showMessage(t('koth.messages.replayNotFound'), true);
        return;
      }
      const data = await res.json();
      setSelectedReplay({ data, leftName: teamName, rightName: kingLabel(kingName, t) });
    } catch {
      showMessage(t('koth.messages.failedReplay'), true);
    }
  };

  return (
    <div className="arena">
      <div className="arena-header">
        <button className="back-btn" onClick={onBack}>{t('koth.backToSimulator')}</button>
        <h1>{t('koth.title')}</h1>
        {message && (
          <div className={`arena-message ${message.isError ? 'error' : 'success'}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="arena-tabs">
        <button
          className={`tab-btn ${activeTab === 'register' ? 'active' : ''}`}
          onClick={() => setActiveTab('register')}
        >
          {!registeredName ? t('koth.tabs.enlist') : myTeam?.hasCode ? t('koth.tabs.yourCodeDone') : t('koth.tabs.yourCodeCurrent')}
        </button>
        <button
          className={`tab-btn ${activeTab === 'standings' ? 'active' : ''}`}
          onClick={() => setActiveTab('standings')}
        >
          {t('koth.tabs.theHill')}
        </button>
      </div>

      <div className="arena-content">
        {activeTab === 'register' && (
          <div className="register-panel">
            <div className="register-section">
              <h2>{t('koth.join.title')}</h2>
              {!registeredName ? (
                <div className="register-form">
                  <input
                    type="text"
                    placeholder={t('koth.join.placeholder')}
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    maxLength={30}
                    disabled={!registrationOpen}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  />
                  <button onClick={handleRegister} disabled={!registrationOpen}>
                    {t('koth.join.enlistBtn')}
                  </button>
                </div>
              ) : (
                <div className="registered-info">
                  <span className="player-badge">{t('koth.join.team', { name: '' })}<strong>{registeredName}</strong></span>
                  {myTeam?.hasCode
                    ? <span className="code-badge">{t('koth.join.algorithmLoaded')}</span>
                    : <span className="code-pending-badge">{t('koth.join.algorithmPending')}</span>}
                  <button
                    className="logout-btn"
                    disabled={!registrationOpen}
                    title={registrationOpen ? '' : t('koth.join.switchTeamLocked')}
                    onClick={() => {
                      setRegisteredName(null);
                      localStorage.removeItem('kothTeamName');
                      setTeamName('');
                    }}
                  >
                    {t('koth.join.switchTeam')}
                  </button>
                </div>
              )}
              {!registrationOpen && !registeredName && (
                <p className="tournament-warning">{t('koth.join.registrationClosed')}</p>
              )}
            </div>

            {registeredName && (
              <div className="code-section">
                <h2>{t('koth.code.title')}</h2>
                <div className="code-editor-wrapper">
                  <Editor
                    height="400px"
                    defaultLanguage="javascript"
                    theme="vs-dark"
                    value={code}
                    onChange={setCode}
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      readOnly: codeLocked,
                    }}
                  />
                </div>
                <button
                  className="submit-code-btn"
                  onClick={handleSubmitCode}
                  disabled={codeLocked}
                >
                  {myTeam?.hasCode ? t('koth.code.update') : t('koth.code.submit')}
                </button>
                {codeLocked && (
                  <p className="tournament-warning">{t('koth.code.lockedWarning')}</p>
                )}
                <p className="koth-hint">
                  {t('koth.code.hint')}
                </p>
              </div>
            )}

            <div className="players-section">
              <h2>{t('koth.teams.title', { n: teams.length })}</h2>
              <div className="players-list">
                {teams.map(tm => (
                  <div key={tm.name} className={`player-item ${tm.name === registeredName ? 'is-me' : ''}`}>
                    <span className="player-name">
                      {tm.name === tournament?.kingName ? '👑 ' : ''}{tm.name}
                    </span>
                    <span className={`player-status ${tm.hasCode ? 'ready' : 'pending'}`}>
                      {tm.hasCode ? t('koth.teams.algorithmLoaded') : t('koth.teams.noAlgorithm')}
                    </span>
                  </div>
                ))}
                {teams.length === 0 && <p className="no-players">{t('koth.teams.empty')}</p>}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="bracket-panel">
            <KothStandings kothState={kothState} onViewReplay={handleViewReplay} />
          </div>
        )}

        {selectedReplay && (
          <div className="replay-fullscreen-overlay">
            <ReplayViewer
              replay={selectedReplay.data}
              leftName={selectedReplay.leftName}
              rightName={selectedReplay.rightName}
              onClose={() => setSelectedReplay(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Standings panel: current king banner, round status banner, and list of all
// rounds (newest first). Reused both by the player view and the admin
// "broadcast" view in AdminPanel.
export function KothStandings({ kothState, onViewReplay }) {
  const { t } = useT();
  const tournament = kothState?.tournament || null;
  const rounds = tournament?.rounds || [];
  const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

  if (!tournament) {
    return (
      <div className="next-tournament-info">
        <h3>{t('koth.standings.waitingStart')}</h3>
        <p className="waiting-message">
          {t('koth.standings.waitingStartDesc')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="current-champion-banner">
        <span className="champion-label">
          {tournament.status === 'completed' ? t('koth.standings.tournamentWinner') : t('koth.standings.currentKing')}
        </span>
        <span className="champion-name">
          👑 {kingLabel(tournament.status === 'completed' ? tournament.winner : tournament.kingName, t)}
        </span>
      </div>

      {tournament.status === 'completed' && (
        <div className="live-tournament-banner">
          <span>{t('koth.standings.finished')}</span>
        </div>
      )}

      {currentRound && tournament.status === 'running' && (
        <div className="live-tournament-banner">
          {currentRound.status === 'collecting' && (
            <span>{t('koth.standings.roundLoading', { n: currentRound.index + 1, K: currentRound.K })}</span>
          )}
          {currentRound.status === 'battling' && (
            <>
              <span className="live-dot"></span>
              <span>{t('koth.standings.roundBattling', { n: currentRound.index + 1 })}</span>
            </>
          )}
          {currentRound.status === 'finished' && (
            <span>{t('koth.standings.roundFinished', { n: currentRound.index + 1 })}</span>
          )}
        </div>
      )}

      {[...rounds].reverse().map(round => (
        <RoundTable
          key={round.index}
          round={round}
          onViewReplay={onViewReplay}
        />
      ))}
      {rounds.length === 0 && (
        <p className="waiting-message">{t('koth.standings.waitingFirstRound')}</p>
      )}
    </>
  );
}

// One round's series results table.
function RoundTable({ round, onViewReplay }) {
  const { t } = useT();
  const series = round.series || [];

  return (
    <div className="koth-round">
      <h3>
        {t('koth.round.title', { n: round.index + 1, K: round.K, king: kingLabel(round.kingName, t) })}
        {round.status === 'finished' && round.newKing && (
          <span className="koth-newking">{t('koth.round.newKing', { king: kingLabel(round.newKing, t) })}</span>
        )}
      </h3>

      {series.length === 0 ? (
        <p className="no-players">{t('koth.round.noChallengers')}</p>
      ) : (
        <table className="koth-table">
          <thead>
            <tr>
              <th>{t('koth.round.col.team')}</th>
              <th>{t('koth.round.col.score')}</th>
              <th>{t('koth.round.col.result')}</th>
              <th>{t('koth.round.col.survivedShips')}</th>
              <th>{t('koth.round.col.seriesTime')}</th>
              <th>{t('koth.round.col.games')}</th>
            </tr>
          </thead>
          <tbody>
            {series.map(s => (
              <tr
                key={s.teamName}
                className={round.status === 'finished' && s.teamName === round.newKing ? 'koth-winner' : ''}
              >
                <td>
                  {round.status === 'finished' && s.teamName === round.newKing ? '👑 ' : ''}
                  {s.teamName}
                </td>
                <td>{s.teamWins}–{s.kingWins}{s.draws > 0 ? t('koth.round.draws', { n: s.draws }) : ''}</td>
                <td>
                  {s.status === 'no_code' && <span className="koth-res pending">{t('koth.round.result.noCode')}</span>}
                  {s.status === 'pending' && <span className="koth-res pending">{t('koth.round.result.pending')}</span>}
                  {s.status === 'running' && <span className="koth-res running">{t('koth.round.result.battling')}</span>}
                  {s.status === 'done' && (
                    s.beatKing
                      ? <span className="koth-res win">{t('koth.round.result.beatKing')}</span>
                      : <span className="koth-res loss">{t('koth.round.result.kingHeld')}</span>
                  )}
                </td>
                <td>{s.status === 'done' ? s.survivingShipsInWins : '—'}</td>
                <td>{s.status === 'done' ? `${Math.round(s.totalSeriesTime / 1000)}s` : '—'}</td>
                <td>
                  <div className="koth-games">
                    {s.games.map(g => (
                      <button
                        key={g.gameIndex}
                        className="mini-replay-btn"
                        title={`Game ${g.gameIndex + 1}: ${g.winner === 1 ? s.teamName : g.winner === 2 ? 'king' : 'draw'}`}
                        onClick={() => onViewReplay(g.seriesId, g.gameIndex, s.teamName, round.kingName)}
                      >
                        🎬 G{g.gameIndex + 1}
                      </button>
                    ))}
                    {s.games.length === 0 && '—'}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Championship;

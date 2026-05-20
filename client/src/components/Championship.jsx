import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import ReplayViewer from './ReplayViewer';

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
export function kingLabel(name) {
  if (!name) return '—';
  return name === ADMIN_KING ? 'Admin (starting king)' : name;
}

function Championship({ kothState, onBack }) {
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
      showMessage('Enter a team name', true);
      return;
    }
    // Existing team -> just log in
    if (teams.some(t => t.name === name)) {
      setRegisteredName(name);
      localStorage.setItem('kothTeamName', name);
      showMessage(`Welcome back, ${name}!`);
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
        showMessage('Registered! Submit your algorithm below.');
      } else {
        showMessage(result.error, true);
      }
    } catch {
      showMessage('Failed to register', true);
    }
  };

  const handleSubmitCode = async () => {
    if (!registeredName) {
      showMessage('Register first', true);
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
        showMessage('Algorithm submitted!');
      } else {
        showMessage(result.error, true);
      }
    } catch {
      showMessage('Failed to submit code', true);
    }
  };

  const handleViewReplay = async (seriesId, gameIndex, teamName, kingName) => {
    try {
      const res = await fetch(`${API_URL}/api/koth/replay/${seriesId}/${gameIndex}`);
      if (!res.ok) {
        showMessage('Replay not found', true);
        return;
      }
      const data = await res.json();
      setSelectedReplay({ data, leftName: teamName, rightName: kingLabel(kingName) });
    } catch {
      showMessage('Failed to load replay', true);
    }
  };

  return (
    <div className="arena">
      <div className="arena-header">
        <button className="back-btn" onClick={onBack}>← Back to Simulator</button>
        <h1>👑 Championship — King of the Hill</h1>
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
          {!registeredName ? '1️⃣ Enlist' : myTeam?.hasCode ? '✅ Your Code' : '2️⃣ Your Code'}
        </button>
        <button
          className={`tab-btn ${activeTab === 'standings' ? 'active' : ''}`}
          onClick={() => setActiveTab('standings')}
        >
          🏔️ The Hill
        </button>
      </div>

      <div className="arena-content">
        {activeTab === 'register' && (
          <div className="register-panel">
            <div className="register-section">
              <h2>🚀 Join the Championship</h2>
              {!registeredName ? (
                <div className="register-form">
                  <input
                    type="text"
                    placeholder="Team name (new or existing)"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    maxLength={30}
                    disabled={!registrationOpen}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  />
                  <button onClick={handleRegister} disabled={!registrationOpen}>
                    Enlist
                  </button>
                </div>
              ) : (
                <div className="registered-info">
                  <span className="player-badge">✓ Team: <strong>{registeredName}</strong></span>
                  {myTeam?.hasCode
                    ? <span className="code-badge">✓ Algorithm loaded</span>
                    : <span className="code-pending-badge">⬇️ Load your algorithm below</span>}
                  <button
                    className="logout-btn"
                    disabled={!registrationOpen}
                    title={registrationOpen ? '' : 'Locked while the tournament is running'}
                    onClick={() => {
                      setRegisteredName(null);
                      localStorage.removeItem('kothTeamName');
                      setTeamName('');
                    }}
                  >
                    Switch Team
                  </button>
                </div>
              )}
              {!registrationOpen && !registeredName && (
                <p className="tournament-warning">⚠️ Registration is closed — the tournament has started.</p>
              )}
            </div>

            {registeredName && (
              <div className="code-section">
                <h2>💻 Your Algorithm</h2>
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
                  {myTeam?.hasCode ? '🔄 Update Algorithm' : '📤 Submit Algorithm'}
                </button>
                {codeLocked && (
                  <p className="tournament-warning">⚠️ Battles are running — code is locked until the round ends.</p>
                )}
                <p className="koth-hint">
                  Your algorithm is kept between rounds. Tweak it before each round, or leave it as is.
                </p>
              </div>
            )}

            <div className="players-section">
              <h2>👥 Teams ({teams.length})</h2>
              <div className="players-list">
                {teams.map(t => (
                  <div key={t.name} className={`player-item ${t.name === registeredName ? 'is-me' : ''}`}>
                    <span className="player-name">
                      {t.name === tournament?.kingName ? '👑 ' : ''}{t.name}
                    </span>
                    <span className={`player-status ${t.hasCode ? 'ready' : 'pending'}`}>
                      {t.hasCode ? '✓ Algorithm loaded' : '⏳ No algorithm'}
                    </span>
                  </div>
                ))}
                {teams.length === 0 && <p className="no-players">No teams registered yet</p>}
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
  const tournament = kothState?.tournament || null;
  const rounds = tournament?.rounds || [];
  const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;

  if (!tournament) {
    return (
      <div className="next-tournament-info">
        <h3>📋 Waiting for the tournament to start</h3>
        <p className="waiting-message">
          ⏳ The admin will create the tournament and set the starting king.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="current-champion-banner">
        <span className="champion-label">
          {tournament.status === 'completed' ? 'Tournament Winner' : 'Current King of the Hill'}
        </span>
        <span className="champion-name">
          👑 {kingLabel(tournament.status === 'completed' ? tournament.winner : tournament.kingName)}
        </span>
      </div>

      {tournament.status === 'completed' && (
        <div className="live-tournament-banner">
          <span>🏁 Tournament finished</span>
        </div>
      )}

      {currentRound && tournament.status === 'running' && (
        <div className="live-tournament-banner">
          {currentRound.status === 'collecting' && (
            <span>📥 Round {currentRound.index + 1} — teams are loading algorithms (first to {currentRound.K} wins)</span>
          )}
          {currentRound.status === 'battling' && (
            <>
              <span className="live-dot"></span>
              <span>Round {currentRound.index + 1} battles in progress…</span>
            </>
          )}
          {currentRound.status === 'finished' && (
            <span>✅ Round {currentRound.index + 1} finished — waiting for the next round</span>
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
        <p className="waiting-message">⏳ Waiting for the first round to start.</p>
      )}
    </>
  );
}

// One round's series results table.
function RoundTable({ round, onViewReplay }) {
  const series = round.series || [];

  return (
    <div className="koth-round">
      <h3>
        Round {round.index + 1} · first to {round.K} ·
        {' '}king: {kingLabel(round.kingName)}
        {round.status === 'finished' && round.newKing && (
          <span className="koth-newking"> → new king: 👑 {kingLabel(round.newKing)}</span>
        )}
      </h3>

      {series.length === 0 ? (
        <p className="no-players">No challengers in this round.</p>
      ) : (
        <table className="koth-table">
          <thead>
            <tr>
              <th>Team</th>
              <th>Score (team–king)</th>
              <th>Result</th>
              <th>Survived ships</th>
              <th>Series time</th>
              <th>Games</th>
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
                <td>{s.teamWins}–{s.kingWins}{s.draws > 0 ? ` (${s.draws} draw)` : ''}</td>
                <td>
                  {s.status === 'no_code' && <span className="koth-res pending">No algorithm</span>}
                  {s.status === 'pending' && <span className="koth-res pending">Pending</span>}
                  {s.status === 'running' && <span className="koth-res running">Battling…</span>}
                  {s.status === 'done' && (
                    s.beatKing
                      ? <span className="koth-res win">Beat the king</span>
                      : <span className="koth-res loss">King held</span>
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

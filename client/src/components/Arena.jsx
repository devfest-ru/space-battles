import { useState, useEffect, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import TournamentBracket from './TournamentBracket';
import ReplayViewer from './ReplayViewer';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DEFAULT_ARENA_CODE = `// Your Fleet AI Code
// Available: state.myShips, state.enemyShips, state.rockets, state.field
// Ships drift forward. Boost for speed. Weapon fires forward!

for (const ship of state.myShips) {
  if (!ship.isAlive) continue;
  
  // Find closest enemy
  let closestEnemy = null;
  let minDist = Infinity;
  
  for (const enemy of state.enemyShips) {
    if (!enemy.isAlive) continue;
    const dx = enemy.x - ship.x;
    const dy = enemy.y - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      closestEnemy = enemy;
    }
  }
  
  if (closestEnemy) {
    const dx = closestEnemy.x - ship.x;
    const dy = closestEnemy.y - ship.y;
    const angleToEnemy = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Aim by rotating the ship (weapon fires forward)
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

function Arena({ arenaState, onBack }) {
  const [playerName, setPlayerName] = useState('');
  const [registeredName, setRegisteredName] = useState(null);
  const [code, setCode] = useState(DEFAULT_ARENA_CODE);
  const [message, setMessage] = useState(null);
  const [selectedReplay, setSelectedReplay] = useState(null);
  const [activeTab, setActiveTab] = useState('register'); // register, bracket, replay

  // Check if player is already registered (from localStorage)
  useEffect(() => {
    const savedName = localStorage.getItem('arenaPlayerName');
    if (savedName && arenaState?.players?.some(p => p.name === savedName)) {
      setRegisteredName(savedName);
      // If player has code, go to bracket; otherwise stay on register to submit code
      const player = arenaState.players.find(p => p.name === savedName);
      if (player?.hasCode) {
        setActiveTab('bracket');
      }
      // Otherwise stay on 'register' tab (default) so they can submit code
    }
  }, [arenaState]);

  const showMessage = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleRegister = async () => {
    if (!playerName.trim()) {
      showMessage('Please enter a name', true);
      return;
    }

    const trimmedName = playerName.trim();
    
    // Check if player already exists
    const existingPlayer = arenaState?.players?.find(p => p.name === trimmedName);
    if (existingPlayer) {
      // Login as existing player
      setRegisteredName(trimmedName);
      localStorage.setItem('arenaPlayerName', trimmedName);
      showMessage(`Welcome back, ${trimmedName}!`);
      return;
    }

    // Register new player
    try {
      const response = await fetch(`${API_URL}/api/arena/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });
      const result = await response.json();

      if (result.success) {
        setRegisteredName(trimmedName);
        localStorage.setItem('arenaPlayerName', trimmedName);
        showMessage('Registered successfully! Now submit your code below.');
        // Stay on register tab so user can immediately enter their code
      } else {
        showMessage(result.error, true);
      }
    } catch (error) {
      showMessage('Failed to register', true);
    }
  };

  const handleSubmitCode = async () => {
    if (!registeredName) {
      showMessage('Please register first', true);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/arena/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: registeredName, code }),
      });
      const result = await response.json();

      if (result.success) {
        showMessage('Code submitted! You can view the tournament bracket.');
        // After submitting code, switch to bracket view
        setActiveTab('bracket');
      } else {
        showMessage(result.error, true);
      }
    } catch (error) {
      showMessage('Failed to submit code', true);
    }
  };

  const handleViewReplay = async (matchId, gameIndex) => {
    try {
      const response = await fetch(`${API_URL}/api/arena/replay/${matchId}/${gameIndex}`);
      const replay = await response.json();
      setSelectedReplay(replay);
    } catch (error) {
      showMessage('Failed to load replay', true);
    }
  };

  const handleDownloadLog = (matchId, gameIndex) => {
    window.open(`${API_URL}/api/arena/replay/${matchId}/${gameIndex}/download`);
  };

  const currentPlayer = arenaState?.players?.find(p => p.name === registeredName);
  const tournament = arenaState?.tournament;
  const isTournamentRunning = tournament?.status === 'running';
  const allPlayers = arenaState?.players || [];
  const playersWithCode = allPlayers.filter(p => p.hasCode);
  const playersWithoutCode = allPlayers.filter(p => !p.hasCode);

  return (
    <div className="arena">
      <div className="arena-header">
        <button className="back-btn" onClick={onBack}>← Back to Simulator</button>
        <h1>🏆 Tournaments</h1>
        {message && (
          <div className={`arena-message ${message.isError ? 'error' : 'success'}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="arena-tabs">
        <button 
          className={`tab-btn ${activeTab === 'register' ? 'active' : ''} ${!registeredName ? 'step-current' : currentPlayer?.hasCode ? 'step-done' : 'step-current'}`}
          onClick={() => setActiveTab('register')}
        >
          {!registeredName ? '1️⃣' : currentPlayer?.hasCode ? '✅' : '2️⃣'} {!registeredName ? 'Enlist' : 'Your Code'}
        </button>
        <button 
          className={`tab-btn ${activeTab === 'bracket' ? 'active' : ''}`}
          onClick={() => setActiveTab('bracket')}
        >
          💥 Combat
        </button>
      </div>

      <div className="arena-content">
        {activeTab === 'register' && (
          <div className="register-panel">
            <div className="register-section">
              <h2>🚀 Join the Fleet</h2>
              {!registeredName ? (
                <div className="register-form">
                  <input
                    type="text"
                    placeholder="Enter callsign (new or existing)"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    maxLength={20}
                    disabled={isTournamentRunning}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                  />
                  <button onClick={handleRegister} disabled={isTournamentRunning}>
                    Enlist
                  </button>
                </div>
              ) : (
                <div className="registered-info">
                  <span className="player-badge">✓ Playing as: <strong>{registeredName}</strong></span>
                  {currentPlayer?.hasCode ? (
                    <span className="code-badge">✓ Code Submitted</span>
                  ) : (
                    <span className="code-pending-badge">⬇️ Submit your code below to enter tournament</span>
                  )}
                  <button 
                    className="logout-btn"
                    onClick={() => {
                      setRegisteredName(null);
                      localStorage.removeItem('arenaPlayerName');
                      setPlayerName('');
                    }}
                  >
                    Switch Player
                  </button>
                </div>
              )}
            </div>

            {registeredName && (
              <div className="code-section">
                <h2>💻 Your Algorithm {!currentPlayer?.hasCode && <span className="step-hint">← Step 2: Write and submit your code!</span>}</h2>
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
                      readOnly: isTournamentRunning,
                    }}
                  />
                </div>
                <button 
                  className="submit-code-btn"
                  onClick={handleSubmitCode}
                  disabled={isTournamentRunning}
                >
                  {currentPlayer?.hasCode ? '🔄 Update Code' : '📤 Submit Code'}
                </button>
                {isTournamentRunning && (
                  <p className="tournament-warning">⚠️ Cannot modify code during active tournament</p>
                )}
              </div>
            )}

            <div className="players-section">
              <h2>👥 Fleet Commanders ({arenaState?.players?.length || 0})</h2>
              <div className="players-list">
                {arenaState?.players?.map(player => (
                  <div key={player.name} className={`player-item ${player.name === registeredName ? 'is-me' : ''}`}>
                    <span className="player-name">{player.name}</span>
                    <span className={`player-status ${player.hasCode ? 'ready' : 'pending'}`}>
                      {player.hasCode ? '✓ Ready' : '⏳ No code'}
                    </span>
                  </div>
                ))}
                {(!arenaState?.players || arenaState.players.length === 0) && (
                  <p className="no-players">No players registered yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'bracket' && (
          <div className="bracket-panel">
            {/* Current Supreme Commander Banner */}
            {arenaState?.currentChampion && (
              <div className="current-champion-banner">
                <span className="champion-label">Supreme Commander</span>
                <span className="champion-name">👑 {arenaState.currentChampion}</span>
              </div>
            )}

            {/* Live Battle Arena */}
            {tournament?.status === 'running' && (
              <div className="live-tournament-banner">
                <span className="live-dot"></span>
                <span>Tournament in progress...</span>
                {tournament.settings && (
                  <span className="tournament-settings-badge">
                    Best of {tournament.settings.bestOf} • Max {tournament.settings.maxDraws} draws
                  </span>
                )}
              </div>
            )}

            {/* Tournament Bracket (only while running) */}
            {tournament?.status === 'running' && (
              <TournamentBracket 
                tournament={tournament} 
                onViewReplay={handleViewReplay}
                onDownloadLog={handleDownloadLog}
              />
            )}

            {/* Next Battle Arena Section */}
            {(!tournament || tournament.status === 'completed') && (
              <div className="next-tournament-info">
                <h3>📋 Next Tournament</h3>
                <div className="next-tournament-stats">
                  <div className="stat-box ready">
                    <span className="stat-number">{playersWithCode.length}</span>
                    <span className="stat-label">Ready to play</span>
                  </div>
                  <div className="stat-box pending">
                    <span className="stat-number">{playersWithoutCode.length}</span>
                    <span className="stat-label">Need to submit code</span>
                  </div>
                </div>
                <div className="player-lists">
                  <div className="player-list-section">
                    <h4>✅ Ready ({playersWithCode.length})</h4>
                    <div className="player-chips">
                      {playersWithCode.map(p => (
                        <span key={p.name} className="player-chip ready">{p.name}</span>
                      ))}
                      {playersWithCode.length === 0 && <span className="no-one">No one yet</span>}
                    </div>
                  </div>
                  <div className="player-list-section">
                    <h4>⏳ Waiting for code ({playersWithoutCode.length})</h4>
                    <div className="player-chips">
                      {playersWithoutCode.map(p => (
                        <span key={p.name} className="player-chip pending">{p.name}</span>
                      ))}
                      {playersWithoutCode.length === 0 && <span className="no-one">Everyone ready!</span>}
                    </div>
                  </div>
                </div>
                {playersWithCode.length >= 2 ? (
                  <p className="waiting-message">
                    ⏳ Waiting for admin to start the tournament...
                  </p>
                ) : (
                  <p className="waiting-message warning">
                    ⚠️ Need at least {2 - playersWithCode.length} more player(s) with code to start
                  </p>
                )}
              </div>
            )}

            {/* Past Tournaments */}
            {arenaState?.tournamentHistory && arenaState.tournamentHistory.length > 0 && (
              <div className="past-tournaments">
                <h3>📜 Past Tournaments</h3>
                <div className="past-tournaments-list">
                  {arenaState.tournamentHistory.map((t, index) => (
                    <PastTournamentCard 
                      key={t.id} 
                      tournament={t} 
                      number={arenaState.tournamentHistory.length - index}
                      onViewReplay={handleViewReplay}
                      onDownloadLog={handleDownloadLog}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedReplay && (
          <div className="replay-fullscreen-overlay">
            <ReplayViewer 
              replay={selectedReplay} 
              onClose={() => setSelectedReplay(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Past Tournament Card with expandable bracket
function PastTournamentCard({ tournament, number, onViewReplay, onDownloadLog }) {
  const [expanded, setExpanded] = useState(false);

  const getRoundName = (index, totalRounds) => {
    if (index === totalRounds - 1) return 'Final';
    if (index === totalRounds - 2) return 'Semifinals';
    if (index === totalRounds - 3) return 'Quarterfinals';
    return `Round ${index + 1}`;
  };

  return (
    <div className={`past-tournament-card ${expanded ? 'expanded' : ''}`}>
      <div className="past-tournament-header" onClick={() => setExpanded(!expanded)}>
        <span className="past-tournament-number">#{number}</span>
        <span className="past-tournament-winner">🏆 {tournament.winner}</span>
        <span className="past-tournament-players">{tournament.playerCount} players</span>
        {tournament.settings && (
          <span className="past-tournament-settings">
            Bo{tournament.settings.bestOf}
          </span>
        )}
        <span className="past-tournament-date">
          {new Date(tournament.completedAt).toLocaleDateString()}
        </span>
        <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
      </div>

      {expanded && tournament.bracket && (
        <div className="past-tournament-bracket">
          <div className="bracket-rounds">
            {tournament.bracket.matches.map((round, roundIndex) => (
              <div key={roundIndex} className="bracket-round">
                <h4 className="round-title">
                  {getRoundName(roundIndex, tournament.bracket.matches.length)}
                </h4>
                <div className="round-matches">
                  {round.map((match) => (
                    <div key={match.id} className={`past-match-card ${match.status}`}>
                      <div className="past-match-players">
                        <span className={match.winner === match.player1 ? 'winner' : ''}>
                          {match.player1 || 'TBD'}
                          {match.p1Wins !== undefined && <span className="score"> {match.p1Wins}</span>}
                        </span>
                        <span className="vs">vs</span>
                        <span className={match.winner === match.player2 ? 'winner' : ''}>
                          {match.player2 || 'TBD'}
                          {match.p2Wins !== undefined && <span className="score"> {match.p2Wins}</span>}
                        </span>
                      </div>
                      {match.games && match.games.length > 0 && (
                        <div className="past-match-games">
                          {match.games.map((game, gameIdx) => (
                            <div key={gameIdx} className="past-game-row">
                              <span className="game-label">G{gameIdx + 1}</span>
                              <span className={`game-result ${game.winner === 1 ? 'p1' : game.winner === 2 ? 'p2' : ''}`}>
                                {game.winner === 1 ? match.player1 : game.winner === 2 ? match.player2 : 'Draw'}
                              </span>
                              <button 
                                className="mini-replay-btn"
                                onClick={(e) => { e.stopPropagation(); onViewReplay(match.id, gameIdx); }}
                              >
                                🎬
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Arena;


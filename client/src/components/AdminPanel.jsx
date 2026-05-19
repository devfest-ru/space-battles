import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ADMIN_KING = '__admin__';

function kothKingLabel(name) {
  if (!name) return '—';
  return name === ADMIN_KING ? 'Admin (starting king)' : name;
}

function AdminPanel({ arenaState, kothState, onClose }) {
  const [message, setMessage] = useState(null);
  const [bestOf, setBestOf] = useState(3);
  const [maxDraws, setMaxDraws] = useState(3);
  const [adminKey, setAdminKey] = useState('');
  const [keyVisible, setKeyVisible] = useState(false);

  // Load admin key from localStorage on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('adminKey');
    if (savedKey) {
      setAdminKey(savedKey);
    }
  }, []);

  // Save admin key to localStorage when changed
  const handleKeyChange = (value) => {
    setAdminKey(value);
    localStorage.setItem('adminKey', value);
  };

  const showMessage = (text, isError = false) => {
    setMessage({ text, isError });
    setTimeout(() => setMessage(null), 5000);
  };

  // Helper for admin API calls
  const adminFetch = async (url, options = {}) => {
    if (!adminKey) {
      showMessage('Please enter Admin API Key', true);
      return null;
    }
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Content-Type': 'application/json',
        'X-Admin-Key': adminKey,
      },
    });
    
    if (response.status === 401) {
      showMessage('Invalid Admin API Key', true);
      return null;
    }
    
    return response.json();
  };

  const handleStartTournament = async () => {
    try {
      const result = await adminFetch(`${API_URL}/api/arena/tournament/start`, {
        method: 'POST',
        body: JSON.stringify({ bestOf, maxDraws }),
      });

      if (!result) return;

      if (result.success) {
        showMessage(`Tournament started! (Best of ${bestOf}, Max ${maxDraws} draws)`);
      } else {
        showMessage(result.error, true);
      }
    } catch (error) {
      showMessage('Failed to start tournament', true);
    }
  };

  const handleClearArena = async () => {
    if (!confirm('Clear ALL arena data? This will remove all players, tournament history, and replays.')) return;
    try {
      const result = await adminFetch(`${API_URL}/api/arena/clear`, { method: 'POST' });
      
      if (!result) return;
      
      if (result.success) {
        showMessage('Arena cleared! Fresh start.');
      } else {
        showMessage(result.error, true);
      }
    } catch (error) {
      showMessage('Failed to clear arena', true);
    }
  };

  const handleResetArena = async () => {
    if (!confirm('Reset arena? This will clear player codes but keep registrations.')) return;
    try {
      const result = await adminFetch(`${API_URL}/api/arena/reset`, { method: 'POST' });
      
      if (!result) return;
      
      if (result.success) {
        showMessage('Arena reset! Players kept, codes cleared.');
      } else {
        showMessage(result.error, true);
      }
    } catch (error) {
      showMessage('Failed to reset arena', true);
    }
  };

  const tournament = arenaState?.tournament;
  const players = arenaState?.players || [];
  const playersWithCode = players.filter(p => p.hasCode);

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>⚙️ Admin Panel</h1>
        <button className="close-admin-btn" onClick={onClose}>✕ Close</button>
      </div>

      {message && (
        <div className={`arena-message ${message.isError ? 'error' : 'success'}`}>
          {message.text}
        </div>
      )}

      <div className="admin-content">
        {/* Admin Authentication */}
        <div className="admin-section">
          <h2>🔐 Authentication</h2>
          <div className="admin-key-input">
            <label htmlFor="adminKey">Admin API Key</label>
            <div className="key-input-wrapper">
              <input
                id="adminKey"
                type={keyVisible ? 'text' : 'password'}
                value={adminKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder="Enter admin key..."
              />
              <button 
                className="toggle-key-btn"
                onClick={() => setKeyVisible(!keyVisible)}
                type="button"
              >
                {keyVisible ? '🙈' : '👁️'}
              </button>
            </div>
            <span className="setting-hint">Required for admin actions</span>
          </div>
        </div>

        {/* Tournaments - olympic bracket system (collapsible container) */}
        <details className="admin-section admin-accordion">
          <summary className="admin-accordion-summary">🏆 Tournaments</summary>
          <div className="admin-accordion-body">

        {/* Status Overview */}
        <div className="admin-subsection">
          <h3>📊 Status</h3>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">Registered Players</span>
              <span className="status-value">{players.length}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Ready (with code)</span>
              <span className="status-value highlight">{playersWithCode.length}</span>
            </div>
            <div className="status-item">
              <span className="status-label">Tournament Status</span>
              <span className={`status-value ${tournament?.status || 'none'}`}>
                {tournament?.status === 'running' ? '🔴 Running' :
                 tournament?.status === 'completed' ? '✅ Completed' :
                 '⏸️ None'}
              </span>
            </div>
            {tournament?.winner && (
              <div className="status-item">
                <span className="status-label">Winner</span>
                <span className="status-value winner">🏆 {tournament.winner}</span>
              </div>
            )}
          </div>
        </div>

        {/* Players List */}
        <div className="admin-subsection">
          <h3>👥 Players ({players.length})</h3>
          <div className="admin-players-list">
            {players.length === 0 ? (
              <p className="no-data">No players registered</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Registered</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(player => (
                    <tr key={player.name}>
                      <td>{player.name}</td>
                      <td>
                        <span className={`code-status ${player.hasCode ? 'yes' : 'no'}`}>
                          {player.hasCode ? '✓ Ready' : '✗ Pending'}
                        </span>
                      </td>
                      <td>{new Date(player.registeredAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Tournament Settings */}
        {!tournament && (
          <div className="admin-subsection">
            <h3>⚙️ Tournament Settings</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label htmlFor="bestOf">Best of</label>
                <select 
                  id="bestOf" 
                  value={bestOf} 
                  onChange={(e) => setBestOf(Number(e.target.value))}
                >
                  <option value={1}>1 game</option>
                  <option value={3}>3 games</option>
                  <option value={5}>5 games</option>
                  <option value={7}>7 games</option>
                </select>
                <span className="setting-hint">Games per match</span>
              </div>
              <div className="setting-item">
                <label htmlFor="maxDraws">Max Draws</label>
                <select 
                  id="maxDraws" 
                  value={maxDraws} 
                  onChange={(e) => setMaxDraws(Number(e.target.value))}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>
                <span className="setting-hint">Before draw breaker</span>
              </div>
            </div>
          </div>
        )}

        {/* Tournament Controls */}
        <div className="admin-subsection">
          <h3>🎮 Tournament Controls</h3>
          <div className="admin-controls">
            {!tournament && (
              <button 
                className="admin-btn start"
                onClick={handleStartTournament}
                disabled={playersWithCode.length < 2 || !adminKey}
              >
                🚀 Start Tournament (Best of {bestOf})
                <span className="btn-hint">
                  {!adminKey 
                    ? 'Enter admin key first'
                    : playersWithCode.length < 2 
                      ? `Need ${2 - playersWithCode.length} more player(s) with code`
                      : `${playersWithCode.length} players ready`}
                </span>
              </button>
            )}

            {tournament?.status === 'running' && (
              <div className="running-notice">
                <span className="live-dot"></span>
                Tournament is running... Please wait for completion.
              </div>
            )}

            {(!tournament?.status || tournament?.status === 'completed') && (
              <>
                <button 
                  className="admin-btn warning" 
                  onClick={handleResetArena}
                  disabled={!adminKey}
                >
                  🔄 Reset Arena
                  <span className="btn-hint">Clears codes, keeps players</span>
                </button>
                <button 
                  className="admin-btn danger" 
                  onClick={handleClearArena}
                  disabled={!adminKey}
                >
                  🗑️ Clear All Data
                  <span className="btn-hint">Removes everything</span>
                </button>
              </>
            )}
          </div>
        </div>
          </div>
        </details>
        {/* end Tournaments container */}

        {/* King of the Hill - isolated "Championship" mode */}
        <KothAdminSection
          kothState={kothState}
          adminFetch={adminFetch}
          showMessage={showMessage}
          adminKey={adminKey}
        />
      </div>
    </div>
  );
}

// Admin controls for the King of the Hill ("Championship") mode.
function KothAdminSection({ kothState, adminFetch, showMessage, adminKey }) {
  const [kingCode, setKingCode] = useState('');
  const [roundK, setRoundK] = useState(2);
  const [codes, setCodes] = useState(null); // { teamsCode: [...], adminKingCode }
  const [codesMsg, setCodesMsg] = useState(null); // inline message next to "Load all algorithms"

  const tournament = kothState?.tournament || null;
  const teams = kothState?.teams || [];
  const rounds = tournament?.rounds || [];
  const currentRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
  const battlesRunning = currentRound?.status === 'battling';

  const post = async (url, body) => {
    try {
      const result = await adminFetch(url, {
        method: 'POST',
        body: JSON.stringify(body || {}),
      });
      if (!result) return null;
      if (result.success) {
        showMessage(result.message || 'Done');
      } else {
        showMessage(result.error, true);
      }
      return result;
    } catch {
      showMessage('Request failed', true);
      return null;
    }
  };

  const loadCodes = async () => {
    try {
      const result = await adminFetch(`${API_URL}/api/koth/admin/state`);
      if (!result) return;
      setCodes({ teamsCode: result.teamsCode || [], adminKingCode: result.adminKingCode });
      setCodesMsg('✓ Algorithms loaded');
      setTimeout(() => setCodesMsg(null), 3000);
    } catch {
      showMessage('Failed to load algorithms', true);
    }
  };

  const handleCreate = async () => {
    if (!kingCode.trim()) {
      showMessage('Enter the starting king algorithm', true);
      return;
    }
    await post(`${API_URL}/api/koth/tournament/create`, { kingCode });
  };

  const handleUpdateKing = async () => {
    if (!kingCode.trim()) {
      showMessage('Enter the king algorithm', true);
      return;
    }
    await post(`${API_URL}/api/koth/king/code`, { code: kingCode });
  };

  const handleStartRound = async () => {
    await post(`${API_URL}/api/koth/round/start`, { K: roundK });
  };

  const handleRunRound = async () => {
    await post(`${API_URL}/api/koth/round/run`, {});
  };

  const handleFinish = async () => {
    if (!confirm('Finish the tournament? The current king is declared the winner.')) return;
    await post(`${API_URL}/api/koth/tournament/finish`, {});
  };

  const handleReset = async () => {
    if (!confirm('Reset King of the Hill? Removes all teams, the tournament and replays.')) return;
    const result = await post(`${API_URL}/api/koth/reset`, {});
    if (result?.success) setCodes(null);
  };

  const codeFor = (name) => {
    if (!codes) return null;
    if (name === ADMIN_KING) return codes.adminKingCode;
    return codes.teamsCode.find(t => t.name === name)?.code || null;
  };

  return (
    <details className="admin-section admin-accordion">
      <summary className="admin-accordion-summary">👑 Championship — King of the Hill</summary>
      <div className="admin-accordion-body">

      {/* Status */}
      <div className="status-grid">
        <div className="status-item">
          <span className="status-label">Registered Teams</span>
          <span className="status-value">{teams.length}</span>
        </div>
        <div className="status-item">
          <span className="status-label">Tournament</span>
          <span className={`status-value ${tournament?.status || 'none'}`}>
            {tournament?.status === 'running' ? '🔴 Running' :
             tournament?.status === 'completed' ? '✅ Completed' :
             '⏸️ Not started'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Current King</span>
          <span className="status-value highlight">
            {tournament ? kothKingLabel(tournament.kingName) : '—'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Current Round</span>
          <span className="status-value">
            {currentRound
              ? `#${currentRound.index + 1} · ${currentRound.status}`
              : '—'}
          </span>
        </div>
      </div>

      {/* Teams + code */}
      <div className="admin-players-list">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', marginBottom: '0.75rem' }}>
          <button
            className="koth-btn-sm"
            onClick={loadCodes}
            disabled={!adminKey}
          >
            🔄 Load all algorithms
          </button>
          {codesMsg && <span className="koth-inline-msg">{codesMsg}</span>}
        </div>
        {teams.length === 0 ? (
          <p className="no-data">No teams registered</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Team</th>
                <th>Algorithm</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {teams.map(t => (
                <tr key={t.name}>
                  <td>{t.name === tournament?.kingName ? '👑 ' : ''}{t.name}</td>
                  <td>
                    <span className={`code-status ${t.hasCode ? 'yes' : 'no'}`}>
                      {t.hasCode ? '✓ Loaded' : '✗ None'}
                    </span>
                  </td>
                  <td>{t.codeUpdatedAt ? new Date(t.codeUpdatedAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {codes && (
        <div className="koth-codes">
          {[ADMIN_KING, ...teams.map(t => t.name)].map(name => (
            <details key={name}>
              <summary>{kothKingLabel(name)}</summary>
              <pre className="koth-code-pre">{codeFor(name) || '(no algorithm)'}</pre>
            </details>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className="admin-controls" style={{ marginTop: '1.25rem' }}>
        {!tournament && (
          <>
            <div className="setting-item" style={{ width: '100%' }}>
              <label htmlFor="kothKingCode">Starting King Algorithm</label>
              <textarea
                id="kothKingCode"
                className="koth-code-input"
                value={kingCode}
                onChange={(e) => setKingCode(e.target.value)}
                placeholder="Paste the starting king's JavaScript here..."
                rows={8}
              />
            </div>
            <button
              className="admin-btn start"
              onClick={handleCreate}
              disabled={!adminKey || teams.length < 1}
            >
              🚀 Create Tournament
              <span className="btn-hint">
                {teams.length < 1 ? 'Need at least 1 registered team' : 'Closes registration'}
              </span>
            </button>
          </>
        )}

        {tournament?.status === 'running' && (
          <>
            {tournament.kingName === ADMIN_KING && !battlesRunning && (
              <>
                <div className="setting-item" style={{ width: '100%' }}>
                  <label htmlFor="kothKingEdit">Edit Starting King Algorithm</label>
                  <textarea
                    id="kothKingEdit"
                    className="koth-code-input"
                    value={kingCode}
                    onChange={(e) => setKingCode(e.target.value)}
                    placeholder="Paste new king algorithm (optional)..."
                    rows={6}
                  />
                </div>
                <button className="koth-btn-sm" onClick={handleUpdateKing} disabled={!adminKey}>
                  💾 Update King Algorithm
                </button>
              </>
            )}

            {(!currentRound || currentRound.status === 'finished') && (
              <div className="setting-item">
                <label htmlFor="kothK">Wins per series (K)</label>
                <input
                  id="kothK"
                  className="koth-k-input"
                  type="number"
                  min={1}
                  value={roundK}
                  onChange={(e) => setRoundK(e.target.value)}
                />
              </div>
            )}
            {(!currentRound || currentRound.status === 'finished') && (
              <button className="admin-btn start" onClick={handleStartRound} disabled={!adminKey}>
                ▶️ Start Round (first to {roundK})
                <span className="btn-hint">Teams may load algorithms</span>
              </button>
            )}

            {currentRound?.status === 'collecting' && (
              <button className="admin-btn start" onClick={handleRunRound} disabled={!adminKey}>
                ⚔️ Run Round Battles
                <span className="btn-hint">All teams fight the king</span>
              </button>
            )}

            {battlesRunning && (
              <div className="running-notice">
                <span className="live-dot"></span>
                Round battles in progress... please wait.
              </div>
            )}

            {!battlesRunning && (
              <button className="admin-btn warning" onClick={handleFinish} disabled={!adminKey}>
                🏁 Finish Tournament
                <span className="btn-hint">Current king wins</span>
              </button>
            )}
          </>
        )}

        <button className="admin-btn danger" onClick={handleReset} disabled={!adminKey || battlesRunning}>
          🗑️ Reset Championship
          <span className="btn-hint">Removes teams, tournament, replays</span>
        </button>
      </div>
      </div>
    </details>
  );
}

export default AdminPanel;

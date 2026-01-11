import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

function AdminPanel({ arenaState, onClose }) {
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

        {/* Status Overview */}
        <div className="admin-section">
          <h2>📊 Status</h2>
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
        <div className="admin-section">
          <h2>👥 Players ({players.length})</h2>
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
          <div className="admin-section">
            <h2>⚙️ Tournament Settings</h2>
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
        <div className="admin-section">
          <h2>🎮 Tournament Controls</h2>
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
    </div>
  );
}

export default AdminPanel;

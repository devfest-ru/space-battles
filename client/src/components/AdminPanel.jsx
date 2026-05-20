import { useState, useEffect } from 'react';
import ReplayViewer from './ReplayViewer';
import LanguageSwitcher from './LanguageSwitcher';
import { KothStandings, kingLabel } from './Championship';
import { useT } from '../i18n/LanguageContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const ADMIN_KING = '__admin__';

function AdminPanel({ arenaState, kothState, onClose }) {
  const { t } = useT();
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
      showMessage(t('admin.messages.enterKey'), true);
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
      showMessage(t('admin.messages.invalidKey'), true);
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
        showMessage(t('admin.tournaments.messages.started', { bestOf, maxDraws }));
      } else {
        showMessage(result.error, true);
      }
    } catch (error) {
      showMessage(t('admin.tournaments.messages.failedStart'), true);
    }
  };

  const handleClearArena = async () => {
    if (!confirm(t('admin.tournaments.messages.confirmClear'))) return;
    try {
      const result = await adminFetch(`${API_URL}/api/arena/clear`, { method: 'POST' });

      if (!result) return;

      if (result.success) {
        showMessage(t('admin.tournaments.messages.cleared'));
      } else {
        showMessage(result.error, true);
      }
    } catch (error) {
      showMessage(t('admin.tournaments.messages.failedClear'), true);
    }
  };

  const handleResetArena = async () => {
    if (!confirm(t('admin.tournaments.messages.confirmReset'))) return;
    try {
      const result = await adminFetch(`${API_URL}/api/arena/reset`, { method: 'POST' });

      if (!result) return;

      if (result.success) {
        showMessage(t('admin.tournaments.messages.resetDone'));
      } else {
        showMessage(result.error, true);
      }
    } catch (error) {
      showMessage(t('admin.tournaments.messages.failedReset'), true);
    }
  };

  const tournament = arenaState?.tournament;
  const players = arenaState?.players || [];
  const playersWithCode = players.filter(p => p.hasCode);

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <h1>{t('admin.title')}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <LanguageSwitcher />
          <button className="close-admin-btn" onClick={onClose}>{t('admin.close')}</button>
        </div>
      </div>

      {message && (
        <div className={`arena-message ${message.isError ? 'error' : 'success'}`}>
          {message.text}
        </div>
      )}

      <div className="admin-content">
        {/* Admin Authentication */}
        <div className="admin-section">
          <h2>{t('admin.auth.title')}</h2>
          <div className="admin-key-input">
            <label htmlFor="adminKey">{t('admin.auth.label')}</label>
            <div className="key-input-wrapper">
              <input
                id="adminKey"
                type={keyVisible ? 'text' : 'password'}
                value={adminKey}
                onChange={(e) => handleKeyChange(e.target.value)}
                placeholder={t('admin.auth.placeholder')}
              />
              <button
                className="toggle-key-btn"
                onClick={() => setKeyVisible(!keyVisible)}
                type="button"
              >
                {keyVisible ? '🙈' : '👁️'}
              </button>
            </div>
            <span className="setting-hint">{t('admin.auth.hint')}</span>
          </div>
        </div>

        {/* Tournaments - olympic bracket system (collapsible container) */}
        <details className="admin-section admin-accordion">
          <summary className="admin-accordion-summary">{t('admin.tournaments.summary')}</summary>
          <div className="admin-accordion-body">

        {/* Status Overview */}
        <div className="admin-subsection">
          <h3>{t('admin.tournaments.status.title')}</h3>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-label">{t('admin.tournaments.status.registered')}</span>
              <span className="status-value">{players.length}</span>
            </div>
            <div className="status-item">
              <span className="status-label">{t('admin.tournaments.status.ready')}</span>
              <span className="status-value highlight">{playersWithCode.length}</span>
            </div>
            <div className="status-item">
              <span className="status-label">{t('admin.tournaments.status.tournament')}</span>
              <span className={`status-value ${tournament?.status || 'none'}`}>
                {tournament?.status === 'running' ? t('admin.tournaments.status.running') :
                 tournament?.status === 'completed' ? t('admin.tournaments.status.completed') :
                 t('admin.tournaments.status.none')}
              </span>
            </div>
            {tournament?.winner && (
              <div className="status-item">
                <span className="status-label">{t('admin.tournaments.status.winner')}</span>
                <span className="status-value winner">🏆 {tournament.winner}</span>
              </div>
            )}
          </div>
        </div>

        {/* Players List */}
        <div className="admin-subsection">
          <h3>{t('admin.tournaments.players.title', { n: players.length })}</h3>
          <div className="admin-players-list">
            {players.length === 0 ? (
              <p className="no-data">{t('admin.tournaments.players.empty')}</p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('admin.tournaments.players.col.name')}</th>
                    <th>{t('admin.tournaments.players.col.code')}</th>
                    <th>{t('admin.tournaments.players.col.registered')}</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map(player => (
                    <tr key={player.name}>
                      <td>{player.name}</td>
                      <td>
                        <span className={`code-status ${player.hasCode ? 'yes' : 'no'}`}>
                          {player.hasCode ? t('admin.tournaments.players.codeReady') : t('admin.tournaments.players.codePending')}
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
            <h3>{t('admin.tournaments.settings.title')}</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label htmlFor="bestOf">{t('admin.tournaments.settings.bestOf')}</label>
                <select
                  id="bestOf"
                  value={bestOf}
                  onChange={(e) => setBestOf(Number(e.target.value))}
                >
                  <option value={1}>{t('admin.tournaments.settings.gameOne')}</option>
                  <option value={3}>{t('admin.tournaments.settings.gameMany', { n: 3 })}</option>
                  <option value={5}>{t('admin.tournaments.settings.gameMany', { n: 5 })}</option>
                  <option value={7}>{t('admin.tournaments.settings.gameMany', { n: 7 })}</option>
                </select>
                <span className="setting-hint">{t('admin.tournaments.settings.bestOfHint')}</span>
              </div>
              <div className="setting-item">
                <label htmlFor="maxDraws">{t('admin.tournaments.settings.maxDraws')}</label>
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
                <span className="setting-hint">{t('admin.tournaments.settings.maxDrawsHint')}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tournament Controls */}
        <div className="admin-subsection">
          <h3>{t('admin.tournaments.controls.title')}</h3>
          <div className="admin-controls">
            {!tournament && (
              <button
                className="admin-btn start"
                onClick={handleStartTournament}
                disabled={playersWithCode.length < 2 || !adminKey}
              >
                {t('admin.tournaments.controls.start', { bestOf })}
                <span className="btn-hint">
                  {!adminKey
                    ? t('admin.tournaments.controls.hintNoKey')
                    : playersWithCode.length < 2
                      ? t('admin.tournaments.controls.hintNeed', { n: 2 - playersWithCode.length })
                      : t('admin.tournaments.controls.hintReady', { n: playersWithCode.length })}
                </span>
              </button>
            )}

            {tournament?.status === 'running' && (
              <div className="running-notice">
                <span className="live-dot"></span>
                {t('admin.tournaments.controls.running')}
              </div>
            )}

            {(!tournament?.status || tournament?.status === 'completed') && (
              <>
                <button
                  className="admin-btn warning"
                  onClick={handleResetArena}
                  disabled={!adminKey}
                >
                  {t('admin.tournaments.controls.reset')}
                  <span className="btn-hint">{t('admin.tournaments.controls.resetHint')}</span>
                </button>
                <button
                  className="admin-btn danger"
                  onClick={handleClearArena}
                  disabled={!adminKey}
                >
                  {t('admin.tournaments.controls.clear')}
                  <span className="btn-hint">{t('admin.tournaments.controls.clearHint')}</span>
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

        {/* Broadcast-only standings: kept separate so the host can hide the
            settings accordions on stream and show only this. */}
        <KothStandingsSection
          kothState={kothState}
          showMessage={showMessage}
        />
      </div>
    </div>
  );
}

// Admin controls for the King of the Hill ("Championship") mode.
function KothAdminSection({ kothState, adminFetch, showMessage, adminKey }) {
  const { t } = useT();
  const [kingCode, setKingCode] = useState('');
  const [roundK, setRoundK] = useState(2);
  const [codes, setCodes] = useState(null); // { teamsCode: [...], adminKingCode }

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
        showMessage(result.message || t('admin.koth.messages.done'));
      } else {
        showMessage(result.error, true);
      }
      return result;
    } catch {
      showMessage(t('admin.koth.messages.requestFailed'), true);
      return null;
    }
  };

  const loadCodes = async () => {
    try {
      const result = await adminFetch(`${API_URL}/api/koth/admin/state`);
      if (!result) return;
      setCodes({ teamsCode: result.teamsCode || [], adminKingCode: result.adminKingCode });
    } catch {
      showMessage(t('admin.koth.messages.failedAlgos'), true);
    }
  };

  // Lazily (re)load algorithms whenever the "All algorithms" panel is opened.
  const handleAllAlgosToggle = (e) => {
    if (e.target.open && adminKey) loadCodes();
  };

  const handleCreate = async () => {
    if (!kingCode.trim()) {
      showMessage(t('admin.koth.messages.enterStartingKing'), true);
      return;
    }
    await post(`${API_URL}/api/koth/tournament/create`, { kingCode });
  };

  const handleUpdateKing = async () => {
    if (!kingCode.trim()) {
      showMessage(t('admin.koth.messages.enterKing'), true);
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
    if (!confirm(t('admin.koth.messages.confirmFinish'))) return;
    await post(`${API_URL}/api/koth/tournament/finish`, {});
  };

  const handleReset = async () => {
    if (!confirm(t('admin.koth.messages.confirmReset'))) return;
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
      <summary className="admin-accordion-summary">{t('admin.koth.summary')}</summary>
      <div className="admin-accordion-body">

      {/* Status */}
      <div className="status-grid">
        <div className="status-item">
          <span className="status-label">{t('admin.koth.status.registered')}</span>
          <span className="status-value">{teams.length}</span>
        </div>
        <div className="status-item">
          <span className="status-label">{t('admin.koth.status.tournament')}</span>
          <span className={`status-value ${tournament?.status || 'none'}`}>
            {tournament?.status === 'running' ? t('admin.koth.status.running') :
             tournament?.status === 'completed' ? t('admin.koth.status.completed') :
             t('admin.koth.status.notStarted')}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">{t('admin.koth.status.currentKing')}</span>
          <span className="status-value highlight">
            {tournament ? kingLabel(tournament.kingName, t) : '—'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">{t('admin.koth.status.currentRound')}</span>
          <span className="status-value">
            {currentRound
              ? t('admin.koth.status.roundFormat', { n: currentRound.index + 1, status: currentRound.status })
              : '—'}
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="admin-players-list">
        {teams.length === 0 ? (
          <p className="no-data">{t('admin.koth.teams.empty')}</p>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.koth.teams.col.team')}</th>
                <th>{t('admin.koth.teams.col.algorithm')}</th>
                <th>{t('admin.koth.teams.col.updated')}</th>
              </tr>
            </thead>
            <tbody>
              {teams.map(tm => (
                <tr key={tm.name}>
                  <td>{tm.name === tournament?.kingName ? '👑 ' : ''}{tm.name}</td>
                  <td>
                    <span className={`code-status ${tm.hasCode ? 'yes' : 'no'}`}>
                      {tm.hasCode ? t('admin.koth.teams.loaded') : t('admin.koth.teams.none')}
                    </span>
                  </td>
                  <td>{tm.codeUpdatedAt ? new Date(tm.codeUpdatedAt).toLocaleString() : t('admin.koth.teams.updatedNone')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* All algorithms - collapsible, lazily loaded on open */}
      <details className="koth-allalgos" onToggle={handleAllAlgosToggle}>
        <summary>{t('admin.koth.allAlgos.summary')}</summary>
        <div className="koth-codes">
          {!adminKey ? (
            <p className="no-data">{t('admin.koth.allAlgos.enterKey')}</p>
          ) : !codes ? (
            <p className="no-data">{t('admin.koth.allAlgos.loading')}</p>
          ) : (
            [ADMIN_KING, ...teams.map(tm => tm.name)].map(name => (
              <details key={name}>
                <summary>{kingLabel(name, t)}</summary>
                <pre className="koth-code-pre">{codeFor(name) || t('admin.koth.allAlgos.empty')}</pre>
              </details>
            ))
          )}
        </div>
      </details>

      {/* Controls */}
      <div className="admin-controls" style={{ marginTop: '1.25rem' }}>
        {!tournament && (
          <>
            <div className="setting-item" style={{ width: '100%' }}>
              <label htmlFor="kothKingCode">{t('admin.koth.controls.startingKingLabel')}</label>
              <textarea
                id="kothKingCode"
                className="koth-code-input"
                value={kingCode}
                onChange={(e) => setKingCode(e.target.value)}
                placeholder={t('admin.koth.controls.startingKingPlaceholder')}
                rows={8}
              />
            </div>
            <button
              className="admin-btn start"
              onClick={handleCreate}
              disabled={!adminKey || teams.length < 1}
            >
              {t('admin.koth.controls.create')}
              <span className="btn-hint">
                {teams.length < 1 ? t('admin.koth.controls.createHintNeed') : t('admin.koth.controls.createHintCloses')}
              </span>
            </button>
          </>
        )}

        {tournament?.status === 'running' && (
          <>
            {tournament.kingName === ADMIN_KING && !battlesRunning && (
              <>
                <div className="setting-item" style={{ width: '100%' }}>
                  <label htmlFor="kothKingEdit">{t('admin.koth.controls.editKingLabel')}</label>
                  <textarea
                    id="kothKingEdit"
                    className="koth-code-input"
                    value={kingCode}
                    onChange={(e) => setKingCode(e.target.value)}
                    placeholder={t('admin.koth.controls.editKingPlaceholder')}
                    rows={6}
                  />
                </div>
                <button className="koth-btn-sm" onClick={handleUpdateKing} disabled={!adminKey}>
                  {t('admin.koth.controls.updateKing')}
                </button>
              </>
            )}

            {(!currentRound || currentRound.status === 'finished') && (
              <div className="setting-item">
                <label htmlFor="kothK">{t('admin.koth.controls.kLabel')}</label>
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
                {t('admin.koth.controls.startRound', { K: roundK })}
                <span className="btn-hint">{t('admin.koth.controls.startRoundHint')}</span>
              </button>
            )}

            {currentRound?.status === 'collecting' && (
              <button className="admin-btn start" onClick={handleRunRound} disabled={!adminKey}>
                {t('admin.koth.controls.runRound')}
                <span className="btn-hint">{t('admin.koth.controls.runRoundHint')}</span>
              </button>
            )}

            {battlesRunning && (
              <div className="running-notice">
                <span className="live-dot"></span>
                {t('admin.koth.controls.battling')}
              </div>
            )}

            {!battlesRunning && (
              <button className="admin-btn warning" onClick={handleFinish} disabled={!adminKey}>
                {t('admin.koth.controls.finish')}
                <span className="btn-hint">{t('admin.koth.controls.finishHint')}</span>
              </button>
            )}
          </>
        )}

        <button className="admin-btn danger" onClick={handleReset} disabled={!adminKey || battlesRunning}>
          {t('admin.koth.controls.reset')}
          <span className="btn-hint">{t('admin.koth.controls.resetHint')}</span>
        </button>
      </div>
      </div>
    </details>
  );
}

// Third top-level admin accordion: broadcast-friendly standings view.
// Independent of the settings accordions so the host can close the noisy
// control sections during a screen share and only show this one.
function KothStandingsSection({ kothState, showMessage }) {
  const { t } = useT();
  const [selectedReplay, setSelectedReplay] = useState(null);

  const handleViewReplay = async (seriesId, gameIndex, teamName, kingName) => {
    try {
      const res = await fetch(`${API_URL}/api/koth/replay/${seriesId}/${gameIndex}`);
      if (!res.ok) {
        showMessage(t('admin.messages.replayNotFound'), true);
        return;
      }
      const data = await res.json();
      setSelectedReplay({ data, leftName: teamName, rightName: kingLabel(kingName, t) });
    } catch {
      showMessage(t('admin.messages.failedReplay'), true);
    }
  };

  return (
    <details className="admin-section admin-accordion admin-accordion-blue">
      <summary className="admin-accordion-summary">{t('admin.broadcast.summary')}</summary>
      <div className="admin-accordion-body">
        <KothStandings kothState={kothState} onViewReplay={handleViewReplay} />
      </div>

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
    </details>
  );
}

export default AdminPanel;

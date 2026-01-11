import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import Editor from '@monaco-editor/react';
import GameCanvas from './components/GameCanvas';
import Arena from './components/Arena';
import AdminPanel from './components/AdminPanel';
import IntroTutorial from './components/IntroTutorial';
import { soundManager } from './utils/sounds';
import { GameEngine, GAME_CONSTANTS } from '@space-battles/shared';

const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DEFAULT_CODE_P1 = `// ═══════════════════════════════════════════════════════════════
// FLEET ALPHA: "HUNTER" - Aim First, Kill Fast
// Simple but deadly: always aim at target, shoot when aligned
// ═══════════════════════════════════════════════════════════════

const { myShips, enemyShips, rockets, field, gameTime, constants } = state;

function norm(a) { return ((a % 360) + 540) % 360 - 180; }
function angle(x1, y1, x2, y2) { return Math.atan2(y2-y1, x2-x1) * 180/Math.PI; }
function dist(x1, y1, x2, y2) { return Math.hypot(x2-x1, y2-y1); }

// Lead target prediction
function leadShot(ship, enemy, d) {
  const speed = constants.SHIP_MIN_SPEED + constants.SHIP_BOOST_SPEED * 0.5;
  const rad = enemy.bodyAngle * Math.PI / 180;
  const t = d / constants.ROCKET_SPEED;
  return angle(ship.x, ship.y, 
    enemy.x + Math.cos(rad) * speed * t * 0.5,
    enemy.y + Math.sin(rad) * speed * t * 0.5);
}

// Check for incoming rockets
function incomingRocket(ship) {
  for (const r of rockets) {
    if (r.playerId === ship.playerId) continue;
    const rad = r.angle * Math.PI / 180;
    const dx = ship.x - r.x, dy = ship.y - r.y;
    if (dx * Math.cos(rad) + dy * Math.sin(rad) < 0) continue;
    const t = Math.hypot(dx, dy) / constants.ROCKET_SPEED;
    const hx = r.x + Math.cos(rad) * constants.ROCKET_SPEED * t;
    const hy = r.y + Math.sin(rad) * constants.ROCKET_SPEED * t;
    if (dist(ship.x, ship.y, hx, hy) < 50 && t < 0.6) {
      return r.angle + ((dx * Math.sin(rad) - dy * Math.cos(rad)) > 0 ? -90 : 90);
    }
  }
  return null;
}

const enemies = enemyShips.filter(e => e.isAlive);

for (let i = 0; i < myShips.length; i++) {
  const ship = myShips[i];
  if (!ship.isAlive || enemies.length === 0) continue;
  
  // Target: closest enemy
  const target = enemies.reduce((best, e) => {
    const d = dist(ship.x, ship.y, e.x, e.y);
    return d < best.d ? { e, d } : best;
  }, { e: enemies[0], d: Infinity }).e;
  
  const d = dist(ship.x, ship.y, target.x, target.y);
  const directAngle = angle(ship.x, ship.y, target.x, target.y);
  const aimAngle = d > 300 ? leadShot(ship, target, d) : directAngle;
  const aimDiff = norm(aimAngle - ship.bodyAngle);
  
  const dodge = incomingRocket(ship);
  const margin = 100;
  const nearWall = ship.x < margin || ship.x > field.width - margin ||
                   ship.y < margin || ship.y > field.height - margin;
  
  let rotate = 0, boost = 0;
  
  if (dodge !== null) {
    // DODGE incoming rocket
    const diff = norm(dodge - ship.bodyAngle);
    rotate = diff > 0 ? 1 : -1;
    boost = 1;
  } else if (nearWall) {
    // ESCAPE wall
    const escape = angle(ship.x, ship.y, field.width/2, field.height/2);
    const diff = norm(escape - ship.bodyAngle);
    rotate = diff > 5 ? 1 : diff < -5 ? -1 : 0;
    boost = Math.abs(diff) < 45 ? 1 : 0;
  } else {
    // HUNT: Always aim at target
    rotate = aimDiff > 3 ? 1 : aimDiff < -3 ? -1 : 0;
    
    // Boost based on distance and alignment
    if (d > 400) boost = Math.abs(aimDiff) < 30 ? 1 : 0; // Close in
    else if (d < 150) boost = 1; // Too close, move
    else boost = Math.abs(aimDiff) > 20 ? 1 : 0; // Reposition if not aimed
  }
  
  // SHOOT when aimed
  const shoot = Math.abs(aimDiff) < 12 && ship.canShoot;
  
  commands[ship.id] = { rotate, boost, shoot };
}`;

const DEFAULT_CODE_P2 = `// ═══════════════════════════════════════════════════════════════
// FLEET OMEGA: "STALKER" - Patient Predator
// Circle and strike: orbit at range, take precise shots
// ═══════════════════════════════════════════════════════════════

const { myShips, enemyShips, rockets, field, gameTime, constants } = state;

function norm(a) { return ((a % 360) + 540) % 360 - 180; }
function angle(x1, y1, x2, y2) { return Math.atan2(y2-y1, x2-x1) * 180/Math.PI; }
function dist(x1, y1, x2, y2) { return Math.hypot(x2-x1, y2-y1); }

// Lead target prediction
function leadShot(ship, enemy, d) {
  const speed = constants.SHIP_MIN_SPEED + constants.SHIP_BOOST_SPEED * 0.5;
  const rad = enemy.bodyAngle * Math.PI / 180;
  const t = d / constants.ROCKET_SPEED;
  return angle(ship.x, ship.y,
    enemy.x + Math.cos(rad) * speed * t * 0.5,
    enemy.y + Math.sin(rad) * speed * t * 0.5);
}

// Check for incoming rockets
function incomingRocket(ship, idx) {
  for (const r of rockets) {
    if (r.playerId === ship.playerId) continue;
    const rad = r.angle * Math.PI / 180;
    const dx = ship.x - r.x, dy = ship.y - r.y;
    if (dx * Math.cos(rad) + dy * Math.sin(rad) < 0) continue;
    const t = Math.hypot(dx, dy) / constants.ROCKET_SPEED;
    const hx = r.x + Math.cos(rad) * constants.ROCKET_SPEED * t;
    const hy = r.y + Math.sin(rad) * constants.ROCKET_SPEED * t;
    if (dist(ship.x, ship.y, hx, hy) < 50 && t < 0.6) {
      return r.angle + ((idx % 2 === 0) ? 90 : -90);
    }
  }
  return null;
}

const enemies = enemyShips.filter(e => e.isAlive);

for (let i = 0; i < myShips.length; i++) {
  const ship = myShips[i];
  if (!ship.isAlive || enemies.length === 0) continue;
  
  // Target: weakest enemy, then closest
  const target = enemies.reduce((best, e) => {
    const d = dist(ship.x, ship.y, e.x, e.y);
    const score = (4 - e.health) * 500 - d;
    return score > best.score ? { e, d, score } : best;
  }, { e: enemies[0], d: dist(ship.x, ship.y, enemies[0].x, enemies[0].y), score: -Infinity }).e;
  
  const d = dist(ship.x, ship.y, target.x, target.y);
  const directAngle = angle(ship.x, ship.y, target.x, target.y);
  const aimAngle = d > 250 ? leadShot(ship, target, d) : directAngle;
  const aimDiff = norm(aimAngle - ship.bodyAngle);
  
  const dodge = incomingRocket(ship, i);
  const margin = 100;
  const nearWall = ship.x < margin || ship.x > field.width - margin ||
                   ship.y < margin || ship.y > field.height - margin;
  
  let rotate = 0, boost = 0;
  
  if (dodge !== null) {
    // DODGE incoming rocket
    const diff = norm(dodge - ship.bodyAngle);
    rotate = diff > 0 ? 1 : -1;
    boost = 1;
  } else if (nearWall) {
    // ESCAPE wall
    const escape = angle(ship.x, ship.y, field.width/2, field.height/2);
    const diff = norm(escape - ship.bodyAngle);
    rotate = diff > 5 ? 1 : diff < -5 ? -1 : 0;
    boost = Math.abs(diff) < 45 ? 1 : 0;
  } else if (Math.abs(aimDiff) < 15) {
    // ALIGNED: Stop rotating, take the shot!
    rotate = aimDiff > 2 ? 1 : aimDiff < -2 ? -1 : 0;
    boost = d < 200 ? 1 : 0; // Only boost if too close
  } else {
    // NOT ALIGNED: Rotate toward target
    rotate = aimDiff > 0 ? 1 : -1;
    
    // Slight orbit while turning (different direction per ship)
    const orbitDir = (i % 2 === 0) ? 1 : -1;
    const orbitAngle = directAngle + 45 * orbitDir;
    const orbitDiff = norm(orbitAngle - ship.bodyAngle);
    
    // Boost if moving somewhat toward orbit position
    boost = Math.abs(orbitDiff) < 60 ? 1 : 0;
  }
  
  // SHOOT when aimed (slightly wider window than P1)
  const shoot = Math.abs(aimDiff) < 14 && ship.canShoot;
  
  commands[ship.id] = { rotate, boost, shoot };
}`;

function App() {
  // Local game engine for sandbox mode (each client has their own!)
  const gameEngineRef = useRef(null);
  const gameLoopRef = useRef(null);
  
  const [socket, setSocket] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [player1Code, setPlayer1Code] = useState(DEFAULT_CODE_P1);
  const [player2Code, setPlayer2Code] = useState(DEFAULT_CODE_P2);
  const [player1Submitted, setPlayer1Submitted] = useState(false);
  const [player2Submitted, setPlayer2Submitted] = useState(false);
  const [connected, setConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mode, setMode] = useState('sandbox'); // 'sandbox' or 'arena'
  const [arenaState, setArenaState] = useState(null);
  const [showAdmin, setShowAdmin] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('admin');
  });
  const [showTutorial, setShowTutorial] = useState(false);

  // Initialize local game engine on mount
  useEffect(() => {
    gameEngineRef.current = new GameEngine();
    gameEngineRef.current.initializeGame();
    setGameState(gameEngineRef.current.getGameState());
    
    return () => {
      // Cleanup game loop on unmount
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, []);

  // Check for first visit and show tutorial
  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('effectiveSpaceTutorialSeen');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const handleCloseTutorial = () => {
    setShowTutorial(false);
    localStorage.setItem('effectiveSpaceTutorialSeen', 'true');
  };


  // Connect to socket (only needed for Arena mode)
  useEffect(() => {
    const newSocket = io(SOCKET_URL);
    
    newSocket.on('connect', () => {
      console.log('Connected to server (for Arena mode)');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });

    // Arena updates only - sandbox runs locally!
    newSocket.on('arenaUpdate', (state) => {
      setArenaState(state);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Initialize sound on first user interaction and start background music
  useEffect(() => {
    // Don't initialize sound in admin mode
    if (showAdmin) return;
    
    const initSound = () => {
      soundManager.init();
      document.removeEventListener('click', initSound);
      document.removeEventListener('keydown', initSound);
      document.removeEventListener('touchstart', initSound);
    };
    document.addEventListener('click', initSound);
    document.addEventListener('keydown', initSound);
    document.addEventListener('touchstart', initSound);
    return () => {
      document.removeEventListener('click', initSound);
      document.removeEventListener('keydown', initSound);
      document.removeEventListener('touchstart', initSound);
    };
  }, [showAdmin]);

  // Track previous game state for sound triggers
  const prevGameStateRef = useRef(null);

  // Play sounds based on game events
  useEffect(() => {
    if (!gameState) return;

    // Play sounds for events (only if sound enabled)
    if (soundEnabled && gameState.events) {
      for (const event of gameState.events) {
        if (event.type === 'shoot') {
          soundManager.playShoot();
        } else if (event.type === 'hit') {
          soundManager.playHit();
        } else if (event.type === 'destroyed') {
          soundManager.playDestroy();
        }
      }
    }

    // When game ends (winner determined)
    if (gameState.winner && !prevGameStateRef.current?.winner) {
      // Play victory sound
      if (soundEnabled) {
        setTimeout(() => soundManager.playVictory(), 300);
      }
      // Exit fullscreen after a short delay to show the winner
      setTimeout(() => setIsFullscreen(false), 2000);
    }

    prevGameStateRef.current = gameState;
  }, [gameState, soundEnabled]);

  // Toggle sound on/off
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const newValue = !prev;
      soundManager.setMasterVolume(newValue ? 0.3 : 0);
      return newValue;
    });
  }, []);

  // Local game loop using requestAnimationFrame for smooth 60fps
  const runGameLoop = useCallback(() => {
    if (!gameEngineRef.current?.isRunning) return;
    
    const state = gameEngineRef.current.tick();
    setGameState(state);
    
    if (state.isRunning) {
      gameLoopRef.current = requestAnimationFrame(runGameLoop);
    }
  }, []);

  const submitCode = useCallback((playerId, code) => {
    if (!gameEngineRef.current) return;
    
    gameEngineRef.current.setPlayerCode(playerId, code);
    if (playerId === 1) setPlayer1Submitted(true);
    if (playerId === 2) setPlayer2Submitted(true);
  }, []);

  const startGame = useCallback(() => {
    if (!gameEngineRef.current) return;
    
    const result = gameEngineRef.current.startGame();
    if (result.success) {
      // Start the local game loop
      gameLoopRef.current = requestAnimationFrame(runGameLoop);
    } else {
      console.error('Failed to start game:', result.error);
    }
  }, [runGameLoop]);

  const stopGame = useCallback(() => {
    if (!gameEngineRef.current) return;
    
    // Cancel the game loop
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    
    // Stop and reset positions but keep code
    gameEngineRef.current.stopAndReset();
    setGameState(gameEngineRef.current.getGameState());
  }, []);

  const resetGame = useCallback(() => {
    if (!gameEngineRef.current) return;
    
    // Cancel the game loop
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    
    // Full reset including code
    gameEngineRef.current.initializeGame();
    setGameState(gameEngineRef.current.getGameState());
    setPlayer1Submitted(false);
    setPlayer2Submitted(false);
  }, []);

  const downloadBattleLog = useCallback(() => {
    if (!gameEngineRef.current) return;
    
    const log = gameEngineRef.current.getBattleLog();
    
    // Create a formatted text version for easy reading
    let textLog = `=== SPACE BATTLE LOG ===\n`;
    textLog += `Sector: ${log.field.width} x ${log.field.height}\n`;
    textLog += `Duration: ${Math.floor(log.duration / 1000)}s\n`;
    textLog += `Victor: ${log.winner === 'draw' ? 'Draw' : `Fleet ${log.winner}`}\n\n`;
    
    textLog += `=== COMBAT PARAMETERS ===\n`;
    textLog += `Ship Min Speed: ${log.constants.SHIP_MIN_SPEED}\n`;
    textLog += `Ship Boost Speed: ${log.constants.SHIP_BOOST_SPEED}\n`;
    textLog += `Ship Rotation: ${log.constants.SHIP_ROTATION_SPEED}°/s\n`;
    textLog += `Rocket Speed: ${log.constants.ROCKET_SPEED}\n`;
    textLog += `Recharge Time: ${log.constants.RELOAD_TIME}ms\n\n`;
    
    textLog += `=== BATTLE SNAPSHOTS (every 500ms) ===\n\n`;
    
    for (const snap of log.snapshots) {
      textLog += `--- ${snap.timeFormatted} (${snap.time}ms) ---\n`;
      
      textLog += `Ships:\n`;
      for (const ship of snap.ships) {
        const status = ship.alive ? `Shield:${ship.health}` : 'DESTROYED';
        textLog += `  [F${ship.player}] ${ship.id}: pos(${ship.x}, ${ship.y}) heading:${ship.bodyAngle}° ${status}\n`;
      }
      
      if (snap.rockets && snap.rockets.length > 0) {
        textLog += `Rockets: ${snap.rockets.length}\n`;
        for (const rocket of snap.rockets) {
          textLog += `  [F${rocket.player}] pos(${rocket.x}, ${rocket.y}) angle:${rocket.angle}°\n`;
        }
      }
      
      textLog += `Commands:\n`;
      textLog += `  F1: ${JSON.stringify(snap.commands.p1)}\n`;
      textLog += `  F2: ${JSON.stringify(snap.commands.p2)}\n`;
      
      if (snap.events.length > 0) {
        textLog += `Events: ${snap.events.map(e => e.type).join(', ')}\n`;
      }
      
      textLog += `\n`;
    }
    
    // Download as text file
    const blob = new Blob([textLog], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `space-battle-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const formatTime = (ms) => {
    if (!ms) return '00:00';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getPlayerShips = (playerId) => {
    if (!gameState?.ships) return [];
    return gameState.ships.filter(s => s.playerId === playerId);
  };

  const getGameStatus = () => {
    // Sandbox mode runs locally, no server connection needed
    if (!gameState) return { text: 'Loading...', status: 'waiting' };
    if (gameState.winner) return { text: `Battle Complete`, status: 'ended' };
    if (gameState.isRunning) return { text: 'Engage!', status: 'running' };
    return { text: 'Standing By', status: 'waiting' };
  };

  const status = getGameStatus();

  // Render Admin Panel
  if (showAdmin) {
    return (
      <div className="app admin-mode">
        <AdminPanel 
          arenaState={arenaState} 
          onClose={() => {
            setShowAdmin(false);
            // Remove ?admin from URL without reload
            window.history.replaceState({}, '', window.location.pathname);
          }} 
        />
      </div>
    );
  }

  // Render Arena mode
  if (mode === 'arena') {
    return (
      <div className="app arena-mode">
        <Arena 
          arenaState={arenaState} 
          onBack={() => setMode('sandbox')} 
        />
      </div>
    );
  }

  // Render Sandbox mode
  return (
    <div className={`app ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      <header className="header">
        <div className="logo-wrapper">
          <div className="logo">
            Space <span>Battles</span>
          </div>
          <button 
            className="icon-btn" 
            onClick={() => setShowTutorial(true)}
            title="Show Tutorial"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 8a4 4 0 0 1 7 2c0 2.5-3.5 3.5-3.5 5.5"/>
              <circle cx="12" cy="18.5" r="1" fill="currentColor" stroke="none"/>
            </svg>
          </button>
          <button 
            className={`icon-btn ${soundEnabled ? 'sound-on' : 'sound-off'}`}
            onClick={toggleSound}
            title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
          >
            {soundEnabled ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                <line x1="23" y1="9" x2="17" y2="15"/>
                <line x1="17" y1="9" x2="23" y2="15"/>
              </svg>
            )}
          </button>
        </div>
        <div className="mode-selector">
          <button 
            className={`mode-btn ${mode === 'sandbox' ? 'active' : ''}`}
            onClick={() => setMode('sandbox')}
          >
            🚀 Simulator
          </button>
          <button 
            className={`mode-btn ${mode === 'arena' ? 'active' : ''}`}
            onClick={() => setMode('arena')}
          >
            🏆 Championship
          </button>
        </div>
        <div className="game-status">
          <div className="status-indicator">
            <div className={`status-dot ${status.status}`}></div>
            <span>{status.text}</span>
          </div>
          <div className="game-timer">
            {formatTime(gameState?.gameTime)}
          </div>
        </div>
      </header>

      <main className="main-content">
        {/* Fleet 1 Panel */}
        <div className="player-panel player-1">
          <div className="player-header">
            <div className="player-name">
              <span>◆</span> Fleet Alpha
            </div>
            <div className="player-ships">
              {getPlayerShips(1).map((ship, i) => (
                <div 
                  key={ship.id} 
                  className={`ship-indicator ${!ship.isAlive ? 'destroyed' : ''}`}
                  title={ship.isAlive ? `Shield: ${ship.health}/3` : 'Destroyed'}
                >
                  {ship.isAlive ? ship.health : '✕'}
                </div>
              ))}
            </div>
          </div>
          <div className="editor-container">
            <div className="editor-wrapper">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={player1Code}
                onChange={setPlayer1Code}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  readOnly: player1Submitted,
                }}
              />
            </div>
            <button 
              className={`submit-btn ${player1Submitted ? 'submitted' : ''}`}
              onClick={() => submitCode(1, player1Code)}
              disabled={gameState?.isRunning}
            >
              {player1Submitted ? '✓ Code Submitted' : 'Submit Code'}
            </button>
          </div>
        </div>

        {/* Game Arena */}
        <div className="game-arena">
          <div className="arena-container">
            <div className="game-canvas-wrapper">
              <GameCanvas 
                gameState={gameState} 
                constants={GAME_CONSTANTS}
              />
              {isFullscreen && (
                <button 
                  className="fullscreen-exit-btn"
                  onClick={() => setIsFullscreen(false)}
                  title="Exit fullscreen"
                >
                  ✕
                </button>
              )}
              {gameState?.winner && (
                <div className="winner-overlay">
                  <div className={`winner-message ${
                    gameState.winner === 1 ? 'player-1' : 
                    gameState.winner === 2 ? 'player-2' : 'draw'
                  }`}>
                    {gameState.winner === 'draw' 
                      ? 'Stalemate!' 
                      : `Fleet ${gameState.winner === 1 ? 'Alpha' : 'Omega'} Victorious!`}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="game-controls">
            <button 
              className="control-btn start"
              onClick={startGame}
              disabled={!player1Submitted || !player2Submitted || gameState?.isRunning}
            >
              ⚡ Start
            </button>
            <button 
              className="control-btn stop"
              onClick={stopGame}
              disabled={!gameState?.isRunning}
            >
              ⏹ Stop
            </button>
            <button 
              className="control-btn reset"
              onClick={resetGame}
            >
              ↻ Reset
            </button>
            <button 
              className="control-btn fullscreen"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? '⊙ Exit Full Screen' : '⛶ Full Screen'}
            </button>
            <button 
              className="control-btn log"
              onClick={downloadBattleLog}
              title="Download battle log for analysis"
            >
              📋 Log
            </button>
          </div>

          <div className="api-reference">
            <h3>📖 Fleet Command API</h3>
            <pre>{`Available in your code:
• state.myShips[]     - Your ships
• state.enemyShips[]  - Enemy ships
• state.rockets[]    - Active rockets
• state.field         - {width, height}
• state.gameTime      - Mission time (ms)

Ship properties:
• id, x, y, bodyAngle, weaponAngle
• health, isAlive, healthRatio, maxSpeed
• canShoot, healthRatio, maxSpeed

Commands (set on commands[ship.id]):
• boost: 1 - adds extra thrust
• rotate: 1 (clockwise) or -1 (counter)
• shoot: true to fire rocket

Ships always drift forward at MIN_SPEED.
Boost adds extra speed based on health!`}</pre>
          </div>
        </div>

        {/* Fleet 2 Panel */}
        <div className="player-panel player-2">
          <div className="player-header">
            <div className="player-name">
              <span>◆</span> Fleet Omega
            </div>
            <div className="player-ships">
              {getPlayerShips(2).map((ship, i) => (
                <div 
                  key={ship.id} 
                  className={`ship-indicator ${!ship.isAlive ? 'destroyed' : ''}`}
                  title={ship.isAlive ? `Shield: ${ship.health}/3` : 'Destroyed'}
                >
                  {ship.isAlive ? ship.health : '✕'}
                </div>
              ))}
            </div>
          </div>
          <div className="editor-container">
            <div className="editor-wrapper">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={player2Code}
                onChange={setPlayer2Code}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                  readOnly: player2Submitted,
                }}
              />
            </div>
            <button 
              className={`submit-btn ${player2Submitted ? 'submitted' : ''}`}
              onClick={() => submitCode(2, player2Code)}
              disabled={gameState?.isRunning}
            >
              {player2Submitted ? '✓ Code Submitted' : 'Submit Code'}
            </button>
          </div>
        </div>
      </main>

      {/* Intro Tutorial */}
      {showTutorial && (
        <IntroTutorial onClose={handleCloseTutorial} />
      )}
    </div>
  );
}

export default App;


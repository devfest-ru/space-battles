import { useState, useEffect, useRef, useCallback } from 'react';
import { useT } from '../i18n/LanguageContext';

const COLORS = {
  background: '#050510',
  grid: '#1a2332',
  player1: { 
    body: '#ff9500', 
    bodyMedium: '#cc7700',
    bodyCritical: '#994400',
    engine: '#ffaa00', 
    outline: '#cc6600',
    glow: 'rgba(255, 149, 0, 0.4)',
  },
  player2: { 
    body: '#a855f7', 
    bodyMedium: '#8844cc',
    bodyCritical: '#663399',
    engine: '#bf7fff', 
    outline: '#7c3aed',
    glow: 'rgba(168, 85, 247, 0.4)',
  },
  rocket: { player1: '#ff9500', player2: '#a855f7' },
};

// Linear interpolation helper
function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Interpolate angle (handling 360° wrap-around)
function lerpAngle(a, b, t) {
  let diff = b - a;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return a + diff * t;
}

// Find a ship by ID in a snapshot
function findShip(ships, id) {
  return ships.find(s => s.id === id);
}

// Find a rocket by ID in a snapshot
function findRocket(rockets, id) {
  return rockets?.find(r => r.id === id);
}

// Get ships array from snapshot (backward compatible)
function getShips(snap) {
  return snap.ships || [];
}

// Get rockets array from snapshot
function getRockets(snap) {
  return snap.rockets || [];
}

// Interpolate between two snapshots
function interpolateState(snap1, snap2, t) {
  if (!snap1) return snap2;
  if (!snap2) return snap1;
  
  const ships1 = getShips(snap1);
  const ships2 = getShips(snap2);
  const rockets1 = getRockets(snap1);
  const rockets2 = getRockets(snap2);
  
  // Interpolate ships first
  const ships = ships2.map(ship2 => {
    const ship1 = findShip(ships1, ship2.id);
    if (!ship1 || !ship1.isAlive) return ship2;
    if (!ship2.isAlive) return ship2;
    
    return {
      ...ship2,
      x: lerp(ship1.x, ship2.x, t),
      y: lerp(ship1.y, ship2.y, t),
      bodyAngle: lerpAngle(ship1.bodyAngle, ship2.bodyAngle, t),
      weaponAngle: lerpAngle(
        ship1.weaponAngle || ship1.bodyAngle, 
        ship2.weaponAngle || ship2.bodyAngle, 
        t
      ),
    };
  });
  
  // Interpolate rockets
  const rockets = rockets2.map(rocket2 => {
    const rocket1 = findRocket(rockets1, rocket2.id);
    
    if (rocket1) {
      // Rocket exists in both snapshots - interpolate between positions
      return {
        ...rocket2,
        x: lerp(rocket1.x, rocket2.x, t),
        y: lerp(rocket1.y, rocket2.y, t),
      };
    }
    
    // New rocket - just show at current position (will appear and then interpolate normally)
    return rocket2;
  });
  
  return { ships, rockets, time: lerp(snap1.time, snap2.time, t) };
}

function ReplayViewer({ replay, onClose, leftName, rightName }) {
  const { t } = useT();
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0); // Current playback time in ms
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [containerSize, setContainerSize] = useState({ width: 1200, height: 700 });
  const animationRef = useRef(null);
  const lastRenderTime = useRef(null);

  // Track container size for responsive canvas
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      setContainerSize({ width: rect.width - 40, height: rect.height - 40 });
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    window.addEventListener('resize', updateSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  const snapshots = replay?.snapshots || [];
  const duration = replay?.duration || 0;

  // Find snapshots surrounding current time and interpolate
  const getInterpolatedState = useCallback((time) => {
    if (snapshots.length === 0) return null;
    if (snapshots.length === 1) return { 
      ships: getShips(snapshots[0]), 
      rockets: getRockets(snapshots[0]), 
      time: snapshots[0].time 
    };
    
    // Find the two snapshots surrounding this time
    let snap1Index = 0;
    for (let i = 0; i < snapshots.length - 1; i++) {
      if (snapshots[i + 1].time > time) {
        snap1Index = i;
        break;
      }
      snap1Index = i;
    }
    
    const snap1 = snapshots[snap1Index];
    const snap2 = snapshots[snap1Index + 1] || snap1;
    
    if (snap1 === snap2 || snap1.time === snap2.time) {
      return { ships: getShips(snap1), rockets: getRockets(snap1), time: snap1.time };
    }
    
    // Calculate interpolation factor (0-1)
    const timeDelta = snap2.time - snap1.time;
    const t = Math.max(0, Math.min(1, (time - snap1.time) / timeDelta));
    
    return interpolateState(snap1, snap2, t);
  }, [snapshots]);

  // Animation loop for smooth playback
  useEffect(() => {
    if (!isPlaying) {
      lastRenderTime.current = null;
      return;
    }

    const animate = (timestamp) => {
      if (lastRenderTime.current === null) {
        lastRenderTime.current = timestamp;
      }

      const deltaMs = (timestamp - lastRenderTime.current) * playbackSpeed;
      lastRenderTime.current = timestamp;

      setCurrentTime(prev => {
        const newTime = prev + deltaMs;
        if (newTime >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return newTime;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, duration]);

  // Drawing - runs on every frame when playing, or when time changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !replay) return;

    const state = getInterpolatedState(currentTime);
    if (!state) return;

    const ctx = canvas.getContext('2d');
    const finalState = replay.finalState;
    const width = finalState?.field?.width || 800;
    const height = finalState?.field?.height || 600;

    // Scale to fit container
    const scale = Math.min(containerSize.width / width, containerSize.height / height);

    canvas.width = width * scale;
    canvas.height = height * scale;

    ctx.scale(scale, scale);

    // Clear
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 3;
    ctx.strokeRect(1.5, 1.5, width - 3, height - 3);

    // Team labels - left side is player 1, right side is player 2
    {
      const labelSize = Math.max(28, Math.round(height * 0.04));
      ctx.font = `bold ${labelSize}px 'JetBrains Mono', monospace`;
      ctx.textBaseline = 'top';
      ctx.fillStyle = COLORS.player1.body;
      ctx.textAlign = 'left';
      ctx.fillText(leftName || t('fleet.alpha'), 24, 22);
      ctx.fillStyle = COLORS.player2.body;
      ctx.textAlign = 'right';
      ctx.fillText(rightName || t('fleet.omega'), width - 24, 22);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
    }

    // Draw ships (spaceship style)
    const shipSize = finalState?.constants?.SHIP_SIZE || 30;
    for (const ship of state.ships) {
      if (!ship.isAlive) {
        ctx.globalAlpha = 0.25;
      }

      const colors = ship.playerId === 1 ? COLORS.player1 : COLORS.player2;
      let bodyColor = colors.body;
      if (ship.health === 2) bodyColor = colors.bodyMedium;
      if (ship.health === 1) bodyColor = colors.bodyCritical;

      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate((ship.bodyAngle * Math.PI) / 180);

      // Engine glow (behind ship)
      const engineGlow = ctx.createRadialGradient(-shipSize * 0.6, 0, 0, -shipSize * 0.6, 0, shipSize * 0.8);
      engineGlow.addColorStop(0, colors.engine);
      engineGlow.addColorStop(0.3, colors.glow);
      engineGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = engineGlow;
      ctx.beginPath();
      ctx.ellipse(-shipSize * 0.6, 0, shipSize * 0.8, shipSize * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ship body (sleek fighter shape)
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = colors.outline;
      ctx.lineWidth = 2;

      // Main body - pointed nose
      ctx.beginPath();
      ctx.moveTo(shipSize * 1.2, 0);  // Nose
      ctx.lineTo(shipSize * 0.3, -shipSize * 0.4);  // Upper front
      ctx.lineTo(-shipSize * 0.6, -shipSize * 0.5);  // Upper back
      ctx.lineTo(-shipSize * 0.8, -shipSize * 0.3);  // Engine top
      ctx.lineTo(-shipSize * 0.8, shipSize * 0.3);   // Engine bottom
      ctx.lineTo(-shipSize * 0.6, shipSize * 0.5);   // Lower back
      ctx.lineTo(shipSize * 0.3, shipSize * 0.4);    // Lower front
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit
      ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
      ctx.beginPath();
      ctx.ellipse(shipSize * 0.4, 0, shipSize * 0.35, shipSize * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wings
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      // Top wing
      ctx.moveTo(0, -shipSize * 0.4);
      ctx.lineTo(-shipSize * 0.4, -shipSize * 0.9);
      ctx.lineTo(-shipSize * 0.7, -shipSize * 0.7);
      ctx.lineTo(-shipSize * 0.5, -shipSize * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bottom wing
      ctx.beginPath();
      ctx.moveTo(0, shipSize * 0.4);
      ctx.lineTo(-shipSize * 0.4, shipSize * 0.9);
      ctx.lineTo(-shipSize * 0.7, shipSize * 0.7);
      ctx.lineTo(-shipSize * 0.5, shipSize * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cannon (fixed to body direction)
      ctx.fillStyle = colors.engine;
      ctx.beginPath();
      ctx.arc(0, 0, shipSize * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colors.outline;
      ctx.stroke();

      // Cannon barrel
      ctx.fillStyle = colors.engine;
      ctx.fillRect(shipSize * 0.15, -shipSize * 0.08, shipSize * 0.7, shipSize * 0.16);
      ctx.strokeRect(shipSize * 0.15, -shipSize * 0.08, shipSize * 0.7, shipSize * 0.16);

      ctx.restore();
      ctx.globalAlpha = 1;

      // Health bar (outside rotation context)
      if (ship.isAlive) {
        const barWidth = shipSize * 1.4;
        const barHeight = 4;
        const barX = ship.x - barWidth / 2;
        const barY = ship.y - shipSize - 12;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(barX, barY, barWidth, barHeight);

        const healthPercent = ship.health / 3;
        ctx.fillStyle = ship.health === 3 ? '#00ff88' : 
                        ship.health === 2 ? '#ffaa00' : '#ff3366';
        ctx.fillRect(barX, barY, barWidth * healthPercent, barHeight);
      }
    }

    // Draw rockets
    const rocketSize = finalState?.constants?.ROCKET_SIZE || 5;
    if (state.rockets) {
      for (const rocket of state.rockets) {
        const color = rocket.playerId === 1 ? COLORS.rocket.player1 : COLORS.rocket.player2;

        ctx.save();
        ctx.translate(rocket.x, rocket.y);

        // Glow
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, rocketSize * 3);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, rocketSize * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(0, 0, rocketSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

  }, [currentTime, replay, getInterpolatedState, containerSize, leftName, rightName, t]);

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      lastRenderTime.current = null;
      if (currentTime >= duration) {
        setCurrentTime(0);
      }
      setIsPlaying(true);
    }
  };

  const formatTime = (ms) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const ms100 = Math.floor((ms % 1000) / 100);
    return `${minutes}:${secs.toString().padStart(2, '0')}.${ms100}`;
  };

  if (!replay) {
    return <div className="replay-empty">{t('replay.empty')}</div>;
  }

  return (
    <div className="replay-viewer-fullscreen">
      {/* Close button */}
      {onClose && (
        <button className="replay-close-btn" onClick={onClose} title={t('replay.close')}>
          ✕
        </button>
      )}

      {/* Header info */}
      <div className="replay-header-bar">
        <span className="replay-title">{t('replay.title', { n: replay.gameIndex + 1 })}</span>
        <span className="replay-result">
          {replay.winner === 'draw'
            ? t('replay.draw')
            : t('replay.wins', {
                name: replay.winner === 1
                  ? (leftName || t('fleet.alpha'))
                  : (rightName || t('fleet.omega'))
              })}
        </span>
      </div>

      {/* Canvas - takes up most of the screen */}
      <div className="replay-canvas-fullscreen" ref={containerRef}>
        <canvas ref={canvasRef} className="replay-canvas" />
      </div>

      {/* Bottom controls bar */}
      <div className="replay-bottom-bar">
        <div className="replay-controls-row">
          <button className="replay-ctrl-btn" onClick={() => { setIsPlaying(false); setCurrentTime(0); }}>
            ⏮
          </button>
          <button className="replay-ctrl-btn" onClick={() => { setIsPlaying(false); setCurrentTime(Math.max(0, currentTime - 1000)); }}>
            ⏪
          </button>
          <button className="replay-ctrl-btn play" onClick={togglePlayback}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="replay-ctrl-btn" onClick={() => { setIsPlaying(false); setCurrentTime(Math.min(duration, currentTime + 1000)); }}>
            ⏩
          </button>
          <button className="replay-ctrl-btn" onClick={() => { setIsPlaying(false); setCurrentTime(duration); }}>
            ⏭
          </button>

          <div className="replay-slider-inline">
            <input
              type="range"
              min={0}
              max={duration}
              value={currentTime}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentTime(Number(e.target.value));
              }}
            />
          </div>

          <div className="replay-time">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          <div className="replay-speed">
            <select value={playbackSpeed} onChange={(e) => setPlaybackSpeed(Number(e.target.value))}>
              <option value={0.25}>0.25x</option>
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReplayViewer;

import { useRef, useEffect, useState } from 'react';

const COLORS = {
  background: '#050510',
  stars: ['#ffffff', '#aaccff', '#ffccaa', '#aaffcc'],
  nebula1: 'rgba(100, 50, 200, 0.15)',
  nebula2: 'rgba(50, 100, 180, 0.1)',
  player1: {
    body: '#ff9500',
    bodyMedium: '#cc7700',    // 2 health - darker orange
    bodyCritical: '#994400',  // 1 health - even darker
    engine: '#ffaa00',
    outline: '#cc6600',
    glow: 'rgba(255, 149, 0, 0.4)',
  },
  player2: {
    body: '#a855f7',
    bodyMedium: '#8844cc',    // 2 health - darker purple
    bodyCritical: '#663399',  // 1 health - even darker
    engine: '#bf7fff',
    outline: '#7c3aed',
    glow: 'rgba(168, 85, 247, 0.4)',
  },
  rocket: {
    player1: '#ff9500',
    player2: '#a855f7',
  },
  explosion: '#ff6600',
  shield: 'rgba(100, 200, 255, 0.3)',
};

// Maximum display size for the canvas container
const MAX_DISPLAY_WIDTH = 1200;
const MAX_DISPLAY_HEIGHT = 800;

// Generate static starfield
const generateStars = (width, height, count) => {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.5 + 0.5,
      brightness: Math.random() * 0.5 + 0.5,
      color: COLORS.stars[Math.floor(Math.random() * COLORS.stars.length)],
      twinkleSpeed: Math.random() * 0.02 + 0.01,
    });
  }
  return stars;
};

function GameCanvas({ gameState, constants }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const effectsRef = useRef([]);
  const starsRef = useRef([]);
  const [scale, setScale] = useState(1);

  // Calculate scale to fit game in display area
  useEffect(() => {
    if (!constants || !containerRef.current) return;
    
    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;
      
      const containerWidth = container.clientWidth || MAX_DISPLAY_WIDTH;
      const containerHeight = container.clientHeight || MAX_DISPLAY_HEIGHT;
      
      const gameWidth = constants.FIELD_WIDTH || 800;
      const gameHeight = constants.FIELD_HEIGHT || 600;
      
      const scaleX = containerWidth / gameWidth;
      const scaleY = containerHeight / gameHeight;
      const newScale = Math.min(scaleX, scaleY);
      
      setScale(newScale);
    };
    
    updateScale();
    
    // Generate stars when constants are available
    if (constants && starsRef.current.length === 0) {
      starsRef.current = generateStars(constants.FIELD_WIDTH, constants.FIELD_HEIGHT, 150);
    }
    
    // Use ResizeObserver for more reliable container size detection
    const resizeObserver = new ResizeObserver(() => {
      updateScale();
    });
    resizeObserver.observe(containerRef.current);
    
    window.addEventListener('resize', updateScale);
    return () => {
      window.removeEventListener('resize', updateScale);
      resizeObserver.disconnect();
    };
  }, [constants]);

  // Handle visual effects (explosions, hits)
  useEffect(() => {
    if (!gameState?.events) return;

    for (const event of gameState.events) {
      if (event.type === 'hit' || event.type === 'destroyed' || event.type === 'rocketCollision') {
        effectsRef.current.push({
          x: event.x,
          y: event.y,
          type: event.type,
          startTime: Date.now(),
          duration: event.type === 'destroyed' ? 600 : 350,
        });
      }
    }
  }, [gameState?.events]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = constants?.FIELD_WIDTH || 800;
    const height = constants?.FIELD_HEIGHT || 600;

    // Set canvas to actual game size (for crisp rendering)
    canvas.width = width;
    canvas.height = height;

    const drawBackground = (time) => {
      // Deep space background
      const gradient = ctx.createRadialGradient(
        width * 0.3, height * 0.3, 0,
        width * 0.5, height * 0.5, width * 0.8
      );
      gradient.addColorStop(0, '#0a0a1a');
      gradient.addColorStop(0.5, '#050510');
      gradient.addColorStop(1, '#020208');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };

    const drawShip = (ship) => {
      const colors = ship.playerId === 1 ? COLORS.player1 : COLORS.player2;
      const size = constants?.SHIP_SIZE || 30;

      ctx.save();
      ctx.translate(ship.x, ship.y);

      // Ship body rotation
      ctx.rotate((ship.bodyAngle * Math.PI) / 180);

      // Health-based color tinting (keeps team colors)
      let bodyColor = colors.body;
      if (ship.health === 2) {
        bodyColor = colors.bodyMedium;
      } else if (ship.health === 1) {
        bodyColor = colors.bodyCritical;
      }

      // Engine glow (behind ship)
      const engineGlow = ctx.createRadialGradient(-size * 0.6, 0, 0, -size * 0.6, 0, size * 0.8);
      engineGlow.addColorStop(0, colors.engine);
      engineGlow.addColorStop(0.3, colors.glow);
      engineGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = engineGlow;
      ctx.beginPath();
      ctx.ellipse(-size * 0.6, 0, size * 0.8, size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Ship body (sleek fighter shape)
      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = colors.outline;
      ctx.lineWidth = 2;

      // Main body - pointed nose
      ctx.beginPath();
      ctx.moveTo(size * 1.2, 0);  // Nose
      ctx.lineTo(size * 0.3, -size * 0.4);  // Upper front
      ctx.lineTo(-size * 0.6, -size * 0.5);  // Upper back
      ctx.lineTo(-size * 0.8, -size * 0.3);  // Engine top
      ctx.lineTo(-size * 0.8, size * 0.3);   // Engine bottom
      ctx.lineTo(-size * 0.6, size * 0.5);   // Lower back
      ctx.lineTo(size * 0.3, size * 0.4);    // Lower front
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cockpit
      ctx.fillStyle = 'rgba(100, 200, 255, 0.6)';
      ctx.beginPath();
      ctx.ellipse(size * 0.4, 0, size * 0.35, size * 0.15, 0, 0, Math.PI * 2);
      ctx.fill();

      // Wings
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      // Top wing
      ctx.moveTo(0, -size * 0.4);
      ctx.lineTo(-size * 0.4, -size * 0.9);
      ctx.lineTo(-size * 0.7, -size * 0.7);
      ctx.lineTo(-size * 0.5, -size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Bottom wing
      ctx.beginPath();
      ctx.moveTo(0, size * 0.4);
      ctx.lineTo(-size * 0.4, size * 0.9);
      ctx.lineTo(-size * 0.7, size * 0.7);
      ctx.lineTo(-size * 0.5, size * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Restore rotation for cannon
      ctx.rotate((-ship.bodyAngle * Math.PI) / 180);

      // Draw cannon (fires in ship direction)
      ctx.rotate((ship.bodyAngle * Math.PI) / 180);

      // Cannon mount (smaller circle)
      ctx.fillStyle = colors.engine;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = colors.outline;
      ctx.stroke();

      // Cannon barrel
      ctx.fillStyle = colors.engine;
      ctx.fillRect(size * 0.15, -size * 0.08, size * 0.7, size * 0.16);
      ctx.strokeRect(size * 0.15, -size * 0.08, size * 0.7, size * 0.16);

      // Cannon tip glow
      const cannonGlow = ctx.createRadialGradient(size * 0.85, 0, 0, size * 0.85, 0, size * 0.2);
      cannonGlow.addColorStop(0, colors.engine);
      cannonGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = cannonGlow;
      ctx.beginPath();
      ctx.arc(size * 0.85, 0, size * 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Draw shield/health indicator
      if (ship.isAlive) {
        const shieldWidth = size * 1.4;
        const shieldHeight = 4;
        const shieldX = ship.x - shieldWidth / 2;
        const shieldY = ship.y - size - 12;

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(shieldX, shieldY, shieldWidth, shieldHeight);

        // Shield bar
        const shieldPercent = ship.health / 3;
        ctx.fillStyle = ship.health === 3 ? '#00ff88' : 
                        ship.health === 2 ? '#ffaa00' : '#ff3366';
        ctx.fillRect(shieldX, shieldY, shieldWidth * shieldPercent, shieldHeight);

        // Shield glow
        ctx.shadowColor = ship.health === 3 ? '#00ff88' : 
                          ship.health === 2 ? '#ffaa00' : '#ff3366';
        ctx.shadowBlur = 5;
        ctx.fillRect(shieldX, shieldY, shieldWidth * shieldPercent, shieldHeight);
        ctx.shadowBlur = 0;
      }
    };

    const drawRocket = (rocket) => {
      const color = rocket.playerId === 1 ? COLORS.rocket.player1 : COLORS.rocket.player2;
      const size = constants?.ROCKET_SIZE || 5;

      ctx.save();
      ctx.translate(rocket.x, rocket.y);
      ctx.rotate((rocket.angle * Math.PI) / 180);

      // Rocket trail glow
      const trailGradient = ctx.createLinearGradient(-size * 8, 0, size * 2, 0);
      trailGradient.addColorStop(0, 'transparent');
      trailGradient.addColorStop(0.5, color + '40');
      trailGradient.addColorStop(1, color);
      ctx.fillStyle = trailGradient;
      ctx.fillRect(-size * 8, -size * 0.8, size * 10, size * 1.6);

      // Outer glow
      const outerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 4);
      outerGlow.addColorStop(0, color);
      outerGlow.addColorStop(0.3, color + '80');
      outerGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = outerGlow;
      ctx.beginPath();
      ctx.arc(0, 0, size * 4, 0, Math.PI * 2);
      ctx.fill();

      // Rocket core
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 2, size * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Inner bright core
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 1.5, size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const drawEffects = () => {
      const now = Date.now();
      effectsRef.current = effectsRef.current.filter(effect => {
        const elapsed = now - effect.startTime;
        if (elapsed > effect.duration) return false;

        const progress = elapsed / effect.duration;
        const alpha = 1 - progress;

        ctx.save();
        ctx.translate(effect.x, effect.y);

        if (effect.type === 'destroyed') {
          // Big explosion - space debris
          const numRings = 3;
          for (let i = 0; i < numRings; i++) {
            const ringProgress = Math.min(1, progress * 2 - i * 0.2);
            if (ringProgress > 0) {
              const radius = ringProgress * (60 + i * 20);
              const ringAlpha = (1 - ringProgress) * alpha;
              
              const gradient = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius);
              gradient.addColorStop(0, `rgba(255, 200, 50, ${ringAlpha})`);
              gradient.addColorStop(0.5, `rgba(255, 100, 0, ${ringAlpha * 0.6})`);
              gradient.addColorStop(1, 'transparent');
              ctx.fillStyle = gradient;
              ctx.beginPath();
              ctx.arc(0, 0, radius, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Debris particles
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const dist = progress * 50;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            
            ctx.fillStyle = `rgba(255, 150, 50, ${alpha})`;
            ctx.beginPath();
            ctx.arc(px, py, 3 * (1 - progress), 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          // Hit effect - energy dissipation
          const radius = progress * 25;
          const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
          gradient.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
          gradient.addColorStop(0.4, `rgba(100, 200, 255, ${alpha * 0.8})`);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, 0, radius, 0, Math.PI * 2);
          ctx.fill();

          // Spark particles
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 + progress * 2;
            const dist = progress * 20;
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;
            
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.beginPath();
            ctx.arc(px, py, 2 * (1 - progress), 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
        return true;
      });
    };

    const render = () => {
      const time = Date.now();

      // Draw space background with stars
      drawBackground(time);

      // Draw subtle grid for tactical reference
      ctx.strokeStyle = 'rgba(50, 80, 120, 0.2)';
      ctx.lineWidth = 1;
      const gridSize = 100;
      for (let x = 0; x <= width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw border (force field)
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.4)';
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, width - 3, height - 3);
      
      // Corner accents
      const cornerSize = 30;
      ctx.strokeStyle = 'rgba(100, 200, 255, 0.6)';
      ctx.lineWidth = 2;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(0, cornerSize);
      ctx.lineTo(0, 0);
      ctx.lineTo(cornerSize, 0);
      ctx.stroke();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(width - cornerSize, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, cornerSize);
      ctx.stroke();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(0, height - cornerSize);
      ctx.lineTo(0, height);
      ctx.lineTo(cornerSize, height);
      ctx.stroke();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(width - cornerSize, height);
      ctx.lineTo(width, height);
      ctx.lineTo(width, height - cornerSize);
      ctx.stroke();

      // Draw ships
      if (gameState?.ships) {
        for (const ship of gameState.ships) {
          if (ship.isAlive) {
            drawShip(ship);
          }
        }

        // Draw destroyed ships (faded wreckage)
        for (const ship of gameState.ships) {
          if (!ship.isAlive) {
            ctx.globalAlpha = 0.25;
            drawShip(ship);
            ctx.globalAlpha = 1;
          }
        }
      }

      // Draw rockets
      if (gameState?.rockets) {
        for (const rocket of gameState.rockets) {
          drawRocket(rocket);
        }
      }

      // Draw effects
      drawEffects();

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, constants]);

  const gameWidth = constants?.FIELD_WIDTH || 800;
  const gameHeight = constants?.FIELD_HEIGHT || 600;
  const displayWidth = gameWidth * scale;
  const displayHeight = gameHeight * scale;

  return (
    <div 
      ref={containerRef}
      className="game-canvas-container"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#020208',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      <canvas 
        ref={canvasRef} 
        className="game-canvas"
        style={{
          width: displayWidth,
          height: displayHeight,
        }}
      />
    </div>
  );
}

export default GameCanvas;

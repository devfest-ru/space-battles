import { useState } from 'react';
import { GAME_CONSTANTS } from '@space-battles/shared';

export default function ApiDocs({ onClose }) {
  const [activeTab, setActiveTab] = useState('state');
  const C = GAME_CONSTANTS; // Short alias

  return (
    <div className="api-docs-overlay">
      <div className="api-docs-modal">
        <button className="api-docs-close" onClick={onClose}>✕</button>
        
        <div className="api-docs-header">
          <span className="api-docs-icon">📖</span>
          <h1>Fleet Command API</h1>
          <p className="api-docs-subtitle">Complete reference for programming your ships</p>
        </div>

        <div className="api-docs-tabs">
          <button 
            className={`api-tab ${activeTab === 'state' ? 'active' : ''}`}
            onClick={() => setActiveTab('state')}
          >
            Game State
          </button>
          <button 
            className={`api-tab ${activeTab === 'ships' ? 'active' : ''}`}
            onClick={() => setActiveTab('ships')}
          >
            Ships
          </button>
          <button 
            className={`api-tab ${activeTab === 'commands' ? 'active' : ''}`}
            onClick={() => setActiveTab('commands')}
          >
            Commands
          </button>
          <button 
            className={`api-tab ${activeTab === 'constants' ? 'active' : ''}`}
            onClick={() => setActiveTab('constants')}
          >
            Constants
          </button>
          <button 
            className={`api-tab ${activeTab === 'examples' ? 'active' : ''}`}
            onClick={() => setActiveTab('examples')}
          >
            Examples
          </button>
        </div>

        <div className="api-docs-content">
          {activeTab === 'state' && (
            <div className="api-section">
              <h2>Game State Object</h2>
              <p className="api-intro">
                Your code receives the <code>state</code> object containing all game information.
              </p>
              
              <div className="api-item">
                <div className="api-name">state.myShips[]</div>
                <div className="api-type">Array&lt;Ship&gt;</div>
                <div className="api-desc">Array of your fleet's ships (alive and destroyed)</div>
              </div>

              <div className="api-item">
                <div className="api-name">state.enemyShips[]</div>
                <div className="api-type">Array&lt;Ship&gt;</div>
                <div className="api-desc">Array of enemy fleet's ships (alive and destroyed)</div>
              </div>

              <div className="api-item">
                <div className="api-name">state.allShips[]</div>
                <div className="api-type">Array&lt;Ship&gt;</div>
                <div className="api-desc">All ships from both fleets combined</div>
              </div>

              <div className="api-item">
                <div className="api-name">state.rockets[]</div>
                <div className="api-type">Array&lt;Rocket&gt;</div>
                <div className="api-desc">All active rockets currently flying</div>
              </div>

              <div className="api-item">
                <div className="api-name">state.field</div>
                <div className="api-type">Object</div>
                <div className="api-desc">Battlefield dimensions: <code>{`{ width: ${C.FIELD_WIDTH}, height: ${C.FIELD_HEIGHT} }`}</code></div>
              </div>

              <div className="api-item">
                <div className="api-name">state.gameTime</div>
                <div className="api-type">Number</div>
                <div className="api-desc">Elapsed time since battle start (milliseconds)</div>
              </div>

              <div className="api-item">
                <div className="api-name">state.constants</div>
                <div className="api-type">Object</div>
                <div className="api-desc">Game constants (speeds, reload time, etc.)</div>
              </div>
            </div>
          )}

          {activeTab === 'ships' && (
            <div className="api-section">
              <h2>Ship Properties</h2>
              <p className="api-intro">
                Each ship object contains these properties:
              </p>

              <div className="api-item">
                <div className="api-name">ship.id</div>
                <div className="api-type">String</div>
                <div className="api-desc">Unique identifier (e.g., "p1_ship_0")</div>
              </div>

              <div className="api-item">
                <div className="api-name">ship.x, ship.y</div>
                <div className="api-type">Number</div>
                <div className="api-desc">Position on the battlefield (0-{C.FIELD_WIDTH}, 0-{C.FIELD_HEIGHT})</div>
              </div>

              <div className="api-item">
                <div className="api-name">ship.bodyAngle</div>
                <div className="api-type">Number</div>
                <div className="api-desc">Ship's facing direction in degrees (0° = right, 90° = down)</div>
              </div>

              <div className="api-item">
                <div className="api-name">ship.health</div>
                <div className="api-type">Number</div>
                <div className="api-desc">Current health (1-{C.SHIP_MAX_HEALTH}, 0 = destroyed)</div>
              </div>

              <div className="api-item">
                <div className="api-name">ship.isAlive</div>
                <div className="api-type">Boolean</div>
                <div className="api-desc">Whether the ship is still active</div>
              </div>

              <div className="api-item">
                <div className="api-name">ship.canShoot</div>
                <div className="api-type">Boolean</div>
                <div className="api-desc">Whether the ship can fire (reload complete)</div>
              </div>

              <div className="api-item">
                <div className="api-name">ship.healthRatio</div>
                <div className="api-type">Number</div>
                <div className="api-desc">Health as ratio (0.0 - 1.0), affects rotation and boost speed</div>
              </div>

              <div className="api-item">
                <div className="api-name">ship.maxSpeed</div>
                <div className="api-type">Number</div>
                <div className="api-desc">Maximum speed at current health</div>
              </div>

              <h2 style={{marginTop: '2rem'}}>Rocket Properties</h2>
              
              <div className="api-item">
                <div className="api-name">rocket.id</div>
                <div className="api-type">Number</div>
                <div className="api-desc">Unique rocket identifier</div>
              </div>

              <div className="api-item">
                <div className="api-name">rocket.x, rocket.y</div>
                <div className="api-type">Number</div>
                <div className="api-desc">Current position of the rocket</div>
              </div>

              <div className="api-item">
                <div className="api-name">rocket.angle</div>
                <div className="api-type">Number</div>
                <div className="api-desc">Direction of travel in degrees</div>
              </div>

              <div className="api-item">
                <div className="api-name">rocket.playerId</div>
                <div className="api-type">Number</div>
                <div className="api-desc">Which player fired this rocket (1 or 2)</div>
              </div>
            </div>
          )}

          {activeTab === 'commands' && (
            <div className="api-section">
              <h2>Issuing Commands</h2>
              <p className="api-intro">
                Set commands on the <code>commands</code> object using ship IDs as keys:
              </p>

              <div className="api-code-block">
                <pre>{`commands[ship.id] = {
  rotate: 0.5,    // Turn clockwise at 50% speed
  boost: 0.75,    // 75% boost power
  shoot: true     // Fire rocket
};`}</pre>
              </div>

              <h3>Available Commands</h3>

              <div className="api-item highlight">
                <div className="api-name">rotate</div>
                <div className="api-type">Number (-1 to 1)</div>
                <div className="api-desc">
                  <strong>1</strong> = full clockwise, <strong>-1</strong> = full counter-clockwise, <strong>0</strong> = no rotation
                  <div className="api-note">✨ Variable control! Use 0.5 for 50% rotation speed, -0.3 for slow counter-clockwise, etc. Max speed decreases with damage.</div>
                </div>
              </div>

              <div className="api-item highlight">
                <div className="api-name">boost</div>
                <div className="api-type">Number (0 to 1)</div>
                <div className="api-desc">
                  <strong>1</strong> = full boost, <strong>0</strong> = no boost, <strong>0.5</strong> = half boost
                  <div className="api-note">✨ Variable control! Ships always drift forward at MIN_SPEED ({C.SHIP_MIN_SPEED}). Boost adds up to BOOST_SPEED ({C.SHIP_BOOST_SPEED}) × health_ratio.</div>
                </div>
              </div>

              <div className="api-item highlight">
                <div className="api-name">shoot</div>
                <div className="api-type">Boolean</div>
                <div className="api-desc">
                  <strong>true</strong> = fire rocket (if reloaded)
                </div>
              </div>

              <div className="damage-warning">
                <span className="warning-icon">⚠️</span>
                <div className="warning-text">
                  <strong>Damage affects performance!</strong>
                  <p>Rotation speed, boost power, and reload time all degrade proportionally to your ship's health level. A ship at 1/{C.SHIP_MAX_HEALTH} health rotates {C.SHIP_MAX_HEALTH}× slower, boosts {C.SHIP_MAX_HEALTH}× weaker, and reloads {C.SHIP_MAX_HEALTH}× longer.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'constants' && (
            <div className="api-section">
              <h2>Game Constants</h2>
              <p className="api-intro">
                Access via <code>state.constants</code>
              </p>

              <div className="constants-grid">
                <div className="constant-card">
                  <div className="constant-name">FIELD_WIDTH</div>
                  <div className="constant-value">{C.FIELD_WIDTH}</div>
                  <div className="constant-desc">Battlefield width in units</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">FIELD_HEIGHT</div>
                  <div className="constant-value">{C.FIELD_HEIGHT}</div>
                  <div className="constant-desc">Battlefield height in units</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">MAX_GAME_DURATION</div>
                  <div className="constant-value">{C.MAX_GAME_DURATION}</div>
                  <div className="constant-desc">{Math.floor(C.MAX_GAME_DURATION / 60000)} minute time limit (ms)</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">SHIPS_PER_PLAYER</div>
                  <div className="constant-value">{C.SHIPS_PER_PLAYER}</div>
                  <div className="constant-desc">Ships in each fleet</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">SHIP_MAX_HEALTH</div>
                  <div className="constant-value">{C.SHIP_MAX_HEALTH}</div>
                  <div className="constant-desc">Hits to destroy a ship</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">SHIP_MIN_SPEED</div>
                  <div className="constant-value">{C.SHIP_MIN_SPEED}</div>
                  <div className="constant-desc">Base forward speed (always active)</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">SHIP_BOOST_SPEED</div>
                  <div className="constant-value">{C.SHIP_BOOST_SPEED}</div>
                  <div className="constant-desc">Max additional boost speed</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">SHIP_ROTATION_SPEED</div>
                  <div className="constant-value">{C.SHIP_ROTATION_SPEED}</div>
                  <div className="constant-desc">Degrees per second (at full health)</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">ROCKET_SPEED</div>
                  <div className="constant-value">{C.ROCKET_SPEED}</div>
                  <div className="constant-desc">Rocket travel speed</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">RELOAD_TIME</div>
                  <div className="constant-value">{C.RELOAD_TIME}</div>
                  <div className="constant-desc">Base reload time in ms</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'examples' && (
            <div className="api-section">
              <h2>Complete Fleet Program</h2>
              <p className="api-intro">
                Copy and paste this entire code into the editor. It's a fully working fleet AI!
              </p>

              <div className="api-code-block full-program">
                <pre>{`// === HUNTER FLEET ===
// Aims at closest enemy, shoots when aligned, chases targets

// Helper: calculate angle from point A to point B
function angleTo(from, to) {
  return Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
}

// Helper: normalize angle to -180 to 180 range
function normalizeAngle(angle) {
  return ((angle % 360) + 540) % 360 - 180;
}

// Helper: distance between two points
function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

// Find all alive enemies
const enemies = state.enemyShips.filter(e => e.isAlive);

// Control each of our ships
for (const ship of state.myShips) {
  if (!ship.isAlive) continue;
  
  // Find closest enemy
  let closestEnemy = null;
  let closestDist = Infinity;
  
  for (const enemy of enemies) {
    const dist = distance(ship, enemy);
    if (dist < closestDist) {
      closestDist = dist;
      closestEnemy = enemy;
    }
  }
  
  // Default: spin and shoot
  let rotate = 1;
  let boost = 0;
  let shoot = ship.canShoot;
  
  if (closestEnemy) {
    // Calculate angle to target
    const targetAngle = angleTo(ship, closestEnemy);
    const angleDiff = normalizeAngle(targetAngle - ship.bodyAngle);
    
    // Smooth rotation: fast when far off, slow when close
    const rotateSpeed = Math.min(1, Math.abs(angleDiff) / 30);
    rotate = angleDiff > 0 ? rotateSpeed : -rotateSpeed;
    
    // Only shoot when well-aimed (within 15 degrees)
    shoot = ship.canShoot && Math.abs(angleDiff) < 15;
    
    // Boost toward distant enemies, slow down when close
    boost = closestDist > 400 ? 1 : 0.3;
  }
  
  commands[ship.id] = { rotate, boost, shoot };
}`}</pre>
              </div>

              <h2 style={{marginTop: '2rem'}}>Utility Snippets</h2>
              <p className="api-intro">
                Useful code patterns you can incorporate into your fleet program.
              </p>

              <h3>Lead Target (Predict Movement)</h3>
              <div className="api-code-block">
                <pre>{`// Aim where enemy WILL BE, not where they are now
function leadTarget(ship, enemy) {
  const dist = distance(ship, enemy);
  const travelTime = dist / state.constants.ROCKET_SPEED;
  
  // Predict enemy position
  const rad = enemy.bodyAngle * Math.PI / 180;
  const speed = state.constants.SHIP_MIN_SPEED;
  const futureX = enemy.x + Math.cos(rad) * speed * travelTime;
  const futureY = enemy.y + Math.sin(rad) * speed * travelTime;
  
  return angleTo(ship, { x: futureX, y: futureY });
}`}</pre>
              </div>

              <h3>Detect Incoming Rockets</h3>
              <div className="api-code-block">
                <pre>{`// Check if any enemy rockets are heading toward this ship
function isUnderFire(ship) {
  for (const rocket of state.rockets) {
    // Skip our own rockets
    if (rocket.playerId === ship.playerId) continue;
    
    const rad = rocket.angle * Math.PI / 180;
    const dx = ship.x - rocket.x;
    const dy = ship.y - rocket.y;
    
    // Is rocket heading our way?
    const dot = dx * Math.cos(rad) + dy * Math.sin(rad);
    if (dot < 0) continue; // Moving away
    
    // Will it hit us?
    const dist = Math.hypot(dx, dy);
    if (dist < 200) return true; // Danger zone!
  }
  return false;
}`}</pre>
              </div>

              <h3>Evasive Maneuvers</h3>
              <div className="api-code-block">
                <pre>{`// Dodge if under fire, otherwise pursue
if (isUnderFire(ship)) {
  // Sharp turn + boost to evade
  commands[ship.id] = {
    rotate: 1,      // Hard turn
    boost: 1,       // Full speed
    shoot: false    // Focus on dodging
  };
} else {
  // Normal attack behavior
  commands[ship.id] = { rotate, boost, shoot };
}`}</pre>
              </div>

              <h3>Stay in Bounds</h3>
              <div className="api-code-block">
                <pre>{`// Turn away from edges
const margin = 200;
const { FIELD_WIDTH, FIELD_HEIGHT } = state.constants;

let edgeTurn = 0;
if (ship.x < margin) edgeTurn = ship.bodyAngle > 180 ? 1 : -1;
if (ship.x > FIELD_WIDTH - margin) edgeTurn = ship.bodyAngle < 180 ? 1 : -1;
if (ship.y < margin) edgeTurn = ship.bodyAngle > 90 && ship.bodyAngle < 270 ? -1 : 1;
if (ship.y > FIELD_HEIGHT - margin) edgeTurn = ship.bodyAngle < 90 || ship.bodyAngle > 270 ? -1 : 1;

if (edgeTurn !== 0) {
  rotate = edgeTurn; // Override normal rotation
}`}</pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


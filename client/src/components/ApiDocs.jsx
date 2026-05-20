import { useState } from 'react';
import { GAME_CONSTANTS } from '@space-battles/shared';
import { useT } from '../i18n/LanguageContext';

export default function ApiDocs({ onClose }) {
  const { t } = useT();
  const [activeTab, setActiveTab] = useState('state');
  const C = GAME_CONSTANTS; // Short alias

  return (
    <div className="api-docs-overlay">
      <div className="api-docs-modal">
        <button className="api-docs-close" onClick={onClose}>✕</button>

        <div className="api-docs-header">
          <span className="api-docs-icon">📖</span>
          <h1>{t('apiDocs.title')}</h1>
          <p className="api-docs-subtitle">{t('apiDocs.subtitle')}</p>
        </div>

        <div className="api-docs-tabs">
          <button
            className={`api-tab ${activeTab === 'state' ? 'active' : ''}`}
            onClick={() => setActiveTab('state')}
          >
            {t('apiDocs.tabs.state')}
          </button>
          <button
            className={`api-tab ${activeTab === 'ships' ? 'active' : ''}`}
            onClick={() => setActiveTab('ships')}
          >
            {t('apiDocs.tabs.ships')}
          </button>
          <button
            className={`api-tab ${activeTab === 'commands' ? 'active' : ''}`}
            onClick={() => setActiveTab('commands')}
          >
            {t('apiDocs.tabs.commands')}
          </button>
          <button
            className={`api-tab ${activeTab === 'constants' ? 'active' : ''}`}
            onClick={() => setActiveTab('constants')}
          >
            {t('apiDocs.tabs.constants')}
          </button>
          <button
            className={`api-tab ${activeTab === 'examples' ? 'active' : ''}`}
            onClick={() => setActiveTab('examples')}
          >
            {t('apiDocs.tabs.examples')}
          </button>
        </div>

        <div className="api-docs-content">
          {activeTab === 'state' && (
            <div className="api-section">
              <h2>{t('apiDocs.state.title')}</h2>
              <p className="api-intro">
                {t('apiDocs.state.introPre')}<code>{t('apiDocs.state.introCode')}</code>{t('apiDocs.state.introPost')}
              </p>

              <div className="api-item">
                <div className="api-name">state.myShips[]</div>
                <div className="api-type">Array&lt;Ship&gt;</div>
                <div className="api-desc">{t('apiDocs.state.myShipsDesc')}</div>
              </div>

              <div className="api-item">
                <div className="api-name">state.enemyShips[]</div>
                <div className="api-type">Array&lt;Ship&gt;</div>
                <div className="api-desc">{t('apiDocs.state.enemyShipsDesc')}</div>
              </div>

              <div className="api-item">
                <div className="api-name">state.allShips[]</div>
                <div className="api-type">Array&lt;Ship&gt;</div>
                <div className="api-desc">{t('apiDocs.state.allShipsDesc')}</div>
              </div>

              <div className="api-item">
                <div className="api-name">state.rockets[]</div>
                <div className="api-type">Array&lt;Rocket&gt;</div>
                <div className="api-desc">{t('apiDocs.state.rocketsDesc')}</div>
              </div>

              <div className="api-item">
                <div className="api-name">state.field</div>
                <div className="api-type">Object</div>
                <div className="api-desc">{t('apiDocs.state.fieldDesc')} <code>{`{ width: ${C.FIELD_WIDTH}, height: ${C.FIELD_HEIGHT} }`}</code></div>
              </div>

              <div className="api-item">
                <div className="api-name">state.gameTime</div>
                <div className="api-type">Number</div>
                <div className="api-desc">{t('apiDocs.state.gameTimeDesc')}</div>
              </div>

              <div className="api-item">
                <div className="api-name">state.constants</div>
                <div className="api-type">Object</div>
                <div className="api-desc">{t('apiDocs.state.constantsDesc')}</div>
              </div>
            </div>
          )}

          {activeTab === 'ships' && (
            <div className="api-section">
              <h2>{t('apiDocs.ships.title')}</h2>
              <p className="api-intro">
                {t('apiDocs.ships.intro')}
              </p>

              <div className="api-item">
                <div className="api-name">ship.id</div>
                <div className="api-type">String</div>
                <div className="api-desc">{t('apiDocs.ships.idDesc')}</div>
              </div>

              <div className="api-item">
                <div className="api-name">ship.x, ship.y</div>
                <div className="api-type">Number</div>
                <div className="api-desc">{t('apiDocs.ships.positionDesc', { w: C.FIELD_WIDTH, h: C.FIELD_HEIGHT })}</div>
              </div>

              <div className="api-item">
                <div className="api-name">ship.bodyAngle</div>
                <div className="api-type">Number</div>
                <div className="api-desc">{t('apiDocs.ships.bodyAngleDesc')}</div>
              </div>

              <div className="api-item">
                <div className="api-name">ship.health</div>
                <div className="api-type">Number</div>
                <div className="api-desc">{t('apiDocs.ships.healthDesc', { max: C.SHIP_MAX_HEALTH })}</div>
              </div>

              <div className="api-item">
                <div className="api-name">ship.isAlive</div>
                <div className="api-type">Boolean</div>
                <div className="api-desc">{t('apiDocs.ships.isAliveDesc')}</div>
              </div>

              <div className="api-item">
                <div className="api-name">ship.canShoot</div>
                <div className="api-type">Boolean</div>
                <div className="api-desc">{t('apiDocs.ships.canShootDesc')}</div>
              </div>

              <div className="api-item">
                <div className="api-name">ship.healthRatio</div>
                <div className="api-type">Number</div>
                <div className="api-desc">{t('apiDocs.ships.healthRatioDesc')}</div>
              </div>

              <div className="api-item">
                <div className="api-name">ship.maxSpeed</div>
                <div className="api-type">Number</div>
                <div className="api-desc">{t('apiDocs.ships.maxSpeedDesc')}</div>
              </div>

              <h2 style={{ marginTop: '2rem' }}>{t('apiDocs.ships.rocketsTitle')}</h2>

              <div className="api-item">
                <div className="api-name">rocket.id</div>
                <div className="api-type">Number</div>
                <div className="api-desc">{t('apiDocs.ships.rocket.idDesc')}</div>
              </div>

              <div className="api-item">
                <div className="api-name">rocket.x, rocket.y</div>
                <div className="api-type">Number</div>
                <div className="api-desc">{t('apiDocs.ships.rocket.positionDesc')}</div>
              </div>

              <div className="api-item">
                <div className="api-name">rocket.angle</div>
                <div className="api-type">Number</div>
                <div className="api-desc">{t('apiDocs.ships.rocket.angleDesc')}</div>
              </div>

              <div className="api-item">
                <div className="api-name">rocket.playerId</div>
                <div className="api-type">Number</div>
                <div className="api-desc">{t('apiDocs.ships.rocket.playerIdDesc')}</div>
              </div>
            </div>
          )}

          {activeTab === 'commands' && (
            <div className="api-section">
              <h2>{t('apiDocs.commands.title')}</h2>
              <p className="api-intro">
                {t('apiDocs.commands.introPre')}<code>{t('apiDocs.commands.introCode')}</code>{t('apiDocs.commands.introPost')}
              </p>

              <div className="api-code-block">
                <pre>{`commands[ship.id] = {
  rotate: 0.5,    // Turn clockwise at 50% speed
  boost: 0.75,    // 75% boost power
  shoot: true     // Fire rocket
};`}</pre>
              </div>

              <h3>{t('apiDocs.commands.subtitle')}</h3>

              <div className="api-item highlight">
                <div className="api-name">rotate</div>
                <div className="api-type">{t('apiDocs.commands.rotateType')}</div>
                <div className="api-desc">
                  <strong>{t('apiDocs.commands.rotateDescBold1')}</strong>{t('apiDocs.commands.rotateDescPart1')}
                  <strong>{t('apiDocs.commands.rotateDescBold2')}</strong>{t('apiDocs.commands.rotateDescPart2')}
                  <strong>{t('apiDocs.commands.rotateDescBold3')}</strong>{t('apiDocs.commands.rotateDescPart3')}
                  <div className="api-note">{t('apiDocs.commands.rotateNote')}</div>
                </div>
              </div>

              <div className="api-item highlight">
                <div className="api-name">boost</div>
                <div className="api-type">{t('apiDocs.commands.boostType')}</div>
                <div className="api-desc">
                  <strong>{t('apiDocs.commands.boostDescBold1')}</strong>{t('apiDocs.commands.boostDescPart1')}
                  <strong>{t('apiDocs.commands.boostDescBold2')}</strong>{t('apiDocs.commands.boostDescPart2')}
                  <strong>{t('apiDocs.commands.boostDescBold3')}</strong>{t('apiDocs.commands.boostDescPart3')}
                  <div className="api-note">{t('apiDocs.commands.boostNote', { min: C.SHIP_MIN_SPEED, boost: C.SHIP_BOOST_SPEED })}</div>
                </div>
              </div>

              <div className="api-item highlight">
                <div className="api-name">shoot</div>
                <div className="api-type">{t('apiDocs.commands.shootType')}</div>
                <div className="api-desc">
                  <strong>{t('apiDocs.commands.shootDescBold')}</strong>{t('apiDocs.commands.shootDescPart')}
                </div>
              </div>

              <div className="damage-warning">
                <span className="warning-icon">⚠️</span>
                <div className="warning-text">
                  <strong>{t('apiDocs.commands.damageTitle')}</strong>
                  <p>{t('apiDocs.commands.damageText', { max: C.SHIP_MAX_HEALTH })}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'constants' && (
            <div className="api-section">
              <h2>{t('apiDocs.constants.title')}</h2>
              <p className="api-intro">
                {t('apiDocs.constants.introPre')}<code>{t('apiDocs.constants.introCode')}</code>
              </p>

              <div className="constants-grid">
                <div className="constant-card">
                  <div className="constant-name">FIELD_WIDTH</div>
                  <div className="constant-value">{C.FIELD_WIDTH}</div>
                  <div className="constant-desc">{t('apiDocs.constants.FIELD_WIDTH')}</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">FIELD_HEIGHT</div>
                  <div className="constant-value">{C.FIELD_HEIGHT}</div>
                  <div className="constant-desc">{t('apiDocs.constants.FIELD_HEIGHT')}</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">MAX_GAME_DURATION</div>
                  <div className="constant-value">{C.MAX_GAME_DURATION}</div>
                  <div className="constant-desc">{t('apiDocs.constants.MAX_GAME_DURATION', { min: Math.floor(C.MAX_GAME_DURATION / 60000) })}</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">SHIPS_PER_PLAYER</div>
                  <div className="constant-value">{C.SHIPS_PER_PLAYER}</div>
                  <div className="constant-desc">{t('apiDocs.constants.SHIPS_PER_PLAYER')}</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">SHIP_MAX_HEALTH</div>
                  <div className="constant-value">{C.SHIP_MAX_HEALTH}</div>
                  <div className="constant-desc">{t('apiDocs.constants.SHIP_MAX_HEALTH')}</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">SHIP_MIN_SPEED</div>
                  <div className="constant-value">{C.SHIP_MIN_SPEED}</div>
                  <div className="constant-desc">{t('apiDocs.constants.SHIP_MIN_SPEED')}</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">SHIP_BOOST_SPEED</div>
                  <div className="constant-value">{C.SHIP_BOOST_SPEED}</div>
                  <div className="constant-desc">{t('apiDocs.constants.SHIP_BOOST_SPEED')}</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">SHIP_ROTATION_SPEED</div>
                  <div className="constant-value">{C.SHIP_ROTATION_SPEED}</div>
                  <div className="constant-desc">{t('apiDocs.constants.SHIP_ROTATION_SPEED')}</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">ROCKET_SPEED</div>
                  <div className="constant-value">{C.ROCKET_SPEED}</div>
                  <div className="constant-desc">{t('apiDocs.constants.ROCKET_SPEED')}</div>
                </div>

                <div className="constant-card">
                  <div className="constant-name">RELOAD_TIME</div>
                  <div className="constant-value">{C.RELOAD_TIME}</div>
                  <div className="constant-desc">{t('apiDocs.constants.RELOAD_TIME')}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'examples' && (
            <div className="api-section">
              <h2>{t('apiDocs.examples.title')}</h2>
              <p className="api-intro">
                {t('apiDocs.examples.intro')}
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

              <h2 style={{ marginTop: '2rem' }}>{t('apiDocs.examples.utilitiesTitle')}</h2>
              <p className="api-intro">
                {t('apiDocs.examples.utilitiesIntro')}
              </p>

              <h3>{t('apiDocs.examples.leadTitle')}</h3>
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

              <h3>{t('apiDocs.examples.detectTitle')}</h3>
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

              <h3>{t('apiDocs.examples.evasiveTitle')}</h3>
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

              <h3>{t('apiDocs.examples.boundsTitle')}</h3>
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

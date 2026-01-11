// Shared Game Engine - Works in both Node.js and Browser
import { GAME_CONSTANTS } from './gameConstants.js';

class Ship {
  constructor(id, playerId, x, y, bodyAngle = 0) {
    this.id = id;
    this.playerId = playerId;
    this.x = x;
    this.y = y;
    this.bodyAngle = bodyAngle;       // Degrees, 0 = right, 90 = down
    this.health = GAME_CONSTANTS.SHIP_MAX_HEALTH;
    this.lastShotTime = 0;
    this.isAlive = true;
    this.initialShotDelay = 0;  // Random delay before first shot (set during init)
    this.hasFiredFirstShot = false;
  }

  getHealthRatio() {
    return this.health / GAME_CONSTANTS.SHIP_MAX_HEALTH;
  }
  
  getMaxSpeed() {
    // Min speed + boost at current health
    return GAME_CONSTANTS.SHIP_MIN_SPEED + (GAME_CONSTANTS.SHIP_BOOST_SPEED * this.getHealthRatio());
  }

  getWeaponAngle() {
    return this.bodyAngle; // Weapon always points forward
  }

  canShoot(currentTime) {
    // Reload time scales inversely with health - damaged ships reload slower
    const healthRatio = this.health / GAME_CONSTANTS.SHIP_MAX_HEALTH;
    const effectiveReloadTime = GAME_CONSTANTS.RELOAD_TIME / healthRatio;
    return this.isAlive && (currentTime - this.lastShotTime) >= effectiveReloadTime;
  }

  toJSON() {
    return {
      id: this.id,
      playerId: this.playerId,
      x: this.x,
      y: this.y,
      bodyAngle: this.bodyAngle,
      weaponAngle: this.getWeaponAngle(),
      health: this.health,
      isAlive: this.isAlive,
      canShoot: this.canShoot(Date.now()),
      healthRatio: this.getHealthRatio(),
      maxSpeed: this.getMaxSpeed(),
    };
  }
}

class Rocket {
  constructor(id, shipId, playerId, x, y, angle) {
    this.id = id;
    this.shipId = shipId;
    this.playerId = playerId;
    this.x = x;
    this.y = y;
    this.angle = angle;  // Direction of travel in degrees
    this.isActive = true;
  }

  toJSON() {
    return {
      id: this.id,
      shipId: this.shipId,
      playerId: this.playerId,
      x: this.x,
      y: this.y,
      angle: this.angle,
    };
  }
}

export class GameEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.ships = [];
    this.rockets = [];
    this.gameStartTime = null;
    this.lastTickTime = null;
    this.isRunning = false;
    this.winner = null;
    this.gameTime = 0;
    this.nextRocketId = 1;
    this.playerCodes = { 1: null, 2: null };
    this.events = []; // Events that happened this tick (for visualization)
    this.battleLog = []; // Full battle log for analysis
    this.lastLogTime = 0;
  }

  initializeGame() {
    this.reset();
    
    const width = GAME_CONSTANTS.FIELD_WIDTH;
    const height = GAME_CONSTANTS.FIELD_HEIGHT;
    const numShips = GAME_CONSTANTS.SHIPS_PER_PLAYER;
    
    // Generate random initial shot delays (staggered firing)
    // Each delay is a fraction of reload time, spread evenly but shuffled
    const generateShuffledDelays = () => {
      const delays = [];
      for (let i = 0; i < numShips; i++) {
        // Spread delays from 0 to 80% of reload time
        delays.push((i / numShips) * GAME_CONSTANTS.RELOAD_TIME * 0.8);
      }
      // Shuffle the delays
      for (let i = delays.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [delays[i], delays[j]] = [delays[j], delays[i]];
      }
      return delays;
    };
    
    const p1Delays = generateShuffledDelays();
    const p2Delays = generateShuffledDelays();
    
    // Calculate ship positions - evenly distributed vertically
    for (let i = 0; i < numShips; i++) {
      // Y position: spread evenly from 20% to 80% of field height
      const yRatio = numShips === 1 ? 0.5 : (0.2 + (0.6 * i / (numShips - 1)));
      const y = height * yRatio;
      
      // Fleet 1 (left side)
      const p1Ship = new Ship(`p1_ship_${i}`, 1, width * 0.1, y, 0, 0);
      p1Ship.initialShotDelay = p1Delays[i];
      this.ships.push(p1Ship);
      
      // Fleet 2 (right side)
      const p2Ship = new Ship(`p2_ship_${i}`, 2, width * 0.9, y, 180, 0);
      p2Ship.initialShotDelay = p2Delays[i];
      this.ships.push(p2Ship);
    }
  }

  setPlayerCode(playerId, code) {
    this.playerCodes[playerId] = code;
  }

  hasPlayerCode(playerId) {
    return !!this.playerCodes[playerId];
  }

  startGame() {
    if (!this.playerCodes[1] || !this.playerCodes[2]) {
      return { success: false, error: 'Both players must submit code before starting' };
    }
    
    // Save player codes before reset
    const savedCodes = { ...this.playerCodes };
    this.initializeGame();
    // Restore player codes after reset
    this.playerCodes = savedCodes;
    
    this.gameStartTime = Date.now();
    this.lastTickTime = Date.now();
    
    // Apply initial shot delays - set lastShotTime so ships can't fire until their delay passes
    for (const ship of this.ships) {
      // lastShotTime is set such that: (now - lastShotTime) >= RELOAD_TIME at delay time
      // So: lastShotTime = now - RELOAD_TIME + delay
      ship.lastShotTime = this.gameStartTime - GAME_CONSTANTS.RELOAD_TIME + ship.initialShotDelay;
    }
    this.isRunning = true;
    return { success: true };
  }

  stopGame() {
    this.isRunning = false;
  }

  // Stop and reset positions/health, but keep submitted code
  stopAndReset() {
    this.isRunning = false;
    const savedCodes = { ...this.playerCodes };
    this.initializeGame();
    this.playerCodes = savedCodes;
  }

  getGameState() {
    return {
      isRunning: this.isRunning,
      gameTime: this.gameTime,
      winner: this.winner,
      ships: this.ships.map(s => s.toJSON()),
      rockets: this.rockets.filter(r => r.isActive).map(r => r.toJSON()),
      events: [...this.events],
      field: {
        width: GAME_CONSTANTS.FIELD_WIDTH,
        height: GAME_CONSTANTS.FIELD_HEIGHT,
      },
      constants: GAME_CONSTANTS,
    };
  }

  getStateForPlayer(playerId) {
    const state = this.getGameState();
    return {
      myShips: state.ships.filter(s => s.playerId === playerId),
      enemyShips: state.ships.filter(s => s.playerId !== playerId),
      allShips: state.ships,
      rockets: state.rockets,
      field: state.field,
      gameTime: state.gameTime,
      constants: {
        SHIP_MIN_SPEED: GAME_CONSTANTS.SHIP_MIN_SPEED,
        SHIP_BOOST_SPEED: GAME_CONSTANTS.SHIP_BOOST_SPEED,
        SHIP_MAX_HEALTH: GAME_CONSTANTS.SHIP_MAX_HEALTH,
        SHIP_ROTATION_SPEED: GAME_CONSTANTS.SHIP_ROTATION_SPEED,
        ROCKET_SPEED: GAME_CONSTANTS.ROCKET_SPEED,
        RELOAD_TIME: GAME_CONSTANTS.RELOAD_TIME,
      },
    };
  }

  // Execute player code using Function constructor
  // Works in both Node.js and Browser environments
  executePlayerCode(playerId) {
    const code = this.playerCodes[playerId];
    if (!code) return {};

    const playerState = this.getStateForPlayer(playerId);
    
    try {
      const commands = {};
      
      // Use Function constructor - works in both environments
      const wrappedCode = `
        "use strict";
        const state = arguments[0];
        const commands = arguments[1];
        const Math = arguments[2];
        const console = arguments[3];
        ${code}
        return commands;
      `;
      
      const sandboxedConsole = {
        log: (...args) => console.log(`[Player ${playerId}]`, ...args),
        warn: (...args) => console.warn(`[Player ${playerId}]`, ...args),
        error: (...args) => console.error(`[Player ${playerId}]`, ...args),
      };
      
      const fn = new Function(wrappedCode);
      const result = fn(playerState, commands, Math, sandboxedConsole);
      
      // Return result if it returned commands, otherwise use the commands object
      if (result && typeof result === 'object') {
        return result;
      }

      return commands;
    } catch (error) {
      console.error(`Player ${playerId} code error:`, error.message);
      return {};
    }
  }

  normalizeAngle(angle) {
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  }

  processCommands(playerId, commands, deltaTime) {
    const playerShips = this.ships.filter(s => s.playerId === playerId && s.isAlive);
    
    for (const ship of playerShips) {
      const shipCommands = commands[ship.id];
      if (!shipCommands) continue;

      // Health ratio affects rotation and boost
      const healthRatio = ship.health / GAME_CONSTANTS.SHIP_MAX_HEALTH;

      // Process rotation command - rotation speed scales with health
      if (shipCommands.rotate !== undefined) {
        const rotationSpeed = GAME_CONSTANTS.SHIP_ROTATION_SPEED * healthRatio;
        const rotateAmount = Math.sign(shipCommands.rotate) * rotationSpeed * deltaTime;
        ship.bodyAngle = this.normalizeAngle(ship.bodyAngle + rotateAmount);
      }

      // Ships always move forward at minimum speed, can boost for extra speed
      // Boost speed scales with health: (health / max_health) * BOOST_SPEED
      const minSpeed = GAME_CONSTANTS.SHIP_MIN_SPEED;
      const maxBoost = GAME_CONSTANTS.SHIP_BOOST_SPEED * healthRatio;
      const isBoosting = shipCommands.boost !== undefined && shipCommands.boost > 0;
      const totalSpeed = minSpeed + (isBoosting ? maxBoost : 0);
      
      const radians = (ship.bodyAngle * Math.PI) / 180;
      const newX = ship.x + Math.cos(radians) * totalSpeed * deltaTime;
      const newY = ship.y + Math.sin(radians) * totalSpeed * deltaTime;
      
      // Keep ship within bounds
      ship.x = Math.max(GAME_CONSTANTS.SHIP_SIZE, 
        Math.min(GAME_CONSTANTS.FIELD_WIDTH - GAME_CONSTANTS.SHIP_SIZE, newX));
      ship.y = Math.max(GAME_CONSTANTS.SHIP_SIZE, 
        Math.min(GAME_CONSTANTS.FIELD_HEIGHT - GAME_CONSTANTS.SHIP_SIZE, newY));

      // Process shoot command - weapon fires in ship's direction
      if (shipCommands.shoot && ship.canShoot(Date.now())) {
        const weaponAngle = ship.getWeaponAngle();
        const radians = (weaponAngle * Math.PI) / 180;
        
        // Spawn rocket at cannon tip
        const rocketX = ship.x + Math.cos(radians) * (GAME_CONSTANTS.SHIP_SIZE + 5);
        const rocketY = ship.y + Math.sin(radians) * (GAME_CONSTANTS.SHIP_SIZE + 5);
        
        const rocket = new Rocket(
          this.nextRocketId++,
          ship.id,
          playerId,
          rocketX,
          rocketY,
          weaponAngle
        );
        
        this.rockets.push(rocket);
        ship.lastShotTime = Date.now();
        
        this.events.push({ type: 'shoot', shipId: ship.id, x: rocketX, y: rocketY });
      }
    }
  }

  updateRockets(deltaTime) {
    for (const rocket of this.rockets) {
      if (!rocket.isActive) continue;

      const radians = (rocket.angle * Math.PI) / 180;
      rocket.x += Math.cos(radians) * GAME_CONSTANTS.ROCKET_SPEED * deltaTime;
      rocket.y += Math.sin(radians) * GAME_CONSTANTS.ROCKET_SPEED * deltaTime;

      // Check if rocket is out of bounds
      if (rocket.x < 0 || rocket.x > GAME_CONSTANTS.FIELD_WIDTH ||
          rocket.y < 0 || rocket.y > GAME_CONSTANTS.FIELD_HEIGHT) {
        rocket.isActive = false;
      }
    }
  }

  checkCollisions() {
    // Check rocket-ship collisions
    for (const rocket of this.rockets) {
      if (!rocket.isActive) continue;

      for (const ship of this.ships) {
        if (!ship.isAlive) continue;
        // Rockets don't hit own ships
        if (ship.playerId === rocket.playerId) continue;

        const dx = rocket.x - ship.x;
        const dy = rocket.y - ship.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < GAME_CONSTANTS.SHIP_SIZE + GAME_CONSTANTS.ROCKET_SIZE) {
          // Hit!
          rocket.isActive = false;
          ship.health--;
          
          this.events.push({ 
            type: 'hit', 
            shipId: ship.id, 
            rocketId: rocket.id,
            x: ship.x,
            y: ship.y,
            newHealth: ship.health 
          });

          if (ship.health <= 0) {
            ship.isAlive = false;
            this.events.push({ 
              type: 'destroyed', 
              shipId: ship.id,
              x: ship.x,
              y: ship.y 
            });
          }
        }
      }
    }

    // Check rocket-rocket collisions (only between different players)
    const activeRockets = this.rockets.filter(r => r.isActive);
    for (let i = 0; i < activeRockets.length; i++) {
      for (let j = i + 1; j < activeRockets.length; j++) {
        const r1 = activeRockets[i];
        const r2 = activeRockets[j];

        // Only collide rockets from different players
        if (r1.playerId === r2.playerId) continue;

        const dx = r1.x - r2.x;
        const dy = r1.y - r2.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < GAME_CONSTANTS.ROCKET_SIZE * 2) {
          r1.isActive = false;
          r2.isActive = false;
          this.events.push({ 
            type: 'rocketCollision', 
            x: (r1.x + r2.x) / 2, 
            y: (r1.y + r2.y) / 2 
          });
        }
      }
    }

    // Clean up inactive rockets
    this.rockets = this.rockets.filter(l => l.isActive);
  }

  logState(p1Commands, p2Commands) {
    const snapshot = {
      time: this.gameTime,
      timeFormatted: `${Math.floor(this.gameTime / 60000)}:${String(Math.floor((this.gameTime % 60000) / 1000)).padStart(2, '0')}`,
      ships: this.ships.map(s => ({
        id: s.id,
        player: s.playerId,
        x: Math.round(s.x),
        y: Math.round(s.y),
        bodyAngle: Math.round(s.bodyAngle),
        health: s.health,
        alive: s.isAlive,
        healthRatio: s.getHealthRatio(),
      })),
      rockets: this.rockets.filter(r => r.isActive).map(r => ({
        id: r.id,
        player: r.playerId,
        x: Math.round(r.x),
        y: Math.round(r.y),
        angle: Math.round(r.angle),
      })),
      commands: {
        p1: p1Commands,
        p2: p2Commands,
      },
      events: [...this.events],
    };
    this.battleLog.push(snapshot);
  }

  getBattleLog() {
    return {
      field: {
        width: GAME_CONSTANTS.FIELD_WIDTH,
        height: GAME_CONSTANTS.FIELD_HEIGHT,
      },
      constants: GAME_CONSTANTS,
      winner: this.winner,
      duration: this.gameTime,
      snapshots: this.battleLog,
    };
  }

  checkWinCondition() {
    const p1Alive = this.ships.filter(s => s.playerId === 1 && s.isAlive).length;
    const p2Alive = this.ships.filter(s => s.playerId === 2 && s.isAlive).length;

    if (p1Alive === 0 && p2Alive === 0) {
      this.winner = 'draw';
      this.isRunning = false;
    } else if (p1Alive === 0) {
      this.winner = 2;
      this.isRunning = false;
    } else if (p2Alive === 0) {
      this.winner = 1;
      this.isRunning = false;
    }

    // Check game duration
    if (this.gameTime >= GAME_CONSTANTS.MAX_GAME_DURATION) {
      if (p1Alive > p2Alive) {
        this.winner = 1;
      } else if (p2Alive > p1Alive) {
        this.winner = 2;
      } else {
        // Count total health
        const p1Health = this.ships.filter(s => s.playerId === 1).reduce((sum, s) => sum + s.health, 0);
        const p2Health = this.ships.filter(s => s.playerId === 2).reduce((sum, s) => sum + s.health, 0);
        
        if (p1Health > p2Health) {
          this.winner = 1;
        } else if (p2Health > p1Health) {
          this.winner = 2;
        } else {
          this.winner = 'draw';
        }
      }
      this.isRunning = false;
    }
  }

  tick() {
    if (!this.isRunning) return this.getGameState();

    const now = Date.now();
    const deltaTime = (now - this.lastTickTime) / 1000; // Convert to seconds
    this.lastTickTime = now;
    this.gameTime = now - this.gameStartTime;
    this.events = []; // Clear events from previous tick

    // Execute player code and get commands
    const p1Commands = this.executePlayerCode(1);
    const p2Commands = this.executePlayerCode(2);

    // Process commands
    this.processCommands(1, p1Commands, deltaTime);
    this.processCommands(2, p2Commands, deltaTime);

    // Update rocket positions
    this.updateRockets(deltaTime);

    // Check collisions
    this.checkCollisions();

    // Check win condition
    this.checkWinCondition();

    // Log state every 500ms for analysis
    if (this.gameTime - this.lastLogTime >= 500) {
      this.logState(p1Commands, p2Commands);
      this.lastLogTime = this.gameTime;
    }

    return this.getGameState();
  }
}

export default GameEngine;


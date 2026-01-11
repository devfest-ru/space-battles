// Game Constants - All configurable game parameters

export const GAME_CONSTANTS = {
  // Battlefield dimensions
  FIELD_WIDTH: 3000,
  FIELD_HEIGHT: 1500,
  
  // Ship properties
  SHIP_SIZE: 30,                    // Ship radius for collision
  SHIP_MIN_SPEED: 200,               // Minimum speed (ships always drift forward)
  SHIP_BOOST_SPEED: 500,            // Max additional boost speed at full health
  SHIP_ROTATION_SPEED: 200,         // Degrees per second (body rotation)
  SHIPS_PER_PLAYER: 5,
  SHIP_MAX_HEALTH: 3,
  
  // Rocket properties
  ROCKET_SPEED: 1500,               // Units per second
  ROCKET_SIZE: 5,                   // Rocket radius
  RELOAD_TIME: 2000,                // Milliseconds between shots
  
  // Game timing
  TICK_RATE: 60,                    // Ticks per second
  TICK_INTERVAL: 1000 / 60,         // ~16.67ms per tick
  PLAYER_CODE_TIMEOUT: 100,         // Max milliseconds for player code execution
  
  // Game rules
  MAX_GAME_DURATION: 120000,        // 2 minutes max game duration (in ms)
};

export default GAME_CONSTANTS;

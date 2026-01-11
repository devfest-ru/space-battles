## Space Battle - Learn Programming Through Combat

A real-time space battle game where students learn programming by writing JavaScript code to control their fleet of ships.

## Game Overview

- **Players**: 2 fleets, each controlling 5 ships
- **Goal**: Destroy all enemy ships
- **How**: Write JavaScript code that runs every game tick to control your ships

## Features

- Real-time battle simulation
- In-browser code editor with syntax highlighting
- Visual battlefield with ship and rocket rendering
- Health system with speed degradation when damaged
- Rocket collision (rockets can destroy each other)
- Tournament arena mode

## Quick Start

### Prerequisites
- Node.js 18+ installed

### Installation

```bash
# Install all dependencies
npm run install:all
```

### Running the Game

```bash
# Start both server and client
npm run dev
```

Or run separately:
```bash
# Terminal 1 - Start server
npm run dev:server

# Terminal 2 - Start client  
npm run dev:client
```

Then open http://localhost:5173 in your browser.

## How to Play

1. **Write your code** in the editor panels (Fleet Alpha on left, Fleet Omega on right)
2. **Click "Submit Code"** for both fleets
3. **Click "Start Battle"** to begin
4. Watch your ships battle it out!

## Programming API

Your code has access to a `state` object and must set commands on the `commands` object.

### Available State

```javascript
state.myShips[]      // Array of your ships
state.enemyShips[]   // Array of enemy ships  
state.rockets[]      // All active rockets
state.field          // { width, height }
state.gameTime       // Time elapsed in milliseconds
state.constants      // Game constants (speeds, reload time, etc.)
```

### Ship Properties

```javascript
ship.id              // Unique ship identifier
ship.x, ship.y       // Position on battlefield
ship.bodyAngle       // Ship rotation (degrees, 0 = right)
ship.weaponAngle     // Weapon direction (same as bodyAngle)
ship.health          // 1-3 (destroyed at 0)
ship.isAlive         // Boolean
ship.canShoot        // Boolean (false if reloading)
ship.healthRatio     // health / max_health (0.33 to 1.0)
ship.maxSpeed        // Current max speed (min + boost at health)
```

### Commands

Set commands for each ship using its ID:

```javascript
commands[ship.id] = {
  boost: 1,          // 1 = extra thrust (based on health)
  rotate: 1,         // 1 = clockwise, -1 = counter-clockwise
  shoot: true        // true to fire rocket (fires forward!)
};
```

**Note:** Ships always drift forward at minimum speed. Boosting adds extra speed based on health!

### Example Code

```javascript
// Simple targeting AI
for (const ship of state.myShips) {
  if (!ship.isAlive) continue;
  
  // Find closest enemy
  let closestEnemy = null;
  let minDist = Infinity;
  
  for (const enemy of state.enemyShips) {
    if (!enemy.isAlive) continue;
    const dx = enemy.x - ship.x;
    const dy = enemy.y - ship.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      closestEnemy = enemy;
    }
  }
  
  if (closestEnemy) {
    // Calculate angle to enemy
    const dx = closestEnemy.x - ship.x;
    const dy = closestEnemy.y - ship.y;
    const angleToEnemy = Math.atan2(dy, dx) * 180 / Math.PI;
    
    // Aim ship at enemy (weapon fires forward)
    let angleDiff = angleToEnemy - ship.bodyAngle;
    while (angleDiff > 180) angleDiff -= 360;
    while (angleDiff < -180) angleDiff += 360;
    
    commands[ship.id] = {
      rotate: angleDiff > 5 ? 1 : angleDiff < -5 ? -1 : 0,
      boost: Math.abs(angleDiff) < 30 ? 1 : 0,
      shoot: Math.abs(angleDiff) < 12  // Only shoot when aimed
    };
  }
}
```

## Game Constants

| Constant | Value | Description |
|----------|-------|-------------|
| Field Size | 3000 x 1500 | Battlefield dimensions |
| Min Speed | 50 u/s | Ships always drift forward |
| Boost Speed | 100 u/s | Max extra speed (scales with health) |
| Ship Rotation | 120°/s | Body rotation speed |
| Rocket Speed | 1000 u/s | Projectile velocity |
| Reload Time | 2000 ms | Time between shots |
| Ship Health | 3 | Hits to destroy |

**Speed Formula:** `MIN_SPEED + (BOOST_SPEED × health/max_health)` when boosting

## Project Structure

```
./
├── server/           # Node.js backend
│   └── src/
│       ├── index.js          # Express + Socket.io server
│       ├── GameEngine.js     # Game logic
│       └── gameConstants.js  # Configurable constants
├── client/           # React frontend
│   └── src/
│       ├── App.jsx           # Main application
│       ├── components/
│       │   └── GameCanvas.jsx # Game rendering
│       └── index.css         # Styling
└── package.json      # Root package with scripts
```

## Game Modes

- **Simulator**: Practice mode for testing your fleet AI code
- **Battlegrounds**: Tournament arena where players compete for the championship

## License

MIT

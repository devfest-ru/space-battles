import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameEngine, GAME_CONSTANTS } from '@space-battles/shared';
import { ArenaManager } from './ArenaManager.js';
import { TOURNAMENT_CONSTANTS } from './tournamentConstants.js';

const app = express();
const httpServer = createServer(app);

// ============ SECURITY CONFIG ============

// Admin API key from environment variable (set in production)
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || 'dev-admin-key-change-in-production';

// Allowed origins for CORS
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:3000'];

// Rate limiting config
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // Max requests per window
const rateLimitStore = new Map();

// ============ MIDDLEWARE ============

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (health checks, server-to-server, mobile apps)
    if (!origin) {
      return callback(null, true);
    }
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' })); // Reduced limit for security

// Rate limiting middleware
const rateLimit = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return next();
  }
  
  const record = rateLimitStore.get(ip);
  
  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + RATE_LIMIT_WINDOW;
    return next();
  }
  
  record.count++;
  
  if (record.count > RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }
  
  next();
};

// Admin authentication middleware
const adminAuth = (req, res, next) => {
  const apiKey = req.headers['x-admin-key'] || req.query.adminKey;
  
  if (!apiKey || apiKey !== ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized. Valid admin key required.' });
  }
  
  next();
};

// Input sanitization helper
const sanitizeName = (name) => {
  if (typeof name !== 'string') return null;
  
  // Remove any HTML/script tags
  let sanitized = name.replace(/<[^>]*>/g, '');
  
  // Only allow alphanumeric, spaces, underscores, hyphens
  sanitized = sanitized.replace(/[^a-zA-Z0-9\s_-]/g, '');
  
  // Trim and limit length
  sanitized = sanitized.trim().substring(0, 30);
  
  return sanitized.length >= 2 ? sanitized : null;
};

// Validate code submission
const validateCode = (code) => {
  if (typeof code !== 'string') return { valid: false, error: 'Code must be a string' };
  if (code.length > 50000) return { valid: false, error: 'Code too long (max 50KB)' };
  if (code.trim().length === 0) return { valid: false, error: 'Code cannot be empty' };
  
  // Check for potentially dangerous patterns (basic check)
  const dangerousPatterns = [
    /process\./i,
    /require\s*\(/i,
    /import\s+/i,
    /eval\s*\(/i,
    /Function\s*\(/i,
    /__proto__/i,
    /constructor\s*\[/i,
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      return { valid: false, error: 'Code contains forbidden patterns' };
    }
  }
  
  return { valid: true };
};

// Clean up rate limit store periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitStore) {
    if (now > record.resetTime + RATE_LIMIT_WINDOW) {
      rateLimitStore.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

// ============ SOCKET.IO SETUP ============

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ['GET', 'POST']
  }
});

// Create game engine instance (for sandbox mode)
const gameEngine = new GameEngine();
let gameLoopInterval = null;

// Create arena manager (for tournament mode)
const arenaManager = new ArenaManager();
arenaManager.onUpdate = (state) => {
  io.emit('arenaUpdate', state);
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Send current game state on connection
  socket.emit('gameState', gameEngine.getGameState());
  socket.emit('constants', GAME_CONSTANTS);
  
  // Send arena state
  socket.emit('arenaUpdate', arenaManager.getArenaState());

  // Handle player code submission
  socket.on('submitCode', ({ playerId, code }) => {
    // Validate code
    const validation = validateCode(code);
    if (!validation.valid) {
      socket.emit('error', { message: validation.error });
      return;
    }
    
    console.log(`Player ${playerId} submitted code`);
    gameEngine.setPlayerCode(playerId, code);
    io.emit('codeSubmitted', { playerId });
  });

  // Handle game start
  socket.on('startGame', () => {
    const result = gameEngine.startGame();
    
    if (result.success) {
      console.log('Game started!');
      
      // Clear any existing game loop
      if (gameLoopInterval) {
        clearInterval(gameLoopInterval);
      }

      // Start game loop
      gameLoopInterval = setInterval(() => {
        const state = gameEngine.tick();
        io.emit('gameState', state);

        // Stop loop if game ended
        if (!state.isRunning) {
          clearInterval(gameLoopInterval);
          gameLoopInterval = null;
          console.log('Game ended! Winner:', state.winner);
        }
      }, GAME_CONSTANTS.TICK_INTERVAL);

      io.emit('gameStarted');
    } else {
      socket.emit('error', { message: result.error });
    }
  });

  // Handle game stop (also resets positions/health but keeps code)
  socket.on('stopGame', () => {
    gameEngine.stopAndReset();
    if (gameLoopInterval) {
      clearInterval(gameLoopInterval);
      gameLoopInterval = null;
    }
    io.emit('gameStopped');
    io.emit('gameState', gameEngine.getGameState());
  });

  // Handle game reset
  socket.on('resetGame', () => {
    gameEngine.stopGame();
    if (gameLoopInterval) {
      clearInterval(gameLoopInterval);
      gameLoopInterval = null;
    }
    gameEngine.initializeGame();
    io.emit('gameReset');
    io.emit('gameState', gameEngine.getGameState());
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// ============ PUBLIC API ENDPOINTS ============

app.get('/api/state', (req, res) => {
  res.json(gameEngine.getGameState());
});

app.get('/api/constants', (req, res) => {
  res.json(GAME_CONSTANTS);
});

app.get('/api/battlelog', (req, res) => {
  res.json(gameEngine.getBattleLog());
});

// ============ ARENA ENDPOINTS ============

// Get arena state
app.get('/api/arena', (req, res) => {
  res.json(arenaManager.getArenaState());
});

// Get tournament constants
app.get('/api/arena/constants', (req, res) => {
  res.json(TOURNAMENT_CONSTANTS);
});

// Register a player (rate limited)
app.post('/api/arena/register', rateLimit, (req, res) => {
  const sanitizedName = sanitizeName(req.body.name);
  
  if (!sanitizedName) {
    return res.status(400).json({ 
      success: false, 
      error: 'Invalid name. Use 2-30 characters (letters, numbers, spaces, hyphens, underscores only).' 
    });
  }
  
  const result = arenaManager.registerPlayer(sanitizedName);
  res.json(result);
});

// Submit player code (rate limited)
app.post('/api/arena/submit', rateLimit, (req, res) => {
  const { name, code } = req.body;
  
  const sanitizedName = sanitizeName(name);
  if (!sanitizedName) {
    return res.status(400).json({ success: false, error: 'Invalid name' });
  }
  
  const validation = validateCode(code);
  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }
  
  const result = arenaManager.submitCode(sanitizedName, code);
  res.json(result);
});

// Get all players
app.get('/api/arena/players', (req, res) => {
  res.json(arenaManager.getPlayers());
});

// Get tournament state
app.get('/api/arena/tournament', (req, res) => {
  res.json(arenaManager.getTournamentState());
});

// Get match details
app.get('/api/arena/match/:matchId', (req, res) => {
  const match = arenaManager.getMatch(req.params.matchId);
  if (match) {
    res.json(match);
  } else {
    res.status(404).json({ error: 'Match not found' });
  }
});

// Get game replay
app.get('/api/arena/replay/:matchId/:gameIndex', (req, res) => {
  const replay = arenaManager.getReplay(req.params.matchId, parseInt(req.params.gameIndex));
  if (replay) {
    res.json(replay);
  } else {
    res.status(404).json({ error: 'Replay not found' });
  }
});

// Get replay as downloadable log file
app.get('/api/arena/replay/:matchId/:gameIndex/download', (req, res) => {
  const replay = arenaManager.getReplay(req.params.matchId, parseInt(req.params.gameIndex));
  if (!replay) {
    return res.status(404).json({ error: 'Replay not found' });
  }
  
  // Format as readable log
  let log = `=== TOURNAMENT MATCH REPLAY ===\n`;
  log += `Match: ${replay.matchId}\n`;
  log += `Game: ${replay.gameIndex + 1}\n`;
  log += `Winner: ${replay.winner === 'draw' ? 'Draw' : `Player ${replay.winner}`}\n`;
  log += `Duration: ${Math.floor(replay.duration / 1000)}s\n\n`;
  
  log += `=== SNAPSHOTS ===\n\n`;
  
  for (const snap of replay.snapshots) {
    const timeStr = `${Math.floor(snap.time / 60000)}:${String(Math.floor((snap.time % 60000) / 1000)).padStart(2, '0')}`;
    log += `--- ${timeStr} (${snap.time}ms) ---\n`;
    
    log += `Ships:\n`;
    for (const ship of snap.ships) {
      const status = ship.isAlive ? `Shield:${ship.health}` : 'DESTROYED';
      log += `  [F${ship.playerId}] ${ship.id}: pos(${Math.round(ship.x)}, ${Math.round(ship.y)}) ${status}\n`;
    }
    
    if (snap.rockets && snap.rockets.length > 0) {
      log += `Rockets: ${snap.rockets.length}\n`;
    }
    
    if (snap.events && snap.events.length > 0) {
      log += `Events: ${snap.events.map(e => e.type).join(', ')}\n`;
    }
    
    log += `\n`;
  }
  
  res.setHeader('Content-Type', 'text/plain');
  res.setHeader('Content-Disposition', `attachment; filename="${replay.matchId}_game${replay.gameIndex}.txt"`);
  res.send(log);
});

// ============ ADMIN ENDPOINTS (Protected) ============

// Start tournament (admin only)
app.post('/api/arena/tournament/start', adminAuth, (req, res) => {
  const { bestOf, maxDraws } = req.body || {};
  const result = arenaManager.createTournament({ bestOf, maxDraws });
  res.json(result);
});

// Reset arena (admin only)
app.post('/api/arena/reset', adminAuth, (req, res) => {
  const result = arenaManager.resetArena();
  res.json(result);
});

// Clear all arena data (admin only)
app.post('/api/arena/clear', adminAuth, (req, res) => {
  const result = arenaManager.clearAll();
  res.json(result);
});

// ============ HEALTH CHECK ============

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// ============ SERVER START ============

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`🚀 Space Battles Server running on port ${PORT}`);
  console.log(`   WebSocket ready for connections`);
  console.log(`   CORS origins: ${ALLOWED_ORIGINS.join(', ')}`);
  if (ADMIN_API_KEY === 'dev-admin-key-change-in-production') {
    console.warn(`   ⚠️  Using default admin key - set ADMIN_API_KEY in production!`);
  }
});

// Graceful shutdown - release port before restart
const shutdown = () => {
  console.log('\n🛑 Shutting down server...');
  if (gameLoopInterval) {
    clearInterval(gameLoopInterval);
  }
  io.close(() => {
    httpServer.close(() => {
      console.log('   Server closed');
      process.exit(0);
    });
  });
  // Force exit after 2 seconds if graceful shutdown fails
  setTimeout(() => process.exit(0), 2000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

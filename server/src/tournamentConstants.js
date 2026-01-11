// Tournament Constants - Configurable tournament parameters

export const TOURNAMENT_CONSTANTS = {
  // Match settings
  BEST_OF: 3,                        // Best of X games per match
  MAX_DRAWS: 3,                      // After this many draws, pick random winner
  
  // Timing
  DELAY_BETWEEN_GAMES: 2000,         // ms delay between games in a match
  DELAY_BETWEEN_MATCHES: 5000,       // ms delay between matches
  
  // Tournament rules
  MAX_PLAYERS: 32,                   // Maximum players in a tournament
  MIN_PLAYERS: 2,                    // Minimum players to start
  
  // Storage
  DATA_DIR: './data',                // Directory for storing tournament data
  REPLAYS_DIR: './data/replays',     // Directory for storing game replays
};

export default TOURNAMENT_CONSTANTS;


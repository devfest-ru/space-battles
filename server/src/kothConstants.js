// King of the Hill Constants - separate, isolated module

export const KOTH_CONSTANTS = {
  // Pseudo-team name for the starting king (code provided by admin)
  ADMIN_KING: '__admin__',

  // Rules
  MIN_TEAMS: 1,                      // Minimum challenger teams (+ king = 2 participants)
  MAX_DRAWS: 5,                      // Extra games allowed per series to re-play draws
  DEFAULT_K: 2,                      // Default wins-per-series suggested to admin

  // Timing
  DELAY_BETWEEN_GAMES: 0,            // ms delay between games in a series

  // Storage (isolated from the olympic tournament data)
  DATA_DIR: './data/koth',
  REPLAYS_DIR: './data/koth/replays',
};

export default KOTH_CONSTANTS;

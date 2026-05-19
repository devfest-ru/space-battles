function TournamentBracket({ tournament, onViewReplay, onDownloadLog }) {
  if (!tournament || !tournament.bracket) {
    return <div className="bracket-empty">No bracket data</div>;
  }

  const { bracket } = tournament;
  const roundNames = ['Round 1', 'Quarterfinals', 'Semifinals', 'Final'];

  const getRoundName = (index, totalRounds) => {
    if (index === totalRounds - 1) return 'Final';
    if (index === totalRounds - 2) return 'Semifinals';
    if (index === totalRounds - 3) return 'Quarterfinals';
    return `Round ${index + 1}`;
  };

  return (
    <div className="tournament-bracket">
      {bracket.byePlayers && bracket.byePlayers.length > 0 && (
        <div className="bye-players">
          <h4>Bye (auto-advance): {bracket.byePlayers.join(', ')}</h4>
        </div>
      )}

      <div className="bracket-rounds">
        {bracket.matches.map((round, roundIndex) => (
          <div key={roundIndex} className="bracket-round">
            <h3 className="round-title">
              {getRoundName(roundIndex, bracket.matches.length)}
            </h3>
            <div className="round-matches">
              {round.map((match) => (
                <MatchCard 
                  key={match.id} 
                  match={match}
                  onViewReplay={onViewReplay}
                  onDownloadLog={onDownloadLog}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({ match, onViewReplay, onDownloadLog }) {
  const [expanded, setExpanded] = useState(false);

  const getStatusClass = () => {
    if (match.status === 'completed') return 'completed';
    if (match.status === 'running') return 'running';
    return 'pending';
  };

  const hasGames = match.games && match.games.length > 0;

  return (
    <div className={`match-card ${getStatusClass()}`}>
      <div className="match-header" onClick={() => hasGames && setExpanded(!expanded)}>
        <div className={`match-player ${match.winner === match.player1 ? 'winner' : ''}`}>
          <span className="player-name">{match.player1 || 'TBD'}</span>
          {match.status === 'completed' && <span className="player-score">{match.p1Wins || 0}</span>}
        </div>
        <div className="match-vs">
          {match.status === 'running' ? (
            <span className="live-indicator">🔴 LIVE</span>
          ) : (
            'vs'
          )}
        </div>
        <div className={`match-player ${match.winner === match.player2 ? 'winner' : ''}`}>
          <span className="player-name">{match.player2 || 'TBD'}</span>
          {match.status === 'completed' && <span className="player-score">{match.p2Wins || 0}</span>}
        </div>
        {hasGames && (
          <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
        )}
      </div>

      {expanded && hasGames && (
        <div className="match-games">
          {match.games.map((game, index) => (
            <div key={index} className="game-row">
              <span className="game-number">Game {index + 1}</span>
              <span className={`game-winner ${game.winner === 1 ? 'p1' : game.winner === 2 ? 'p2' : 'draw'}`}>
                {game.winner === 1 ? match.player1 : 
                 game.winner === 2 ? match.player2 : 'Draw'}
              </span>
              <span className="game-duration">{Math.floor(game.duration / 1000)}s</span>
              <div className="game-actions">
                <button 
                  className="replay-btn"
                  onClick={(e) => { e.stopPropagation(); onViewReplay(match.id, index, match.player1, match.player2); }}
                >
                  🎬 Replay
                </button>
                <button 
                  className="download-btn"
                  onClick={(e) => { e.stopPropagation(); onDownloadLog(match.id, index); }}
                >
                  📥 Log
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';

export default TournamentBracket;


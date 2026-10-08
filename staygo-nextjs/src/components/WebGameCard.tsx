import type { WebGame } from '@/data/webGames';

export default function WebGameCard({ game, showDescription = false }: { game: WebGame; showDescription?: boolean }) {
  const { cover } = game;

  return (
    <article className="game-card">
      {game.beta && <span className="beta-badge">Beta</span>}
      {'images' in cover ? (
        <div className="game-thumbnail game-thumbnail-hover">
          <img src={cover.images[0]} alt={game.title} className="thumbnail-default" />
          <img src={cover.images[1]} alt={game.title} className="thumbnail-hover" />
        </div>
      ) : (
        <div className="game-thumbnail">
          <div style={{ background: cover.background, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', fontSize: '80px', color: cover.color ?? 'white' }}>
            {cover.emoji}
          </div>
        </div>
      )}
      <div className="game-info">
        <h3 className="game-title">{game.title}</h3>
        {showDescription ? (
          <>
            <p className="game-meta">{game.meta}</p>
            <p className="game-description">{game.description}</p>
          </>
        ) : (
          <p className="game-meta">{game.short}</p>
        )}
        <div className="game-actions">
          <a href={game.href} className="button button-primary button-md">{game.cta ?? 'เล่นเกม'}</a>
        </div>
      </div>
    </article>
  );
}

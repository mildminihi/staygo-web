import Link from 'next/link';
import { GENRE_LABELS, type BoardGame } from '@/data/boardgames';

export default function GameCard({ game }: { game: BoardGame }) {
  return (
    <Link href={`/how-to-play/${game.slug}/`} className="htp-card">
      <div className="htp-thumb">
        <img
          src={`https://i.ytimg.com/vi/${game.videos[0].id}/hqdefault.jpg`}
          alt={game.name}
          loading="lazy"
        />
        <span className="htp-play" aria-hidden="true">▶</span>
      </div>
      <div className="htp-card-body">
        <h3 className="htp-card-title">{game.name}</h3>
        {game.altName && <p className="htp-card-alt">{game.altName}</p>}
        <div className="htp-tags">
          {game.genres.map((g) => (
            <span key={g} className="htp-tag">{GENRE_LABELS[g]}</span>
          ))}
        </div>
        <p className="htp-meta">
          <span>👥 {game.players}</span>
          <span>⏱ {game.duration}</span>
        </p>
      </div>
    </Link>
  );
}

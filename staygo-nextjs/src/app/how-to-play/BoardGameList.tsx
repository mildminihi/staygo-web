'use client';

import { useMemo, useState } from 'react';
import { GENRE_LABELS, type BoardGame, type Genre } from '@/data/boardgames';
import GameCard from './GameCard';

const GENRES = Object.keys(GENRE_LABELS) as Genre[];

export default function BoardGameList({ games }: { games: BoardGame[] }) {
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<Genre | 'all'>('all');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return games.filter((g) => {
      if (genre !== 'all' && !g.genres.includes(genre)) return false;
      if (!q) return true;
      return `${g.name} ${g.altName ?? ''}`.toLowerCase().includes(q);
    });
  }, [games, query, genre]);

  return (
    <>
      <div className="htp-toolbar">
        <input
          type="search"
          className="htp-search"
          placeholder="ค้นหาชื่อเกม..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="ค้นหาชื่อเกม"
        />
        <div className="htp-chips" role="group" aria-label="กรองตามแนวเกม">
          <button
            type="button"
            className={`htp-chip ${genre === 'all' ? 'active' : ''}`}
            onClick={() => setGenre('all')}
          >
            ทั้งหมด
          </button>
          {GENRES.map((g) => (
            <button
              key={g}
              type="button"
              className={`htp-chip ${genre === g ? 'active' : ''}`}
              onClick={() => setGenre(g)}
            >
              {GENRE_LABELS[g]}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="htp-empty">ไม่พบเกมที่ค้นหา</p>
      ) : (
        <div className="htp-grid">
          {filtered.map((g) => (
            <GameCard key={g.slug} game={g} />
          ))}
        </div>
      )}
    </>
  );
}

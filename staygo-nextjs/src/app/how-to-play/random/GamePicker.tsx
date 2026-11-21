'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { GENRE_LABELS, minMinutes, playerRange, type BoardGame, type Genre } from '@/data/boardgames';
import GameCard from '../GameCard';

const GENRES = Object.keys(GENRE_LABELS) as Genre[];
const PLAYER_CHOICES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const TIME_CHOICES: { v: number; label: string }[] = [
  { v: 0, label: 'ไม่จำกัด' },
  { v: 20, label: 'ไม่เกิน 20 นาที' },
  { v: 30, label: 'ไม่เกิน 30 นาที' },
  { v: 60, label: 'ไม่เกิน 1 ชั่วโมง' },
];
const MORE_LIMIT = 8;

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export default function GamePicker({ games }: { games: BoardGame[] }) {
  const [players, setPlayers] = useState(4);
  const [genres, setGenres] = useState<Set<Genre>>(new Set());
  const [maxTime, setMaxTime] = useState(0);
  const [result, setResult] = useState<BoardGame | null>(null);
  const [shown, setShown] = useState<BoardGame | null>(null);
  const [rolling, setRolling] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const recent = useRef<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(
    () =>
      games.filter((g) => {
        const [min, max] = playerRange(g);
        if (players < min || players > max) return false;
        if (genres.size && !g.genres.some((x) => genres.has(x))) return false;
        if (maxTime && minMinutes(g) > maxTime) return false;
        return true;
      }),
    [games, players, genres, maxTime],
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const toggleGenre = (g: Genre) =>
    setGenres((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });

  function roll() {
    if (!matches.length || rolling) return;
    const fresh = matches.filter((g) => !recent.current.includes(g.slug));
    const final = pick(fresh.length ? fresh : matches);
    recent.current = [final.slug, ...recent.current].slice(0, Math.min(5, matches.length - 1));
    setShowAll(false);
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || matches.length === 1) {
      setResult(final);
      setShown(final);
      return;
    }
    setRolling(true);
    setResult(null);
    let delay = 60;
    const step = () => {
      if (delay > 260) {
        setShown(final);
        setResult(final);
        setRolling(false);
        return;
      }
      setShown(pick(matches));
      delay *= 1.18;
      timer.current = setTimeout(step, delay);
    };
    step();
    setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  }

  const others = result ? matches.filter((g) => g.slug !== result.slug) : [];
  const card = shown;

  return (
    <div className="gp-wrap">
      <div className="gp-form">
        <div className="gp-field">
          <span className="gp-label">👥 เล่นกันกี่คน</span>
          <div className="htp-chips gp-chips" role="group" aria-label="จำนวนผู้เล่น">
            {PLAYER_CHOICES.map((n) => (
              <button key={n} type="button" className={`htp-chip ${players === n ? 'active' : ''}`} onClick={() => setPlayers(n)}>
                {n === 11 ? '11+' : n} คน
              </button>
            ))}
          </div>
        </div>

        <div className="gp-field">
          <span className="gp-label">🎯 แนวเกม <small>(เลือกได้หลายแนว)</small></span>
          <div className="htp-chips gp-chips" role="group" aria-label="แนวเกม">
            <button type="button" className={`htp-chip ${genres.size === 0 ? 'active' : ''}`} onClick={() => setGenres(new Set())}>
              แนวไหนก็ได้
            </button>
            {GENRES.map((g) => (
              <button key={g} type="button" className={`htp-chip ${genres.has(g) ? 'active' : ''}`} onClick={() => toggleGenre(g)}>
                {GENRE_LABELS[g]}
              </button>
            ))}
          </div>
        </div>

        <div className="gp-field">
          <span className="gp-label">⏱ มีเวลาเล่น</span>
          <div className="htp-chips gp-chips" role="group" aria-label="เวลาเล่น">
            {TIME_CHOICES.map((t) => (
              <button key={t.v} type="button" className={`htp-chip ${maxTime === t.v ? 'active' : ''}`} onClick={() => setMaxTime(t.v)}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="button button-primary button-lg gp-roll" onClick={roll} disabled={!matches.length || rolling}>
          {rolling ? 'กำลังสุ่ม…' : result ? '🎲 สุ่มใหม่' : '🎲 สุ่มเกม!'}
        </button>
        <p className="gp-count" aria-live="polite">
          {matches.length ? `มี ${matches.length} เกมที่เข้าเงื่อนไข` : 'ไม่มีเกมที่เข้าเงื่อนไขนี้ ลองเปลี่ยนจำนวนคน แนวเกม หรือเวลาดูนะ'}
        </p>
      </div>

      <div ref={resultRef} className="gp-result-area" aria-live="polite">
        {card ? (
          <div className={`gp-result ${rolling ? 'rolling' : 'landed'}`}>
            <div className="gp-thumb">
              <img src={`https://i.ytimg.com/vi/${card.videos[0].id}/hqdefault.jpg`} alt={card.name} />
            </div>
            <div className="gp-body">
              <p className="gp-kicker">{rolling ? 'สุ่มอยู่…' : 'คืนนี้เล่นเกมนี้เลย!'}</p>
              <h2 className="gp-name">{card.name}</h2>
              {card.altName && <p className="htp-card-alt">{card.altName}</p>}
              <div className="htp-tags">
                {card.genres.map((g) => (
                  <span key={g} className="htp-tag">{GENRE_LABELS[g]}</span>
                ))}
              </div>
              <p className="htp-meta">
                <span>👥 {card.players}</span>
                <span>⏱ {card.duration}</span>
              </p>
              {!rolling && (
                <>
                  <p className="gp-summary">{card.summary}</p>
                  <div className="gp-actions">
                    <a
                      href={`https://www.youtube.com/watch?v=${card.videos[0].id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button button-md htp-btn-youtube"
                    >
                      ▶ ดูคลิปที่ STAYGO เล่น
                    </a>
                    <Link href={`/how-to-play/${card.slug}/`} className="button button-md button-outline">
                      📖 อ่านวิธีเล่นย่อ
                    </Link>
                    {card.toolHref && (
                      <a href={card.toolHref} className="button button-md button-outline">🎲 เครื่องมือช่วยเล่น</a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="gp-placeholder">
            <span aria-hidden="true">🎲</span>
            <p>เลือกจำนวนคนกับแนวเกม แล้วกดสุ่มได้เลย</p>
          </div>
        )}
      </div>

      {result && !rolling && others.length > 0 && (
        <div className="gp-others">
          <h2 className="gp-others-title">เกมอื่นที่เข้าเงื่อนไข ({others.length})</h2>
          <div className="htp-grid">
            {(showAll ? others : others.slice(0, MORE_LIMIT)).map((g) => (
              <GameCard key={g.slug} game={g} />
            ))}
          </div>
          {others.length > MORE_LIMIT && !showAll && (
            <button type="button" className="button button-md button-outline gp-more" onClick={() => setShowAll(true)}>
              ดูทั้งหมด {others.length} เกม
            </button>
          )}
        </div>
      )}
    </div>
  );
}

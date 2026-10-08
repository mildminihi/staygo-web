import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { BOARD_GAMES, GENRE_LABELS, getBoardGame, getRelatedGames } from '@/data/boardgames';
import GameCard from '../GameCard';

const SUBSCRIBE_URL = 'https://www.youtube.com/@STAYGO?sub_confirmation=1';

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return BOARD_GAMES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const game = getBoardGame(slug);
  if (!game) return {};

  const title = `วิธีเล่น ${game.name} - STAYGO`;
  return {
    title,
    description: game.summary,
    icons: {
      icon: '/games/reveal-board/staygo-logo.png',
      shortcut: '/games/reveal-board/staygo-logo.png',
      apple: '/games/reveal-board/staygo-logo.png',
    },
    openGraph: {
      title,
      description: game.summary,
      url: `https://staygoch.com/how-to-play/${game.slug}/`,
      images: [{ url: `https://i.ytimg.com/vi/${game.videos[0].id}/hqdefault.jpg`, alt: game.name }],
    },
  };
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default async function BoardGameDetailPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const game = getBoardGame(slug);
  if (!game) notFound();

  const related = getRelatedGames(game);

  return (
    <main>
      <section className="section">
        <div className="container htp-detail">
          <Link href="/how-to-play/" className="link-more">← กลับไปหน้ารวมบอร์ดเกม</Link>

          <header className="htp-detail-header">
            <h1 className="htp-detail-title">{game.name}</h1>
            {game.altName && <p className="htp-detail-alt">{game.altName}</p>}
            <div className="htp-tags">
              {game.genres.map((g) => (
                <span key={g} className="htp-tag">{GENRE_LABELS[g]}</span>
              ))}
            </div>
          </header>

          <div className="htp-stats">
            <div className="htp-stat">
              <span className="htp-stat-label">แนวเกม</span>
              <span className="htp-stat-value">{game.genres.map((g) => GENRE_LABELS[g]).join(', ')}</span>
            </div>
            <div className="htp-stat">
              <span className="htp-stat-label">จำนวนผู้เล่น</span>
              <span className="htp-stat-value">{game.players}</span>
            </div>
            <div className="htp-stat">
              <span className="htp-stat-label">เวลาเล่น</span>
              <span className="htp-stat-value">{game.duration}</span>
            </div>
          </div>

          {game.videos.map((v) => (
            <div key={v.id} className="htp-video-block">
              {v.label && <h2 className="htp-video-label">{v.label}</h2>}
              <div className="htp-video">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${v.id}${v.start ? `?start=${v.start}` : ''}`}
                  title={`${game.name} | STAYGO`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerPolicy="strict-origin-when-cross-origin"
                  allowFullScreen
                ></iframe>
              </div>
              <div className="htp-video-actions">
                <a
                  href={`https://www.youtube.com/watch?v=${v.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-md htp-btn-youtube"
                >
                  ▶ ดูคลิปเต็มบน YouTube
                </a>
                {v.start && (
                  <span className="htp-video-note">คลิปด้านบนเริ่มที่ช่วงสอนเล่น ({formatTime(v.start)})</span>
                )}
              </div>
            </div>
          ))}

          <div className="htp-subscribe">
            <img src="/games/reveal-board/staygo-logo.png" alt="" className="htp-subscribe-logo" />
            <div className="htp-subscribe-text">
              <strong>ชอบคลิปนี้? ฝากติดตาม STAYGO ด้วยนะครับ</strong>
              <span>มีคลิปบอร์ดเกมใหม่ๆ ลงเรื่อยๆ</span>
            </div>
            <a href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer" className="button button-md htp-btn-youtube">
              🔔 ติดตามช่อง
            </a>
          </div>

          <div className="htp-content">
            <h2>เกมนี้เกี่ยวกับอะไร</h2>
            <p>{game.summary}</p>

            <h2>เป้าหมาย</h2>
            <p>{game.goal}</p>

            <h2>วิธีเล่นแบบย่อ</h2>
            <ol>
              {game.steps.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>

            {game.toolHref && (
              <a href={game.toolHref} className="button button-primary button-md">
                🎲 ใช้เครื่องมือช่วยเล่นเกมนี้
              </a>
            )}
          </div>

          {related.length > 0 && (
            <section className="htp-related">
              <h2 className="htp-related-title">ดูคลิปเกมอื่นต่อ</h2>
              <div className="htp-grid htp-related-grid">
                {related.map((g) => (
                  <GameCard key={g.slug} game={g} />
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </main>
  );
}

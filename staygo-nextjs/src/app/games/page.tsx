import type { Metadata } from 'next';
import WebGameCard from '@/components/WebGameCard';
import { WEB_GAMES } from '@/data/webGames';

export const metadata: Metadata = {
  title: 'เกมปาร์ตี้ทั้งหมด - STAYGO',
  description: 'รวมเกมปาร์ตี้สนุกๆ เล่นฟรีบนเว็บ Reveal Board, ลูปนรกหมกมุ่น, จับคู่อีโมจิ, Dice Roguelike และอื่นๆ อีกมากมาย',
  keywords: 'เกมปาร์ตี้, เกมออนไลน์ฟรี, Reveal Board, เกมเปิดไพ่, เกมจับคู่, Roguelike, เกมลูกเต๋า',
  icons: {
    icon: '/games/reveal-board/staygo-logo.png',
    shortcut: '/games/reveal-board/staygo-logo.png',
    apple: '/games/reveal-board/staygo-logo.png',
  },
  openGraph: {
    title: 'เกมปาร์ตี้ทั้งหมด - STAYGO',
    description: 'รวมเกมปาร์ตี้สนุกๆ เล่นฟรีบนเว็บ',
    url: 'https://staygoch.com/games/',
    images: [
      {
        url: 'https://staygoch.com/games/reveal-board/staygo-logo.png',
        width: 512,
        height: 512,
        alt: 'STAYGO Logo',
      },
    ],
  },
};

export default function GamesPage() {
  return (
    <main>
      <section className="section">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h1 className="section-title" style={{ fontSize: '40px', marginBottom: '16px' }}>🎮 เกมทั้งหมด</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '18px' }}>เลือกเกมที่อยากเล่น (ในอนาคตจะเพิ่มเกมใหม่เข้ามาเรื่อย ๆ)</p>
          </div>

          <div className="game-grid">
            {WEB_GAMES.map((game) => (
              <WebGameCard key={game.href} game={game} showDescription />
            ))}

            {/* Placeholder for future games */}
            <article className="game-card" style={{ opacity: 0.6, pointerEvents: 'none' }}>
              <div className="game-thumbnail">
                <svg viewBox="0 0 200 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="200" height="160" fill="#F3F4F6"/>
                  <text x="100" y="80" textAnchor="middle" fontSize="48" fill="#9CA3AF">?</text>
                  <text x="100" y="110" textAnchor="middle" fontSize="14" fill="#6B7280">Coming Soon</text>
                </svg>
              </div>
              <div className="game-info">
                <h3 className="game-title">เกมใหม่</h3>
                <p className="game-meta">เร็วๆ นี้</p>
                <p className="game-description">เกมใหม่กำลังจะมาเร็วๆ นี้ ติดตามได้ทางช่อง YouTube</p>
                <div className="game-actions">
                  <button className="button button-secondary button-md" disabled>เร็วๆ นี้</button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </main>
  );
}


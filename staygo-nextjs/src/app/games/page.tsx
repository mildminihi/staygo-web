import type { Metadata } from 'next';
import WebGameCard from '@/components/WebGameCard';
import { GAME_CATEGORIES, WEB_GAMES } from '@/data/webGames';

export const metadata: Metadata = {
  alternates: { canonical: '/games/' },
  title: 'เกมทั้งหมด - STAYGO',
  description: 'รวมเกมเล่นฟรีบนเว็บ บอร์ดเกมออนไลน์ STAYGO!, ลุ้นจั่ว, เกมปาร์ตี้วาดรูป และเกมเล่นคนเดียวอีกมากมาย',
  keywords: 'บอร์ดเกมออนไลน์, STAYGO, เกมปาร์ตี้, เกมออนไลน์ฟรี, เกมเล่นคนเดียว, เกมวาดรูป, Roguelike',
  icons: {
    icon: '/games/reveal-board/staygo-logo.png',
    shortcut: '/games/reveal-board/staygo-logo.png',
    apple: '/games/reveal-board/staygo-logo.png',
  },
  openGraph: {
    title: 'เกมทั้งหมด - STAYGO',
    description: 'รวมบอร์ดเกมออนไลน์ เกมปาร์ตี้ และเกมเล่นคนเดียว เล่นฟรีบนเว็บ',
    url: 'https://www.staygoch.com/games/',
    images: [
      {
        url: 'https://www.staygoch.com/assets/image/share/page-games.jpg',
        width: 1200,
        height: 630,
        alt: 'เกมปาร์ตี้เล่นฟรีบนเว็บ',
      },
    ],
  },
};

export default function GamesPage() {
  return (
    <main>
      <section className="section">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '48px', flexDirection: 'column' }}>
            <h1 className="section-title" style={{ fontSize: '40px', marginBottom: '16px' }}>🎮 เกมทั้งหมด</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '18px', margin: 0 }}>เลือกเกมที่อยากเล่น (ในอนาคตจะเพิ่มเกมใหม่เข้ามาเรื่อย ๆ)</p>
          </div>

          {GAME_CATEGORIES.map((cat) => {
            const games = WEB_GAMES.filter((g) => g.category === cat.id);
            return (
              <div key={cat.id} className="category-block" id={cat.id}>
                <div className="category-head">
                  <h2 className="category-title">
                    {cat.icon} {cat.title}
                    <span className="category-count">({games.length})</span>
                  </h2>
                  <p className="category-subtitle">{cat.subtitle}</p>
                </div>
                <div className="game-grid">
                  {games.map((game) => (
                    <WebGameCard key={game.href} game={game} showDescription />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}


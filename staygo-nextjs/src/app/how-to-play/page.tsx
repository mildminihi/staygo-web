import type { Metadata } from 'next';
import BoardGameList from './BoardGameList';
import { BOARD_GAMES } from '@/data/boardgames';

export const metadata: Metadata = {
  title: 'วิธีเล่นบอร์ดเกม - STAYGO',
  description: 'รวมวิธีเล่นบอร์ดเกมที่ STAYGO เคยเล่น บอกแนวเกม จำนวนผู้เล่น เวลาที่ใช้ พร้อมคลิปสอนเล่นจากช่อง STAYGO',
  keywords: 'วิธีเล่นบอร์ดเกม, กติกาบอร์ดเกม, บอร์ดเกม, Board Game, How to Play, STAYGO',
  icons: {
    icon: '/games/reveal-board/staygo-logo.png',
    shortcut: '/games/reveal-board/staygo-logo.png',
    apple: '/games/reveal-board/staygo-logo.png',
  },
  openGraph: {
    title: 'วิธีเล่นบอร์ดเกม - STAYGO',
    description: 'รวมวิธีเล่นบอร์ดเกม พร้อมคลิปสอนเล่นจากช่อง STAYGO',
    url: 'https://staygoch.com/how-to-play/',
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

export default function HowToPlayPage() {
  return (
    <main>
      <section className="section">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '32px', flexDirection: 'column' }}>
            <h1 className="section-title" style={{ fontSize: '40px', marginBottom: '8px' }}>📖 วิธีเล่นบอร์ดเกม</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '18px', margin: 0 }}>
              รวม {BOARD_GAMES.length} บอร์ดเกมที่ STAYGO เคยเล่น พร้อมกติกาย่อและคลิปสอนเล่นจากช่อง
            </p>
          </div>

          <BoardGameList games={BOARD_GAMES} />
        </div>
      </section>
    </main>
  );
}

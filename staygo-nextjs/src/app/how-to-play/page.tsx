import type { Metadata } from 'next';
import Link from 'next/link';
import BoardGameList from './BoardGameList';
import { BOARD_GAMES } from '@/data/boardgames';

export const metadata: Metadata = {
  alternates: { canonical: '/how-to-play/' },
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
    url: 'https://www.staygoch.com/how-to-play/',
    images: [
      {
        url: 'https://www.staygoch.com/assets/image/share/page-howto.jpg',
        width: 1200,
        height: 630,
        alt: 'วิธีเล่นบอร์ดเกม',
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
            <Link href="/how-to-play/random/" className="button button-primary button-md" style={{ marginTop: '16px' }}>
              🎲 ไม่รู้จะเล่นอะไร? สุ่มให้เลย
            </Link>
          </div>

          <BoardGameList games={BOARD_GAMES} />
        </div>
      </section>
    </main>
  );
}

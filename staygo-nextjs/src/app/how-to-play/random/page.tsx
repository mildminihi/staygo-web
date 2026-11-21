import type { Metadata } from 'next';
import Link from 'next/link';
import GamePicker from './GamePicker';
import { BOARD_GAMES } from '@/data/boardgames';

const title = 'สุ่มบอร์ดเกม: คืนนี้เล่นอะไรดี? - STAYGO';
const description = `บอกจำนวนคนและแนวเกมที่อยากเล่น แล้วสุ่มบอร์ดเกมจาก ${BOARD_GAMES.length} เกมที่ STAYGO เคยเล่น พร้อมคลิปและวิธีเล่นย่อ`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/how-to-play/random/' },
  openGraph: {
    title,
    description,
    url: 'https://www.staygoch.com/how-to-play/random/',
    images: [
      {
        url: 'https://www.staygoch.com/assets/image/share/tool-game-picker.jpg',
        width: 1200,
        height: 630,
        alt: 'สุ่มบอร์ดเกม คืนนี้เล่นอะไรดี',
      },
    ],
  },
};

export default function RandomBoardGamePage() {
  return (
    <main>
      <section className="section">
        <div className="container gp">
          <Link href="/how-to-play/" className="link-more">← ดูบอร์ดเกมทั้งหมด</Link>
          <div className="gp-head">
            <h1 className="section-title">🎲 คืนนี้เล่นอะไรดี?</h1>
            <p>บอกจำนวนคนกับแนวเกมที่อยากเล่น แล้วให้เราสุ่มจาก {BOARD_GAMES.length} บอร์ดเกมที่ STAYGO เคยเล่นในช่อง</p>
          </div>
          <GamePicker games={BOARD_GAMES} />
        </div>
      </section>
    </main>
  );
}

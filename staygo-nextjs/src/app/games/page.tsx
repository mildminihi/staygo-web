import type { Metadata } from 'next';
import Link from 'next/link';

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
            <article className="game-card">
              <div className="game-thumbnail game-thumbnail-hover">
                <img src="/assets/image/reveal-cover-1.png" alt="Guess the Picture" className="thumbnail-default" />
                <img src="/assets/image/reveal-cover-2.png" alt="Guess the Picture" className="thumbnail-hover" />
              </div>
              <div className="game-info">
                <h3 className="game-title">เปิดแผ่นป้ายทายภาพ</h3>
                <p className="game-meta">4–20 Players • เกมปาร์ตี้</p>
                <p className="game-description">เปิดแผ่นป้ายทีละช่องเพื่อทายภาพ เหมาะสำหรับเล่นเป็นกลุ่ม</p>
                <div className="game-actions">
                  <a href="/games/reveal-board/" className="button button-primary button-md">เล่นเกม</a>
                </div>
              </div>
            </article>

            <article className="game-card">
              <div className="game-thumbnail game-thumbnail-hover">
                <img src="/assets/image/cardloop-cover-1.png" alt="Cardloop" className="thumbnail-default" />
                <img src="/assets/image/cardloop-cover-2.png" alt="Cardloop" className="thumbnail-hover" />
              </div>
              <div className="game-info">
                <h3 className="game-title">ลูปนรกหมกมุ่น</h3>
                <p className="game-meta">1 Player • เกมไพ่</p>
                <p className="game-description">ตอบคำถาม 4 ข้อให้ถูกต้องติดต่อกันเพื่อชนะ เกมท้าทายความจำและโชค</p>
                <div className="game-actions">
                  <a href="/games/cardloop/" className="button button-primary button-md">เล่นเกม</a>
                </div>
              </div>
            </article>

            <article className="game-card">
              <div className="game-thumbnail game-thumbnail-hover">
                <img src="/assets/image/match-cover-1.png" alt="จับคู่อีโมจิ" className="thumbnail-default" />
                <img src="/assets/image/match-cover-2.png" alt="จับคู่อีโมจิ" className="thumbnail-hover" />
              </div>
              <div className="game-info">
                <h3 className="game-title">จับคู่อีโมจิ</h3>
                <p className="game-meta">1 Player • เกมจำ</p>
                <p className="game-description">จับคู่อีโมจิให้ถูกต้อง เลือกระดับความยากและโหมดจับเวลา</p>
                <div className="game-actions">
                  <a href="/games/emoji-match/" className="button button-primary button-md">เล่นเกม</a>
                </div>
              </div>
            </article>

            <article className="game-card">
              <span className="beta-badge">Beta</span>
              <div className="game-thumbnail game-thumbnail-hover">
                <img src="/assets/image/dice-rouge-cover-1.png" alt="Dice rougelike" className="thumbnail-default" />
                <img src="/assets/image/dice-rouge-cover-2.png" alt="Dice rougelike" className="thumbnail-hover" />
              </div>
              <div className="game-info">
                <h3 className="game-title">Dice Roguelike</h3>
                <p className="game-meta">1 Player • เกมกลยุทธ์</p>
                <p className="game-description">เกมผจญภัยด้วยลูกเต๋า วางแผนการต่อสู้แบบเทิร์นเบส รวบรวมไอเทมและเอาชนะบอส</p>
                <div className="game-actions">
                  <a href="/games/dice-roguelike/" className="button button-primary button-md">เล่นเกม</a>
                </div>
              </div>
            </article>

            <article className="game-card">
              <div className="game-thumbnail game-thumbnail-hover">
                <img src="/assets/image/decoder-cover-1.png" alt="ถอดรหัสตัวเลข" className="thumbnail-default" />
                <img src="/assets/image/decoder-cover-2.png" alt="ถอดรหัสตัวเลข" className="thumbnail-hover" />
              </div>
              <div className="game-info">
                <h3 className="game-title">ถอดรหัสตัวเลข</h3>
                <p className="game-meta">1 Player • เกมปริศนา</p>
                <p className="game-description">ใช้ logic ทายตัวเลขลับภายใน 8 ครั้ง ด้วยระบบสีที่บอกคำใบ้ เหมือน Mastermind</p>
                <div className="game-actions">
                  <a href="/games/decoder/" className="button button-primary button-md">เล่นเกม</a>
                </div>
              </div>
            </article>

            <article className="game-card">
              <div className="game-thumbnail">
                <div style={{ background: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', fontSize: '80px', color: 'white' }}>
                  🎲
                </div>
              </div>
              <div className="game-info">
                <h3 className="game-title">เกมทอยเต๋า</h3>
                <p className="game-meta">Multiplayer • เกมทอยเต๋า</p>
                <p className="game-description">เลือกแผ่นป้ายและทอยเต๋า d6 เพื่อเก็บแต้ม รองรับโหมดปกติและโหมด Team สำหรับจัดกิจกรรม</p>
                <div className="game-actions">
                  <a href="/games/dice-challenge/" className="button button-primary button-md">เล่นเกม</a>
                </div>
              </div>
            </article>

            <article className="game-card">
              <span className="beta-badge">Beta</span>
              <div className="game-thumbnail">
                <div style={{ background: '#14161C', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px', fontSize: '80px', color: 'white' }}>
                  📜
                </div>
              </div>
              <div className="game-info">
                <h3 className="game-title">Dungeon Ledger</h3>
                <p className="game-meta">1 Player • เกม Idle ผจญภัย</p>
                <p className="game-description">สุ่มฮีโร่ ลุยดันเจี้ยนแบบ auto-battle เก็บไอเทม ตีเสริมพลัง แล้วบันทึกทุกการต่อสู้ลงในสมุดบัญชี</p>
                <div className="game-actions">
                  <a href="/games/dungeon-ledger/" className="button button-primary button-md">เล่นเกม</a>
                </div>
              </div>
            </article>

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


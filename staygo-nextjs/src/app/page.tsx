import type { Metadata } from 'next';
import Link from 'next/link';
import WebGameCard from '@/components/WebGameCard';
import { HOME_GAME_LIMIT, WEB_GAMES } from '@/data/webGames';
import { HOME_TOOL_LIMIT, TOOLS } from '@/data/tools';
import { BOARD_GAMES } from '@/data/boardgames';
import LatestClip from '@/components/LatestClip';
import PlaylistTabs from '@/components/PlaylistTabs';
import { channelTabs } from '@/data/youtube';

// คลิปล่าสุดและเพลย์ลิสต์ดึงจาก YouTube ตอน build (ดู src/data/playlists.ts)
const TABS = channelTabs();
// three episode covers fanned out on the "สุ่มบอร์ดเกม" button
const PICK_THUMBS = [0, 1, 2].map((i) => BOARD_GAMES[Math.floor((i * BOARD_GAMES.length) / 3)]);

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

export default function Home() {
  return (
    <main>
      <section className="hero" id="play">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className="hero-title">เว็บไซต์ของ STAYGO Channel</h1>
              <p className="hero-subtitle">เกมเล่นบนเว็บ & เครื่องมือช่วยเล่นเกม</p>
              
              <div className="hero-actions">
                <Link href="/games" className="button button-primary button-lg">▶ เล่นเกม</Link>
              </div>

              <Link href="/how-to-play/random/" className="hero-pick">
                <span className="hero-pick-dice" aria-hidden="true">🎲</span>
                <span className="hero-pick-text">
                  <span className="hero-pick-kicker">ไม่รู้จะเล่นอะไร?</span>
                  <strong className="hero-pick-title">สุ่มบอร์ดเกมคืนนี้เลย!</strong>
                  <span className="hero-pick-sub">เลือกจาก {BOARD_GAMES.length} เกมที่เคยลงคลิปในช่อง</span>
                </span>
                <span className="hero-pick-thumbs" aria-hidden="true">
                  {PICK_THUMBS.map((g) => (
                    <img key={g.slug} src={`https://i.ytimg.com/vi/${g.videos[0].id}/mqdefault.jpg`} alt="" />
                  ))}
                </span>
                <span className="hero-pick-go" aria-hidden="true">→</span>
              </Link>
            </div>
            
            <div className="hero-illustration">
              <img src="/assets/image/header-img.png" alt="Header Image"/>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-light" id="tools">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">เครื่องมือช่วยเล่นเกม</h2>
            <Link href="/tools/" className="link-more">ดูทั้งหมด ({TOOLS.length}) →</Link>
          </div>

          <div className="tools-grid">
            {TOOLS.slice(0, HOME_TOOL_LIMIT).map((tool) => (
              <a key={tool.href} href={tool.href} className="tool-button">
                <div className="tool-icon">{tool.icon}</div>
                {tool.isNew && <span className="tool-new">ใหม่</span>}
                <span className="tool-label">{tool.label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="games">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">เกมเล่นบนเว็บ</h2>
            <Link href="/games/" className="link-more">ดูทั้งหมด ({WEB_GAMES.length}) →</Link>
          </div>

          <div className="game-grid">
            {WEB_GAMES.slice(0, HOME_GAME_LIMIT).map((game) => (
              <WebGameCard key={game.href} game={game} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section-light" id="partners">
        <div className="container">
          <h2 className="section-title">พาร์ทเนอร์ของเรา</h2>
          
          <div className="partners-grid">
            <div className="partner-card">
              <div className="partner-logo">
                <img src="/assets/image/siamboard-logo.webp" alt="Siamboardgames" />
              </div>
              <h3 className="partner-name">Siamboardgames</h3>
              <div className="partner-code">
                <span className="partner-code-label">ใช้โค้ด ส่วนลด 5%:</span>
                <span className="partner-code-value">SIAMSTG</span>
              </div>
              <a href="https://siamboardgames.com/" target="_blank" rel="noopener noreferrer" className="button button-primary button-md">
                เยี่ยมชมเว็บไซต์
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="watch">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">คลิปล่าสุดจากช่อง</h2>
            <Link href="/watch/" className="link-more">ดูทุกรายการ →</Link>
          </div>

          <LatestClip />

          <h3 className="yt-section-title">รายการจากช่อง STAYGO</h3>
          <PlaylistTabs tabs={TABS} />

          <p className="yt-more-links">
            <Link href="/how-to-play/" className="link-more">ดูวิธีเล่นบอร์ดเกมทั้งหมด ({BOARD_GAMES.length}) →</Link>
            <Link href="/how-to-play/random/" className="link-more">🎲 สุ่มบอร์ดเกมที่จะเล่นคืนนี้ →</Link>
          </p>
        </div>
      </section>
    </main>
  );
}

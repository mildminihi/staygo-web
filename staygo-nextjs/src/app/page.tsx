import Link from 'next/link';
import WebGameCard from '@/components/WebGameCard';
import { HOME_GAME_LIMIT, WEB_GAMES } from '@/data/webGames';
import { HOME_TOOL_LIMIT, TOOLS } from '@/data/tools';

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
                <a href="/tools/host-tools/" className="button button-secondary button-lg">🔧​ เครื่องมือสำหรับโฮสต์เกม</a>
              </div>
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
          <h2 className="section-title">คลิปวีดีโอของทางช่อง</h2>
          
          <div className="watch-hero">
            <div className="watch-illustration">
              <iframe 
                width="560" 
                height="315" 
                src="https://www.youtube.com/embed/2tUUn1ywX80?si=w8qAOuBIVbpFLN1T" 
                title="YouTube video player" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                referrerPolicy="strict-origin-when-cross-origin" 
                allowFullScreen
              ></iframe>
            </div>
            <div className="watch-content">
              <p className="watch-description">ฝากกดไลค์ กดติดตามพวกเรา STAYGO ด้วยนะครับ</p>
              <a href="https://www.youtube.com/@STAYGO" target="_blank" rel="noopener noreferrer" className="button button-primary button-lg">▶ ดูวิดีโอทั้งหมด</a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

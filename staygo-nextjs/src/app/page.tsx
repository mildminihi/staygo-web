import Link from 'next/link';

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
          <h2 className="section-title">เครื่องมือช่วยเล่นเกม</h2>
          
          <div className="tools-grid">
            <a href="/tools/dice/" className="tool-button">
              <div className="tool-icon">🎲</div>
              <span className="tool-label">ทอยลูกเต๋า</span>
            </a>
            
            <a href="/tools/timer/" className="tool-button">
              <div className="tool-icon">⏱️</div>
              <span className="tool-label">นับเวลาถอยหลัง/จับเวลา</span>
            </a>
            
            <a href="/tools/team-randomizer/" className="tool-button">
              <div className="tool-icon">💡</div>
              <span className="tool-label">สุ่มทีม</span>
            </a>
            
            <a href="/tools/scoreboard/" className="tool-button">
              <div className="tool-icon">📊</div>
              <span className="tool-label">ตารางคะแนน</span>
            </a>
            
            <a href="/tools/tournament-bracket/" className="tool-button">
              <div className="tool-icon">🏆</div>
              <span className="tool-label">จัดสายการแข่งขัน</span>
            </a>
            
            <a href="/tools/competition-timer/" className="tool-button">
              <div className="tool-icon">⏱️</div>
              <span className="tool-label">จับเวลาสำหรับแข่ง</span>
            </a>
            
            <a href="/tools/lucky-draw/" className="tool-button">
              <div className="tool-icon">🎲</div>
              <span className="tool-label">จับสลาก</span>
            </a>
            
            <a href="/tools/host-tools/" className="tool-button">
              <div className="tool-icon">🎮</div>
              <span className="tool-label">Host Tools</span>
            </a>
          </div>
        </div>
      </section>

      <section className="section" id="games">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">เกมเล่นบนเว็บ</h2>
            <Link href="/games" className="link-more">ดูทั้งหมด →</Link>
          </div>

          <div className="game-grid">
            <article className="game-card">
              <div className="game-thumbnail game-thumbnail-hover">
                <img src="/assets/image/reveal-cover-1.png" alt="Guess the Picture" className="thumbnail-default" />
                <img src="/assets/image/reveal-cover-2.png" alt="Guess the Picture" className="thumbnail-hover" />
              </div>
              <div className="game-info">
                <h3 className="game-title">เปิดแผ่นป้ายทายภาพ</h3>
                <p className="game-meta">เปิดแผ่นป้ายทีละช่องเพื่อทายภาพ</p>
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
                <p className="game-meta">ตอบคำถาม 4 ข้อติดเพื่อชนะ</p>
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
                <p className="game-meta">จับคู่อีโมจิให้ถูกต้อง</p>
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
                <p className="game-meta">ทอยเต๋าผจญภัยใน Dungeon</p>
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
                <p className="game-meta">ทายตัวเลขลับภายใน 8 ครั้ง</p>
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
                <p className="game-meta">เลือกแผ่นป้ายและทอยเต๋าเพื่อเก็บแต้ม</p>
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
                <p className="game-meta">สุ่มฮีโร่ ลุยดันเจี้ยนแบบ auto-battle</p>
                <div className="game-actions">
                  <a href="/games/dungeon-ledger/" className="button button-primary button-md">เล่นเกม</a>
                </div>
              </div>
            </article>
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

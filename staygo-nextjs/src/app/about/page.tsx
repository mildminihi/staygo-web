import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'เกี่ยวกับเรา - STAYGO',
  description: 'ทำความรู้จักกับ STAYGO Channel และวัตถุประสงค์ของเว็บไซต์นี้',
  icons: {
    icon: '/games/reveal-board/staygo-logo.png',
    shortcut: '/games/reveal-board/staygo-logo.png',
    apple: '/games/reveal-board/staygo-logo.png',
  },
  openGraph: {
    title: 'เกี่ยวกับเรา - STAYGO',
    description: 'ทำความรู้จักกับ STAYGO Channel และวัตถุประสงค์ของเว็บไซต์นี้',
    url: 'https://staygoch.com/about/',
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

export default function AboutPage() {
  return (
    <main>
      {/* Hero Section */}
      <section className="about-hero">
        <div className="container">
          <div className="about-hero-content">
            <h1 className="about-hero-title">ยินดีต้อนรับสู่ Website STAYGO</h1>
            <p className="about-hero-subtitle">Website ที่รวบรวมเกมเล่นบนเว็บและเครื่องมือช่วยเหลือในการเล่นปาร์ตี้เกม</p>
          </div>
        </div>
      </section>

      {/* About Content */}
      <section className="section about-content">
        <div className="container">
          <div className="about-sections">
            {/* About Us Section */}
            <div className="about-section">
              <h2 className="about-section-title">เกี่ยวกับเรา</h2>
              <div className="about-section-content">
                <p>STAYGO เป็น Channel YouTube ที่สร้างขึ้นจากการรวมตัวของกลุ่มเพื่อนๆสมัยมัธยมที่เรียนโรงเรียนหอวังด้วยกัน หลังจากเรียนจบจนแยกย้ายเข้ามหาลัยไปแล้ว วันหนึ่งได้นัดกันมาเล่นบอร์ดเกมและเกิดการชอบในการเล่นบอร์ดเกมจนเป็นที่มาของ STAYGO Channel</p>
                <p>นอกจากการรีวิวและแนะนำเกมบน YouTube แล้วเรายังพัฒนาเว็บไซต์นี้ขึ้นมาเพื่อเป็นเครื่องมือช่วยเหลือในการเล่นเกม รวมถึงเกมปาร์ตี้ที่สามารถเล่นได้ฟรีผ่านเว็บเบราว์เซอร์ เพื่อให้ทุกคนสามารถเข้าถึงความสนุกได้ง่ายๆ</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="section section-light">
        <div className="container">
          <h2 className="section-title">ติดตามเรา</h2>
          <p className="about-contact-subtitle">ติดตามเนื้อหาและอัพเดทล่าสุดจากเราได้ที่</p>
          
          <div className="contact-cards">
            <a href="https://www.youtube.com/@STAYGO" target="_blank" rel="noopener noreferrer" className="contact-card">
              <div className="contact-card-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path>
                  <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon>
                </svg>
              </div>
              <h3 className="contact-card-title">YouTube</h3>
              <p className="contact-card-description">ช่องรวมความบันเทิงของกลุ่มเพื่อน</p>
              <span className="contact-card-link">ดูช่องของเรา →</span>
            </a>

            <a href="https://facebook.com/STAYG0" target="_blank" rel="noopener noreferrer" className="contact-card">
              <div className="contact-card-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </div>
              <h3 className="contact-card-title">Facebook</h3>
              <p className="contact-card-description">โพสต์ประกาศและเนื้อหาต่างๆ</p>
              <span className="contact-card-link">เยี่ยมชมเพจของเรา →</span>
            </a>

            <a href="https://instagram.com/staygo.official" target="_blank" rel="noopener noreferrer" className="contact-card">
              <div className="contact-card-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
                </svg>
              </div>
              <h3 className="contact-card-title">Instagram</h3>
              <p className="contact-card-description">รูปภาพและไฮไลท์</p>
              <span className="contact-card-link">ติดตามเรา →</span>
            </a>

            <a href="https://tiktok.com/@staygo.official" target="_blank" rel="noopener noreferrer" className="contact-card">
              <div className="contact-card-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                </svg>
              </div>
              <h3 className="contact-card-title">TikTok</h3>
              <p className="contact-card-description">คลิปสั้นสนุกๆ</p>
              <span className="contact-card-link">เข้าชม →</span>
            </a>

            <a href="https://twitch.tv/staygogamming" target="_blank" rel="noopener noreferrer" className="contact-card">
              <div className="contact-card-icon">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
                </svg>
              </div>
              <h3 className="contact-card-title">Twitch</h3>
              <p className="contact-card-description">สตรีมสด</p>
              <span className="contact-card-link">ดูการสตรีม →</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}


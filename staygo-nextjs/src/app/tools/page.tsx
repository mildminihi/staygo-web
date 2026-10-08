import type { Metadata } from 'next';
import { TOOLS } from '@/data/tools';

export const metadata: Metadata = {
  title: 'เครื่องมือช่วยเล่นเกมทั้งหมด - STAYGO',
  description: 'รวมเครื่องมือช่วยเล่นเกมฟรีบนเว็บ ทอยลูกเต๋า จับเวลา สุ่มทีม ตารางคะแนน จัดสายการแข่งขัน จับสลาก ไวท์บอร์ด และอื่นๆ',
  keywords: 'เครื่องมือเล่นเกม, ทอยลูกเต๋าออนไลน์, จับเวลา, สุ่มทีม, ตารางคะแนน, จับสลาก, Board Game Tools',
  icons: {
    icon: '/games/reveal-board/staygo-logo.png',
    shortcut: '/games/reveal-board/staygo-logo.png',
    apple: '/games/reveal-board/staygo-logo.png',
  },
  openGraph: {
    title: 'เครื่องมือช่วยเล่นเกมทั้งหมด - STAYGO',
    description: 'รวมเครื่องมือช่วยเล่นเกมฟรีบนเว็บ',
    url: 'https://staygoch.com/tools/',
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

export default function ToolsPage() {
  return (
    <main>
      <section className="section">
        <div className="container">
          <div className="section-header" style={{ textAlign: 'center', marginBottom: '48px', flexDirection: 'column' }}>
            <h1 className="section-title" style={{ fontSize: '40px', marginBottom: '16px' }}>🔧 เครื่องมือทั้งหมด</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '18px', margin: 0 }}>เครื่องมือช่วยเล่นเกมและจัดกิจกรรม ใช้ฟรีบนเว็บ</p>
          </div>

          <div className="tools-grid">
            {TOOLS.map((tool) => (
              <a key={tool.href} href={tool.href} className="tool-button">
                <div className="tool-icon">{tool.icon}</div>
                <span className="tool-label">{tool.label}</span>
                <span className="tool-description">{tool.description}</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

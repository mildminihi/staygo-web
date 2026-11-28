import type { Metadata } from 'next';
import ToolButton from '@/components/ToolButton';
import { TOOL_CATEGORIES, TOOLS } from '@/data/tools';

export const metadata: Metadata = {
  alternates: { canonical: '/tools/' },
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
    url: 'https://www.staygoch.com/tools/',
    images: [
      {
        url: 'https://www.staygoch.com/assets/image/share/page-tools.jpg',
        width: 1200,
        height: 630,
        alt: 'เครื่องมือช่วยเล่นเกม',
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

          {TOOL_CATEGORIES.map((cat) => {
            const tools = TOOLS.filter((t) => t.category === cat.id);
            return (
              <div key={cat.id} className="category-block" id={cat.id}>
                <div className="category-head">
                  <h2 className="category-title">
                    {cat.icon} {cat.title}
                    <span className="category-count">({tools.length})</span>
                  </h2>
                  <p className="category-subtitle">{cat.subtitle}</p>
                </div>
                <div className="tools-grid">
                  {tools.map((tool) => (
                    <ToolButton key={tool.href} tool={tool} showDescription />
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

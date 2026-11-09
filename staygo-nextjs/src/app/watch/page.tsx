import type { Metadata } from 'next';
import Link from 'next/link';
import LatestClip from '@/components/LatestClip';
import VideoCard from '@/components/VideoCard';
import { SERIES, YT, listUrl } from '@/data/youtube';

export const metadata: Metadata = {
  title: 'ดูคลิป STAYGO ทุกรายการ | STAYGO',
  description: 'รวมคลิปจากช่อง STAYGO: บอร์ดเกม แก๊งซ่า Challenge สะแตกโก เอาวะลองดู และอีกมากมาย อัปเดตคลิปใหม่ทุกสัปดาห์',
  alternates: { canonical: 'https://staygoch.com/watch/' },
};

export default function WatchPage() {
  return (
    <main>
      <section className="section">
        <div className="container">
          <div className="section-header">
            <h1 className="section-title">📺 ดูคลิป STAYGO</h1>
            <a href="https://www.youtube.com/@STAYGO?sub_confirmation=1" target="_blank" rel="noopener noreferrer" className="link-more">
              🔔 ติดตามช่อง →
            </a>
          </div>

          <LatestClip />

          {SERIES.map((s) => (
            <section key={s.key} className="yt-row" id={s.key}>
              <div className="yt-row-head">
                <div>
                  <h2 className="yt-row-title">{s.emoji} {s.name}</h2>
                  <p className="yt-tagline">{s.tagline}</p>
                </div>
                <a href={listUrl(s.id)} target="_blank" rel="noopener noreferrer" className="link-more">
                  ดูทั้งหมดบน YouTube{YT.source === 'api' && s.data.total ? ` (${s.data.total})` : ''} →
                </a>
              </div>
              <div className="yt-scroller">
                {s.data.videos.map((v) => (
                  <VideoCard key={v.id} video={v} list={s.id} />
                ))}
              </div>
              {s.key === 'boardgame' && (
                <Link href="/how-to-play/" className="link-more yt-row-extra">อ่านวิธีเล่นบอร์ดเกมแบบสรุป →</Link>
              )}
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}

import Link from 'next/link';
import { LATEST, YT, boardGameFor, seriesOf, shortTitle, thaiDate } from '@/data/youtube';

const SUBSCRIBE_URL = 'https://www.youtube.com/@STAYGO?sub_confirmation=1';

/** Newest long video on the channel, embedded. Updates on every build. */
export default function LatestClip() {
  if (!LATEST) return null;
  const series = seriesOf(LATEST.id);
  const game = boardGameFor(LATEST.id);
  return (
    <div className="watch-hero">
      <div className="watch-illustration">
        <iframe
          width="560"
          height="315"
          src={`https://www.youtube-nocookie.com/embed/${LATEST.id}`}
          title={`${LATEST.title}`}
          frameBorder="0"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        ></iframe>
      </div>
      <div className="watch-content">
        <span className="watch-eyebrow">
          คลิปใหม่ล่าสุด{series ? ` · ${series.emoji} ${series.name}` : ''}
        </span>
        <h3 className="watch-title">{shortTitle(LATEST.title)}</h3>
        {YT.source === 'api' && <p className="watch-description">ลงเมื่อ {thaiDate(LATEST.publishedAt)}</p>}
        <div className="watch-actions">
          <a href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer" className="button button-lg htp-btn-youtube">🔔 ติดตามช่อง</a>
          <a href="https://www.youtube.com/@STAYGO/videos" target="_blank" rel="noopener noreferrer" className="button button-outline button-lg">▶ ดูวิดีโอทั้งหมด</a>
        </div>
        {game && (
          <Link href={`/how-to-play/${game.slug}/`} className="link-more">อ่านวิธีเล่น {game.name} →</Link>
        )}
      </div>
    </div>
  );
}

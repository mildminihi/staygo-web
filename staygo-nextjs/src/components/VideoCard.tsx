import { YT, shortTitle, thaiDate, thumb, watchUrl, type Video } from '@/data/youtube';

export default function VideoCard({ video, list, badge }: { video: Video; list?: string; badge?: string }) {
  return (
    <a href={watchUrl(video.id, list)} target="_blank" rel="noopener noreferrer" className="yt-card">
      <div className="yt-thumb">
        <img src={thumb(video.id)} alt="" loading="lazy" width={320} height={180} />
        <span className="yt-play" aria-hidden="true">▶</span>
        {badge && <span className="yt-badge">{badge}</span>}
      </div>
      <div className="yt-card-body">
        <h3 className="yt-card-title">{shortTitle(video.title)}</h3>
        {/* the starter snapshot only has rough dates; show them once real API data is in */}
        {YT.source === 'api' && <p className="yt-card-date">{thaiDate(video.publishedAt)}</p>}
      </div>
    </a>
  );
}

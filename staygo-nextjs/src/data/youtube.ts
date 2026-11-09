// คลิปจากช่อง STAYGO ที่ดึงมาตอน build (scripts/fetch-youtube.mjs → youtube.json)
import data from './youtube.json';
import { BOARD_GAMES } from './boardgames';
import { PLAYLISTS, type PlaylistInfo } from './playlists';

export type Video = { id: string; title: string; publishedAt: string };
export type PlaylistData = { id: string; total: number; videos: Video[] };

export const YT = data as {
  updatedAt: string;
  source: 'api' | 'snapshot';
  latest: Video[];
  playlists: Record<string, PlaylistData>;
};

export const LATEST = YT.latest[0];

export const thumb = (id: string, size: 'mq' | 'hq' = 'mq') => `https://i.ytimg.com/vi/${id}/${size}default.jpg`;
export const watchUrl = (id: string, list?: string) =>
  `https://www.youtube.com/watch?v=${id}${list ? `&list=${list}` : ''}`;

/** "เก็บเพชร เรียงแต้ม | PZZLE | STAYgo Boardgame" → "เก็บเพชร เรียงแต้ม | PZZLE" */
export function shortTitle(title: string) {
  const parts = title.split('|').map((s) => s.trim()).filter(Boolean);
  if (parts.length > 1 && /stay\s*go/i.test(parts[parts.length - 1])) parts.pop();
  return parts.join(' | ');
}

const TH_MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
export function thaiDate(iso: string) {
  const d = new Date(iso);
  return `${d.getUTCDate()} ${TH_MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear() + 543}`;
}

/** Which promoted playlist a video belongs to (first match in PLAYLISTS order). */
export function seriesOf(videoId: string): PlaylistInfo | undefined {
  return PLAYLISTS.find((p) => YT.playlists[p.key]?.videos.some((v) => v.id === videoId));
}

/** How-to-play page for a board game clip, if we have one. */
export function boardGameFor(videoId: string) {
  return BOARD_GAMES.find((g) => g.videos.some((v) => v.id === videoId));
}

/** Playlists that have videos, in the order of PLAYLISTS. */
export const SERIES = PLAYLISTS.map((p) => ({ ...p, data: YT.playlists[p.key] })).filter((p) => p.data?.videos.length);

const listUrl = (id: string) => `https://www.youtube.com/playlist?list=${id}`;

/** Tabs for the homepage: newest uploads first, then each playlist. */
export function channelTabs() {
  return [
    {
      key: 'latest',
      label: '🆕 ล่าสุด',
      tagline: 'คลิปใหม่ทุกรายการจากช่อง',
      listUrl: 'https://www.youtube.com/@STAYGO/videos',
      videos: YT.latest.slice(1),
      badges: Object.fromEntries(
        YT.latest.map((v) => [v.id, seriesOf(v.id)]).filter(([, s]) => s).map(([id, s]) => [id, `${(s as PlaylistInfo).emoji} ${(s as PlaylistInfo).name}`]),
      ) as Record<string, string>,
    },
    ...SERIES.map((s) => ({
      key: s.key,
      label: `${s.emoji} ${s.name}`,
      tagline: s.tagline,
      list: s.id,
      listUrl: listUrl(s.id),
      videos: s.data.videos,
    })),
  ];
}
export { listUrl };

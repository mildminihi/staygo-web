// Runs before `next build` (npm "prebuild"). With YOUTUBE_API_KEY set, it fetches the latest
// videos for the channel and every playlist in src/data/playlists.ts and rewrites
// src/data/youtube.json. Without a key, or if YouTube fails, it keeps the existing file
// so the build never breaks.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(root, "src/data/youtube.json");
const KEY = process.env.YOUTUBE_API_KEY;
const PER_LIST = 12;

function readConfig() {
  // playlists.ts is TypeScript; pull the ids out with a regex instead of compiling it.
  const src = fs.readFileSync(path.join(root, "src/data/playlists.ts"), "utf8");
  const channel = src.match(/CHANNEL_ID = '([^']+)'/)[1];
  const lists = [...src.matchAll(/\{ key: '([^']+)', id: '([^']+)'/g)].map((m) => ({ key: m[1], id: m[2] }));
  return { channel, lists };
}

async function api(endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  for (const [k, v] of Object.entries({ ...params, key: KEY })) url.searchParams.set(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${endpoint} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

const toVideo = (it) => ({
  id: it.contentDetails.videoId,
  title: it.snippet.title,
  publishedAt: it.contentDetails.videoPublishedAt || it.snippet.publishedAt,
});
const visible = (it) => it.contentDetails.videoPublishedAt && !/^(Private|Deleted) video$/.test(it.snippet.title);

/** All items of a playlist, newest first (playlist order can be oldest first). */
async function playlistVideos(id, maxPages = 10) {
  const items = [];
  let pageToken = "";
  let total = 0;
  for (let i = 0; i < maxPages; i++) {
    const r = await api("playlistItems", { part: "snippet,contentDetails", playlistId: id, maxResults: "50", ...(pageToken && { pageToken }) });
    total = r.pageInfo?.totalResults ?? total;
    items.push(...r.items.filter(visible).map(toVideo));
    pageToken = r.nextPageToken;
    if (!pageToken) break;
  }
  items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return { total, videos: items };
}

/** Latest long uploads. UULF (long videos only) first; if YouTube rejects it, use all uploads minus Shorts. */
async function latestUploads(channel) {
  try {
    const r = await api("playlistItems", { part: "snippet,contentDetails", playlistId: "UULF" + channel.slice(2), maxResults: String(PER_LIST) });
    return r.items.filter(visible).map(toVideo);
  } catch (e) {
    console.warn("[youtube] UULF not available, filtering Shorts by length:", e.message);
    const r = await api("playlistItems", { part: "snippet,contentDetails", playlistId: "UU" + channel.slice(2), maxResults: "50" });
    const vids = r.items.filter(visible).map(toVideo);
    const d = await api("videos", { part: "contentDetails", id: vids.map((v) => v.id).join(",") });
    const secs = Object.fromEntries(d.items.map((x) => [x.id, isoSeconds(x.contentDetails.duration)]));
    return vids.filter((v) => (secs[v.id] ?? 0) > 180).slice(0, PER_LIST);
  }
}
function isoSeconds(iso) {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/) || [];
  return (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0);
}

async function main() {
  if (!KEY) {
    console.log("[youtube] no YOUTUBE_API_KEY, keeping existing youtube.json");
    return;
  }
  const { channel, lists } = readConfig();
  const out = { updatedAt: new Date().toISOString(), source: "api", latest: await latestUploads(channel), playlists: {} };
  for (const l of lists) {
    const { total, videos } = await playlistVideos(l.id);
    out.playlists[l.key] = { id: l.id, total, videos: videos.slice(0, PER_LIST) };
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`[youtube] updated: latest "${out.latest[0]?.title}", ${lists.length} playlists`);
}

main().catch((e) => {
  console.warn("[youtube] fetch failed, keeping existing youtube.json:", e.message);
});

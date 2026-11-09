'use client';

import { useState } from 'react';
import VideoCard from './VideoCard';
import type { Video } from '@/data/youtube';

export type Tab = { key: string; label: string; tagline?: string; list?: string; listUrl?: string; videos: Video[]; badges?: Record<string, string> };

/** Tabs: "ล่าสุด" + one per playlist, each showing its newest few clips. */
export default function PlaylistTabs({ tabs, perTab = 4 }: { tabs: Tab[]; perTab?: number }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const tab = tabs.find((t) => t.key === active) ?? tabs[0];
  if (!tab) return null;
  return (
    <div className="yt-tabs">
      <div className="yt-tablist" role="tablist" aria-label="รายการจากช่อง">
        {tabs.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={t.key === tab.key}
            className={`yt-tab${t.key === tab.key ? ' active' : ''}`}
            onClick={() => setActive(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        <div className="yt-tab-head">
          {tab.tagline && <p className="yt-tagline">{tab.tagline}</p>}
          {tab.listUrl && (
            <a href={tab.listUrl} target="_blank" rel="noopener noreferrer" className="link-more">ดูทั้งเพลย์ลิสต์บน YouTube →</a>
          )}
        </div>
        <div className="yt-grid">
          {tab.videos.slice(0, perTab).map((v) => (
            <VideoCard key={v.id} video={v} list={tab.list} badge={tab.badges?.[v.id]} />
          ))}
        </div>
      </div>
    </div>
  );
}

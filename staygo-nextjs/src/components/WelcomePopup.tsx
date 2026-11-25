'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export type WelcomeClip = { id: string; title: string; views?: number };

const SUBSCRIBE_URL = 'https://www.youtube.com/@STAYGO?sub_confirmation=1';
const HIDE_KEY = 'staygo-welcome-hide'; // localStorage: the date the visitor chose "not today"
const CLOSED_KEY = 'staygo-welcome-closed'; // sessionStorage: closed during this visit
const DELAY_MS = 1500;

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const read = (s: () => Storage, k: string) => { try { return s().getItem(k); } catch { return null; } };
const write = (s: () => Storage, k: string, v: string) => { try { s().setItem(k, v); } catch {} };
const views = (n: number) => new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

function track(action: string, clip?: WelcomeClip) {
  const g = (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag;
  if (typeof g === 'function') g('event', 'welcome_popup', { popup_action: action, clip_id: clip?.id });
}

/**
 * Homepage popup: thanks the visitor and asks them to follow the STAYGO channel, with one of the
 * channel's most-viewed clips. "Close" hides it for this visit, "not today" until tomorrow.
 * It waits for the cookie banner to be answered so the two never stack.
 */
export default function WelcomePopup({ clips, popular }: { clips: WelcomeClip[]; popular: boolean }) {
  const [clip, setClip] = useState<WelcomeClip | null>(null);
  const subRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!clips.length) return;
    if (read(() => localStorage, HIDE_KEY) === today() || read(() => sessionStorage, CLOSED_KEY)) return;
    let timer = 0;
    const startedAt = Date.now();
    const tick = () => {
      if (document.getElementById('staygo-consent') || Date.now() - startedAt < DELAY_MS) {
        timer = window.setTimeout(tick, 400);
        return;
      }
      const c = clips[Math.floor(Math.random() * clips.length)];
      setClip(c);
      track('shown', c);
    };
    timer = window.setTimeout(tick, 400);
    return () => clearTimeout(timer);
  }, [clips]);

  const close = useCallback((action: 'close' | 'hide_today') => {
    if (action === 'hide_today') write(() => localStorage, HIDE_KEY, today());
    write(() => sessionStorage, CLOSED_KEY, '1');
    track(action, clip ?? undefined);
    setClip(null);
  }, [clip]);

  useEffect(() => {
    if (!clip) return;
    subRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close('close'); };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [clip, close]);

  if (!clip) return null;
  return (
    <div className="wp-backdrop" onClick={() => close('close')}>
      <div className="wp-card" role="dialog" aria-modal="true" aria-labelledby="wp-title" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="wp-x" aria-label="ปิด" onClick={() => close('close')}>✕</button>

        <div className="wp-head">
          <span className="wp-logo"><img src="/assets/image/staygo-logo.png" alt="STAYGO" /><span className="wp-wave" aria-hidden="true">👋</span></span>
          <h2 id="wp-title" className="wp-title">ขอบคุณที่แวะมาเล่นนะ!</h2>
          <p className="wp-text">ถ้าชอบเว็บนี้ ฝากกดติดตามช่อง STAYGO ด้วยนะครับ 🙏</p>
        </div>

        <a
          className="wp-clip"
          href={`https://www.youtube.com/watch?v=${clip.id}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track('clip', clip)}
        >
          <span className="wp-thumb">
            <img src={`https://i.ytimg.com/vi/${clip.id}/hqdefault.jpg`} alt="" />
            <span className="wp-play" aria-hidden="true">▶</span>
            {popular && clip.views ? <span className="wp-views">{`${views(clip.views)} วิว`}</span> : null}
          </span>
          <span className="wp-cliptext">
            <span className="wp-kicker">{popular ? '🔥 คลิปยอดฮิตของช่อง' : '🆕 คลิปล่าสุดของช่อง'}</span>
            <span className="wp-cliptitle" data-i18n-skip>{clip.title}</span>
          </span>
        </a>

        <a
          ref={subRef}
          className="button button-lg htp-btn-youtube wp-sub"
          href={SUBSCRIBE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => { track('subscribe', clip); close('close'); }}
        >
          🔔 ติดตามช่อง STAYGO
        </a>

        <div className="wp-foot">
          <button type="button" onClick={() => close('hide_today')}>ไม่ต้องแสดงอีกวันนี้</button>
          <button type="button" onClick={() => close('close')}>ปิด</button>
        </div>
      </div>
    </div>
  );
}

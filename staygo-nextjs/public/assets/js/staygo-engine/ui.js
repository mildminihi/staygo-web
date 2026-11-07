// Small rendering helpers shared by STAYGO! online and ลุ้นจั่ว. Pairs with /assets/css/staygo-cards.css.
import { LETTERS, POWER_NAMES } from "./engine.js";

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** HTML for one card. opts: { tag: "div"|"button", cls, attrs, sub: false to hide power name, width } */
export function cardHTML(card, opts = {}) {
  const tag = opts.tag || "div";
  const style = opts.width ? ` style="--card-w:${opts.width}px"` : "";
  const extra = (opts.cls ? " " + opts.cls : "") ;
  const attrs = opts.attrs || "";
  const showSub = opts.sub !== false;
  if (!card) {
    return `<${tag} class="sg-card back${extra}"${style} ${attrs}><span class="sg-big">STAYGO</span></${tag}>`;
  }
  if (card.k === "L") {
    const sub = showSub ? `<span class="sg-sub">${POWER_NAMES[card.l]}</span>` : "";
    return `<${tag} class="sg-card k-L${extra}" data-l="${card.l}"${style} ${attrs} aria-label="${card.l} ${POWER_NAMES[card.l]}"><span class="sg-big">${card.l}</span>${sub}</${tag}>`;
  }
  if (card.k === "W") {
    const sub = showSub ? `<span class="sg-sub">ตัวไหนก็ได้</span>` : "";
    return `<${tag} class="sg-card k-W${extra}"${style} ${attrs} aria-label="STAYGO wild"><span class="sg-big">STAYGO</span>${sub}</${tag}>`;
  }
  if (card.k === "STAY") {
    const sub = showSub ? `<span class="sg-sub">ข้ามเทิร์น</span>` : "";
    return `<${tag} class="sg-card k-STAY${extra}"${style} ${attrs} aria-label="STAY"><span class="sg-big">STAY</span>${sub}</${tag}>`;
  }
  const sub = showSub ? `<span class="sg-sub">ส่งมือซ้าย</span>` : "";
  return `<${tag} class="sg-card k-GO${extra}"${style} ${attrs} aria-label="GO!"><span class="sg-big">GO!</span>${sub}</${tag}>`;
}

/** STAYGO! row: cards in order S→O. Empty slots show the letter they need; the next one is outlined. */
export function rowHTML(row, opts = {}) {
  const r = row || [];
  return `<div class="sg-row"${opts.style ? ` style="${opts.style}"` : ""}>${LETTERS.map((l, i) => {
    const c = r[i];
    if (c) return `<div class="sg-pill on${c.k === "W" ? " wild" : ""}" data-l="${l}">${l}</div>`;
    return `<div class="sg-pill${i === r.length && opts.markNext ? " next" : ""}">${l}</div>`;
  }).join("")}</div>`;
}

/** ลุ้นจั่ว bank: set of letters, any order. */
export function bankHTML(bank, opts = {}) {
  const have = new Set(bank || []);
  const fresh = new Set(opts.fresh || []);
  return `<div class="sg-row"${opts.style ? ` style="${opts.style}"` : ""}>${LETTERS.map(
    (l) => `<div class="sg-pill${have.has(l) ? " on" : ""}${fresh.has(l) ? " fresh" : ""}" data-l="${l}">${l}</div>`,
  ).join("")}</div>`;
}

export function toast(text, ms = 2600) {
  const el = document.createElement("div");
  el.className = "sg-toast";
  el.setAttribute("role", "status");
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

export function formatDuration(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(s / 60);
  return m ? `${m} นาที ${s % 60} วินาที` : `${s} วินาที`;
}

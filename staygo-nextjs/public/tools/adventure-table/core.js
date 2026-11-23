// Shared state and helpers for โต๊ะผจญภัย (host = GM screen, players = character sheets on phones,
// screen = read-only display for a TV / stream).
//
// live/{CODE}            readable by everyone in the room
//   state                GM only: sys (stat system), scene, init (turn order), req (roll request),
//                        mons (what players may see of the monsters), showMonHp
//   players/{uid}        that player (or the GM): name, online, c = character sheet
//   rolls/{id}           public dice log; each player adds their own rolls
// liveRoles/{CODE}/host  GM only: monsters with real HP, notes, hidden DCs
// liveRoles/{CODE}/{uid} that player + GM: msgs (handouts from the GM)
// liveInbox/{CODE}/{id}  secret rolls: written by the roller, read by the GM only
import * as L from "/assets/js/live-room.js";
import { SYSTEMS } from "./data.js";
import { roll, breakdown, fmtMod } from "./dice.js";

export { L, roll, breakdown, fmtMod };
export const { $, esc, toast } = L;
export const KIND = "adventure";

export const S = {
  code: null,
  role: null, // "gm" | "player" | "screen"
  room: null,
  priv: null, // liveRoles/{code}/host (GM) or liveRoles/{code}/{uid} (player)
  inbox: null, // GM: secret rolls
};

export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
export const list = (obj) => Object.entries(obj || {}).map(([id, v]) => ({ id, ...v }));
export const clean = (o) => JSON.parse(JSON.stringify(o));
export const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const num = (v, d = 0) => (Number.isFinite(+v) && String(v).trim() !== "" ? Math.round(+v) : d);

// ---------------------------------------------------------------- rules
export const sys = () => S.room?.state?.sys || SYSTEMS.classic;
export const isSimple = () => sys().mode === "simple";
export const defaultScore = () => (isSimple() ? 0 : 10);
export const modOf = (v) => (isSimple() ? num(v, 0) : Math.floor((num(v, 10) - 10) / 2));
export const statMod = (c, k) => modOf(c?.stats?.[k] ?? defaultScore());
export const statLabel = (k) => sys().stats.find((s) => s.k === k)?.label || k;

/** Players in join order, with their sheet (c) when they have made one. */
export const players = () =>
  list(S.room?.players)
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
export const heroes = () => players().filter((p) => p.c);

export function monsterStatus(hp, max) {
  if (hp <= 0) return "ล้มแล้ว 💀";
  const r = hp / Math.max(1, max);
  if (r < 0.25) return "ใกล้ตาย";
  if (r < 0.5) return "บาดเจ็บหนัก";
  if (r < 1) return "บาดเจ็บ";
  return "สภาพดี";
}

// ---------------------------------------------------------------- shared HTML
export function hpBar(cur, max, tmp = 0, { big = false, label = true } = {}) {
  cur = num(cur, 0);
  max = Math.max(1, num(max, 1));
  tmp = num(tmp, 0);
  const pct = clamp((cur / max) * 100, 0, 100);
  const tpct = clamp((tmp / max) * 100, 0, 100 - pct);
  const tone = cur <= 0 ? "dead" : pct < 25 ? "low" : pct < 50 ? "mid" : "ok";
  return `<div class="at-hp ${tone}${big ? " big" : ""}">
    <div class="at-hpfill" style="width:${pct}%"></div><div class="at-hptmp" style="left:${pct}%;width:${tpct}%"></div>
    ${label ? `<span>${cur <= 0 ? "💀 " : "❤️ "}${cur}/${max}${tmp ? ` <small>+${tmp}</small>` : ""}</span>` : ""}</div>`;
}
export function statusBar(text, ratio) {
  const tone = ratio <= 0 ? "dead" : ratio < 0.25 ? "low" : ratio < 0.5 ? "mid" : "ok";
  return `<div class="at-hp ${tone}"><div class="at-hpfill" style="width:${clamp(ratio * 100, 0, 100)}%"></div><span>${esc(text)}</span></div>`;
}
export const condChips = (conds, { removable = false } = {}) =>
  list(conds)
    .map(
      (c) =>
        `<span class="at-cond"${removable ? ` data-uncond="${esc(c.id)}"` : ""}>${esc(c.e)} ${esc(c.label)}${c.rounds ? ` <small>${c.rounds}</small>` : ""}${
          removable ? " ✕" : ""
        }</span>`,
    )
    .join("");

export function rollLine(r) {
  const crit = r.crit === 1 ? " crit" : r.crit === -1 ? " fumble" : "";
  return `<li class="at-roll${crit}${r.secret ? " secret" : ""}">
    <span class="at-roll-who">${esc(r.e || "🎲")} <b>${esc(r.who)}</b>${r.secret ? " 🔒" : ""}</span>
    <span class="at-roll-what">${esc(r.label || r.expr)}${r.adv ? (r.adv > 0 ? " · ได้เปรียบ" : " · เสียเปรียบ") : ""}<small>${breakdown(r)}</small></span>
    <b class="at-roll-total tl-num">${r.total}</b></li>`;
}
export const sortRolls = (obj) => list(obj).sort((a, b) => (b.t || 0) - (a.t || 0));

// ---------------------------------------------------------------- dice
/** Rolls and posts to the room log (or the GM's secret inbox). Returns the entry. */
export async function sendRoll(expr, { label = "", adv = 0, secret = false, req = null, who, e, local = false } = {}) {
  const res = roll(expr, adv);
  if (!res) {
    toast("สูตรลูกเต๋าไม่ถูก เช่น d20+3 หรือ 2d6+1");
    return null;
  }
  const entry = clean({ uid: L.uid(), who, e, label, ...res, req: req || undefined });
  rollFx({ ...entry, secret }, { mine: true });
  if (local) return entry;
  const id = newId();
  try {
    if (secret) await L.write(`liveInbox/${S.code}/${id}`, { ...entry, secret: true, t: L.serverTime() });
    else await L.write(`live/${S.code}/rolls/${id}`, { ...entry, t: L.serverTime() });
  } catch {
    toast("ส่งผลทอยไม่สำเร็จ");
  }
  return entry;
}

let fxTimer = null;
/** Big animated result in the middle of the screen. */
export function rollFx(r, { mine = false, small = false } = {}) {
  let el = $("fx");
  if (!el) {
    el = document.createElement("div");
    el.id = "fx";
    el.onclick = () => el.classList.remove("on");
    document.body.appendChild(el);
  }
  const crit = r.crit === 1 ? "crit" : r.crit === -1 ? "fumble" : "";
  el.className = `at-fx ${crit}${small ? " small" : ""}`;
  el.innerHTML = `<div class="at-fx-card"><div class="at-fx-who">${esc(r.e || "🎲")} ${esc(r.who || "")}${r.secret ? " 🔒" : ""}</div>
    <div class="at-fx-label">${esc(r.label || r.expr)}</div>
    <div class="at-fx-num tl-num">?</div>
    <div class="at-fx-sub">${breakdown(r)}</div>
    <div class="at-fx-tag">${r.crit === 1 ? "🎉 คริติคอล!" : r.crit === -1 ? "💥 พลาดมหันต์!" : ""}</div></div>`;
  void el.offsetWidth;
  el.classList.add("on");
  const numEl = el.querySelector(".at-fx-num");
  const maxDie = Math.max(6, ...(r.parts || []).map((p) => p.d));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let n = 0;
  clearInterval(fxTimer);
  window.SFX?.play("dice");
  const done = () => {
    numEl.textContent = r.total;
    el.classList.add("landed");
    if (mine) navigator.vibrate?.(r.crit ? [60, 40, 60] : 40);
    window.SFX?.play(r.crit === 1 ? "fanfare" : r.crit === -1 ? "lose" : "land");
    setTimeout(() => el.classList.remove("on", "landed"), small ? 1800 : 2600);
  };
  if (reduce) return done();
  fxTimer = setInterval(() => {
    numEl.textContent = 1 + Math.floor(Math.random() * maxDie);
    if (++n >= 9) {
      clearInterval(fxTimer);
      done();
    }
  }, 55);
}

// ---------------------------------------------------------------- modal
/**
 * Opens a dialog. fields: [{ k, label, type: text|number|textarea|select|emoji|check|file|html, value, options, ... }].
 * actions: [{ v, label, cls }]. Resolves to { action, ...values } or null when closed.
 */
export function form({ title, fields = [], actions = [{ v: "ok", label: "บันทึก", cls: "blue" }], intro = "", wide = false }) {
  return new Promise((resolve) => {
    const wrap = document.createElement("div");
    wrap.className = "at-modal";
    const field = (f) => {
      const id = `f_${f.k}`;
      const lab = f.label ? `<span class="tl-label">${f.label}</span>` : "";
      const hint = f.hint ? `<small class="tl-hint">${f.hint}</small>` : "";
      if (f.type === "html") return `<div>${f.html}</div>`;
      if (f.type === "textarea")
        return `<label>${lab}<textarea id="${id}" class="sg-input" maxlength="${f.max || 600}" placeholder="${esc(f.placeholder || "")}">${esc(f.value ?? "")}</textarea>${hint}</label>`;
      if (f.type === "select")
        return `<label>${lab}<select id="${id}" class="sg-input">${f.options
          .map(([v, t]) => `<option value="${esc(v)}" ${String(v) === String(f.value) ? "selected" : ""}>${esc(t)}</option>`)
          .join("")}</select>${hint}</label>`;
      if (f.type === "check") return `<label class="at-check"><input id="${id}" type="checkbox" ${f.value ? "checked" : ""} /> ${f.label}</label>`;
      if (f.type === "file") return `<label>${lab}<input id="${id}" type="file" accept="${f.accept || "image/*"}" class="sg-input" />${hint}</label>`;
      if (f.type === "emoji")
        return `<div>${lab}<div class="at-emojis">${f.options
          .map((e) => `<button type="button" data-emoji="${esc(e)}" class="${e === f.value ? "on" : ""}">${e}</button>`)
          .join("")}</div><input id="${id}" class="sg-input at-emoji-in" maxlength="4" value="${esc(f.value || "")}" aria-label="อีโมจิ" /></div>`;
      return `<label>${lab}<input id="${id}" class="sg-input" type="${f.type === "number" ? "number" : "text"}" inputmode="${
        f.type === "number" ? "numeric" : "text"
      }" maxlength="${f.max || 60}" value="${esc(f.value ?? "")}" placeholder="${esc(f.placeholder || "")}" ${f.list ? `list="${id}_l"` : ""} />${
        f.list ? `<datalist id="${id}_l">${f.list.map((o) => `<option value="${esc(o)}">`).join("")}</datalist>` : ""
      }${hint}</label>`;
    };
    wrap.innerHTML = `<div class="at-modal-box sg-panel${wide ? " wide" : ""}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="at-modal-head"><h2>${title}</h2><button type="button" class="sg-btn small" data-close aria-label="ปิด">✕</button></div>
      ${intro ? `<div class="at-modal-intro">${intro}</div>` : ""}
      <form class="tl-stack">${fields.map(field).join("")}
      <div class="tl-row at-modal-actions">${actions.map((a) => `<button type="submit" class="sg-btn ${a.cls || ""}" value="${a.v}">${a.label}</button>`).join("")}</div></form></div>`;
    document.body.appendChild(wrap);
    document.body.classList.add("at-noscroll");
    const close = (val) => {
      wrap.remove();
      if (!document.querySelector(".at-modal")) document.body.classList.remove("at-noscroll");
      document.removeEventListener("keydown", onKey);
      resolve(val);
    };
    const onKey = (e) => e.key === "Escape" && close(null);
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap || e.target.closest("[data-close]")) close(null);
      const em = e.target.closest("[data-emoji]");
      if (em) {
        const box = em.closest("div").parentElement;
        box.querySelectorAll("[data-emoji]").forEach((b) => b.classList.toggle("on", b === em));
        box.querySelector(".at-emoji-in").value = em.dataset.emoji;
      }
    });
    const formEl = wrap.querySelector("form");
    formEl.addEventListener("submit", async (e) => {
      e.preventDefault();
      const out = { action: e.submitter?.value || actions[0].v };
      for (const f of fields) {
        const el = wrap.querySelector(`#f_${f.k}`);
        if (!el) continue;
        if (f.type === "check") out[f.k] = el.checked;
        else if (f.type === "file") out[f.k] = el.files?.[0] ? await imageData(el.files[0]) : null;
        else out[f.k] = el.value;
      }
      close(out);
    });
    const first = wrap.querySelector("input:not([type=checkbox]):not([type=file]),textarea,select");
    if (first && !matchMedia("(pointer: coarse)").matches) first.focus();
  });
}

/** Message-only dialog. */
export const alertBox = (title, html) => form({ title, intro: html, actions: [{ v: "ok", label: "ปิด", cls: "blue" }] });

/** Shrinks a photo to a JPEG data URL small enough for the database (≤ ~150 KB). */
export function imageData(file, maxSide = 900) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let q = 0.8;
      let side = maxSide;
      let url = "";
      for (let i = 0; i < 6; i++) {
        const s = Math.min(1, side / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        url = c.toDataURL("image/jpeg", q);
        if (url.length < 150000) break;
        q -= 0.12;
        side *= 0.8;
      }
      URL.revokeObjectURL(img.src);
      resolve(url.length < 200000 ? url : null);
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}

export function download(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function pickJson() {
  return new Promise((resolve) => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = "application/json,.json";
    inp.onchange = async () => {
      try {
        resolve(JSON.parse(await inp.files[0].text()));
      } catch {
        toast("อ่านไฟล์ไม่ได้");
        resolve(null);
      }
    };
    inp.click();
  });
}

/** Condition picker: returns { k, e, label, rounds } or null. */
export async function pickCondition(CONDITIONS) {
  const r = await form({
    title: "เพิ่มสถานะ",
    fields: [
      { k: "pick", label: "สถานะ", type: "select", value: CONDITIONS[0].k, options: [...CONDITIONS.map((c) => [c.k, `${c.e} ${c.label}`]), ["custom", "✏️ ตั้งเอง…"]] },
      { k: "custom", label: "ชื่อสถานะ (ถ้าตั้งเอง)", placeholder: "เช่น ถูกสาปเป็นกบ", max: 24 },
      { k: "rounds", label: "นานกี่รอบ (ว่าง = จนกว่าจะเอาออก)", type: "number", placeholder: "เช่น 3" },
    ],
    actions: [{ v: "ok", label: "เพิ่ม", cls: "blue" }],
  });
  if (!r) return null;
  const preset = CONDITIONS.find((c) => c.k === r.pick);
  const label = r.pick === "custom" ? r.custom.trim() : preset.label;
  if (!label) return null;
  const rounds = num(r.rounds, 0);
  return { k: r.pick === "custom" ? `c${newId()}` : preset.k, e: r.pick === "custom" ? "🏷️" : preset.e, label, ...(rounds > 0 ? { rounds } : {}) };
}

/** Lowers condition timers by one round; returns the new map (conditions that run out are gone). */
export function tickConds(conds) {
  const out = {};
  for (const [k, c] of Object.entries(conds || {})) {
    if (!c.rounds) out[k] = c;
    else if (c.rounds > 1) out[k] = { ...c, rounds: c.rounds - 1 };
  }
  return out;
}

export function joinUrlFor(code, param = "join") {
  return `${location.origin}${location.pathname}?${param}=${code}`;
}

/** HP after taking damage (temporary HP absorbs it first), healing, or setting temporary HP. */
export function hpChange(c, kind, amt) {
  const hp = num(c.hp, 0);
  const max = Math.max(1, num(c.max, 1));
  const tmp = num(c.tmp, 0);
  amt = Math.max(0, num(amt, 0));
  if (kind === "dmg") {
    const fromTmp = Math.min(tmp, amt);
    return { hp: Math.max(0, hp - (amt - fromTmp)), tmp: tmp - fromTmp };
  }
  if (kind === "heal") return { hp: Math.min(max, Math.max(0, hp) + amt), tmp };
  return { hp, tmp: amt };
}

export const hpForm = (name) =>
  form({
    title: `ปรับ HP · ${esc(name)}`,
    fields: [{ k: "amt", label: "จำนวน", type: "number", placeholder: "เช่น 7" }],
    actions: [
      { v: "dmg", label: "💥 โดนดาเมจ", cls: "red" },
      { v: "heal", label: "💚 ฟื้น HP", cls: "blue" },
      { v: "tmp", label: "🛡️ HP ชั่วคราว" },
    ],
  });

/** Sets innerHTML only when it changed, so open <details>, images and scroll stay put. */
export function put(el, html) {
  if (el && el.__html !== html) {
    el.innerHTML = html;
    el.__html = html;
  }
}

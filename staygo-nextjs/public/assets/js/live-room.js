// Live rooms for host tools (buzzer, vote): one host screen + players joining from their phones.
// Data lives in the staygo-online Realtime Database under live/{CODE}; the rules in
// staygo-online/database.rules.json decide who may write what (host vs. each player).
import { FIREBASE_CONFIG } from "/staygo/firebase-config.js";

const CDN = "https://www.gstatic.com/firebasejs/10.14.1";
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const SESSION_KEY = (kind) => `staygo-live-${kind}`;

let fb = null; // { db, uid, m: database module }

export async function connect() {
  if (fb) return fb;
  const [{ initializeApp }, authM, m] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-database.js`),
  ]);
  const app = initializeApp(FIREBASE_CONFIG, "live");
  const auth = authM.getAuth(app);
  const user = auth.currentUser || (await authM.signInAnonymously(auth)).user;
  const db = m.getDatabase(app);
  let offset = 0;
  m.onValue(m.ref(db, ".info/serverTimeOffset"), (s) => (offset = s.val() || 0));
  fb = { db, uid: user.uid, m, now: () => Date.now() + offset };
  return fb;
}

const r = (path) => fb.m.ref(fb.db, path);

export function normalizeCode(s) {
  return String(s || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 4);
}

/** Creates a room; retries with a new code if the code is taken (the rules reject overwriting another host's room). */
export async function createRoom(kind, extra = {}) {
  await connect();
  for (let i = 0; i < 8; i++) {
    let code = "";
    for (let k = 0; k < 4; k++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    try {
      await fb.m.set(r(`live/${code}/meta`), { hostUid: fb.uid, kind, createdAt: fb.m.serverTimestamp(), ...extra });
      await fb.m.set(r(`live/${code}/state`), { round: 1, locked: false });
      saveSession(kind, { code, role: "host" });
      return code;
    } catch {
      /* code taken, try another */
    }
  }
  throw new Error("สร้างห้องไม่สำเร็จ ลองใหม่อีกครั้ง");
}

export async function roomMeta(code) {
  await connect();
  const s = await fb.m.get(r(`live/${code}/meta`));
  return s.val();
}

/** Joins as a player: writes players/{uid} and marks offline when the tab closes. */
export async function joinRoom(kind, code, name) {
  await connect();
  const meta = await roomMeta(code);
  if (!meta || meta.kind !== kind) throw new Error("ไม่พบห้องนี้ ตรวจรหัสอีกครั้ง");
  const me = r(`live/${code}/players/${fb.uid}`);
  const prev = (await fb.m.get(me)).val();
  await fb.m.set(me, { ...(prev || {}), name: name.slice(0, 24), joinedAt: prev?.joinedAt || fb.m.serverTimestamp(), online: true });
  fb.m.onDisconnect(r(`live/${code}/players/${fb.uid}/online`)).set(false);
  saveSession(kind, { code, role: "player", name });
  return meta;
}

export function leaveRoom(kind, code) {
  clearSession(kind);
  if (fb && code) {
    fb.m.onDisconnect(r(`live/${code}/players/${fb.uid}/online`)).cancel();
    fb.m.set(r(`live/${code}/players/${fb.uid}/online`), false).catch(() => {});
  }
}

/** Calls cb(room) on every change; returns an unsubscribe function. */
export function watchRoom(code, cb) {
  return fb.m.onValue(r(`live/${code}`), (s) => cb(s.val()));
}

export const write = (path, value) => fb.m.set(r(path), value);
export const patch = (path, value) => fb.m.update(r(path), value);
export const remove = (path) => fb.m.remove(r(path));
export const serverTime = () => fb.m.serverTimestamp();
export const uid = () => fb?.uid;
export const now = () => (fb ? fb.now() : Date.now());

// ---- sessions (rejoin after refresh; works without storage too)
export function saveSession(kind, s) {
  try {
    localStorage.setItem(SESSION_KEY(kind), JSON.stringify(s));
  } catch {}
}
export function loadSession(kind) {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY(kind)) || "null");
  } catch {
    return null;
  }
}
export function clearSession(kind) {
  try {
    localStorage.removeItem(SESSION_KEY(kind));
  } catch {}
}

// ---- join link + QR code (qrcode-generator is loaded on demand, same as Ouroboros)
export const joinUrl = (code) => `${location.origin}${location.pathname}?join=${code}`;

let qrLib = null;
function loadQr() {
  if (qrLib) return qrLib;
  qrLib = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js";
    s.onload = () => resolve(window.qrcode);
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return qrLib;
}
export async function qrSvg(text) {
  try {
    const qrcode = await loadQr();
    const q = qrcode(0, "M");
    q.addData(text);
    q.make();
    return q.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
  } catch {
    return "";
  }
}

// ---- small helpers shared by the pages
export const $ = (id) => document.getElementById(id);
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
export function toast(text, ms = 2400) {
  const el = document.createElement("div");
  el.className = "tl-toast";
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}
export function beep(freq = 880, ms = 160) {
  try {
    const ctx = (beep.ctx ||= new (window.AudioContext || window.webkitAudioContext)());
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = freq;
    o.connect(g);
    g.connect(ctx.destination);
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + ms / 1000);
    o.start();
    o.stop(ctx.currentTime + ms / 1000);
  } catch {}
}
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    toast("คัดลอกลิงก์แล้ว");
  } catch {
    prompt("คัดลอกลิงก์นี้", text);
  }
}

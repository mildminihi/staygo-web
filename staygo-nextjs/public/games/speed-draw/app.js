// วาดไว 15 วิ: everyone draws the same 10 prompts (host picks 5–20 s each; prompts come from one similar-shape set, random or host-picked; host can lock pens to black), then
// matches SOMEONE ELSE's drawings to the prompts (shown in a shuffled order; host picks 60–180 s). Players sit in a ring (A sorts B,
// B sorts C, C sorts A) and every correct placement scores for both the sorter and the artist, so a player's total is
// (how well I sorted my neighbour) + (how well my other neighbour sorted me). Alone in the room you sort your own.
//
// Timing is not driven by the host's tab: the host writes startAt/drawEnd/orderEnd once (server
// time) and every screen works out the phase from the clock. Drawings are uploaded as small JPEGs
// under draws/{game}/{uid}/{i}; each player's arrangement goes to answers/{game}/{uid}.
import {
  connect, createRoom, joinRoom, leaveRoom, watchRoom, roomMeta, normalizeCode,
  write, patch, remove, uid, now, loadSession, clearSession, joinUrl, qrSvg,
  $, esc, toast, beep, copyText, sfx,
} from "/assets/js/live-room.js";
import { SHAPE_SETS } from "./words.js";

const KIND = "speed-draw";
const NAME_KEY = "staygo-live-name";
const ROUNDS = 10;
const DRAW_MS = 10000; // default seconds per drawing; the host can pick 5–20
const ORDER_MS = 90000; // default time to sort; the host can pick 60–180 s
const REPAIR_MS = 5000; // the host may re-pair the ring this long after drawing ends (late uploads, players who left)
const LEAD_MS = 3600; // 3-2-1 before the first prompt
const PAD = 600; // drawing pad size in canvas pixels
const THUMB = 240; // uploaded drawing size
const COLORS = ["#231f20", "#e63946", "#1d6fe0", "#2a9d48", "#f4a300", "#8b5a2b"];
const ERASER = "#ffffff";

let FB = null;
let code = null;
let role = null;
let room = null;
let unwatch = null;
let joined = false;
let shownPhase = "";

const show = (id) => {
  for (const s of ["start", "host", "player"]) $(s).hidden = s !== id;
  $("loading").hidden = true;
  document.body.classList.toggle("sd-joined", id === "player");
};
const toggle = (ids, on) => ids.forEach((id) => ($(id).hidden = id !== on));
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const range = (n) => [...Array(n).keys()];
const secs = (ms) => Math.max(0, Math.ceil(ms / 1000));

/** Where the game is right now, from the shared timestamps in state. */
function phaseOf(st, t = now()) {
  if (!st?.startAt) return { name: "lobby" };
  const n = st.n || ROUNDS;
  const d = st.drawMs || DRAW_MS;
  if (t < st.startAt) return { name: "count", left: st.startAt - t };
  if (t < st.drawEnd) {
    const i = Math.min(n - 1, Math.floor((t - st.startAt) / d));
    const left = st.startAt + (i + 1) * d - t;
    return { name: "draw", i, left, frac: left / d };
  }
  if (t < st.orderEnd && !st.reveal) {
    const left = st.orderEnd - t;
    return { name: "order", left, frac: left / (st.orderEnd - st.drawEnd) };
  }
  return { name: "reveal" };
}

const parseOrder = (ans, n) => {
  const o = String(ans?.order || "").split(",").map(Number);
  const ok = o.length === n && new Set(o).size === n && o.every((x) => x >= 0 && x < n);
  return ok ? o : null;
};
function scoreOf(st, ans) {
  const o = parseOrder(ans, st.n || ROUNDS);
  if (!o) return null;
  return st.show.reduce((s, p, k) => s + (o[k] === p ? 1 : 0), 0);
}
/** Ring of players: pairs[sorter] = whose drawings they sort. */
function makePairs(ids) {
  const p = {};
  ids.forEach((id, k) => (p[id] = ids[(k + 1) % ids.length]));
  return p;
}
const samePairs = (a = {}, b = {}) => Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => a[k] === b[k]);
const sorterOf = (st, id) => Object.keys(st.pairs || {}).find((k) => st.pairs[k] === id);
/** A player's points: what they got sorting their neighbour + what their other neighbour got sorting them. */
function scoresOf(st, answers, id) {
  const pairs = st.pairs || {};
  if (!pairs[id]) return { sort: null, drawn: null, total: null };
  const sort = scoreOf(st, answers[id]);
  const by = sorterOf(st, id);
  const drawn = by && by !== id ? scoreOf(st, answers[by]) : null;
  const total = sort === null && drawn === null ? null : (sort || 0) + (drawn || 0);
  return { sort, drawn, by, total };
}
const maxScore = (st) => (st.n || ROUNDS) * (Object.keys(st.pairs || {}).length > 1 ? 2 : 1);
const nameOf = (id) => room?.players?.[id]?.name || "ผู้เล่นที่ออกไปแล้ว";
function sortedPlayers() {
  return Object.entries(room?.players || {})
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
}
/** Everyone who took part in the current game, best score first. */
function leaderboard() {
  const st = room.state;
  const answers = room.answers?.[st.game] || {};
  const rows = Object.keys(st.pairs || {}).map((id) => ({ id, name: nameOf(id), score: scoresOf(st, answers, id).total }));
  rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.name.localeCompare(b.name, "th"));
  for (const r of rows) r.rank = 1 + rows.filter((x) => (x.score ?? -1) > (r.score ?? -1)).length;
  return rows;
}

// ---------------------------------------------------------------- start screen
function startScreen(prefill) {
  show("start");
  try {
    $("nameInput").value = localStorage.getItem(NAME_KEY) || "";
  } catch {}
  if (prefill) {
    $("codeInput").value = prefill;
    pick("player");
    $("nameInput").focus();
  }
}
function pick(which) {
  $("pickHost").classList.toggle("active", which === "host");
  $("pickPlayer").classList.toggle("active", which === "player");
  $("joinForm").hidden = which !== "player";
  $("createBtn").hidden = which !== "host";
}
$("pickHost").onclick = () => pick("host");
$("pickPlayer").onclick = () => pick("player");
$("codeInput").oninput = (e) => (e.target.value = normalizeCode(e.target.value));

$("createBtn").onclick = async () => {
  $("createBtn").disabled = true;
  try {
    enterHost(await createRoom(KIND));
  } catch (e) {
    toast(e.message);
  } finally {
    $("createBtn").disabled = false;
  }
};

$("joinBtn").onclick = async () => {
  const c = normalizeCode($("codeInput").value);
  const name = $("nameInput").value.trim();
  if (c.length !== 4) return toast("ใส่รหัสห้อง 4 ตัว");
  if (!name) return toast("ใส่ชื่อของคุณก่อน");
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {}
  $("joinBtn").disabled = true;
  try {
    await joinRoom(KIND, c, name);
    enterPlayer(c);
  } catch (e) {
    toast(e.message);
  } finally {
    $("joinBtn").disabled = false;
  }
};

// ================================================================ HOST
let galIdx = 0;
let revealSig = "";
let lastBeep = "";

async function enterHost(c) {
  code = c;
  role = "host";
  shownPhase = "";
  show("host");
  $("hostCode").textContent = c;
  $("qr").innerHTML = await qrSvg(joinUrl(c));
  unwatch?.();
  unwatch = watchRoom(c, (v) => {
    room = v;
    if (!v?.meta) return closedRoom();
    renderHostRoom();
    hostTick();
  });
}

let seenPlayers = -1;
function renderHostRoom() {
  const st = room.state || {};
  const ph = phaseOf(st);
  const players = sortedPlayers();
  const game = st.game;
  const draws = room.draws?.[game] || {};
  const answers = room.answers?.[game] || {};
  $("playerCount").textContent = `(${players.filter((p) => p.online).length}/${players.length})`;
  if (players.length > seenPlayers && seenPlayers >= 0) sfx("join");
  seenPlayers = players.length;
  $("playerList").innerHTML = players.length
    ? players
        .map((p) => {
          let tag = "";
          if (ph.name === "draw" || ph.name === "count") tag = `${Object.keys(draws[p.id] || {}).length}/${st.n}`;
          else if (ph.name === "order") tag = !st.pairs?.[p.id] ? "–" : answers[p.id]?.done ? "✅" : "…";
          else if (ph.name === "reveal") tag = scoresOf(st, answers, p.id).total ?? "–";
          return `<li><span class="tl-dot${p.online ? " on" : ""}"></span><span class="sd-pname">${esc(p.name)}</span>
            <b class="tl-num">${tag}</b>
            <button class="sd-kick tl-nobig" data-kick="${p.id}" aria-label="เอาออก">✕</button></li>`;
        })
        .join("")
    : '<li class="tl-hint">ยังไม่มีใครเข้าห้อง</li>';

  // everyone online has pressed "done" → reveal without waiting for the clock
  if (ph.name === "order") {
    if (now() < st.drawEnd + REPAIR_MS) repair();
    const online = players.filter((p) => p.online && st.pairs?.[p.id]);
    if (online.length && online.every((p) => answers[p.id]?.done)) patch(`live/${code}/state`, { reveal: true }).catch(() => {});
  }
  if (ph.name === "reveal") renderReveal();
}

function hostTick() {
  if (role !== "host" || !room) return;
  const st = room.state || {};
  const ph = phaseOf(st);
  const key = ph.name + (ph.name === "draw" ? ph.i : "");
  if (key !== shownPhase) {
    shownPhase = key;
    toggle(["hLobby", "hCount", "hDraw", "hOrder", "hReveal"], { lobby: "hLobby", count: "hCount", draw: "hDraw", order: "hOrder", reveal: "hReveal" }[ph.name]);
    $("againBtn").hidden = ph.name !== "reveal";
    $("stopBtn").hidden = !["count", "draw", "order"].includes(ph.name);
    if (ph.name === "draw") {
      $("hRound").textContent = ph.i + 1;
      $("hTotal").textContent = st.n;
      $("hPrompt").textContent = st.prompts[ph.i];
      $("hPrompt").classList.remove("pop");
      void $("hPrompt").offsetWidth;
      $("hPrompt").classList.add("pop");
      sfx(ph.i === 0 ? "go" : "notify");
    }
    if (ph.name === "order") sfx("whoosh");
    if (ph.name === "reveal") {
      revealSig = "";
      galIdx = 0;
      sfx("fanfare");
    }
    renderHostRoom();
  }
  if (ph.name === "count") {
    const n = Math.min(3, secs(ph.left));
    $("hCountNum").textContent = n;
    if (lastBeep !== "c" + n) sfx("count");
    lastBeep = "c" + n;
  } else if (ph.name === "draw") {
    const s = secs(ph.left);
    $("hSecs").textContent = s;
    $("hBar").style.width = `${ph.frac * 100}%`;
    $("hBar").classList.toggle("hurry", s <= 3);
    if (s <= 3 && lastBeep !== `d${ph.i}-${s}`) sfx("tick");
    lastBeep = `d${ph.i}-${s}`;
    const prev = ph.i - 1;
    if (prev >= 0) {
      const sent = Object.values(room.draws?.[st.game] || {}).filter((d) => d?.[prev]).length;
      $("hSent").textContent = `ส่งรูปข้อ ${prev + 1} แล้ว ${sent} คน`;
    } else $("hSent").textContent = "";
  } else if (ph.name === "order") {
    $("hOrderSecs").textContent = secs(ph.left);
    $("hOrderBar").style.width = `${ph.frac * 100}%`;
    const answers = room.answers?.[st.game] || {};
    const inGame = sortedPlayers().filter((p) => p.online && st.pairs?.[p.id]);
    const done = inGame.filter((p) => answers[p.id]?.done).length;
    $("hDone").textContent = `เรียงเสร็จแล้ว ${done}/${inGame.length} คน`;
  }
}

// ---- host settings: seconds per drawing + prompt set (remembered on this computer)
const SETTINGS_KEY = "staygo-speed-draw-settings";
const HISTORY_KEY = "staygo-speed-draw-history"; // recent sets + used words, so new rooms/refreshes don't repeat
const MIX = "mix";
$("wordSet").innerHTML =
  `<option value="">🎲 สุ่มหมวด (ไม่ซ้ำล่าสุด)</option>` +
  SHAPE_SETS.map((s) => `<option value="${s.key}">${s.name} (${s.words.length} คำ)</option>`).join("") +
  `<option value="${MIX}">🌈 คละทุกหมวด (ง่ายขึ้น)</option>`;
try {
  const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  if (s.secs) $("drawSecs").value = String(s.secs);
  if (s.set) $("wordSet").value = s.set;
  if (s.pen) $("penMode").value = s.pen;
  if (s.order) $("orderSecs").value = String(s.order);
} catch {}
// an unknown saved value leaves the select empty: fall back to the default
if (!$("drawSecs").value) $("drawSecs").value = String(DRAW_MS / 1000);
if ($("wordSet").selectedIndex < 0) $("wordSet").value = "";
if (!$("penMode").value) $("penMode").value = "mono";
if (!$("orderSecs").value) $("orderSecs").value = String(ORDER_MS / 1000);
function settingsChanged() {
  const set = $("wordSet").value;
  const setName = set === MIX ? "คละทุกหมวด" : SHAPE_SETS.find((s) => s.key === set)?.name.replace(/^\S+\s/, "") || "สุ่มหมวด";
  const pen = $("penMode").value === "multi" ? "หลายสี" : "สีดำสีเดียว";
  $("lobbyInfo").textContent = `${ROUNDS} โจทย์ · ${setName} · ${pen} · ข้อละ ${$("drawSecs").value} วินาที · เรียงรูป ${$("orderSecs").value} วินาที`;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ secs: +$("drawSecs").value, set, pen: $("penMode").value, order: +$("orderSecs").value }));
  } catch {}
}
$("drawSecs").onchange = settingsChanged;
$("wordSet").onchange = settingsChanged;
$("penMode").onchange = settingsChanged;
$("orderSecs").onchange = settingsChanged;
settingsChanged();

function loadHistory() {
  try {
    const h = JSON.parse(localStorage.getItem(HISTORY_KEY) || "{}");
    return { sets: Array.isArray(h.sets) ? h.sets : [], words: Array.isArray(h.words) ? h.words : [] };
  } catch {
    return { sets: [], words: [] };
  }
}
function saveHistory(h) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify({ sets: h.sets.slice(0, SHAPE_SETS.length), words: h.words.slice(0, 400) }));
  } catch {}
}

/** Random set: skip the most recently played half of the sets, so every set gets a turn before one comes back. */
function randomSet(recent) {
  const skip = new Set(recent.slice(0, Math.floor(SHAPE_SETS.length / 2)));
  const sets = SHAPE_SETS.filter((s) => !skip.has(s.key));
  return sets[Math.floor(Math.random() * sets.length)];
}

/** 10 prompts: words not used lately come first; when a set runs low, top up with its oldest-used words. */
function pickPrompts() {
  const h = loadHistory();
  const choice = $("wordSet").value;
  let words;
  if (choice === MIX) {
    words = SHAPE_SETS.flatMap((s) => s.words);
  } else {
    const set = SHAPE_SETS.find((s) => s.key === choice) || randomSet(h.sets);
    words = set.words;
    h.sets = [set.key, ...h.sets.filter((k) => k !== set.key)];
  }
  const used = new Map(h.words.map((w, i) => [w, i])); // index 0 = most recent
  const fresh = shuffle(words.filter((w) => !used.has(w)));
  const old = words.filter((w) => used.has(w)).sort((a, b) => used.get(b) - used.get(a));
  const out = shuffle([...fresh, ...old].slice(0, ROUNDS));
  h.words = [...out, ...h.words.filter((w) => !out.includes(w))];
  saveHistory(h);
  return out;
}

async function startGame() {
  if (!sortedPlayers().length && !confirm("ยังไม่มีผู้เล่นในห้อง เริ่มเลยไหม?")) return;
  const prev = room?.state?.game || 0;
  const g = prev + 1;
  const drawMs = Math.min(20, Math.max(3, +$("drawSecs").value || DRAW_MS / 1000)) * 1000;
  const t0 = now() + LEAD_MS;
  const drawEnd = t0 + ROUNDS * drawMs;
  const orderMs = Math.min(300, Math.max(30, +$("orderSecs").value || ORDER_MS / 1000)) * 1000;
  const ring = shuffle(sortedPlayers().map((p) => p.id)); // who sorts whose drawings; re-checked when drawing ends
  try {
    await write(`live/${code}/state`, {
      round: g, locked: false, game: g, n: ROUNDS, drawMs, mono: $("penMode").value !== "multi",
      startAt: t0, drawEnd, orderEnd: drawEnd + orderMs,
      prompts: pickPrompts(), show: shuffle(range(ROUNDS)), reveal: false,
      ring, pairs: makePairs(ring),
    });
  } catch {
    return toast("เริ่มเกมไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
  if (prev) clearGame(prev);
}
/** Once drawing ends, rebuild the ring from the players who actually drew something: drops anyone who left
 *  before drawing and adds anyone who joined mid-game, keeping the starting order. */
function repair() {
  const st = room.state;
  const draws = room.draws?.[st.game] || {};
  const drew = (id) => Object.keys(draws[id] || {}).length > 0;
  const ring = (st.ring || []).filter(drew);
  for (const id of Object.keys(draws)) if (drew(id) && !ring.includes(id)) ring.push(id);
  if (!ring.length) return;
  const pairs = makePairs(ring);
  if (!samePairs(pairs, st.pairs)) patch(`live/${code}/state`, { ring, pairs }).catch(() => {});
}
function clearGame(g) {
  remove(`live/${code}/draws/${g}`).catch(() => {});
  remove(`live/${code}/answers/${g}`).catch(() => {});
}
$("startBtn").onclick = startGame;
$("againBtn").onclick = startGame;
$("stopBtn").onclick = async () => {
  if (!confirm("หยุดเกมนี้แล้วกลับไปหน้ารอ?")) return;
  const g = room?.state?.game || 0;
  await write(`live/${code}/state`, { round: g, locked: false, game: g });
  clearGame(g);
};
$("revealBtn").onclick = () => patch(`live/${code}/state`, { reveal: true });

function renderReveal() {
  const st = room.state;
  const draws = room.draws?.[st.game] || {};
  const answers = room.answers?.[st.game] || {};
  const rows = leaderboard();
  const sig = JSON.stringify([galIdx, rows.map((r) => [r.id, r.score]), rows.map((r) => !!draws[r.id]?.[galIdx])]);
  if (sig === revealSig) return;
  revealSig = sig;
  const medal = ["🥇", "🥈", "🥉"];
  $("board").innerHTML = rows.length
    ? rows
        .map(
          (r) => `<li class="${r.rank === 1 && r.score ? "top" : ""}"><span class="sd-rank">${(r.score && medal[r.rank - 1]) || r.rank}</span>
          <span class="sd-bname">${esc(r.name)}</span>
          <span class="sd-bscore tl-num">${r.score ?? "–"}<small>/${maxScore(st)}</small></span></li>`,
        )
        .join("")
    : '<li class="tl-hint">ไม่มีใครส่งคำตอบ</li>';

  // gallery: everyone's drawing for one prompt, ✅ when whoever sorted it placed it on the right prompt
  const slotOf = st.show.indexOf(galIdx);
  $("galNo").textContent = `${galIdx + 1}/${st.n}`;
  $("galWord").textContent = st.prompts[galIdx];
  $("galGrid").innerHTML = rows.length
    ? rows
        .map((r) => {
          const img = draws[r.id]?.[galIdx];
          const by = sorterOf(st, r.id);
          const o = parseOrder(answers[by], st.n);
          const ok = o && o[slotOf] === galIdx;
          const sortedBy = by && by !== r.id ? `<small>${esc(nameOf(by))} เรียง</small>` : "";
          return `<figure class="sd-galitem">
            <div class="sd-galimg">${img ? `<img src="${img}" alt="รูปของ ${esc(r.name)}" />` : "<span>ไม่ได้วาด</span>"}<i class="${ok ? "ok" : "no"}">${ok ? "✓" : "✗"}</i></div>
            <figcaption>${esc(r.name)}${sortedBy}</figcaption></figure>`;
        })
        .join("")
    : "";
}
function galMove(d) {
  const n = room?.state?.n || ROUNDS;
  galIdx = (galIdx + d + n) % n;
  renderReveal();
}
$("galPrev").onclick = () => galMove(-1);
$("galNext").onclick = () => galMove(1);

$("host").addEventListener("click", (e) => {
  const k = e.target.closest("[data-kick]");
  if (k && confirm(`เอา ${room?.players?.[k.dataset.kick]?.name || "ผู้เล่น"} ออกจากห้อง?`)) remove(`live/${code}/players/${k.dataset.kick}`);
});
$("copyLink").onclick = () => copyText(joinUrl(code));
document.addEventListener("keydown", (e) => {
  if (role !== "host" || e.target.closest("input, textarea")) return;
  if (e.key === "Escape") setBig(false);
  if (phaseOf(room?.state).name === "reveal") {
    if (e.key === "ArrowLeft") galMove(-1);
    if (e.key === "ArrowRight") galMove(1);
  }
});

function setBig(on) {
  document.body.classList.toggle("tl-big", on);
  $("exitBig").hidden = !on;
}
$("bigBtn").onclick = () => setBig(true);
$("exitBig").onclick = () => setBig(false);

$("endRoom").onclick = async () => {
  if (!confirm("ปิดห้องนี้? ผู้เล่นทุกคนจะหลุดจากห้อง")) return;
  const c = code;
  unwatch?.();
  for (const id of Object.keys(room?.players || {})) await remove(`live/${c}/players/${id}`).catch(() => {});
  for (const p of ["draws", "answers", "state", "meta"]) await remove(`live/${c}/${p}`).catch(() => {});
  clearSession(KIND);
  code = role = room = null;
  setBig(false);
  startScreen();
};

// ================================================================ PLAYER
// G: this phone's copy of the current game (drawings stay in memory; uploads are for the host
// and for getting them back after a refresh).
let G = null;

function enterPlayer(c) {
  code = c;
  role = "player";
  joined = false;
  shownPhase = "";
  G = null;
  show("player");
  $("meCode").textContent = c;
  unwatch?.();
  unwatch = watchPlayer(c, (v, loaded) => {
    room = v;
    if (loaded.meta && !v.meta) return closedRoom();
    if (!loaded.players) return;
    const me = v.players?.[uid()];
    if (!me) {
      if (joined) return kicked();
      return;
    }
    joined = true;
    $("meName").textContent = me.name;
    playerTick();
  });
}

/** Players listen to everything except the drawings (those can add up to megabytes). */
function watchPlayer(c, cb) {
  const { m, db } = FB;
  const v = {};
  const loaded = {};
  const offs = ["meta", "state", "players", "answers"].map((k) =>
    m.onValue(m.ref(db, `live/${c}/${k}`), (s) => {
      v[k] = s.val();
      loaded[k] = true;
      cb(v, loaded);
    }),
  );
  return () => offs.forEach((off) => off());
}

function ensureGame(st) {
  if (G && G.game === st.game) return;
  stopTarget();
  G = {
    game: st.game, n: st.n, drawings: Array(st.n).fill(null), saved: new Set(), cur: -1, slots: null, done: false, sel: null, fetched: false,
    target: undefined, tdraw: Array(st.n).fill(null), tOff: null, fresh: false,
  };
  setPalette(!!st.mono);
  clearPad();
}

function playerTick() {
  if (role !== "player" || !room || !joined) return;
  const st = room.state || {};
  const ph = phaseOf(st);
  if (st.startAt) ensureGame(st);

  if (G && G.cur >= 0 && (ph.name !== "draw" || ph.i !== G.cur || st.game !== G.game)) saveRound(G.cur);
  if (ph.name === "draw" && G.cur !== ph.i) startRound(st, ph.i);
  // the host re-paired the ring after drawing: start over on the new person's drawings
  if (G && G.target !== undefined && (ph.name === "order" || ph.name === "reveal") && (st.pairs?.[uid()] || null) !== G.target) {
    if (ph.name === "order") enterOrder();
    else enterReveal();
  }

  const key = ph.name + (st.game || 0);
  if (key !== shownPhase) {
    shownPhase = key;
    toggle(["pLobby", "pCount", "pDraw", "pOrder", "pReveal"], { lobby: "pLobby", count: "pCount", draw: "pDraw", order: "pOrder", reveal: "pReveal" }[ph.name]);
    document.body.classList.toggle("sd-ingame", ph.name === "draw" || ph.name === "order" || ph.name === "count");
    if (ph.name === "order") enterOrder();
    if (ph.name === "reveal") enterReveal();
  }
  if (ph.name === "count") $("pCountNum").textContent = Math.min(3, secs(ph.left));
  if (ph.name === "draw") {
    const s = secs(ph.left);
    $("pSecs").textContent = s;
    $("pBar").style.width = `${ph.frac * 100}%`;
    $("pBar").classList.toggle("hurry", s <= 3);
  }
  if (ph.name === "order") {
    $("pOrderSecs").textContent = secs(ph.left);
    $("pOrderBar").style.width = `${ph.frac * 100}%`;
  }
  if (ph.name === "reveal") renderPlayerReveal();
}

function startRound(st, i) {
  G.cur = i;
  clearPad();
  $("pRound").textContent = i + 1;
  $("pTotal").textContent = st.n;
  const el = $("pPrompt");
  el.textContent = st.prompts[i];
  el.classList.remove("pop");
  void el.offsetWidth;
  el.classList.add("pop");
  navigator.vibrate?.(i === 0 ? 120 : 60);
  sfx(i === 0 ? "go" : "notify");
}

function saveRound(i) {
  G.cur = -1;
  endStroke();
  if (G.saved.has(i)) return;
  G.saved.add(i);
  if (!strokes.length) return; // nothing drawn: the tile shows "ไม่ได้วาด"
  const c = document.createElement("canvas");
  c.width = c.height = THUMB;
  const x = c.getContext("2d");
  x.fillStyle = "#fff";
  x.fillRect(0, 0, THUMB, THUMB);
  x.drawImage(pad, 0, 0, THUMB, THUMB);
  const url = c.toDataURL("image/jpeg", 0.72);
  G.drawings[i] = url;
  write(`live/${code}/draws/${G.game}/${uid()}/${i}`, url).catch(() => {});
}

function stopTarget() {
  G?.tOff?.();
  if (G) G.tOff = null;
}
/** Follow the drawings of the player this phone sorts (pairs[me]); re-render when they arrive. */
function watchTarget(st) {
  const t = st.pairs?.[uid()] || null;
  if (G.target === t) return;
  stopTarget();
  G.fresh = G.target !== undefined; // re-paired mid-sort: shuffle anew instead of reusing the old answer
  G.target = t;
  G.tdraw = Array(G.n).fill(null);
  G.slots = null;
  G.done = false;
  G.sel = null;
  if (!t) return;
  const g = G;
  g.tOff = FB.m.onValue(FB.m.ref(FB.db, `live/${code}/draws/${g.game}/${t}`), (s) => {
    if (G !== g) return;
    const v = s.val() || {};
    g.tdraw = range(g.n).map((i) => v[i] || null);
    const ph = phaseOf(room?.state).name;
    if (ph === "order" && g.slots) renderSlots();
    if (ph === "reveal") renderPlayerReveal();
  });
}

async function enterOrder() {
  const st = room.state;
  const g = G;
  if (!g.fetched && g.drawings.some((d) => !d)) {
    g.fetched = true; // after a refresh: get back what was uploaded earlier
    try {
      const s = await FB.m.get(FB.m.ref(FB.db, `live/${code}/draws/${g.game}/${uid()}`));
      const v = s.val() || {};
      g.drawings.forEach((d, i) => {
        if (!d && v[i]) g.drawings[i] = v[i];
      });
    } catch {}
  }
  if (G !== g) return;
  watchTarget(room.state);
  if (g.target && !g.slots) {
    const mine = g.fresh ? null : room.answers?.[g.game]?.[uid()];
    g.slots = parseOrder(mine, g.n);
    g.done = !!mine?.done;
    if (!g.slots) {
      // shuffle until at most a couple of drawings start on their own prompt
      do g.slots = shuffle(range(g.n));
      while (g.slots.filter((d, k) => d === st.show[k]).length > 1);
      saveAnswer();
    }
  }
  renderSlots();
}

function saveAnswer() {
  write(`live/${code}/answers/${G.game}/${uid()}`, { order: G.slots.join(","), done: G.done }).catch(() => {});
}

const tile = (img) => (img ? `<img src="${img}" alt="" draggable="false" />` : "<span>ไม่ได้วาด</span>");

function renderSlots() {
  const st = room.state;
  const t = G.target;
  $("pOrderTitle").textContent = !t ? "รอเกมหน้า" : t === uid() ? "เรียงรูปของตัวเอง" : `เรียงรูปของ ${nameOf(t)}`;
  $("pOrderHint").textContent = !t
    ? "รอบนี้คุณเข้ามาไม่ทันวาด รอเล่นเกมหน้านะ"
    : t === uid() ? "แตะรูป 2 รูปเพื่อสลับกัน" : "แตะรูป 2 รูปเพื่อสลับกัน · ถูกกี่ข้อ ได้คะแนนทั้งคุณและเจ้าของรูป";
  $("doneBtn").hidden = !t;
  if (!t || !G.slots) {
    $("slots").innerHTML = "";
    return;
  }
  $("slots").innerHTML = G.slots
    .map(
      (d, k) => `<li><span class="sd-word"><b class="tl-num">${k + 1}</b> ${esc(st.prompts[st.show[k]])}</span>
      <button class="sd-thumb${G.sel === k ? " sel" : ""}" data-k="${k}">${tile(G.tdraw[d])}</button></li>`,
    )
    .join("");
  $("doneBtn").textContent = G.done ? "✏️ แก้ต่อ" : "✅ เสร็จแล้ว";
  $("doneBtn").className = `sg-btn block ${G.done ? "" : "blue"}`;
  $("slots").classList.toggle("locked", G.done);
}

$("slots").addEventListener("click", (e) => {
  const b = e.target.closest("[data-k]");
  if (!b || !G?.slots || !G.target || G.done || phaseOf(room?.state).name !== "order") return;
  const k = +b.dataset.k;
  if (G.sel === null) G.sel = k;
  else if (G.sel === k) G.sel = null;
  else {
    [G.slots[G.sel], G.slots[k]] = [G.slots[k], G.slots[G.sel]];
    G.sel = null;
    navigator.vibrate?.(20);
    sfx("move");
    saveAnswer();
  }
  renderSlots();
});
$("doneBtn").onclick = () => {
  if (!G?.slots || !G.target) return;
  G.done = !G.done;
  G.sel = null;
  saveAnswer();
  renderSlots();
};

async function enterReveal() {
  const st = room.state;
  if (!G || G.game !== st.game) ensureGame(st);
  // refreshed during the reveal, or never reached the ordering screen
  await enterOrder().catch(() => {});
  const sc = scoresOf(st, room.answers?.[st.game] || {}, uid());
  sfx(sc.total === null ? "notify" : sc.total >= maxScore(st) ? "win" : sc.total >= maxScore(st) / 2 ? "correct" : "minus");
  renderPlayerReveal();
}
/** One sorted list: drawings (by drawing index) laid out as `order` placed them. */
function resultList(st, order, drawings) {
  return order
    .map((d, k) => {
      const ok = d === st.show[k];
      return `<li class="${ok ? "ok" : "no"}"><span class="sd-word"><b class="tl-num">${k + 1}</b> ${esc(st.prompts[st.show[k]])}</span>
        <div class="sd-thumb">${tile(drawings[d])}<i>${ok ? "✓" : "✗"}</i></div>
        ${ok ? "" : `<small>รูปนี้คือ “${esc(st.prompts[d])}”</small>`}</li>`;
    })
    .join("");
}
let playerRevealSig = "";
function renderPlayerReveal() {
  const st = room.state;
  if (!G || G.game !== st.game || G.target === undefined) return;
  const answers = room.answers?.[st.game] || {};
  const sc = scoresOf(st, answers, uid());
  const t = G.target;
  renderRank();
  const sig = JSON.stringify([G.game, t, G.slots, G.tdraw.map(Boolean), G.drawings.map(Boolean), sc, sc.by && answers[sc.by]?.order, st.pairs]);
  if (sig === playerRevealSig) return;
  playerRevealSig = sig;
  $("pScore").innerHTML = sc.total === null ? "–" : `${sc.total}<small>/${maxScore(st)}</small>`;
  const solo = t === uid();
  const parts = [];
  if (t) parts.push(solo ? `เรียงรูปตัวเองถูก ${sc.sort ?? 0} ข้อ` : `คุณเรียงรูปของ ${nameOf(t)} ถูก ${sc.sort ?? 0} ข้อ`);
  if (sc.by && !solo) parts.push(`${nameOf(sc.by)} เรียงรูปของคุณถูก ${sc.drawn ?? 0} ข้อ`);
  $("pBreak").innerHTML = parts.map((x) => `<span>${esc(x)}</span>`).join("");

  // 1) how I sorted my neighbour's drawings
  $("pRes1Title").hidden = !t;
  $("pRes1Title").textContent = solo ? "รูปของคุณ" : t ? `คุณเรียงรูปของ ${nameOf(t)}` : "";
  $("pResult").innerHTML = t ? resultList(st, G.slots || range(st.n), G.tdraw) : "";
  // 2) how my other neighbour sorted my drawings
  const theirs = sc.by && !solo ? parseOrder(answers[sc.by], st.n) : null;
  $("pRes2Title").hidden = !theirs;
  $("pRes2Title").textContent = theirs ? `${nameOf(sc.by)} เรียงรูปของคุณ` : "";
  $("pResult2").innerHTML = theirs ? resultList(st, theirs, G.drawings) : "";
}
function renderRank() {
  const rows = leaderboard();
  const me = rows.find((r) => r.id === uid());
  $("pRank").textContent = me && rows.length > 1 ? `อันดับ ${me.rank} จาก ${rows.length} คน` : "คะแนนของคุณ";
}

$("leaveBtn").onclick = () => {
  stopTarget();
  unwatch?.();
  leaveRoom(KIND, code);
  code = role = room = null;
  startScreen();
};

// ---------------------------------------------------------------- drawing pad
const pad = $("pad");
const ctx = pad.getContext("2d");
let strokes = [];
let cur = null;
let color = COLORS[0];
let thick = false;

function clearPad() {
  strokes = [];
  cur = null;
  redraw();
}
function redraw() {
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, PAD, PAD);
  for (const s of strokes) drawPath(s, 0);
}
function drawPath(s, from) {
  const p = s.p;
  ctx.strokeStyle = s.c;
  ctx.lineWidth = s.w;
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.beginPath();
  const a = Math.max(0, from - 2);
  ctx.moveTo(p[a], p[a + 1]);
  if (p.length === 2) ctx.lineTo(p[0] + 0.01, p[1]);
  for (let k = a + 2; k < p.length; k += 2) ctx.lineTo(p[k], p[k + 1]);
  ctx.stroke();
}
function point(e) {
  const r = pad.getBoundingClientRect();
  return [((e.clientX - r.left) * PAD) / r.width, ((e.clientY - r.top) * PAD) / r.height];
}
function endStroke() {
  cur = null;
}
pad.addEventListener("pointerdown", (e) => {
  if (!G || G.cur < 0) return;
  e.preventDefault();
  pad.setPointerCapture?.(e.pointerId);
  const w = color === ERASER ? 40 : thick ? 18 : 7;
  cur = { c: color, w, p: point(e) };
  strokes.push(cur);
  drawPath(cur, 0);
});
pad.addEventListener("pointermove", (e) => {
  if (!cur) return;
  const from = cur.p.length;
  const evs = e.getCoalescedEvents?.();
  for (const ev of evs?.length ? evs : [e]) cur.p.push(...point(ev));
  drawPath(cur, from);
});
for (const t of ["pointerup", "pointercancel", "lostpointercapture"]) pad.addEventListener(t, endStroke);

$("colors").innerHTML =
  COLORS.map((c, i) => `<button class="sd-swatch${i ? "" : " on"}" data-c="${c}" style="--c:${c}" aria-label="สี ${i + 1}"></button>`).join("") +
  `<button class="sd-swatch eraser" data-c="${ERASER}" aria-label="ยางลบ">🧽</button>`;
/** One-colour games (host setting) keep only black + the eraser. */
function setPalette(mono) {
  color = COLORS[0];
  $("colors").querySelectorAll(".sd-swatch").forEach((x, i) => {
    x.hidden = mono && i > 0 && x.dataset.c !== ERASER;
    x.classList.toggle("on", i === 0);
  });
}
$("colors").addEventListener("click", (e) => {
  const b = e.target.closest("[data-c]");
  if (!b) return;
  color = b.dataset.c;
  $("colors").querySelectorAll(".sd-swatch").forEach((x) => x.classList.toggle("on", x === b));
});
$("sizeBtn").onclick = () => {
  thick = !thick;
  $("sizeBtn").classList.toggle("thick", thick);
};
$("undoBtn").onclick = () => {
  strokes.pop();
  redraw();
};
$("clearBtn").onclick = clearPad;

// ---------------------------------------------------------------- leaving
function kicked() {
  stopTarget();
  unwatch?.();
  clearSession(KIND);
  code = role = room = null;
  document.body.classList.remove("sd-ingame");
  toast("คุณถูกเอาออกจากห้อง");
  startScreen();
}
function closedRoom() {
  stopTarget();
  unwatch?.();
  clearSession(KIND);
  const was = role;
  code = role = room = null;
  document.body.classList.remove("sd-ingame");
  if (was) toast("ห้องนี้ปิดแล้ว");
  setBig(false);
  startScreen();
}

// ---------------------------------------------------------------- boot
setInterval(() => (role === "host" ? hostTick() : playerTick()), 100);

(async function boot() {
  const params = new URLSearchParams(location.search);
  const joinCode = normalizeCode(params.get("join"));
  try {
    FB = await connect();
  } catch {
    $("loading").textContent = "เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วรีเฟรชหน้า";
    return;
  }
  const s = loadSession(KIND);
  if (s && (!joinCode || joinCode === s.code)) {
    const meta = await roomMeta(s.code).catch(() => null);
    if (meta && s.role === "host" && meta.hostUid === uid()) return enterHost(s.code);
    if (meta && s.role === "player" && s.name) {
      try {
        await joinRoom(KIND, s.code, s.name);
        return enterPlayer(s.code);
      } catch {}
    }
    clearSession(KIND);
  }
  startScreen(joinCode.length === 4 ? joinCode : "");
})();

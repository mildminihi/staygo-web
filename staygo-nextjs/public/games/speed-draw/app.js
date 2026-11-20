// วาดไว 15 วิ: everyone draws the same 10 prompts (host picks 5–20 s each; prompts come from one similar-shape set), then gets 60 s to match their own
// drawings to the prompts (shown in a shuffled order). Score = drawings placed on the right prompt.
//
// Timing is not driven by the host's tab: the host writes startAt/drawEnd/orderEnd once (server
// time) and every screen works out the phase from the clock. Drawings are uploaded as small JPEGs
// under draws/{game}/{uid}/{i}; each player's arrangement goes to answers/{game}/{uid}.
import {
  connect, createRoom, joinRoom, leaveRoom, watchRoom, roomMeta, normalizeCode,
  write, patch, remove, uid, now, loadSession, clearSession, joinUrl, qrSvg,
  $, esc, toast, beep, copyText,
} from "/assets/js/live-room.js";
import { SHAPE_SETS } from "./words.js";

const KIND = "speed-draw";
const NAME_KEY = "staygo-live-name";
const ROUNDS = 10;
const DRAW_MS = 10000; // default seconds per drawing; the host can pick 5–20
const ORDER_MS = 60000;
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
function sortedPlayers() {
  return Object.entries(room?.players || {})
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
}
/** Everyone who took part in the current game, best score first. */
function leaderboard() {
  const st = room.state;
  const answers = room.answers?.[st.game] || {};
  const draws = room.draws?.[st.game] || {};
  const ids = new Set([...Object.keys(answers), ...Object.keys(draws)]);
  const rows = [...ids].map((id) => ({
    id,
    name: room.players?.[id]?.name || "ผู้เล่นที่ออกไปแล้ว",
    score: scoreOf(st, answers[id]),
  }));
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
const usedWords = new Set();
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

function renderHostRoom() {
  const st = room.state || {};
  const ph = phaseOf(st);
  const players = sortedPlayers();
  const game = st.game;
  const draws = room.draws?.[game] || {};
  const answers = room.answers?.[game] || {};
  $("playerCount").textContent = `(${players.filter((p) => p.online).length}/${players.length})`;
  $("playerList").innerHTML = players.length
    ? players
        .map((p) => {
          let tag = "";
          if (ph.name === "draw" || ph.name === "count") tag = `${Object.keys(draws[p.id] || {}).length}/${st.n}`;
          else if (ph.name === "order") tag = answers[p.id]?.done ? "✅" : "…";
          else if (ph.name === "reveal") tag = scoreOf(st, answers[p.id]) ?? "–";
          return `<li><span class="tl-dot${p.online ? " on" : ""}"></span><span class="sd-pname">${esc(p.name)}</span>
            <b class="tl-num">${tag}</b>
            <button class="sd-kick tl-nobig" data-kick="${p.id}" aria-label="เอาออก">✕</button></li>`;
        })
        .join("")
    : '<li class="tl-hint">ยังไม่มีใครเข้าห้อง</li>';

  // everyone online has pressed "done" → reveal without waiting for the clock
  if (ph.name === "order") {
    const online = players.filter((p) => p.online);
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
      beep(ph.i === 0 ? 1175 : 880, 200);
    }
    if (ph.name === "order") beep(660, 300);
    if (ph.name === "reveal") {
      revealSig = "";
      galIdx = 0;
      beep(1319, 350);
    }
    renderHostRoom();
  }
  if (ph.name === "count") {
    const n = Math.min(3, secs(ph.left));
    $("hCountNum").textContent = n;
    if (lastBeep !== "c" + n) beep(660, 120);
    lastBeep = "c" + n;
  } else if (ph.name === "draw") {
    const s = secs(ph.left);
    $("hSecs").textContent = s;
    $("hBar").style.width = `${ph.frac * 100}%`;
    $("hBar").classList.toggle("hurry", s <= 3);
    if (s <= 3 && lastBeep !== `d${ph.i}-${s}`) beep(520, 70);
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
    const done = Object.values(answers).filter((a) => a?.done).length;
    $("hDone").textContent = `เรียงเสร็จแล้ว ${done}/${sortedPlayers().filter((p) => p.online).length} คน`;
  }
}

// ---- host setting: seconds per drawing (remembered on this computer)
const SETTINGS_KEY = "staygo-speed-draw-settings";
let lastShapeSet = null;
try {
  const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  if (s.secs) $("drawSecs").value = String(s.secs);
} catch {}
// an unknown saved value leaves the select empty: fall back to the default
if (!$("drawSecs").value) $("drawSecs").value = String(DRAW_MS / 1000);
function settingsChanged() {
  $("lobbyInfo").textContent = `${ROUNDS} โจทย์ · ข้อละ ${$("drawSecs").value} วินาที · เรียงรูป ${ORDER_MS / 60000} นาที`;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ secs: +$("drawSecs").value }));
  } catch {}
}
$("drawSecs").onchange = settingsChanged;
settingsChanged();

/** 10 prompts from one shape set, so the drawings look alike; a different set from last game. */
function pickPrompts() {
  const sets = SHAPE_SETS.filter((s) => s.key !== lastShapeSet);
  const set = sets[Math.floor(Math.random() * sets.length)];
  lastShapeSet = set.key;
  const words = set.words;
  // avoid repeating words from earlier games in this room until the set runs out
  let pool = words.filter((w) => !usedWords.has(w));
  if (pool.length < ROUNDS) {
    words.forEach((w) => usedWords.delete(w));
    pool = [...words];
  }
  const out = shuffle([...pool]).slice(0, ROUNDS);
  out.forEach((w) => usedWords.add(w));
  return out;
}

async function startGame() {
  if (!sortedPlayers().length && !confirm("ยังไม่มีผู้เล่นในห้อง เริ่มเลยไหม?")) return;
  const prev = room?.state?.game || 0;
  const g = prev + 1;
  const drawMs = Math.min(20, Math.max(3, +$("drawSecs").value || DRAW_MS / 1000)) * 1000;
  const t0 = now() + LEAD_MS;
  const drawEnd = t0 + ROUNDS * drawMs;
  try {
    await write(`live/${code}/state`, {
      round: g, locked: false, game: g, n: ROUNDS, drawMs,
      startAt: t0, drawEnd, orderEnd: drawEnd + ORDER_MS,
      prompts: pickPrompts(), show: shuffle(range(ROUNDS)), reveal: false,
    });
  } catch {
    return toast("เริ่มเกมไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
  if (prev) clearGame(prev);
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
          <span class="sd-bscore tl-num">${r.score ?? "–"}<small>/${st.n}</small></span></li>`,
        )
        .join("")
    : '<li class="tl-hint">ไม่มีใครส่งคำตอบ</li>';

  // gallery: everyone's drawing for one prompt, ✅ when they placed it on the right prompt
  const slotOf = st.show.indexOf(galIdx);
  $("galNo").textContent = `${galIdx + 1}/${st.n}`;
  $("galWord").textContent = st.prompts[galIdx];
  $("galGrid").innerHTML = rows.length
    ? rows
        .map((r) => {
          const img = draws[r.id]?.[galIdx];
          const o = parseOrder(answers[r.id], st.n);
          const ok = o && o[slotOf] === galIdx;
          return `<figure class="sd-galitem">
            <div class="sd-galimg">${img ? `<img src="${img}" alt="รูปของ ${esc(r.name)}" />` : "<span>ไม่ได้วาด</span>"}<i class="${ok ? "ok" : "no"}">${ok ? "✓" : "✗"}</i></div>
            <figcaption>${esc(r.name)}</figcaption></figure>`;
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
  G = { game: st.game, n: st.n, drawings: Array(st.n).fill(null), saved: new Set(), cur: -1, slots: null, done: false, sel: null, fetched: false };
  clearPad();
}

function playerTick() {
  if (role !== "player" || !room || !joined) return;
  const st = room.state || {};
  const ph = phaseOf(st);
  if (st.startAt) ensureGame(st);

  if (G && G.cur >= 0 && (ph.name !== "draw" || ph.i !== G.cur || st.game !== G.game)) saveRound(G.cur);
  if (ph.name === "draw" && G.cur !== ph.i) startRound(st, ph.i);

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
  if (ph.name === "reveal") renderRank();
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
  if (!g.slots) {
    const mine = room.answers?.[g.game]?.[uid()];
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
  $("slots").innerHTML = G.slots
    .map(
      (d, k) => `<li><span class="sd-word"><b class="tl-num">${k + 1}</b> ${esc(st.prompts[st.show[k]])}</span>
      <button class="sd-thumb${G.sel === k ? " sel" : ""}" data-k="${k}">${tile(G.drawings[d])}</button></li>`,
    )
    .join("");
  $("doneBtn").textContent = G.done ? "✏️ แก้ต่อ" : "✅ เสร็จแล้ว";
  $("doneBtn").className = `sg-btn block ${G.done ? "" : "blue"}`;
  $("slots").classList.toggle("locked", G.done);
}

$("slots").addEventListener("click", (e) => {
  const b = e.target.closest("[data-k]");
  if (!b || !G?.slots || G.done || phaseOf(room?.state).name !== "order") return;
  const k = +b.dataset.k;
  if (G.sel === null) G.sel = k;
  else if (G.sel === k) G.sel = null;
  else {
    [G.slots[G.sel], G.slots[k]] = [G.slots[k], G.slots[G.sel]];
    G.sel = null;
    navigator.vibrate?.(20);
    saveAnswer();
  }
  renderSlots();
});
$("doneBtn").onclick = () => {
  if (!G?.slots) return;
  G.done = !G.done;
  G.sel = null;
  saveAnswer();
  renderSlots();
};

async function enterReveal() {
  const st = room.state;
  if (!G || G.game !== st.game) ensureGame(st);
  if (!G.slots) {
    // refreshed during the reveal, or never reached the ordering screen
    await enterOrder().catch(() => {});
  }
  const o = G.slots || range(st.n);
  let score = 0;
  $("pResult").innerHTML = o
    .map((d, k) => {
      const ok = d === st.show[k];
      if (ok) score++;
      return `<li class="${ok ? "ok" : "no"}"><span class="sd-word"><b class="tl-num">${k + 1}</b> ${esc(st.prompts[st.show[k]])}</span>
        <div class="sd-thumb">${tile(G.drawings[d])}<i>${ok ? "✓" : "✗"}</i></div>
        ${ok ? "" : `<small>รูปนี้คือ “${esc(st.prompts[d])}”</small>`}</li>`;
    })
    .join("");
  $("pScore").innerHTML = `${score}<small>/${st.n}</small>`;
  if (score === st.n) beep(1319, 400);
  renderRank();
}
function renderRank() {
  const rows = leaderboard();
  const me = rows.find((r) => r.id === uid());
  $("pRank").textContent = me && rows.length > 1 ? `อันดับ ${me.rank} จาก ${rows.length} คน` : "ข้อที่เรียงถูก";
}

$("leaveBtn").onclick = () => {
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
  unwatch?.();
  clearSession(KIND);
  code = role = room = null;
  document.body.classList.remove("sd-ingame");
  toast("คุณถูกเอาออกจากห้อง");
  startScreen();
}
function closedRoom() {
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

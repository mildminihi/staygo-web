// ใครวาดมั่ว: everyone but one player (the spy) sees a secret word. Players take turns adding one
// stroke each to a shared picture shown on the center screen, then vote for the spy. A caught spy
// can still win by guessing the word.
//
// The center screen (host) is the referee: it picks the word and spy, writes each player's role to
// liveRoles/{code}/{uid} (readable only by that player), and moves the turn on. Strokes go to
// strokes/{game}/{turn}: the drawer writes partial points while drawing (so the screen shows the
// line as it's drawn) and done:true when the finger lifts. Votes: accuse/{game}/{uid} = target uid.
// The spy's guess: guess/{game}.
import {
  connect, createRoom, joinRoom, leaveRoom, watchRoom, watch, roomMeta, normalizeCode,
  write, patch, remove, uid, now, serverTime, loadSession, clearSession, joinUrl, qrSvg,
  $, esc, toast, beep, copyText, sfx,
} from "/assets/js/live-room.js";
import { CATEGORIES } from "./words.js";

const KIND = "scribble-spy";
const NAME_KEY = "staygo-live-name";
const SETTINGS_KEY = "staygo-scribble-spy-settings";
const HISTORY_KEY = "staygo-scribble-spy-history"; // recently used words, so new games don't repeat
const MIN_PLAYERS = 3;
const VOTE_MS = 60000;
const GUESS_MS = 45000;
const GRACE_MS = 1500; // extra time to finish a line that's already being drawn
const PAD = 600;
const LINE_W = 8;
const MAX_PTS = 1400; // points per stroke (keeps each write small)
const COLORS = [
  "#e63946", "#1d6fe0", "#2a9d48", "#f4a300", "#8e44ad", "#ff6fae", "#00a6a6", "#8b5a2b",
  "#231f20", "#ff7a1a", "#5c6bc0", "#9acd32", "#c2185b", "#26c6da", "#795548", "#7f8c8d",
  "#b71c1c", "#0d47a1", "#1b5e20", "#ffd000",
];

let FB = null;
let code = null;
let role = null;
let room = null;
let unwatch = null;
let unwatchRole = null;
let joined = false;

const show = (id) => {
  for (const s of ["start", "host", "player"]) $(s).hidden = s !== id;
  $("loading").hidden = true;
  document.body.classList.toggle("sd-joined", id === "player");
};
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const secs = (ms) => Math.max(0, Math.ceil(ms / 1000));
const norm = (s) => String(s || "").toLowerCase().replace(/[\s.\-_'"!?]/g, "");
// a guess counts in Thai or, for players using the English site, in English ("a"/"the" optional)
const noArticle = (s) => norm(String(s || "").trim().replace(/^(a|an|the)\s+/i, ""));
function guessMatches(guess, word) {
  if (norm(guess) === norm(word)) return true;
  const en = window.STAYGO_I18N?.en(word);
  if (!en) return false;
  const g = noArticle(guess);
  return g === noArticle(en) || g === noArticle(en.replace(/\s*\(.*\)$/, "")); // "Krasue (floating head ghost)"
}
const colorOf = (st, id) => COLORS[(st.colors?.[id] ?? 0) % COLORS.length];
const nameOf = (id) => room?.players?.[id]?.name || "ผู้เล่นที่ออกไปแล้ว";
const dot = (st, id) => `<i class="ss-dot" style="--c:${colorOf(st, id)}"></i>`;
const turnsOf = (st) => (Array.isArray(st.turns) ? st.turns : Object.values(st.turns || {}));
const strokesOf = (st) => room?.strokes?.[st.game] || {};
/** Everyone dealt into the current game, in turn order, once each. */
const artistsOf = (st) => [...new Set(turnsOf(st))];

function sortedPlayers() {
  return Object.entries(room?.players || {})
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
}

// ---------------------------------------------------------------- shared board drawing
function decode(p) {
  if (!p) return [];
  return String(p).split(",").map(Number);
}
function drawStroke(ctx, pts, color, w = LINE_W) {
  if (pts.length < 2) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  if (pts.length === 2) ctx.lineTo(pts[0] + 0.01, pts[1]);
  for (let k = 2; k < pts.length; k += 2) ctx.lineTo(pts[k], pts[k + 1]);
  ctx.stroke();
}
/** Paints every stroke of the current game; `skip` leaves one turn out (the one being drawn locally). */
function paintBoard(canvas, st, skip = -1) {
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, PAD, PAD);
  const turns = turnsOf(st);
  const strokes = strokesOf(st);
  for (const [i, s] of Object.entries(strokes)) {
    if (+i === skip || !s?.p) continue;
    drawStroke(ctx, decode(s.p), colorOf(st, turns[+i]));
  }
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

// ================================================================ HOST (center screen)
let hostRoles = null; // liveRoles/{code}: { uid: {word} | {spy:true} }
let acted = ""; // last automatic step taken, so a tick never repeats it
let hostShown = "";
let lastBeep = "";

async function enterHost(c) {
  code = c;
  role = "host";
  hostShown = "";
  acted = "";
  show("host");
  $("hostCode").textContent = c;
  $("qr").innerHTML = await qrSvg(joinUrl(c));
  unwatch?.();
  unwatchRole?.();
  unwatchRole = watch(`liveRoles/${c}`, (v) => (hostRoles = v));
  unwatch = watchRoom(c, (v) => {
    room = v;
    if (!v?.meta) return closedRoom();
    renderHost();
    hostTick();
  });
}

const spyOf = () => Object.keys(hostRoles || {}).find((id) => hostRoles[id]?.spy);
const wordOf = () => Object.values(hostRoles || {}).find((r) => r?.word)?.word;

// ---- settings (remembered on this computer)
$("catSel").innerHTML =
  `<option value="">🎲 สุ่มหมวด</option>` + CATEGORIES.map((c) => `<option value="${c.key}">${c.name} (${c.words.length} คำ)</option>`).join("");
try {
  const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
  if (s.cat != null) $("catSel").value = s.cat;
  if (s.laps != null) $("lapSel").value = String(s.laps);
  if (s.turn) $("turnSel").value = String(s.turn);
} catch {}
if ($("catSel").selectedIndex < 0) $("catSel").value = "";
if (!$("lapSel").value) $("lapSel").value = "0";
if (!$("turnSel").value) $("turnSel").value = "20";
function lapsFor(n) {
  return +$("lapSel").value || (n <= 10 ? 2 : 1);
}
function settingsChanged() {
  const n = sortedPlayers().filter((p) => p.online).length;
  const laps = lapsFor(Math.max(n, MIN_PLAYERS));
  const cat = CATEGORIES.find((c) => c.key === $("catSel").value)?.name || "สุ่มหมวด";
  const need = n < MIN_PLAYERS ? ` · ต้องมีอย่างน้อย ${MIN_PLAYERS} คน` : "";
  $("lobbyInfo").textContent = `${cat} · คนละ ${laps} เส้น · เส้นละ ${$("turnSel").value} วินาที${need}`;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ cat: $("catSel").value, laps: +$("lapSel").value, turn: +$("turnSel").value }));
  } catch {}
}
$("catSel").onchange = settingsChanged;
$("lapSel").onchange = settingsChanged;
$("turnSel").onchange = settingsChanged;

function pickWord() {
  let used = [];
  try {
    used = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {}
  const lastCat = CATEGORIES.find((c) => c.words.includes(used[0]))?.key;
  const pool0 = CATEGORIES.filter((c) => c.key !== lastCat);
  const cat = CATEGORIES.find((c) => c.key === $("catSel").value) || pool0[Math.floor(Math.random() * pool0.length)];
  const fresh = cat.words.filter((w) => !used.includes(w));
  const pool = fresh.length ? fresh : cat.words;
  const word = pool[Math.floor(Math.random() * pool.length)];
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify([word, ...used.filter((w) => w !== word)].slice(0, 150)));
  } catch {}
  return { cat, word };
}

async function startGame() {
  const players = sortedPlayers().filter((p) => p.online);
  if (players.length < MIN_PLAYERS) return toast(`ต้องมีผู้เล่นออนไลน์อย่างน้อย ${MIN_PLAYERS} คน`);
  const st0 = room.state || {};
  const prev = st0.game || 0;
  const g = prev + 1;
  const { cat, word } = pickWord();
  const order = shuffle(players.map((p) => p.id));
  const spy = order[Math.floor(Math.random() * order.length)];
  // the spy never draws first: they get to see at least one line
  if (order[0] === spy) [order[0], order[1]] = [order[1], order[0]];
  const laps = lapsFor(order.length);
  const turns = Array.from({ length: laps }, () => order).flat();
  const colors = Object.fromEntries(order.map((id, k) => [id, k]));
  const roles = Object.fromEntries(order.map((id) => [id, id === spy ? { spy: true } : { word }]));
  const turnMs = Math.min(30, Math.max(5, +$("turnSel").value || 20)) * 1000;
  try {
    await write(`liveRoles/${code}`, roles);
    hostRoles = roles;
    acted = "";
    await write(`live/${code}/state`, {
      round: g, locked: false, game: g, phase: "draw", cat: cat.key, catName: cat.name,
      turns, colors, turnMs, turn: 0, turnAt: now() + 2500, scores: st0.scores || {},
    });
  } catch {
    return toast("เริ่มเกมไม่สำเร็จ ลองใหม่อีกครั้ง");
  }
  if (prev) clearGame(prev);
}
function clearGame(g) {
  for (const p of ["strokes", "accuse", "guess"]) remove(`live/${code}/${p}/${g}`).catch(() => {});
}
$("startBtn").onclick = startGame;
$("againBtn").onclick = startGame;
$("stopBtn").onclick = async () => {
  if (!confirm("หยุดเกมนี้แล้วกลับไปหน้ารอ?")) return;
  const st = room?.state || {};
  const g = st.game || 0;
  await write(`live/${code}/state`, { round: g, locked: false, game: g, scores: st.scores || {} });
  clearGame(g);
  remove(`liveRoles/${code}`).catch(() => {});
};

// ---- the referee: runs on every change and every 100 ms
function hostTick() {
  if (role !== "host" || !room) return;
  const st = room.state || {};
  const phase = st.phase || "lobby";
  const t = now();

  if (phase === "draw") {
    const turns = turnsOf(st);
    const i = st.turn || 0;
    const s = strokesOf(st)[i];
    const who = turns[i];
    const p = room.players?.[who];
    const left = st.turnAt + st.turnMs - t;
    const key = `${st.game}-t${i}`;
    if (acted !== key) {
      if (s?.done) nextTurn(st, i, key);
      else if (!p || (!p.online && t > st.turnAt)) skipTurn(st, i, key, s);
      else if (left < -(s ? GRACE_MS : 0)) skipTurn(st, i, key, s);
    }
    const sec = secs(left);
    $("hBar").style.width = `${Math.max(0, Math.min(1, left / st.turnMs)) * 100}%`;
    $("hBar").classList.toggle("hurry", sec <= 5);
    if (sec <= 3 && sec > 0 && lastBeep !== `${key}-${sec}`) sfx("tick");
    lastBeep = `${key}-${sec}`;
  } else if (phase === "vote") {
    const voters = artistsOf(st).filter((id) => room.players?.[id]?.online);
    const votes = room.accuse?.[st.game] || {};
    const n = voters.filter((id) => votes[id]).length;
    $("hVoted").textContent = `โหวตแล้ว ${n}/${voters.length} คน · เหลือ ${secs(st.voteEnd - t)} วินาที`;
    $("hBar").style.width = `${Math.max(0, (st.voteEnd - t) / VOTE_MS) * 100}%`;
    $("hBar").classList.toggle("hurry", st.voteEnd - t < 10000);
    const key = `${st.game}-vote`;
    if (acted !== key && ((voters.length && n >= voters.length) || t > st.voteEnd)) {
      acted = key;
      closeVote(st);
    }
  } else if (phase === "guess") {
    const gs = room.guess?.[st.game];
    const key = `${st.game}-guess`;
    $("hBar").style.width = `${Math.max(0, (st.guessEnd - t) / GUESS_MS) * 100}%`;
    $("hBar").classList.toggle("hurry", st.guessEnd - t < 10000);
    if (acted !== key) {
      if (gs?.text && guessMatches(gs.text, wordOf())) {
        acted = key;
        finish(st, true, true, gs.text);
      } else if (!gs && t > st.guessEnd) {
        acted = key;
        finish(st, true, false, "");
      }
    }
  }
}

function nextTurn(st, i, key) {
  acted = key;
  const turns = turnsOf(st);
  if (i + 1 >= turns.length) {
    patch(`live/${code}/state`, { phase: "vote", voteEnd: now() + VOTE_MS }).catch(() => (acted = ""));
    sfx("whoosh");
    setTimeout(() => sfx("notify"), 300);
  } else {
    patch(`live/${code}/state`, { turn: i + 1, turnAt: now() }).catch(() => (acted = ""));
    sfx("pop");
  }
}
function skipTurn(st, i, key, s) {
  acted = key;
  const done = s ? { ...s, done: true } : { p: "", done: true, skip: true };
  write(`live/${code}/strokes/${st.game}/${i}`, done)
    .then(() => nextTurn(st, i, key))
    .catch(() => (acted = ""));
}

function tally(st) {
  const votes = room.accuse?.[st.game] || {};
  const count = {};
  for (const [voter, target] of Object.entries(votes)) {
    if (voter !== target && room.players?.[target]) count[target] = (count[target] || 0) + 1;
  }
  return count;
}
function closeVote(st) {
  const count = tally(st);
  const max = Math.max(0, ...Object.values(count));
  const top = Object.keys(count).filter((id) => count[id] === max);
  const spy = spyOf();
  if (max > 0 && top.length === 1 && top[0] === spy) {
    patch(`live/${code}/state`, { phase: "guess", guessEnd: now() + GUESS_MS, tally: count }).catch(() => (acted = ""));
    sfx("drumroll", 1.0);
    setTimeout(() => sfx("reveal"), 1000);
  } else finish({ ...st, tally: count }, false, false, "");
}
/** caught: the vote found the spy; correct: the spy then guessed the word. */
function finish(st, caught, correct, guess) {
  const spy = spyOf();
  const scores = { ...(st.scores || {}) };
  const spyWins = !caught || correct;
  if (spyWins) scores[spy] = (scores[spy] || 0) + 2;
  else for (const id of artistsOf(st)) if (id !== spy) scores[id] = (scores[id] || 0) + 1;
  patch(`live/${code}/state`, {
    phase: "result",
    scores,
    result: { spy, word: wordOf() || "", caught, correct, guess: guess || "", spyWins, tally: st.tally || tally(st) },
  }).catch(() => (acted = ""));
  sfx(spyWins ? "lose" : "fanfare");
}
$("closeVote").onclick = () => {
  const st = room?.state;
  if (st?.phase !== "vote") return;
  acted = `${st.game}-vote`;
  closeVote(st);
};
$("judgeYes").onclick = () => judge(true);
$("judgeNo").onclick = () => judge(false);
function judge(ok) {
  const st = room?.state;
  if (st?.phase !== "guess") return;
  acted = `${st.game}-guess`;
  finish(st, true, ok, room.guess?.[st.game]?.text || "");
}

// ---- host rendering
let seenPlayers = -1;
function renderHost() {
  const st = room.state || {};
  const phase = st.phase || "lobby";
  const players = sortedPlayers();
  const scores = st.scores || {};
  const inGame = new Set(turnsOf(st));
  $("playerCount").textContent = `(${players.filter((p) => p.online).length}/${players.length})`;
  if (players.length > seenPlayers && seenPlayers >= 0) sfx("join");
  seenPlayers = players.length;
  $("playerList").innerHTML = players.length
    ? players
        .map((p) => {
          const c = inGame.has(p.id) ? dot(st, p.id) : "";
          let tag = scores[p.id] ? `${scores[p.id]}` : "";
          if (phase === "vote") tag = room.accuse?.[st.game]?.[p.id] ? "✅" : inGame.has(p.id) ? "…" : "";
          return `<li><span class="tl-dot${p.online ? " on" : ""}"></span>${c}<span class="sd-pname">${esc(p.name)}</span>
            <b class="tl-num">${tag}</b>
            <button class="sd-kick tl-nobig" data-kick="${p.id}" aria-label="เอาออก">✕</button></li>`;
        })
        .join("")
    : '<li class="tl-hint">ยังไม่มีใครเข้าห้อง</li>';

  const view = phase === "lobby" ? "lobby" : "game";
  if (hostShown !== view + phase + (st.game || 0)) {
    hostShown = view + phase + (st.game || 0);
    $("hLobby").hidden = view !== "lobby";
    $("hGame").hidden = view !== "game";
    $("againBtn").hidden = phase !== "result";
    $("stopBtn").hidden = !["draw", "vote", "guess"].includes(phase);
    $("hVote").hidden = phase !== "vote";
    $("hGuess").hidden = phase !== "guess";
    $("hResult").hidden = phase !== "result";
    $("hTurn").hidden = $("hQueue").hidden = phase !== "draw";
    document.querySelector("#hGame .sd-bar").hidden = !["draw", "vote", "guess"].includes(phase);
  }
  if (view === "lobby") return settingsChanged();

  $("hCat").textContent = st.catName || "";
  paintBoard($("board"), st);
  const turns = turnsOf(st);
  if (phase === "draw") {
    const i = st.turn || 0;
    const who = turns[i];
    $("hStatus").textContent = `เส้นที่ ${i + 1}/${turns.length}`;
    $("hTurn").innerHTML = `${dot(st, who)}<span>ตาของ <b>${esc(nameOf(who))}</b></span>`;
    // queue: the next few turns, current first
    $("hQueue").innerHTML = turns
      .slice(i, i + 8)
      .map((id, k) => `<li class="${k ? "" : "now"}">${dot(st, id)}<span>${esc(nameOf(id))}</span>${k ? "" : " ✏️"}</li>`)
      .join("");
  } else if (phase === "vote") {
    $("hStatus").textContent = "วาดครบแล้ว!";
  } else if (phase === "guess") {
    const spy = spyOf();
    const gs = room.guess?.[st.game];
    $("hStatus").textContent = "ช่วงเดาคำ";
    $("hSpyName").innerHTML = `${dot(st, spy)}${esc(nameOf(spy))}`;
    $("hGuessText").innerHTML = gs?.text ? `เดาว่า <b>“${esc(gs.text)}”</b>` : `<span class="tl-hint">กำลังคิด… (${secs(st.guessEnd - now())} วิ)</span>`;
    $("hJudge").hidden = !gs?.text;
  } else if (phase === "result") {
    $("hStatus").textContent = "เฉลย";
    renderResult($("hResult"), st, true);
  }
}

/** Result panel (center screen and phones). */
function renderResult(el, st, host) {
  const r = st.result || {};
  const spyName = esc(nameOf(r.spy));
  let verdict;
  if (!r.caught) verdict = `🕵️ คนวาดมั่วรอด! จับไม่ได้`;
  else if (r.correct) verdict = `😈 จับได้ แต่ ${spyName} เดาคำถูก!`;
  else verdict = `🎉 จับคนวาดมั่วได้!`;
  const count = r.tally || {};
  const rows = Object.entries(count).sort((a, b) => b[1] - a[1]);
  const scores = Object.entries(st.scores || {})
    .filter(([id]) => room.players?.[id])
    .sort((a, b) => b[1] - a[1]);
  el.innerHTML = `
    <div class="ss-verdict ${r.spyWins ? "spy" : "art"}">${verdict}</div>
    <div class="ss-reveal">
      <div><small>คำลับคือ</small><b>${esc(r.word)}</b></div>
      <div><small>คนวาดมั่วคือ</small><b>${dot(st, r.spy)}${spyName}</b></div>
    </div>
    ${r.guess ? `<p class="tl-hint">คนวาดมั่วเดาว่า “${esc(r.guess)}” ${r.correct ? "✅" : "❌"}</p>` : ""}
    ${
      rows.length
        ? `<p class="ss-sub">ผลโหวต</p><ul class="ss-tally">${rows
            .map(([id, n]) => `<li class="${id === r.spy ? "spy" : ""}">${dot(st, id)}<span>${esc(nameOf(id))}</span><b class="tl-num">${n}</b></li>`)
            .join("")}</ul>`
        : `<p class="tl-hint">ไม่มีใครโหวต</p>`
    }
    ${
      host && scores.length
        ? `<p class="ss-sub">คะแนนรวม</p><ol class="ss-tally score">${scores
            .slice(0, 10)
            .map(([id, n]) => `<li>${artistsOf(st).includes(id) ? dot(st, id) : ""}<span>${esc(nameOf(id))}</span><b class="tl-num">${n}</b></li>`)
            .join("")}</ol>`
        : ""
    }`;
}

$("host").addEventListener("click", (e) => {
  const k = e.target.closest("[data-kick]");
  if (k && confirm(`เอา ${room?.players?.[k.dataset.kick]?.name || "ผู้เล่น"} ออกจากห้อง?`)) remove(`live/${code}/players/${k.dataset.kick}`);
});
$("copyLink").onclick = () => copyText(joinUrl(code));
document.addEventListener("keydown", (e) => {
  if (role === "host" && e.key === "Escape") setBig(false);
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
  unwatchRole?.();
  for (const id of Object.keys(room?.players || {})) await remove(`live/${c}/players/${id}`).catch(() => {});
  for (const p of ["strokes", "accuse", "guess", "state", "meta"]) await remove(`live/${c}/${p}`).catch(() => {});
  await remove(`liveRoles/${c}`).catch(() => {});
  clearSession(KIND);
  code = role = room = null;
  setBig(false);
  startScreen();
};

// ================================================================ PLAYER
let myRole = null; // {word} | {spy:true} | null
let roleHidden = false;
let pShown = "";
let myTurnKey = "";
let sent = ""; // `${game}-${turn}` once this phone has finished its line

function enterPlayer(c) {
  code = c;
  role = "player";
  joined = false;
  pShown = "";
  show("player");
  $("meCode").textContent = c;
  unwatch?.();
  unwatchRole?.();
  unwatchRole = watch(`liveRoles/${c}/${uid()}`, (v) => {
    myRole = v;
    renderRole();
  });
  unwatch = watchRoom(c, (v) => {
    if (!v?.meta) return closedRoom();
    room = v;
    const me = v.players?.[uid()];
    if (!me) {
      if (joined) return kicked();
      return;
    }
    joined = true;
    $("meName").textContent = me.name;
    renderPlayer();
  });
}

const inThisGame = (st) => turnsOf(st).includes(uid());

function renderRole() {
  const st = room?.state || {};
  const el = $("roleCard");
  if (!st.phase || st.phase === "lobby") return;
  if (!inThisGame(st)) {
    el.className = "ss-role watch";
    el.innerHTML = `<small>หมวด ${esc(st.catName || "")}</small><b>👀 รอเล่นเกมหน้า</b>`;
    return;
  }
  if (!myRole) {
    el.className = "ss-role";
    el.innerHTML = "<b>กำลังรับคำ…</b>";
    return;
  }
  const spy = !!myRole.spy;
  el.className = `ss-role ${spy ? "spy" : ""} ${roleHidden ? "hid" : ""}`;
  el.innerHTML = roleHidden
    ? `<small>หมวด ${esc(st.catName || "")}</small><b>👁️ แตะเพื่อดูคำ</b>`
    : spy
      ? `<small>หมวด ${esc(st.catName || "")} · แตะเพื่อซ่อน</small><b>🕵️ คุณคือคนวาดมั่ว!</b><span>คุณไม่รู้คำ ดูภาพแล้ววาดให้เนียน</span>`
      : `<small>หมวด ${esc(st.catName || "")} · แตะเพื่อซ่อน</small><b>${esc(myRole.word)}</b><span>อย่าวาดชัดเกิน เดี๋ยวคนวาดมั่วเดาออก</span>`;
}
$("roleCard").onclick = () => {
  roleHidden = !roleHidden;
  renderRole();
};

function renderPlayer() {
  if (role !== "player" || !room || !joined) return;
  const st = room.state || {};
  const phase = st.phase || "lobby";
  const key = phase + (st.game || 0);
  const mine = inThisGame(st);
  const sc = st.scores?.[uid()];
  $("meScore").textContent = sc ? `· ${sc} แต้ม` : "";
  $("meDot").hidden = !mine || phase === "lobby";
  $("meDot").style.setProperty("--c", colorOf(st, uid()));

  if (pShown !== key) {
    pShown = key;
    $("pLobby").hidden = phase !== "lobby";
    $("pGame").hidden = phase === "lobby";
    $("pVote").hidden = phase !== "vote" || !mine;
    $("pGuess").hidden = true;
    $("pResult").hidden = phase !== "result";
    $("pCta").hidden = phase !== "result";
    document.body.classList.toggle("sd-ingame", phase !== "lobby");
    if (phase === "draw") roleHidden = false;
    if (phase === "result") {
      const r = st.result || {};
      const iAmSpy = r.spy === uid();
      sfx(iAmSpy === !!r.spyWins ? "win" : "lose");
    }
    if (phase === "vote" && mine) sfx("notify");
    if (phase === "draw" && st.turn === 0) sfx("reveal");
    $("guessInput").value = "";
    $("guessBtn").disabled = false;
  }
  if (phase === "lobby") {
    $("pLobbyText").textContent = st.game ? "จบเกมแล้ว รอจอกลางเริ่มเกมใหม่" : "รอจอกลางกดเริ่มเกม";
    return;
  }
  renderRole();
  if (!stroke) paintBoard(pad, st);

  if (phase === "draw") {
    const turns = turnsOf(st);
    const i = st.turn || 0;
    const who = turns[i];
    const myTurn = who === uid() && !strokesOf(st)[i]?.done && sent !== `${st.game}-${i}`;
    if (myTurn && myTurnKey !== `${st.game}-${i}`) {
      myTurnKey = `${st.game}-${i}`;
      navigator.vibrate?.([80, 60, 80]);
      sfx("turn");
    }
    pad.classList.toggle("mine", myTurn);
    const next = turns.indexOf(uid(), i + (who === uid() ? 1 : 0));
    let status;
    if (myTurn) status = `<b class="ss-go">✏️ ตาคุณ! ลาก 1 เส้น (ยกนิ้ว = ส่ง)</b>`;
    else {
      const wait = next < 0 ? "วาดครบแล้ว" : next === i + 1 ? "ตาถัดไปคือคุณ!" : `อีก ${next - i} ตาถึงคุณ`;
      status = `${dot(st, who)}ตาของ <b>${esc(nameOf(who))}</b> <small>· ${mine ? wait : "ดูอยู่"}</small>`;
    }
    $("pStatus").innerHTML = status;
  } else {
    pad.classList.remove("mine");
  }
  if (phase === "vote") {
    $("pStatus").innerHTML = mine ? "<b>🗳️ โหวตหาคนวาดมั่ว!</b>" : "กำลังโหวต…";
    if (mine) renderVote(st);
  }
  if (phase === "guess") {
    const amSpy = !!myRole?.spy && mine;
    const guessed = !!room.guess?.[st.game];
    $("pGuess").hidden = !amSpy || guessed;
    $("pStatus").innerHTML = amSpy
      ? guessed
        ? `ส่งคำตอบแล้ว รอจอกลางตัดสิน…`
        : `<b>🎯 คุณโดนจับ! เดาคำให้ถูก</b> <small>${secs(st.guessEnd - now())} วิ</small>`
      : `🎯 จับได้! รอคนวาดมั่วเดาคำ…`;
  }
  if (phase === "result") {
    $("pStatus").innerHTML = "";
    renderResult($("pResult"), st, false);
  }
}

function renderVote(st) {
  const votes = room.accuse?.[st.game] || {};
  const mineV = votes[uid()];
  const list = artistsOf(st).filter((id) => id !== uid());
  $("pVoteNote").textContent = mineV ? "· เปลี่ยนได้จนกว่าจะปิดโหวต" : `· เหลือ ${secs(st.voteEnd - now())} วิ`;
  const html = list
    .map((id) => `<button class="ss-votebtn${mineV === id ? " on" : ""}" data-vote="${id}">${dot(st, id)}<span>${esc(nameOf(id))}</span>${mineV === id ? "✔" : ""}</button>`)
    .join("");
  if ($("voteList").innerHTML !== html) $("voteList").innerHTML = html;
}
$("voteList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-vote]");
  const st = room?.state;
  if (!b || st?.phase !== "vote") return;
  write(`live/${code}/accuse/${st.game}/${uid()}`, b.dataset.vote).catch(() => toast("โหวตไม่สำเร็จ"));
  navigator.vibrate?.(20);
  sfx("vote");
});

$("guessBtn").onclick = async () => {
  const st = room?.state;
  const text = $("guessInput").value.trim();
  if (st?.phase !== "guess") return;
  if (!text) return toast("พิมพ์คำที่เดาก่อน");
  $("guessBtn").disabled = true;
  try {
    await write(`live/${code}/guess/${st.game}`, { text: text.slice(0, 40), t: serverTime() });
  } catch {
    $("guessBtn").disabled = false;
    toast("ส่งไม่สำเร็จ");
  }
};
$("guessInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") $("guessBtn").click();
});

$("leaveBtn").onclick = () => {
  unwatch?.();
  unwatchRole?.();
  leaveRoom(KIND, code);
  code = role = room = null;
  startScreen();
};

// ---------------------------------------------------------------- my one line per turn
const pad = $("pad");
const pctx = pad.getContext("2d");
let stroke = null; // { game, turn, pts: [] }
let lastSend = 0;

function myTurnNow() {
  const st = room?.state;
  if (!st || st.phase !== "draw") return null;
  const i = st.turn || 0;
  if (turnsOf(st)[i] !== uid() || strokesOf(st)[i]?.done || sent === `${st.game}-${i}`) return null;
  return { st, i };
}
function point(e) {
  const r = pad.getBoundingClientRect();
  return [Math.round(((e.clientX - r.left) * PAD) / r.width), Math.round(((e.clientY - r.top) * PAD) / r.height)];
}
function sendStroke(done) {
  if (!stroke) return;
  lastSend = Date.now();
  const s = stroke;
  const val = { p: s.pts.join(","), done };
  write(`live/${code}/strokes/${s.game}/${s.turn}`, val).catch(() => {
    if (done) toast("ส่งเส้นไม่ทัน");
  });
}
function repaintMine() {
  if (!stroke) return;
  const st = room.state;
  paintBoard(pad, st, stroke.turn);
  drawStroke(pctx, stroke.pts, colorOf(st, uid()));
}
pad.addEventListener("pointerdown", (e) => {
  const t = myTurnNow();
  if (!t || stroke) return;
  e.preventDefault();
  pad.setPointerCapture?.(e.pointerId);
  stroke = { game: t.st.game, turn: t.i, pts: point(e) };
  repaintMine();
  sendStroke(false);
});
pad.addEventListener("pointermove", (e) => {
  if (!stroke) return;
  const evs = e.getCoalescedEvents?.();
  for (const ev of evs?.length ? evs : [e]) {
    if (stroke.pts.length >= MAX_PTS * 2) break;
    const [x, y] = point(ev);
    const n = stroke.pts.length;
    if (Math.hypot(x - stroke.pts[n - 2], y - stroke.pts[n - 1]) < 3) continue;
    stroke.pts.push(x, y);
  }
  repaintMine();
  if (Date.now() - lastSend > 150) sendStroke(false);
});
function endStroke() {
  if (!stroke) return;
  sendStroke(true);
  sent = `${stroke.game}-${stroke.turn}`;
  stroke = null;
  pad.classList.remove("mine");
  navigator.vibrate?.(30);
  sfx("place");
  renderPlayer();
}
for (const t of ["pointerup", "pointercancel", "lostpointercapture"]) pad.addEventListener(t, endStroke);

// ---------------------------------------------------------------- leaving
function kicked() {
  unwatch?.();
  unwatchRole?.();
  clearSession(KIND);
  code = role = room = null;
  document.body.classList.remove("sd-ingame");
  toast("คุณถูกเอาออกจากห้อง");
  startScreen();
}
function closedRoom() {
  unwatch?.();
  unwatchRole?.();
  clearSession(KIND);
  const was = role;
  code = role = room = null;
  document.body.classList.remove("sd-ingame");
  if (was) toast("ห้องนี้ปิดแล้ว");
  setBig(false);
  startScreen();
}

// ---------------------------------------------------------------- boot
setInterval(() => {
  if (role === "host") {
    hostTick();
    const ph = room?.state?.phase;
    if (ph === "guess") renderHost();
  } else if (role === "player" && room) {
    // countdown text only; the board repaints on data changes
    const ph = room.state?.phase;
    if (ph === "draw") {
      const st = room.state;
      const left = st.turnAt + st.turnMs - now();
      $("pBar").style.width = `${Math.max(0, Math.min(1, left / st.turnMs)) * 100}%`;
      $("pBar").classList.toggle("hurry", left < 5000);
    } else if (ph === "vote" || ph === "guess") {
      const st = room.state;
      const left = (ph === "vote" ? st.voteEnd : st.guessEnd) - now();
      $("pBar").style.width = `${Math.max(0, left / (ph === "vote" ? VOTE_MS : GUESS_MS)) * 100}%`;
      $("pBar").classList.toggle("hurry", left < 10000);
      if (ph === "guess") renderPlayer();
      if (ph === "vote") $("pVoteNote").textContent = room.accuse?.[st.game]?.[uid()] ? "· เปลี่ยนได้จนกว่าจะปิดโหวต" : `· เหลือ ${secs(left)} วิ`;
    }
    $("pBar").parentElement.hidden = !["draw", "vote", "guess"].includes(ph);
  }
}, 100);

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

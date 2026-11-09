// Vote: host asks a question, players vote from their phones, results revealed together.
import {
  connect, createRoom, joinRoom, leaveRoom, watchRoom, roomMeta, normalizeCode,
  write, remove, uid, loadSession, clearSession, joinUrl, qrSvg,
  $, esc, toast, copyText,
} from "/assets/js/live-room.js";

const KIND = "vote";
const NAME_KEY = "staygo-live-name";
const MAX_OPTS = 8;
const PRESETS = [
  { label: "🏆 MVP รอบนี้", q: "MVP ของรอบนี้คือใคร?", players: true },
  { label: "🕵️ ใครโกหก", q: "ใครคือคนโกหก?", players: true },
  { label: "🎲 เล่นเกมไหนต่อ", q: "รอบหน้าเล่นเกมไหนดี?", opts: ["", "", ""] },
  { label: "👍 ใช่ / ไม่ใช่", q: "", opts: ["ใช่", "ไม่ใช่"] },
  { label: "⭐ ให้คะแนน", q: "ให้คะแนนเกมนี้เท่าไหร่?", opts: ["⭐", "⭐⭐", "⭐⭐⭐", "⭐⭐⭐⭐", "⭐⭐⭐⭐⭐"] },
];

let code = null;
let role = null;
let room = null;
let unwatch = null;
let joined = false;
let opts = ["", ""];

const show = (id) => {
  for (const s of ["start", "host", "player"]) $(s).hidden = s !== id;
  $("loading").hidden = true;
};

// ---------------------------------------------------------------- start
function startScreen(prefill) {
  show("start");
  try {
    $("nameInput").value = localStorage.getItem(NAME_KEY) || "";
  } catch {}
  if (prefill) {
    $("codeInput").value = prefill;
    pick("player");
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

// ---------------------------------------------------------------- shared
const playerList = () =>
  Object.entries(room?.players || {})
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));

function tally() {
  const poll = room?.poll;
  if (!poll) return { counts: [], total: 0, mine: null };
  const votes = room?.votes?.[poll.id] || {};
  const counts = poll.options.map(() => 0);
  for (const v of Object.values(votes)) if (counts[v] !== undefined) counts[v]++;
  return { counts, total: Object.keys(votes).length, mine: votes[uid()] ?? null };
}

function barsHTML(poll, counts, total, { reveal, mine }) {
  const max = Math.max(0, ...counts);
  return poll.options
    .map((o, i) => {
      const pct = total ? Math.round((counts[i] / total) * 100) : 0;
      const win = reveal && max > 0 && counts[i] === max;
      return `<div class="vt-bar${win ? " win" : ""}${mine === i ? " mine" : ""}">
        <div class="vt-fill" style="width:${reveal ? pct : 0}%"></div>
        <span class="vt-opt">${win ? "🏆 " : ""}${esc(o)}${mine === i ? ' <small>(คุณ)</small>' : ""}</span>
        <span class="vt-n tl-num">${reveal ? `${counts[i]} · ${pct}%` : ""}</span></div>`;
    })
    .join("");
}

// ---------------------------------------------------------------- host
async function enterHost(c) {
  code = c;
  role = "host";
  show("host");
  $("hostCode").textContent = c;
  $("qr").innerHTML = await qrSvg(joinUrl(c));
  renderEditor();
  unwatch?.();
  unwatch = watchRoom(c, (v) => {
    room = v;
    if (!v?.meta) return closedRoom();
    renderHost();
  });
}

function renderEditor() {
  $("presets").innerHTML = PRESETS.map((p, i) => `<button class="sg-btn small" data-preset="${i}">${p.label}</button>`).join("");
  $("optList").innerHTML = opts
    .map(
      (o, i) => `<div class="vt-optrow"><span class="tl-num">${i + 1}.</span>
        <input class="sg-input" data-opt="${i}" maxlength="40" value="${esc(o)}" placeholder="ตัวเลือก ${i + 1}" />
        <button class="sg-btn small" data-delopt="${i}" ${opts.length <= 2 ? "disabled" : ""} aria-label="ลบตัวเลือก">✕</button></div>`,
    )
    .join("");
  $("addOpt").disabled = opts.length >= MAX_OPTS;
}
$("presets").onclick = (e) => {
  const b = e.target.closest("[data-preset]");
  if (!b) return;
  const p = PRESETS[+b.dataset.preset];
  if (p.q) $("qInput").value = p.q;
  opts = p.players ? playerNames() : p.opts.slice();
  if (opts.length < 2) {
    if (p.players) toast("ยังมีผู้โหวตไม่ถึง 2 คน ใส่ตัวเลือกเองได้");
    while (opts.length < 2) opts.push("");
  }
  renderEditor();
};
const playerNames = () => playerList().map((p) => p.name).slice(0, MAX_OPTS);
$("optList").oninput = (e) => {
  const i = e.target.dataset.opt;
  if (i !== undefined) opts[+i] = e.target.value;
};
$("optList").onclick = (e) => {
  const b = e.target.closest("[data-delopt]");
  if (b && opts.length > 2) {
    opts.splice(+b.dataset.delopt, 1);
    renderEditor();
  }
};
$("addOpt").onclick = () => {
  if (opts.length < MAX_OPTS) opts.push("");
  renderEditor();
};
$("usePlayers").onclick = () => {
  const n = playerNames();
  if (n.length < 2) return toast("ยังมีผู้โหวตไม่ถึง 2 คน");
  opts = n;
  renderEditor();
};
$("openPoll").onclick = async () => {
  const question = $("qInput").value.trim();
  const options = opts.map((o) => o.trim()).filter(Boolean);
  if (!question) return toast("ใส่คำถามก่อน");
  if (options.length < 2) return toast("ต้องมีตัวเลือกอย่างน้อย 2 ข้อ");
  const old = room?.poll?.id;
  await write(`live/${code}/poll`, { id: Date.now().toString(36), question, options, open: true, hide: $("hideLive").checked });
  if (old) remove(`live/${code}/votes/${old}`).catch(() => {});
};
$("closePoll").onclick = () => write(`live/${code}/poll/open`, false);
$("newPoll").onclick = async () => {
  const old = room?.poll?.id;
  await remove(`live/${code}/poll`);
  if (old) remove(`live/${code}/votes/${old}`).catch(() => {});
};
$("copyLink").onclick = () => copyText(joinUrl(code));

function renderHost() {
  const players = playerList();
  $("playerCount").textContent = `(${players.filter((p) => p.online).length}/${players.length})`;
  const poll = room.poll;
  const voters = poll ? room.votes?.[poll.id] || {} : {};
  $("playerList").innerHTML = players.length
    ? players
        .map((p) => `<li><span class="tl-dot${p.online ? " on" : ""}"></span>${esc(p.name)}${poll && voters[p.id] !== undefined ? ' <span class="vt-tick">✓ โหวตแล้ว</span>' : ""}</li>`)
        .join("")
    : '<li class="tl-hint">ยังไม่มีใครเข้าห้อง</li>';

  $("editor").hidden = !!poll;
  $("live").hidden = !poll;
  if (!poll) return;
  const { counts, total } = tally();
  const reveal = !poll.open || !poll.hide;
  $("pollQ").textContent = poll.question;
  $("pollState").textContent = poll.open ? "🟢 เปิดโหวตอยู่" : "🏁 ปิดโหวตแล้ว";
  $("voteCount").textContent = `${total}/${players.length}`;
  $("bars").innerHTML = barsHTML(poll, counts, total, { reveal, mine: null }) + (reveal ? "" : '<p class="tl-hint" style="text-align:center">ผลถูกซ่อนไว้จนกว่าจะปิดโหวต</p>');
  $("closePoll").hidden = !poll.open;
}

function setBig(on) {
  document.body.classList.toggle("tl-big", on);
  $("exitBig").hidden = !on;
}
$("bigBtn").onclick = () => setBig(true);
$("exitBig").onclick = () => setBig(false);
document.addEventListener("keydown", (e) => e.key === "Escape" && setBig(false));

$("endRoom").onclick = async () => {
  if (!confirm("ปิดห้องนี้? ผู้โหวตทุกคนจะหลุดจากห้อง")) return;
  const c = code;
  unwatch?.();
  for (const id of Object.keys(room?.players || {})) await remove(`live/${c}/players/${id}`).catch(() => {});
  await remove(`live/${c}/votes`).catch(() => {});
  await remove(`live/${c}/poll`).catch(() => {});
  await remove(`live/${c}/state`).catch(() => {});
  await remove(`live/${c}/meta`).catch(() => {});
  clearSession(KIND);
  code = role = room = null;
  setBig(false);
  startScreen();
};

// ---------------------------------------------------------------- player
function enterPlayer(c) {
  code = c;
  role = "player";
  joined = false;
  show("player");
  $("meCode").textContent = c;
  unwatch?.();
  unwatch = watchRoom(c, (v) => {
    room = v;
    if (!v?.meta) return closedRoom();
    const me = v.players?.[uid()];
    if (!me) return joined ? kicked() : undefined;
    joined = true;
    $("meName").textContent = me.name;
    renderBallot();
  });
}

function renderBallot() {
  const poll = room.poll;
  const box = $("ballot");
  if (!poll) {
    box.innerHTML = '<p class="vt-wait">รอโฮสต์ตั้งคำถาม…</p>';
    return;
  }
  const { counts, total, mine } = tally();
  if (poll.open) {
    box.innerHTML = `<h2 class="vt-q">${esc(poll.question)}</h2>
      <div class="vt-ballot">${poll.options
        .map((o, i) => `<button class="${mine === i ? "on" : ""}" data-vote="${i}">${esc(o)}</button>`)
        .join("")}</div>
      <p class="tl-hint" style="text-align:center">${mine === null ? "แตะเพื่อโหวต" : "โหวตแล้ว · เปลี่ยนใจได้จนกว่าโฮสต์จะปิดโหวต"}</p>`;
  } else {
    box.innerHTML = `<h2 class="vt-q">${esc(poll.question)}</h2>
      <div class="vt-bars">${barsHTML(poll, counts, total, { reveal: true, mine })}</div>
      <p class="tl-hint" style="text-align:center">ปิดโหวตแล้ว · ${total} คนโหวต</p>`;
  }
}
$("ballot").onclick = async (e) => {
  const b = e.target.closest("[data-vote]");
  if (!b || !room?.poll?.open) return;
  navigator.vibrate?.(30);
  try {
    await write(`live/${code}/votes/${room.poll.id}/${uid()}`, +b.dataset.vote);
  } catch {
    toast("โหวตไม่สำเร็จ โหวตอาจปิดไปแล้ว");
  }
};

$("leaveBtn").onclick = () => {
  unwatch?.();
  leaveRoom(KIND, code);
  code = role = room = null;
  startScreen();
};
function kicked() {
  unwatch?.();
  clearSession(KIND);
  code = role = room = null;
  toast("คุณถูกเอาออกจากห้อง");
  startScreen();
}
function closedRoom() {
  unwatch?.();
  clearSession(KIND);
  const was = role;
  code = role = room = null;
  if (was) toast("ห้องนี้ปิดแล้ว");
  setBig(false);
  startScreen();
}

// ---------------------------------------------------------------- boot
(async function boot() {
  const joinCode = normalizeCode(new URLSearchParams(location.search).get("join"));
  try {
    await connect();
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

// Buzzer: host screen shows the press order; each player's phone is a big button.
import {
  connect, createRoom, joinRoom, leaveRoom, watchRoom, roomMeta, normalizeCode,
  write, patch, remove, serverTime, uid, loadSession, clearSession, joinUrl, qrSvg,
  $, esc, toast, beep, copyText,
} from "/assets/js/live-room.js";

const KIND = "buzzer";
const NAME_KEY = "staygo-live-name";
let code = null;
let role = null;
let room = null;
let unwatch = null;
let lastFirst = null; // host: uid of the first presser this round, to beep once
let joined = false;

const show = (id) => {
  for (const s of ["start", "host", "player"]) $(s).hidden = s !== id;
  $("loading").hidden = true;
};

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

// ---------------------------------------------------------------- host
async function enterHost(c) {
  code = c;
  role = "host";
  show("host");
  $("hostCode").textContent = c;
  $("qr").innerHTML = await qrSvg(joinUrl(c));
  unwatch?.();
  unwatch = watchRoom(c, (v) => {
    room = v;
    if (!v?.meta) return closedRoom();
    renderHost();
  });
}

function sortedPlayers() {
  return Object.entries(room?.players || {})
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
}

function pressOrder() {
  const round = room?.state?.round ?? 1;
  return Object.entries(room?.buzz?.[round] || {})
    .map(([id, b]) => ({ id, t: b.t }))
    .sort((a, b) => a.t - b.t || a.id.localeCompare(b.id));
}

function renderHost() {
  const players = sortedPlayers();
  const names = Object.fromEntries(players.map((p) => [p.id, p.name]));
  const state = room.state || { round: 1, locked: false };
  $("roundNo").textContent = state.round;
  $("lockTag").hidden = !state.locked;
  $("lockBtn").innerHTML = state.locked ? "🔓 ปลดล็อก <small>(L)</small>" : "🔒 ล็อกปุ่ม <small>(L)</small>";
  $("playerCount").textContent = `(${players.filter((p) => p.online).length}/${players.length})`;
  $("playerList").innerHTML = players.length
    ? players
        .map(
          (p) => `<li><span class="tl-dot${p.online ? " on" : ""}"></span><span class="bz-pname">${esc(p.name)}</span>
          <b class="tl-num">${p.score || 0}</b>
          <span class="bz-pbtns tl-nobig"><button data-score="${p.id}" data-d="1" aria-label="บวกแต้ม">+1</button><button data-score="${p.id}" data-d="-1" aria-label="ลบแต้ม">−1</button><button data-kick="${p.id}" aria-label="เอาออก">✕</button></span></li>`,
        )
        .join("")
    : '<li class="tl-hint">ยังไม่มีใครเข้าห้อง</li>';

  const order = pressOrder();
  const first = order[0];
  if (first && first.id !== lastFirst) beep(988, 220);
  lastFirst = first?.id || null;
  $("buzzEmpty").hidden = order.length > 0;
  $("buzzEmpty").textContent = state.locked ? "ล็อกปุ่มอยู่ กด ปลดล็อก เพื่อเริ่ม" : "รอคนกด…";
  $("buzzList").innerHTML = order
    .map(
      (b, i) => `<li class="${i === 0 ? "first" : ""}"><span class="bz-rank tl-num">${i + 1}</span>
        <span class="bz-bname">${esc(names[b.id] || "?")}</span>
        <span class="bz-delta tl-num">${i === 0 ? "ก่อนใคร!" : `+${((b.t - first.t) / 1000).toFixed(2)} วิ`}</span>
        ${i === 0 ? `<button class="sg-btn small yellow tl-nobig" data-score="${b.id}" data-d="1">+1 แต้ม</button>` : ""}</li>`,
    )
    .join("");
}

$("host").addEventListener("click", (e) => {
  const s = e.target.closest("[data-score]");
  if (s) {
    const p = room?.players?.[s.dataset.score];
    if (p) write(`live/${code}/players/${s.dataset.score}/score`, Math.max(0, (p.score || 0) + +s.dataset.d));
  }
  const k = e.target.closest("[data-kick]");
  if (k && confirm(`เอา ${room?.players?.[k.dataset.kick]?.name || "ผู้เล่น"} ออกจากห้อง?`)) remove(`live/${code}/players/${k.dataset.kick}`);
});

async function nextRound() {
  const round = room?.state?.round ?? 1;
  await patch(`live/${code}/state`, { round: round + 1, locked: false });
  remove(`live/${code}/buzz/${round}`).catch(() => {});
}
async function toggleLock() {
  await patch(`live/${code}/state`, { locked: !room?.state?.locked });
}
$("nextRound").onclick = nextRound;
$("lockBtn").onclick = toggleLock;
$("copyLink").onclick = () => copyText(joinUrl(code));
document.addEventListener("keydown", (e) => {
  if (role !== "host" || e.target.closest("input, textarea")) return;
  if (e.key === "n" || e.key === "N") nextRound();
  if (e.key === "l" || e.key === "L") toggleLock();
  if (e.key === "Escape") setBig(false);
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
  await remove(`live/${c}/buzz`).catch(() => {});
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
    if (!me) {
      if (joined) return kicked();
      return;
    }
    joined = true;
    renderPlayer(me);
  });
}

function renderPlayer(me) {
  const state = room.state || { round: 1, locked: false };
  const order = pressOrder();
  const myRank = order.findIndex((b) => b.id === uid()) + 1;
  $("meName").textContent = me.name;
  $("meScore").textContent = me.score || 0;
  const btn = $("buzz");
  btn.disabled = state.locked || myRank > 0;
  btn.className = "bz-buzz" + (myRank === 1 ? " won" : myRank > 1 ? " late" : state.locked ? " locked" : "");
  btn.textContent = myRank === 1 ? "อันดับ 1!" : myRank > 1 ? `อันดับ ${myRank}` : state.locked ? "รอ…" : "กด!";
  $("buzzStatus").textContent =
    myRank === 1 ? "🎉 คุณกดก่อนใคร!" :
    myRank > 1 ? `คุณกดเป็นอันดับ ${myRank} · ${room.players?.[order[0].id]?.name || ""} กดก่อน` :
    state.locked ? "โฮสต์ล็อกปุ่มอยู่ รอเริ่มคำถาม" :
    order.length ? `${room.players?.[order[0].id]?.name || "มีคน"} กดไปแล้ว ยังกดต่อได้` : `รอบที่ ${state.round} · พร้อมแล้ว กดได้เลย!`;
}

async function press() {
  if (role !== "player" || $("buzz").disabled) return;
  const round = room?.state?.round ?? 1;
  $("buzz").disabled = true;
  navigator.vibrate?.(60);
  try {
    await write(`live/${code}/buzz/${round}/${uid()}`, { t: serverTime() });
  } catch {
    /* locked or already pressed — the next update re-renders the button */
  }
}
$("buzz").addEventListener("pointerdown", (e) => {
  e.preventDefault();
  press();
});
document.addEventListener("keydown", (e) => {
  if (role === "player" && (e.key === " " || e.key === "Enter") && !e.target.closest("input")) {
    e.preventDefault();
    press();
  }
});

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
  const params = new URLSearchParams(location.search);
  const joinCode = normalizeCode(params.get("join"));
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

// STAYGO! ออนไลน์ — client. Reads public + private state, sends intents to the server.
// The client never decides game results: every action goes through gameAction.
import { LETTERS, POWER_NAMES, nextNeeded, SG_MIN_PLAYERS, SG_MAX_PLAYERS, HAND_LIMIT } from "/assets/js/staygo-engine/engine.js";
import { esc, cardHTML, rowHTML, toast, formatDuration } from "/assets/js/staygo-engine/ui.js";
import { firebaseConfigured, createFirebaseTransport } from "./transport-firebase.js";

const $ = (id) => document.getElementById(id);
const ABSENT_MS = 30_000;
const NAME_KEY = "staygo-online-name";
const POWER_DESC = {
  S: "สุ่มการ์ด 1 ใบจากเป้าหมาย แล้วเลือกการ์ด 1 ใบให้เขาคืน",
  T: "จั่วการ์ด 2 ใบ",
  A: "เล่นการ์ดเพิ่มอีก 2 ใบ (ไม่จั่วเพิ่ม)",
  Y: "เลือกผู้เล่น 2 คน ให้สลับการ์ดทั้งมือกัน",
  G: "ขโมยการ์ด 1 ใบแบบสุ่มจากเป้าหมาย",
  O: "เป้าหมายต้องเอาการ์ดใบสุดท้ายในแถวคืนเข้ามือ",
};
const TARGET_TITLE = {
  S: "Swap — สุ่มการ์ดจากใคร?",
  G: "Got — ขโมยการ์ดจากใคร?",
  O: "Oops! — ให้ใครคืนการ์ดใบสุดท้ายในแถว?",
  Y: "Yolo — เลือก 2 คนให้สลับมือกัน",
  STAY: "STAY — ให้ใครข้ามเทิร์นถัดไป?",
};

// ---------------------------------------------------------------- state
let T = null; // transport
let uid = null;
let code = null;
let unwatch = null;
let meta = null;
let seats = [];
let pub = null;
let priv = null;
let busy = false;
let selected = null; // selected card id in my hand
let yoloPicks = [];
let lastNoticeT = 0;
let expiredFor = null; // shoutDeadline we already tried to expire
let presenceSeat = -1; // seat index our presence hooks point at

const params = new URLSearchParams(location.search);
const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const useMock = isLocal && params.has("mock");

// ---------------------------------------------------------------- helpers
const mySeat = () => seats.findIndex((s) => s.uid === uid);
const isHost = () => meta && meta.hostUid === uid;
const nameOf = (i) => seats[i]?.name ?? `ผู้เล่น ${i + 1}`;
const myTurn = () => pub && pub.cur === mySeat();

function normSeats(v) {
  if (!v) return [];
  const arr = Array.isArray(v) ? v : Object.keys(v).sort((a, b) => +a - +b).map((k) => v[k]);
  return arr.filter(Boolean);
}
function normPub(p) {
  if (!p) return null;
  p.players = (p.players || []).map((x) => ({ handCount: x?.handCount || 0, row: x?.row || [], skip: !!x?.skip }));
  p.log = p.log || [];
  // Firebase drops null fields, so restore them; otherwise `endAt !== null` is true from the start.
  for (const k of ["winners", "pending", "endAt", "shoutDeadline", "endedAt", "discardTop", "endReason"]) p[k] = p[k] ?? null;
  p.deckCount = p.deckCount ?? 0;
  p.turnCount = p.turnCount ?? 0;
  return p;
}
function normPriv(p) {
  if (!p) return { hand: [], notice: null, pending: null };
  return { hand: p.hand || [], notice: p.notice || null, pending: p.pending || null };
}

function show(screen) {
  for (const id of ["config", "home", "lobby", "game"]) $(`screen-${id}`).hidden = id !== screen;
  if (screen !== "game") for (const id of ["targetSheet", "shoutOverlay", "endOverlay"]) $(id).hidden = true;
}

async function send(action) {
  if (busy) return;
  busy = true;
  document.body.classList.add("busy");
  try {
    await T.action(code, action);
    selected = null;
    yoloPicks = [];
  } catch (e) {
    toast(e.message);
  } finally {
    busy = false;
    document.body.classList.remove("busy");
    render();
  }
}

// ---------------------------------------------------------------- home
function savedName() {
  try {
    return localStorage.getItem(NAME_KEY) || "";
  } catch {
    return "";
  }
}
function rememberName(n) {
  try {
    localStorage.setItem(NAME_KEY, n);
  } catch {}
}
function readName() {
  const n = $("nameInput").value.trim().slice(0, 16);
  if (!n) {
    toast("ใส่ชื่อก่อนนะ");
    $("nameInput").focus();
    return null;
  }
  rememberName(n);
  return n;
}

$("createBtn").onclick = async () => {
  const n = readName();
  if (!n || busy) return;
  busy = true;
  try {
    const r = await T.createRoom(n);
    enterRoom(r.code, r.seat);
  } catch (e) {
    toast(e.message);
  } finally {
    busy = false;
  }
};

async function join(c) {
  const n = readName();
  if (!n || busy) return;
  c = (c || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(c)) return toast("รหัสห้องต้องมี 4 ตัว");
  busy = true;
  try {
    const r = await T.joinRoom(c, n);
    enterRoom(r.code, r.seat);
  } catch (e) {
    toast(e.message);
  } finally {
    busy = false;
  }
}
$("joinBtn").onclick = () => join($("codeInput").value);
$("codeInput").addEventListener("keydown", (e) => e.key === "Enter" && join($("codeInput").value));
$("codeInput").addEventListener("input", (e) => (e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")));

function enterRoom(c, seat) {
  code = c;
  history.replaceState(null, "", `?room=${c}${useMock ? "&mock=1" : ""}`);
  presenceSeat = -1; // set from the seats listener once our seat is known
  watch();
}

function watch() {
  if (unwatch) unwatch();
  unwatch = T.watch(code, uid, {
    meta: (v) => {
      meta = v;
      if (!v) {
        toast("ไม่พบห้องนี้แล้ว");
        leaveLocal();
        return;
      }
      render();
    },
    seats: (v) => {
      seats = normSeats(v);
      const s = mySeat();
      if (s >= 0 && s !== presenceSeat) {
        presenceSeat = s;
        T.presence(code, s);
      }
      render();
    },
    pub: (v) => {
      pub = normPub(v);
      render();
    },
    priv: (v) => {
      priv = normPriv(v);
      const n = priv.notice;
      if (n && n.t > lastNoticeT) {
        if (lastNoticeT && T.serverNow() - n.t < 15_000) toast(n.text);
        lastNoticeT = n.t;
      }
      render();
    },
  });
}

function leaveLocal() {
  if (unwatch) unwatch();
  unwatch = null;
  T.stopPresence();
  code = meta = pub = priv = null;
  seats = [];
  presenceSeat = -1;
  selected = null;
  yoloPicks = [];
  history.replaceState(null, "", useMock ? "?mock=1" : location.pathname);
  show("home");
}

// ---------------------------------------------------------------- lobby
function shareUrl() {
  return `${location.origin}${location.pathname}?room=${code}`;
}

function renderLobby() {
  $("lobbyCode").textContent = code;
  $("shareLink").textContent = shareUrl().replace(/^https?:\/\//, "");
  $("seatList").innerHTML =
    seats
      .map(
        (s, i) => `<li class="seat${s.uid === uid ? " me" : ""}">
          <span class="dot ${s.online === false ? "off" : "on"}" title="${s.online === false ? "ออฟไลน์" : "ออนไลน์"}"></span>
          <span class="seat-name">${esc(s.name)}</span>
          ${s.uid === meta.hostUid ? '<span class="tag">เจ้าของห้อง</span>' : ""}
          ${s.uid === uid ? '<span class="tag you">คุณ</span>' : ""}
        </li>`,
      )
      .join("") +
    Array.from({ length: SG_MAX_PLAYERS - seats.length }, () => `<li class="seat empty">ว่าง</li>`).join("");
  const enough = seats.length >= SG_MIN_PLAYERS;
  $("startBtn").hidden = !isHost();
  $("startBtn").disabled = !enough || busy;
  $("lobbyWait").textContent = isHost()
    ? enough
      ? `พร้อมแล้ว ${seats.length} คน`
      : `รอเพื่อนอีกอย่างน้อย ${SG_MIN_PLAYERS - seats.length} คน`
    : "รอเจ้าของห้องกดเริ่มเกม…";
}

$("copyBtn").onclick = async () => {
  try {
    if (navigator.share && matchMedia("(hover: none)").matches) {
      await navigator.share({ title: "STAYGO! ออนไลน์", text: `มาเล่น STAYGO! กัน รหัสห้อง ${code}`, url: shareUrl() });
      return;
    }
    await navigator.clipboard.writeText(shareUrl());
    toast("คัดลอกลิงก์แล้ว");
  } catch {
    toast(shareUrl());
  }
};
$("startBtn").onclick = () => send({ type: "start" });
$("leaveBtn").onclick = async () => {
  try {
    await T.leaveRoom(code);
  } catch (e) {
    toast(e.message);
  }
  leaveLocal();
};

// ---------------------------------------------------------------- game rendering
function render() {
  if (!T) return;
  if (!code || !meta) return;
  if (meta.status === "lobby" || !pub) {
    show("lobby");
    renderLobby();
    return;
  }
  show("game");
  renderGame();
}

function renderGame() {
  const me = mySeat();
  const p = pub;
  const curName = nameOf(p.cur);
  const spectator = me < 0;

  // top bar
  $("gCode").textContent = code;
  $("gDeck").textContent = p.deckCount;
  $("gDiscard").innerHTML = p.discardTop ? cardHTML(p.discardTop, { sub: false, width: 30 }) : "–";
  $("gTurn").innerHTML =
    p.phase === "end" ? "จบเกม" : myTurn() ? '<b class="you">ตาคุณ!</b>' : `ตาของ <b>${esc(curName)}</b>`;
  $("gEndAt").hidden = p.endAt === null || p.phase === "end";
  if (p.endAt !== null) $("gEndAt").textContent = `กองจั่วหมดแล้ว — จบเมื่อวนกลับถึง ${nameOf(p.endAt)}`;

  // everyone else
  $("opponents").innerHTML = p.players
    .map((pl, i) => {
      if (i === me) return "";
      const seat = seats[i] || {};
      return `<div class="opp${i === p.cur && p.phase !== "end" ? " cur" : ""}">
        <div class="opp-head">
          <span class="dot ${seat.online === false ? "off" : "on"}"></span>
          <span class="opp-name">${esc(nameOf(i))}</span>
          ${pl.skip ? '<span class="tag red">STAY</span>' : ""}
          <span class="opp-hand" title="การ์ดในมือ">🂠 ${pl.handCount}</span>
        </div>
        ${rowHTML(pl.row)}
      </div>`;
    })
    .join("");

  renderBanner();

  // my row + hand
  $("meBox").hidden = spectator;
  if (!spectator) {
    const mine = p.players[me];
    $("myName").textContent = nameOf(me);
    $("mySkip").hidden = !mine.skip;
    $("myRow").innerHTML = rowHTML(mine.row, { markNext: true });
    $("meBox").classList.toggle("cur", myTurn() && p.phase !== "end");
    renderHand();
    renderActions();
  }

  $("log").innerHTML = p.log
    .slice()
    .reverse()
    .slice(0, 12)
    .map((l) => `<li>${esc(l.text)}</li>`)
    .join("");

  renderTargetSheet();
  renderShout();
  renderEnd();
}

function absentInfo() {
  const seat = seats[pub.cur];
  if (!seat || seat.online !== false || pub.phase === "end" || pub.phase === "shout") return null;
  const since = Math.max(seat.offlineAt || 0, pub.turnStartedAt || 0);
  return { left: since + ABSENT_MS - T.serverNow() };
}

function renderBanner() {
  const p = pub;
  const b = $("banner");
  const me = mySeat();
  let html = "";
  let cls = "banner";
  const absent = absentInfo();
  if (p.phase === "end") {
    html = "";
  } else if (absent && pub.cur !== me) {
    cls += " warn";
    html =
      absent.left > 0
        ? `${esc(nameOf(p.cur))} ออฟไลน์ — ข้ามเทิร์นได้ใน <b data-absent>${Math.ceil(absent.left / 1000)}</b> วินาที`
        : `${esc(nameOf(p.cur))} ออฟไลน์ <button class="sg-btn small" id="skipAbsentBtn">ข้ามเทิร์น</button>`;
  } else if (!myTurn()) {
    const what =
      p.phase === "target" ? "กำลังเลือกเป้าหมาย…" :
      p.phase === "giveS" ? `กำลังเลือกการ์ดให้ ${esc(nameOf(p.pending?.target))}` :
      p.phase === "excess" ? "กำลังทิ้งการ์ดให้เหลือ 6 ใบ" :
      p.phase === "shout" ? "แถวครบ 6!" :
      p.aLock ? `Again — เล่นได้อีก ${p.playsLeft} ใบ` : "กำลังคิด…";
    html = `ตาของ <b>${esc(nameOf(p.cur))}</b> · ${what}`;
  } else if (p.phase === "play") {
    cls += " you";
    html = p.aLock
      ? `Again! เล่นได้อีก <b>${p.playsLeft}</b> ใบ <button class="sg-btn small" id="endEarlyBtn">จบเทิร์น</button>`
      : "ตาคุณ! แตะการ์ดในมือเพื่อเล่น 1 ใบ";
  } else if (p.phase === "giveS") {
    cls += " you";
    html = `Swap: เลือกการ์ด 1 ใบในมือให้ <b>${esc(nameOf(priv.pending?.target ?? p.pending?.target))}</b>`;
  } else if (p.phase === "excess") {
    cls += " you";
    html = `มือเกิน ${HAND_LIMIT} ใบ — ทิ้งอีก <b>${priv.hand.length - HAND_LIMIT}</b> ใบ`;
  } else if (p.phase === "target") {
    cls += " you";
    html = "เลือกเป้าหมาย";
  }
  b.className = cls;
  b.innerHTML = html;
  b.hidden = !html;
  $("skipAbsentBtn")?.addEventListener("click", () => send({ type: "skipAbsent" }));
  $("endEarlyBtn")?.addEventListener("click", () => send({ type: "endTurnEarly" }));
}

/** What a card does, plus how it fits my row. Shown whenever a card in hand is tapped. */
function cardInfo(c) {
  const row = pub?.players?.[mySeat()]?.row || [];
  if (c.k === "L") {
    const idx = LETTERS.indexOf(c.l);
    const fit =
      idx < row.length ? { text: "แถวคุณมีตัวนี้แล้ว", cls: "" } :
      idx === row.length ? { text: "แถวคุณต้องการตัวนี้ถัดไป!", cls: "need" } :
      { text: `แถวคุณยังไม่ถึงตัว ${c.l}`, cls: "" };
    return { title: `${c.l} · ${POWER_NAMES[c.l]}`, lines: [`พลัง: ${POWER_DESC[c.l]}`, `หรือวางเป็นตัว ${c.l} ในแถว`], fit };
  }
  if (c.k === "W") {
    const need = nextNeeded(row);
    return { title: "STAYGO (ไวลด์)", lines: ["วางเป็นตัวอักษรไหนก็ได้ในแถว", "ไม่มีพลังพิเศษ"], fit: need ? { text: `ใช้เป็นตัว ${need} ต่อแถวได้เลย`, cls: "need" } : null };
  }
  if (c.k === "STAY") return { title: "STAY", lines: ["เลือกผู้เล่น 1 คน ให้ข้ามเทิร์นถัดไป"], fit: null };
  return { title: "GO!", lines: ["ทุกคนส่งการ์ดทั้งมือให้คนทางซ้าย"], fit: null };
}

function cardInfoHTML(c) {
  const info = cardInfo(c);
  return `<div class="card-info">
    ${cardHTML(c, { width: 44 })}
    <div><b>${esc(info.title)}</b>${info.lines.map((l) => `<p>${esc(l)}</p>`).join("")}${
      info.fit ? `<span class="fit ${info.fit.cls}">${esc(info.fit.text)}</span>` : ""
    }</div></div>`;
}

function cardPlays(c) {
  // What the current player could do with this card right now.
  const p = pub;
  const me = mySeat();
  const out = [];
  if (!myTurn()) return out;
  if (p.phase === "play") {
    const need = nextNeeded(p.players[me].row);
    if (need && (c.k === "W" || (c.k === "L" && c.l === need)))
      out.push({ label: c.k === "W" ? `วางต่อแถว (เป็น ${need})` : "วางต่อแถว", cls: "blue", action: { type: "place", cardId: c.id } });
    if (c.k === "L" && !(c.l === "A" && p.aLock))
      out.push({ label: `ใช้พลัง ${POWER_NAMES[c.l]}`, desc: POWER_DESC[c.l], cls: "yellow", action: { type: "power", cardId: c.id } });
    if (c.k === "L" && c.l === "A" && p.aLock) out.push({ label: "ใช้ Again ซ้อนไม่ได้", disabled: true });
    if (c.k === "STAY") out.push({ label: "เล่น STAY", desc: "เลือกคนให้ข้ามเทิร์นถัดไป", cls: "red", action: { type: "playAction", cardId: c.id } });
    if (c.k === "GO") out.push({ label: "เล่น GO!", desc: "ทุกคนส่งการ์ดทั้งมือไปทางซ้าย", cls: "yellow", action: { type: "playAction", cardId: c.id } });
  } else if (p.phase === "giveS") {
    out.push({ label: `ให้ใบนี้กับ ${nameOf(priv.pending?.target ?? p.pending?.target)}`, cls: "blue", action: { type: "give", cardId: c.id } });
  } else if (p.phase === "excess") {
    out.push({ label: "ทิ้งใบนี้", cls: "red", action: { type: "discardExcess", cardId: c.id } });
  }
  return out;
}

function renderHand() {
  const hand = priv?.hand || [];
  if (selected !== null && !hand.some((c) => c.id === selected)) selected = null;
  const taken = priv?.pending?.type === "giveS" ? priv.pending.takenCard?.id : null;
  const canAct = myTurn() && ["play", "giveS", "excess"].includes(pub.phase);
  $("handCount").textContent = `${hand.length} ใบ`;
  $("hand").innerHTML = hand.length
    ? hand
        .map((c) => {
          const playable = canAct && cardPlays(c).some((x) => !x.disabled);
          const cls = [c.id === selected ? "selected" : "", canAct && !playable ? "dim" : "", c.id === taken ? "new" : ""].join(" ");
          return cardHTML(c, { tag: "button", cls, attrs: `data-id="${c.id}"` });
        })
        .join("")
    : '<p class="empty">ไม่มีการ์ดในมือ</p>';
  renderHandGuide(hand);
}

// While discarding or choosing a card to give away, list what every card in hand does
// so players can compare without tapping each one.
function renderHandGuide(hand) {
  const box = $("handGuide");
  const show = myTurn() && ["giveS", "excess"].includes(pub.phase) && hand.length > 0;
  box.hidden = !show;
  if (!show) return (box.innerHTML = "");
  const title = pub.phase === "excess" ? "ก่อนทิ้ง ดูก่อนว่าแต่ละใบทำอะไรได้" : "ก่อนให้ ดูก่อนว่าแต่ละใบทำอะไรได้";
  // one line per kind of card; duplicates show ×2
  const groups = [];
  for (const c of hand) {
    const key = c.k + (c.l || "");
    const g = groups.find((x) => x.key === key);
    if (g) g.ids.push(c.id);
    else groups.push({ key, card: c, ids: [c.id] });
  }
  box.innerHTML = `<p class="guide-title">${title} · แตะเพื่อเลือก</p><ul>${groups
    .map(({ card, ids }) => {
      const info = cardInfo(card);
      const on = ids.includes(selected) ? "on" : "";
      return `<li data-id="${ids[0]}" class="${on}">${cardHTML(card, { width: 30, sub: false })}<div><b>${esc(info.title)}</b>${
        ids.length > 1 ? ` <i>×${ids.length}</i>` : ""
      } <span>${esc(info.lines[0].replace(/^พลัง: /, ""))}</span>${info.fit?.cls === "need" ? ` <em>${esc(info.fit.text)}</em>` : ""}</div></li>`;
    })
    .join("")}</ul>`;
}

$("handGuide").addEventListener("click", (e) => {
  const li = e.target.closest("li[data-id]");
  if (!li) return;
  selected = +li.dataset.id;
  renderHand();
  renderActions();
});

$("hand").addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-id]");
  if (!btn || btn.disabled) return;
  const id = +btn.dataset.id;
  selected = selected === id ? null : id;
  renderHand();
  renderActions();
});

function renderActions() {
  const box = $("actions");
  const c = (priv?.hand || []).find((x) => x.id === selected);
  if (!c) {
    box.innerHTML = "";
    box.hidden = true;
    return;
  }
  const plays = cardPlays(c);
  box.hidden = false;
  box.innerHTML = cardInfoHTML(c) + (!myTurn() ? "" : plays.length
    ? plays
        .map(
          (x, i) => `<button class="sg-btn ${x.cls || ""}" data-i="${i}" ${x.disabled ? "disabled" : ""}>
            <span>${esc(x.label)}</span>${x.desc ? `<small>${esc(x.desc)}</small>` : ""}</button>`,
        )
        .join("")
    : '<p class="empty">การ์ดใบนี้ยังเล่นไม่ได้ตอนนี้</p>');
  box.querySelectorAll("button[data-i]").forEach((b) => {
    b.onclick = () => {
      const a = plays[+b.dataset.i]?.action;
      if (a) send(a);
    };
  });
}

// ---- target picking
function useful(kind, i) {
  const pl = pub.players[i];
  if (kind === "S" || kind === "G") return pl.handCount > 0;
  if (kind === "O") return pl.row.length > 0;
  if (kind === "STAY") return !pl.skip;
  return true;
}
function validFor(kind, i) {
  return kind === "Y" || kind === "O" ? true : i !== mySeat();
}

function renderTargetSheet() {
  const sheet = $("targetSheet");
  const pend = priv?.pending;
  if (!myTurn() || pub.phase !== "target" || !pend || pend.type === "giveS") {
    sheet.hidden = true;
    return;
  }
  const kind = pend.type;
  const all = pub.players.map((_, i) => i).filter((i) => validFor(kind, i));
  const anyUseful = all.some((i) => useful(kind, i));
  $("targetTitle").textContent = TARGET_TITLE[kind];
  $("targetCard").innerHTML = cardHTML(
    priv.hand.find((c) => c.id === pend.cardId) || (kind === "STAY" ? { k: "STAY" } : { k: "L", l: kind }),
    { width: 46 },
  );
  $("targetList").innerHTML = all
    .map((i) => {
      const pl = pub.players[i];
      const ok = useful(kind, i);
      const disabled = !ok && anyUseful;
      const picked = yoloPicks.includes(i);
      const note = !ok ? (kind === "O" ? "แถวว่าง" : kind === "STAY" ? "โดน STAY อยู่แล้ว" : "มือว่าง") : "";
      return `<button class="target${picked ? " picked" : ""}" data-t="${i}" ${disabled ? "disabled" : ""}>
        <span class="t-name">${esc(nameOf(i))}${i === mySeat() ? " (คุณ)" : ""}</span>
        <span class="t-meta">🂠 ${pl.handCount} · แถว ${pl.row.length}/6${note ? ` · ${note}` : ""}</span>
        ${rowHTML(pl.row)}
      </button>`;
    })
    .join("");
  $("targetConfirm").hidden = kind !== "Y";
  $("targetConfirm").disabled = yoloPicks.length !== 2 || busy;
  $("targetHint").textContent = kind === "Y" ? `เลือกแล้ว ${yoloPicks.length}/2 (เลือกตัวเองได้)` : "";
  sheet.hidden = false;
  $("targetList")
    .querySelectorAll("button[data-t]")
    .forEach((b) => {
      b.onclick = () => {
        const t = +b.dataset.t;
        if (kind !== "Y") return send({ type: "target", players: [t] });
        yoloPicks = yoloPicks.includes(t) ? yoloPicks.filter((x) => x !== t) : [...yoloPicks, t].slice(-2);
        renderTargetSheet();
      };
    });
}
$("targetConfirm").onclick = () => send({ type: "target", players: yoloPicks });
$("targetCancel").onclick = () => send({ type: "cancelTarget" });

// ---- shout
function renderShout() {
  const ov = $("shoutOverlay");
  if (pub.phase !== "shout" || !pub.shoutDeadline) {
    ov.hidden = true;
    return;
  }
  ov.hidden = false;
  const mine = myTurn();
  $("shoutBtn").hidden = !mine;
  $("shoutWho").innerHTML = mine ? "แถวครบ 6! กดเลย!" : `<b>${esc(nameOf(pub.cur))}</b> แถวครบ 6! ต้องกด STAYGO! ให้ทัน`;
  tickShout();
}
function tickShout() {
  if (!pub || pub.phase !== "shout" || !pub.shoutDeadline) return;
  const left = pub.shoutDeadline - T.serverNow();
  $("shoutTime").textContent = Math.max(0, left / 1000).toFixed(1);
  $("shoutBar").style.width = `${Math.max(0, Math.min(100, (left / 5000) * 100))}%`;
  // After the deadline anyone asks the server to apply the penalty. Small jitter avoids a stampede.
  if (left < -150 && expiredFor !== pub.shoutDeadline) {
    expiredFor = pub.shoutDeadline;
    setTimeout(() => {
      if (pub?.phase === "shout") T.action(code, { type: "expireShout" }).catch(() => {});
    }, Math.random() * 500);
  }
}
$("shoutBtn").onclick = () => send({ type: "shout" });

// ---- end
function renderEnd() {
  const ov = $("endOverlay");
  if (pub.phase !== "end" || !pub.winners) {
    ov.hidden = true;
    return;
  }
  ov.hidden = false;
  const w = pub.winners;
  const iWon = w.includes(mySeat());
  $("endTitle").textContent = iWon ? (w.length > 1 ? "คุณชนะร่วม!" : "คุณชนะ!") : w.length > 1 ? "ชนะร่วม" : "ผู้ชนะ";
  $("endWinner").textContent = w.map(nameOf).join(" & ");
  $("endReason").textContent =
    pub.endReason === "shout" ? "เรียงครบ S-T-A-Y-G-O และกด STAYGO! ทัน" : "กองจั่วหมด — แถวยาวที่สุด (เสมอ: การ์ดในมือน้อยที่สุด)";
  const dur = (pub.endedAt || T.serverNow()) - pub.startedAt;
  $("endStats").textContent = `${pub.turnCount + 1} เทิร์น · ${formatDuration(dur)}`;
  const order = pub.players
    .map((pl, i) => ({ i, pl }))
    .sort((a, b) => b.pl.row.length - a.pl.row.length || a.pl.handCount - b.pl.handCount);
  $("endTable").innerHTML = order
    .map(
      ({ i, pl }) => `<li class="${w.includes(i) ? "win" : ""}">
        <span class="t-name">${w.includes(i) ? "🏆 " : ""}${esc(nameOf(i))}</span>
        <span class="t-meta">แถว ${pl.row.length}/6 · มือ ${pl.handCount}</span>
        ${rowHTML(pl.row)}</li>`,
    )
    .join("");
  $("againBtn").hidden = !isHost();
  $("againWait").hidden = isHost();
}
$("againBtn").onclick = async () => {
  const btn = $("againBtn");
  btn.disabled = true;
  btn.textContent = "กำลังเริ่ม…";
  await send({ type: "start" });
  btn.disabled = false;
  btn.textContent = "เล่นอีกรอบ";
};
$("homeBtn").onclick = async () => {
  const c = code;
  leaveLocal();
  // The game is over, so free the seat; the host's next round then starts without us.
  if (c) T.leaveRoom(c).catch(() => {});
};
$("gLeave").onclick = () => {
  if (meta?.status === "playing" && !confirm("ออกจากห้อง? คุณกลับเข้ามาได้ด้วยลิงก์เดิมบนเบราว์เซอร์นี้")) return;
  leaveLocal();
};

// countdowns
setInterval(() => {
  if (!pub || !code) return;
  tickShout();
  const el = document.querySelector("[data-absent]");
  const a = absentInfo();
  if (el && a) {
    if (a.left <= 0) renderBanner();
    else el.textContent = Math.ceil(a.left / 1000);
  }
}, 200);

// ---------------------------------------------------------------- dev bar (mock only)
function renderDevBar() {
  const bar = $("devbar");
  bar.hidden = false;
  const draw = () => {
    const ss = T.dev.seats("TEST");
    bar.innerHTML =
      `<b>โหมดทดสอบ</b> ดูในมุมของ: ` +
      [0, 1, 2, 3, 4]
        .slice(0, Math.max(1, ss.length))
        .map((i) => `<button class="sg-btn small${T.dev.uid === `dev-${i}` ? " blue" : ""}" data-view="${i}">${esc(ss[i]?.name || `P${i}`)}</button>`)
        .join("") +
      ` <button class="sg-btn small" data-add>+ ผู้เล่น</button>` +
      (ss.length ? ` <button class="sg-btn small" data-off>สลับออนไลน์ของคนที่ถึงตา</button>` : "") +
      (pub && pub.phase === "play" ? ` <button class="sg-btn small" data-near>แถวเกือบครบ</button> <button class="sg-btn small" data-big>มือเกิน</button>` : "");
  };
  bar.onclick = (e) => {
    const v = e.target.closest("[data-view]");
    if (v) T.dev.viewAs(+v.dataset.view);
    if (e.target.closest("[data-add]")) T.dev.addPlayer("TEST");
    if (e.target.closest("[data-off]") && pub) T.dev.toggleOnline("TEST", pub.cur);
    if (e.target.closest("[data-near]")) T.dev.nearWin("TEST");
    if (e.target.closest("[data-big]")) T.dev.bigHand("TEST");
    setTimeout(draw, 100);
  };
  T.dev.onUidChange((u) => {
    uid = u;
    selected = null;
    yoloPicks = [];
    lastNoticeT = 0;
    if (code) watch();
  });
  draw();
  setInterval(draw, 1500);
}

// ---------------------------------------------------------------- boot
async function boot() {
  $("nameInput").value = savedName();
  const roomParam = (params.get("room") || "").toUpperCase();
  if (roomParam) $("codeInput").value = roomParam;

  if (!useMock && !firebaseConfigured()) {
    show("config");
    return;
  }
  show("home");
  try {
    if (useMock) {
      const { createMockTransport } = await import("./transport-mock.js");
      T = createMockTransport();
      renderDevBar();
    } else T = await createFirebaseTransport();
    ({ uid } = await T.init());
  } catch (e) {
    console.error(e);
    toast("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ ลองรีเฟรชหน้า");
    return;
  }
  // Opened from a share link: rejoin straight away if we already have a name (same browser keeps its seat).
  if (roomParam && savedName() && !useMock) join(roomParam);
  else if (roomParam) $("nameInput").focus();
}
boot();

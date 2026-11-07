// ลุ้นจั่ว — local push-your-luck game on one shared device. Rules live in the shared engine.
import { newLunjua, applyLunjua, bustChance, LJ_MIN_PLAYERS, LJ_MAX_PLAYERS } from "/assets/js/staygo-engine/engine.js";
import { esc, cardHTML, bankHTML, formatDuration } from "/assets/js/staygo-engine/ui.js";

const SAVE_KEY = "staygo-lunjua-v1";
const NAMES_KEY = "staygo-lunjua-names";
const $ = (id) => document.getElementById(id);

let state = null;
let lastFlipCount = 0;
const rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

// ---------------------------------------------------------------- storage (optional; works without it)
function save() {
  try {
    if (state) localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    else localStorage.removeItem(SAVE_KEY);
  } catch {}
}
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    return s && s.game === "lunjua" && s.phase !== "end" ? s : null;
  } catch {
    return null;
  }
}
function loadNames() {
  try {
    const n = JSON.parse(localStorage.getItem(NAMES_KEY) || "null");
    return Array.isArray(n) ? n : null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- setup screen
let names = loadNames() || ["ผู้เล่น 1", "ผู้เล่น 2", "ผู้เล่น 3"];

function renderSetup() {
  $("countLabel").textContent = names.length;
  $("minus").disabled = names.length <= LJ_MIN_PLAYERS;
  $("plus").disabled = names.length >= LJ_MAX_PLAYERS;
  $("names").innerHTML = names
    .map(
      (n, i) =>
        `<label class="lj-name"><span class="lj-dot" style="background:var(--p${i})"></span>
         <input class="sg-input" data-i="${i}" maxlength="16" value="${esc(n)}" aria-label="ชื่อผู้เล่น ${i + 1}" /></label>`,
    )
    .join("");
}

$("names").addEventListener("input", (e) => {
  const i = +e.target.dataset.i;
  if (Number.isInteger(i)) names[i] = e.target.value;
});
$("minus").onclick = () => {
  if (names.length > LJ_MIN_PLAYERS) names.pop();
  renderSetup();
};
$("plus").onclick = () => {
  if (names.length < LJ_MAX_PLAYERS) names.push(`ผู้เล่น ${names.length + 1}`);
  renderSetup();
};
$("startBtn").onclick = () => {
  const clean = names.map((n, i) => n.trim().slice(0, 16) || `ผู้เล่น ${i + 1}`);
  names = clean;
  try {
    localStorage.setItem(NAMES_KEY, JSON.stringify(clean));
  } catch {}
  const first = $("randomFirst").checked ? Math.floor(rng() * clean.length) : 0;
  state = newLunjua(clean, rng, Date.now(), first);
  lastFlipCount = 0;
  save();
  show("game");
  render();
};

function show(which) {
  $("setup").hidden = which !== "setup";
  $("game").hidden = which !== "game";
  $("end").hidden = which !== "end";
}

// ---------------------------------------------------------------- game
function act(type) {
  if (!state) return;
  const r = applyLunjua(state, state.cur, { type }, rng, Date.now());
  if (!r.ok) return;
  state = r.state;
  save();
  render();
}

$("flipBtn").onclick = () => act("flip");
$("bankBtn").onclick = () => act("bank");
$("nextBtn").onclick = () => act("nextTurn");

document.addEventListener("keydown", (e) => {
  if ($("game").hidden || e.target.closest("input, textarea")) return;
  if (e.code === "Space") {
    e.preventDefault();
    if (!$("flipBtn").disabled && !$("flipBtn").hidden) act("flip");
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (!$("nextBtn").hidden) act("nextTurn");
    else if (!$("bankBtn").disabled) act("bank");
  }
});

const EVENT_TEXT = {
  go: "GO! ต้องเปิดเพิ่มอีก 2 ใบ",
  stay: "STAY! หยุดทันที แล้วเปิดโบนัส 1 ใบ (ไม่ระเบิด)",
  bonus: "ใบโบนัสเก็บได้!",
  bonusDiscard: "ใบโบนัสใช้ไม่ได้ ทิ้งไป",
  reshuffle: "กองจั่วหมด สับกองทิ้งเป็นกองใหม่",
};

function render() {
  if (!state) return;
  if (state.phase === "end") return renderEnd();
  const s = state;
  const curName = s.names[s.cur];
  $("turnName").textContent = curName;
  $("turnName").style.color = `var(--p${s.cur})`;
  $("deckCount").textContent = s.deck.length;
  $("discardCount").textContent = s.discard.length;

  $("players").innerHTML = s.names
    .map(
      (n, i) => `<div class="lj-player${i === s.cur ? " cur" : ""}" style="--pc:var(--p${i})">
        <div class="lj-pname"><span class="lj-dot"></span>${esc(n)}<span class="lj-pcount">${s.banks[i].length}/6</span></div>
        ${bankHTML(s.banks[i], { fresh: i === s.cur && s.phase === "banked" ? s.gained : [] })}
      </div>`,
    )
    .join("");

  // Flip area: show cards flipped this turn; newest one animates in.
  const bustId = s.phase === "bust" ? s.flipped[s.flipped.length - 1]?.id : null;
  const newFlip = s.flipsThisTurn !== lastFlipCount;
  lastFlipCount = s.flipsThisTurn;
  const shown = s.flipped.map((c, i) =>
    cardHTML(c, {
      sub: false,
      cls: [i === s.flipped.length - 1 && newFlip ? "pop" : "", c.id === bustId ? "shake bust" : ""].join(" "),
    }),
  );
  $("flipArea").innerHTML = shown.length
    ? shown.join("")
    : `<div class="lj-empty">${s.phase === "flip" ? "กด <b>เปิดการ์ด</b> เพื่อเริ่ม" : ""}</div>`;

  // Action cards and events this turn (GO!, STAY, bonus, reshuffle).
  const chips = s.events
    .filter((e) => EVENT_TEXT[e.kind])
    .map((e) => {
      const card = e.card ? cardHTML(e.card, { sub: false, width: 28 }) : "";
      return `<span class="lj-chip">${card}${EVENT_TEXT[e.kind]}</span>`;
    });
  $("events").innerHTML = chips.join("");

  // Status and buttons
  const status = $("status");
  const flip = $("flipBtn");
  const bank = $("bankBtn");
  const next = $("nextBtn");
  const meter = $("meter");
  status.className = "lj-status";
  if (s.phase === "flip") {
    flip.hidden = bank.hidden = false;
    next.hidden = true;
    flip.disabled = false;
    bank.disabled = s.flipsThisTurn === 0 || s.mustFlip > 0;
    if (s.mustFlip > 0) status.innerHTML = `ต้องเปิดอีก <b>${s.mustFlip}</b> ใบก่อนหยุด`;
    else if (s.flipsThisTurn === 0) status.textContent = "เปิดการ์ดทีละใบ ตัวอักษรซ้ำในเทิร์นเดียว = ระเบิด!";
    else status.textContent = "จะเสี่ยงเปิดต่อ หรือหยุดเก็บเข้าคลัง?";
    const p = bustChance(s);
    meter.hidden = s.flipped.length === 0;
    const pct = Math.round(p * 100);
    $("meterFill").style.width = pct + "%";
    $("meterFill").dataset.level = pct >= 40 ? "high" : pct >= 20 ? "mid" : "low";
    $("meterPct").textContent = pct + "%";
  } else {
    flip.hidden = bank.hidden = true;
    next.hidden = false;
    meter.hidden = true;
    const nextName = s.names[(s.cur + 1) % s.names.length];
    next.textContent = `ส่งต่อให้ ${nextName} ▶`;
    if (s.phase === "bust") {
      status.classList.add("bad");
      status.innerHTML = `💥 ระเบิด! ${esc(curName)} เสียการ์ดที่เปิดทั้งหมด`;
    } else {
      status.classList.add("good");
      status.innerHTML = s.gained.length
        ? `✅ ${esc(curName)} เก็บ <b>${s.gained.join(" ")}</b> เข้าคลัง`
        : `${esc(curName)} หยุด แต่ไม่ได้ตัวใหม่`;
    }
  }
  $("log").innerHTML = s.log
    .slice(-6)
    .reverse()
    .map((l) => `<li>${esc(l.text)}</li>`)
    .join("");
}

function renderEnd() {
  const s = state;
  const w = s.winners[0];
  $("winnerName").textContent = s.names[w];
  $("winnerName").style.color = `var(--p${w})`;
  $("endStats").textContent = `${s.turnCount + 1} เทิร์น · ${formatDuration(s.endedAt - s.startedAt)}`;
  $("endBanks").innerHTML = s.names
    .map(
      (n, i) => `<div class="lj-player${i === w ? " cur" : ""}" style="--pc:var(--p${i})">
      <div class="lj-pname"><span class="lj-dot"></span>${esc(n)}<span class="lj-pcount">${s.banks[i].length}/6</span></div>
      ${bankHTML(s.banks[i])}</div>`,
    )
    .join("");
  show("end");
  save();
}

$("againBtn").onclick = () => {
  const first = state ? (state.winners?.[0] ?? 0) : 0;
  state = newLunjua(state.names, rng, Date.now(), (first + 1) % state.names.length);
  lastFlipCount = 0;
  save();
  show("game");
  render();
};
$("setupBtn").onclick = $("quitBtn").onclick = () => {
  if (state && state.phase !== "end" && !confirm("ออกจากเกมนี้? ความคืบหน้าจะหายไป")) return;
  state = null;
  save();
  renderSetup();
  show("setup");
};

// Large layout for showing on stream / TV; hides the site header.
function setBig(on) {
  document.body.classList.toggle("lj-big", on);
  $("bigBtn").setAttribute("aria-pressed", String(on));
  $("bigBtn").textContent = on ? "ออกจากจอใหญ่" : "จอใหญ่";
}
$("bigBtn").onclick = () => setBig(!document.body.classList.contains("lj-big"));

// ---------------------------------------------------------------- init
renderSetup();
const saved = load();
if (saved) {
  state = saved;
  lastFlipCount = state.flipsThisTurn;
  show("game");
  render();
} else show("setup");

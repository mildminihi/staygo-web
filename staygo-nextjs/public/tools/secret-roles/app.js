// แจกบทลับ: pick a game, enter names, pass one phone around so each player sees their role.
import { WOLF_ROLES, suggestWolf, WOLF_NIGHT, SPY_LOCATIONS, UNDERCOVER_PAIRS } from "./data.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const rnd = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
const shuffle = (a) => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const NAMES_KEY = "staygo-roles-names";
const LIMITS = { werewolf: [5, 20], spyfall: [4, 12], undercover: [4, 15] };

let game = "werewolf";
let counts = null; // werewolf role counts
let spies = 1; // spyfall
let under = { undercover: 1, white: 0 }; // undercover
let deck = null; // [{ name, role }]
let dealIdx = 0;
let cardOpen = false;
let seen = false;
let nightStep = 0;
let timer = null;

const show = (id) => {
  for (const s of ["setup", "dealing", "play"]) $(s).hidden = s !== id;
  window.scrollTo(0, 0);
};
const names = () =>
  $("names")
    .value.split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

// ---------------------------------------------------------------- setup
try {
  $("names").value = localStorage.getItem(NAMES_KEY) || "";
} catch {}

$("games").onclick = (e) => {
  const b = e.target.closest("[data-game]");
  if (!b) return;
  game = b.dataset.game;
  for (const x of $("games").children) x.classList.toggle("active", x === b);
  counts = null;
  renderOpts();
};
$("names").oninput = () => {
  counts = null;
  renderOpts();
};

function stepper(label, key, value, min, max, hint = "") {
  return `<div class="rl-step"><span>${label}${hint ? `<small>${hint}</small>` : ""}</span>
    <div class="rl-stepper"><button class="sg-btn small" data-step="${key}" data-d="-1" ${value <= min ? "disabled" : ""}>−</button>
    <b class="tl-num">${value}</b>
    <button class="sg-btn small" data-step="${key}" data-d="1" ${value >= max ? "disabled" : ""}>+</button></div></div>`;
}

function renderOpts() {
  const n = names().length;
  const [min, max] = LIMITS[game];
  $("nameCount").textContent = n ? `${n} คน${n < min ? ` · ต้องมีอย่างน้อย ${min} คน` : n > max ? ` · มากสุด ${max} คน` : ""}` : `ใส่ชื่อ ${min}–${max} คน`;
  let html = "";
  let ok = n >= min && n <= max;
  if (game === "werewolf") {
    counts ||= suggestWolf(Math.max(n, 5));
    const special = counts.wolf + counts.seer + counts.doctor + counts.hunter;
    const villagers = n - special;
    html =
      `<span class="tl-label">บทในเกม</span>` +
      stepper("🐺 หมาป่า", "wolf", counts.wolf, 1, Math.max(1, Math.floor(n / 2) - 1)) +
      stepper("🔮 ผู้หยั่งรู้", "seer", counts.seer, 0, 1) +
      stepper("🩺 หมอ", "doctor", counts.doctor, 0, 1) +
      stepper("🏹 นายพราน", "hunter", counts.hunter, 0, 1) +
      `<div class="rl-step"><span>🧑‍🌾 ชาวบ้าน <small>ที่เหลือทั้งหมด</small></span><b class="tl-num">${Math.max(0, villagers)}</b></div>`;
    if (villagers < 1) ok = false;
  } else if (game === "spyfall") {
    html = `<span class="tl-label">ตั้งค่า</span>` + stepper("🕵️ จำนวนสายลับ", "spies", spies, 1, n >= 8 ? 2 : 1, "8 คนขึ้นไปมีได้ 2");
  } else {
    html =
      `<span class="tl-label">ตั้งค่า</span>` +
      stepper("🤫 สปาย (ได้คำต่าง)", "undercover", under.undercover, 1, Math.max(1, Math.floor((n - 1) / 3))) +
      stepper("⚪ มิสเตอร์ไวท์ (ไม่มีคำ)", "white", under.white, 0, n >= 6 ? 1 : 0, "6 คนขึ้นไป");
  }
  $("opts").innerHTML = html;
  $("deal").disabled = !ok;
}
$("opts").onclick = (e) => {
  const b = e.target.closest("[data-step]");
  if (!b) return;
  const k = b.dataset.step;
  const d = +b.dataset.d;
  if (game === "werewolf") counts[k] += d;
  else if (k === "spies") spies += d;
  else under[k] += d;
  renderOpts();
};

$("deal").onclick = () => {
  const list = names();
  try {
    localStorage.setItem(NAMES_KEY, list.join("\n"));
  } catch {}
  deal(list);
};

// ---------------------------------------------------------------- build roles
function deal(list) {
  let roles = [];
  if (game === "werewolf") {
    const byKey = Object.fromEntries(WOLF_ROLES.map((r) => [r.key, r]));
    for (const k of ["wolf", "seer", "doctor", "hunter"]) for (let i = 0; i < counts[k]; i++) roles.push(byKey[k]);
    while (roles.length < list.length) roles.push(byKey.villager);
    deck = { kind: "werewolf", players: shuffle(roles).map((role, i) => ({ name: list[i], role })) };
  } else if (game === "spyfall") {
    const [emoji, place] = SPY_LOCATIONS[rnd(SPY_LOCATIONS.length)];
    const spyIdx = new Set(shuffle(list.map((_, i) => i)).slice(0, spies));
    deck = { kind: "spyfall", place, emoji, players: list.map((name, i) => ({ name, spy: spyIdx.has(i) })) };
  } else {
    const pair = shuffle(UNDERCOVER_PAIRS[rnd(UNDERCOVER_PAIRS.length)]);
    const order = shuffle(list.map((_, i) => i));
    const kind = {};
    order.slice(0, under.undercover).forEach((i) => (kind[i] = "undercover"));
    order.slice(under.undercover, under.undercover + under.white).forEach((i) => (kind[i] = "white"));
    deck = {
      kind: "undercover",
      words: pair,
      players: list.map((name, i) => ({ name, type: kind[i] || "civilian", word: kind[i] === "undercover" ? pair[1] : kind[i] === "white" ? null : pair[0] })),
    };
  }
  dealIdx = 0;
  show("dealing");
  renderDeal();
}

// ---------------------------------------------------------------- pass the phone
function cardFace(p) {
  if (deck.kind === "werewolf") {
    const r = p.role;
    const wolves = r.key === "wolf" ? deck.players.filter((x) => x.role.key === "wolf" && x !== p).map((x) => x.name) : [];
    return `<span class="rl-emoji">${r.emoji}</span><b>${r.name}</b><small>${r.desc}</small>${
      wolves.length ? `<small class="rl-team">หมาป่าอีกตัว: ${wolves.map(esc).join(", ")}</small>` : ""
    }`;
  }
  if (deck.kind === "spyfall") {
    return p.spy
      ? `<span class="rl-emoji">🕵️</span><b>คุณคือสายลับ!</b><small>ฟังคำถามคำตอบแล้วเดาให้ได้ว่าทุกคนอยู่ที่ไหน อย่าให้ใครจับได้</small>`
      : `<span class="rl-emoji">${deck.emoji}</span><b>${deck.place}</b><small>ถามตอบกันเพื่อหาสายลับ อย่าพูดชื่อสถานที่ตรงๆ</small>`;
  }
  return p.word
    ? `<span class="rl-emoji">🤫</span><small>คำของคุณคือ</small><b>${esc(p.word)}</b><small>อธิบายคำนี้ทีละคน ห้ามพูดคำตรงๆ (คุณอาจเป็นสปายก็ได้ ไม่มีใครรู้)</small>`
    : `<span class="rl-emoji">⚪</span><b>มิสเตอร์ไวท์</b><small>คุณไม่มีคำ ฟังคนอื่นแล้วแกล้งทำเป็นรู้ ถ้าโดนจับได้ เดาคำให้ถูกเพื่อชนะ</small>`;
}

function renderDeal() {
  const p = deck.players[dealIdx];
  cardOpen = false;
  seen = false;
  $("dealNo").textContent = dealIdx + 1;
  $("dealTotal").textContent = deck.players.length;
  $("dealName").textContent = p.name;
  $("card").className = "rl-card";
  $("card").innerHTML = `<span class="rl-emoji">🂠</span><b>แตะเพื่อดูบท</b><small>เฉพาะ ${esc(p.name)} เท่านั้น!</small>`;
  $("passOn").disabled = true;
  $("passOn").textContent = dealIdx === deck.players.length - 1 ? "ดูแล้ว เริ่มเกม ▶" : "ดูแล้ว ส่งต่อ ▶";
}
$("card").onclick = () => {
  const p = deck.players[dealIdx];
  cardOpen = !cardOpen;
  if (cardOpen) {
    seen = true;
    $("card").className = "rl-card open";
    $("card").innerHTML = cardFace(p);
  } else {
    $("card").className = "rl-card";
    $("card").innerHTML = `<span class="rl-emoji">🂠</span><b>ปิดแล้ว</b><small>ส่งเครื่องให้คนถัดไปได้เลย</small>`;
  }
  $("passOn").disabled = !seen || cardOpen;
};
$("passOn").onclick = () => {
  if (dealIdx < deck.players.length - 1) {
    dealIdx++;
    renderDeal();
  } else startPlay();
};

// ---------------------------------------------------------------- play
function startPlay() {
  nightStep = 0;
  $("revealBox").hidden = true;
  show("play");
  renderPlay();
}

function timerHTML(min) {
  return `<div class="rl-timer"><span id="tClock" class="tl-num">${min}:00</span>
    <button class="sg-btn small" id="tStart" data-min="${min}">▶ เริ่มจับเวลา ${min} นาที</button></div>`;
}

function renderPlay() {
  clearInterval(timer);
  let html = "";
  if (deck.kind === "werewolf") {
    const present = new Set(deck.players.map((p) => p.role.key));
    const steps = WOLF_NIGHT.filter((s) => !s.role || present.has(s.role));
    const s = steps[nightStep % steps.length];
    const night = Math.floor(nightStep / steps.length) + 1;
    html = `<div class="sg-panel rl-narr">
        <p class="tl-hint" style="margin:0">สคริปต์คนเล่าเรื่อง · คืนที่ <b class="tl-num">${night}</b> · ขั้นที่ ${(nightStep % steps.length) + 1}/${steps.length}</p>
        <h2>${s.who}</h2><p class="rl-say">${s.text}</p>
        <div class="tl-row"><button class="sg-btn" id="nPrev" ${nightStep === 0 ? "disabled" : ""}>← ก่อนหน้า</button><button class="sg-btn blue" id="nNext">ถัดไป →</button></div>
      </div>
      <div class="sg-panel"><span class="tl-label">บทในเกมนี้</span>${roleSummary()}</div>
      <div class="sg-panel">${timerHTML(3)}<p class="tl-hint">เวลาคุยกลางวัน</p></div>`;
  } else if (deck.kind === "spyfall") {
    html = `<div class="sg-panel tl-stack">${timerHTML(8)}
        <p class="tl-hint" style="margin:0">ผลัดกันถามคำถามใครก็ได้เกี่ยวกับสถานที่ สงสัยใครโหวตได้ทุกเมื่อ สายลับชนะถ้าเดาสถานที่ถูก หรือรอดจนหมดเวลา</p></div>
      <div class="sg-panel"><span class="tl-label">สถานที่ที่เป็นไปได้ (${SPY_LOCATIONS.length})</span>
        <div class="rl-places">${SPY_LOCATIONS.map(([e, n]) => `<span>${e} ${n}</span>`).join("")}</div></div>`;
  } else {
    html = `<div class="sg-panel tl-stack">
        <p style="margin:0">ผลัดกันอธิบายคำของตัวเองคนละ 1 ประโยค แล้วโหวตเอาคนที่น่าสงสัยออก ชาวบ้านชนะถ้าจับสปายได้หมด</p>
        <p class="tl-hint" style="margin:0">ลำดับเริ่มพูด: ${shuffle(deck.players.filter((p) => p.word)).slice(0, 1).map((p) => `<b>${esc(p.name)}</b>`).join("")} แล้ววนไปทางซ้าย (มิสเตอร์ไวท์ไม่ได้เริ่มก่อน)</p>
      </div>
      <div class="sg-panel">${timerHTML(5)}</div>`;
  }
  $("playBody").innerHTML = html;
  $("nNext")?.addEventListener("click", () => {
    nightStep++;
    renderPlay();
  });
  $("nPrev")?.addEventListener("click", () => {
    nightStep = Math.max(0, nightStep - 1);
    renderPlay();
  });
  $("tStart")?.addEventListener("click", (e) => startTimer(+e.target.dataset.min));
}

function roleSummary() {
  const c = {};
  for (const p of deck.players) c[p.role.key] = (c[p.role.key] || 0) + 1;
  return `<div class="rl-places">${WOLF_ROLES.filter((r) => c[r.key]).map((r) => `<span>${r.emoji} ${r.name} × ${c[r.key]}</span>`).join("")}</div>`;
}

function startTimer(min) {
  clearInterval(timer);
  const end = Date.now() + min * 60000;
  const btn = $("tStart");
  btn.textContent = "↺ เริ่มใหม่";
  const tick = () => {
    const left = Math.max(0, end - Date.now());
    const s = Math.ceil(left / 1000);
    $("tClock").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    $("tClock").classList.toggle("warn", s <= 10);
    if (left <= 0) {
      clearInterval(timer);
      $("tClock").textContent = "หมดเวลา!";
      navigator.vibrate?.([200, 100, 200]);
    }
  };
  tick();
  timer = setInterval(tick, 250);
}

$("reveal").onclick = () => {
  if (!$("revealBox").hidden) return ($("revealBox").hidden = true);
  if (!confirm("เฉลยบทของทุกคน?")) return;
  let rows;
  if (deck.kind === "werewolf") rows = deck.players.map((p) => `<li>${p.role.emoji} <b>${esc(p.name)}</b> — ${p.role.name}</li>`);
  else if (deck.kind === "spyfall")
    rows = [`<li>สถานที่: <b>${deck.emoji} ${deck.place}</b></li>`, ...deck.players.filter((p) => p.spy).map((p) => `<li>🕵️ <b>${esc(p.name)}</b> — สายลับ</li>`)];
  else
    rows = [
      `<li>คำของชาวบ้าน: <b>${esc(deck.words[0])}</b> · คำของสปาย: <b>${esc(deck.words[1])}</b></li>`,
      ...deck.players.filter((p) => p.type !== "civilian").map((p) => `<li>${p.type === "white" ? "⚪" : "🤫"} <b>${esc(p.name)}</b> — ${p.type === "white" ? "มิสเตอร์ไวท์" : "สปาย"}</li>`),
    ];
  $("revealBox").innerHTML = `<span class="tl-label">เฉลย</span><ul class="rl-reveal">${rows.join("")}</ul>`;
  $("revealBox").hidden = false;
};
$("again").onclick = () => deal(deck.players.map((p) => p.name));
$("back").onclick = () => {
  clearInterval(timer);
  show("setup");
  renderOpts();
};

renderOpts();
show("setup");

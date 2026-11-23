// แจกบทลับ: deal secret roles for Werewolf / Spyfall / Undercover or roles the host types in.
// Main mode is a live room: the host deals, every player sees their own card on their phone.
// Cards live under liveRoles/{CODE}/{uid}, which only that player and the host can read
// (live/{CODE} itself is readable by everyone in the room). One-phone pass-around mode remains
// for tables without internet.
import { WOLF_ROLES, suggestWolf, WOLF_NIGHT, SPY_LOCATIONS, UNDERCOVER_PAIRS } from "./data.js";
import {
  connect, createRoom, joinRoom, leaveRoom, watchRoom, watch, read, roomMeta, normalizeCode,
  write, remove, uid, now, loadSession, clearSession, joinUrl, qrSvg,
  $, esc, toast, copyText,
} from "/assets/js/live-room.js";

const KIND = "secret-roles";
const NAME_KEY = "staygo-live-name";
const NAMES_KEY = "staygo-roles-names";
const CUSTOM_KEY = "staygo-roles-custom";
const LIMITS = { werewolf: [5, 20], spyfall: [4, 12], undercover: [4, 15], custom: [2, 20] };
const ROLE = Object.fromEntries(WOLF_ROLES.map((r) => [r.key, r]));
const SECTIONS = ["start", "room", "setup", "dealing", "play", "player"];

const rnd = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
const shuffle = (a) => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};
const clean = (o) => JSON.parse(JSON.stringify(o)); // Firebase rejects undefined values
const store = {
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

let mode = null; // "local" | "host" | "player"
let code = null;
let room = null;
let unwatch = null;
let unwatchCard = null;
let joined = false;

// setup
let game = "werewolf";
let counts = null; // werewolf role counts
let optsN = -1;
let spies = 1;
let under = { undercover: 1, white: 0 };
let spyPlace = "";
let underWords = ["", ""];
// first-time example roles, in the language the page is shown in
const tr = (s) => window.STAYGO_I18N?.t(s) ?? s;
let custom = store.get(CUSTOM_KEY, null) || {
  roles: [
    { name: tr("ฆาตกร"), emoji: "🔪", count: 1, desc: "", team: false },
    { name: tr("นักสืบ"), emoji: "🔍", count: 1, desc: "", team: false },
  ],
  filler: { name: tr("ผู้บริสุทธิ์"), emoji: "🙂", desc: "" },
};

// game
let deck = null; // { id, kind, players: [{ name, id?, role | spy | type, word }], ... }
let dealIdx = 0;
let cardOpen = false;
let seen = false;
let nightStep = 0;
let timer = null;

function show(...ids) {
  for (const s of SECTIONS) $(s).hidden = !ids.includes(s);
  $("loading").hidden = true;
  window.scrollTo(0, 0);
}

// ---------------------------------------------------------------- start
function startScreen(prefill = "") {
  mode = null;
  show("start");
  $("nameInput").value = store.get(NAME_KEY, "") || "";
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
$("pickLocal").onclick = () => enterLocal();
$("codeInput").oninput = (e) => (e.target.value = normalizeCode(e.target.value));
$("createBtn").onclick = async () => {
  $("createBtn").disabled = true;
  try {
    await enterHost(await createRoom(KIND));
  } catch (e) {
    toast(e.message || "เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ต");
  } finally {
    $("createBtn").disabled = false;
  }
};
$("joinBtn").onclick = async () => {
  const c = normalizeCode($("codeInput").value);
  const name = $("nameInput").value.trim();
  if (c.length !== 4) return toast("ใส่รหัสห้อง 4 ตัว");
  if (!name) return toast("ใส่ชื่อของคุณก่อน");
  store.set(NAME_KEY, name);
  $("joinBtn").disabled = true;
  try {
    await joinRoom(KIND, c, name);
    enterPlayer(c);
  } catch (e) {
    toast(e.message || "เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ต");
  } finally {
    $("joinBtn").disabled = false;
  }
};

// ---------------------------------------------------------------- setup (host + one phone)
function enterLocal() {
  mode = "local";
  $("names").value = (store.get(NAMES_KEY, "") || "").toString();
  openSetup();
}
function openSetup() {
  clearInterval(timer);
  const host = mode === "host";
  $("namesBox").hidden = host;
  $("modeBack").hidden = host;
  $("endRoom").hidden = !host;
  $("roomPanel").classList.remove("compact");
  show(...(host ? ["room", "setup"] : ["setup"]));
  renderExtra();
  renderOpts();
}

const playerList = () =>
  Object.entries(room?.players || {})
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (a.joinedAt || 0) - (b.joinedAt || 0));
const dealable = () => playerList().filter((p) => p.online).slice(0, 20);
const names = () =>
  mode === "host"
    ? dealable().map((p) => p.name)
    : $("names").value.split("\n").map((s) => s.trim()).filter(Boolean).slice(0, 20);

$("games").onclick = (e) => {
  const b = e.target.closest("[data-game]");
  if (!b) return;
  game = b.dataset.game;
  for (const x of $("games").children) x.classList.toggle("active", x === b);
  counts = null;
  renderExtra();
  renderOpts();
};
$("names").oninput = () => renderOpts();

function stepper(label, key, value, min, max, hint = "") {
  return `<div class="rl-step"><span>${label}${hint ? `<small>${hint}</small>` : ""}</span>
    <div class="rl-stepper"><button class="sg-btn small" data-step="${key}" data-d="-1" ${value <= min ? "disabled" : ""}>−</button>
    <b class="tl-num">${value}</b>
    <button class="sg-btn small" data-step="${key}" data-d="1" ${value >= max ? "disabled" : ""}>+</button></div></div>`;
}
const customTotal = () => custom.roles.reduce((s, r) => s + (r.name.trim() ? r.count : 0), 0);

// Steppers only: rebuilt on every room update, so it holds no text inputs.
function renderOpts() {
  const n = names().length;
  if (n !== optsN) {
    optsN = n;
    counts = null;
  }
  const [min, max] = LIMITS[game];
  const who = mode === "host" ? "คนในห้อง" : "คน";
  $("nameCount").textContent = n
    ? `${n} ${who}${n < min ? ` · ต้องมีอย่างน้อย ${min} คน` : n > max ? ` · มากสุด ${max} คน` : ""}`
    : mode === "host"
      ? `ยังไม่มีใครเข้าห้อง · ต้องมี ${min}–${max} คน`
      : `ใส่ชื่อ ${min}–${max} คน`;
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
    spies = Math.min(spies, n >= 8 ? 2 : 1);
    html = `<span class="tl-label">ตั้งค่า</span>` + stepper("🕵️ จำนวนสายลับ", "spies", spies, 1, n >= 8 ? 2 : 1, "8 คนขึ้นไปมีได้ 2");
  } else if (game === "undercover") {
    under.undercover = Math.min(under.undercover, Math.max(1, Math.floor((n - 1) / 3)));
    under.white = Math.min(under.white, n >= 6 ? 1 : 0);
    html =
      `<span class="tl-label">ตั้งค่า</span>` +
      stepper("🤫 สปาย (ได้คำต่าง)", "undercover", under.undercover, 1, Math.max(1, Math.floor((n - 1) / 3))) +
      stepper("⚪ มิสเตอร์ไวท์ (ไม่มีคำ)", "white", under.white, 0, n >= 6 ? 1 : 0, "6 คนขึ้นไป");
  } else {
    const total = customTotal();
    const rest = n - total;
    html = `<p class="tl-hint rl-sum${rest < 0 ? " bad" : ""}" style="margin:0">${
      rest < 0
        ? `บทรวม ${total} มากกว่าจำนวนคน (${n}) ลดจำนวนบทลง`
        : `บทที่ตั้งไว้ ${total} · ที่เหลือ ${rest} คนได้บท “${esc(custom.filler.name.trim() || "ผู้เล่นทั่วไป")}”`
    }</p>`;
    if (rest < 0 || total < 1) ok = false;
  }
  $("opts").innerHTML = html;
  if (mode === "host") {
    $("hostNote").hidden = false;
    $("hostNote").textContent =
      game === "werewolf"
        ? "โฮสต์เป็นคนเล่าเรื่อง ไม่ได้รับบท · แจกให้เฉพาะคนที่ออนไลน์อยู่"
        : "โฮสต์ไม่ได้รับบท ถ้าจะเล่นด้วยให้เข้าห้องจากมือถืออีกเครื่อง · แจกให้เฉพาะคนที่ออนไลน์อยู่";
  } else $("hostNote").hidden = true;
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

// Text inputs (custom roles, own place / words): rebuilt only when the game or the role list changes.
function renderExtra() {
  let html = "";
  if (game === "spyfall") {
    html = `<label><span class="tl-label">สถานที่ (ไม่ใส่ = สุ่ม)</span>
      <input class="sg-input" data-x="place" maxlength="30" value="${esc(spyPlace)}" placeholder="เช่น บ้านยาย" /></label>`;
  } else if (game === "undercover") {
    html = `<div><span class="tl-label">คำเอง (ไม่ใส่ = สุ่ม)</span>
      <div class="rl-pair"><input class="sg-input" data-x="w0" maxlength="24" value="${esc(underWords[0])}" placeholder="คำของชาวบ้าน" />
      <input class="sg-input" data-x="w1" maxlength="24" value="${esc(underWords[1])}" placeholder="คำของสปาย" /></div></div>`;
  } else if (game === "custom") {
    html =
      `<span class="tl-label">บทในเกม</span>` +
      custom.roles
        .map(
          (r, i) => `<div class="rl-crole">
          <div class="rl-crow">
            <input class="sg-input rl-cemoji" data-c="emoji" data-i="${i}" maxlength="4" value="${esc(r.emoji)}" aria-label="อีโมจิ" />
            <input class="sg-input" data-c="name" data-i="${i}" maxlength="24" value="${esc(r.name)}" placeholder="ชื่อบท" />
            <button class="sg-btn small" data-cdel="${i}" aria-label="ลบบท">✕</button>
          </div>
          <div class="rl-step rl-cstep"><span>จำนวน</span>
            <div class="rl-stepper"><button class="sg-btn small" data-cstep="${i}" data-d="-1" ${r.count <= 1 ? "disabled" : ""}>−</button>
              <b class="tl-num">${r.count}</b>
              <button class="sg-btn small" data-cstep="${i}" data-d="1" ${r.count >= 19 ? "disabled" : ""}>+</button></div>
          </div>
          <input class="sg-input" data-c="desc" data-i="${i}" maxlength="120" value="${esc(r.desc)}" placeholder="คำอธิบาย / พลัง (ไม่ใส่ก็ได้)" />
          <label class="rl-check"><input type="checkbox" data-c="team" data-i="${i}" ${r.team ? "checked" : ""} /> คนที่ได้บทนี้เห็นชื่อกันเอง (เช่น ทีมหมาป่า)</label>
        </div>`,
        )
        .join("") +
      `<button class="sg-btn small" data-cadd ${custom.roles.length >= 10 ? "disabled" : ""}>+ เพิ่มบท</button>
      <div class="rl-crole"><span class="tl-label" style="margin:0">บทของคนที่เหลือ</span>
        <div class="rl-crow">
          <input class="sg-input rl-cemoji" data-f="emoji" maxlength="4" value="${esc(custom.filler.emoji)}" aria-label="อีโมจิ" />
          <input class="sg-input" data-f="name" maxlength="24" value="${esc(custom.filler.name)}" placeholder="เช่น ชาวบ้าน" />
        </div>
        <input class="sg-input" data-f="desc" maxlength="120" value="${esc(custom.filler.desc)}" placeholder="คำอธิบาย (ไม่ใส่ก็ได้)" />
      </div>`;
  }
  $("extra").innerHTML = html;
  $("extra").hidden = !html;
}
$("extra").oninput = (e) => {
  const t = e.target;
  if (t.dataset.x === "place") spyPlace = t.value;
  else if (t.dataset.x === "w0") underWords[0] = t.value;
  else if (t.dataset.x === "w1") underWords[1] = t.value;
  else if (t.dataset.c) {
    const r = custom.roles[+t.dataset.i];
    r[t.dataset.c] = t.type === "checkbox" ? t.checked : t.value;
  } else if (t.dataset.f) custom.filler[t.dataset.f] = t.value;
  else return;
  if (game === "custom") {
    store.set(CUSTOM_KEY, custom);
    renderOpts();
  }
};
$("extra").onclick = (e) => {
  const b = e.target.closest("[data-cstep],[data-cdel],[data-cadd]");
  if (!b) return;
  if (b.dataset.cstep !== undefined) custom.roles[+b.dataset.cstep].count += +b.dataset.d;
  else if (b.dataset.cdel !== undefined) custom.roles.splice(+b.dataset.cdel, 1);
  else custom.roles.push({ name: "", emoji: "🎭", count: 1, desc: "", team: false });
  store.set(CUSTOM_KEY, custom);
  renderExtra();
  renderOpts();
};

$("deal").onclick = () => {
  if (mode === "host") return hostDeal();
  const list = names();
  store.set(NAMES_KEY, list.join("\n"));
  localDeal(list);
};
$("modeBack").onclick = () => startScreen();

// ---------------------------------------------------------------- build roles
function buildDeck(people) {
  const id = Date.now().toString(36);
  if (game === "werewolf") {
    const roles = [];
    for (const k of ["wolf", "seer", "doctor", "hunter"]) for (let i = 0; i < counts[k]; i++) roles.push(k);
    while (roles.length < people.length) roles.push("villager");
    const sh = shuffle(roles);
    return { id, kind: "werewolf", players: people.map((p, i) => ({ ...p, role: sh[i] })) };
  }
  if (game === "spyfall") {
    const own = spyPlace.trim();
    const [emoji, place] = own ? ["📍", own] : SPY_LOCATIONS[rnd(SPY_LOCATIONS.length)];
    const spyIdx = new Set(shuffle(people.map((_, i) => i)).slice(0, spies));
    return { id, kind: "spyfall", place, emoji, own: !!own, players: people.map((p, i) => ({ ...p, spy: spyIdx.has(i) })) };
  }
  if (game === "undercover") {
    const ownPair = underWords.map((w) => w.trim());
    const pair = ownPair[0] && ownPair[1] ? ownPair : shuffle(UNDERCOVER_PAIRS[rnd(UNDERCOVER_PAIRS.length)]);
    const order = shuffle(people.map((_, i) => i));
    const kind = {};
    order.slice(0, under.undercover).forEach((i) => (kind[i] = "undercover"));
    order.slice(under.undercover, under.undercover + under.white).forEach((i) => (kind[i] = "white"));
    const players = people.map((p, i) => ({
      ...p,
      type: kind[i] || "civilian",
      word: kind[i] === "undercover" ? pair[1] : kind[i] === "white" ? null : pair[0],
    }));
    const speakers = players.filter((p) => p.word);
    return { id, kind: "undercover", words: pair, first: speakers[rnd(speakers.length)].name, players };
  }
  // custom
  const defs = custom.roles
    .filter((r) => r.name.trim())
    .map((r) => ({ name: r.name.trim(), emoji: r.emoji.trim() || "🎭", desc: r.desc.trim(), team: !!r.team, count: r.count }));
  const filler = { name: custom.filler.name.trim() || "ผู้เล่นทั่วไป", emoji: custom.filler.emoji.trim() || "🙂", desc: custom.filler.desc.trim(), team: false };
  const roles = [];
  defs.forEach((r, i) => {
    for (let k = 0; k < r.count; k++) roles.push(i);
  });
  while (roles.length < people.length) roles.push(-1);
  const sh = shuffle(roles);
  return { id, kind: "custom", defs: [...defs, filler], players: people.map((p, i) => ({ ...p, role: sh[i] === -1 ? defs.length : sh[i] })) };
}

/** What one player's card shows: { e emoji, pre?, t title, d description, x? extra line }. */
function cardData(p) {
  if (deck.kind === "werewolf") {
    const r = ROLE[p.role];
    const mates = p.role === "wolf" ? deck.players.filter((x) => x.role === "wolf" && x !== p).map((x) => x.name) : [];
    return { e: r.emoji, t: r.name, d: r.desc, x: mates.length ? `หมาป่าอีกตัว: ${mates.join(", ")}` : "" };
  }
  if (deck.kind === "spyfall") {
    return p.spy
      ? { e: "🕵️", t: "คุณคือสายลับ!", d: "ฟังคำถามคำตอบแล้วเดาให้ได้ว่าทุกคนอยู่ที่ไหน อย่าให้ใครจับได้" }
      : { e: deck.emoji, pre: "สถานที่", t: deck.place, d: "ถามตอบกันเพื่อหาสายลับ อย่าพูดชื่อสถานที่ตรงๆ" };
  }
  if (deck.kind === "undercover") {
    return p.word
      ? { e: "🤫", pre: "คำของคุณคือ", t: p.word, d: "อธิบายคำนี้ทีละคน ห้ามพูดคำตรงๆ (คุณอาจเป็นสปายก็ได้ ไม่มีใครรู้)" }
      : { e: "⚪", t: "มิสเตอร์ไวท์", d: "คุณไม่มีคำ ฟังคนอื่นแล้วแกล้งทำเป็นรู้ ถ้าโดนจับได้ เดาคำให้ถูกเพื่อชนะ" };
  }
  const r = deck.defs[p.role];
  const mates = r.team ? deck.players.filter((x) => x.role === p.role && x !== p).map((x) => x.name) : [];
  return { e: r.emoji, pre: "บทของคุณ", t: r.name, d: r.desc, x: mates.length ? `ทีมเดียวกัน: ${mates.join(", ")}` : "" };
}
const cardHTML = (c) =>
  `<span class="rl-emoji">${esc(c.e)}</span>${c.pre ? `<small>${esc(c.pre)}</small>` : ""}<b>${esc(c.t)}</b>${
    c.d ? `<small>${esc(c.d)}</small>` : ""
  }${c.x ? `<small class="rl-team">${esc(c.x)}</small>` : ""}`;
const BACK = (title, sub) => `<span class="rl-emoji">🂠</span><b>${esc(title)}</b><small>${esc(sub)}</small>`;

/** Counts per role, shown to everyone (it does not say who has which). */
function summary() {
  const c = new Map();
  const add = (k, label) => c.set(k, { label, n: (c.get(k)?.n || 0) + 1 });
  for (const p of deck.players) {
    if (deck.kind === "werewolf") add(p.role, `${ROLE[p.role].emoji} ${ROLE[p.role].name}`);
    else if (deck.kind === "custom") add(p.role, `${deck.defs[p.role].emoji} ${deck.defs[p.role].name}`);
    else if (deck.kind === "spyfall") add(p.spy ? "s" : "a", p.spy ? "🕵️ สายลับ" : "🙂 คนรู้สถานที่");
    else add(p.type, p.type === "white" ? "⚪ มิสเตอร์ไวท์" : p.type === "undercover" ? "🤫 สปาย" : "🙂 ชาวบ้าน");
  }
  return [...c.values()].map((v) => `${v.label} × ${v.n}`);
}

function revealData() {
  if (deck.kind === "werewolf") return { top: "", rows: deck.players.map((p) => ({ e: ROLE[p.role].emoji, n: p.name, r: ROLE[p.role].name })) };
  if (deck.kind === "custom") return { top: "", rows: deck.players.map((p) => ({ e: deck.defs[p.role].emoji, n: p.name, r: deck.defs[p.role].name })) };
  if (deck.kind === "spyfall")
    return { top: `สถานที่: ${deck.emoji} ${deck.place}`, rows: deck.players.filter((p) => p.spy).map((p) => ({ e: "🕵️", n: p.name, r: "สายลับ" })) };
  return {
    top: `คำของชาวบ้าน: ${deck.words[0]} · คำของสปาย: ${deck.words[1]}`,
    rows: deck.players
      .filter((p) => p.type !== "civilian")
      .map((p) => ({ e: p.type === "white" ? "⚪" : "🤫", n: p.name, r: p.type === "white" ? "มิสเตอร์ไวท์" : "สปาย" })),
  };
}
const revealHTML = (rv) =>
  `<span class="tl-label">เฉลย</span><ul class="rl-reveal">${rv.top ? `<li><b>${esc(rv.top)}</b></li>` : ""}${(rv.rows || [])
    .map((r) => `<li>${esc(r.e)} <b>${esc(r.n)}</b> — ${esc(r.r)}</li>`)
    .join("")}</ul>`;

/** Play-phase info both the host screen and the players see. */
function infoHTML(kind, first) {
  if (kind === "spyfall")
    return `<div class="sg-panel"><p class="tl-hint" style="margin:0 0 8px">ผลัดกันถามคำถามใครก็ได้เกี่ยวกับสถานที่ สงสัยใครโหวตได้ทุกเมื่อ สายลับชนะถ้าเดาสถานที่ถูก หรือรอดจนหมดเวลา</p>
      <span class="tl-label">สถานที่ที่เป็นไปได้ (${SPY_LOCATIONS.length})</span>
      <div class="rl-places">${SPY_LOCATIONS.map(([e, n]) => `<span>${e} ${n}</span>`).join("")}</div></div>`;
  if (kind === "undercover")
    return `<div class="sg-panel tl-stack"><p style="margin:0">ผลัดกันอธิบายคำของตัวเองคนละ 1 ประโยค แล้วโหวตเอาคนที่น่าสงสัยออก ชาวบ้านชนะถ้าจับสปายได้หมด</p>
      <p class="tl-hint" style="margin:0">เริ่มพูดคนแรก: <b>${esc(first)}</b> แล้ววนไปทางซ้าย</p></div>`;
  return "";
}

// ---------------------------------------------------------------- one phone: pass it around
function localDeal(list) {
  sfx("shuffle");
  deck = buildDeck(list.map((name) => ({ name })));
  dealIdx = 0;
  show("dealing");
  renderDeal();
}
function renderDeal() {
  const p = deck.players[dealIdx];
  cardOpen = false;
  seen = false;
  $("dealNo").textContent = dealIdx + 1;
  $("dealTotal").textContent = deck.players.length;
  $("dealName").textContent = p.name;
  $("card").className = "rl-card";
  $("card").innerHTML = BACK("แตะเพื่อดูบท", `เฉพาะ ${p.name} เท่านั้น!`);
  $("passOn").disabled = true;
  $("passOn").textContent = dealIdx === deck.players.length - 1 ? "ดูแล้ว เริ่มเกม ▶" : "ดูแล้ว ส่งต่อ ▶";
}
$("card").onclick = () => {
  cardOpen = !cardOpen;
  sfx("flip");
  if (cardOpen) {
    seen = true;
    $("card").className = "rl-card open";
    $("card").innerHTML = cardHTML(cardData(deck.players[dealIdx]));
  } else {
    $("card").className = "rl-card";
    $("card").innerHTML = BACK("ปิดแล้ว", "ส่งเครื่องให้คนถัดไปได้เลย");
  }
  $("passOn").disabled = !seen || cardOpen;
};
$("passOn").onclick = () => {
  sfx("deal");
  if (dealIdx < deck.players.length - 1) {
    dealIdx++;
    renderDeal();
  } else startPlay();
};

// ---------------------------------------------------------------- play (host screen / one phone)
function startPlay() {
  nightStep = 0;
  $("revealBox").hidden = true;
  if (mode === "host") {
    $("roomPanel").classList.add("compact");
    show("room", "play");
    renderRoom();
  } else show("play");
  renderPlay();
}

const timerHTML = (min) => `<div class="rl-timer"><span id="tClock" class="tl-num">${min}:00</span>
    <button class="sg-btn small" id="tStart" data-min="${min}">▶ เริ่มจับเวลา ${min} นาที</button></div>`;

function renderPlay() {
  clearInterval(timer);
  let html = "";
  if (deck.kind === "werewolf") {
    const present = new Set(deck.players.map((p) => p.role));
    const steps = WOLF_NIGHT.filter((s) => !s.role || present.has(s.role));
    const s = steps[nightStep % steps.length];
    const night = Math.floor(nightStep / steps.length) + 1;
    html = `<div class="sg-panel rl-narr">
        <p class="tl-hint" style="margin:0">สคริปต์คนเล่าเรื่อง · คืนที่ <b class="tl-num">${night}</b> · ขั้นที่ ${(nightStep % steps.length) + 1}/${steps.length}</p>
        <h2>${s.who}</h2><p class="rl-say">${s.text}</p>
        <div class="tl-row"><button class="sg-btn" id="nPrev" ${nightStep === 0 ? "disabled" : ""}>← ก่อนหน้า</button><button class="sg-btn blue" id="nNext">ถัดไป →</button></div>
      </div>
      <div class="sg-panel"><span class="tl-label">บทในเกมนี้</span>${placesHTML(summary())}</div>
      <div class="sg-panel">${timerHTML(3)}<p class="tl-hint">เวลาคุยกลางวัน</p></div>`;
  } else if (deck.kind === "spyfall") {
    html = `<div class="sg-panel">${timerHTML(8)}</div>${infoHTML("spyfall")}`;
  } else if (deck.kind === "undercover") {
    html = infoHTML("undercover", deck.first) + `<div class="sg-panel">${timerHTML(5)}</div>`;
  } else {
    html = `<div class="sg-panel"><span class="tl-label">บทในเกมนี้</span>${placesHTML(summary())}</div>
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
const placesHTML = (items) => `<div class="rl-places">${items.map((t) => `<span>${esc(t)}</span>`).join("")}</div>`;

const sfx = (n, a) => window.SFX?.play(n, a);
function runClock(el, end, onEnd) {
  const tick = () => {
    const left = Math.max(0, end - (mode === "local" ? Date.now() : now()));
    const s = Math.ceil(left / 1000);
    el.textContent = left > 0 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}` : "หมดเวลา!";
    el.classList.toggle("warn", s <= 10);
    if (left > 0 && s <= 5 && el.dataset.beep !== String(s)) {
      el.dataset.beep = s;
      sfx("tick");
    }
    if (left <= 0) {
      clearInterval(id);
      sfx("timeup");
      onEnd?.();
    }
  };
  const id = setInterval(tick, 250);
  tick();
  return id;
}
function startTimer(min) {
  clearInterval(timer);
  $("tStart").textContent = "↺ เริ่มใหม่";
  const end = (mode === "local" ? Date.now() : now()) + min * 60000;
  timer = runClock($("tClock"), end, () => navigator.vibrate?.([200, 100, 200]));
  sfx("go");
  if (mode === "host") write(`live/${code}/state/timerEnd`, end).catch(() => {});
}

$("reveal").onclick = () => {
  if (!$("revealBox").hidden) return ($("revealBox").hidden = true);
  if (!confirm(mode === "host" ? "เฉลยบทของทุกคน? มือถือทุกเครื่องจะเห็นเฉลยด้วย" : "เฉลยบทของทุกคน?")) return;
  const rv = revealData();
  $("revealBox").innerHTML = revealHTML(rv);
  $("revealBox").hidden = false;
  sfx("drumroll", 0.8);
  setTimeout(() => sfx("reveal"), 800);
  if (mode === "host") write(`live/${code}/state/reveal`, clean(rv)).catch(() => toast("ส่งเฉลยไม่สำเร็จ"));
};
$("again").onclick = () => (mode === "host" ? hostDeal() : localDeal(deck.players.map((p) => p.name)));
$("back").onclick = () => {
  if (mode === "host") write(`live/${code}/state`, { round: 1, locked: false }).catch(() => {});
  openSetup();
};

// ---------------------------------------------------------------- host room
async function enterHost(c) {
  mode = "host";
  code = c;
  room = null;
  $("hostCode").textContent = c;
  $("qr").innerHTML = await qrSvg(joinUrl(c));
  const saved = await read(`liveRoles/${c}/host`).catch(() => null);
  let restored = false;
  unwatch?.();
  unwatch = watchRoom(c, (v) => {
    room = v;
    if (!v?.meta) return closedRoom();
    if (!restored) {
      restored = true;
      if (saved && v.state?.deal === saved.id) {
        deck = saved;
        game = deck.kind;
        for (const x of $("games").children) x.classList.toggle("active", x.dataset.game === game);
        startPlay();
        if (v.state.timerEnd > now() && $("tClock")) {
          $("tStart").textContent = "↺ เริ่มใหม่";
          timer = runClock($("tClock"), v.state.timerEnd, () => navigator.vibrate?.([200, 100, 200]));
        }
        if (v.state.reveal) {
          $("revealBox").innerHTML = revealHTML(v.state.reveal);
          $("revealBox").hidden = false;
        }
        return;
      }
      openSetup();
    }
    renderRoom();
    if (!$("setup").hidden) renderOpts();
  });
}
$("copyLink").onclick = () => copyText(joinUrl(code));

function renderRoom() {
  if (!room) return;
  const players = playerList();
  const st = room.state || {};
  $("playerCount").textContent = `(${players.filter((p) => p.online).length}/${players.length})`;
  $("playerList").innerHTML = players.length
    ? players
        .map((p) => {
          const inDeal = st.deal && st.roster?.[p.id];
          const tag = !st.deal ? "" : !inDeal ? " · รอรอบหน้า" : p.seen === st.deal ? " ✓" : " · ยังไม่เปิดดู";
          return `<li class="${inDeal && p.seen === st.deal ? "ok" : ""}"><span class="tl-dot${p.online ? " on" : ""}"></span>${esc(p.name)}<small>${tag}</small></li>`;
        })
        .join("")
    : '<li class="rl-empty">ยังไม่มีใครเข้าห้อง ให้ทุกคนสแกน QR</li>';
}

async function hostDeal() {
  sfx("shuffle");
  const people = dealable().map((p) => ({ id: p.id, name: p.name }));
  const [min, max] = LIMITS[game];
  if (people.length < min || people.length > max) return toast(`ต้องมีคนออนไลน์ ${min}–${max} คน`);
  deck = clean(buildDeck(people));
  const cards = { host: deck };
  for (const p of deck.players) cards[p.id] = clean({ deal: deck.id, card: cardData(p) });
  $("deal").disabled = $("again").disabled = true;
  try {
    await write(`liveRoles/${code}`, cards);
    await write(`live/${code}/state`, {
      round: 1,
      locked: false,
      deal: deck.id,
      game: deck.kind,
      roster: Object.fromEntries(deck.players.map((p) => [p.id, p.name])),
      summary: summary(),
      ...(deck.first ? { first: deck.first } : {}),
    });
    startPlay();
  } catch {
    toast("แจกบทไม่สำเร็จ ลองใหม่อีกครั้ง");
  } finally {
    $("again").disabled = false;
    if (!$("setup").hidden) renderOpts();
  }
}

$("endRoom").onclick = async () => {
  if (!confirm("ปิดห้องนี้? ผู้เล่นทุกคนจะหลุดจากห้อง")) return;
  const c = code;
  unwatch?.();
  unwatch = null;
  await remove(`liveRoles/${c}`).catch(() => {});
  for (const id of Object.keys(room?.players || {})) await remove(`live/${c}/players/${id}`).catch(() => {});
  await remove(`live/${c}/state`).catch(() => {});
  await remove(`live/${c}/meta`).catch(() => {});
  clearSession(KIND);
  code = room = deck = null;
  startScreen();
};

// ---------------------------------------------------------------- player
let myCard = null;
let pKey = "";
let pOpen = false;
let pClockEnd = 0;
let pTimer = null;

function enterPlayer(c) {
  mode = "player";
  code = c;
  joined = false;
  myCard = null;
  pKey = "";
  show("player");
  $("meCode").textContent = c;
  unwatch?.();
  unwatchCard?.();
  unwatch = watchRoom(c, (v) => {
    room = v;
    if (!v?.meta) return closedRoom();
    const me = v.players?.[uid()];
    if (!me) return joined ? kicked() : undefined;
    joined = true;
    $("meName").textContent = me.name;
    renderPlayer();
  });
  unwatchCard = watch(`liveRoles/${c}/${uid()}`, (v) => {
    myCard = v;
    renderPlayer();
  });
}

function renderPlayer() {
  if (!room) return;
  const st = room.state || {};
  const inDeal = st.deal && st.roster?.[uid()];
  const ready = inDeal && myCard?.deal === st.deal;
  let wait = "";
  if (!st.deal) wait = `<span class="rl-emoji">⏳</span><b>รอโฮสต์แจกบท…</b><small>ในห้องตอนนี้ ${Object.keys(room.players || {}).length} คน</small>`;
  else if (!inDeal) wait = `<span class="rl-emoji">🙈</span><b>รอบนี้แจกไปแล้ว</b><small>รอโฮสต์แจกรอบใหม่ แล้วคุณจะได้บทด้วย</small>`;
  else if (!ready) wait = `<span class="rl-emoji">📨</span><b>กำลังรับบท…</b>`;
  $("pWait").hidden = !wait;
  $("pWait").innerHTML = wait;
  $("pGame").hidden = !!wait;
  if (wait) {
    clearInterval(pTimer);
    pKey = "";
    return;
  }

  if (pKey !== st.deal) {
    pKey = st.deal;
    pOpen = false;
    pClockEnd = 0;
    clearInterval(pTimer);
    $("pClock").hidden = true;
    sfx("deal");
    window.SFX?.vibrate(80);
    $("pInfo").innerHTML =
      (st.summary ? `<div class="sg-panel"><span class="tl-label">บทในเกมนี้</span>${placesHTML(st.summary)}</div>` : "") + infoHTML(st.game, st.first);
    drawCard();
  }
  if ((st.timerEnd || 0) !== pClockEnd) {
    pClockEnd = st.timerEnd || 0;
    clearInterval(pTimer);
    $("pClock").hidden = !pClockEnd;
    if (pClockEnd) {
      $("pClock").innerHTML = `<span class="tl-num" id="pClockT"></span><small class="tl-hint">เวลาที่โฮสต์จับ</small>`;
      pTimer = runClock($("pClockT"), pClockEnd);
    }
  }
  if (st.reveal && $("pReveal").hidden) sfx("reveal");
  $("pReveal").hidden = !st.reveal;
  if (st.reveal) $("pReveal").innerHTML = revealHTML(st.reveal);
}
function drawCard() {
  $("pCard").className = pOpen ? "rl-card open" : "rl-card";
  $("pCard").innerHTML = pOpen ? cardHTML(myCard.card) : BACK("แตะเพื่อดูบท", "ดูคนเดียว อย่าให้ใครเห็น!");
}
$("pCard").onclick = () => {
  if (!myCard) return;
  pOpen = !pOpen;
  sfx("flip");
  drawCard();
  if (pOpen && room?.players?.[uid()]?.seen !== myCard.deal) write(`live/${code}/players/${uid()}/seen`, myCard.deal).catch(() => {});
};

$("leaveBtn").onclick = () => {
  unwatch?.();
  unwatchCard?.();
  clearInterval(pTimer);
  leaveRoom(KIND, code);
  code = room = null;
  startScreen();
};
function kicked() {
  unwatch?.();
  unwatchCard?.();
  clearSession(KIND);
  code = room = null;
  toast("คุณถูกเอาออกจากห้อง");
  startScreen();
}
function closedRoom() {
  unwatch?.();
  unwatchCard?.();
  clearInterval(pTimer);
  clearSession(KIND);
  const was = mode;
  code = room = null;
  if (was === "host" || was === "player") toast("ห้องนี้ปิดแล้ว");
  startScreen();
}

// ---------------------------------------------------------------- boot
(async function boot() {
  const joinCode = normalizeCode(new URLSearchParams(location.search).get("join"));
  const s = loadSession(KIND);
  if (!s) return startScreen(joinCode.length === 4 ? joinCode : "");
  try {
    await connect();
  } catch {
    toast("เชื่อมต่อไม่ได้ ใช้โหมดมือถือเครื่องเดียวได้");
    return startScreen();
  }
  if (!joinCode || joinCode === s.code) {
    const meta = await roomMeta(s.code).catch(() => null);
    if (meta && s.role === "host" && meta.hostUid === uid()) return enterHost(s.code);
    if (meta && s.role === "player" && s.name) {
      try {
        await joinRoom(KIND, s.code, s.name);
        return enterPlayer(s.code);
      } catch {}
    }
  }
  clearSession(KIND);
  startScreen(joinCode.length === 4 ? joinCode : "");
})();

// Player phone: choose or create a character, then the live character sheet.
import {
  S, L, $, esc, toast, KIND, sys, isSimple, defaultScore, modOf, statMod, statLabel, heroes, hpBar, statusBar,
  condChips, rollLine, sortRolls, sendRoll, form, alertBox, newId, list, clean, store, num, download, pickJson,
  pickCondition, fmtMod, hpChange, hpForm, put,
} from "./core.js";
import { RACES, CLASSES, AVATARS, CONDITIONS, DICE } from "./data.js";

const CHARS_KEY = "staygo-adv-chars";
const NOTES_KEY = (id) => `staygo-adv-notes-${id}`;
const ANSWERED_KEY = "staygo-adv-answered";

let unwatch = null;
let unwatchPriv = null;
let joined = false;
let exitTo = () => {};
let tab = "sheet";
let adv = 0;
let count = 1;
let lastTurn = "";
let seenRolls = null;
let seenMsgs = null;
let mySecret = []; // my secret rolls (the database does not let me read them back)
let answered = new Set(store.get(ANSWERED_KEY, []));
let saveTimer = null;

const uid = () => L.uid();
const me = () => S.room?.players?.[uid()];
const C = () => me()?.c;
const writeC = (obj) => L.patch(`live/${S.code}/players/${uid()}/c`, clean(obj)).catch(() => toast("บันทึกไม่สำเร็จ ตรวจอินเทอร์เน็ต"));
const show = (id) => {
  for (const s of ["start", "create", "player", "gm", "stage"]) $(s).hidden = s !== id;
  $("loading").hidden = true;
};

export function enterPlayer(code, exit) {
  exitTo = exit;
  S.code = code;
  S.role = "player";
  S.room = null;
  S.priv = null;
  joined = false;
  seenRolls = null;
  seenMsgs = null;
  mySecret = [];
  $("loading").hidden = false;
  unwatch?.();
  unwatchPriv?.();
  unwatch = L.watchRoom(code, onRoom);
  unwatchPriv = L.watch(`liveRoles/${code}/${uid()}`, (v) => {
    S.priv = v;
    if (C()) renderMsgs();
  });
}

function onRoom(v) {
  S.room = v;
  if (!v?.meta) return closed();
  const m = v.players?.[uid()];
  if (!m) return joined ? kicked() : undefined;
  joined = true;
  if (!m.c) {
    if ($("create").hidden) openCreate();
    return;
  }
  saveLocal(m.c);
  if ($("player").hidden) openSheet();
  render();
}

function saveLocal(c) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const all = store.get(CHARS_KEY, {});
    all[c.id] = { ...c, savedAt: Date.now() };
    store.set(CHARS_KEY, all);
  }, 800);
}

// ---------------------------------------------------------------- create / choose
let cAvatar = AVATARS[0];
let cClass = -1;

function openCreate() {
  show("create");
  window.scrollTo(0, 0);
  const saved = Object.values(store.get(CHARS_KEY, {})).sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0));
  $("savedChars").hidden = !saved.length;
  $("savedChars").innerHTML = `<h2 class="at-h2">📜 ตัวละครที่เคยเล่น</h2>${saved
    .map(
      (c) => `<div class="at-saved"><span class="at-av">${esc(c.e)}</span>
      <div class="at-saved-info"><b>${esc(c.name)}</b><small>${esc([c.race, c.cls].filter(Boolean).join(" · "))} · Lv ${c.level || 1}</small></div>
      <button class="sg-btn small blue" data-use="${esc(c.id)}">เล่นตัวนี้</button><button class="sg-btn small" data-del="${esc(c.id)}" aria-label="ลบ">🗑️</button></div>`,
    )
    .join("")}`;
  $("cAvatars").innerHTML = AVATARS.map((e) => `<button type="button" data-av="${e}" class="${e === cAvatar ? "on" : ""}">${e}</button>`).join("");
  $("cRaceList").innerHTML = RACES.map((r) => `<option value="${r}">`).join("");
  $("cClasses").innerHTML = CLASSES.map((c, i) => `<button type="button" data-cls="${i}" class="${i === cClass ? "on" : ""}">${c.emoji} ${c.name}</button>`).join("");
  renderCreateStats();
  if (!$("cHp").value) $("cHp").value = 10;
  if (!$("cAc").value) $("cAc").value = 12;
}

function renderCreateStats(values = null) {
  const s = sys();
  $("cStats").innerHTML = s.stats
    .map((st) => {
      const v = values?.[st.k] ?? defaultScore();
      return `<label class="at-cstat"><small>${esc(st.label)}</small>
        <input class="sg-input" type="number" inputmode="numeric" data-cstat="${st.k}" value="${v}" />
        <b class="tl-num" data-cmod="${st.k}">${fmtMod(modOf(v))}</b></label>`;
    })
    .join("");
  $("cStatHint").textContent = isSimple()
    ? "ใส่เป็นโบนัสเลย ปกติอยู่ระหว่าง −2 ถึง +5 ค่าที่ทอยจะเป็น d20 + ตัวเลขนี้"
    : "คะแนน 3–20 (10 = ธรรมดา) โบนัสตอนทอยคิดให้อัตโนมัติ ค่าที่ทอยจะเป็น d20 + โบนัส";
}
const readCreateStats = () => Object.fromEntries([...$("cStats").querySelectorAll("[data-cstat]")].map((i) => [i.dataset.cstat, num(i.value, defaultScore())]));

$("cStats").addEventListener("input", (e) => {
  const k = e.target.dataset.cstat;
  if (k) $("cStats").querySelector(`[data-cmod="${k}"]`).textContent = fmtMod(modOf(e.target.value));
});
$("cAvatars").onclick = (e) => {
  const b = e.target.closest("[data-av]");
  if (!b) return;
  cAvatar = b.dataset.av;
  $("cAvatars").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
};
$("cClasses").onclick = (e) => {
  const b = e.target.closest("[data-cls]");
  if (!b) return;
  cClass = +b.dataset.cls;
  $("cClasses").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
  const cls = CLASSES[cClass];
  $("cClassName").value = cls.name;
  if (!isSimple() && sys().stats.every((s) => s.k in cls.stats)) renderCreateStats(cls.stats);
  const st = readCreateStats();
  const conKey = sys().stats.find((s) => s.k === "con" || s.k === "body")?.k;
  $("cHp").value = cls.hp + (conKey ? modOf(st[conKey]) : 0);
  $("cAc").value = cls.ac;
};
$("cRoll").onclick = () => {
  const r = (n) => (crypto.getRandomValues(new Uint32Array(1))[0] % n) + 1;
  const vals = {};
  for (const st of sys().stats) {
    if (isSimple()) vals[st.k] = [-1, 0, 0, 1, 1, 2, 3][r(7) - 1];
    else {
      const four = [r(6), r(6), r(6), r(6)].sort((a, b) => a - b);
      vals[st.k] = four[1] + four[2] + four[3];
    }
  }
  renderCreateStats(vals);
  toast(isSimple() ? "สุ่มโบนัสแล้ว" : "สุ่มแบบ 4d6 ตัดลูกต่ำสุดแล้ว");
};

$("cSave").onclick = () => {
  const name = $("cName").value.trim();
  if (!name) return toast("ตั้งชื่อตัวละครก่อน");
  const cls = cClass >= 0 && CLASSES[cClass].name === $("cClassName").value.trim() ? CLASSES[cClass] : null;
  const max = Math.max(1, num($("cHp").value, 10));
  const abil = {};
  for (const a of cls?.abilities || []) abil[newId()] = { name: a.name, desc: a.desc || "", roll: a.roll || "", max: a.max || 0, left: a.max || 0, reset: a.reset || "none" };
  const items = {};
  for (const [n, q] of cls?.items || []) items[newId()] = { name: n, qty: q };
  useChar({
    id: newId(),
    name,
    e: cAvatar,
    race: $("cRace").value.trim(),
    cls: $("cClassName").value.trim(),
    level: 1,
    xp: 0,
    gold: 10,
    stats: readCreateStats(),
    hp: max,
    max,
    tmp: 0,
    ac: num($("cAc").value, 10),
    abil,
    items,
  });
};

function useChar(c) {
  const fresh = { ...c };
  delete fresh.savedAt;
  L.write(`live/${S.code}/players/${uid()}/c`, clean(fresh)).catch(() => toast("บันทึกตัวละครไม่สำเร็จ"));
}
$("savedChars").onclick = (e) => {
  const all = store.get(CHARS_KEY, {});
  const u = e.target.closest("[data-use]");
  if (u && all[u.dataset.use]) return useChar(all[u.dataset.use]);
  const d = e.target.closest("[data-del]");
  if (d && confirm(`ลบ ${all[d.dataset.del]?.name || "ตัวละครนี้"} ออกจากเครื่องนี้?`)) {
    delete all[d.dataset.del];
    store.set(CHARS_KEY, all);
    openCreate();
  }
};
$("cImport").onclick = async () => {
  const c = await pickJson();
  if (!c?.name || typeof c.stats !== "object") return c && toast("ไฟล์นี้ไม่ใช่ตัวละคร");
  useChar({ ...c, id: c.id || newId() });
};
$("cLeave").onclick = () => leave();

// ---------------------------------------------------------------- sheet
function openSheet() {
  show("player");
  window.scrollTo(0, 0);
  $("pCode").textContent = S.code;
  $("pDice").innerHTML = DICE.map((d) => `<button class="at-die" data-die="${d}"><span>d${d}</span></button>`).join("");
  try {
    $("pNotes").value = localStorage.getItem(NOTES_KEY(C().id)) || "";
  } catch {}
  setTab(tab);
}
function setTab(t) {
  tab = t;
  $("pTabs").querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
  $("player").querySelectorAll("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== t));
  $("pRollbar").hidden = !(t === "sheet" || t === "dice");
  if (t === "msgs") $("msgBadge").hidden = true;
}
$("pTabs").onclick = (e) => {
  const b = e.target.closest("[data-tab]");
  if (b) setTab(b.dataset.tab);
};
$("advSeg").onclick = (e) => {
  const b = e.target.closest("[data-adv]");
  if (!b) return;
  adv = +b.dataset.adv;
  $("advSeg").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
};
function resetRollOpts() {
  adv = 0;
  $("advSeg").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x.dataset.adv === "0"));
  $("secretChk").checked = false;
}
async function myRoll(expr, label, extra = {}) {
  const c = C();
  const secret = extra.secret ?? $("secretChk").checked;
  const entry = await sendRoll(expr, { label, adv: extra.adv ?? adv, secret, req: extra.req, who: c.name, e: c.e });
  if (entry && secret) mySecret.unshift({ ...entry, secret: true, t: Date.now(), id: newId() });
  resetRollOpts();
  renderLog();
}

function render() {
  const c = C();
  if (!c) return;
  $("pAv").textContent = c.e || "🙂";
  $("pName").textContent = c.name;
  $("pSub").textContent = `${[c.race, c.cls].filter(Boolean).join(" · ")} · Lv ${c.level || 1}`;
  put($("hpBtn"), hpBar(c.hp, c.max, c.tmp, { big: true }));
  put($("pConds"), condChips(c.conds, { removable: true }) + `<button class="at-cond add" data-addcond>+ สถานะ</button>`);
  renderBanners();
  renderSheet();
  renderBag();
  renderParty();
  renderMsgs();
  renderLog();
}

function renderBanners() {
  const st = S.room.state || {};
  const c = C();
  let html = "";
  const init = st.init;
  if (init?.on && init.order?.length) {
    const cur = init.order[init.turn % init.order.length];
    const mine = cur?.id === uid();
    html += `<div class="at-banner${mine ? " turn" : ""}">${mine ? "⚔️ ถึงตาคุณแล้ว!" : `ตาของ ${esc(cur?.e || "")} <b>${esc(cur?.name || "")}</b>`}<small>รอบที่ ${init.round}</small></div>`;
    const key = `${init.round}:${init.turn}`;
    if (mine && key !== lastTurn) {
      navigator.vibrate?.([120, 60, 120]);
      window.SFX?.play("turn");
    }
    lastTurn = mine ? key : "";
  }
  const rq = st.req;
  if (rq && (!rq.to || rq.to[uid()]) && !answered.has(rq.id)) {
    const label = rq.label || (rq.stat ? statLabel(rq.stat) : rq.expr);
    html += `<div class="at-banner req"><div>📣 GM ขอให้ทอย <b>${esc(label)}</b>${rq.dc != null ? ` · DC ${rq.dc}` : ""}${rq.secret ? " · 🔒 ลับ" : ""}${
      rq.stat ? `<small>d20 ${fmtMod(statMod(c, rq.stat))}</small>` : `<small>${esc(rq.expr)}</small>`
    }</div><button class="sg-btn yellow" data-reqgo>🎲 ทอยเลย</button></div>`;
  }
  const sc = st.scene;
  if (sc && (sc.title || sc.text || sc.img))
    html += `<details class="sg-panel at-scene" open><summary>🏞️ ${esc(sc.title || "ฉากตอนนี้")}</summary>${sc.text ? `<p>${esc(sc.text)}</p>` : ""}${
      sc.img ? `<img src="${esc(sc.img)}" alt="" />` : ""
    }</details>`;
  put($("pBanners"), html);
}
$("pBanners").onclick = (e) => {
  if (!e.target.closest("[data-reqgo]")) return;
  const rq = S.room.state?.req;
  if (!rq) return;
  const label = rq.label || (rq.stat ? statLabel(rq.stat) : rq.expr);
  const expr = rq.stat ? `d20${fmtMod(statMod(C(), rq.stat))}` : rq.expr;
  answered.add(rq.id);
  store.set(ANSWERED_KEY, [...answered].slice(-30));
  myRoll(expr, `📣 ${label}`, { req: rq.id, secret: !!rq.secret });
  renderBanners();
};

function renderSheet() {
  const c = C();
  const s = sys();
  const stats = s.stats
    .map((st) => {
      const v = c.stats?.[st.k] ?? defaultScore();
      return `<button class="at-stat" data-stat="${st.k}"><small>${esc(st.label)}</small><b class="tl-num">${fmtMod(modOf(v))}</b>${isSimple() ? "" : `<span>${v}</span>`}</button>`;
    })
    .join("");
  const bars = list(c.bars)
    .map(
      (b) => `<div class="at-barrow"><button class="at-barlabel" data-baredit="${b.id}">${esc(b.label)}</button>
      <button class="sg-btn small" data-bar="${b.id}" data-d="-1">−</button>
      <div class="at-hp res ${esc(b.color || "blue")}"><div class="at-hpfill" style="width:${Math.max(0, Math.min(100, (num(b.cur) / Math.max(1, num(b.max, 1))) * 100))}%"></div><span>${num(b.cur)}/${num(b.max)}</span></div>
      <button class="sg-btn small" data-bar="${b.id}" data-d="1">+</button></div>`,
    )
    .join("");
  const abil = list(c.abil)
    .map((a) => {
      const max = num(a.max, 0);
      const left = Math.min(max, num(a.left, max));
      return `<div class="at-abil"><div class="at-abil-head"><b>${esc(a.name)}</b>${max ? `<span class="at-pips">${"●".repeat(left)}${"○".repeat(max - left)}</span>` : ""}</div>
        ${a.desc ? `<p>${esc(a.desc)}</p>` : ""}
        <div class="tl-row">${max ? `<button class="sg-btn small yellow" data-use="${a.id}" ${left <= 0 ? "disabled" : ""}>ใช้ (${left}/${max})</button>` : ""}${
          a.roll ? `<button class="sg-btn small blue" data-aroll="${a.id}">🎲 ${esc(a.roll)}</button>` : ""
        }<button class="sg-btn small" data-aedit="${a.id}" aria-label="แก้ไข">✏️</button></div>
        ${max && a.reset && a.reset !== "none" ? `<small class="tl-hint">ฟื้นเมื่อ${a.reset === "short" ? "พักสั้นหรือพักยาว" : "พักยาว"}</small>` : ""}</div>`;
    })
    .join("");
  put(
    $("paneSheet"),
    `<div class="sg-panel tl-stack">
      <div class="at-labelrow"><span class="tl-label" style="margin:0">ค่าสถานะ · แตะเพื่อทอย</span><button class="sg-btn small" data-editchar>✏️ แก้ไขตัวละคร</button></div>
      <div class="at-stats">${stats}</div>
      <div class="at-minis"><span>🛡️ AC <b class="tl-num">${num(c.ac, 10)}</b></span><span>⭐ Lv <b class="tl-num">${c.level || 1}</b></span><span>✨ XP <b class="tl-num">${num(c.xp)}</b></span><span>🪙 <b class="tl-num">${num(c.gold)}</b></span></div>
    </div>
    <div class="sg-panel tl-stack">
      <div class="at-labelrow"><span class="tl-label" style="margin:0">หลอดพลังอื่นๆ</span><button class="sg-btn small" data-addbar>+ เพิ่มหลอด</button></div>
      ${bars || '<p class="tl-hint" style="margin:0">เช่น มานา พลังเวท สติ กระสุน</p>'}
    </div>
    <div class="sg-panel tl-stack">
      <div class="at-labelrow"><span class="tl-label" style="margin:0">ความสามารถ / สกิล / เวท</span><button class="sg-btn small" data-addabil>+ เพิ่ม</button></div>
      ${abil || '<p class="tl-hint" style="margin:0">ยังไม่มีความสามารถ</p>'}
      <div class="tl-row"><button class="sg-btn small" data-rest="short">☕ พักสั้น</button><button class="sg-btn small" data-rest="long">🛌 พักยาว</button></div>
    </div>`,
  );
}

async function editChar() {
  const c = C();
  const s = sys();
  const r = await form({
    title: "แก้ไขตัวละคร",
    fields: [
      { k: "name", label: "ชื่อ", value: c.name, max: 24 },
      { k: "e", label: "หน้าตา", type: "emoji", value: c.e, options: AVATARS },
      { k: "race", label: "เผ่า", value: c.race, list: RACES, max: 24 },
      { k: "cls", label: "อาชีพ", value: c.cls, list: CLASSES.map((x) => x.name), max: 24 },
      { k: "level", label: "เลเวล", type: "number", value: c.level || 1 },
      { k: "max", label: "HP สูงสุด", type: "number", value: c.max },
      { k: "ac", label: "ค่าป้องกัน (AC)", type: "number", value: c.ac },
      ...s.stats.map((st) => ({ k: `s_${st.k}`, label: `${st.label}${isSimple() ? " (โบนัส)" : " (คะแนน)"}`, type: "number", value: c.stats?.[st.k] ?? defaultScore() })),
    ],
  });
  if (!r) return;
  const stats = { ...(c.stats || {}) };
  for (const st of s.stats) stats[st.k] = num(r[`s_${st.k}`], defaultScore());
  const max = Math.max(1, num(r.max, c.max));
  writeC({
    name: r.name.trim() || c.name,
    e: r.e.trim() || c.e,
    race: r.race.trim(),
    cls: r.cls.trim(),
    level: Math.max(1, num(r.level, 1)),
    max,
    hp: Math.min(num(c.hp), max),
    ac: num(r.ac, c.ac),
    stats,
  });
}

async function editAbility(id) {
  const a = id ? C().abil?.[id] || {} : {};
  const r = await form({
    title: id ? "แก้ไขความสามารถ" : "เพิ่มความสามารถ",
    fields: [
      { k: "name", label: "ชื่อ", value: a.name || "", max: 40, placeholder: "เช่น ลูกไฟ" },
      { k: "desc", label: "คำอธิบาย", type: "textarea", value: a.desc || "", max: 300 },
      { k: "roll", label: "สูตรทอย (ไม่ใส่ก็ได้)", value: a.roll || "", placeholder: "เช่น 3d6 หรือ 1d8+3" },
      { k: "max", label: "ใช้ได้กี่ครั้ง (ไม่ใส่ = ไม่จำกัด)", type: "number", value: a.max || "" },
      { k: "reset", label: "ฟื้นจำนวนครั้งเมื่อ", type: "select", value: a.reset || "long", options: [["short", "พักสั้น"], ["long", "พักยาว"], ["none", "ไม่ฟื้น"]] },
    ],
    actions: id ? [{ v: "ok", label: "บันทึก", cls: "blue" }, { v: "del", label: "🗑️ ลบ", cls: "red" }] : [{ v: "ok", label: "เพิ่ม", cls: "blue" }],
  });
  if (!r) return;
  const key = id || newId();
  if (r.action === "del") return writeC({ [`abil/${key}`]: null });
  if (!r.name.trim()) return toast("ตั้งชื่อความสามารถก่อน");
  const max = Math.max(0, num(r.max, 0));
  writeC({ [`abil/${key}`]: { name: r.name.trim(), desc: r.desc.trim(), roll: r.roll.trim(), max, left: id ? Math.min(num(a.left, max), max) : max, reset: r.reset } });
}

async function editBar(id) {
  const b = id ? C().bars?.[id] || {} : {};
  const r = await form({
    title: id ? "แก้ไขหลอดพลัง" : "เพิ่มหลอดพลัง",
    fields: [
      { k: "label", label: "ชื่อ", value: b.label || "", placeholder: "เช่น มานา", max: 20 },
      { k: "max", label: "ค่าสูงสุด", type: "number", value: b.max ?? 10 },
      { k: "cur", label: "ตอนนี้", type: "number", value: b.cur ?? b.max ?? 10 },
      { k: "color", label: "สี", type: "select", value: b.color || "blue", options: [["blue", "🟦 ฟ้า"], ["purple", "🟪 ม่วง"], ["green", "🟩 เขียว"], ["yellow", "🟨 เหลือง"]] },
    ],
    actions: id ? [{ v: "ok", label: "บันทึก", cls: "blue" }, { v: "del", label: "🗑️ ลบ", cls: "red" }] : [{ v: "ok", label: "เพิ่ม", cls: "blue" }],
  });
  if (!r) return;
  const key = id || newId();
  if (r.action === "del") return writeC({ [`bars/${key}`]: null });
  const max = Math.max(1, num(r.max, 10));
  writeC({ [`bars/${key}`]: { label: r.label.trim() || "พลัง", max, cur: Math.max(0, Math.min(max, num(r.cur, max))), color: r.color } });
}

export function restPatch(c, kind) {
  const out = {};
  for (const [id, a] of Object.entries(c.abil || {})) if (a.max && (kind === "long" || a.reset === "short")) out[`abil/${id}/left`] = a.max;
  if (kind === "long") {
    out.hp = c.max;
    out.tmp = 0;
    for (const [id, b] of Object.entries(c.bars || {})) out[`bars/${id}/cur`] = b.max;
  }
  return out;
}

$("paneSheet").onclick = (e) => {
  const c = C();
  const t = e.target;
  const stat = t.closest("[data-stat]")?.dataset.stat;
  if (stat) return myRoll(`d20${fmtMod(statMod(c, stat))}`, statLabel(stat));
  if (t.closest("[data-editchar]")) return editChar();
  if (t.closest("[data-addabil]")) return editAbility(null);
  const ae = t.closest("[data-aedit]")?.dataset.aedit;
  if (ae) return editAbility(ae);
  const use = t.closest("[data-use]")?.dataset.use;
  if (use) {
    const a = c.abil[use];
    navigator.vibrate?.(30);
    window.SFX?.play("powerup");
    return writeC({ [`abil/${use}/left`]: Math.max(0, num(a.left, a.max) - 1) });
  }
  const ar = t.closest("[data-aroll]")?.dataset.aroll;
  if (ar) return myRoll(c.abil[ar].roll, c.abil[ar].name);
  if (t.closest("[data-addbar]")) return editBar(null);
  const be = t.closest("[data-baredit]")?.dataset.baredit;
  if (be) return editBar(be);
  const bar = t.closest("[data-bar]");
  if (bar) {
    const b = c.bars[bar.dataset.bar];
    return writeC({ [`bars/${bar.dataset.bar}/cur`]: Math.max(0, Math.min(num(b.max, 1), num(b.cur) + +bar.dataset.d)) });
  }
  const rest = t.closest("[data-rest]")?.dataset.rest;
  if (rest && confirm(rest === "long" ? "พักยาว? HP เต็ม หลอดพลังเต็ม ความสามารถฟื้นทั้งหมด" : "พักสั้น? ความสามารถที่ฟื้นตอนพักสั้นจะกลับมา")) {
    writeC(restPatch(c, rest));
    toast(rest === "long" ? "🛌 พักยาวแล้ว" : "☕ พักสั้นแล้ว");
  }
};

// HP + conditions (top panel)
$("hpMinus").onclick = () => writeC(hpChange(C(), "dmg", 1));
$("hpPlus").onclick = () => writeC(hpChange(C(), "heal", 1));
$("hpBtn").onclick = async () => {
  const r = await hpForm(C().name);
  if (r && num(r.amt, 0) > 0) writeC(hpChange(C(), r.action, r.amt));
};
$("pConds").onclick = async (e) => {
  if (e.target.closest("[data-addcond]")) {
    const c = await pickCondition(CONDITIONS);
    if (c) writeC({ [`conds/${c.k}`]: { e: c.e, label: c.label, ...(c.rounds ? { rounds: c.rounds } : {}) } });
    return;
  }
  const k = e.target.closest("[data-uncond]")?.dataset.uncond;
  if (k) writeC({ [`conds/${k}`]: null });
};

// ---------------------------------------------------------------- bag
function renderBag() {
  const c = C();
  const items = list(c.items).sort((a, b) => a.name.localeCompare(b.name, "th"));
  put(
    $("paneBag"),
    `<div class="sg-panel at-labelrow"><b>🪙 เงิน <span class="tl-num">${num(c.gold)}</span></b><button class="sg-btn small" data-gold>± ปรับเงิน</button></div>
    <div class="sg-panel tl-stack">
      <div class="at-labelrow"><span class="tl-label" style="margin:0">ของในกระเป๋า (${items.length})</span><button class="sg-btn small" data-additem>+ เพิ่มของ</button></div>
      ${
        items
          .map(
            (it) => `<div class="at-item"><div class="at-item-info"><b>${esc(it.name)}</b>${it.desc ? `<small>${esc(it.desc)}</small>` : ""}</div>
            <div class="rl-stepper"><button class="sg-btn small" data-qty="${it.id}" data-d="-1">−</button><b class="tl-num">${num(it.qty, 1)}</b><button class="sg-btn small" data-qty="${it.id}" data-d="1">+</button></div>
            <button class="sg-btn small" data-iedit="${it.id}" aria-label="แก้ไข">✏️</button></div>`,
          )
          .join("") || '<p class="tl-hint" style="margin:0">กระเป๋าว่าง</p>'
      }
    </div>`,
  );
}
async function editItem(id) {
  const it = id ? C().items?.[id] || {} : {};
  const r = await form({
    title: id ? "แก้ไขของ" : "เพิ่มของ",
    fields: [
      { k: "name", label: "ชื่อ", value: it.name || "", max: 40, placeholder: "เช่น เชือก" },
      { k: "qty", label: "จำนวน", type: "number", value: it.qty ?? 1 },
      { k: "desc", label: "รายละเอียด (ไม่ใส่ก็ได้)", value: it.desc || "", max: 120 },
    ],
    actions: id ? [{ v: "ok", label: "บันทึก", cls: "blue" }, { v: "del", label: "🗑️ ทิ้ง", cls: "red" }] : [{ v: "ok", label: "เพิ่ม", cls: "blue" }],
  });
  if (!r) return;
  const key = id || newId();
  if (r.action === "del") return writeC({ [`items/${key}`]: null });
  if (!r.name.trim()) return;
  writeC({ [`items/${key}`]: { name: r.name.trim(), qty: Math.max(1, num(r.qty, 1)), ...(r.desc.trim() ? { desc: r.desc.trim() } : {}) } });
}
$("paneBag").onclick = async (e) => {
  const c = C();
  if (e.target.closest("[data-additem]")) return editItem(null);
  const ie = e.target.closest("[data-iedit]")?.dataset.iedit;
  if (ie) return editItem(ie);
  const q = e.target.closest("[data-qty]");
  if (q) {
    const it = c.items[q.dataset.qty];
    const n = num(it.qty, 1) + +q.dataset.d;
    if (n <= 0 && !confirm(`ใช้ ${it.name} ชิ้นสุดท้ายหมดแล้ว เอาออกจากกระเป๋า?`)) return;
    return writeC({ [`items/${q.dataset.qty}`]: n <= 0 ? null : { ...it, qty: n } });
  }
  if (e.target.closest("[data-gold]")) {
    const r = await form({
      title: "ปรับเงิน",
      fields: [{ k: "amt", label: "จำนวน", type: "number", placeholder: "เช่น 25" }],
      actions: [{ v: "add", label: "➕ ได้เงิน", cls: "blue" }, { v: "pay", label: "➖ จ่าย" }],
    });
    const amt = num(r?.amt, 0);
    if (r && amt) writeC({ gold: Math.max(0, num(c.gold) + (r.action === "add" ? amt : -amt)) });
  }
};

// ---------------------------------------------------------------- party
export function partyHTML({ meId = null } = {}) {
  const st = S.room?.state || {};
  const heroesHtml = heroes()
    .map(
      (p) => `<div class="at-member${p.id === meId ? " me" : ""}${p.online ? "" : " off"}">
      <span class="at-av">${esc(p.c.e)}</span>
      <div class="at-member-main"><div class="at-member-name"><b>${esc(p.c.name)}</b><small>${esc(p.name)} · ${esc(p.c.cls || "")} Lv ${p.c.level || 1} · 🛡️ ${num(p.c.ac, 10)}</small></div>
      ${hpBar(p.c.hp, p.c.max, p.c.tmp)}<div class="at-conds">${condChips(p.c.conds)}</div></div></div>`,
    )
    .join("");
  const mons = list(st.mons)
    .filter((m) => !m.hidden)
    .map(
      (m) => `<div class="at-member mon"><span class="at-av">${esc(m.e)}</span><div class="at-member-main"><div class="at-member-name"><b>${esc(m.name)}</b></div>
      ${m.hp != null ? hpBar(m.hp, m.max) : statusBar(m.st, m.r ?? 1)}<div class="at-conds">${condChips(m.conds)}</div></div></div>`,
    )
    .join("");
  return { heroesHtml, mons, init: initHTML(st.init) };
}
export function initHTML(init) {
  if (!init?.on || !init.order?.length) return "";
  const turn = init.turn % init.order.length;
  return `<div class="sg-panel"><div class="at-labelrow"><b>⚔️ ลำดับเทิร์น</b><span class="tl-chip">รอบที่ ${init.round}</span></div>
    <ol class="at-order">${init.order
      .map((o, i) => `<li class="${i === turn ? "now" : ""}${o.kind === "m" ? " mon" : ""}"><span class="tl-num">${o.v}</span> ${esc(o.e)} ${esc(o.name)}</li>`)
      .join("")}</ol></div>`;
}
function renderParty() {
  const { heroesHtml, mons, init } = partyHTML({ meId: uid() });
  put(
    $("paneParty"),
    `${init}<div class="sg-panel tl-stack"><span class="tl-label" style="margin:0">👥 ปาร์ตี้</span>${heroesHtml}</div>${
      mons ? `<div class="sg-panel tl-stack"><span class="tl-label" style="margin:0">👾 ศัตรู</span>${mons}</div>` : ""
    }`,
  );
}

// ---------------------------------------------------------------- messages
function renderMsgs() {
  const msgs = list(S.priv?.msgs).sort((a, b) => (b.t || 0) - (a.t || 0));
  const ids = new Set(msgs.map((m) => m.id));
  if (seenMsgs === null) seenMsgs = ids;
  else {
    const fresh = msgs.filter((m) => !seenMsgs.has(m.id));
    seenMsgs = ids;
    if (fresh.length) {
      navigator.vibrate?.([80, 40, 80]);
      window.SFX?.play("notify");
      if (tab !== "msgs") $("msgBadge").hidden = false;
      openMsg(fresh[0]);
    }
  }
  put(
    $("pMsgs"),
    msgs.length
      ? msgs.map((m) => `<div class="sg-panel at-msg"><b>✉️ ${esc(m.title || "ข้อความจาก GM")}</b>${m.text ? `<p>${esc(m.text)}</p>` : ""}${m.img ? `<img src="${esc(m.img)}" alt="" />` : ""}</div>`).join("")
      : '<div class="sg-panel"><p class="tl-hint" style="margin:0">ยังไม่มีข้อความจาก GM · ข้อความลับและเบาะแสที่ส่งมาให้คุณคนเดียวจะอยู่ที่นี่</p></div>',
  );
}
const openMsg = (m) =>
  alertBox(`✉️ ${esc(m.title || "ข้อความจาก GM")}`, `${m.text ? `<p class="at-msgtext">${esc(m.text)}</p>` : ""}${m.img ? `<img class="at-msgimg" src="${esc(m.img)}" alt="" />` : ""}<p class="tl-hint">GM ส่งให้คุณคนเดียว</p>`);

$("pNotes").oninput = () => {
  try {
    localStorage.setItem(NOTES_KEY(C().id), $("pNotes").value);
  } catch {}
};
$("pExport").onclick = () => {
  const c = C();
  download(`${c.name}.json`, c);
};
$("pSwitch").onclick = () => {
  if (!confirm("เปลี่ยนตัวละคร? ตัวนี้ยังเก็บไว้ในเครื่อง เลือกกลับมาเล่นได้")) return;
  const c = C();
  const all = store.get(CHARS_KEY, {});
  all[c.id] = { ...c, savedAt: Date.now() };
  store.set(CHARS_KEY, all);
  L.write(`live/${S.code}/players/${uid()}/c`, null);
};
$("pLeave").onclick = () => leave();

// ---------------------------------------------------------------- dice tab + log
$("pDice").onclick = (e) => {
  const d = +e.target.closest("[data-die]")?.dataset.die;
  if (!d) return;
  myRoll(`${count}d${d}`, `${count}d${d}`, { adv: d === 20 && count === 1 ? adv : 0 });
};
document.querySelector(".at-count").onclick = (e) => {
  const b = e.target.closest("[data-count]");
  if (!b) return;
  count = Math.max(1, Math.min(20, count + +b.dataset.count));
  $("diceCount").textContent = count;
};
const exprGo = () => {
  const ex = $("pExpr").value.trim();
  if (ex) myRoll(ex, ex);
};
$("pExprGo").onclick = exprGo;
$("pExpr").onkeydown = (e) => e.key === "Enter" && exprGo();

function renderLog() {
  const rolls = sortRolls(S.room?.rolls);
  const ids = new Set(rolls.map((r) => r.id));
  if (seenRolls === null) seenRolls = ids;
  else {
    for (const r of rolls) if (!seenRolls.has(r.id) && r.uid !== uid()) toast(`🎲 ${r.who} ทอย ${r.label || r.expr} ได้ ${r.total}${r.crit === 1 ? " 🎉" : r.crit === -1 ? " 💥" : ""}`, 2600);
    seenRolls = ids;
  }
  const merged = [...rolls, ...mySecret].sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 40);
  put($("pLog"), merged.map(rollLine).join("") || '<li class="tl-hint">ยังไม่มีใครทอย</li>');
}

// ---------------------------------------------------------------- leave
function stop() {
  unwatch?.();
  unwatchPriv?.();
  unwatch = unwatchPriv = null;
  document.querySelectorAll(".at-modal").forEach((m) => m.remove());
  document.body.classList.remove("at-noscroll");
}
function leave() {
  stop();
  L.leaveRoom(KIND, S.code);
  S.code = S.room = null;
  exitTo();
}
function kicked() {
  stop();
  L.clearSession(KIND);
  S.code = S.room = null;
  toast("คุณถูกเอาออกจากห้อง");
  exitTo();
}
function closed() {
  stop();
  L.clearSession(KIND);
  S.code = S.room = null;
  toast("ห้องนี้ปิดแล้ว");
  exitTo();
}

// GM screen: party overview, turn order, monsters, roll requests, scenes, handouts, rewards, campaign saves.
import {
  S, L, $, esc, toast, KIND, sys, isSimple, statMod, statLabel, players, heroes, hpBar, condChips, rollLine, sortRolls,
  sendRoll, rollFx, form, alertBox, newId, list, clean, store, num, download, pickJson, pickCondition, tickConds,
  monsterStatus, hpChange, hpForm, put, fmtMod, modOf, defaultScore, joinUrlFor, imageData,
} from "./core.js";
import { MONSTERS, CONDITIONS, DICE, SYSTEMS } from "./data.js";
import { initHTML, restPatch } from "./player.js";

const CAMP_KEY = "staygo-adv-campaigns";
const GM_NOTES_KEY = "staygo-adv-gm-notes";

let unwatch = null;
let unwatchPriv = null;
let unwatchInbox = null;
let exitTo = () => {};
let seenRolls = null;
let gmSecret = [];
let notesLoaded = false;
let notesTimer = null;
let sysSig = "";
const rqTo = new Set();
const msTo = new Set();
const rwTo = new Set();

const show = (id) => {
  for (const s of ["start", "create", "player", "gm", "stage"]) $(s).hidden = s !== id;
  $("loading").hidden = true;
};
const room = () => S.room || {};
const st = () => room().state || {};
const mons = () => list(S.priv?.mons);
const patchHero = (pid, obj) => L.patch(`live/${S.code}/players/${pid}/c`, clean(obj)).catch(() => toast("บันทึกไม่สำเร็จ"));

export async function enterGm(code, exit, { sysKey } = {}) {
  exitTo = exit;
  S.code = code;
  S.role = "gm";
  S.room = S.priv = S.inbox = null;
  seenRolls = null;
  gmSecret = [];
  notesLoaded = false;
  sysSig = "";
  show("gm");
  $("gCode").textContent = code;
  $("gQr").innerHTML = await L.qrSvg(joinUrlFor(code));
  if (sysKey) await L.write(`live/${code}/state/sys`, SYSTEMS[sysKey]).catch(() => {});
  $("gMonPreset").innerHTML =
    MONSTERS.map((m, i) => `<option value="${i}">${m.e} ${m.name} (HP ${m.hp} · AC ${m.ac})</option>`).join("") + `<option value="custom">✏️ สร้างเอง…</option>`;
  $("gDice").innerHTML = DICE.map((d) => `<button class="at-die" data-die="${d}"><span>d${d}</span></button>`).join("");
  $("stSys").innerHTML = [...Object.entries(SYSTEMS).map(([k, s]) => `<option value="${k}">${s.label}</option>`), `<option value="custom">✏️ ตั้งชื่อค่าสถานะเอง</option>`].join("");
  renderCamps();
  setTab("fight");
  unwatch?.();
  unwatchPriv?.();
  unwatchInbox?.();
  unwatch = L.watchRoom(code, (v) => {
    S.room = v;
    if (!v?.meta) return closed();
    render();
  });
  unwatchPriv = L.watch(`liveRoles/${code}/host`, (v) => {
    S.priv = v;
    if (!notesLoaded) {
      notesLoaded = true;
      $("gNotes").value = v?.notes ?? store.get(GM_NOTES_KEY, "");
    }
    render();
  });
  unwatchInbox = L.watch(`liveInbox/${code}`, (v) => {
    S.inbox = v;
    render();
  });
}

function setTab(t) {
  $("gTabs").querySelectorAll("[data-tab]").forEach((b) => b.classList.toggle("on", b.dataset.tab === t));
  $("gm").querySelectorAll("[data-pane]").forEach((p) => (p.hidden = p.dataset.pane !== t));
}
$("gTabs").onclick = (e) => {
  const b = e.target.closest("[data-tab]");
  if (b) setTab(b.dataset.tab);
};
$("gCopy").onclick = () => L.copyText(joinUrlFor(S.code));
$("gScreen").onclick = () => window.open(joinUrlFor(S.code, "screen"), "_blank", "noopener");

function render() {
  if (!S.room) return;
  renderParty();
  renderInit();
  renderMons();
  renderSysBits();
  renderChips();
  renderReq();
  renderLog();
  renderScene();
  $("gShowHp").checked = !!st().showMonHp;
}

// ---------------------------------------------------------------- party
function renderParty() {
  const ps = players();
  $("gCount").textContent = `(${heroes().length})`;
  put(
    $("gParty"),
    ps.length
      ? ps
          .map((p) => {
            if (!p.c) return `<div class="at-member pending"><span class="at-av">⏳</span><div class="at-member-main"><b>${esc(p.name)}</b><small class="tl-hint">กำลังสร้างตัวละคร…</small></div></div>`;
            const c = p.c;
            return `<div class="at-member${p.online ? "" : " off"}">
              <span class="at-av">${esc(c.e)}</span>
              <div class="at-member-main">
                <div class="at-member-name"><b>${esc(c.name)}</b><small>${esc(p.name)}${p.online ? "" : " (ออฟไลน์)"} · ${esc(c.cls || "")} Lv ${c.level || 1} · 🛡️ ${num(c.ac, 10)}</small></div>
                ${hpBar(c.hp, c.max, c.tmp)}
                <div class="at-conds">${list(c.conds).map((x) => `<span class="at-cond" data-pcond="${p.id}|${esc(x.id)}">${esc(x.e)} ${esc(x.label)}${x.rounds ? ` <small>${x.rounds}</small>` : ""} ✕</span>`).join("")}</div>
                <div class="at-member-btns">
                  <button class="sg-btn small" data-php="${p.id}">❤️ HP</button>
                  <button class="sg-btn small" data-pcondadd="${p.id}">🏷️ สถานะ</button>
                  <button class="sg-btn small" data-psheet="${p.id}">📜 ใบ</button>
                </div>
              </div></div>`;
          })
          .join("")
      : '<p class="tl-hint">ยังไม่มีผู้เล่น ให้ทุกคนสแกน QR</p>',
  );
}
$("gParty").onclick = async (e) => {
  const t = e.target;
  const hp = t.closest("[data-php]")?.dataset.php;
  const p = (id) => room().players?.[id];
  if (hp) {
    const c = p(hp)?.c;
    const r = c && (await hpForm(c.name));
    if (r && num(r.amt, 0) > 0) patchHero(hp, hpChange(p(hp).c, r.action, r.amt));
    return;
  }
  const ca = t.closest("[data-pcondadd]")?.dataset.pcondadd;
  if (ca) {
    const c = await pickCondition(CONDITIONS);
    if (c) patchHero(ca, { [`conds/${c.k}`]: { e: c.e, label: c.label, ...(c.rounds ? { rounds: c.rounds } : {}) } });
    return;
  }
  const pc = t.closest("[data-pcond]")?.dataset.pcond;
  if (pc) {
    const [pid, k] = pc.split("|");
    return patchHero(pid, { [`conds/${k}`]: null });
  }
  const sh = t.closest("[data-psheet]")?.dataset.psheet;
  if (sh) return sheetView(sh);
};

async function sheetView(pid) {
  const pl = room().players?.[pid];
  const c = pl?.c;
  if (!c) return;
  const stats = sys()
    .stats.map((s) => {
      const v = c.stats?.[s.k] ?? defaultScore();
      return `<span class="at-sv"><small>${esc(s.label)}</small><b>${fmtMod(modOf(v))}</b>${isSimple() ? "" : `<i>${v}</i>`}</span>`;
    })
    .join("");
  const abil = list(c.abil)
    .map((a) => `<li><b>${esc(a.name)}</b>${a.max ? ` (${num(a.left, a.max)}/${a.max})` : ""}${a.roll ? ` · 🎲 ${esc(a.roll)}` : ""}${a.desc ? `<br><small>${esc(a.desc)}</small>` : ""}</li>`)
    .join("");
  const items = list(c.items).map((i) => `<li>${esc(i.name)} × ${num(i.qty, 1)}</li>`).join("");
  const r = await form({
    title: `${esc(c.e)} ${esc(c.name)}`,
    wide: true,
    intro: `<p class="tl-hint" style="margin:0">${esc(pl.name)} · ${esc([c.race, c.cls].filter(Boolean).join(" · "))} · Lv ${c.level || 1} · ✨ XP ${num(c.xp)} · 🪙 ${num(c.gold)} · 🛡️ AC ${num(c.ac, 10)}</p>
      ${hpBar(c.hp, c.max, c.tmp)}<div class="at-sheetview">${stats}</div>
      <b>ความสามารถ</b><ul class="at-ul">${abil || "<li>—</li>"}</ul><b>กระเป๋า</b><ul class="at-ul">${items || "<li>—</li>"}</ul>`,
    actions: [{ v: "ok", label: "ปิด", cls: "blue" }, { v: "kick", label: "เอาออกจากห้อง", cls: "red" }],
  });
  if (r?.action === "kick" && confirm(`เอา ${pl.name} ออกจากห้อง?`)) L.remove(`live/${S.code}/players/${pid}`);
}

async function partyRest(kind) {
  if (!confirm(kind === "long" ? "ทั้งปาร์ตี้พักยาว? HP และความสามารถฟื้นทั้งหมด" : "ทั้งปาร์ตี้พักสั้น? ความสามารถที่ฟื้นตอนพักสั้นจะกลับมา")) return;
  for (const p of heroes()) patchHero(p.id, restPatch(p.c, kind));
  toast(kind === "long" ? "🛌 ทั้งปาร์ตี้พักยาวแล้ว" : "☕ ทั้งปาร์ตี้พักสั้นแล้ว");
}
$("gRestShort").onclick = () => partyRest("short");
$("gRestLong").onclick = () => partyRest("long");

// ---------------------------------------------------------------- monsters
const bucket = (hp, max) => (hp <= 0 ? 0 : hp / max < 0.25 ? 0.15 : hp / max < 0.5 ? 0.4 : hp < max ? 0.75 : 1);
const pub = (m) =>
  m.hidden
    ? null
    : clean({
        name: m.name,
        e: m.e,
        st: monsterStatus(m.hp, m.max),
        r: bucket(m.hp, m.max),
        conds: m.conds || null,
        ...(st().showMonHp ? { hp: m.hp, max: m.max } : {}),
      });
function saveMon(id, m) {
  if (m === null) {
    L.remove(`liveRoles/${S.code}/host/mons/${id}`);
    L.remove(`live/${S.code}/state/mons/${id}`);
    return;
  }
  L.write(`liveRoles/${S.code}/host/mons/${id}`, clean(m)).catch(() => toast("บันทึกมอนสเตอร์ไม่สำเร็จ"));
  L.write(`live/${S.code}/state/mons/${id}`, pub(m)).catch(() => {});
}
function uniqueName(base) {
  const names = new Set(mons().map((m) => m.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base} ${i}`)) i++;
  return `${base} ${i}`;
}
async function monForm(m = null) {
  const r = await form({
    title: m ? `แก้ไข ${esc(m.name)}` : "สร้างมอนสเตอร์ / NPC",
    fields: [
      { k: "name", label: "ชื่อ", value: m?.name || "", max: 30, placeholder: "เช่น ราชาก็อบลิน" },
      { k: "e", label: "หน้าตา", type: "emoji", value: m?.e || "👾", options: ["👾", "👹", "👺", "🧟", "🧛", "🐉", "🐍", "🦂", "🐗", "🦇", "🧙", "🤴", "👮", "🧔", "👵", "🤖"] },
      { k: "max", label: "HP สูงสุด", type: "number", value: m?.max ?? 10 },
      { k: "ac", label: "AC", type: "number", value: m?.ac ?? 12 },
      { k: "init", label: "โบนัสลำดับเทิร์น", type: "number", value: m?.init ?? 0 },
      { k: "atk", label: "สูตรโจมตี", value: m?.atk || "1d6", max: 40 },
      { k: "notes", label: "โน้ต (ผู้เล่นไม่เห็น)", type: "textarea", value: m?.notes || "", max: 400 },
    ],
  });
  if (!r) return null;
  const max = Math.max(1, num(r.max, 10));
  return {
    ...(m || {}),
    name: r.name.trim() || m?.name || "มอนสเตอร์",
    e: r.e.trim() || "👾",
    max,
    hp: m ? Math.min(m.hp, max) : max,
    ac: num(r.ac, 12),
    init: num(r.init, 0),
    atk: r.atk.trim(),
    notes: r.notes.trim(),
  };
}
$("gMonAdd").onclick = async () => {
  const v = $("gMonPreset").value;
  let m;
  if (v === "custom") {
    m = await monForm();
    if (!m) return;
    m.name = uniqueName(m.name);
  } else {
    const p = MONSTERS[+v];
    m = { name: uniqueName(p.name), e: p.e, hp: p.hp, max: p.hp, ac: p.ac, init: p.init, atk: p.atk };
  }
  saveMon(newId(), m);
};
$("gShowHp").onchange = async () => {
  await L.write(`live/${S.code}/state/showMonHp`, $("gShowHp").checked);
  for (const m of mons()) L.write(`live/${S.code}/state/mons/${m.id}`, pub(m)).catch(() => {});
};

function renderMons() {
  const ms = mons();
  put(
    $("gMons"),
    ms.length
      ? ms
          .map(
            (m) => `<div class="at-mon${m.hp <= 0 ? " dead" : ""}${m.hidden ? " hiddenmon" : ""}">
            <div class="at-mon-head"><span class="at-av">${esc(m.e)}</span><div class="at-member-name"><b>${esc(m.name)}</b>
              <small>🛡️ AC ${m.ac} · ลำดับ ${fmtMod(num(m.init))} · โจมตี ${esc(m.atk || "-")}${m.hidden ? " · 🙈 ซ่อนจากผู้เล่น" : ""}</small></div></div>
            ${hpBar(m.hp, m.max)}
            ${m.notes ? `<small class="tl-hint">📝 ${esc(m.notes)}</small>` : ""}
            <div class="at-conds">${list(m.conds).map((x) => `<span class="at-cond" data-mcond="${m.id}|${esc(x.id)}">${esc(x.e)} ${esc(x.label)}${x.rounds ? ` <small>${x.rounds}</small>` : ""} ✕</span>`).join("")}</div>
            <div class="at-member-btns">
              <button class="sg-btn small" data-mhp="${m.id}">❤️ HP</button>
              ${m.atk ? `<button class="sg-btn small blue" data-matk="${m.id}">🎲 โจมตี</button>` : ""}
              <button class="sg-btn small" data-mcondadd="${m.id}">🏷️</button>
              <button class="sg-btn small" data-mhide="${m.id}" aria-label="ซ่อน/แสดง">${m.hidden ? "👁️ แสดง" : "🙈"}</button>
              <button class="sg-btn small" data-medit="${m.id}" aria-label="แก้ไข">✏️</button>
              <button class="sg-btn small" data-mdel="${m.id}" aria-label="ลบ">🗑️</button>
            </div></div>`,
          )
          .join("")
      : '<p class="tl-hint" style="margin:0">เลือกมอนสเตอร์สำเร็จรูปแล้วกดเพิ่ม หรือสร้างเอง · กด 🙈 เพื่อเตรียมไว้ก่อนโดยผู้เล่นยังไม่เห็น</p>',
  );
}
$("gMons").onclick = async (e) => {
  const t = e.target;
  const get = (attr) => {
    const id = t.closest(`[${attr}]`)?.getAttribute(attr);
    return id ? [id, S.priv?.mons?.[id.split("|")[0]]] : [null, null];
  };
  let [id, m] = get("data-mhp");
  if (m) {
    const r = await hpForm(m.name);
    if (r && num(r.amt, 0) > 0) {
      const h = hpChange({ ...m, tmp: 0 }, r.action === "tmp" ? "heal" : r.action, r.amt);
      saveMon(id, { ...m, hp: h.hp });
      if (h.hp <= 0 && m.hp > 0) toast(`💀 ${m.name} ล้มแล้ว!`);
    }
    return;
  }
  [id, m] = get("data-matk");
  if (m) return sendRoll(m.atk, { label: `${m.name} โจมตี`, who: m.name, e: m.e, local: $("gSecret").checked }).then((r) => r && $("gSecret").checked && pushGmSecret(r));
  [id, m] = get("data-mcondadd");
  if (m) {
    const c = await pickCondition(CONDITIONS);
    if (c) saveMon(id, { ...m, conds: { ...(m.conds || {}), [c.k]: { e: c.e, label: c.label, ...(c.rounds ? { rounds: c.rounds } : {}) } } });
    return;
  }
  [id, m] = get("data-mcond");
  if (m) {
    const [mid, k] = id.split("|");
    const conds = { ...(m.conds || {}) };
    delete conds[k];
    return saveMon(mid, { ...m, conds });
  }
  [id, m] = get("data-mhide");
  if (m) return saveMon(id, { ...m, hidden: !m.hidden });
  [id, m] = get("data-medit");
  if (m) {
    const nm = await monForm(m);
    if (nm) saveMon(id, nm);
    return;
  }
  [id, m] = get("data-mdel");
  if (m && confirm(`ลบ ${m.name}?`)) {
    saveMon(id, null);
    const init = st().init;
    if (init?.order) {
      const order = init.order.filter((o) => o.id !== id);
      L.write(`live/${S.code}/state/init/order`, order.length ? order : null);
    }
  }
};

// ---------------------------------------------------------------- turn order
const d20 = () => (crypto.getRandomValues(new Uint32Array(1))[0] % 20) + 1;
function rollActors(only = null) {
  const out = [];
  for (const p of heroes()) {
    if (!p.online || (only && !only.has(p.id))) continue;
    const mod = statMod(p.c, sys().init || sys().stats[0].k);
    out.push({ id: p.id, kind: "p", name: p.c.name, e: p.c.e, v: d20() + mod, mod });
  }
  for (const m of mons()) {
    if (m.hidden || m.hp <= 0 || (only && !only.has(m.id))) continue;
    out.push({ id: m.id, kind: "m", name: m.name, e: m.e, v: d20() + num(m.init), mod: num(m.init) });
  }
  return out;
}
const sortOrder = (o) => o.sort((a, b) => b.v - a.v || b.mod - a.mod);
const writeInit = (init) => L.write(`live/${S.code}/state/init`, init ? clean(init) : null);

function renderInit() {
  const init = st().init;
  if (!init?.on) {
    put(
      $("gInit"),
      `<div class="at-labelrow"><b>⚔️ ลำดับเทิร์น</b></div>
      <p class="tl-hint" style="margin:0">กดเริ่มต่อสู้ ระบบจะทอย d20 + โบนัส${esc(statLabel(sys().init || sys().stats[0].k))} ให้ผู้เล่นทุกคนที่ออนไลน์ และมอนสเตอร์ที่แสดงอยู่ แล้วเรียงลำดับให้</p>
      <button class="sg-btn red block" data-istart>⚔️ เริ่มต่อสู้!</button>`,
    );
    return;
  }
  const turn = init.turn % Math.max(1, init.order?.length || 1);
  const alive = (o) => o.kind === "p" || (S.priv?.mons?.[o.id]?.hp ?? 1) > 0;
  put(
    $("gInit"),
    `<div class="at-labelrow"><b>⚔️ ลำดับเทิร์น</b><span class="tl-chip">รอบที่ ${init.round}</span></div>
    <ol class="at-order gm">${(init.order || [])
      .map(
        (o, i) => `<li class="${i === turn ? "now" : ""}${o.kind === "m" ? " mon" : ""}${alive(o) ? "" : " dead"}">
        <button class="at-initv tl-num" data-iv="${i}" aria-label="แก้ค่าลำดับ">${o.v}</button><span>${esc(o.e)} ${esc(o.name)}</span>
        <span class="at-order-btns"><button data-iup="${i}" aria-label="เลื่อนขึ้น">▲</button><button data-idown="${i}" aria-label="เลื่อนลง">▼</button><button data-idel="${i}" aria-label="เอาออก">✕</button></span></li>`,
      )
      .join("")}</ol>
    <div class="tl-row"><button class="sg-btn" data-iprev>◀ ก่อนหน้า</button><button class="sg-btn blue" data-inext>ถัดไป ▶</button></div>
    <div class="tl-row"><button class="sg-btn small" data-iadd>+ เพิ่มคนที่ยังไม่อยู่ในลำดับ</button><button class="sg-btn small" data-ireroll>🎲 ทอยใหม่ทั้งหมด</button><button class="sg-btn small" data-iend>🏁 จบการต่อสู้</button></div>`,
  );
}
function advance(dir) {
  const init = st().init;
  const order = init.order || [];
  if (!order.length) return;
  let { turn, round } = init;
  for (let guard = 0; guard < order.length; guard++) {
    turn += dir;
    if (turn >= order.length) {
      turn = 0;
      round++;
      newRound();
    } else if (turn < 0) {
      if (round <= 1) {
        turn = 0;
        break;
      }
      turn = order.length - 1;
      round--;
    }
    const o = order[turn];
    if (o.kind === "p" || (S.priv?.mons?.[o.id]?.hp ?? 1) > 0) break;
  }
  writeInit({ ...init, turn, round });
}
function newRound() {
  for (const p of heroes()) if (Object.values(p.c.conds || {}).some((c) => c.rounds)) patchHero(p.id, { conds: tickConds(p.c.conds) });
  for (const m of mons()) if (Object.values(m.conds || {}).some((c) => c.rounds)) saveMon(m.id, { ...m, conds: tickConds(m.conds) });
}
$("gInit").onclick = async (e) => {
  const t = e.target;
  const init = st().init;
  if (t.closest("[data-istart]")) {
    const order = sortOrder(rollActors());
    if (!order.length) return toast("ยังไม่มีใครให้จัดลำดับ");
    return writeInit({ on: true, round: 1, turn: 0, order });
  }
  if (!init) return;
  const order = [...(init.order || [])];
  if (t.closest("[data-inext]")) return advance(1);
  if (t.closest("[data-iprev]")) return advance(-1);
  if (t.closest("[data-iend]")) return confirm("จบการต่อสู้?") && writeInit(null);
  if (t.closest("[data-ireroll]")) return writeInit({ ...init, turn: 0, order: sortOrder(rollActors()) });
  if (t.closest("[data-iadd]")) {
    const have = new Set(order.map((o) => o.id));
    const missing = new Set([...heroes().map((p) => p.id), ...mons().map((m) => m.id)].filter((id) => !have.has(id)));
    const add = rollActors(missing);
    if (!add.length) return toast("ทุกคนอยู่ในลำดับแล้ว");
    const cur = order[init.turn];
    const next = sortOrder([...order, ...add]);
    return writeInit({ ...init, order: next, turn: Math.max(0, next.indexOf(next.find((o) => o.id === cur?.id))) });
  }
  const swap = (i, j) => {
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    const turn = init.turn === i ? j : init.turn === j ? i : init.turn;
    writeInit({ ...init, order, turn });
  };
  const up = t.closest("[data-iup]")?.dataset.iup;
  if (up !== undefined) return swap(+up, +up - 1);
  const down = t.closest("[data-idown]")?.dataset.idown;
  if (down !== undefined) return swap(+down, +down + 1);
  const del = t.closest("[data-idel]")?.dataset.idel;
  if (del !== undefined) {
    order.splice(+del, 1);
    return writeInit(order.length ? { ...init, order, turn: Math.min(init.turn > +del ? init.turn - 1 : init.turn, order.length - 1) } : null);
  }
  const iv = t.closest("[data-iv]")?.dataset.iv;
  if (iv !== undefined) {
    const r = await form({ title: `ค่าลำดับของ ${esc(order[+iv].name)}`, fields: [{ k: "v", label: "ค่า", type: "number", value: order[+iv].v }] });
    if (!r) return;
    const cur = order[init.turn];
    order[+iv] = { ...order[+iv], v: num(r.v, order[+iv].v) };
    const next = sortOrder(order);
    writeInit({ ...init, order: next, turn: next.indexOf(cur) });
  }
};

// ---------------------------------------------------------------- roll requests + GM dice
// The database returns object keys sorted, so compare systems by their content, not JSON text.
const sysSigOf = (s) => `${s.mode}|${s.init}|${(s.stats || []).map((x) => `${x.k}:${x.label}`).join(",")}`;
function renderSysBits() {
  const s = sys();
  const sig = sysSigOf(s);
  if (sig === sysSig) return;
  sysSig = sig;
  const keep = $("rqStat").value;
  $("rqStat").innerHTML = s.stats.map((x) => `<option value="${x.k}">${esc(x.label)} (d20 + โบนัส)</option>`).join("") + `<option value="expr">✏️ สูตรเอง</option>`;
  if ([...$("rqStat").options].some((o) => o.value === keep)) $("rqStat").value = keep;
  $("rqExprBox").hidden = $("rqStat").value !== "expr";
  const preset = Object.entries(SYSTEMS).find(([, v]) => sysSigOf(v) === sig)?.[0];
  $("stSys").value = preset || "custom";
  $("stCustomBox").hidden = !!preset;
  if (!preset) {
    $("stCustom").value = s.stats.map((x) => x.label).join("\n");
    $("stMode").value = s.mode;
  }
}
$("rqStat").onchange = () => ($("rqExprBox").hidden = $("rqStat").value !== "expr");

function chipsHTML(set, { allLabel } = {}) {
  const hs = heroes();
  return (
    (allLabel ? `<button type="button" data-chip="*" class="${set.size === 0 ? "on" : ""}">${allLabel}</button>` : "") +
    hs.map((p) => `<button type="button" data-chip="${p.id}" class="${set.has(p.id) ? "on" : ""}">${esc(p.c.e)} ${esc(p.c.name)}</button>`).join("")
  );
}
function renderChips() {
  for (const set of [rqTo, msTo, rwTo]) for (const id of [...set]) if (!room().players?.[id]?.c) set.delete(id);
  put($("rqTo"), chipsHTML(rqTo, { allLabel: "👥 ทุกคน" }));
  put($("msTo"), chipsHTML(msTo) || '<p class="tl-hint" style="margin:0">ยังไม่มีผู้เล่น</p>');
  put($("rwTo"), chipsHTML(rwTo, { allLabel: "👥 ทั้งปาร์ตี้" }));
  const who = $("gWho");
  const opts = `<option value="">🎲 GM</option>` + mons().map((m) => `<option value="${m.id}">${esc(m.e)} ${esc(m.name)}</option>`).join("");
  if (who.__opts !== opts) {
    const keep = who.value;
    who.innerHTML = opts;
    who.__opts = opts;
    if ([...who.options].some((o) => o.value === keep)) who.value = keep;
  }
}
const chipToggle = (set, el, render = renderChips) => (e) => {
  const b = e.target.closest("[data-chip]");
  if (!b) return;
  if (b.dataset.chip === "*") set.clear();
  else if (set.has(b.dataset.chip)) set.delete(b.dataset.chip);
  else set.add(b.dataset.chip);
  render();
};
$("rqTo").onclick = chipToggle(rqTo);
$("msTo").onclick = chipToggle(msTo);
$("rwTo").onclick = chipToggle(rwTo);

$("rqSend").onclick = async () => {
  const stat = $("rqStat").value;
  const expr = stat === "expr" ? $("rqExpr").value.trim() : "";
  if (stat === "expr" && !expr) return toast("ใส่สูตรลูกเต๋า");
  const dc = $("rqDc").value.trim() === "" ? null : num($("rqDc").value);
  const id = newId();
  const showDc = $("rqShowDc").checked;
  const req = {
    id,
    stat: stat === "expr" ? null : stat,
    expr: expr || null,
    label: $("rqLabel").value.trim() || null,
    dc: showDc ? dc : null,
    to: rqTo.size ? Object.fromEntries([...rqTo].map((k) => [k, true])) : null,
    secret: $("rqSecret").checked,
  };
  if (dc != null && !showDc) await L.write(`liveRoles/${S.code}/host/dcs/${id}`, dc).catch(() => {});
  await L.write(`live/${S.code}/state/req`, clean(req));
  toast("📣 ส่งคำขอทอยแล้ว");
};

function renderReq() {
  const rq = st().req;
  if (!rq) return put($("rqResult"), "");
  const dc = rq.dc ?? S.priv?.dcs?.[rq.id] ?? null;
  const all = [...list(room().rolls), ...list(S.inbox)].filter((r) => r.req === rq.id);
  const targets = rq.to ? heroes().filter((p) => rq.to[p.id]) : heroes().filter((p) => p.online);
  let done = 0;
  const rows = targets
    .map((p) => {
      const r = all.find((x) => x.uid === p.id);
      if (r) done++;
      const pass = r && dc != null ? r.total >= dc : null;
      return `<li class="${pass === true ? "pass" : pass === false ? "fail" : ""}">${esc(p.c.e)} ${esc(p.c.name)}<b class="tl-num">${r ? r.total : "…"}</b>${
        pass === null ? "" : pass ? "✅ ผ่าน" : "❌ ไม่ผ่าน"
      }</li>`;
    })
    .join("");
  const label = rq.label || (rq.stat ? statLabel(rq.stat) : rq.expr);
  put(
    $("rqResult"),
    `<div class="at-req"><div class="at-labelrow"><b>📣 ${esc(label)}${dc != null ? ` · DC ${dc}${rq.dc == null ? " (ซ่อน)" : ""}` : ""}${rq.secret ? " 🔒" : ""}</b><span class="tl-chip">ทอยแล้ว ${done}/${targets.length}</span></div>
    <ul class="at-reqlist">${rows}</ul><button class="sg-btn small" data-rqclose>ปิดคำขอ</button></div>`,
  );
}
$("rqResult").onclick = (e) => e.target.closest("[data-rqclose]") && L.write(`live/${S.code}/state/req`, null);

function gmWho() {
  const id = $("gWho").value;
  const m = id && S.priv?.mons?.[id];
  return m ? { who: m.name, e: m.e } : { who: "GM", e: "🎲" };
}
function pushGmSecret(r) {
  gmSecret.unshift({ ...r, secret: true, t: Date.now(), id: newId() });
  gmSecret = gmSecret.slice(0, 30);
  renderLog();
}
async function gmRoll(expr, label) {
  const secret = $("gSecret").checked;
  const r = await sendRoll(expr, { label, ...gmWho(), local: secret });
  if (r && secret) pushGmSecret(r);
}
$("gDice").onclick = (e) => {
  const d = e.target.closest("[data-die]")?.dataset.die;
  if (d) gmRoll(`1d${d}`, `d${d}`);
};
const gExpr = () => {
  const ex = $("gExpr").value.trim();
  if (ex) gmRoll(ex, ex);
};
$("gExprGo").onclick = gExpr;
$("gExpr").onkeydown = (e) => e.key === "Enter" && gExpr();

function renderLog() {
  const rolls = sortRolls(room().rolls);
  const inbox = list(S.inbox);
  const ids = new Set([...rolls, ...inbox].map((r) => r.id));
  if (seenRolls === null) seenRolls = ids;
  else {
    const fresh = [...rolls, ...inbox].filter((r) => !seenRolls.has(r.id) && r.uid !== L.uid());
    seenRolls = ids;
    if (fresh.length) rollFx(fresh[fresh.length - 1], { small: true });
  }
  const merged = [...rolls, ...inbox.map((r) => ({ ...r, secret: true })), ...gmSecret].sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 50);
  put($("gLog"), merged.map(rollLine).join("") || '<li class="tl-hint">ยังไม่มีใครทอย</li>');
  // keep the log small
  if (rolls.length > 80) for (const r of rolls.slice(60)) L.remove(`live/${S.code}/rolls/${r.id}`).catch(() => {});
  if (inbox.length > 60) for (const r of inbox.sort((a, b) => (b.t || 0) - (a.t || 0)).slice(40)) L.remove(`liveInbox/${S.code}/${r.id}`).catch(() => {});
}

// ---------------------------------------------------------------- scene + handouts
function renderScene() {
  const sc = st().scene;
  put($("scNow"), sc ? `<div class="at-scene-now"><b>ตอนนี้: ${esc(sc.title || "(ไม่มีชื่อ)")}</b>${sc.text ? `<p>${esc(sc.text)}</p>` : ""}${sc.img ? `<img src="${esc(sc.img)}" alt="" />` : ""}</div>` : "");
}
$("scSend").onclick = async () => {
  const title = $("scTitle").value.trim();
  const text = $("scText").value.trim();
  const file = $("scImg").files?.[0];
  const img = file ? await imageData(file) : st().scene?.img || null;
  if (file && !img) toast("รูปใหญ่เกินไป ลองรูปอื่น");
  if (!title && !text && !img) return toast("ใส่ชื่อฉาก คำบรรยาย หรือรูปก่อน");
  await L.write(`live/${S.code}/state/scene`, clean({ title, text, img: img || undefined, t: Date.now() }));
  $("scImg").value = "";
  toast("🏞️ ประกาศฉากแล้ว");
};
$("scClear").onclick = () => {
  L.write(`live/${S.code}/state/scene`, null);
  $("scTitle").value = $("scText").value = "";
  $("scImg").value = "";
};
$("msSend").onclick = async () => {
  if (!msTo.size) return toast("เลือกผู้เล่นที่จะส่งให้ก่อน");
  const title = $("msTitle").value.trim();
  const text = $("msText").value.trim();
  const file = $("msImg").files?.[0];
  const img = file ? await imageData(file) : null;
  if (file && !img) return toast("รูปใหญ่เกินไป ลองรูปอื่น");
  if (!title && !text && !img) return toast("ใส่ข้อความหรือรูปก่อน");
  const id = newId();
  for (const pid of msTo) await L.write(`liveRoles/${S.code}/${pid}/msgs/${id}`, clean({ title, text, img: img || undefined, t: Date.now() })).catch(() => toast("ส่งไม่สำเร็จ"));
  toast(`✉️ ส่งให้ ${msTo.size} คนแล้ว`);
  $("msTitle").value = $("msText").value = "";
  $("msImg").value = "";
};

// ---------------------------------------------------------------- rewards
$("rwSend").onclick = () => {
  const targets = rwTo.size ? heroes().filter((p) => rwTo.has(p.id)) : heroes();
  if (!targets.length) return toast("ยังไม่มีผู้เล่น");
  const xp = num($("rwXp").value, 0);
  const gold = num($("rwGold").value, 0);
  const item = $("rwItem").value.trim();
  const qty = Math.max(1, num($("rwQty").value, 1));
  if (!xp && !gold && !item) return toast("ใส่ XP เงิน หรือไอเทมก่อน");
  for (const p of targets) {
    const patch = {};
    if (xp) patch.xp = Math.max(0, num(p.c.xp) + xp);
    if (gold) patch.gold = Math.max(0, num(p.c.gold) + gold);
    if (item) {
      const same = list(p.c.items).find((i) => i.name === item);
      if (same) patch[`items/${same.id}/qty`] = num(same.qty, 1) + qty;
      else patch[`items/${newId()}`] = { name: item, qty };
    }
    patchHero(p.id, patch);
  }
  toast(`🎁 มอบรางวัลให้ ${targets.length} คนแล้ว`);
  $("rwXp").value = $("rwGold").value = $("rwItem").value = $("rwQty").value = "";
};

// ---------------------------------------------------------------- settings
$("stSys").onchange = () => {
  $("stCustomBox").hidden = $("stSys").value !== "custom";
  if ($("stSys").value === "custom" && !$("stCustom").value) $("stCustom").value = sys().stats.map((x) => x.label).join("\n");
};
$("stApply").onclick = async () => {
  let s;
  if ($("stSys").value === "custom") {
    const labels = $("stCustom").value.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, 8);
    if (labels.length < 2) return toast("ใส่ชื่อค่าสถานะอย่างน้อย 2 ค่า");
    const stats = labels.map((l, i) => ({ k: `s${i}`, label: l.slice(0, 16), short: l.slice(0, 8) }));
    const initK = stats.find((x) => /ไว|เร็ว|ไหวพริบ|dex|agi/i.test(x.label))?.k || stats[0].k;
    s = { mode: $("stMode").value, label: "ตั้งเอง", stats, init: initK };
  } else s = SYSTEMS[$("stSys").value];
  if (sysSigOf(s) === sysSigOf(sys())) return toast("ใช้ระบบนี้อยู่แล้ว");
  if (heroes().length && !confirm("เปลี่ยนระบบค่าสถานะ? ผู้เล่นต้องกดแก้ไขตัวละครเพื่อใส่ค่าใหม่")) return;
  await L.write(`live/${S.code}/state/sys`, s);
  toast("📐 เปลี่ยนระบบค่าสถานะแล้ว");
};
$("gNotes").oninput = () => {
  clearTimeout(notesTimer);
  notesTimer = setTimeout(() => {
    store.set(GM_NOTES_KEY, $("gNotes").value);
    L.write(`liveRoles/${S.code}/host/notes`, $("gNotes").value).catch(() => {});
  }, 700);
};

function renderCamps() {
  const camps = Object.values(store.get(CAMP_KEY, {})).sort((a, b) => b.savedAt - a.savedAt);
  $("cpList").innerHTML = camps.length
    ? camps
        .map(
          (c) => `<div class="at-saved"><div class="at-saved-info"><b>${esc(c.name)}</b><small>${new Date(c.savedAt).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })} · ปาร์ตี้ ${
            (c.party || []).length
          } คน · มอนสเตอร์ ${Object.keys(c.mons || {}).length}</small></div>
          <button class="sg-btn small blue" data-cpload="${c.id}">โหลด</button><button class="sg-btn small" data-cpexp="${c.id}" aria-label="ส่งออก">⬇️</button><button class="sg-btn small" data-cpdel="${c.id}" aria-label="ลบ">🗑️</button></div>`,
        )
        .join("")
    : '<p class="tl-hint" style="margin:0">ยังไม่มีแคมเปญที่บันทึกไว้</p>';
}
$("cpSave").onclick = () => {
  const name = $("cpName").value.trim() || `แคมเปญ ${new Date().toLocaleDateString("th-TH")}`;
  const all = store.get(CAMP_KEY, {});
  const existing = Object.values(all).find((c) => c.name === name);
  const id = existing?.id || newId();
  all[id] = clean({
    id,
    name,
    savedAt: Date.now(),
    sys: sys(),
    scene: st().scene || null,
    mons: S.priv?.mons || {},
    notes: $("gNotes").value,
    party: heroes().map((p) => p.c),
  });
  store.set(CAMP_KEY, all);
  renderCamps();
  toast(`💾 บันทึก “${name}” แล้ว`);
};
async function loadCamp(c) {
  if (!confirm(`โหลด “${c.name}”? ฉาก มอนสเตอร์ โน้ต และระบบค่าสถานะในห้องนี้จะถูกแทนที่`)) return;
  await L.write(`live/${S.code}/state/sys`, c.sys || SYSTEMS.classic);
  await L.write(`live/${S.code}/state/scene`, c.scene || null);
  await L.write(`liveRoles/${S.code}/host/mons`, c.mons || null);
  await L.write(`live/${S.code}/state/mons`, null);
  S.priv = { ...(S.priv || {}), mons: c.mons || {} };
  for (const m of mons()) L.write(`live/${S.code}/state/mons/${m.id}`, pub(m)).catch(() => {});
  $("gNotes").value = c.notes || "";
  L.write(`liveRoles/${S.code}/host/notes`, c.notes || "").catch(() => {});
  $("cpName").value = c.name;
  const names = (c.party || []).map((p) => `${p.e} ${p.name}`).join(", ");
  alertBox("โหลดแคมเปญแล้ว", `<p>ปาร์ตี้ครั้งก่อน: ${esc(names || "—")}</p><p class="tl-hint">ผู้เล่นเลือกตัวละครเดิมได้จากเครื่องตัวเองตอนเข้าห้อง (หรือนำเข้าไฟล์ตัวละคร)</p>`);
}
$("cpList").onclick = (e) => {
  const all = store.get(CAMP_KEY, {});
  const l = e.target.closest("[data-cpload]")?.dataset.cpload;
  if (l) return loadCamp(all[l]);
  const x = e.target.closest("[data-cpexp]")?.dataset.cpexp;
  if (x) return download(`${all[x].name}.json`, all[x]);
  const d = e.target.closest("[data-cpdel]")?.dataset.cpdel;
  if (d && confirm(`ลบ “${all[d].name}”?`)) {
    delete all[d];
    store.set(CAMP_KEY, all);
    renderCamps();
  }
};
$("cpImport").onclick = async () => {
  const c = await pickJson();
  if (!c?.name || !c.sys) return c && toast("ไฟล์นี้ไม่ใช่แคมเปญ");
  const all = store.get(CAMP_KEY, {});
  const id = c.id || newId();
  all[id] = { ...c, id, savedAt: c.savedAt || Date.now() };
  store.set(CAMP_KEY, all);
  renderCamps();
  toast("นำเข้าแคมเปญแล้ว");
};

$("gEnd").onclick = async () => {
  if (!confirm("ปิดห้องนี้? ผู้เล่นทุกคนจะหลุด (ตัวละครยังเก็บอยู่ในเครื่องของแต่ละคน) อย่าลืมบันทึกแคมเปญก่อน")) return;
  const code = S.code;
  stop();
  await L.remove(`liveRoles/${code}`).catch(() => {});
  await L.remove(`liveInbox/${code}`).catch(() => {});
  await L.remove(`live/${code}/rolls`).catch(() => {});
  for (const id of Object.keys(room().players || {})) await L.remove(`live/${code}/players/${id}`).catch(() => {});
  await L.remove(`live/${code}/state`).catch(() => {});
  await L.remove(`live/${code}/meta`).catch(() => {});
  L.clearSession(KIND);
  S.code = S.room = S.priv = S.inbox = null;
  exitTo();
};

function stop() {
  unwatch?.();
  unwatchPriv?.();
  unwatchInbox?.();
  unwatch = unwatchPriv = unwatchInbox = null;
}
function closed() {
  stop();
  L.clearSession(KIND);
  S.code = S.room = null;
  toast("ห้องนี้ปิดแล้ว");
  exitTo();
}

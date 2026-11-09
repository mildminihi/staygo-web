// จัดสายการแข่งขัน: setup → bracket/league view. State is saved to localStorage after every change.
import { createTournament, resolve, recordResult, clearResult, progress, standings, podium, nextMatch, BYE } from "./engine.js";

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const rnd = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
const SAVE_KEY = "staygo-bracket-v2";
const FORM_KEY = "staygo-bracket-form";
const SAMPLE = ["มายด์", "จูน", "นน", "หยก", "ต้น", "ฟ้า", "ภู", "มิว"];
const MODE_NAME = { single: "แพ้คัดออก", double: "แพ้ 2 ครั้งตกรอบ", roundrobin: "พบกันหมด" };

let state = null; // { t, title, score }
let history = []; // previous results for undo
let form = { mode: "single", thirdPlace: true, doubleRound: false, win: 3, draw: 1, shuffle: true };
let sheetId = null;

const store = {
  get(k) {
    try {
      return JSON.parse(localStorage.getItem(k) || "null");
    } catch {
      return null;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};
const save = () => store.set(SAVE_KEY, state);
const show = (id) => {
  $("setup").hidden = id !== "setup";
  $("board").hidden = id !== "board";
};

// ---------------------------------------------------------------- setup
const names = () => {
  const seen = new Set();
  return $("namesInput")
    .value.split("\n")
    .map((s) => s.trim().slice(0, 30))
    .filter((s) => s && !seen.has(s) && seen.add(s))
    .slice(0, 64);
};

function renderSetup() {
  for (const b of $("modes").children) b.classList.toggle("active", b.dataset.mode === form.mode);
  const o = $("modeOpts");
  if (form.mode === "single")
    o.innerHTML = `<label class="tb-check"><input type="checkbox" data-opt="thirdPlace" ${form.thirdPlace ? "checked" : ""}/> มีแมตช์ชิงอันดับ 3</label>`;
  else if (form.mode === "roundrobin")
    o.innerHTML = `<label class="tb-check"><input type="checkbox" data-opt="doubleRound" ${form.doubleRound ? "checked" : ""}/> เจอกัน 2 นัด (สลับฝั่ง)</label>
      <label class="tb-check">ชนะได้ <select data-num="win" class="tb-sel">${[1, 2, 3].map((v) => `<option ${v === form.win ? "selected" : ""}>${v}</option>`).join("")}</select> แต้ม ·
      เสมอได้ <select data-num="draw" class="tb-sel">${[0, 1].map((v) => `<option ${v === form.draw ? "selected" : ""}>${v}</option>`).join("")}</select> แต้ม</label>`;
  else o.innerHTML = `<p class="tl-hint" style="margin:0">แพ้ครั้งแรกตกไปสายล่าง แพ้อีกครั้งตกรอบ แชมป์สายล่างได้ไปชิงกับแชมป์สายบน</p>`;
  $("shuffleChk").checked = form.shuffle;
  $("shuffleChk").parentElement.hidden = form.mode === "roundrobin";
  updatePreview();
}

function updatePreview() {
  const n = names().length;
  $("nameCount").textContent = n ? `${n} คน/ทีม` : "ใส่อย่างน้อย 2 ชื่อ";
  $("startBtn").disabled = n < 2;
  if (n < 2) return ($("preview").textContent = "");
  const size = 2 ** Math.ceil(Math.log2(n));
  const byes = size - n;
  let text;
  if (form.mode === "single") {
    const rounds = Math.log2(size);
    text = `${n - 1 + (form.thirdPlace && n >= 4 ? 1 : 0)} แมตช์ · ${rounds} รอบ`;
  } else if (form.mode === "double") text = `ประมาณ ${2 * n - 2}–${2 * n - 1} แมตช์`;
  else {
    const legs = form.doubleRound ? 2 : 1;
    text = `${(legs * n * (n - 1)) / 2} แมตช์ · ${legs * (n % 2 ? n : n - 1)} นัด · แต่ละคนเล่น ${legs * (n - 1)} แมตช์`;
  }
  if (form.mode !== "roundrobin" && byes) text += ` · ${byes} คนได้บายรอบแรก`;
  $("preview").textContent = text;
}

$("modes").onclick = (e) => {
  const b = e.target.closest("[data-mode]");
  if (!b) return;
  form.mode = b.dataset.mode;
  renderSetup();
  saveForm();
};
$("modeOpts").onchange = (e) => {
  if (e.target.dataset.opt) form[e.target.dataset.opt] = e.target.checked;
  if (e.target.dataset.num) form[e.target.dataset.num] = +e.target.value;
  updatePreview();
  saveForm();
};
$("shuffleChk").onchange = (e) => {
  form.shuffle = e.target.checked;
  saveForm();
};
$("namesInput").oninput = () => {
  updatePreview();
  saveForm();
};
$("titleInput").oninput = saveForm;
$("sampleBtn").onclick = () => {
  $("namesInput").value = SAMPLE.join("\n");
  updatePreview();
  saveForm();
};
function saveForm() {
  store.set(FORM_KEY, { ...form, names: $("namesInput").value, title: $("titleInput").value });
}

$("startBtn").onclick = () => {
  let list = names();
  if (list.length < 2) return;
  if (form.shuffle && form.mode !== "roundrobin") {
    list = list.slice();
    for (let i = list.length - 1; i > 0; i--) {
      const j = rnd(i + 1);
      [list[i], list[j]] = [list[j], list[i]];
    }
  }
  const t = createTournament(form.mode, list, {
    thirdPlace: form.thirdPlace,
    doubleRound: form.doubleRound,
    points: { win: form.win, draw: form.draw },
  });
  state = { t, title: $("titleInput").value.trim(), score: state?.score ?? false };
  history = [];
  save();
  show("board");
  render();
  window.scrollTo({ top: 0 });
};

// ---------------------------------------------------------------- board
const nameOf = (i) => (i === BYE ? "บาย" : state.t.names[i]);

function matchNumbers(res) {
  // #1, #2 … for matches people actually play, in schedule order (for "ผู้ชนะ #3" placeholders)
  const num = {};
  let k = 0;
  for (const m of state.t.matches) {
    const r = res.get(m.id);
    if (!r.auto && !r.hidden) num[m.id] = ++k;
  }
  return num;
}

function sideLabel(m, s, idx, r, num) {
  const p = r.players[idx];
  if (p !== undefined) return { text: nameOf(p), bye: p === BYE, known: true, i: p };
  const src = s.winnerOf ?? s.loserOf;
  const n = num[src];
  return { text: n ? `${s.winnerOf !== undefined ? "ผู้ชนะ" : "ผู้แพ้"} #${n}` : "รอผล", known: false };
}

function matchHTML(m, r, num) {
  const sides = m.sides.map((s, i) => sideLabel(m, s, i, r, num));
  const res = r.result;
  const cls = ["tb-m", r.playable ? "playable" : "", res ? "done" : "", r.auto ? "auto" : ""].join(" ");
  const row = (sd, idx) => {
    const win = res && !res.draw && r.winner === sd.i;
    const lose = res && !res.draw && r.loser === sd.i;
    const score = res && res.scoreA != null ? `<span class="tb-sc tl-num">${idx === 0 ? res.scoreA : res.scoreB}</span>` : win ? '<span class="tb-sc">✓</span>' : "";
    return `<div class="tb-p${win ? " win" : ""}${lose ? " lose" : ""}${!sd.known || sd.bye ? " ghost" : ""}"><span class="tb-pn">${esc(sd.text)}</span>${score}</div>`;
  };
  if (r.auto) {
    const p = r.players.find((x) => x !== BYE);
    return `<div class="${cls}" data-id="${m.id}"><div class="tb-p win"><span class="tb-pn">${esc(nameOf(p))}</span><span class="tb-sc">บาย</span></div></div>`;
  }
  const tag = num[m.id] ? `<span class="tb-num">#${num[m.id]}</span>` : "";
  return `<div class="${cls}" data-id="${m.id}" ${r.playable || res ? 'role="button" tabindex="0"' : ""}>${tag}${row(sides[0], 0)}${row(sides[1], 1)}${
    r.playable ? '<span class="tb-tap">แตะเพื่อใส่ผล</span>' : ""
  }${res?.draw ? '<span class="tb-tap draw">เสมอ</span>' : ""}</div>`;
}

const COL_W = 236;
const ROW_H = 96;
const CARD_H = 76;

/** Lays out one bracket (a set of matches with rounds) with absolute positions and SVG connector lines. */
function boardHTML(title, ms, res, num) {
  const visible = ms.filter((m) => !res.get(m.id).hidden);
  if (!visible.length) return "";
  const rounds = [...new Set(visible.map((m) => m.round))].sort((a, b) => a - b);
  const pos = new Map();
  let maxY = 0;
  rounds.forEach((rd, col) => {
    const inRound = visible.filter((m) => m.round === rd);
    let fallback = 0;
    inRound.forEach((m) => {
      const ys = m.sides.map((s) => pos.get(s.winnerOf)?.y).filter((y) => y !== undefined);
      let y = ys.length ? ys.reduce((a, b) => a + b, 0) / ys.length : fallback;
      // keep cards from overlapping inside a column
      const taken = [...pos.values()].filter((p) => p.col === col).map((p) => p.y);
      while (taken.some((t) => Math.abs(t - y) < ROW_H - 4)) y += ROW_H / 2;
      pos.set(m.id, { x: col * COL_W, y, col });
      fallback = y + ROW_H;
      maxY = Math.max(maxY, y);
    });
  });
  const w = rounds.length * COL_W - (COL_W - 200);
  const h = maxY + CARD_H + 8;
  const lines = [];
  for (const m of visible) {
    const to = pos.get(m.id);
    for (const s of m.sides) {
      const from = pos.get(s.winnerOf);
      if (!from) continue;
      const x1 = from.x + 200;
      const y1 = from.y + CARD_H / 2;
      const x2 = to.x;
      const y2 = to.y + CARD_H / 2;
      const mx = (x1 + x2) / 2;
      const live = res.get(s.winnerOf).winner !== undefined;
      lines.push(`<path d="M${x1} ${y1} H${mx} V${y2} H${x2}" class="${live ? "live" : ""}"/>`);
    }
  }
  const heads = rounds
    .map((rd, col) => `<span style="left:${col * COL_W}px">${esc(visible.find((m) => m.round === rd).label.replace(/^สายบน · /, ""))}</span>`)
    .join("");
  const cards = visible.map((m) => `<div class="tb-slot" style="left:${pos.get(m.id).x}px;top:${pos.get(m.id).y}px">${matchHTML(m, res.get(m.id), num)}</div>`).join("");
  return `<div class="sg-panel tb-panel">${title ? `<h3 class="tb-sub">${title}</h3>` : ""}
    <div class="tb-scroll"><div class="tb-heads" style="width:${w}px">${heads}</div>
      <div class="tb-canvas" style="width:${w}px;height:${h}px"><svg class="tb-lines" width="${w}" height="${h}">${lines.join("")}</svg>${cards}</div></div></div>`;
}

function leagueHTML(res, num) {
  const t = state.t;
  const rows = standings(t, res);
  const hasScore = t.matches.some((m) => res.get(m.id).result?.scoreA != null);
  const table = `<div class="sg-panel tb-panel"><h3 class="tb-sub">ตารางคะแนน</h3><div class="tb-tablewrap"><table class="tb-table">
    <thead><tr><th>#</th><th class="l">ชื่อ</th><th>แข่ง</th><th>ชนะ</th><th>เสมอ</th><th>แพ้</th>${hasScore ? "<th>ได้-เสีย</th>" : ""}<th>แต้ม</th></tr></thead>
    <tbody>${rows
      .map(
        (r, i) => `<tr class="${i === 0 && r.p ? "top" : ""}"><td class="tl-num">${i + 1}</td><td class="l">${esc(r.name)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td>${
          hasScore ? `<td>${r.sf - r.sa > 0 ? "+" : ""}${r.sf - r.sa}</td>` : ""
        }<td class="tl-num pts">${r.pts}</td></tr>`,
      )
      .join("")}</tbody></table></div>
    <p class="tl-hint">เรียงตามแต้ม → ผลต่างสกอร์ → สกอร์ที่ได้ → ผลที่เจอกันเอง · ชนะ ${t.options.points?.win ?? 3} เสมอ ${t.options.points?.draw ?? 1}</p></div>`;
  const byRound = {};
  for (const m of t.matches) (byRound[m.round] ||= []).push(m);
  const fixtures = Object.entries(byRound)
    .map(
      ([rd, ms]) => `<div class="tb-round"><h4>${esc(ms[0].label)}</h4><div class="tb-fx">${ms.map((m) => matchHTML(m, res.get(m.id), num)).join("")}</div></div>`,
    )
    .join("");
  return table + `<div class="sg-panel tb-panel"><h3 class="tb-sub">ตารางแข่ง</h3>${fixtures}</div>`;
}

function render() {
  if (!state) return;
  const t = state.t;
  const res = resolve(t);
  const num = matchNumbers(res);
  const prog = progress(t, res);
  $("tTitle").textContent = state.title || "ทัวร์นาเมนต์";
  $("tMeta").textContent = `${MODE_NAME[t.mode]} · ${t.names.length} คน/ทีม`;
  $("progText").textContent = `${prog.done}/${prog.total}`;
  $("progFill").style.width = (prog.total ? (prog.done / prog.total) * 100 : 0) + "%";
  $("scoreChk").checked = !!state.score;
  $("undoBtn").disabled = !history.length;

  // champion / podium
  const pd = podium(t, res);
  if (pd) {
    const third = Array.isArray(pd[2]) ? pd[2].map(nameOf).join(" / ") : pd[2] != null ? nameOf(pd[2]) : null;
    $("champ").innerHTML = `<div class="tb-trophy">🏆</div><p class="tl-hint" style="margin:0">แชมป์${state.title ? ` ${esc(state.title)}` : ""}</p>
      <h2>${esc(nameOf(pd[0]))}</h2>
      <div class="tb-podium">${pd[1] != null ? `<span>🥈 ${esc(nameOf(pd[1]))}</span>` : ""}${third ? `<span>🥉 ${esc(third)}</span>` : ""}</div>`;
    $("champ").hidden = false;
  } else $("champ").hidden = true;

  // next match
  const nm = nextMatch(t, res);
  if (nm) {
    const r = res.get(nm.id);
    $("nextCard").innerHTML = `<span class="tl-hint">คู่ถัดไป · ${esc(nm.label)} · #${num[nm.id]}</span>
      <b>${esc(nameOf(r.players[0]))} <i>vs</i> ${esc(nameOf(r.players[1]))}</b>
      <button class="sg-btn yellow" data-open="${nm.id}">ใส่ผล</button>`;
    $("nextCard").hidden = false;
  } else $("nextCard").hidden = true;

  let html = "";
  if (t.mode === "single") {
    html = boardHTML("", t.matches.filter((m) => m.bracket === "W"), res, num);
    const tp = t.matches.find((m) => m.bracket === "3rd");
    if (tp && !res.get(tp.id).hidden) html += `<div class="sg-panel tb-panel tb-extra"><h3 class="tb-sub">🥉 ชิงอันดับ 3</h3>${matchHTML(tp, res.get(tp.id), num)}</div>`;
  } else if (t.mode === "double") {
    html =
      boardHTML("สายบน (ยังไม่แพ้)", t.matches.filter((m) => m.bracket === "W"), res, num) +
      boardHTML("สายล่าง (แพ้มาแล้ว 1 ครั้ง)", t.matches.filter((m) => m.bracket === "L"), res, num) +
      `<div class="sg-panel tb-panel tb-extra"><h3 class="tb-sub">🏆 ชิงแชมป์</h3><div class="tb-fx">${t.matches
        .filter((m) => m.bracket === "GF" && !res.get(m.id).hidden)
        .map((m) => `<div><p class="tl-hint" style="margin:0 0 4px">${esc(m.label)}</p>${matchHTML(m, res.get(m.id), num)}</div>`)
        .join("")}</div>
        <p class="tl-hint">ถ้าแชมป์สายล่างชนะนัดแรก ต้องแข่งนัดตัดสินอีกนัด (เพราะแชมป์สายบนยังไม่เคยแพ้)</p></div>`;
  } else html = leagueHTML(res, num);
  $("content").innerHTML = html;
}

// ---------------------------------------------------------------- results
document.addEventListener("click", (e) => {
  const open = e.target.closest("[data-open]");
  if (open) return openSheet(open.dataset.open);
  const m = e.target.closest(".tb-m[role=button]");
  if (m && !document.body.classList.contains("tl-big")) openSheet(m.dataset.id);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (!$("sheet").hidden) closeSheet();
    else setBig(false);
  }
  const m = e.target.closest?.(".tb-m[role=button]");
  if (m && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    openSheet(m.dataset.id);
  }
});

function openSheet(id) {
  const t = state.t;
  const m = t.matches.find((x) => x.id === id);
  const r = resolve(t).get(id);
  if (!r.playable && !r.result) return;
  sheetId = id;
  const num = matchNumbers(resolve(t));
  $("sheetLabel").textContent = `${m.label} · #${num[id]}`;
  const [a, b] = r.players;
  const res = r.result;
  const scoreRow = (p, which, val) =>
    `<input type="number" inputmode="numeric" min="0" class="sg-input tb-score" data-score="${which}" value="${val ?? ""}" placeholder="0" aria-label="สกอร์ ${esc(nameOf(p))}"/>`;
  $("sheetBody").innerHTML = [a, b]
    .map(
      (p, i) => `<div class="tb-pick">
        <button class="tb-who${res && !res.draw && res.winner === p ? " on" : ""}" data-win="${p}">${esc(nameOf(p))}</button>
        ${state.score ? scoreRow(p, i, res ? (i === 0 ? res.scoreA : res.scoreB) : null) : ""}</div>`,
    )
    .join('<span class="tb-vs">vs</span>');
  $("sheetTitle").textContent = state.score ? "ใส่สกอร์ แล้วกดบันทึก" : "แตะชื่อคนที่ชนะ";
  $("sheetMsg").textContent = state.score ? "หรือแตะชื่อเพื่อเลือกผู้ชนะโดยไม่ใส่สกอร์" : "";
  $("sheetSave").hidden = !state.score;
  $("sheetDraw").hidden = t.mode !== "roundrobin";
  $("sheetClear").hidden = !res;
  $("sheet").hidden = false;
  (state.score ? $("sheetBody").querySelector("input") : $("sheetBody").querySelector("button"))?.focus();
}
function closeSheet() {
  $("sheet").hidden = true;
  sheetId = null;
}

function commit(fn) {
  history.push(JSON.stringify(state.t.results));
  if (history.length > 50) history.shift();
  fn();
  save();
  closeSheet();
  render();
}

$("sheet").addEventListener("click", (e) => {
  if (e.target.closest("[data-close]")) return closeSheet();
  const w = e.target.closest("[data-win]");
  if (w && sheetId) {
    const scores = readScores();
    commit(() => recordResult(state.t, sheetId, { winner: +w.dataset.win, scoreA: scores?.[0] ?? null, scoreB: scores?.[1] ?? null }));
  }
});
function readScores() {
  const ins = [...$("sheetBody").querySelectorAll("[data-score]")];
  if (ins.length !== 2 || ins.some((i) => i.value === "")) return null;
  return ins.map((i) => Math.max(0, parseInt(i.value, 10) || 0));
}
$("sheetSave").onclick = () => {
  const s = readScores();
  if (!s) return ($("sheetMsg").textContent = "ใส่สกอร์ให้ครบทั้งสองฝั่ง");
  const [a, b] = resolve(state.t).get(sheetId).players;
  if (s[0] === s[1]) {
    if (state.t.mode === "roundrobin") return commit(() => recordResult(state.t, sheetId, { draw: true, scoreA: s[0], scoreB: s[1] }));
    return ($("sheetMsg").textContent = "สกอร์เท่ากัน แตะชื่อผู้ชนะ (เช่น ชนะจุดโทษ / ไทเบรก)");
  }
  commit(() => recordResult(state.t, sheetId, { winner: s[0] > s[1] ? a : b, scoreA: s[0], scoreB: s[1] }));
};
$("sheetDraw").onclick = () => {
  const s = readScores();
  commit(() => recordResult(state.t, sheetId, { draw: true, scoreA: s?.[0] ?? null, scoreB: s?.[1] ?? null }));
};
$("sheetClear").onclick = () => commit(() => clearResult(state.t, sheetId));
$("sheetBody").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.target.matches("[data-score]")) $("sheetSave").click();
});

$("undoBtn").onclick = () => {
  if (!history.length) return;
  state.t.results = JSON.parse(history.pop());
  save();
  render();
};
$("scoreChk").onchange = (e) => {
  state.score = e.target.checked;
  save();
};

// ---------------------------------------------------------------- toolbar
$("editBtn").onclick = () => {
  const prog = progress(state.t, resolve(state.t));
  if (prog.done && !confirm("ตั้งค่าใหม่? ผลการแข่งที่บันทึกไว้จะหายไป (รายชื่อยังอยู่)")) return;
  $("namesInput").value = state.t.names.join("\n");
  $("titleInput").value = state.title || "";
  form.mode = state.t.mode;
  state = null;
  history = [];
  save();
  saveForm();
  show("setup");
  renderSetup();
};

$("copyBtn").onclick = async () => {
  const t = state.t;
  const res = resolve(t);
  const num = matchNumbers(res);
  const lines = [`🏆 ${state.title || "ทัวร์นาเมนต์"} (${MODE_NAME[t.mode]})`];
  const pd = podium(t, res);
  if (pd) {
    lines.push(`แชมป์: ${nameOf(pd[0])}`);
    if (pd[1] != null) lines.push(`อันดับ 2: ${nameOf(pd[1])}`);
    if (pd[2] != null) lines.push(`อันดับ 3: ${Array.isArray(pd[2]) ? pd[2].map(nameOf).join(" / ") : nameOf(pd[2])}`);
  }
  if (t.mode === "roundrobin") {
    lines.push("", "ตารางคะแนน:");
    standings(t, res).forEach((r, i) => lines.push(`${i + 1}. ${r.name} — ${r.pts} แต้ม (ชนะ ${r.w} เสมอ ${r.d} แพ้ ${r.l})`));
  }
  lines.push("", "ผลการแข่ง:");
  for (const m of t.matches) {
    const r = res.get(m.id);
    if (!r.result) continue;
    const [a, b] = r.players;
    const sc = r.result.scoreA != null ? ` ${r.result.scoreA}-${r.result.scoreB}` : "";
    lines.push(`#${num[m.id]} ${m.label}: ${nameOf(a)} vs ${nameOf(b)}${sc} → ${r.result.draw ? "เสมอ" : nameOf(r.winner) + " ชนะ"}`);
  }
  const text = lines.join("\n");
  try {
    await navigator.clipboard.writeText(text);
    $("copyBtn").textContent = "✅ คัดลอกแล้ว";
    setTimeout(() => ($("copyBtn").textContent = "📋 คัดลอกผล"), 1600);
  } catch {
    prompt("คัดลอกข้อความนี้", text);
  }
};

function setBig(on) {
  document.body.classList.toggle("tl-big", on);
  $("exitBig").hidden = !on;
}
$("bigBtn").onclick = () => setBig(true);
$("exitBig").onclick = () => setBig(false);

// ---------------------------------------------------------------- boot
const savedForm = store.get(FORM_KEY);
if (savedForm) {
  form = { ...form, ...savedForm };
  $("namesInput").value = savedForm.names || "";
  $("titleInput").value = savedForm.title || "";
}
state = store.get(SAVE_KEY);
if (state?.t?.matches) {
  show("board");
  render();
} else {
  state = null;
  show("setup");
  renderSetup();
}

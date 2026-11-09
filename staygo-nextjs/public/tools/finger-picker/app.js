// Finger picker: everyone holds a finger on the screen; after a short wait it picks
// one, several, or splits into teams. On a computer, clicks place "virtual fingers".
const $ = (id) => document.getElementById(id);
const COLORS = ["#1a9bf0", "#e8202a", "#ffc21a", "#22b573", "#7b4fd6", "#e0559b", "#ff8a1f", "#14b8c4", "#8bc34a", "#a0522d"];
const TEAM_COLORS = ["#1a9bf0", "#e8202a", "#22b573", "#ffc21a"];
const HOLD_MS = 2500;
const rnd = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;

let mode = "one";
let count = 2; // how many to pick (many) or how many teams (teams)
const fingers = new Map(); // id -> { x, y, color, el }
let timer = null;
let done = false;
let nextColor = 0;

// ---------------------------------------------------------------- settings
$("modes").onclick = (e) => {
  const b = e.target.closest("[data-mode]");
  if (!b) return;
  mode = b.dataset.mode;
  for (const x of $("modes").children) x.classList.toggle("active", x === b);
  $("countRow").hidden = mode === "one";
  $("countLabel").textContent = mode === "teams" ? "จำนวนทีม" : "จำนวนคนที่สุ่ม";
  count = Math.min(Math.max(count, 2), mode === "teams" ? 4 : 9);
  $("count").textContent = count;
};
$("minus").onclick = () => setCount(count - 1);
$("plus").onclick = () => setCount(count + 1);
function setCount(n) {
  count = Math.min(Math.max(n, mode === "many" ? 1 : 2), mode === "teams" ? 4 : 9);
  $("count").textContent = count;
}

const needed = () => (mode === "one" ? 2 : mode === "many" ? count + 1 : count);

$("go").onclick = async () => {
  $("stage").hidden = false;
  reset();
  try {
    await document.documentElement.requestFullscreen?.();
  } catch {}
};
$("close").onclick = (e) => {
  e.stopPropagation();
  $("stage").hidden = true;
  reset();
  if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
};

// ---------------------------------------------------------------- fingers
const stage = $("stage");
const isMouse = (e) => e.pointerType === "mouse";

stage.addEventListener("pointerdown", (e) => {
  if (e.target.closest(".fp-close")) return;
  e.preventDefault();
  if (done) {
    // Tap after a result: start over.
    if (isMouse(e) || fingers.size === 0) reset();
    return;
  }
  if (isMouse(e)) {
    // Desktop demo: click a dot to remove it, click empty space to add one.
    const hit = [...fingers.entries()].find(([, f]) => Math.hypot(f.x - e.clientX, f.y - e.clientY) < 55);
    if (hit) removeFinger(hit[0]);
    else addFinger(`m${performance.now()}`, e.clientX, e.clientY);
    return;
  }
  addFinger(e.pointerId, e.clientX, e.clientY);
});
stage.addEventListener("pointermove", (e) => {
  const f = fingers.get(e.pointerId);
  if (!f) return;
  f.x = e.clientX;
  f.y = e.clientY;
  f.el.style.left = f.x + "px";
  f.el.style.top = f.y + "px";
});
const lift = (e) => {
  if (isMouse(e) || !fingers.has(e.pointerId)) return;
  if (done) {
    // keep the result on screen until every finger is lifted
    const f = fingers.get(e.pointerId);
    fingers.delete(e.pointerId);
    f.el.style.opacity = f.el.classList.contains("win") ? "1" : "0";
    if (fingers.size === 0) $("msg").textContent = "แตะจอเพื่อสุ่มใหม่";
    return;
  }
  removeFinger(e.pointerId);
};
stage.addEventListener("pointerup", lift);
stage.addEventListener("pointercancel", lift);
stage.addEventListener("contextmenu", (e) => e.preventDefault());

function addFinger(id, x, y) {
  const color = COLORS[nextColor++ % COLORS.length];
  const el = document.createElement("div");
  el.className = "fp-dot";
  el.style.setProperty("--c", color);
  el.style.left = x + "px";
  el.style.top = y + "px";
  $("dots").appendChild(el);
  fingers.set(id, { x, y, color, el });
  navigator.vibrate?.(15);
  changed();
}
function removeFinger(id) {
  const f = fingers.get(id);
  if (!f) return;
  f.el.remove();
  fingers.delete(id);
  changed();
}

function changed() {
  clearTimeout(timer);
  for (const f of fingers.values()) f.el.querySelector(".fp-ring")?.remove();
  const need = needed();
  if (fingers.size === 0) $("msg").textContent = "วางนิ้วบนจอ";
  else if (fingers.size < need) $("msg").textContent = `ต้องมีอย่างน้อย ${need} นิ้ว (ตอนนี้ ${fingers.size})`;
  else {
    $("msg").textContent = "ค้างไว้…";
    for (const f of fingers.values()) {
      const ring = document.createElement("div");
      ring.className = "fp-ring";
      ring.style.setProperty("--ms", HOLD_MS + "ms");
      f.el.appendChild(ring);
    }
    timer = setTimeout(pick, HOLD_MS);
  }
}

function pick() {
  const list = [...fingers.values()];
  // Fisher–Yates shuffle with crypto randomness
  for (let i = list.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [list[i], list[j]] = [list[j], list[i]];
  }
  for (const f of list) f.el.querySelector(".fp-ring")?.remove();
  done = true;
  navigator.vibrate?.([40, 60, 120]);
  if (mode === "teams") {
    list.forEach((f, i) => {
      const t = i % count;
      f.el.style.setProperty("--c", TEAM_COLORS[t]);
      f.el.textContent = `ทีม ${t + 1}`;
    });
    $("msg").textContent = "";
    return;
  }
  const winners = mode === "one" ? 1 : count;
  list.forEach((f, i) => f.el.classList.add(i < winners ? "win" : "lose"));
  if (mode === "many") list.slice(0, winners).forEach((f, i) => (f.el.textContent = i + 1));
  $("msg").textContent = "";
}

function reset() {
  clearTimeout(timer);
  done = false;
  nextColor = rnd(COLORS.length);
  fingers.clear();
  $("dots").innerHTML = "";
  $("msg").textContent = "วางนิ้วบนจอ";
}

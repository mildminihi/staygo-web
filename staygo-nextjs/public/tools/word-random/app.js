// สุ่มคำ / หัวข้อ: shuffled bag per category (no repeats until all used), optional timed round.
import { CATEGORIES } from "./data.js";

const $ = (id) => document.getElementById(id);
const rnd = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
const shuffle = (a) => {
  const b = a.slice();
  for (let i = b.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
};

let cat = CATEGORIES[0];
const bags = {};
let current = null;
let duration = 0;
let round = null; // { end, ok, skip, timer }

function bag(c) {
  if (!bags[c.key]?.length) bags[c.key] = shuffle(c.items);
  return bags[c.key];
}

function renderCats() {
  $("cats").innerHTML = CATEGORIES.map(
    (c) => `<button data-cat="${c.key}" class="${c === cat ? "active" : ""}">${c.emoji} ${c.name}</button>`,
  ).join("");
  $("catHint").textContent = cat.hint;
  $("timedRow").hidden = $("timedHint").hidden = !cat.timed;
  if (!cat.timed) setDuration(0);
  updateLeft();
}
function updateLeft() {
  const left = bags[cat.key] ? bags[cat.key].length : cat.items.length;
  $("left").textContent = `เหลือ ${left}/${cat.items.length}`;
}
$("cats").onclick = (e) => {
  const b = e.target.closest("[data-cat]");
  if (!b) return;
  stopRound(false);
  cat = CATEGORIES.find((c) => c.key === b.dataset.cat);
  current = null;
  $("word").textContent = 'กด "สุ่ม" เพื่อเริ่ม';
  $("card").classList.remove("pop");
  renderCats();
};

function draw() {
  current = bag(cat).pop();
  const w = $("word");
  w.textContent = current;
  w.dataset.len = current.length > 22 ? "long" : current.length > 12 ? "mid" : "";
  const card = $("card");
  card.classList.remove("pop");
  void card.offsetWidth;
  card.classList.add("pop");
  updateLeft();
}

// ---------------------------------------------------------------- timed round
$("durations").onclick = (e) => {
  const b = e.target.closest("[data-sec]");
  if (b) setDuration(+b.dataset.sec);
};
function setDuration(s) {
  duration = s;
  for (const b of $("durations").children) b.classList.toggle("active", +b.dataset.sec === s);
  stopRound(false);
  $("next").textContent = s ? "▶ เริ่มรอบ" : "🎲 สุ่ม";
}
function startRound() {
  round = { end: Date.now() + duration * 1000, ok: 0, skip: 0 };
  $("timerBox").hidden = $("scoreRow").hidden = false;
  $("next").hidden = true;
  $("ok").hidden = $("skip").hidden = false;
  $("okN").textContent = $("skipN").textContent = 0;
  draw();
  round.timer = setInterval(tick, 200);
  tick();
}
function tick() {
  const left = Math.max(0, round.end - Date.now());
  const s = Math.ceil(left / 1000);
  $("clock").textContent = s;
  $("fill").style.width = (left / (duration * 1000)) * 100 + "%";
  $("fill").classList.toggle("warn", s <= 5);
  if (left <= 0) stopRound(true);
}
function stopRound(showResult) {
  if (!round) return;
  clearInterval(round.timer);
  const r = round;
  round = null;
  $("ok").hidden = $("skip").hidden = true;
  $("next").hidden = false;
  $("timerBox").hidden = true;
  if (showResult) {
    navigator.vibrate?.([200, 100, 200]);
    $("word").textContent = `หมดเวลา! ถูก ${r.ok} · ข้าม ${r.skip}`;
    $("word").dataset.len = "mid";
  } else $("scoreRow").hidden = true;
}
function answer(correct) {
  if (!round) return;
  if (correct) round.ok++;
  else round.skip++;
  $("okN").textContent = round.ok;
  $("skipN").textContent = round.skip;
  draw();
}

$("next").onclick = () => (duration && cat.timed ? startRound() : draw());
$("card").onclick = () => (round ? answer(true) : duration && cat.timed ? startRound() : draw());
$("ok").onclick = () => answer(true);
$("skip").onclick = () => answer(false);
document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea")) return;
  if (e.key === " " || e.key === "Enter") {
    e.preventDefault();
    if (round) answer(true);
    else $("next").click();
  }
  if (e.key === "ArrowRight" && round) answer(false);
  if (e.key === "Escape") setBig(false);
});

function setBig(on) {
  document.body.classList.toggle("tl-big", on);
  $("exitBig").hidden = !on;
}
$("bigBtn").onclick = () => setBig(true);
$("exitBig").onclick = () => setBig(false);

renderCats();

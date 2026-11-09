// จัดโต๊ะสลับคน: for each round, search for a table split that minimizes repeat meetings
// (cost = sum of times each pair has already shared a table, squared), then record it.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const rnd = (n) => crypto.getRandomValues(new Uint32Array(1))[0] % n;
const KEY = "staygo-seating-names";
const SAMPLE = "มายด์ จูน นน หยก ต้น ฟ้า ภู มิว ปอนด์ แพรว บอส ใบเตย ก้อง น้ำ เจ เบล ปาล์ม ฝน ไอซ์ พลอย".split(" ");

let plan = null;

const names = () => [...new Set($("names").value.split("\n").map((s) => s.trim()).filter(Boolean))].slice(0, 120);

for (let s = 2; s <= 10; s++) $("size").insertAdjacentHTML("beforeend", `<option value="${s}" ${s === 4 ? "selected" : ""}>${s} คน</option>`);
for (let r = 1; r <= 8; r++) $("rounds").insertAdjacentHTML("beforeend", `<option value="${r}" ${r === 3 ? "selected" : ""}>${r} รอบ</option>`);
try {
  $("names").value = localStorage.getItem(KEY) || "";
} catch {}

/** Table sizes for n people at about `size` each, as even as possible. */
function tableSizes(n, size) {
  const t = Math.max(1, Math.ceil(n / size));
  const base = Math.floor(n / t);
  return Array.from({ length: t }, (_, i) => base + (i < n % t ? 1 : 0));
}

function updatePreview() {
  const n = names().length;
  $("count").textContent = n ? `${n} คน` : "ใส่อย่างน้อย 4 คน";
  if (n < 4) return ($("preview").textContent = "");
  const sizes = tableSizes(n, +$("size").value);
  const groups = {};
  for (const s of sizes) groups[s] = (groups[s] || 0) + 1;
  $("preview").textContent = `ได้ ${sizes.length} โต๊ะ: ` + Object.entries(groups).sort((a, b) => b[0] - a[0]).map(([s, c]) => `${s} คน × ${c}`).join(", ");
}
$("names").oninput = $("size").onchange = updatePreview;
$("sample").onclick = () => {
  $("names").value = SAMPLE.join("\n");
  updatePreview();
};

function solve(n, sizes, rounds) {
  const met = Array.from({ length: n }, () => new Array(n).fill(0));
  const out = [];
  for (let r = 0; r < rounds; r++) {
    let best = null;
    let bestCost = Infinity;
    for (let attempt = 0; attempt < 40; attempt++) {
      // random start
      const order = Array.from({ length: n }, (_, i) => i);
      for (let i = n - 1; i > 0; i--) {
        const j = rnd(i + 1);
        [order[i], order[j]] = [order[j], order[i]];
      }
      const tables = [];
      let k = 0;
      for (const s of sizes) tables.push(order.slice(k, (k += s)));
      const costOf = (p, t, skip = -1) => t.reduce((sum, q) => (q === p || q === skip ? sum : sum + met[p][q] * met[p][q]), 0);
      // local search: swap two people at different tables when it lowers the cost
      let improved = true;
      let guard = 0;
      while (improved && guard++ < 60) {
        improved = false;
        for (let a = 0; a < tables.length; a++)
          for (let b = a + 1; b < tables.length; b++)
            for (let i = 0; i < tables[a].length; i++)
              for (let j = 0; j < tables[b].length; j++) {
                const p = tables[a][i];
                const q = tables[b][j];
                const before = costOf(p, tables[a]) + costOf(q, tables[b]);
                const after = costOf(q, tables[a], p) + costOf(p, tables[b], q);
                if (after < before) {
                  tables[a][i] = q;
                  tables[b][j] = p;
                  improved = true;
                }
              }
      }
      let cost = 0;
      for (const t of tables) for (let i = 0; i < t.length; i++) for (let j = i + 1; j < t.length; j++) cost += met[t[i]][t[j]] ** 2;
      if (cost < bestCost) {
        bestCost = cost;
        best = tables.map((t) => t.slice());
        if (cost === 0) break;
      }
    }
    for (const t of best) for (const p of t) for (const q of t) if (p !== q) met[p][q]++;
    out.push(best);
  }
  return { tables: out, met };
}

function make() {
  const list = names();
  if (list.length < 4) return alert("ใส่ชื่ออย่างน้อย 4 คน");
  try {
    localStorage.setItem(KEY, list.join("\n"));
  } catch {}
  const sizes = tableSizes(list.length, +$("size").value);
  const rounds = +$("rounds").value;
  const { tables, met } = solve(list.length, sizes, rounds);
  plan = { list, tables };
  // stats
  let repeats = 0;
  let newMeets = 0;
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      if (met[i][j] > 1) repeats += met[i][j] - 1;
      if (met[i][j] > 0) newMeets++;
    }
  const avgMet = ((newMeets * 2) / list.length).toFixed(1);
  $("stats").innerHTML = `<b>${list.length} คน · ${sizes.length} โต๊ะ · ${rounds} รอบ</b>
    <p class="tl-hint" style="margin:4px 0 10px">แต่ละคนได้เจอเพื่อนไม่ซ้ำเฉลี่ย <b class="tl-num">${avgMet}</b> คน · ${repeats ? `มีคู่ที่เจอซ้ำ ${repeats} ครั้ง (เลี่ยงไม่ได้เมื่อรอบเยอะหรือโต๊ะใหญ่)` : "ไม่มีใครเจอกันซ้ำเลย 🎉"}</p>`;
  $("rounds-out").innerHTML = tables
    .map(
      (round, r) => `<div class="sg-panel ts-round"><h2>รอบที่ ${r + 1}</h2><div class="ts-tables">${round
        .map(
          (t, i) => `<div class="ts-table"><b>โต๊ะ ${i + 1}</b><ul>${t
            .slice()
            .sort((a, b) => a - b)
            .map((p) => `<li>${esc(list[p])}</li>`)
            .join("")}</ul></div>`,
        )
        .join("")}</div></div>`,
    )
    .join("");
  $("result").hidden = false;
  $("result").scrollIntoView({ behavior: "smooth", block: "start" });
}
$("make").onclick = $("reroll").onclick = make;

$("copy").onclick = async () => {
  if (!plan) return;
  const text = plan.tables
    .map((round, r) => `รอบที่ ${r + 1}\n` + round.map((t, i) => `  โต๊ะ ${i + 1}: ${t.map((p) => plan.list[p]).join(", ")}`).join("\n"))
    .join("\n\n");
  try {
    await navigator.clipboard.writeText(text);
    $("copy").textContent = "✅ คัดลอกแล้ว";
    setTimeout(() => ($("copy").textContent = "📋 คัดลอกเป็นข้อความ"), 1600);
  } catch {
    prompt("คัดลอกข้อความนี้", text);
  }
};
$("print").onclick = () => window.print();
updatePreview();

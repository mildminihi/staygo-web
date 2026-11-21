// Dice formulas like "d20+3", "2d6+1d4-1". Advantage (+1) / disadvantage (−1) rolls the first
// single d20 twice and keeps the higher / lower one.

const rnd = (n) => (crypto.getRandomValues(new Uint32Array(1))[0] % n) + 1;

/** Returns [{ sign, n, d }] for dice and [{ sign, k }] for flat numbers, or null if the formula is invalid. */
export function parse(expr) {
  const s = String(expr || "").toLowerCase().replace(/\s+/g, "");
  if (!s || s.length > 40) return null;
  const terms = [];
  const re = /([+-]?)(?:(\d*)d(\d+)|(\d+))/gy;
  let m;
  let pos = 0;
  while (pos < s.length) {
    re.lastIndex = pos;
    m = re.exec(s);
    if (!m || (pos > 0 && !m[1])) return null;
    const sign = m[1] === "-" ? -1 : 1;
    if (m[3]) {
      const n = m[2] === "" ? 1 : +m[2];
      const d = +m[3];
      if (n < 1 || n > 50 || d < 2 || d > 1000) return null;
      terms.push({ sign, n, d });
    } else terms.push({ sign, k: +m[4] });
    pos = re.lastIndex;
  }
  return terms.length && terms.length <= 10 ? terms : null;
}

export const valid = (expr) => !!parse(expr);

/** Rolls a formula. Result: { expr, parts: [{ d, r: [..], keep }], mod, total, crit (1 = 20, −1 = 1, 0), adv }. */
export function roll(expr, adv = 0) {
  const terms = parse(expr);
  if (!terms) return null;
  const parts = [];
  let total = 0;
  let mod = 0;
  let advUsed = 0;
  for (const t of terms) {
    if (t.k !== undefined) {
      mod += t.sign * t.k;
      continue;
    }
    if (adv && !advUsed && t.d === 20 && t.n === 1) {
      const r = [rnd(20), rnd(20)];
      const keep = adv > 0 ? Math.max(...r) : Math.min(...r);
      parts.push({ d: 20, r, keep, sign: t.sign });
      total += t.sign * keep;
      advUsed = adv;
      continue;
    }
    const r = Array.from({ length: t.n }, () => rnd(t.d));
    const sum = r.reduce((a, b) => a + b, 0);
    parts.push({ d: t.d, r, keep: sum, sign: t.sign });
    total += t.sign * sum;
  }
  total += mod;
  const d20s = parts.filter((p) => p.d === 20);
  const first = d20s.length === 1 && d20s[0].r.length <= 2 ? d20s[0].keep : 0;
  return { expr: String(expr).replace(/\s+/g, ""), parts, mod, total, crit: first === 20 ? 1 : first === 1 ? -1 : 0, adv: advUsed };
}

/** "d20 (14, ~~7~~) + 3" style breakdown as HTML. */
export function breakdown(res) {
  if (!res?.parts) return "";
  const bits = res.parts.map((p, i) => {
    const sign = p.sign < 0 ? "−" : i ? "+" : "";
    const dice =
      p.r.length === 2 && p.d === 20 && res.adv && p.keep !== undefined && p.r.length === 2 && i === res.parts.findIndex((x) => x.d === 20)
        ? p.r.map((v, j) => (j === p.r.indexOf(p.keep) ? `<b>${v}</b>` : `<s>${v}</s>`)).join(", ")
        : p.r.join("+");
    return `${sign} d${p.d} (${dice})`;
  });
  if (res.mod) bits.push(`${res.mod < 0 ? "−" : "+"} ${Math.abs(res.mod)}`);
  return bits.join(" ");
}

export const fmtMod = (n) => (n >= 0 ? `+${n}` : `${n}`);

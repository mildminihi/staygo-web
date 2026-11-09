// Tournament engine: knockout (optional 3rd-place match), double elimination, round robin.
// Pure functions, no DOM. A tournament is { mode, names, matches, results, options }.
// Each match has two sides; a side comes from a seed, or the winner/loser of another match.
// Byes are real: a player facing a bye goes through automatically.

export const BYE = -1;

const pow2 = (n) => 2 ** Math.ceil(Math.log2(Math.max(2, n)));

/** Standard bracket seed order for `size` slots: 1 v size, then the halves mirror (1,8,4,5,2,7,3,6…). */
export function seedOrder(size) {
  let order = [1, 2];
  while (order.length < size) {
    const next = [];
    const n = order.length * 2 + 1;
    for (const s of order) next.push(s, n - s);
    order = next;
  }
  return order;
}

function roundName(fromEnd, size) {
  if (fromEnd === 0) return "รอบชิงชนะเลิศ";
  if (fromEnd === 1) return "รอบรองชนะเลิศ";
  if (fromEnd === 2) return "รอบ 8 ทีม";
  return `รอบ ${size} ทีม`;
}

/** Winners bracket: returns { rounds: [[matchId…]…], matches } with seeds placed so byes go to the top seeds. */
function buildKnockout(n, prefix, matches) {
  const size = pow2(n);
  const order = seedOrder(size);
  const rounds = [];
  let prev = [];
  const k = Math.log2(size);
  for (let r = 0; r < k; r++) {
    const ids = [];
    const count = size / 2 ** (r + 1);
    for (let i = 0; i < count; i++) {
      const id = `${prefix}${r + 1}-${i + 1}`;
      const sides =
        r === 0
          ? [order[2 * i], order[2 * i + 1]].map((seed) => ({ seed: seed <= n ? seed - 1 : BYE }))
          : [{ winnerOf: prev[2 * i] }, { winnerOf: prev[2 * i + 1] }];
      // With byes, the first round isn't really "round of 8/16": call it รอบแรก.
      const label = r === 0 && n < size && k - 1 - r >= 2 ? "รอบแรก" : roundName(k - 1 - r, size / 2 ** r);
      matches.push({ id, bracket: prefix, round: r, label, sides });
      ids.push(id);
    }
    rounds.push(ids);
    prev = ids;
  }
  return rounds;
}

export function createTournament(mode, names, options = {}) {
  const matches = [];
  const n = names.length;
  if (n < 2) throw new Error("ต้องมีผู้เข้าแข่งขันอย่างน้อย 2 คน");
  if (mode === "single") {
    const rounds = buildKnockout(n, "W", matches);
    const k = rounds.length;
    if (options.thirdPlace && k >= 2) {
      const [a, b] = rounds[k - 2];
      matches.push({ id: "3rd", bracket: "3rd", round: k - 1, label: "ชิงอันดับ 3", sides: [{ loserOf: a }, { loserOf: b }] });
    }
  } else if (mode === "double") {
    const wb = buildKnockout(n, "W", matches);
    for (const m of matches) m.label = "สายบน · " + m.label;
    const k = wb.length;
    // Losers bracket: round 1 pairs WB round-1 losers; then alternate "drop-in" rounds
    // (LB winners vs. new WB losers, order reversed to avoid quick rematches) and "pair" rounds.
    let lbPrev = [];
    let lr = 0;
    const lbRound = (sides, label) => {
      const ids = sides.map((s, i) => {
        const id = `L${lr + 1}-${i + 1}`;
        matches.push({ id, bracket: "L", round: lr, label, sides: s });
        return id;
      });
      lr++;
      return ids;
    };
    if (k >= 2) {
      const w1 = wb[0];
      lbPrev = lbRound(
        Array.from({ length: w1.length / 2 }, (_, i) => [{ loserOf: w1[2 * i] }, { loserOf: w1[2 * i + 1] }]),
        "สายล่าง รอบ 1",
      );
      for (let r = 1; r < k; r++) {
        const drops = wb[r].slice();
        if (r % 2 === 1) drops.reverse();
        lbPrev = lbRound(
          lbPrev.map((id, i) => [{ winnerOf: id }, { loserOf: drops[i] }]),
          r === k - 1 ? "ชิงชนะเลิศสายล่าง" : `สายล่าง รอบ ${lr + 1}`,
        );
        if (lbPrev.length > 1)
          lbPrev = lbRound(
            Array.from({ length: lbPrev.length / 2 }, (_, i) => [{ winnerOf: lbPrev[2 * i] }, { winnerOf: lbPrev[2 * i + 1] }]),
            `สายล่าง รอบ ${lr + 1}`,
          );
      }
    }
    const wbFinal = wb[k - 1][0];
    const lbFinal = lbPrev[0];
    matches.push({
      id: "GF",
      bracket: "GF",
      round: 0,
      label: "ชิงแชมป์ (Grand Final)",
      sides: [{ winnerOf: wbFinal }, lbFinal ? { winnerOf: lbFinal } : { loserOf: wbFinal }],
    });
    // Played only if the losers-bracket champion wins the first grand final.
    matches.push({ id: "GF2", bracket: "GF", round: 1, label: "ชิงแชมป์ นัดตัดสิน", sides: [{ winnerOf: "GF" }, { loserOf: "GF" }], resetOf: "GF" });
  } else {
    // Round robin, circle method; optional second leg with sides swapped.
    const ids = names.map((_, i) => i);
    if (ids.length % 2) ids.push(BYE);
    const m = ids.length;
    const legs = options.doubleRound ? 2 : 1;
    let rnum = 0;
    for (let leg = 0; leg < legs; leg++) {
      const arr = ids.slice();
      for (let r = 0; r < m - 1; r++) {
        for (let i = 0; i < m / 2; i++) {
          const a = arr[i];
          const b = arr[m - 1 - i];
          if (a === BYE || b === BYE) continue;
          const pair = (r + leg) % 2 ? [b, a] : [a, b];
          matches.push({ id: `R${rnum + 1}-${i + 1}`, bracket: "R", round: rnum, label: `นัดที่ ${rnum + 1}`, sides: pair.map((s) => ({ seed: s })) });
        }
        arr.splice(1, 0, arr.pop());
        rnum++;
      }
    }
  }
  return { mode, names: names.slice(), matches, results: {}, options: { ...options } };
}

// ---------------------------------------------------------------- resolving

/**
 * Works out who plays in every match and who has won, given the recorded results.
 * Results that no longer fit (an earlier result changed) are dropped.
 * Returns a Map id -> { players:[a,b] (index | BYE | undefined), winner, loser, auto, hidden, playable, result }.
 */
export function resolve(t) {
  const out = new Map();
  const byId = new Map(t.matches.map((m) => [m.id, m]));
  const results = t.results;
  const side = (s) => {
    if ("seed" in s) return s.seed;
    const src = get(s.winnerOf ?? s.loserOf);
    if (src.winner === undefined) return undefined;
    return s.winnerOf !== undefined ? src.winner : src.loser;
  };
  function get(id) {
    if (out.has(id)) return out.get(id);
    const m = byId.get(id);
    const players = m.sides.map(side);
    const r = { players, winner: undefined, loser: undefined, auto: false, hidden: false, playable: false, result: null };
    if (m.resetOf) {
      const gf = get(m.resetOf);
      // No reset needed when the winners-bracket champion took the first final.
      if (gf.winner !== undefined && gf.winner === gf.players[0]) {
        r.hidden = true;
        r.winner = gf.winner;
        r.loser = gf.loser;
        out.set(id, r);
        return r;
      }
    }
    const [a, b] = players;
    if (a === BYE && b === BYE) {
      r.winner = r.loser = BYE;
      r.auto = r.hidden = true;
    } else if (a === BYE || b === BYE) {
      if (a !== undefined && b !== undefined) {
        r.winner = a === BYE ? b : a;
        r.loser = BYE;
        r.auto = true;
      }
    } else if (a !== undefined && b !== undefined) {
      const res = results[id];
      if (res && (res.winner === a || res.winner === b || (res.draw && t.mode === "roundrobin")) && res.a === a && res.b === b) {
        r.result = res;
        if (!res.draw) {
          r.winner = res.winner;
          r.loser = res.winner === a ? b : a;
        } else r.winner = r.loser = null;
      } else r.playable = true;
    }
    out.set(id, r);
    return r;
  }
  for (const m of t.matches) get(m.id);
  return out;
}

/** Drops stored results that resolve() no longer accepts, so storage matches what is shown. */
export function cleanResults(t) {
  const res = resolve(t);
  for (const id of Object.keys(t.results)) if (!res.get(id)?.result) delete t.results[id];
  return res;
}

export function recordResult(t, id, { winner, draw = false, scoreA = null, scoreB = null }) {
  const res = resolve(t).get(id);
  const [a, b] = res.players;
  t.results[id] = { a, b, winner: draw ? null : winner, draw, scoreA, scoreB };
  return cleanResults(t);
}

export function clearResult(t, id) {
  delete t.results[id];
  return cleanResults(t);
}

// ---------------------------------------------------------------- summaries

export function progress(t, res = resolve(t)) {
  const real = t.matches.filter((m) => {
    const r = res.get(m.id);
    return !r.auto && !r.hidden;
  });
  const done = real.filter((m) => res.get(m.id).result);
  // GF2 counts only once it is needed; matches still waiting for players count as not done
  return { done: done.length, total: real.length };
}

export function standings(t, res = resolve(t)) {
  const win = t.options.points?.win ?? 3;
  const drawPts = t.options.points?.draw ?? 1;
  const rows = t.names.map((name, i) => ({ i, name, p: 0, w: 0, d: 0, l: 0, sf: 0, sa: 0, pts: 0 }));
  for (const m of t.matches) {
    const r = res.get(m.id);
    if (!r.result) continue;
    const [a, b] = r.players;
    const A = rows[a];
    const B = rows[b];
    A.p++;
    B.p++;
    if (r.result.scoreA != null) {
      A.sf += r.result.scoreA;
      A.sa += r.result.scoreB;
      B.sf += r.result.scoreB;
      B.sa += r.result.scoreA;
    }
    if (r.result.draw) {
      A.d++;
      B.d++;
      A.pts += drawPts;
      B.pts += drawPts;
    } else if (r.winner === a) {
      A.w++;
      B.l++;
      A.pts += win;
    } else {
      B.w++;
      A.l++;
      B.pts += win;
    }
  }
  // head-to-head points as the last tie-break between two players
  const h2h = (x, y) => {
    let s = 0;
    for (const m of t.matches) {
      const r = res.get(m.id);
      if (!r.result || r.result.draw) continue;
      const [a, b] = r.players;
      if ((a === x.i && b === y.i) || (a === y.i && b === x.i)) s += r.winner === x.i ? -1 : 1;
    }
    return s;
  };
  rows.sort((x, y) => y.pts - x.pts || y.sf - y.sa - (x.sf - x.sa) || y.sf - x.sf || h2h(x, y) || x.i - y.i);
  return rows;
}

/** Podium as [first, second, third] name indices (third may be an array of two for a shared 3rd place). */
export function podium(t, res = resolve(t)) {
  const prog = progress(t, res);
  if (t.mode === "roundrobin") {
    if (prog.done < prog.total) return null;
    return standings(t, res).slice(0, 3).map((r) => r.i);
  }
  if (t.mode === "single") {
    const final = t.matches.find((m) => m.bracket === "W" && m.label === "รอบชิงชนะเลิศ");
    const f = res.get(final.id);
    if (f.winner === undefined || f.winner === BYE) return null;
    let third = null;
    const tp = res.get("3rd");
    if (tp) third = tp.winner !== undefined && tp.winner !== BYE ? tp.winner : null;
    else {
      const semis = t.matches.filter((m) => m.bracket === "W" && m.label === "รอบรองชนะเลิศ").map((m) => res.get(m.id).loser).filter((x) => x !== undefined && x !== BYE);
      third = semis.length ? semis : null;
    }
    return [f.winner, f.loser === BYE ? null : f.loser, third];
  }
  const gf2 = res.get("GF2");
  const gf = res.get("GF");
  const decided = gf2.hidden ? gf : gf2;
  if (decided.winner === undefined) return null;
  const lbFinal = t.matches.filter((m) => m.bracket === "L").at(-1);
  const third = lbFinal ? res.get(lbFinal.id).loser : null;
  return [decided.winner, decided.loser, third === BYE ? null : third ?? null];
}

/** Next match to play: the earliest playable one in schedule order. */
export function nextMatch(t, res = resolve(t)) {
  return t.matches.find((m) => res.get(m.id).playable) || null;
}

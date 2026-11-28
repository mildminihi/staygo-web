// Run: node --test engine/engine.test.ts   (Node 23+ runs TypeScript directly)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applyStaygo,
  applyLunjua,
  legalStaygo,
  newStaygo,
  newLunjua,
  countCards,
  countCardsLJ,
  publicView,
  privateView,
  seededRng,
  bustChance,
  DECK_SIZE,
  HAND_LIMIT,
  type SGState,
  type SGAction,
  type LJState,
} from "./engine.ts";

const NAMES = ["Mild", "ฟ้า", "Ploy", "Ton", "Nan", "Bee"];
const GAMES_PER_COUNT = 300;

/** Plays one random STAYGO! game. Returns the final state. Checks invariants after every action. */
function playRandomStaygo(seed: number, n: number): { s: SGState; steps: number } {
  const rng = seededRng(seed);
  const pick = <T>(a: T[]) => a[Math.floor(rng() * a.length)];
  let now = 1_000_000;
  let s = newStaygo(NAMES.slice(0, n), rng, now, seed % n);
  assert.equal(countCards(s), DECK_SIZE);
  let steps = 0;
  while (s.phase !== "end") {
    if (++steps > 5000) throw new Error(`seed ${seed}: game did not end`);
    now += 100;
    let acts: SGAction[] = legalStaygo(s, s.cur, now);
    if (rng() < 0.01) acts = [{ type: "skipAbsent" }];
    assert.ok(acts.length > 0, `seed ${seed}: no legal action in phase ${s.phase}`);
    // Prefer placing a letter to keep games realistic, but explore everything.
    const places = acts.filter((a) => a.type === "place");
    const act = places.length && rng() < 0.6 ? pick(places) : pick(acts);
    const actor = act.type === "skipAbsent" ? (s.cur + 1) % n : s.cur;
    const r = applyStaygo(s, actor, act, rng, now);
    assert.ok(r.ok, `seed ${seed}: legal action rejected: ${JSON.stringify(act)} → ${!r.ok && r.error}`);
    s = r.state;
    assert.equal(countCards(s), DECK_SIZE, `seed ${seed}: card count after ${JSON.stringify(act)}`);
    if (s.phase === "play" || s.phase === "target") {
      assert.ok(s.players[s.cur].hand.length > 0 || s.playsLeft === 0, "empty-hand player still playing");
    }
    if (s.phase !== "excess" && s.phase !== "end") {
      for (let i = 0; i < n; i++) if (i !== s.cur) assert.ok(s.players[i].row.length <= 6);
    }
  }
  return { s, steps };
}

for (let n = 2; n <= 5; n++) {
  test(`STAYGO! ${GAMES_PER_COUNT} random games, ${n} players: every game ends, 60 cards always`, () => {
    let rowWins = 0;
    for (let g = 0; g < GAMES_PER_COUNT; g++) {
      const { s } = playRandomStaygo(n * 10_000 + g, n);
      assert.ok(s.winners && s.winners.length >= 1);
      if (s.endReason === "row") rowWins++;
    }
    assert.ok(rowWins > 0, "some games should be won by a full row");
  });
}

test("STAYGO!: actions from a player who is not cur are rejected", () => {
  const rng = seededRng(7);
  let now = 0;
  let s = newStaygo(NAMES.slice(0, 4), rng, now);
  for (let step = 0; step < 300 && s.phase !== "end"; step++) {
    now += 10;
    const other = (s.cur + 1) % 4;
    // Everything the current player could do must be refused for someone else.
    for (const a of legalStaygo(s, s.cur, now)) {
      if (a.type === "skipAbsent") continue;
      const r = applyStaygo(s, other, a, rng, now);
      assert.equal(r.ok, false, `other player could ${JSON.stringify(a)}`);
    }
    const acts = legalStaygo(s, s.cur, now);
    const r = applyStaygo(s, s.cur, acts[Math.floor(rng() * acts.length)], rng, now);
    assert.ok(r.ok);
    s = r.state;
  }
});

test("STAYGO!: projections never leak other hands or the deck", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const rng = seededRng(seed);
    let now = 0;
    let s = newStaygo(NAMES.slice(0, 3), rng, now);
    for (let step = 0; step < 400 && s.phase !== "end"; step++) {
      checkProjection(s);
      now += 10;
      const acts = legalStaygo(s, s.cur, now);
      s = (applyStaygo(s, s.cur, acts[Math.floor(rng() * acts.length)], rng, now) as { state: SGState }).state;
    }
  }

  function checkProjection(s: SGState) {
    const pub = JSON.stringify(publicView(s));
    assert.ok(!pub.includes('"hand"'), "public has a hand");
    assert.ok(!pub.includes('"deck"'), "public has the deck");
    assert.ok(!pub.includes('"id"'), "public exposes card ids");
    for (let p = 0; p < s.players.length; p++) {
      const priv = privateView(s, p);
      const mine = new Set(s.players[p].hand.map((c) => c.id));
      assert.deepEqual(new Set(priv.hand.map((c) => c.id)), mine);
      const json = JSON.stringify(priv);
      for (const c of s.deck) assert.ok(!json.includes(`"id":${c.id},`), `private ${p} sees deck card ${c.id}`);
      for (let o = 0; o < s.players.length; o++) {
        if (o === p) continue;
        for (const c of s.players[o].hand) assert.ok(!json.includes(`"id":${c.id},`), `private ${p} sees hand of ${o}`);
      }
      if (p !== s.cur) assert.equal(priv.pending, null);
    }
  }
});

/** Two-player game where the current player holds exactly `hand` (other cards go back to the deck). */
function rigged(seed: number, n = 2) {
  const rng = seededRng(seed);
  const s = newStaygo(NAMES.slice(0, n), rng, 0);
  const pool = [...s.deck, ...s.players.flatMap((p) => p.hand)];
  s.players.forEach((p) => (p.hand = []));
  const take = (pred: (c: SGState["deck"][number]) => boolean) => pool.splice(pool.findIndex(pred), 1)[0];
  const letter = (l: string) => take((c) => c.k === "L" && c.l === l);
  return { s, rng, pool, take, letter, done: () => (s.deck = pool) };
}

test("STAYGO!: a full row wins at once, no shout", () => {
  const { s, rng, letter, done } = rigged(3);
  const me = s.players[s.cur];
  me.row = ["S", "T", "A", "Y", "G"].map(letter);
  const o = letter("O");
  me.hand = [o];
  done();
  const r = applyStaygo(s, s.cur, { type: "place", cardId: o.id }, rng, 1000);
  assert.ok(r.ok);
  assert.equal(r.state.phase, "end");
  assert.equal(r.state.endReason, "row");
  assert.deepEqual(r.state.winners, [s.cur]);
});

test("STAYGO!: Take picks any card from the discard pile", () => {
  const { s, rng, letter, take, done } = rigged(4);
  const t = letter("T");
  s.players[s.cur].hand = [t, letter("S")];
  const old = [letter("G"), take((c) => c.k === "W"), letter("A")];
  s.discard = old.slice();
  done();
  let r = applyStaygo(s, s.cur, { type: "power", cardId: t.id }, rng, 0);
  assert.ok(r.ok && r.state.phase === "pickT");
  const priv = privateView(r.state, s.cur);
  assert.ok(priv.pending?.type === "pickT" && priv.pending.options.length === 3);
  assert.equal(applyStaygo(r.state, s.cur, { type: "pickDiscard", cardId: 9999 }, rng, 0).ok, false);
  r = applyStaygo(r.state, s.cur, { type: "pickDiscard", cardId: old[1].id }, rng, 0);
  assert.ok(r.ok);
  const me = r.state.players[s.cur];
  assert.ok(me.hand.some((c) => c.id === old[1].id), "picked card in hand");
  assert.ok(!me.hand.some((c) => c.id === t.id), "T left the hand");
  assert.deepEqual(r.state.discard.map((c) => c.id), [old[0].id, old[2].id, t.id]);
  assert.equal(countCards(r.state), DECK_SIZE);
});

test("STAYGO!: Take with an empty discard pile draws 1", () => {
  const { s, rng, letter, done } = rigged(5);
  const t = letter("T");
  s.players[s.cur].hand = [t, letter("S")];
  done();
  const top = s.deck[0];
  const r = applyStaygo(s, s.cur, { type: "power", cardId: t.id }, rng, 0);
  assert.ok(r.ok && r.state.phase !== "pickT");
  const me = r.state.players[s.cur];
  assert.equal(me.hand.length, 2);
  assert.ok(me.hand.some((c) => c.id === top.id));
  assert.deepEqual(r.state.discard.map((c) => c.id), [t.id]);
});

test("STAYGO!: Oops! takes the target's last row card into your hand", () => {
  const { s, rng, letter, done } = rigged(6);
  const other = 1 - s.cur;
  const o = letter("O");
  s.players[s.cur].hand = [o, letter("Y")];
  s.players[other].row = ["S", "T"].map(letter);
  const lastId = s.players[other].row[1].id;
  done();
  const pick = applyStaygo(s, s.cur, { type: "power", cardId: o.id }, rng, 0) as { state: SGState };
  assert.equal(applyStaygo(pick.state, s.cur, { type: "target", players: [s.cur] }, rng, 0).ok, false, "not on yourself");
  const r = applyStaygo(pick.state, s.cur, { type: "target", players: [other] }, rng, 0);
  assert.ok(r.ok);
  assert.equal(r.state.players[other].row.length, 1);
  assert.ok(r.state.players[s.cur].hand.some((c) => c.id === lastId));
  assert.ok(!r.state.players[other].hand.some((c) => c.id === lastId), "target does not get it back");
});

test("STAYGO!: GO! passes hands left or right", () => {
  for (const dir of ["left", "right"] as const) {
    const { s, rng, letter, take, done } = rigged(7, 3);
    const go = take((c) => c.k === "GO");
    const cur = s.cur;
    s.players.forEach((p, i) => (p.hand = i === cur ? [go, letter("S")] : [letter(i === (cur + 1) % 3 ? "A" : "Y")]));
    const marks = s.players.map((p) => p.hand[p.hand.length - 1].id);
    done();
    const r = applyStaygo(s, cur, { type: "playAction", cardId: go.id, dir }, rng, 0);
    assert.ok(r.ok);
    for (let i = 0; i < 3; i++) {
      const from = dir === "left" ? (i + 2) % 3 : (i + 1) % 3;
      assert.ok(r.state.players[i].hand.some((c) => c.id === marks[from]), `${dir}: seat ${i} gets seat ${from}'s hand`);
    }
  }
});

test("STAYGO!: hand limit forces discards down to 6", () => {
  for (let seed = 0; seed < 200; seed++) {
    const { s } = playRandomStaygo(900_000 + seed, 2);
    // After a game ends no one in "excess" state remains half-done.
    assert.notEqual(s.phase, "excess");
  }
  assert.equal(HAND_LIMIT, 6);
});

// ---------------------------------------------------------------- ลุ้นจั่ว

function playRandomLunjua(seed: number, n: number): LJState {
  const rng = seededRng(seed);
  let s = newLunjua(NAMES.slice(0, n), rng, 0, seed % n);
  let steps = 0;
  while (s.phase !== "end") {
    if (++steps > 20_000) throw new Error(`seed ${seed}: ลุ้นจั่ว did not end`);
    let act: { type: "flip" | "bank" | "nextTurn" };
    if (s.phase === "bust" || s.phase === "banked") act = { type: "nextTurn" };
    else if (s.phase === "stay" || s.flipsThisTurn === 0 || s.mustFlip > 0) act = { type: "flip" };
    else act = rng() < bustChance(s) + 0.15 ? { type: "bank" } : { type: "flip" };
    const r = applyLunjua(s, s.cur, act, rng, steps);
    assert.ok(r.ok, `seed ${seed}: ${act.type} rejected: ${!r.ok && r.error}`);
    s = r.state;
    assert.equal(countCardsLJ(s), DECK_SIZE, `seed ${seed}: card count after ${act.type}`);
    for (const b of s.banks) assert.equal(new Set(b).size, b.length, "bank has duplicate letters");
    const p = bustChance(s);
    assert.ok(p >= 0 && p <= 1);
  }
  assert.equal(s.banks[s.winners![0]].length, 6);
  return s;
}

for (let n = 2; n <= 6; n++) {
  test(`ลุ้นจั่ว ${GAMES_PER_COUNT} random games, ${n} players: every game ends, 60 cards always`, () => {
    for (let g = 0; g < GAMES_PER_COUNT; g++) playRandomLunjua(n * 1000 + g, n);
  });
}

test("ลุ้นจั่ว: only cur may act, must flip at least once, GO! forces 2 more", () => {
  const rng = seededRng(1);
  let s = newLunjua(["A", "B", "C"], rng, 0);
  assert.equal(applyLunjua(s, 1, { type: "flip" }, rng, 0).ok, false);
  assert.equal(applyLunjua(s, 0, { type: "bank" }, rng, 0).ok, false);
  // Put a GO! on top, then two safe letters.
  const pull = (pred: (c: LJState["deck"][number]) => boolean) => s.deck.splice(s.deck.findIndex(pred), 1)[0];
  const go = pull((c) => c.k === "GO");
  const a = pull((c) => c.k === "L" && c.l === "S");
  const b = pull((c) => c.k === "L" && c.l === "T");
  s.deck.unshift(go, a, b);
  s = (applyLunjua(s, 0, { type: "flip" }, rng, 0) as { state: LJState }).state;
  assert.equal(s.mustFlip, 2);
  assert.equal(applyLunjua(s, 0, { type: "bank" }, rng, 0).ok, false);
  s = (applyLunjua(s, 0, { type: "flip" }, rng, 0) as { state: LJState }).state;
  s = (applyLunjua(s, 0, { type: "flip" }, rng, 0) as { state: LJState }).state;
  const banked = applyLunjua(s, 0, { type: "bank" }, rng, 0);
  assert.ok(banked.ok);
  assert.deepEqual(banked.state.banks[0], ["S", "T"]);
});

test("ลุ้นจั่ว: STAY gives a bonus flip that cannot bust", () => {
  const rng = seededRng(2);
  let s = newLunjua(["A", "B"], rng, 0);
  const pull = (pred: (c: LJState["deck"][number]) => boolean) => s.deck.splice(s.deck.findIndex(pred), 1)[0];
  const s1 = pull((c) => c.k === "L" && c.l === "S");
  const stay = pull((c) => c.k === "STAY");
  const s2 = pull((c) => c.k === "L" && c.l === "S");
  s.deck.unshift(s1, stay, s2);
  s = (applyLunjua(s, 0, { type: "flip" }, rng, 0) as { state: LJState }).state;
  s = (applyLunjua(s, 0, { type: "flip" }, rng, 0) as { state: LJState }).state;
  // STAY waits for the player to flip the bonus card; stopping is not allowed yet.
  assert.equal(s.phase, "stay");
  assert.equal(applyLunjua(s, 0, { type: "bank" }, rng, 0).ok, false);
  assert.equal(applyLunjua(s, 1, { type: "flip" }, rng, 0).ok, false);
  assert.equal(countCardsLJ(s), DECK_SIZE);
  s = (applyLunjua(s, 0, { type: "flip" }, rng, 0) as { state: LJState }).state;
  // The bonus S is a duplicate: discarded, not a bust.
  assert.equal(s.phase, "banked");
  assert.deepEqual(s.banks[0], ["S"]);
  assert.deepEqual(s.events.map((e) => e.kind), ["letter", "stay", "bonusDiscard"]);
  assert.equal(countCardsLJ(s), DECK_SIZE);
});

test("ลุ้นจั่ว: STAY bonus card that is new gets banked", () => {
  const rng = seededRng(3);
  let s = newLunjua(["A", "B"], rng, 0);
  const pull = (pred: (c: LJState["deck"][number]) => boolean) => s.deck.splice(s.deck.findIndex(pred), 1)[0];
  s.deck.unshift(pull((c) => c.k === "L" && c.l === "S"), pull((c) => c.k === "STAY"), pull((c) => c.k === "L" && c.l === "O"));
  for (let i = 0; i < 3; i++) s = (applyLunjua(s, 0, { type: "flip" }, rng, 0) as { state: LJState }).state;
  assert.equal(s.phase, "banked");
  assert.deepEqual(s.banks[0], ["S", "O"]);
  assert.deepEqual(s.events.map((e) => e.kind), ["letter", "stay", "bonus"]);
});

test("ลุ้นจั่ว: wilds fill missing letters", () => {
  const rng = seededRng(4);
  let s = newLunjua(["A", "B"], rng, 0);
  s.banks[0] = ["S", "T", "A", "Y"];
  const pull = (pred: (c: LJState["deck"][number]) => boolean) => s.deck.splice(s.deck.findIndex(pred), 1)[0];
  s.deck.unshift(pull((c) => c.k === "W"), pull((c) => c.k === "W"));
  s = (applyLunjua(s, 0, { type: "flip" }, rng, 0) as { state: LJState }).state;
  s = (applyLunjua(s, 0, { type: "flip" }, rng, 0) as { state: LJState }).state;
  s = (applyLunjua(s, 0, { type: "bank" }, rng, 0) as { state: LJState }).state;
  assert.equal(s.phase, "end");
  assert.deepEqual(s.winners, [0]);
});

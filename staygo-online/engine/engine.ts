/*
 * STAYGO game engine — pure, no Firebase, no DOM.
 *
 * Two games share one 60-card deck:
 *   - STAYGO!  (set collection, hidden hands) — runs on the server (Cloud Functions)
 *   - ลุ้นจั่ว   (push-your-luck)              — runs in the browser, one shared device
 *
 * Every function takes `rng` and `now` from the caller so tests can be deterministic.
 * State objects are never mutated: apply() works on a deep copy.
 */

// ---------------------------------------------------------------- cards

export type Letter = "S" | "T" | "A" | "Y" | "G" | "O";
export const LETTERS: Letter[] = ["S", "T", "A", "Y", "G", "O"];

export type Card =
  | { id: number; k: "L"; l: Letter }
  | { id: number; k: "W" } // STAYGO wild
  | { id: number; k: "STAY" }
  | { id: number; k: "GO" };

export const DECK_SIZE = 60;
export const POWER_NAMES: Record<Letter, string> = {
  S: "Swap",
  T: "Take",
  A: "Again",
  Y: "Yolo",
  G: "Got",
  O: "Oops!",
};

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  let id = 0;
  for (const l of LETTERS) for (let i = 0; i < 8; i++) deck.push({ id: id++, k: "L", l });
  for (let i = 0; i < 4; i++) deck.push({ id: id++, k: "W" });
  for (let i = 0; i < 4; i++) deck.push({ id: id++, k: "STAY" });
  for (let i = 0; i < 4; i++) deck.push({ id: id++, k: "GO" });
  return deck;
}

export function shuffle<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function cardName(c: Card): string {
  if (c.k === "L") return c.l;
  if (c.k === "W") return "STAYGO";
  if (c.k === "STAY") return "STAY";
  return "GO!";
}

/** Seeded RNG (mulberry32) for tests and replays. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

export type Result<S> = { ok: true; state: S } | { ok: false; error: string };
const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

export interface LogEntry {
  t: number;
  text: string;
}
const LOG_MAX = 40;

// ================================================================ GAME 1: STAYGO!

export const HAND_LIMIT = 6;
export const ROW_LEN = 6;
export const SHOUT_MS = 5000;
export const SG_MIN_PLAYERS = 2;
export const SG_MAX_PLAYERS = 5;

export type SGPhase = "play" | "target" | "giveS" | "shout" | "excess" | "end";
export type TargetKind = "S" | "G" | "O" | "Y" | "STAY";

export interface SGPlayer {
  hand: Card[];
  row: Card[];
  skip: boolean;
}

export type SGPending =
  | null
  | { type: TargetKind; cardId: number }
  | { type: "giveS"; target: number; takenCardId: number };

export interface SGState {
  game: "staygo";
  names: string[];
  players: SGPlayer[];
  deck: Card[];
  discard: Card[];
  cur: number;
  phase: SGPhase;
  playsLeft: number;
  aLock: boolean; // true during the extra plays from Again
  pending: SGPending;
  shoutDeadline: number | null;
  endAt: number | null;
  winners: number[] | null;
  endReason: "shout" | "deck" | null;
  log: LogEntry[];
  notices: (LogEntry | null)[]; // private, one per player
  turnCount: number;
  startedAt: number;
  turnStartedAt: number;
  endedAt: number | null;
  version: number;
}

export type SGAction =
  | { type: "place"; cardId: number }
  | { type: "power"; cardId: number }
  | { type: "playAction"; cardId: number }
  | { type: "target"; players: number[] }
  | { type: "cancelTarget" }
  | { type: "give"; cardId: number }
  | { type: "shout" }
  | { type: "expireShout" }
  | { type: "endTurnEarly" }
  | { type: "discardExcess"; cardId: number }
  | { type: "skipAbsent" };

/** Actions any seated player may send, not only the current one. */
export const ANYONE_ACTIONS = new Set<SGAction["type"]>(["expireShout", "skipAbsent"]);

export function newStaygo(names: string[], rng: () => number, now: number, first = 0): SGState {
  const n = names.length;
  if (n < SG_MIN_PLAYERS || n > SG_MAX_PLAYERS) throw new Error("STAYGO! ต้องมีผู้เล่น 2–5 คน");
  const deck = shuffle(makeDeck(), rng);
  const players: SGPlayer[] = names.map(() => ({ hand: deck.splice(0, 4), row: [], skip: false }));
  const s: SGState = {
    game: "staygo",
    names: names.slice(),
    players,
    deck,
    discard: [],
    cur: first,
    phase: "play",
    playsLeft: 1,
    aLock: false,
    pending: null,
    shoutDeadline: null,
    endAt: null,
    winners: null,
    endReason: null,
    log: [],
    notices: names.map(() => null),
    turnCount: 0,
    startedAt: now,
    turnStartedAt: now,
    endedAt: null,
    version: 0,
  };
  log(s, now, `เริ่มเกม! ${names[first]} เล่นก่อน`);
  startTurn(s, now);
  return s;
}

function log(s: { log: LogEntry[] }, now: number, text: string) {
  s.log.push({ t: now, text });
  if (s.log.length > LOG_MAX) s.log.splice(0, s.log.length - LOG_MAX);
}
function notice(s: SGState, p: number, now: number, text: string) {
  s.notices[p] = { t: now, text };
}

export function nextNeeded(row: Card[]): Letter | null {
  return row.length < ROW_LEN ? LETTERS[row.length] : null;
}

function drawOne(s: SGState, p: number): Card | null {
  const c = s.deck.shift();
  if (!c) return null;
  s.players[p].hand.push(c);
  if (s.deck.length === 0 && s.endAt === null) s.endAt = s.cur;
  return c;
}

function takeFromHand(s: SGState, p: number, cardId: number): Card | null {
  const hand = s.players[p].hand;
  const i = hand.findIndex((c) => c.id === cardId);
  return i < 0 ? null : hand.splice(i, 1)[0];
}

function randomFromHand(s: SGState, p: number, rng: () => number): Card | null {
  const hand = s.players[p].hand;
  if (!hand.length) return null;
  return hand.splice(Math.floor(rng() * hand.length), 1)[0];
}

function startTurn(s: SGState, now: number) {
  // Loops past players who lose their turn: marked by STAY, or holding nothing with an empty pile.
  // Terminates: an empty pile means endAt is set, so passTurn ends the game within one lap.
  for (let guard = 0; guard <= 2 * s.players.length + 2; guard++) {
    const p = s.players[s.cur];
    s.phase = "play";
    s.playsLeft = 1;
    s.aLock = false;
    s.pending = null;
    s.turnStartedAt = now;
    if (p.skip) {
      p.skip = false;
      log(s, now, `${s.names[s.cur]} โดน STAY ข้ามเทิร์นนี้`);
      if (!passTurn(s, now)) return;
      continue;
    }
    const drew = drawOne(s, s.cur);
    if (drew) notice(s, s.cur, now, `จั่วได้ ${cardName(drew)}`);
    else log(s, now, `กองจั่วหมด ${s.names[s.cur]} ไม่ได้จั่ว`);
    if (p.hand.length > 0) return;
    log(s, now, `${s.names[s.cur]} ไม่มีการ์ดในมือ ข้ามเทิร์น`);
    if (!passTurn(s, now)) return;
  }
  finishByDeck(s, now);
}

/** Moves `cur` to the next player. Returns false if the game ended instead. */
function passTurn(s: SGState, now: number): boolean {
  const next = (s.cur + 1) % s.players.length;
  if (s.endAt !== null && next === s.endAt) {
    finishByDeck(s, now);
    return false;
  }
  s.cur = next;
  s.turnCount++;
  return true;
}

function finishByDeck(s: SGState, now: number) {
  const score = (i: number) => s.players[i].row.length * 100 - s.players[i].hand.length;
  const best = Math.max(...s.players.map((_, i) => score(i)));
  s.winners = s.players.map((_, i) => i).filter((i) => score(i) === best);
  s.phase = "end";
  s.endReason = "deck";
  s.endedAt = now;
  s.pending = null;
  s.shoutDeadline = null;
  log(s, now, `กองจั่วหมดรอบแล้ว — ${s.winners.map((i) => s.names[i]).join(", ")} ชนะ!`);
}

function endTurn(s: SGState, now: number) {
  s.pending = null;
  if (s.players[s.cur].hand.length > HAND_LIMIT) {
    s.phase = "excess";
    return;
  }
  if (passTurn(s, now)) startTurn(s, now);
}

/** Called after a play resolves. */
function consumePlay(s: SGState, now: number) {
  s.pending = null;
  s.playsLeft--;
  if (s.players[s.cur].hand.length === 0) {
    if (s.playsLeft > 0) log(s, now, `${s.names[s.cur]} ไม่มีการ์ดเหลือ จบเทิร์น`);
    s.playsLeft = 0;
  }
  if (s.playsLeft > 0) s.phase = "play";
  else endTurn(s, now);
}

function discardCard(s: SGState, c: Card) {
  s.discard.push(c);
}

/** Which players a pending target power may legally pick (engine accepts empty-hand targets; the UI greys them). */
export function validTargets(s: SGState, kind: TargetKind): number[] {
  const all = s.players.map((_, i) => i);
  if (kind === "Y" || kind === "O") return all;
  return all.filter((i) => i !== s.cur);
}

/** Targets where the power would actually do something (for UI hints). */
export function usefulTargets(s: SGState, kind: TargetKind): number[] {
  return validTargets(s, kind).filter((i) => {
    const p = s.players[i];
    if (kind === "S" || kind === "G") return p.hand.length > 0;
    if (kind === "O") return p.row.length > 0;
    if (kind === "STAY") return !p.skip;
    return true;
  });
}

export function applyStaygo(
  state: SGState,
  actor: number,
  action: SGAction,
  rng: () => number,
  now: number,
): Result<SGState> {
  if (state.phase === "end") return fail("เกมจบแล้ว");
  if (!Number.isInteger(actor) || actor < 0 || actor >= state.players.length) return fail("ไม่พบผู้เล่น");
  if (!ANYONE_ACTIONS.has(action.type) && actor !== state.cur) return fail("ยังไม่ถึงตาคุณ");
  const s = clone(state);
  const me = s.players[s.cur];
  const myName = s.names[s.cur];
  const r = run();
  if (r) return fail(r);
  s.version++;
  return { ok: true, state: s };

  function run(): string | null {
    switch (action.type) {
      case "place": {
        if (s.phase !== "play") return "ตอนนี้วางการ์ดไม่ได้";
        const c = me.hand.find((x) => x.id === action.cardId);
        if (!c) return "ไม่มีการ์ดใบนี้ในมือ";
        const need = nextNeeded(me.row);
        if (!need) return "แถวเต็มแล้ว";
        if (!(c.k === "W" || (c.k === "L" && c.l === need))) return `แถวต้องการตัว ${need}`;
        takeFromHand(s, s.cur, c.id);
        me.row.push(c);
        log(s, now, `${myName} วาง ${c.k === "W" ? `STAYGO เป็น ${need}` : need} ต่อแถว (${me.row.length}/6)`);
        if (me.row.length === ROW_LEN) {
          s.phase = "shout";
          s.shoutDeadline = now + SHOUT_MS;
          log(s, now, `${myName} แถวครบ 6! ต้องกด STAYGO! ภายใน 5 วินาที`);
          return null;
        }
        consumePlay(s, now);
        return null;
      }

      case "power": {
        if (s.phase !== "play") return "ตอนนี้ใช้พลังไม่ได้";
        const c = me.hand.find((x) => x.id === action.cardId);
        if (!c) return "ไม่มีการ์ดใบนี้ในมือ";
        if (c.k !== "L") return "ใช้พลังได้เฉพาะการ์ดตัวอักษร";
        if (c.l === "A" && s.aLock) return "ระหว่าง Again ใช้พลัง A ไม่ได้";
        if (c.l === "T") {
          takeFromHand(s, s.cur, c.id);
          discardCard(s, c);
          const got: Card[] = [];
          for (let i = 0; i < 2; i++) {
            const d = drawOne(s, s.cur);
            if (d) got.push(d);
          }
          log(s, now, `${myName} ใช้ Take จั่ว ${got.length} ใบ`);
          notice(s, s.cur, now, got.length ? `Take: ได้ ${got.map(cardName).join(", ")}` : "Take: กองจั่วหมดแล้ว");
          consumePlay(s, now);
          return null;
        }
        if (c.l === "A") {
          takeFromHand(s, s.cur, c.id);
          discardCard(s, c);
          s.aLock = true;
          s.playsLeft = 2;
          log(s, now, `${myName} ใช้ Again เล่นได้อีก 2 ใบ`);
          if (me.hand.length === 0) {
            s.playsLeft = 1;
            consumePlay(s, now);
          }
          return null;
        }
        s.phase = "target";
        s.pending = { type: c.l as TargetKind, cardId: c.id };
        return null;
      }

      case "playAction": {
        if (s.phase !== "play") return "ตอนนี้เล่นการ์ดแอคชันไม่ได้";
        const c = me.hand.find((x) => x.id === action.cardId);
        if (!c) return "ไม่มีการ์ดใบนี้ในมือ";
        if (c.k === "STAY") {
          s.phase = "target";
          s.pending = { type: "STAY", cardId: c.id };
          return null;
        }
        if (c.k !== "GO") return "การ์ดนี้ไม่ใช่การ์ดแอคชัน";
        takeFromHand(s, s.cur, c.id);
        discardCard(s, c);
        const n = s.players.length;
        const hands = s.players.map((p) => p.hand);
        s.players.forEach((p, i) => (p.hand = hands[(i - 1 + n) % n]));
        log(s, now, `${myName} เล่น GO! ทุกคนส่งการ์ดทั้งมือไปทางซ้าย`);
        s.players.forEach((p, i) => notice(s, i, now, `GO! ได้รับการ์ด ${p.hand.length} ใบจาก ${s.names[(i - 1 + n) % n]}`));
        consumePlay(s, now);
        return null;
      }

      case "cancelTarget": {
        if (s.phase !== "target") return "ไม่มีอะไรให้ยกเลิก";
        s.phase = "play";
        s.pending = null;
        return null;
      }

      case "target": {
        if (s.phase !== "target" || !s.pending || s.pending.type === "giveS") return "ตอนนี้เลือกเป้าหมายไม่ได้";
        const kind = s.pending.type;
        const ts = action.players;
        const need = kind === "Y" ? 2 : 1;
        if (!Array.isArray(ts) || ts.length !== need) return kind === "Y" ? "เลือกผู้เล่น 2 คน" : "เลือกผู้เล่น 1 คน";
        if (kind === "Y" && ts[0] === ts[1]) return "เลือกผู้เล่น 2 คนที่ต่างกัน";
        const valid = validTargets(s, kind);
        if (!ts.every((t) => valid.includes(t))) return "เลือกเป้าหมายนี้ไม่ได้";
        const card = takeFromHand(s, s.cur, s.pending.cardId);
        if (!card) return "ไม่มีการ์ดใบนี้ในมือ";
        discardCard(s, card);
        const t = ts[0];
        const tName = s.names[t];
        const tp = s.players[t];

        if (kind === "S") {
          if (me.hand.length === 0 || tp.hand.length === 0) {
            log(s, now, `${myName} ใช้ Swap กับ ${tName} แต่ไม่มีผล`);
            consumePlay(s, now);
            return null;
          }
          const taken = randomFromHand(s, t, rng)!;
          me.hand.push(taken);
          s.phase = "giveS";
          s.pending = { type: "giveS", target: t, takenCardId: taken.id };
          log(s, now, `${myName} ใช้ Swap สุ่มการ์ด 1 ใบจาก ${tName}`);
          notice(s, s.cur, now, `Swap: ได้ ${cardName(taken)} จาก ${tName} — เลือกการ์ด 1 ใบให้เขา`);
          notice(s, t, now, `${myName} สุ่มเอา ${cardName(taken)} ของคุณไป`);
          return null;
        }
        if (kind === "G") {
          const got = randomFromHand(s, t, rng);
          if (got) {
            me.hand.push(got);
            log(s, now, `${myName} ใช้ Got ขโมยการ์ด 1 ใบจาก ${tName}`);
            notice(s, s.cur, now, `Got: ขโมยได้ ${cardName(got)} จาก ${tName}`);
            notice(s, t, now, `${myName} ขโมย ${cardName(got)} ของคุณไป`);
          } else log(s, now, `${myName} ใช้ Got กับ ${tName} แต่มือว่าง`);
          consumePlay(s, now);
          return null;
        }
        if (kind === "O") {
          const back = tp.row.pop();
          if (back) {
            tp.hand.push(back);
            log(s, now, `${myName} ใช้ Oops! ${tName} ต้องเอา ${cardName(back)} คืนเข้ามือ`);
          } else log(s, now, `${myName} ใช้ Oops! กับ ${tName} แต่แถวว่าง`);
          consumePlay(s, now);
          return null;
        }
        if (kind === "Y") {
          const [a, b] = ts;
          const tmp = s.players[a].hand;
          s.players[a].hand = s.players[b].hand;
          s.players[b].hand = tmp;
          log(s, now, `${myName} ใช้ Yolo ให้ ${s.names[a]} กับ ${s.names[b]} สลับมือกัน`);
          notice(s, a, now, `Yolo: สลับมือกับ ${s.names[b]}`);
          notice(s, b, now, `Yolo: สลับมือกับ ${s.names[a]}`);
          consumePlay(s, now);
          return null;
        }
        // STAY
        tp.skip = true;
        log(s, now, `${myName} เล่น STAY ใส่ ${tName} — ข้ามเทิร์นถัดไป`);
        consumePlay(s, now);
        return null;
      }

      case "give": {
        if (s.phase !== "giveS" || !s.pending || s.pending.type !== "giveS") return "ตอนนี้ให้การ์ดไม่ได้";
        const t = s.pending.target;
        const c = takeFromHand(s, s.cur, action.cardId);
        if (!c) return "ไม่มีการ์ดใบนี้ในมือ";
        s.players[t].hand.push(c);
        log(s, now, `${myName} ให้การ์ด 1 ใบคืน ${s.names[t]}`);
        notice(s, t, now, `${myName} ให้ ${cardName(c)} กับคุณ`);
        consumePlay(s, now);
        return null;
      }

      case "shout": {
        if (s.phase !== "shout") return "ตอนนี้ยังไม่ต้องตะโกน";
        if (s.shoutDeadline === null || now > s.shoutDeadline) return "หมดเวลาแล้ว";
        s.winners = [s.cur];
        s.phase = "end";
        s.endReason = "shout";
        s.endedAt = now;
        s.shoutDeadline = null;
        log(s, now, `${myName}: STAYGO!!! ชนะ!`);
        return null;
      }

      case "expireShout": {
        if (s.phase !== "shout") return "ไม่ได้อยู่ในช่วงตะโกน";
        if (s.shoutDeadline === null || now <= s.shoutDeadline) return "ยังไม่หมดเวลา";
        const back = me.row.pop()!;
        me.hand.push(back);
        s.shoutDeadline = null;
        log(s, now, `${myName} ไม่ทันกด STAYGO! ${cardName(back)} กลับเข้ามือ`);
        consumePlay(s, now);
        return null;
      }

      case "endTurnEarly": {
        if (s.phase !== "play" || !s.aLock) return "จบเทิร์นก่อนได้เฉพาะระหว่าง Again";
        log(s, now, `${myName} จบเทิร์น`);
        s.playsLeft = 0;
        endTurn(s, now);
        return null;
      }

      case "discardExcess": {
        if (s.phase !== "excess") return "ไม่ต้องทิ้งการ์ด";
        const c = takeFromHand(s, s.cur, action.cardId);
        if (!c) return "ไม่มีการ์ดใบนี้ในมือ";
        discardCard(s, c);
        if (me.hand.length <= HAND_LIMIT) {
          log(s, now, `${myName} ทิ้งการ์ดจนเหลือ ${HAND_LIMIT} ใบ`);
          endTurn(s, now);
        }
        return null;
      }

      case "skipAbsent": {
        // The caller (Cloud Function) checks that the current player has been offline long enough.
        if (s.phase === "shout") return "รอให้หมดเวลาตะโกนก่อน";
        if (s.phase === "giveS" && s.pending?.type === "giveS") {
          const c = randomFromHand(s, s.cur, rng)!;
          s.players[s.pending.target].hand.push(c);
          notice(s, s.pending.target, now, `ได้รับ ${cardName(c)} คืนจาก ${myName}`);
        }
        while (me.hand.length > HAND_LIMIT) discardCard(s, randomFromHand(s, s.cur, rng)!);
        log(s, now, `${myName} ออฟไลน์ ข้ามเทิร์น`);
        s.pending = null;
        s.playsLeft = 0;
        endTurn(s, now);
        return null;
      }
    }
    return "ไม่รู้จักคำสั่งนี้";
  }
}

/** All actions the given player could send right now (used by tests and UI hints). */
export function legalStaygo(s: SGState, actor: number, now: number): SGAction[] {
  const out: SGAction[] = [];
  if (s.phase === "end") return out;
  if (s.phase === "shout") {
    if (actor === s.cur && s.shoutDeadline !== null && now <= s.shoutDeadline) out.push({ type: "shout" });
    if (s.shoutDeadline !== null && now > s.shoutDeadline) out.push({ type: "expireShout" });
    return out;
  }
  if (actor !== s.cur) return out;
  const me = s.players[s.cur];
  if (s.phase === "play") {
    const need = nextNeeded(me.row);
    for (const c of me.hand) {
      if (need && (c.k === "W" || (c.k === "L" && c.l === need))) out.push({ type: "place", cardId: c.id });
      if (c.k === "L" && !(c.l === "A" && s.aLock)) out.push({ type: "power", cardId: c.id });
      if (c.k === "STAY" || c.k === "GO") out.push({ type: "playAction", cardId: c.id });
    }
    if (s.aLock) out.push({ type: "endTurnEarly" });
  } else if (s.phase === "target" && s.pending && s.pending.type !== "giveS") {
    const v = validTargets(s, s.pending.type);
    if (s.pending.type === "Y") {
      for (const a of v) for (const b of v) if (a < b) out.push({ type: "target", players: [a, b] });
    } else for (const t of v) out.push({ type: "target", players: [t] });
    out.push({ type: "cancelTarget" });
  } else if (s.phase === "giveS") {
    for (const c of me.hand) out.push({ type: "give", cardId: c.id });
  } else if (s.phase === "excess") {
    for (const c of me.hand) out.push({ type: "discardExcess", cardId: c.id });
  }
  return out;
}

export function countCards(s: SGState): number {
  return s.deck.length + s.discard.length + s.players.reduce((n, p) => n + p.hand.length + p.row.length, 0);
}

// ---------------------------------------------------------------- projections (what each client may read)

export type PublicCard = Omit<Card, "id">;
const stripId = (c: Card): PublicCard => {
  const { id: _id, ...rest } = c;
  return rest as PublicCard;
};

export interface SGPublic {
  cur: number;
  phase: SGPhase;
  deckCount: number;
  discardCount: number;
  discardTop: PublicCard | null;
  players: { handCount: number; row: PublicCard[]; skip: boolean }[];
  playsLeft: number;
  aLock: boolean;
  pending: null | { type: "giveS"; target: number }; // target picks stay private until they resolve
  shoutDeadline: number | null;
  endAt: number | null;
  log: LogEntry[];
  winners: number[] | null;
  endReason: "shout" | "deck" | null;
  turnCount: number;
  startedAt: number;
  turnStartedAt: number;
  endedAt: number | null;
  version: number;
}

export interface SGPrivate {
  hand: Card[];
  notice: LogEntry | null;
  pending: null | { type: TargetKind; cardId: number } | { type: "giveS"; target: number; takenCard: Card | null };
}

export function publicView(s: SGState): SGPublic {
  let pending: SGPublic["pending"] = null;
  if (s.pending && s.pending.type === "giveS") pending = { type: "giveS", target: s.pending.target };
  return {
    cur: s.cur,
    phase: s.phase,
    deckCount: s.deck.length,
    discardCount: s.discard.length,
    discardTop: s.discard.length ? stripId(s.discard[s.discard.length - 1]) : null,
    players: s.players.map((p) => ({ handCount: p.hand.length, row: p.row.map(stripId), skip: p.skip })),
    playsLeft: s.playsLeft,
    aLock: s.aLock,
    pending,
    shoutDeadline: s.shoutDeadline,
    endAt: s.endAt,
    log: s.log.slice(-20),
    winners: s.winners,
    endReason: s.endReason,
    turnCount: s.turnCount,
    startedAt: s.startedAt,
    turnStartedAt: s.turnStartedAt,
    endedAt: s.endedAt,
    version: s.version,
  };
}

export function privateView(s: SGState, p: number): SGPrivate {
  let pending: SGPrivate["pending"] = null;
  if (s.pending && p === s.cur) {
    if (s.pending.type === "giveS") {
      const id = s.pending.takenCardId;
      pending = { type: "giveS", target: s.pending.target, takenCard: s.players[p].hand.find((c) => c.id === id) ?? null };
    } else pending = { type: s.pending.type, cardId: s.pending.cardId };
  }
  return { hand: s.players[p].hand.slice(), notice: s.notices[p], pending };
}

// ================================================================ GAME 2: ลุ้นจั่ว

export const LJ_MIN_PLAYERS = 2;
export const LJ_MAX_PLAYERS = 6;

// "stay": a STAY was flipped; the player now flips one bonus card (cannot bust), then it banks.
export type LJPhase = "flip" | "stay" | "bust" | "banked" | "end";

export interface LJEvent {
  kind: "letter" | "wild" | "go" | "stay" | "bust" | "bonus" | "bonusDiscard" | "reshuffle";
  card?: Card;
}

export interface LJState {
  game: "lunjua";
  names: string[];
  banks: Letter[][];
  deck: Card[];
  discard: Card[];
  flipped: Card[]; // cards in the flip area this turn (letters + wilds)
  cur: number;
  phase: LJPhase;
  mustFlip: number; // GO! forces more flips
  flipsThisTurn: number;
  events: LJEvent[]; // what happened this turn, for the UI
  gained: Letter[]; // letters added by the last bank
  winners: number[] | null;
  log: LogEntry[];
  turnCount: number;
  startedAt: number;
  endedAt: number | null;
}

export type LJAction = { type: "flip" } | { type: "bank" } | { type: "nextTurn" };

export function newLunjua(names: string[], rng: () => number, now: number, first = 0): LJState {
  const n = names.length;
  if (n < LJ_MIN_PLAYERS || n > LJ_MAX_PLAYERS) throw new Error("ลุ้นจั่วต้องมีผู้เล่น 2–6 คน");
  const s: LJState = {
    game: "lunjua",
    names: names.slice(),
    banks: names.map(() => []),
    deck: shuffle(makeDeck(), rng),
    discard: [],
    flipped: [],
    cur: first,
    phase: "flip",
    mustFlip: 0,
    flipsThisTurn: 0,
    events: [],
    gained: [],
    winners: null,
    log: [],
    turnCount: 0,
    startedAt: now,
    endedAt: null,
  };
  log(s, now, `เริ่มเกม! ${names[first]} เล่นก่อน`);
  return s;
}

function ljDraw(s: LJState, rng: () => number): Card {
  if (s.deck.length === 0) {
    s.deck = shuffle(s.discard, rng);
    s.discard = [];
    s.events.push({ kind: "reshuffle" });
  }
  return s.deck.shift()!;
}

const flippedLetters = (s: LJState) =>
  new Set(s.flipped.filter((c): c is Extract<Card, { k: "L" }> => c.k === "L").map((c) => c.l));

function ljBank(s: LJState, now: number) {
  const bank = s.banks[s.cur];
  const gained: Letter[] = [];
  for (const c of s.flipped) {
    if (c.k === "L" && !bank.includes(c.l) && !gained.includes(c.l)) gained.push(c.l);
  }
  bank.push(...gained);
  const wilds = s.flipped.filter((c) => c.k === "W").length;
  for (let i = 0; i < wilds; i++) {
    const miss = LETTERS.find((l) => !bank.includes(l));
    if (!miss) break;
    bank.push(miss);
    gained.push(miss);
  }
  bank.sort((a, b) => LETTERS.indexOf(a) - LETTERS.indexOf(b));
  s.discard.push(...s.flipped);
  s.flipped = [];
  s.gained = gained;
  const name = s.names[s.cur];
  log(s, now, gained.length ? `${name} เก็บ ${gained.join(" ")} (${bank.length}/6)` : `${name} หยุด แต่ไม่ได้ตัวใหม่`);
  if (bank.length === LETTERS.length) {
    s.phase = "end";
    s.winners = [s.cur];
    s.endedAt = now;
    log(s, now, `${name} ครบ STAYGO! ชนะ!`);
  } else s.phase = "banked";
}

export function applyLunjua(
  state: LJState,
  actor: number,
  action: LJAction,
  rng: () => number,
  now: number,
): Result<LJState> {
  if (state.phase === "end") return fail("เกมจบแล้ว");
  if (actor !== state.cur) return fail("ยังไม่ถึงตาคุณ");
  const s = clone(state);
  const name = s.names[s.cur];

  if (action.type === "flip" && s.phase === "stay") {
    // Bonus flip after STAY: kept if it is new (or a wild), otherwise discarded. Then bank.
    const b = ljDraw(s, rng);
    s.flipsThisTurn++;
    const keep = b.k === "W" || (b.k === "L" && !flippedLetters(s).has(b.l));
    if (keep) s.flipped.push(b);
    else s.discard.push(b);
    s.events.push({ kind: keep ? "bonus" : "bonusDiscard", card: b });
    ljBank(s, now);
    return { ok: true, state: s };
  }

  if (action.type === "flip") {
    if (s.phase !== "flip") return fail("ตอนนี้เปิดการ์ดไม่ได้");
    if (s.flipsThisTurn === 0) s.events = [];
    const c = ljDraw(s, rng);
    s.flipsThisTurn++;
    if (s.mustFlip > 0) s.mustFlip--;
    if (c.k === "L") {
      const dup = flippedLetters(s).has(c.l);
      s.flipped.push(c);
      if (dup) {
        s.events.push({ kind: "bust", card: c });
        s.phase = "bust";
        s.mustFlip = 0;
        log(s, now, `${name} เปิดได้ ${c.l} ซ้ำ — ระเบิด!`);
      } else s.events.push({ kind: "letter", card: c });
    } else if (c.k === "W") {
      s.flipped.push(c);
      s.events.push({ kind: "wild", card: c });
    } else if (c.k === "GO") {
      s.discard.push(c);
      s.mustFlip += 2;
      s.events.push({ kind: "go", card: c });
    } else {
      // STAY: stop flipping; the player flips one bonus card next (see the "stay" phase above).
      s.discard.push(c);
      s.events.push({ kind: "stay", card: c });
      s.mustFlip = 0;
      s.phase = "stay";
    }
    return { ok: true, state: s };
  }

  if (action.type === "bank") {
    if (s.phase === "stay") return fail("เปิดใบโบนัสก่อน");
    if (s.phase !== "flip") return fail("ตอนนี้หยุดไม่ได้");
    if (s.flipsThisTurn === 0) return fail("ต้องเปิดอย่างน้อย 1 ใบ");
    if (s.mustFlip > 0) return fail(`ต้องเปิดอีก ${s.mustFlip} ใบ`);
    ljBank(s, now);
    return { ok: true, state: s };
  }

  if (action.type === "nextTurn") {
    if (s.phase !== "bust" && s.phase !== "banked") return fail("ยังจบเทิร์นไม่ได้");
    s.discard.push(...s.flipped);
    s.flipped = [];
    s.cur = (s.cur + 1) % s.names.length;
    s.phase = "flip";
    s.mustFlip = 0;
    s.flipsThisTurn = 0;
    s.events = [];
    s.gained = [];
    s.turnCount++;
    return { ok: true, state: s };
  }
  return fail("ไม่รู้จักคำสั่งนี้");
}

/**
 * Chance the next flip busts, from what is visible: every card not in the flip area
 * or the discard pile is in the draw pile. If the pile is empty, the discard gets reshuffled.
 */
export function bustChance(s: LJState): number {
  if (s.phase !== "flip" || s.flipped.length === 0) return 0;
  const pool = s.deck.length ? s.deck : s.discard;
  if (!pool.length) return 0;
  const have = flippedLetters(s);
  return pool.filter((c) => c.k === "L" && have.has(c.l)).length / pool.length;
}

export function countCardsLJ(s: LJState): number {
  return s.deck.length + s.discard.length + s.flipped.length;
}

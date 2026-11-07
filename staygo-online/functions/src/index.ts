/*
 * STAYGO! online — Cloud Functions (Realtime Database).
 *
 * The engine (../../engine/engine.ts) does all rules and randomness; this file only
 * checks who is calling, loads the room in a transaction, and writes the projections:
 *   rooms/{code}/public         everyone in the room
 *   rooms/{code}/private/{uid}  that player only
 *   rooms/{code}/secret         nobody (full engine state as a JSON string)
 * The room id is its 4-letter join code.
 */
import { randomInt } from "node:crypto";
import { initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
import { onCall, HttpsError, type CallableRequest } from "firebase-functions/v2/https";
import {
  applyStaygo,
  newStaygo,
  publicView,
  privateView,
  ANYONE_ACTIONS,
  SG_MAX_PLAYERS,
  SG_MIN_PLAYERS,
  type SGAction,
  type SGState,
} from "../../engine/engine";

initializeApp();
const db = () => getDatabase();

const REGION = "asia-southeast1";
const ABSENT_MS = 30_000;
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
const opts = { region: REGION, cors: true };

type Seat = { uid: string; name: string; online?: boolean; offlineAt?: number };
type Room = {
  meta: { code: string; hostUid: string; status: "lobby" | "playing" | "ended"; createdAt: number };
  seats?: Record<string, Seat> | Seat[];
  public?: unknown;
  private?: Record<string, unknown>;
  secret?: { state: string };
};

/** crypto-backed float in [0, 1) for the engine */
const rng = () => randomInt(0, 2 ** 32) / 2 ** 32;

function uidOf(req: CallableRequest): string {
  if (!req.auth?.uid) throw new HttpsError("unauthenticated", "กรุณาเข้าสู่ระบบ");
  return req.auth.uid;
}

function cleanName(v: unknown): string {
  const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ").slice(0, 16) : "";
  if (!s) throw new HttpsError("invalid-argument", "กรุณาใส่ชื่อ");
  return s;
}

function cleanCode(v: unknown): string {
  const s = typeof v === "string" ? v.trim().toUpperCase() : "";
  if (!/^[A-Z0-9]{4}$/.test(s)) throw new HttpsError("invalid-argument", "รหัสห้องต้องมี 4 ตัว");
  return s;
}

/** RTDB may return an array or an object for numeric keys; normalise to a dense list. */
function seatList(room: Room): Seat[] {
  const raw = room.seats ?? {};
  const arr = Array.isArray(raw) ? raw : Object.keys(raw).sort((a, b) => +a - +b).map((k) => raw[k]);
  return arr.filter(Boolean);
}

/** RTDB rejects `undefined`; JSON round-trip drops it. */
const plain = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function writeProjections(room: Room, s: SGState) {
  const seats = seatList(room);
  room.public = plain(publicView(s));
  room.private = {};
  seats.forEach((seat, i) => (room.private![seat.uid] = plain(privateView(s, i))));
  room.secret = { state: JSON.stringify(s) };
  room.meta.status = s.phase === "end" ? "ended" : "playing";
}

/**
 * Runs `fn` on the whole room inside a transaction. `fn` returns an error message to abort.
 * The first transaction pass may see null from the local cache; returning null lets it retry
 * with the server value.
 */
async function withRoom<T>(code: string, fn: (room: Room) => string | null, result: (room: Room) => T): Promise<T> {
  let err: string | null = null;
  const tx = await db()
    .ref(`rooms/${code}`)
    .transaction((room: Room | null) => {
      err = null;
      if (room === null) return null;
      if (!room.meta) {
        err = "ไม่พบห้องนี้";
        return; // abort
      }
      err = fn(room);
      return err ? undefined : room;
    });
  if (err) throw new HttpsError("failed-precondition", err);
  const room = tx.snapshot.val() as Room | null;
  if (!room) throw new HttpsError("not-found", "ไม่พบห้องนี้");
  return result(room);
}

// ---------------------------------------------------------------- lobby

export const createRoom = onCall(opts, async (req) => {
  const uid = uidOf(req);
  const name = cleanName(req.data?.name);
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = Array.from({ length: 4 }, () => CODE_CHARS[randomInt(CODE_CHARS.length)]).join("");
    const tx = await db()
      .ref(`rooms/${code}`)
      .transaction((cur: Room | null) => {
        if (cur !== null) return; // taken (or stale cache: retry gives the server value)
        const room: Room = {
          meta: { code, hostUid: uid, status: "lobby", createdAt: Date.now() },
          seats: { "0": { uid, name, online: true } },
        };
        return room;
      });
    if (tx.committed) return { code, seat: 0 };
  }
  throw new HttpsError("resource-exhausted", "สร้างห้องไม่สำเร็จ ลองใหม่อีกครั้ง");
});

export const joinRoom = onCall(opts, async (req) => {
  const uid = uidOf(req);
  const code = cleanCode(req.data?.code);
  const name = cleanName(req.data?.name);
  let seat = -1;
  return withRoom(
    code,
    (room) => {
      const seats = seatList(room);
      seat = seats.findIndex((s) => s.uid === uid);
      if (seat >= 0) {
        // Rejoin (same browser). Name changes only in the lobby.
        if (room.meta.status === "lobby") seats[seat].name = name;
        seats[seat].online = true;
        room.seats = seats;
        return null;
      }
      if (room.meta.status !== "lobby") return "เกมเริ่มไปแล้ว เข้าร่วมไม่ได้";
      if (seats.length >= SG_MAX_PLAYERS) return `ห้องเต็มแล้ว (${SG_MAX_PLAYERS} คน)`;
      seats.push({ uid, name, online: true });
      seat = seats.length - 1;
      room.seats = seats;
      return null;
    },
    () => ({ code, seat }),
  );
});

export const leaveRoom = onCall(opts, async (req) => {
  const uid = uidOf(req);
  const code = cleanCode(req.data?.code);
  return withRoom(
    code,
    (room) => {
      if (room.meta.status === "playing") return "ออกจากห้องระหว่างเกมไม่ได้";
      const seats = seatList(room).filter((s) => s.uid !== uid);
      room.seats = seats;
      if (room.private) delete room.private[uid];
      if (room.meta.hostUid === uid && seats.length) room.meta.hostUid = seats[0].uid;
      if (!seats.length) room.meta.status = "ended";
      return null;
    },
    () => ({ ok: true }),
  );
});

// ---------------------------------------------------------------- game

export const gameAction = onCall(opts, async (req) => {
  const uid = uidOf(req);
  const code = cleanCode(req.data?.roomId);
  const action = req.data?.action as (SGAction | { type: "start" }) | undefined;
  if (!action || typeof action.type !== "string") throw new HttpsError("invalid-argument", "คำสั่งไม่ถูกต้อง");

  return withRoom(
    code,
    (room) => {
      const now = Date.now();
      const seats = seatList(room);
      const actor = seats.findIndex((s) => s.uid === uid);
      if (actor < 0) return "คุณไม่ได้อยู่ในห้องนี้";

      if (action.type === "start") {
        // Start from the lobby, or "เล่นอีกรอบ" after a game with the same seats.
        if (room.meta.hostUid !== uid) return "เฉพาะเจ้าของห้องเท่านั้นที่เริ่มเกมได้";
        if (room.meta.status === "playing") return "เกมกำลังเล่นอยู่";
        if (seats.length < SG_MIN_PLAYERS) return `ต้องมีผู้เล่นอย่างน้อย ${SG_MIN_PLAYERS} คน`;
        room.seats = seats;
        const s = newStaygo(seats.map((x) => x.name), rng, now, randomInt(seats.length));
        writeProjections(room, s);
        return null;
      }

      if (room.meta.status !== "playing" || !room.secret?.state) return "เกมยังไม่เริ่ม";
      const state = JSON.parse(room.secret.state) as SGState;

      if (action.type === "skipAbsent") {
        const seat = seats[state.cur];
        if (seat.online !== false) return `${seat.name} ยังออนไลน์อยู่`;
        const since = Math.max(seat.offlineAt ?? 0, state.turnStartedAt);
        if (now - since < ABSENT_MS) return "ยังไม่ครบ 30 วินาที";
      }
      if (!ANYONE_ACTIONS.has(action.type as SGAction["type"]) && actor !== state.cur) return "ยังไม่ถึงตาคุณ";

      const r = applyStaygo(state, actor, action as SGAction, rng, now);
      if (!r.ok) return r.error;
      writeProjections(room, r.state);
      return null;
    },
    (room) => ({ ok: true, version: (room.public as { version?: number } | undefined)?.version ?? 0 }),
  );
});

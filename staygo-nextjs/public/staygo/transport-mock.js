// Local test backend for developing the STAYGO! UI without Firebase.
// Only loaded on localhost with ?mock=1. Mirrors staygo-online/functions/src/index.ts:
// the same engine and the same public/private projections, kept in memory.
import {
  newStaygo,
  applyStaygo,
  publicView,
  privateView,
  ANYONE_ACTIONS,
  SG_MAX_PLAYERS,
  SG_MIN_PLAYERS,
} from "/assets/js/staygo-engine/engine.js";

const ABSENT_MS = 30_000;
const rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;
const wait = () => new Promise((r) => setTimeout(r, 60));
// Like Realtime Database: null fields, empty arrays and empty objects are not stored.
function rtdb(x) {
  if (x == null) return undefined;
  if (Array.isArray(x)) {
    const a = x.map(rtdb);
    return a.some((v) => v !== undefined) ? a : undefined;
  }
  if (typeof x === "object") {
    const o = {};
    for (const [k, v] of Object.entries(x)) {
      const r = rtdb(v);
      if (r !== undefined) o[k] = r;
    }
    return Object.keys(o).length ? o : undefined;
  }
  return x;
}
const copy = (x) => rtdb(JSON.parse(JSON.stringify(x ?? null))) ?? null;

export function createMockTransport() {
  const rooms = {};
  const listeners = new Set();
  let uid = "dev-0";
  let uidListener = null;
  const fire = () => setTimeout(() => listeners.forEach((f) => f()), 0);

  function project(room, s) {
    room.public = publicView(s);
    room.private = {};
    room.seats.forEach((seat, i) => (room.private[seat.uid] = privateView(s, i)));
    room.state = s;
    room.meta.status = s.phase === "end" ? "ended" : "playing";
  }

  const api = {
    kind: "mock",
    async init() {
      return { uid };
    },
    serverNow: () => Date.now(),
    async createRoom(name) {
      await wait();
      const code = "TEST";
      rooms[code] = {
        meta: { code, hostUid: uid, status: "lobby", createdAt: Date.now() },
        seats: [{ uid, name, online: true }],
      };
      fire();
      return { code, seat: 0 };
    },
    async joinRoom(code, name) {
      await wait();
      const room = rooms[code];
      if (!room) throw new Error("ไม่พบห้องนี้ (โหมดทดสอบ: สร้างห้องก่อน)");
      let seat = room.seats.findIndex((s) => s.uid === uid);
      if (seat < 0) {
        if (room.meta.status !== "lobby") throw new Error("เกมเริ่มไปแล้ว เข้าร่วมไม่ได้");
        if (room.seats.length >= SG_MAX_PLAYERS) throw new Error("ห้องเต็มแล้ว");
        room.seats.push({ uid, name, online: true });
        seat = room.seats.length - 1;
      }
      fire();
      return { code, seat };
    },
    async leaveRoom(code) {
      await wait();
      const room = rooms[code];
      if (!room) return;
      room.seats = room.seats.filter((s) => s.uid !== uid);
      if (room.meta.hostUid === uid && room.seats[0]) room.meta.hostUid = room.seats[0].uid;
      fire();
    },
    async action(code, action) {
      await wait();
      const room = rooms[code];
      const now = Date.now();
      const actor = room.seats.findIndex((s) => s.uid === uid);
      if (actor < 0) throw new Error("คุณไม่ได้อยู่ในห้องนี้");
      if (action.type === "start") {
        if (room.meta.hostUid !== uid) throw new Error("เฉพาะเจ้าของห้องเท่านั้นที่เริ่มเกมได้");
        if (room.meta.status === "playing") throw new Error("เกมกำลังเล่นอยู่");
        if (room.seats.length < SG_MIN_PLAYERS) throw new Error(`ต้องมีผู้เล่นอย่างน้อย ${SG_MIN_PLAYERS} คน`);
        project(room, newStaygo(room.seats.map((s) => s.name), rng, now, Math.floor(rng() * room.seats.length)));
        fire();
        return { ok: true };
      }
      if (room.meta.status !== "playing") throw new Error("เกมยังไม่เริ่ม");
      const s = room.state;
      if (action.type === "skipAbsent") {
        const seat = room.seats[s.cur];
        if (seat.online !== false) throw new Error(`${seat.name} ยังออนไลน์อยู่`);
        if (now - Math.max(seat.offlineAt || 0, s.turnStartedAt) < ABSENT_MS) throw new Error("ยังไม่ครบ 30 วินาที");
      }
      if (!ANYONE_ACTIONS.has(action.type) && actor !== s.cur) throw new Error("ยังไม่ถึงตาคุณ");
      const r = applyStaygo(s, actor, action, rng, now);
      if (!r.ok) throw new Error(r.error);
      project(room, r.state);
      fire();
      return { ok: true };
    },
    watch(code, _uid, cb) {
      const f = () => {
        const room = rooms[code];
        if (!room) return cb.meta(null);
        cb.meta(copy(room.meta));
        cb.seats(copy(room.seats));
        cb.pub(copy(room.public ?? null));
        cb.priv(copy(room.private?.[uid] ?? null));
      };
      listeners.add(f);
      f();
      return () => listeners.delete(f);
    },
    presence() {},
    stopPresence() {},

    // ---- dev-only helpers for the test bar
    dev: {
      get uid() {
        return uid;
      },
      onUidChange(fn) {
        uidListener = fn;
      },
      seats: (code) => rooms[code]?.seats ?? [],
      addPlayer(code) {
        const room = rooms[code];
        if (!room || room.meta.status !== "lobby" || room.seats.length >= SG_MAX_PLAYERS) return;
        const i = room.seats.length;
        room.seats.push({ uid: `dev-${i}`, name: ["ฟ้า", "Ploy", "Ton", "Nan"][i - 1] || `P${i}`, online: true });
        fire();
      },
      viewAs(i) {
        uid = `dev-${i}`;
        uidListener?.(uid);
        fire();
      },
      /** Gives the current player S-T-A-Y-G in their row and an O in hand, to test the shout window. */
      nearWin(code) {
        const room = rooms[code];
        const st = room?.state;
        if (!st || st.phase !== "play") return;
        const p = st.players[st.cur];
        const pool = [st.deck, st.discard, ...st.players.map((x) => x.hand), ...st.players.map((x) => x.row)];
        const grab = (l) => {
          for (const arr of pool) {
            const i = arr.findIndex((c) => c.k === "L" && c.l === l);
            if (i >= 0) return arr.splice(i, 1)[0];
          }
        };
        st.deck.push(...p.row.splice(0));
        p.row = ["S", "T", "A", "Y", "G"].map(grab);
        p.hand.push(grab("O"));
        project(room, st);
        fire();
      },
      /** Puts 9 cards in the current player's hand and asks them to discard down to 6. */
      bigHand(code) {
        const room = rooms[code];
        const st = room?.state;
        if (!st || st.phase !== "play") return;
        const p = st.players[st.cur];
        while (p.hand.length < 9 && st.deck.length) p.hand.push(st.deck.pop());
        st.pending = null;
        st.phase = "excess";
        project(room, st);
        fire();
      },
      toggleOnline(code, i) {
        const seat = rooms[code]?.seats[i];
        if (!seat) return;
        seat.online = !seat.online;
        if (!seat.online) seat.offlineAt = Date.now() - ABSENT_MS; // skip right away in tests
        fire();
      },
    },
  };
  return api;
}

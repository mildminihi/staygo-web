// Talks to the real backend: anonymous auth, Realtime Database reads, Cloud Function calls.
import { FIREBASE_CONFIG, FUNCTIONS_REGION } from "./firebase-config.js";

const V = "10.14.1";
const CDN = `https://www.gstatic.com/firebasejs/${V}`;

export function firebaseConfigured() {
  return !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.databaseURL && FIREBASE_CONFIG.projectId);
}

export async function createFirebaseTransport() {
  const [{ initializeApp }, authM, dbM, fnM] = await Promise.all([
    import(`${CDN}/firebase-app.js`),
    import(`${CDN}/firebase-auth.js`),
    import(`${CDN}/firebase-database.js`),
    import(`${CDN}/firebase-functions.js`),
  ]);
  const app = initializeApp(FIREBASE_CONFIG);
  const auth = authM.getAuth(app);
  const db = dbM.getDatabase(app);
  const fns = fnM.getFunctions(app, FUNCTIONS_REGION);
  const { ref, onValue, onDisconnect, update, serverTimestamp } = dbM;

  let offset = 0;
  onValue(ref(db, ".info/serverTimeOffset"), (s) => (offset = s.val() || 0));

  const call = async (name, data) => {
    try {
      return (await fnM.httpsCallable(fns, name)(data)).data;
    } catch (e) {
      throw new Error(e?.message || "เกิดข้อผิดพลาด ลองใหม่อีกครั้ง");
    }
  };

  let presenceOff = null;
  let presenceRef = null;

  return {
    kind: "firebase",
    async init() {
      const cred = auth.currentUser ? { user: auth.currentUser } : await authM.signInAnonymously(auth);
      return { uid: cred.user.uid };
    },
    serverNow: () => Date.now() + offset,
    createRoom: (name) => call("createRoom", { name }),
    joinRoom: (code, name) => call("joinRoom", { code, name }),
    leaveRoom: (code) => call("leaveRoom", { code }),
    action: (code, action) => call("gameAction", { roomId: code, action }),

    watch(code, uid, cb) {
      const offs = [
        onValue(ref(db, `rooms/${code}/meta`), (s) => cb.meta(s.val())),
        onValue(ref(db, `rooms/${code}/seats`), (s) => cb.seats(s.val())),
        onValue(ref(db, `rooms/${code}/public`), (s) => cb.pub(s.val())),
        onValue(ref(db, `rooms/${code}/private/${uid}`), (s) => cb.priv(s.val())),
      ];
      return () => offs.forEach((off) => off());
    },

    /** Marks this seat online, and offline (with a server timestamp) when the tab disconnects. */
    presence(code, seat) {
      this.stopPresence();
      const seatRef = ref(db, `rooms/${code}/seats/${seat}`);
      presenceRef = seatRef;
      presenceOff = onValue(ref(db, ".info/connected"), async (s) => {
        if (s.val() !== true) return;
        try {
          await onDisconnect(seatRef).update({ online: false, offlineAt: serverTimestamp() });
          await update(seatRef, { online: true });
        } catch (e) {
          console.warn("presence", e);
        }
      });
    },
    stopPresence() {
      if (presenceOff) presenceOff();
      presenceOff = null;
      // Drop the pending "offline" write, or it could later land on someone else's seat after seats shift.
      if (presenceRef) onDisconnect(presenceRef).cancel().catch(() => {});
      presenceRef = null;
    },
  };
}

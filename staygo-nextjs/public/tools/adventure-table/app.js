// โต๊ะผจญภัย: start screen and boot (rejoin after refresh, ?join= / ?screen= links).
import { S, L, $, toast, KIND, store } from "./core.js";
import { SYSTEMS } from "./data.js";
import { enterPlayer } from "./player.js";
import { enterGm } from "./gm.js";
import { enterStage } from "./stage.js";

const NAME_KEY = "staygo-live-name";

function startScreen(prefill = "") {
  S.role = null;
  document.body.classList.remove("tl-big", "at-stagemode", "at-clear");
  for (const s of ["start", "create", "player", "gm", "stage"]) $(s).hidden = s !== "start";
  $("loading").hidden = true;
  $("nameInput").value = store.get(NAME_KEY, "") || "";
  if (prefill) {
    $("codeInput").value = prefill;
    pick("player");
  }
  window.scrollTo(0, 0);
}
function pick(which) {
  $("pickGm").classList.toggle("active", which === "gm");
  $("pickPlayer").classList.toggle("active", which === "player");
  $("joinForm").hidden = which !== "player";
  $("gmForm").hidden = which !== "gm";
}
$("sysInput").innerHTML = Object.entries(SYSTEMS).map(([k, s]) => `<option value="${k}">${s.label}</option>`).join("");
$("pickGm").onclick = () => pick("gm");
$("pickPlayer").onclick = () => pick("player");
$("pickScreen").onclick = () => ($("screenForm").hidden = !$("screenForm").hidden);
for (const id of ["codeInput", "screenCode"]) $(id).oninput = (e) => (e.target.value = L.normalizeCode(e.target.value));

$("createBtn").onclick = async () => {
  $("createBtn").disabled = true;
  try {
    const code = await L.createRoom(KIND);
    await enterGm(code, startScreen, { sysKey: $("sysInput").value });
  } catch (e) {
    toast(e.message || "เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ต");
  } finally {
    $("createBtn").disabled = false;
  }
};
$("joinBtn").onclick = async () => {
  const c = L.normalizeCode($("codeInput").value);
  const name = $("nameInput").value.trim();
  if (c.length !== 4) return toast("ใส่รหัสห้อง 4 ตัว");
  if (!name) return toast("ใส่ชื่อของคุณก่อน");
  store.set(NAME_KEY, name);
  $("joinBtn").disabled = true;
  try {
    await L.joinRoom(KIND, c, name);
    enterPlayer(c, startScreen);
  } catch (e) {
    toast(e.message || "เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ต");
  } finally {
    $("joinBtn").disabled = false;
  }
};
$("screenBtn").onclick = () => {
  const c = L.normalizeCode($("screenCode").value);
  if (c.length !== 4) return toast("ใส่รหัสห้อง 4 ตัว");
  location.href = `${location.pathname}?screen=${c}${$("screenClear").checked ? "&clear=1" : ""}`;
};

(async function boot() {
  const q = new URLSearchParams(location.search);
  const joinCode = L.normalizeCode(q.get("join"));
  const screenCode = L.normalizeCode(q.get("screen"));
  try {
    await L.connect();
  } catch {
    $("loading").textContent = "เชื่อมต่อไม่ได้ ตรวจอินเทอร์เน็ตแล้วรีเฟรชหน้า";
    return;
  }
  if (screenCode.length === 4) return enterStage(screenCode, { clear: q.get("clear") === "1" });
  const s = L.loadSession(KIND);
  if (s && (!joinCode || joinCode === s.code)) {
    const meta = await L.roomMeta(s.code).catch(() => null);
    if (meta && s.role === "host" && meta.hostUid === L.uid()) return enterGm(s.code, startScreen);
    if (meta && s.role === "player" && s.name) {
      try {
        await L.joinRoom(KIND, s.code, s.name);
        return enterPlayer(s.code, startScreen);
      } catch {}
    }
    L.clearSession(KIND);
  }
  startScreen(joinCode.length === 4 ? joinCode : "");
})();

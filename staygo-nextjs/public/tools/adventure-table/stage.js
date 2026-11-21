// Display screen for a TV or a live stream: read-only, no player slot. ?screen=CODE (&clear=1 for OBS).
import { S, L, $, esc, list, sortRolls, rollLine, rollFx, put } from "./core.js";
import { partyHTML, initHTML } from "./player.js";

let unwatch = null;
let seen = null;

export function enterStage(code, { clear = false } = {}) {
  S.role = "screen";
  S.code = code;
  for (const s of ["start", "create", "player", "gm", "stage"]) $(s).hidden = s !== "stage";
  $("loading").hidden = true;
  document.body.classList.add("tl-big", "at-stagemode");
  document.body.classList.toggle("at-clear", clear);
  $("sCode").textContent = code;
  unwatch?.();
  unwatch = L.watchRoom(code, (v) => {
    S.room = v;
    if (!v?.meta) {
      put($("sParty"), `<div class="sg-panel at-stage-empty">ไม่พบห้อง ${esc(code)} หรือห้องปิดแล้ว</div>`);
      return;
    }
    render();
  });
}

function render() {
  const st = S.room.state || {};
  const sc = st.scene;
  put(
    $("sScene"),
    sc && (sc.title || sc.text || sc.img)
      ? `<div class="sg-panel at-stage-scenecard">${sc.img ? `<img src="${esc(sc.img)}" alt="" />` : ""}<div><b>${esc(sc.title || "")}</b>${sc.text ? `<p>${esc(sc.text)}</p>` : ""}</div></div>`
      : "",
  );
  const { heroesHtml, mons } = partyHTML();
  put($("sParty"), heroesHtml || `<div class="sg-panel at-stage-empty">รอผู้เล่นสร้างตัวละคร…</div>`);
  put($("sInit"), initHTML(st.init));
  put($("sMons"), mons ? `<div class="sg-panel tl-stack"><b>👾 ศัตรู</b>${mons}</div>` : "");
  const rolls = sortRolls(S.room.rolls);
  const ids = new Set(rolls.map((r) => r.id));
  if (seen === null) seen = ids;
  else {
    const fresh = rolls.filter((r) => !seen.has(r.id));
    seen = ids;
    if (fresh.length) rollFx(fresh[0]);
  }
  put($("sLog"), rolls.slice(0, 6).map(rollLine).join(""));
}

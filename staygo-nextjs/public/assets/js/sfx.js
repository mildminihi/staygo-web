/* STAYGO sound effects — synthesized with WebAudio (no files to load).
 * Classic script: exposes window.SFX so both module and inline scripts can use it.
 *   SFX.play("win")   or the shortcut SFX.win()
 *   SFX.tone(880, 160) a plain beep (used by live-room.js beep())
 *   SFX.muted / SFX.setMuted(bool) / SFX.toggle()  — remembered in localStorage
 * A small 🔊 button is added to the page (bottom-left). Pages can opt out with
 * <body data-sfx-toggle="off"> or move it with SFX.mountToggle(container, beforeEl?).
 * Every <button> gets a soft click unless it (or an ancestor) has data-sfx="off",
 * or the page sets SFX.autoClick = false.
 */
(function () {
  if (window.SFX) return;
  var KEY = "staygo-sfx-muted";
  var muted = false;
  try { muted = localStorage.getItem(KEY) === "1"; } catch (e) {}

  var ctx = null, master = null, noiseBuf = null;
  function ac() {
    if (ctx) return ctx;
    var C = window.AudioContext || window.webkitAudioContext;
    if (!C) return null;
    ctx = new C();
    master = ctx.createGain();
    master.gain.value = 0.55;
    var comp = ctx.createDynamicsCompressor();
    master.connect(comp);
    comp.connect(ctx.destination);
    return ctx;
  }
  function ready() {
    if (muted) return null;
    var c = ac();
    if (!c) return null;
    if (c.state === "suspended") c.resume();
    return c;
  }
  function unlock() {
    var c = ac();
    if (c && c.state === "suspended") c.resume();
  }
  ["pointerdown", "keydown", "touchstart"].forEach(function (ev) {
    window.addEventListener(ev, unlock, { capture: true, passive: true });
  });

  // ---------------------------------------------------------------- primitives
  // tone(freq, dur, {type, vol, at, to (slide target freq), attack})
  function tone(freq, dur, o) {
    var c = ready();
    if (!c) return;
    o = o || {};
    var t = c.currentTime + (o.at || 0);
    var osc = c.createOscillator();
    var g = c.createGain();
    osc.type = o.type || "sine";
    osc.frequency.setValueAtTime(freq, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    var v = o.vol == null ? 0.3 : o.vol;
    var a = o.attack || 0.005;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }
  function noise(dur, o) {
    var c = ready();
    if (!c) return;
    o = o || {};
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      var d = noiseBuf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    var t = c.currentTime + (o.at || 0);
    var src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    var f = c.createBiquadFilter();
    f.type = o.filter || "lowpass";
    f.frequency.setValueAtTime(o.freq || 1200, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    f.Q.value = o.q || 1;
    var g = c.createGain();
    var v = o.vol == null ? 0.3 : o.vol;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
  function seq(notes, step, o) {
    notes.forEach(function (n, i) {
      if (n) tone(n, (o && o.len) || step * 1.6, Object.assign({}, o, { at: ((o && o.at) || 0) + i * step }));
    });
  }

  // ---------------------------------------------------------------- sound bank
  var N = { C4: 262, D4: 294, E4: 330, F4: 349, G4: 392, A4: 440, B4: 494, C5: 523, D5: 587, E5: 659, F5: 698, G5: 784, A5: 880, B5: 988, C6: 1047, E6: 1319, G6: 1568 };
  var S = {
    // UI
    click: function () { tone(1400, 0.035, { type: "triangle", vol: 0.12 }); },
    tap: function () { tone(900, 0.05, { type: "sine", vol: 0.2, to: 700 }); },
    select: function () { tone(660, 0.06, { type: "triangle", vol: 0.2 }); tone(990, 0.08, { type: "triangle", vol: 0.18, at: 0.04 }); },
    back: function () { tone(700, 0.08, { type: "triangle", vol: 0.18, to: 420 }); },
    toggle: function () { tone(1200, 0.04, { type: "square", vol: 0.06 }); },
    type: function () { tone(1800 + Math.random() * 400, 0.025, { type: "square", vol: 0.05 }); },
    erase: function () { noise(0.12, { filter: "bandpass", freq: 2500, to: 900, vol: 0.18 }); },
    pop: function () { tone(500, 0.09, { type: "sine", vol: 0.35, to: 1100 }); },
    // cards & board
    flip: function () { noise(0.07, { filter: "bandpass", freq: 3000, to: 1500, vol: 0.3, q: 0.8 }); tone(300, 0.05, { type: "triangle", vol: 0.1, at: 0.03 }); },
    deal: function () { noise(0.12, { filter: "highpass", freq: 1500, to: 4000, vol: 0.22 }); tone(500, 0.04, { type: "triangle", vol: 0.12, at: 0.1 }); },
    shuffle: function () { for (var i = 0; i < 7; i++) noise(0.05, { filter: "bandpass", freq: 2500 + Math.random() * 1500, vol: 0.18, at: i * 0.055 }); },
    place: function () { tone(180, 0.09, { type: "sine", vol: 0.4, to: 90 }); noise(0.04, { freq: 900, vol: 0.12 }); },
    move: function () { tone(520, 0.05, { type: "triangle", vol: 0.16 }); tone(780, 0.05, { type: "triangle", vol: 0.12, at: 0.05 }); },
    reveal: function () { seq([N.C6, N.E6, N.G6], 0.05, { type: "sine", vol: 0.14, len: 0.25 }); noise(0.3, { filter: "highpass", freq: 6000, vol: 0.06 }); },
    // dice
    dice: function () {
      for (var i = 0; i < 6; i++) {
        var at = i * 0.06 + Math.random() * 0.02;
        noise(0.035, { filter: "bandpass", freq: 1800 + Math.random() * 1600, q: 3, vol: 0.32, at: at });
        tone(200 + Math.random() * 200, 0.03, { type: "triangle", vol: 0.12, at: at });
      }
    },
    land: function () { tone(160, 0.12, { type: "sine", vol: 0.4, to: 80 }); noise(0.05, { freq: 1500, vol: 0.15 }); },
    // scoring
    coin: function () { tone(N.B5, 0.07, { type: "square", vol: 0.1 }); tone(N.E6, 0.25, { type: "square", vol: 0.1, at: 0.07 }); },
    point: function () { tone(N.E5, 0.08, { type: "triangle", vol: 0.25 }); tone(N.A5, 0.14, { type: "triangle", vol: 0.25, at: 0.07 }); },
    minus: function () { tone(N.E4, 0.1, { type: "triangle", vol: 0.25 }); tone(N.C4, 0.16, { type: "triangle", vol: 0.25, at: 0.08 }); },
    correct: function () { seq([N.C5, N.E5, N.G5], 0.07, { type: "triangle", vol: 0.26, len: 0.16 }); },
    wrong: function () { tone(220, 0.14, { type: "sawtooth", vol: 0.14 }); tone(160, 0.26, { type: "sawtooth", vol: 0.14, at: 0.13 }); },
    combo: function (n) { var f = 500 * Math.pow(1.12, Math.min(n || 1, 12)); tone(f, 0.08, { type: "square", vol: 0.1 }); tone(f * 1.5, 0.12, { type: "square", vol: 0.1, at: 0.06 }); },
    match: function () { tone(N.G5, 0.08, { type: "sine", vol: 0.3 }); tone(N.C6, 0.2, { type: "sine", vol: 0.3, at: 0.07 }); },
    levelup: function () { seq([N.C5, N.E5, N.G5, N.C6, N.E6], 0.06, { type: "square", vol: 0.1, len: 0.12 }); },
    win: function () {
      seq([N.C5, N.E5, N.G5], 0.11, { type: "triangle", vol: 0.28, len: 0.15 });
      tone(N.C6, 0.6, { type: "triangle", vol: 0.28, at: 0.33 });
      tone(N.E5, 0.6, { type: "sine", vol: 0.16, at: 0.33 });
      tone(N.G5, 0.6, { type: "sine", vol: 0.16, at: 0.33 });
    },
    lose: function () { seq([N.G4, N.F4, N.E4], 0.18, { type: "triangle", vol: 0.24, len: 0.2 }); tone(N.C4 * 0.98, 0.7, { type: "triangle", vol: 0.24, at: 0.54, to: 240 }); },
    fanfare: function () {
      seq([N.G4, N.C5, N.E5, N.G5], 0.09, { type: "square", vol: 0.1, len: 0.12 });
      seq([N.E5, N.G5], 0.16, { type: "square", vol: 0.1, len: 0.2, at: 0.4 });
      tone(N.C6, 0.8, { type: "square", vol: 0.1, at: 0.74 });
      tone(N.G5, 0.8, { type: "triangle", vol: 0.18, at: 0.74 });
      noise(0.9, { filter: "highpass", freq: 7000, vol: 0.05, at: 0.74 });
    },
    // time
    tick: function () { tone(1600, 0.025, { type: "square", vol: 0.08 }); },
    tock: function () { tone(1000, 0.03, { type: "square", vol: 0.08 }); },
    count: function () { tone(N.A5, 0.12, { type: "sine", vol: 0.3 }); },
    go: function () { tone(N.A5 * 2, 0.35, { type: "sine", vol: 0.32 }); tone(N.E6, 0.35, { type: "triangle", vol: 0.12 }); },
    timeup: function () { for (var i = 0; i < 3; i++) { tone(880, 0.16, { type: "square", vol: 0.13, at: i * 0.24 }); tone(660, 0.12, { type: "square", vol: 0.1, at: i * 0.24 + 0.1 }); } },
    alarm: function () { for (var i = 0; i < 4; i++) { tone(1000, 0.1, { type: "square", vol: 0.13, at: i * 0.2 }); tone(1000, 0.1, { type: "square", vol: 0.13, at: i * 0.2 + 0.1 }); } },
    // party / live rooms
    buzz: function () { tone(140, 0.45, { type: "sawtooth", vol: 0.22 }); tone(147, 0.45, { type: "square", vol: 0.12 }); },
    ding: function () { tone(N.E6, 0.9, { type: "sine", vol: 0.3 }); tone(N.E6 * 2.01, 0.5, { type: "sine", vol: 0.08 }); },
    turn: function () { tone(N.G5, 0.12, { type: "sine", vol: 0.28 }); tone(N.D5 * 2, 0.25, { type: "sine", vol: 0.28, at: 0.12 }); },
    notify: function () { tone(N.C6, 0.08, { type: "sine", vol: 0.22 }); tone(N.G5, 0.18, { type: "sine", vol: 0.22, at: 0.08 }); },
    join: function () { tone(600, 0.09, { type: "sine", vol: 0.25, to: 900 }); tone(1200, 0.12, { type: "sine", vol: 0.18, at: 0.08 }); },
    leave: function () { tone(900, 0.12, { type: "sine", vol: 0.2, to: 500 }); },
    vote: function () { tone(400, 0.05, { type: "square", vol: 0.1 }); tone(800, 0.08, { type: "triangle", vol: 0.2, at: 0.04 }); },
    whoosh: function () { noise(0.35, { filter: "bandpass", freq: 400, to: 3000, vol: 0.25, q: 1.5, attack: 0.1 }); },
    drumroll: function (dur) { dur = dur || 1.2; for (var t = 0; t < dur; t += 0.045) noise(0.04, { filter: "bandpass", freq: 900, q: 1, vol: 0.12 + 0.12 * (t / dur), at: t }); },
    spin: function () { tone(1200 + Math.random() * 200, 0.02, { type: "triangle", vol: 0.1 }); },
    sparkle: function () { for (var i = 0; i < 6; i++) tone(1800 + Math.random() * 1600, 0.12, { type: "sine", vol: 0.09, at: i * 0.05 }); },
    // action
    hit: function () { noise(0.1, { freq: 2000, to: 300, vol: 0.4 }); tone(150, 0.1, { type: "square", vol: 0.15, to: 60 }); },
    crit: function () { noise(0.16, { freq: 4000, to: 400, vol: 0.45 }); tone(300, 0.2, { type: "sawtooth", vol: 0.15, to: 60 }); tone(N.E6, 0.15, { type: "square", vol: 0.08, at: 0.03 }); },
    hurt: function () { tone(300, 0.2, { type: "sawtooth", vol: 0.18, to: 100 }); },
    block: function () { tone(900, 0.06, { type: "square", vol: 0.1 }); noise(0.08, { filter: "bandpass", freq: 3000, vol: 0.2 }); },
    heal: function () { seq([N.C5, N.E5, N.G5, N.C6], 0.05, { type: "sine", vol: 0.18, len: 0.2 }); },
    bounce: function (v) { var s = Math.min(1, v == null ? 0.6 : v); tone(260 + 300 * s, 0.07, { type: "sine", vol: 0.12 + 0.25 * s, to: 140 }); },
    bumper: function () { tone(700, 0.09, { type: "square", vol: 0.12, to: 1400 }); tone(1400, 0.06, { type: "sine", vol: 0.15, at: 0.03 }); },
    explode: function () { noise(0.7, { freq: 1800, to: 60, vol: 0.55 }); tone(90, 0.5, { type: "sine", vol: 0.45, to: 30 }); },
    break: function () { for (var i = 0; i < 4; i++) noise(0.06, { filter: "bandpass", freq: 3000 + Math.random() * 3000, q: 4, vol: 0.25, at: i * 0.03 }); tone(180, 0.15, { type: "square", vol: 0.12, to: 60 }); },
    charge: function () { tone(200, 0.4, { type: "sawtooth", vol: 0.1, to: 900 }); },
    shoot: function () { tone(1200, 0.15, { type: "square", vol: 0.1, to: 200 }); noise(0.08, { filter: "highpass", freq: 3000, vol: 0.12 }); },
    powerup: function () { for (var i = 0; i < 8; i++) tone(400 + i * 120, 0.06, { type: "square", vol: 0.08, at: i * 0.035 }); },
    gacha: function () { S.drumroll(0.9); setTimeout(function () { S.sparkle(); S.reveal(); }, 900); },
    drain: function () { tone(500, 0.6, { type: "triangle", vol: 0.25, to: 70 }); },
  };

  // ---------------------------------------------------------------- public api
  var last = {};
  var SFX = {
    autoClick: true,
    get muted() { return muted; },
    setMuted: function (m) {
      muted = !!m;
      try { localStorage.setItem(KEY, muted ? "1" : "0"); } catch (e) {}
      syncToggle();
    },
    toggle: function () { SFX.setMuted(!muted); if (!muted) S.select(); },
    // play(name, arg) — repeated calls of the same sound within `gap` ms are dropped
    play: function (name, arg, gap) {
      var fn = S[name];
      if (!fn || muted) return;
      var now = Date.now();
      if (gap && last[name] && now - last[name] < gap) return;
      last[name] = now;
      try { fn(arg); } catch (e) {}
    },
    tone: function (freq, ms, type, vol) { try { tone(freq, (ms || 160) / 1000, { type: type || "sine", vol: vol == null ? 0.25 : vol }); } catch (e) {} },
    noise: function (ms, o) { try { noise((ms || 100) / 1000, o); } catch (e) {} },
    vibrate: function (p) { if (!muted) try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} },
    names: Object.keys(S),
    mountToggle: mountToggle,
  };
  // shortcuts SFX.win() etc. — never shadow the API itself (e.g. the "toggle" sound vs SFX.toggle)
  Object.keys(S).forEach(function (k) {
    if (!(k in SFX)) SFX[k] = function (a) { SFX.play(k, a); };
  });
  window.SFX = SFX;

  // soft click on buttons
  document.addEventListener("pointerdown", function (e) {
    if (!SFX.autoClick || muted || e.button > 0) return;
    var el = e.target.closest && e.target.closest("button, [role=button], .btn, .sg-btn, input[type=checkbox], input[type=radio], select, summary");
    if (!el || el.disabled || el.closest("[data-sfx=off]")) return;
    S.click();
  }, true);

  // ---------------------------------------------------------------- toggle button
  var btn = null;
  function syncToggle() {
    if (!btn) return;
    btn.textContent = muted ? "🔇" : "🔊";
    btn.setAttribute("aria-pressed", muted ? "true" : "false");
    btn.title = muted ? "เปิดเสียง" : "ปิดเสียง";
    btn.setAttribute("aria-label", btn.title);
  }
  function mountToggle(parent, before) {
    if (!btn) {
      btn = document.createElement("button");
      btn.type = "button";
      btn.className = "sfx-toggle";
      btn.setAttribute("data-sfx", "off");
      btn.addEventListener("click", function (e) { e.stopPropagation(); SFX.toggle(); });
      var st = document.createElement("style");
      st.textContent =
        ".sfx-toggle{position:fixed;left:12px;bottom:12px;z-index:9000;width:42px;height:42px;border-radius:50%;" +
        "border:2.5px solid #1d1b2e;background:#fff;box-shadow:3px 3px 0 #1d1b2e;font-size:19px;line-height:1;cursor:pointer;" +
        "display:grid;place-items:center;padding:0;opacity:.85;transition:transform .1s}" +
        ".sfx-toggle:hover{opacity:1}.sfx-toggle:active{transform:translate(2px,2px);box-shadow:1px 1px 0 #1d1b2e}" +
        ".sfx-toggle.inline{position:static;box-shadow:2px 2px 0 #1d1b2e;width:36px;height:36px;font-size:16px}" +
        "@media print{.sfx-toggle{display:none}}";
      document.head.appendChild(st);
    }
    btn.classList.toggle("inline", !!parent);
    if (parent && before) parent.insertBefore(btn, before);
    else (parent || document.body).appendChild(btn);
    syncToggle();
    return btn;
  }
  function autoMount() {
    if (document.body.getAttribute("data-sfx-toggle") === "off" || btn) return;
    mountToggle();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", autoMount);
  else autoMount();
})();

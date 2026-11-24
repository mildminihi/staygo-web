// แม่ฝากซื้อ — shop for Mom against the clock, hunt the deals, keep the change.
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var SFX = window.SFX || { play: function () {} };
  var I18N = window.STAYGO_I18N;
  var reduceMotion = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- data ----------
  var ITEMS = {
    egg: { th: "ไข่ไก่", emo: "🥚", unit: "แผง", base: 110, cat: "grocery", kg: 1.8 },
    rice: { th: "ข้าวสาร", emo: "🍚", unit: "ถุง", base: 165, cat: "grocery", kg: 5 },
    milk: { th: "นมสด", emo: "🥛", unit: "กล่อง", base: 25, cat: "grocery", kg: 1 },
    fishsauce: { th: "น้ำปลา", emo: "🫙", unit: "ขวด", base: 32, cat: "grocery", kg: 0.8 },
    oil: { th: "น้ำมันพืช", emo: "🛢️", unit: "ขวด", base: 55, cat: "grocery", kg: 1 },
    noodle: { th: "บะหมี่กึ่งสำเร็จรูป", emo: "🍜", unit: "แพ็ค", base: 30, cat: "grocery", kg: 0.5 },
    pork: { th: "หมูสับ", emo: "🥩", unit: "ถุง", base: 75, cat: "meat", kg: 0.5 },
    chicken: { th: "อกไก่", emo: "🍗", unit: "แพ็ค", base: 69, cat: "meat", kg: 0.6 },
    fish: { th: "ปลาทู", emo: "🐟", unit: "เข่ง", base: 45, cat: "meat", kg: 0.6 },
    shrimp: { th: "กุ้ง", emo: "🦐", unit: "ถุง", base: 120, cat: "meat", kg: 0.5 },
    morning: { th: "ผักบุ้ง", emo: "🥬", unit: "กำ", base: 15, cat: "veg", kg: 0.3 },
    cabbage: { th: "กะหล่ำปลี", emo: "🥗", unit: "หัว", base: 30, cat: "veg", kg: 1 },
    tomato: { th: "มะเขือเทศ", emo: "🍅", unit: "ถุง", base: 25, cat: "veg", kg: 0.5 },
    garlic: { th: "กระเทียม", emo: "🧄", unit: "ถุง", base: 35, cat: "veg", kg: 0.3 },
    chili: { th: "พริก", emo: "🌶️", unit: "ถุง", base: 20, cat: "veg", kg: 0.1 },
    banana: { th: "กล้วยหอม", emo: "🍌", unit: "หวี", base: 40, cat: "veg", kg: 1.2 },
    tofu: { th: "เต้าหู้", emo: "🧈", unit: "ถุง", base: 15, cat: "veg", kg: 0.3 },
    soap: { th: "สบู่", emo: "🧼", unit: "ก้อน", base: 20, cat: "home", kg: 0.1 },
    tissue: { th: "ทิชชู่", emo: "🧻", unit: "แพ็ค", base: 89, cat: "home", kg: 1.5 },
  };
  var ITEM_IDS = Object.keys(ITEMS);

  // x/y are % positions on the map; lo/hi is the price personality of the shop
  var SHOPS = [
    { id: "veg", th: "แผงผักป้าแดง", emo: "🥬", x: 16, y: 24, cats: ["veg"], lo: 0.8, hi: 1.1, deals: [0, 1, 1], stock: [2, 5], keeper: { face: "👵" } },
    { id: "meat", th: "เขียงหมูลุงชัย", emo: "🐷", x: 47, y: 13, cats: ["meat"], lo: 0.82, hi: 1.12, deals: [0, 1, 1], stock: [2, 5], keeper: { face: "👴" } },
    { id: "fresh", th: "แผงสดน้าเล็ก", emo: "🧺", x: 50, y: 45, cats: ["veg", "meat"], lo: 0.9, hi: 1.2, deals: [1, 1, 2], stock: [1, 4], keeper: { face: "👩" } },
    { id: "chow", th: "ร้านโชห่วยเจ๊หมวย", emo: "🏠", x: 18, y: 64, cats: ["grocery", "home", "veg"], lo: 0.95, hi: 1.2, deals: [0, 1, 1], stock: [2, 5] },
    { id: "mini", th: "มินิมาร์ท 24 ชม.", emo: "🏪", x: 82, y: 66, cats: ["grocery", "home", "meat"], lo: 1.05, hi: 1.35, deals: [1, 2, 2], stock: [3, 6] },
    { id: "super", th: "ซูเปอร์มาร์เก็ต", emo: "🛒", x: 84, y: 17, cats: ["grocery", "home", "meat", "veg"], lo: 0.88, hi: 1.15, deals: [1, 2, 2], stock: [3, 7] },
  ];
  var HOME = { x: 50, y: 88 };
  var WEEK = ["วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์", "วันอาทิตย์"];

  var MODES = {
    normal: { th: "🛒 ปกติ", days: 3, timeAdj: 0, budget: 1.12, deplete: 7, call: [false, true, true], barg: 1.1 },
    hard: { th: "🔥 ยาก", days: 3, timeAdj: -15, budget: 1.04, roundTo: 10, deplete: 4, call: [true, true, true], barg: 0.75, extraItem: 1 },
    endless: { th: "♾️ ไม่รู้จบ", days: Infinity, timeAdj: 0, budget: 1.1, deplete: 6, barg: 1 },
    daily: { th: "📅 โจทย์ประจำวัน", days: 3, timeAdj: 0, budget: 1.12, deplete: 7, call: [false, true, true], barg: 1.1 },
  };
  var NORMAL_DAYS = [
    { wd: 0, items: 4, time: 80, flash: 1 },
    { wd: 2, items: 5, time: 80, flash: 1 },
    { wd: 5, items: 6, time: 85, flash: 2 },
  ];

  // joy is the happiness score one treat gives; stock is how many the shop has per visit
  var TREATS = [
    { id: "candy", th: "ลูกอม", emo: "🍬", price: 5, joy: 4, stock: 4 },
    { id: "juice", th: "น้ำหวาน", emo: "🧃", price: 12, joy: 10, stock: 3 },
    { id: "icecream", th: "ไอติม", emo: "🍦", price: 15, joy: 12, stock: 3 },
    { id: "chips", th: "ขนมถุง", emo: "🍿", price: 20, joy: 16, stock: 3 },
    { id: "choco", th: "ช็อกโกแลต", emo: "🍫", price: 25, joy: 20, stock: 2 },
    { id: "card", th: "การ์ดสะสม", emo: "🃏", price: 35, joy: 28, stock: 3 },
    { id: "ball", th: "ลูกบอล", emo: "⚽", price: 59, joy: 47, stock: 1 },
    { id: "car", th: "รถของเล่น", emo: "🚗", price: 99, joy: 79, stock: 1 },
    { id: "teddy", th: "ตุ๊กตา", emo: "🧸", price: 149, joy: 119, stock: 1 },
  ];
  // collect every treat in a set (over the whole game) for a one-time bonus
  var SETS = [
    { id: "sweet", th: "ชุดของหวาน", emo: "🍬", items: ["candy", "icecream", "choco"], bonus: 25 },
    { id: "cartoon", th: "ชุดดูการ์ตูน", emo: "📺", items: ["chips", "juice", "card"], bonus: 30 },
    { id: "play", th: "ชุดวันหยุดสุดมันส์", emo: "⚽", items: ["ball", "car"], bonus: 60 },
    { id: "gift", th: "ชุดของขวัญวันเกิด", emo: "🎁", items: ["teddy", "choco", "icecream"], bonus: 70 },
    { id: "all", th: "สะสมครบทุกอย่าง", emo: "🌈", items: ["candy", "juice", "icecream", "chips", "choco", "card", "ball", "car", "teddy"], bonus: 150 },
  ];
  var COMBO_STEP = 0.25; // each repeat of the same treat in one visit: ×1, ×1.25, ×1.5, ×1.75
  var HELPERS = [
    { id: "bike", th: "จักรยาน", emo: "🚲", price: 120, desc: "เดินเร็วขึ้น 30%" },
    { id: "bag", th: "ถุงผ้าใบใหญ่", emo: "👜", price: 60, desc: "แบกได้ 14 กก. (ปกติ 8)" },
    { id: "app", th: "แอปเช็กโปร", emo: "📱", price: 50, desc: "เห็นโปรทุกร้านก่อนออกจากบ้าน" },
  ];

  var LATE_PENALTY = 20, MISS_RATE = 1.5, FLASH_PCT = 40, FLASH_SEC = 15, BASE_CAP = 8, BIG_CAP = 14;
  var NAME_KEY = "staygo-market-run-name";
  function boardKey(m) { return m === "normal" ? "staygo-market-run-scores" : "staygo-market-run-scores-" + m; }

  // ---------- randomness (seeded so the daily challenge is the same market for everyone) ----------
  function makeRng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rnd(r, a, b) { return a + r() * (b - a); }
  function rint(r, a, b) { return Math.floor(rnd(r, a, b + 1)); }
  function pick(r, a) { return a[Math.floor(r() * a.length)]; }
  function shuffle(r, a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function todayKey() {
    var d = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    return d.replace(/-/g, "");
  }

  // ---------- helpers ----------
  function baht(n) { return "฿" + Math.round(n).toLocaleString("en-US"); }
  function kg(n) { return (Math.round(n * 10) / 10).toFixed(1); }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function span(text, cls) { return el("span", cls, text); }
  function shopById(id) { for (var i = 0; i < SHOPS.length; i++) if (SHOPS[i].id === id) return SHOPS[i]; }
  function show(id) {
    ["scrStart", "scrBrief", "scrPlay", "scrRound", "scrTreats", "scrFinal"].forEach(function (s) { $(s).hidden = s !== id; });
    document.body.classList.toggle("mr-playing", id === "scrPlay");
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }
  function loadJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function isEn() { return !!(I18N && I18N.lang === "en"); }

  // ---------- game state ----------
  var G = null; // whole game
  var R = null; // current round
  var mode = "normal";

  function newGame() {
    var M = MODES[mode];
    var seed = mode === "daily" ? hashStr("market-run-" + todayKey()) : (Math.random() * 4294967296) >>> 0;
    G = { mode: mode, M: M, seed: seed, date: mode === "daily" ? todayKey() : null, day: 0, earned: 0, gearSpent: 0, treatSpent: 0, joy: 0, owned: {}, sets: {}, pocket: 0, days: [], bag: [], gear: {}, strikes: 0, saved: false };
    startBrief();
  }
  // score = money kept + happiness from treats (helpers and treats both cost money)
  function score() { return G.pocket + G.joy; }
  function pts(n) { return Math.round(n).toLocaleString("en-US") + " แต้ม"; }

  function dayConfig(d) {
    var M = G.M, c;
    if (G.mode === "endless") {
      c = { wd: d % 7, items: Math.min(4 + d, 9), time: 80 + Math.min(d * 3, 15), flash: 1 + (d >= 2 ? 1 : 0) + (d >= 5 ? 1 : 0), call: d >= 1 };
      c.deplete = Math.max(3, 7 - d * 0.5);
      c.barg = Math.max(0.6, 1.1 - d * 0.06);
    } else {
      var n = NORMAL_DAYS[d];
      c = { wd: n.wd, items: n.items + (M.extraItem || 0), time: n.time + M.timeAdj, flash: n.flash, call: M.call[d], deplete: M.deplete, barg: M.barg };
    }
    c.th = WEEK[c.wd];
    c.budget = M.budget;
    c.roundTo = M.roundTo || 50;
    return c;
  }

  function makeRound(cfg) {
    var base = (G.seed + G.day * 7919) >>> 0;
    var rm = makeRng(base), re = makeRng(base + 1), rd = makeRng(base + 2);

    // shopping list
    var ids = shuffle(rm, ITEM_IDS).slice(0, cfg.items);
    var list = ids.map(function (id) {
      var r = rm();
      return { id: id, need: ITEMS[id].base > 100 ? 1 : r < 0.55 ? 1 : r < 0.85 ? 2 : 3 };
    });
    var est = list.reduce(function (s, l) { return s + ITEMS[l.id].base * l.need; }, 0);
    var budget = Math.ceil((est * cfg.budget) / cfg.roundTo) * cfg.roundTo;

    // what each shop stocks today (every item, so Mom can add things later), its price and how many
    var shops = {};
    SHOPS.forEach(function (s) {
      var mood = rnd(rm, s.lo, s.hi);
      var prices = {}, stock = {};
      ITEM_IDS.forEach(function (id) {
        if (s.cats.indexOf(ITEMS[id].cat) < 0) return;
        if (rm() >= (s.id === "super" ? 0.8 : 0.6)) return;
        prices[id] = Math.max(5, Math.round(ITEMS[id].base * mood * rnd(rm, 0.9, 1.1)));
        stock[id] = rint(rm, s.stock[0], s.stock[1]);
      });
      shops[s.id] = { prices: prices, stock: stock, deals: [], mult: 1 };
    });
    // every list item: at least 2 sellers and enough stock overall
    list.forEach(function (l) {
      var sellers = SHOPS.filter(function (s) { return shops[s.id].prices[l.id] != null; });
      var able = shuffle(rm, SHOPS.filter(function (s) { return s.cats.indexOf(ITEMS[l.id].cat) >= 0 && shops[s.id].prices[l.id] == null; }));
      while (sellers.length < 2 && able.length) {
        var s = able.pop();
        shops[s.id].prices[l.id] = Math.round(ITEMS[l.id].base * rnd(rm, s.lo, s.hi));
        shops[s.id].stock[l.id] = rint(rm, s.stock[0], s.stock[1]);
        sellers.push(s);
      }
      var total = sellers.reduce(function (t, x) { return t + shops[x.id].stock[l.id]; }, 0);
      while (total < l.need + 2) { shops[pick(rm, sellers).id].stock[l.id]++; total++; }
    });
    // deals, on things that are on the list
    SHOPS.forEach(function (s) {
      var sh = shops[s.id];
      var carried = list.map(function (l) { return l.id; }).filter(function (id) { return sh.prices[id] != null; });
      var n = pick(rm, s.deals);
      for (var k = 0; k < n && carried.length; k++) {
        var r = rm();
        if (r < 0.2 && !sh.deals.some(function (d) { return d.type === "all"; })) sh.deals.push({ type: "all", pct: pick(rm, [10, 15]) });
        else {
          var id = pick(rm, carried);
          if (sh.deals.some(function (d) { return d.item === id; })) continue;
          if (r < 0.42) sh.deals.push({ type: "b2g1", item: id });
          else sh.deals.push({ type: "pct", item: id, pct: pick(rm, [10, 20, 20, 30, 30, 40]) });
        }
      }
    });

    // flash sales spread over the trip
    var flashes = [];
    var slot = 0.6 / cfg.flash;
    for (var f = 0; f < cfg.flash; f++) {
      var l = pick(rm, list);
      var sellers = SHOPS.filter(function (s) { return shops[s.id].prices[l.id] != null; });
      flashes.push({ at: Math.round(cfg.time * rnd(rm, 0.2 + f * slot, 0.2 + (f + 0.7) * slot)), shop: pick(rm, sellers).id, item: l.id, done: false });
    }
    // Mom calls once, somewhere in the middle of the trip
    var call = cfg.call ? { at: Math.round(cfg.time * rnd(rm, 0.3, 0.6)), done: false } : null;

    var all = [];
    SHOPS.forEach(function (s) { shops[s.id].deals.forEach(function (d) { all.push({ shop: s.id, deal: d }); }); });

    return {
      cfg: cfg, list: list, budget: budget, extraMoney: 0, wallet: budget, shops: shops, flashes: flashes, call: call,
      flyer: G.gear.app ? all : shuffle(rm, all).slice(0, 2),
      have: {}, ledger: {}, known: {}, barg: {},
      re: re, rd: rd,
      timeLeft: cfg.time, at: null, walking: false, inShop: null, flash: null,
      rain: 0, neighborDone: false, depleteAcc: 0, crowdAcc: 0,
      late: false, over: false, bonusCoupons: 0,
    };
  }

  // ---------- pricing & stock ----------
  function dealsFor(shopId, itemId) {
    return R.shops[shopId].deals.filter(function (d) { return d.type === "all" || d.item === itemId; });
  }
  function bestPct(shopId, itemId, withFlash) {
    var pct = 0;
    dealsFor(shopId, itemId).forEach(function (d) { if (d.pct && d.pct > pct) pct = d.pct; });
    if (withFlash && R.flash && R.flash.shop === shopId && R.flash.item === itemId && FLASH_PCT > pct) pct = FLASH_PCT;
    return pct;
  }
  function hasB2g1(shopId, itemId) { return R.shops[shopId].deals.some(function (d) { return d.type === "b2g1" && d.item === itemId; }); }
  function unitPrice(shopId, itemId, withFlash) {
    return Math.round(R.shops[shopId].prices[itemId] * R.shops[shopId].mult * (1 - bestPct(shopId, itemId, withFlash !== false) / 100));
  }
  function boughtHere(shopId, itemId) { return ((R.ledger[shopId] || {})[itemId] || []).length; }
  function nextPrice(shopId, itemId) {
    if (hasB2g1(shopId, itemId) && (boughtHere(shopId, itemId) + 1) % 3 === 0) return 0;
    return unitPrice(shopId, itemId);
  }
  function stockOf(shopId, itemId) { return R.shops[shopId].stock[itemId] || 0; }
  function totalStock(itemId) { return SHOPS.reduce(function (t, s) { return t + stockOf(s.id, itemId); }, 0); }
  function listEntry(id) { for (var i = 0; i < R.list.length; i++) if (R.list[i].id === id) return R.list[i]; return null; }
  function need(id) { var l = listEntry(id); return l ? l.need : 0; }
  function have(id) { return R.have[id] || 0; }
  // another shopper may take one only while the item can still be finished somewhere
  function canTake(itemId) { return totalStock(itemId) - 1 >= Math.max(0, need(itemId) - have(itemId)) + 1; }

  function dealLabel(d) {
    var w = document.createDocumentFragment();
    if (d.type === "all") w.appendChild(span("ทั้งร้านลด " + d.pct + "%"));
    else {
      var it = ITEMS[d.item];
      w.appendChild(span(it.emo + " "));
      w.appendChild(span(it.th));
      w.appendChild(span(" · "));
      w.appendChild(span(d.type === "b2g1" ? "ซื้อ 2 แถม 1" : "ลด " + d.pct + "%"));
    }
    return w;
  }

  // ---------- weight & walking speed ----------
  function load() { return R.list.reduce(function (t, l) { return t + have(l.id) * ITEMS[l.id].kg; }, 0); }
  function cap() { return G.gear.bag ? BIG_CAP : BASE_CAP; }
  function slowFactor() { return 1 + 0.6 * Math.min(load() / cap(), 1.5); }
  function dist(a, b) { var dx = a.x - b.x, dy = (a.y - b.y) * 0.75; return Math.sqrt(dx * dx + dy * dy); }
  function posOf(id) { return id === "home" ? HOME : shopById(id); }
  function travelSec(from, to) {
    var t = (0.5 + (dist(posOf(from), posOf(to)) / 100) * 4.2) * slowFactor();
    if (G.gear.bike) t *= 0.7;
    if (R.rain > 0) t *= 1.4;
    return t;
  }

  // ---------- brief ----------
  function strikesNode(box) {
    box.innerHTML = "";
    if (G.mode !== "endless") { box.hidden = true; return; }
    box.hidden = false;
    box.appendChild(span("แม่โกรธ"));
    box.appendChild(span(" " + "😠".repeat(Math.min(G.strikes, 3)) + "🙂".repeat(Math.max(0, 3 - G.strikes)) + " "));
    box.appendChild(span("(โกรธครบ 3 ครั้งจบเกม)", "tl-hint"));
  }

  function startBrief() {
    var cfg = dayConfig(G.day);
    R = makeRound(cfg);
    $("briefDay").textContent = cfg.th;
    $("briefDayNo").textContent = G.mode === "endless" ? "#" + (G.day + 1) : "(" + (G.day + 1) + "/" + G.M.days + ")";
    strikesNode($("briefStrikes"));
    $("briefBudget").textContent = baht(R.budget);
    $("briefTime").textContent = cfg.time;
    var ul = $("briefList");
    ul.innerHTML = "";
    R.list.forEach(function (l) {
      var it = ITEMS[l.id];
      var li = el("li");
      li.appendChild(span(it.emo, "mr-emo"));
      li.appendChild(span(it.th, "mr-name"));
      if (it.kg >= 1.5) li.appendChild(span("🏋️", "mr-heavy"));
      li.appendChild(span("×" + l.need, "mr-qty"));
      li.appendChild(span(it.unit, "mr-unit"));
      ul.appendChild(li);
    });
    $("flyerTitle").textContent = G.gear.app ? "📱 แอปเช็กโปร: โปรทุกร้านวันนี้" : "📰 ใบปลิววันนี้";
    var fl = $("briefFlyer");
    fl.innerHTML = "";
    if (!R.flyer.length) fl.appendChild(el("li", "tl-hint", "วันนี้ไม่มีโปรในใบปลิว"));
    R.flyer.forEach(function (f) {
      var s = shopById(f.shop);
      var li = el("li");
      li.appendChild(span(s.emo + " "));
      li.appendChild(el("b", null, s.th));
      li.appendChild(span(" — "));
      li.appendChild(dealLabel(f.deal));
      fl.appendChild(li);
    });
    var gear = $("briefGear");
    gear.innerHTML = "";
    var owned = HELPERS.filter(function (h) { return G.gear[h.id]; });
    gear.hidden = !owned.length;
    owned.forEach(function (h) { var c = el("span", "mr-chip"); c.appendChild(span(h.emo + " ")); c.appendChild(span(h.th)); gear.appendChild(c); });
    show("scrBrief");
    SFX.play("deal");
  }

  // ---------- play ----------
  var timer = null, lastTick = 0, lastBeep = -1;

  function buildMap() {
    var map = $("map");
    map.querySelectorAll(".mr-spot").forEach(function (n) { n.remove(); });
    SHOPS.forEach(function (s) {
      var b = el("button", "mr-spot");
      b.style.left = s.x + "%";
      b.style.top = s.y + "%";
      b.dataset.shop = s.id;
      b.appendChild(span(s.emo, "mr-spotemo"));
      b.appendChild(span(s.th, "mr-spotname"));
      b.appendChild(span("", "mr-spottag"));
      if (s.keeper) b.appendChild(span("🤏", "mr-spotbarg"));
      b.addEventListener("click", function () { goTo(s.id); });
      map.appendChild(b);
    });
    var h = el("div", "mr-spot mr-home");
    h.style.left = HOME.x + "%";
    h.style.top = HOME.y + "%";
    h.appendChild(span("🏡", "mr-spotemo"));
    h.appendChild(span("บ้าน", "mr-spotname"));
    map.appendChild(h);
  }

  function startPlay() {
    R.at = "home";
    placeAvatar(HOME, true);
    buildMap();
    $("hudDay").textContent = R.cfg.th;
    $("flash").hidden = true;
    $("toasts").innerHTML = "";
    $("mapView").hidden = false;
    $("shopView").hidden = true;
    $("map").classList.remove("raining");
    show("scrPlay");
    renderAll();
    SFX.play("go");
    lastTick = performance.now();
    lastBeep = -1;
    clearInterval(timer);
    timer = setInterval(tick, 100);
  }

  function tick() {
    if (R.over) return;
    var now = performance.now();
    var dt = (now - lastTick) / 1000;
    lastTick = now;
    if (document.hidden) return; // the clock pauses while the tab is in the background
    R.timeLeft = Math.max(0, R.timeLeft - dt);
    var elapsed = R.cfg.time - R.timeLeft;

    R.flashes.forEach(function (f) { if (!f.done && elapsed >= f.at) { f.done = true; startFlash(f); } });
    if (R.flash) {
      R.flash.left -= dt;
      if (R.flash.left <= 0) endFlash();
      else renderFlash();
    }
    if (R.call && !R.call.done && elapsed >= R.call.at) { R.call.done = true; momCalls(); }
    if (R.rain > 0) { R.rain -= dt; if (R.rain <= 0) { $("map").classList.remove("raining"); renderMap(); } }
    deplete(dt);

    var sec = Math.ceil(R.timeLeft);
    if (sec <= 10 && sec !== lastBeep && sec > 0) { lastBeep = sec; SFX.play(sec <= 5 ? "tock" : "tick"); }
    renderHud();
    if (R.timeLeft <= 0) timeUp();
  }

  // other shoppers keep buying things
  function deplete(dt) {
    var changed = false;
    R.depleteAcc += dt;
    if (R.depleteAcc >= R.cfg.deplete) {
      R.depleteAcc = 0;
      var opts = [];
      SHOPS.forEach(function (s) {
        R.list.forEach(function (l) { if (stockOf(s.id, l.id) > 0 && canTake(l.id)) opts.push([s.id, l.id]); });
      });
      if (opts.length) { var o = pick(R.rd, opts); R.shops[o[0]].stock[o[1]]--; changed = true; }
    }
    if (R.flash) {
      R.crowdAcc += dt;
      if (R.crowdAcc >= 2.5) {
        R.crowdAcc = 0;
        if (stockOf(R.flash.shop, R.flash.item) > 0 && canTake(R.flash.item)) { R.shops[R.flash.shop].stock[R.flash.item]--; changed = true; }
      }
    }
    if (changed && R.inShop) renderShop();
  }

  function startFlash(f) {
    R.flash = { shop: f.shop, item: f.item, left: FLASH_SEC };
    R.crowdAcc = 0;
    SFX.play("alarm");
    renderFlash();
    renderAll();
  }
  function endFlash() {
    R.flash = null;
    $("flash").hidden = true;
    renderAll();
  }
  function renderFlash() {
    var box = $("flash"), f = R.flash, s = shopById(f.shop), it = ITEMS[f.item];
    var key = f.shop + f.item;
    if (box.dataset.key !== key || box.hidden) {
      box.dataset.key = key;
      box.innerHTML = "";
      box.appendChild(span("📣 แฟลชเซล!", "mr-flashtag"));
      box.appendChild(span(s.emo + " "));
      box.appendChild(el("b", null, s.th));
      box.appendChild(span(" "));
      box.appendChild(span(it.emo + " "));
      box.appendChild(span(it.th));
      box.appendChild(span(" "));
      box.appendChild(el("b", null, "ลด " + FLASH_PCT + "%"));
      box.appendChild(span("", "mr-flashleft"));
      box.hidden = false;
    }
    box.querySelector(".mr-flashleft").textContent = Math.ceil(f.left) + "s";
  }

  // ---------- toasts & events ----------
  function toast(text, kind, ms) {
    var t = el("div", "mr-toast " + (kind || ""), text);
    $("toasts").appendChild(t);
    setTimeout(function () { t.classList.add("out"); setTimeout(function () { t.remove(); }, 300); }, ms || 4500);
    return t;
  }

  function momCalls() {
    var r = R.re;
    var cancelable = R.list.filter(function (l) { return !l.side && have(l.id) < l.need; });
    var addable = ITEM_IDS.filter(function (id) {
      return !listEntry(id) && ITEMS[id].base <= 60 && SHOPS.some(function (s) { return stockOf(s.id, id) >= 2; });
    });
    SFX.play("turn");
    if (addable.length && (r() < 0.6 || cancelable.length < 2)) {
      var id = pick(r, addable), it = ITEMS[id];
      var money = Math.round(it.base * 1.15);
      R.list.push({ id: id, need: 1, fresh: true });
      R.wallet += money;
      R.extraMoney += money;
      toast("📞 แม่: ซื้อ" + it.th + "เพิ่ม 1 " + it.unit + " นะลูก แม่โอนให้อีก " + baht(money), "call", 7000);
    } else if (cancelable.length) {
      var l = pick(r, cancelable), it2 = ITEMS[l.id];
      if (have(l.id) > 0) l.need = have(l.id);
      else R.list.splice(R.list.indexOf(l), 1);
      toast("📞 แม่: ไม่ต้องซื้อ" + it2.th + "แล้วนะลูก", "call", 7000);
    }
    renderAll();
    setTimeout(function () { R.list.forEach(function (x) { x.fresh = false; }); if (!R.over) renderNote(); }, 4000);
  }

  function walkEvent() {
    if (R.timeLeft < 10) return;
    var r = R.re;
    if (r() > 0.25) return;
    var opts = ["friend", "coupon"];
    if (R.rain <= 0) opts.push("rain", "rain");
    if (!R.neighborDone && G.day >= 1) opts.push("neighbor", "neighbor");
    var ev = pick(r, opts);
    if (ev === "rain") {
      R.rain = 18;
      $("map").classList.add("raining");
      SFX.play("whoosh");
      toast("🌧️ ฝนตก! เดินช้าลงสักพัก", "rain");
    } else if (ev === "friend") {
      var lose = G.mode === "hard" ? 4 : 3;
      R.timeLeft = Math.max(0, R.timeLeft - lose);
      SFX.play("notify");
      toast("👋 เจอเพื่อนชวนคุย เสียเวลา " + lose + " วิ", "bad");
    } else if (ev === "coupon") {
      R.wallet += 10;
      R.bonusCoupons += 10;
      SFX.play("coin");
      toast("🎟️ เจอคูปองส่วนลด ฿10", "good");
    } else neighborAsks();
    renderHud();
  }

  function neighborAsks() {
    R.neighborDone = true;
    var r = R.re;
    var opts = ITEM_IDS.filter(function (id) { return !listEntry(id) && SHOPS.some(function (s) { return stockOf(s.id, id) >= 2; }); });
    if (!opts.length) return;
    var id = pick(r, opts), it = ITEMS[id];
    var advance = Math.round(it.base * 1.15), reward = 25 + G.day * 5;
    SFX.play("notify");
    var box = el("div", "mr-toast ask");
    box.appendChild(span("👵 ป้าข้างบ้าน: ฝากซื้อ" + it.th + " 1 " + it.unit + " ได้ไหม ป้าให้เงิน " + baht(advance) + " ซื้อมาให้ได้ค่าขนม " + baht(reward)));
    var row = el("div", "mr-askrow");
    var yes = el("button", "sg-btn small blue", "รับฝาก");
    var no = el("button", "sg-btn small", "ไม่รับ");
    row.appendChild(yes);
    row.appendChild(no);
    box.appendChild(row);
    $("toasts").appendChild(box);
    var closed = false;
    function close() { if (closed) return; closed = true; box.classList.add("out"); setTimeout(function () { box.remove(); }, 300); }
    yes.addEventListener("click", function () {
      if (closed || R.over) return;
      R.list.push({ id: id, need: 1, side: true, advance: advance, reward: reward, fresh: true });
      R.wallet += advance;
      SFX.play("select");
      close();
      renderAll();
    });
    no.addEventListener("click", function () { SFX.play("back"); close(); });
    setTimeout(close, 9000);
  }

  // ---------- walking ----------
  function placeAvatar(p, instant, sec) {
    var a = $("avatar");
    a.style.transition = instant || reduceMotion ? "none" : "left " + sec + "s linear, top " + sec + "s linear";
    a.style.left = p.x + "%";
    a.style.top = p.y + "%";
  }

  var walkTimer = null, stepTimer = null;
  function walk(to, then) {
    if (R.walking || R.over) return;
    if (R.at === to) { then(); return; }
    stopBargain();
    var sec = travelSec(R.at, to);
    R.walking = true;
    R.inShop = null;
    $("shopView").hidden = true;
    $("mapView").hidden = false;
    $("avatar").classList.add("walking");
    renderMap();
    placeAvatar(posOf(to), false, sec);
    SFX.play("whoosh");
    clearInterval(stepTimer);
    stepTimer = setInterval(function () { SFX.play("tap"); }, load() > cap() ? 520 : 380);
    clearTimeout(walkTimer);
    walkTimer = setTimeout(function () {
      clearInterval(stepTimer);
      $("avatar").classList.remove("walking");
      R.walking = false;
      R.at = to;
      if (!R.over) then();
    }, sec * 1000);
    walkEvent();
  }

  function goTo(shopId) {
    if (R.walking || R.over) return;
    SFX.play("click");
    walk(shopId, function () { enterShop(shopId); });
  }

  function enterShop(id) {
    R.inShop = id;
    var first = !R.known[id];
    R.known[id] = true;
    SFX.play(first ? "ding" : "notify");
    $("mapView").hidden = true;
    $("shopView").hidden = false;
    renderAll();
  }

  function leaveShop() {
    SFX.play("back");
    stopBargain();
    R.inShop = null;
    $("shopView").hidden = true;
    $("mapView").hidden = false;
    renderAll();
  }

  function buy(shopId, itemId) {
    if (R.over || R.walking || barg) return;
    if (stockOf(shopId, itemId) <= 0) { SFX.play("wrong"); return; }
    var p = nextPrice(shopId, itemId);
    if (p > R.wallet) { SFX.play("wrong"); flashWallet(); return; }
    R.wallet -= p;
    R.shops[shopId].stock[itemId]--;
    R.have[itemId] = have(itemId) + 1;
    R.ledger[shopId] = R.ledger[shopId] || {};
    (R.ledger[shopId][itemId] = R.ledger[shopId][itemId] || []).push(p);
    SFX.play(p === 0 ? "sparkle" : "coin");
    if (have(itemId) === need(itemId)) setTimeout(function () { SFX.play("correct"); }, 120);
    renderAll();
  }

  function unbuy(shopId, itemId) {
    if (R.over || R.walking || barg) return;
    var arr = (R.ledger[shopId] || {})[itemId];
    if (!arr || !arr.length) return;
    R.wallet += arr.pop();
    R.shops[shopId].stock[itemId]++;
    R.have[itemId] = have(itemId) - 1;
    SFX.play("back");
    renderAll();
  }

  function flashWallet() {
    var w = $("hudWallet");
    w.classList.remove("mr-shake");
    void w.offsetWidth;
    w.classList.add("mr-shake");
  }

  function goHome() {
    if (R.walking || R.over) return;
    var missing = R.list.filter(function (l) { return have(l.id) < l.need; });
    if (missing.length && !confirm("ยังซื้อไม่ครบ จะกลับบ้านเลยไหม?")) return;
    SFX.play("click");
    walk("home", function () { endRound(false); });
  }

  function timeUp() {
    if (R.over) return;
    R.late = R.at !== "home" || R.walking;
    SFX.play("timeup");
    endRound(R.late);
  }

  // ---------- bargaining ----------
  var barg = null; // { shop, good:[a,b], great:[a,b], start, period, raf, pos, done }
  function startBargain() {
    var id = R.inShop, s = shopById(id);
    if (!s || !s.keeper || R.barg[id] || barg || R.over) return;
    var mid = rnd(R.re, 0.3, 0.7), gw = 0.3, rw = 0.09;
    barg = { shop: id, good: [mid - gw / 2, mid + gw / 2], great: [mid - rw / 2, mid + rw / 2], start: performance.now(), period: R.cfg.barg * 1000, pos: 0 };
    $("bargFace").textContent = s.keeper.face;
    var say = $("bargSay");
    say.innerHTML = "";
    say.appendChild(span("ลดหน่อยได้ไหม~ กดหยุดให้ตรงโซนเขียว!"));
    $("bargGood").style.left = barg.good[0] * 100 + "%";
    $("bargGood").style.width = gw * 100 + "%";
    $("bargGreat").style.left = barg.great[0] * 100 + "%";
    $("bargGreat").style.width = rw * 100 + "%";
    $("bargain").hidden = false;
    $("bargStop").disabled = false;
    SFX.play("select");
    renderShop();
    (function frame() {
      if (!barg || barg.done) return;
      var t = ((performance.now() - barg.start) / barg.period) % 2;
      barg.pos = t < 1 ? t : 2 - t;
      $("bargNeedle").style.left = barg.pos * 100 + "%";
      barg.raf = requestAnimationFrame(frame);
    })();
  }
  function stopNeedle() {
    if (!barg || barg.done) return;
    barg.done = true;
    cancelAnimationFrame(barg.raf);
    var p = barg.pos, id = barg.shop, s = shopById(id), res, line, face = s.keeper.face;
    if (p >= barg.great[0] && p <= barg.great[1]) { res = { kind: "great", mult: 0.75 }; line = "โอ๊ย ปากหวานจริง ลดให้ทั้งร้าน 25% เลย!"; SFX.play("levelup"); }
    else if (p >= barg.good[0] && p <= barg.good[1]) { res = { kind: "good", mult: 0.88 }; line = "เอาไป ลดให้ทั้งร้าน 12%"; SFX.play("correct"); }
    else { res = { kind: "fail", mult: 1.1 }; line = "ไม่ลด! ต่อมากขึ้นราคาอีก 10% เลย"; face = "😤"; SFX.play("wrong"); }
    R.barg[id] = res;
    R.shops[id].mult = res.mult;
    $("bargFace").textContent = face;
    var say = $("bargSay");
    say.innerHTML = "";
    say.appendChild(span(line));
    $("bargStop").disabled = true;
    var b = barg;
    setTimeout(function () { if (barg === b) { stopBargain(); if (!R.over && R.inShop) renderShop(); } }, 1300);
    renderNote();
  }
  function stopBargain() {
    if (barg) cancelAnimationFrame(barg.raf);
    barg = null;
    $("bargain").hidden = true;
  }

  // ---------- render ----------
  function renderAll() { renderHud(); renderMap(); renderShop(); renderNote(); }

  function renderHud() {
    var t = Math.ceil(R.timeLeft);
    $("hudTime").textContent = t + "s";
    $("hudTime").parentNode.classList.toggle("mr-hurry", t <= 10);
    $("hudWallet").textContent = baht(R.wallet);
    var done = R.list.filter(function (l) { return have(l.id) >= l.need; }).length;
    $("hudDone").textContent = done + "/" + R.list.length;
    var over = load() > cap();
    $("hudLoad").textContent = (over ? "🐢" : "") + kg(load()) + "/" + cap() + "kg";
    $("hudLoadBox").classList.toggle("mr-heavyload", over);
  }

  function renderMap() {
    document.querySelectorAll("#map .mr-spot[data-shop]").forEach(function (b) {
      var id = b.dataset.shop;
      b.disabled = R.walking || R.over;
      b.classList.toggle("here", R.at === id && !R.walking);
      b.classList.toggle("seen", !!R.known[id]);
      b.classList.toggle("flashing", !!(R.flash && R.flash.shop === id));
      var bg = b.querySelector(".mr-spotbarg");
      if (bg) bg.textContent = R.barg[id] ? (R.barg[id].kind === "fail" ? "😤" : "🤝") : "🤏";
      var tag = b.querySelector(".mr-spottag");
      var sec = R.at && R.at !== id ? Math.round(travelSec(R.at, id) * 10) / 10 : null;
      tag.textContent = R.flash && R.flash.shop === id ? "-" + FLASH_PCT + "%" : sec != null && !R.walking ? sec + "s" : "";
    });
    $("homeBtn").disabled = R.walking || R.over;
    $("avatar").classList.toggle("heavy", load() > cap());
    $("mapHint").textContent = R.walking ? "กำลังเดิน…" : load() > cap() ? "ของหนักเกิน เดินช้าลง 🐢" : "กดร้านเพื่อเดินไป";
  }

  function renderShop() {
    var id = R.inShop;
    if (!id) return;
    var s = shopById(id), data = R.shops[id];
    $("shopEmo").textContent = s.emo;
    $("shopName").textContent = s.th;
    var sells = R.list.some(function (l) { return data.prices[l.id] != null; });
    $("bargBtn").hidden = !s.keeper || !sells || !!R.barg[id] || !!barg;
    var note = $("bargNote");
    note.innerHTML = "";
    note.hidden = !R.barg[id] || !!barg;
    if (R.barg[id]) {
      var k = R.barg[id].kind;
      note.className = "mr-bargnote " + k;
      note.appendChild(span(k === "great" ? "🤝 ต่อราคาได้ ทั้งร้านลด 25%" : k === "good" ? "🤝 ต่อราคาได้ ทั้งร้านลด 12%" : "😤 ต่อไม่สำเร็จ ทั้งร้านแพงขึ้น 10%"));
    }

    var dl = $("shopDeals");
    dl.innerHTML = "";
    var deals = data.deals.slice();
    if (R.flash && R.flash.shop === id) deals.unshift({ type: "flash", item: R.flash.item });
    if (!deals.length) dl.appendChild(span("วันนี้ร้านนี้ไม่มีโปร", "tl-hint"));
    deals.forEach(function (d) {
      var c = el("span", "mr-deal" + (d.type === "flash" ? " hot" : ""));
      if (d.type === "flash") { c.appendChild(span("📣 " + ITEMS[d.item].emo + " ")); c.appendChild(span(ITEMS[d.item].th)); c.appendChild(span(" · ")); c.appendChild(span("ลด " + FLASH_PCT + "%")); }
      else { c.appendChild(span("🏷️ ")); c.appendChild(dealLabel(d)); }
      dl.appendChild(c);
    });

    var box = $("shopItems");
    box.innerHTML = "";
    var ids = R.list.map(function (l) { return l.id; }).filter(function (i) { return data.prices[i] != null; });
    if (!ids.length) box.appendChild(el("p", "tl-hint", "ร้านนี้ไม่มีของในลิสต์วันนี้เลย"));
    ids.forEach(function (iid) {
      var it = ITEMS[iid], full = data.prices[iid], now = nextPrice(id, iid), pct = bestPct(id, iid, true), st = stockOf(id, iid);
      var row = el("div", "mr-item" + (have(iid) >= need(iid) ? " done" : "") + (st <= 0 ? " out" : ""));
      var info = el("div", "mr-iteminfo");
      info.appendChild(span(it.emo, "mr-emo"));
      var nm = el("div", "mr-itemname");
      nm.appendChild(span(it.th, "mr-name"));
      var sub = el("small");
      sub.appendChild(span("มี " + have(iid) + "/" + need(iid)));
      sub.appendChild(span(" "));
      sub.appendChild(span(it.unit));
      sub.appendChild(span(" · "));
      sub.appendChild(span(st <= 0 ? "หมด" : "เหลือ " + st, st <= 1 ? "mr-low" : ""));
      nm.appendChild(sub);
      info.appendChild(nm);
      row.appendChild(info);

      var price = el("div", "mr-price");
      if (now === 0) price.appendChild(el("b", "mr-free", "ฟรี!"));
      else price.appendChild(el("b", now > full ? "mr-up" : null, baht(now)));
      if (now < full) price.appendChild(el("s", null, baht(full)));
      if (pct) price.appendChild(el("em", null, "-" + pct + "%"));
      else if (hasB2g1(id, iid) && now !== 0) price.appendChild(el("em", null, "2+1"));
      row.appendChild(price);

      var ctl = el("div", "mr-ctl");
      var minus = el("button", "sg-btn small", "−");
      minus.setAttribute("aria-label", "คืน");
      minus.disabled = !boughtHere(id, iid) || !!barg;
      minus.addEventListener("click", function () { unbuy(id, iid); });
      var n = span(String(boughtHere(id, iid)), "mr-count");
      var plus = el("button", "sg-btn small blue", "+");
      plus.setAttribute("aria-label", "ซื้อ");
      plus.disabled = now > R.wallet || st <= 0 || !!barg;
      plus.addEventListener("click", function () { buy(id, iid); });
      ctl.appendChild(minus);
      ctl.appendChild(n);
      ctl.appendChild(plus);
      row.appendChild(ctl);
      box.appendChild(row);
    });
  }

  function renderNote() {
    var ul = $("noteList");
    ul.innerHTML = "";
    R.list.forEach(function (l) {
      var it = ITEMS[l.id], h = have(l.id);
      var li = el("li", (h >= l.need ? "done" : h > 0 ? "part" : "") + (l.fresh ? " fresh" : ""));
      var top = el("div", "mr-notetop");
      top.appendChild(span(h >= l.need ? "✅" : it.emo, "mr-emo"));
      top.appendChild(span(it.th, "mr-name"));
      if (l.side) top.appendChild(span("ป้าฝาก", "mr-sidetag"));
      top.appendChild(span(h + "/" + l.need, "mr-qty"));
      li.appendChild(top);
      var best = null;
      SHOPS.forEach(function (s) {
        if (!R.known[s.id] || R.shops[s.id].prices[l.id] == null) return;
        var p = unitPrice(s.id, l.id, false);
        if (!best || p < best.p) best = { p: p, s: s, b2: hasB2g1(s.id, l.id) };
      });
      var sub = el("small", "mr-notesub");
      if (best) {
        sub.appendChild(span("ถูกสุดที่เห็น "));
        sub.appendChild(el("b", null, baht(best.p)));
        sub.appendChild(span(" " + best.s.emo + " "));
        sub.appendChild(span(best.s.th));
        if (best.b2) sub.appendChild(span(" (2+1)"));
      } else sub.appendChild(span("ยังไม่เห็นราคา"));
      li.appendChild(sub);
      ul.appendChild(li);
    });
  }

  // ---------- round end ----------
  function endRound(late) {
    R.over = true;
    clearInterval(timer);
    clearTimeout(walkTimer);
    clearInterval(stepTimer);
    stopBargain();
    $("avatar").classList.remove("walking");
    $("flash").hidden = true;
    $("toasts").innerHTML = "";

    var advances = R.list.reduce(function (t, l) { return t + (l.side ? l.advance : 0); }, 0);
    var gave = R.budget + R.extraMoney;
    var spent = gave + R.bonusCoupons + advances - R.wallet;
    var missing = [], miss = 0, sideReward = 0, sideMiss = null;
    R.list.forEach(function (l) {
      var k = l.need - have(l.id);
      if (l.side) {
        if (k <= 0) sideReward += l.reward;
        else { sideMiss = l; miss += l.advance + 10; }
        return;
      }
      if (k > 0) { var p = k * Math.round(ITEMS[l.id].base * MISS_RATE); miss += p; missing.push({ id: l.id, k: k, p: p }); }
    });
    var extra = R.list.reduce(function (s, l) { return s + Math.max(0, have(l.id) - l.need); }, 0);
    var bonus = !late && !missing.length ? Math.floor(R.timeLeft / 2) : 0;
    var latePen = late ? LATE_PENALTY : 0;
    var pocket = Math.max(0, R.wallet - miss - latePen) + bonus + sideReward;
    var angry = late || missing.length > 0;

    G.days.push({ day: R.cfg.th, pocket: pocket, perfect: !angry });
    G.earned += pocket;
    G.pocket += pocket;
    if (angry && G.mode === "endless") G.strikes++;

    var t = $("roundTable");
    t.innerHTML = "";
    function row(label, val, cls, extraNode) {
      var tr = el("tr", cls || "");
      var th = el("th");
      th.appendChild(span(label));
      if (extraNode) th.appendChild(extraNode);
      tr.appendChild(th);
      tr.appendChild(el("td", null, val));
      t.appendChild(tr);
    }
    function itemNode(id, k) {
      var w = el("span");
      w.appendChild(span(" " + ITEMS[id].emo + " "));
      w.appendChild(span(ITEMS[id].th));
      if (k) w.appendChild(span(" ×" + k));
      return w;
    }
    row("เงินที่แม่ให้", baht(R.budget));
    if (R.extraMoney) row("แม่โอนเพิ่ม", "+" + baht(R.extraMoney));
    if (R.bonusCoupons) row("คูปองที่เจอ", "+" + baht(R.bonusCoupons));
    R.list.forEach(function (l) { if (l.side) row("เงินป้าข้างบ้าน", "+" + baht(l.advance), "", itemNode(l.id)); });
    row("ใช้ไป", "−" + baht(spent));
    row("เงินทอน", baht(R.wallet), "sub");
    missing.forEach(function (m) { row("ลืมซื้อ", "−" + baht(m.p), "bad", itemNode(m.id, m.k)); });
    if (sideMiss) row("คืนเงินป้า + ขอโทษ", "−" + baht(sideMiss.advance + 10), "bad", itemNode(sideMiss.id));
    if (extra) row("ซื้อเกิน (" + extra + " ชิ้น)", "—", "muted");
    if (late) row("กลับไม่ทัน", "−" + baht(latePen), "bad");
    if (bonus) row("โบนัสเวลา (" + Math.floor(R.timeLeft) + " วิ)", "+" + baht(bonus), "good");
    if (sideReward) row("ค่าขนมจากป้า", "+" + baht(sideReward), "good");
    $("roundPocket").textContent = baht(pocket);

    var say = $("roundSay");
    say.innerHTML = "";
    var face, line;
    if (late) { face = "😠"; line = "ทำไมกลับช้าจัง! แม่รอตั้งนาน"; }
    else if (missing.length) { face = "😤"; line = "ลืมซื้ออะไรไปหรือเปล่าลูก แม่ต้องไปซื้อเองอีกรอบ"; }
    else if (R.wallet >= gave * 0.2) { face = "🥰"; line = "เก่งมากลูก! ครบทุกอย่างแถมประหยัดสุดๆ"; }
    else { face = "😊"; line = "ครบทุกอย่างเลย ขอบใจนะลูก"; }
    $("roundFace").textContent = face;
    say.appendChild(span(line));
    strikesNode($("roundStrikes"));
    $("toTreats").textContent = "ไปร้านขนม 🍭";

    setTimeout(function () {
      show("scrRound");
      SFX.play(angry ? "lose" : "fanfare");
    }, late ? 600 : 250);
  }

  function gameOver() { return G.mode === "endless" ? G.strikes >= 3 : G.day + 1 >= G.M.days; }

  // ---------- treat shop ----------
  var visit = {}; // per-visit treat stock and repeat counter
  function openTreats() {
    visit = { left: {}, bought: {}, news: [] };
    TREATS.forEach(function (t) { visit.left[t.id] = t.stock; visit.bought[t.id] = 0; });
    SFX.play("select");
    renderTreats();
    $("nextDay").textContent = gameOver() ? "ดูคะแนนรวม 🏆" : "วันต่อไป ▶";
    show("scrTreats");
  }
  function comboMult(t) { return 1 + COMBO_STEP * visit.bought[t.id]; }
  function nextJoy(t) { return Math.round(t.joy * comboMult(t)); }
  function buyTreat(t) {
    if (t.price > G.pocket || visit.left[t.id] <= 0) return;
    var j = nextJoy(t);
    G.pocket -= t.price;
    G.treatSpent += t.price;
    G.joy += j;
    G.owned[t.id] = (G.owned[t.id] || 0) + 1;
    visit.left[t.id]--;
    visit.bought[t.id]++;
    G.bag.push(t.emo);
    var done = SETS.filter(function (st) { return !G.sets[st.id] && st.items.every(function (id) { return G.owned[id]; }); });
    done.forEach(function (st) { G.sets[st.id] = true; G.joy += st.bonus; });
    visit.news = done;
    SFX.play(visit.bought[t.id] > 1 ? "combo" : "pop", visit.bought[t.id]);
    if (done.length) setTimeout(function () { SFX.play("fanfare"); }, 150);
    renderTreats();
  }
  function renderTreats() {
    $("treatWallet").textContent = baht(G.pocket);
    $("treatSaved").textContent = baht(G.pocket);
    $("treatJoy").textContent = "💖" + G.joy;
    $("treatScore").textContent = pts(score());
    var box = $("treatList");
    box.innerHTML = "";
    TREATS.forEach(function (t) {
      var left = visit.left[t.id], n = visit.bought[t.id];
      var b = el("button", "mr-treat" + (n ? " combo" : ""));
      b.disabled = t.price > G.pocket || left <= 0;
      if (G.owned[t.id]) b.appendChild(span("×" + G.owned[t.id], "mr-owned"));
      b.appendChild(span(t.emo, "mr-treatemo"));
      b.appendChild(span(t.th, "mr-treatname"));
      b.appendChild(el("b", null, baht(t.price)));
      b.appendChild(span(left <= 0 ? "หมด" : "+" + nextJoy(t) + "💖" + (n ? " ×" + comboMult(t) : ""), "mr-joy"));
      b.appendChild(span(left > 0 ? "เหลือ " + left : "", "mr-treatleft"));
      b.addEventListener("click", function () { buyTreat(t); });
      box.appendChild(b);
    });
    var sb = $("setList");
    sb.innerHTML = "";
    SETS.forEach(function (st) {
      var row = el("div", "mr-set" + (G.sets[st.id] ? " done" : "") + (visit.news.indexOf(st) >= 0 ? " new" : ""));
      row.appendChild(span(st.emo, "mr-setemo"));
      var mid = el("div", "mr-setmid");
      mid.appendChild(el("b", null, st.th));
      var icons = el("span", "mr-seticons");
      st.items.forEach(function (id) {
        var t = TREATS.filter(function (x) { return x.id === id; })[0];
        icons.appendChild(span(t.emo, G.owned[id] ? "have" : "need"));
      });
      mid.appendChild(icons);
      row.appendChild(mid);
      row.appendChild(el("b", "mr-setbonus", G.sets[st.id] ? "✓ +" + st.bonus + "💖" : "+" + st.bonus + "💖"));
      sb.appendChild(row);
    });
    var hb = $("helperList");
    hb.innerHTML = "";
    var last = gameOver();
    HELPERS.forEach(function (h) {
      var owned = !!G.gear[h.id];
      var b = el("button", "mr-helper" + (owned ? " owned" : ""));
      b.disabled = owned || last || h.price > G.pocket;
      b.appendChild(span(h.emo, "mr-treatemo"));
      var txt = el("span", "mr-helpertxt");
      txt.appendChild(el("b", null, h.th));
      txt.appendChild(el("small", null, h.desc));
      b.appendChild(txt);
      b.appendChild(el("b", "mr-helperprice", owned ? "✓" : baht(h.price)));
      b.addEventListener("click", function () {
        if (owned || last || h.price > G.pocket) return;
        G.pocket -= h.price;
        G.gearSpent += h.price;
        visit.news = [];
        G.gear[h.id] = true;
        SFX.play("levelup");
        renderTreats();
      });
      hb.appendChild(b);
    });
    renderBag($("bag"));
  }
  function renderBag(node) { node.textContent = G.bag.length ? G.bag.join("") : "—"; }
  function nextDay() {
    if (gameOver()) { finish(); return; }
    G.day++;
    startBrief();
  }

  // ---------- final & scoreboard ----------
  function finish() {
    $("finalTitle").textContent = G.mode === "endless" ? "🏁 ไปตลาดมา " + G.days.length + " วัน" : "🎉 จบ " + G.days.length + " วันแล้ว!";
    $("finalMode").textContent = G.M.th + (G.date ? " · " + G.date.slice(6, 8) + "/" + G.date.slice(4, 6) : "");
    $("finalScore").textContent = pts(score());
    var d = $("finalDays");
    d.innerHTML = "";
    G.days.forEach(function (x) {
      var c = el("div", "mr-dayscore" + (x.perfect ? " perfect" : ""));
      c.appendChild(span(x.day));
      c.appendChild(el("b", null, baht(x.pocket)));
      if (x.perfect) c.appendChild(span("⭐"));
      d.appendChild(c);
    });
    function chip(label, val, cls) {
      var c = el("div", "mr-dayscore " + cls);
      c.appendChild(span(label));
      c.appendChild(el("b", null, val));
      d.appendChild(c);
    }
    if (G.gearSpent) chip("ของช่วย", "−" + baht(G.gearSpent), "gear");
    if (G.treatSpent) chip("ซื้อขนม", "−" + baht(G.treatSpent), "gear");
    chip("เงินเก็บ", baht(G.pocket), "sum");
    if (G.joy) chip("ความสุข", "+💖" + G.joy, "joy");
    var sets = SETS.filter(function (st) { return G.sets[st.id]; });
    $("finalSets").textContent = sets.map(function (st) { return st.emo; }).join(" ");
    $("finalSets").hidden = !sets.length;
    renderBag($("finalBag"));
    $("finalBag").hidden = !G.bag.length;
    $("nameInput").value = loadJSON(NAME_KEY, "") || "";
    $("saveRow").hidden = false;
    $("saveBtn").disabled = false;
    $("saveNote").hidden = true;
    $("finalBoardTitle").textContent = G.mode === "daily" ? "🌐 กระดานออนไลน์วันนี้" : "🏆 กระดานคะแนน";
    renderBoard($("boardFinal"), G.mode);
    show("scrFinal");
    SFX.play("win");
  }

  function saveScore() {
    if (G.saved) return;
    var name = ($("nameInput").value || "").trim().slice(0, 20) || (isEn() ? "Player" : "ผู้เล่น");
    saveJSON(NAME_KEY, name);
    var key = boardKey(G.mode);
    var board = loadJSON(key, []);
    var entry = { name: name, score: score(), perfect: G.days.filter(function (x) { return x.perfect; }).length, days: G.days.length, bag: G.bag.slice(0, 8).join(""), date: G.date, at: Date.now() };
    board.push(entry);
    board.sort(function (a, b) { return b.score - a.score || a.at - b.at; });
    board = board.slice(0, 10);
    saveJSON(key, board);
    G.saved = entry.at;
    $("saveRow").hidden = true;
    SFX.play(board[0].at === entry.at ? "fanfare" : "levelup");
    if (G.mode !== "daily") { renderBoard($("boardFinal"), G.mode); return; }
    var note = $("saveNote");
    note.hidden = false;
    note.textContent = "กำลังส่งคะแนนขึ้นกระดานออนไลน์…";
    Online.submit(G.date, name, score(), entry.perfect).then(function (res) {
      note.textContent = res === "kept" ? "บันทึกแล้ว กระดานออนไลน์เก็บคะแนนที่ดีที่สุดของวันนี้ไว้" : "ส่งคะแนนขึ้นกระดานออนไลน์แล้ว";
      renderBoard($("boardFinal"), "daily");
    }).catch(function () {
      note.textContent = "ส่งคะแนนออนไลน์ไม่สำเร็จ บันทึกไว้ในเครื่องแล้ว";
      renderBoard($("boardFinal"), "daily");
    });
  }

  var boardReq = 0;
  function renderBoard(ol, which) {
    ol.innerHTML = "";
    if (which !== "daily") { fillBoard(ol, loadJSON(boardKey(which), []), false); return; }
    var req = ++boardReq;
    ol.appendChild(el("li", "mr-empty", "กำลังโหลดกระดานออนไลน์…"));
    Online.top(todayKey()).then(function (rows) {
      if (req === boardReq) fillBoard(ol, rows, true);
    }).catch(function () {
      if (req !== boardReq) return;
      var local = loadJSON(boardKey("daily"), []).filter(function (b) { return b.date === todayKey(); });
      fillBoard(ol, local, false);
      ol.insertBefore(el("li", "mr-empty", "โหลดกระดานออนไลน์ไม่สำเร็จ แสดงคะแนนในเครื่องแทน"), ol.firstChild);
    });
  }
  function fillBoard(ol, board, online) {
    ol.innerHTML = "";
    if (!board.length) { ol.appendChild(el("li", "mr-empty", "ยังไม่มีคะแนน มาเป็นคนแรกเลย!")); return; }
    board.forEach(function (b, i) {
      var me = online ? !!b.uid && b.uid === Online.uid() : !!(G && G.saved === b.at);
      var li = el("li", me ? "me" : "");
      li.appendChild(span(i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : String(i + 1), "mr-rank"));
      var nm = span(b.name, "mr-bname");
      nm.setAttribute("data-i18n-skip", "");
      li.appendChild(nm);
      li.appendChild(span(b.perfect ? "⭐".repeat(Math.min(b.perfect, 5)) : "", "mr-bstar"));
      li.appendChild(span(b.days > 3 ? "📆" + b.days : b.bag || "", "mr-bbag"));
      li.appendChild(el("b", "mr-bscore", Math.round(b.score).toLocaleString("en-US")));
      ol.appendChild(li);
    });
  }

  // ---------- online daily board (Firebase RTDB: leaderboards/market-run/{YYYYMMDD}/{uid}) ----------
  var Online = (function () {
    var conn = null, val = null, CDN = "https://www.gstatic.com/firebasejs/10.14.1";
    function connect() {
      if (conn) return conn;
      conn = Promise.all([
        import("/staygo/firebase-config.js"),
        import(CDN + "/firebase-app.js"),
        import(CDN + "/firebase-auth.js"),
        import(CDN + "/firebase-database.js"),
      ]).then(function (m) {
        var app = m[1].initializeApp(m[0].FIREBASE_CONFIG, "market-run");
        var auth = m[2].getAuth(app);
        return (auth.currentUser ? Promise.resolve({ user: auth.currentUser }) : m[2].signInAnonymously(auth)).then(function (c) {
          val = { db: m[3].getDatabase(app), m: m[3], uid: c.user.uid };
          return val;
        });
      });
      conn.catch(function () { conn = null; });
      return conn;
    }
    function path(day) { return "leaderboards/market-run/" + day; }
    return {
      uid: function () { return val ? val.uid : null; },
      top: function (day) {
        return connect().then(function (x) {
          var q = x.m.query(x.m.ref(x.db, path(day)), x.m.orderByChild("score"), x.m.limitToLast(20));
          return x.m.get(q).then(function (s) {
            var rows = [];
            s.forEach(function (c) { var v = c.val(); v.uid = c.key; rows.push(v); });
            return rows.sort(function (a, b) { return b.score - a.score || a.t - b.t; });
          });
        });
      },
      submit: function (day, name, sc, perfect) {
        return connect().then(function (x) {
          var ref = x.m.ref(x.db, path(day) + "/" + x.uid);
          return x.m.get(ref).then(function (s) {
            var old = s.val();
            if (old && old.score >= sc) return "kept";
            return x.m.set(ref, { name: name, score: Math.max(0, Math.round(sc)), perfect: perfect, t: x.m.serverTimestamp() }).then(function () { return "saved"; });
          });
        });
      },
    };
  })();

  // ---------- wire up ----------
  function setBoardTab(which) {
    document.querySelectorAll("#boardTabs button").forEach(function (b) { b.classList.toggle("on", b.dataset.board === which); });
    renderBoard($("boardStart"), which);
  }
  document.querySelectorAll("#modes button").forEach(function (b) {
    b.addEventListener("click", function () {
      mode = b.dataset.mode;
      document.querySelectorAll("#modes button").forEach(function (x) { x.classList.toggle("on", x === b); });
      SFX.play("toggle");
      setBoardTab(mode);
    });
  });
  document.querySelectorAll("#boardTabs button").forEach(function (b) {
    b.addEventListener("click", function () { SFX.play("toggle"); setBoardTab(b.dataset.board); });
  });
  $("startBtn").addEventListener("click", function () { SFX.play("select"); newGame(); });
  $("goBtn").addEventListener("click", startPlay);
  $("leaveShop").addEventListener("click", leaveShop);
  $("homeBtn").addEventListener("click", goHome);
  $("bargBtn").addEventListener("click", startBargain);
  $("bargStop").addEventListener("click", stopNeedle);
  document.addEventListener("keydown", function (e) {
    if (barg && !barg.done && (e.code === "Space" || e.key === "Enter")) { e.preventDefault(); stopNeedle(); }
  });
  $("toTreats").addEventListener("click", openTreats);
  $("nextDay").addEventListener("click", function () { SFX.play("click"); nextDay(); });
  $("saveBtn").addEventListener("click", saveScore);
  $("nameInput").addEventListener("keydown", function (e) { if (e.key === "Enter") saveScore(); });
  $("againBtn").addEventListener("click", function () { SFX.play("select"); newGame(); });
  $("menuBtn").addEventListener("click", function () { SFX.play("back"); setBoardTab(mode); show("scrStart"); });
  setBoardTab("normal");

})();

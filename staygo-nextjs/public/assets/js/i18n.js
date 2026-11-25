/* STAYGO language switch (TH ⇄ EN).
 * The pages are written in Thai. In English mode this script swaps every Thai text node
 * (and placeholder / title / aria-label / alt) for its entry in the dictionary, and keeps
 * swapping as pages render new content. Switching back restores the original Thai.
 *
 *   STAYGO_I18N.lang            "th" | "en"  (remembered in localStorage "staygo-lang")
 *   STAYGO_I18N.set("en")       STAYGO_I18N.toggle()
 *   STAYGO_I18N.add({ "ไทย": "English" })               more phrases (per-page dictionaries)
 *   STAYGO_I18N.addPatterns([[/^ตาของ (.+)$/, "$1's turn"]])   phrases with variable parts
 *   STAYGO_I18N.addInline([[/ผู้เล่น (\d+)/g, "Player $1"]])   fix-ups applied inside every translated result
 *   STAYGO_I18N.t("ไทย")        translate a string from code (returns it unchanged in Thai mode)
 *   STAYGO_I18N.en("ไทย")       its English whatever the current mode (null if none)
 *   STAYGO_I18N.missing()       Thai strings on screen that have no English yet (for development)
 *
 * Any element with [data-lang-toggle] becomes the switch button; if a page has none, one is
 * added to the site header (or floats bottom-left next to the sound button).
 * Mark anything that must stay as written with data-i18n-skip (names, user input, word lists).
 * The Next.js app starts the translator itself after hydration (<html data-i18n-manual>).
 */
(function () {
  if (window.STAYGO_I18N) return;
  var KEY = "staygo-lang";
  var THAI = /[฀-๿]/;
  var ATTRS = ["placeholder", "title", "aria-label", "alt"];
  var SKIP_TAGS = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, CODE: 1 };
  var lang = "th";
  try { lang = localStorage.getItem(KEY) === "en" ? "en" : "th"; } catch (e) {}

  var dict = Object.create(null);
  var patterns = [];
  var inline = []; // [regex /g, replacement] run over every translated result, e.g. default names inside sentences
  var textState = new WeakMap(); // text node -> { orig, shown }
  var attrState = new WeakMap(); // element -> { attr: { orig, shown } }
  var tracked = new Set(); // nodes we changed, so we can restore them (pruned when detached)
  var titleState = null;
  var started = false;
  var observer = null;
  var seenMissing = Object.create(null);

  function norm(s) { return s.replace(/\s+/g, " ").trim(); }
  // "🎲 บอร์ดเกม", "(ดูทั้งหมด)", "เล่นเกม →": translate the Thai core and keep the emoji/punctuation around it
  var EDGE = /^([^\u0E00-\u0E7F]*?)([\u0E00-\u0E7F].*[\u0E00-\u0E7F.!?…])([^\u0E00-\u0E7F]*)$/;
  function lookup(key) {
    var v = lookup1(key);
    if (v != null) return v;
    var i = key.search(THAI);
    if (i > 0) {
      v = lookup1(key.slice(i));
      if (v != null) return key.slice(0, i) + v;
    }
    var m = key.match(EDGE);
    if (m && (m[1] || m[3])) {
      v = lookup1(m[2]);
      if (v != null) return m[1] + v + m[3];
    }
    return null;
  }
  function lookup1(key) {
    var v = dict[key];
    if (v != null) return v;
    for (var i = 0; i < patterns.length; i++) {
      var p = patterns[i];
      var m = key.match(p[0]);
      if (!m) continue;
      // a function may return null to say "not mine", and the next pattern gets a try
      var out = typeof p[1] === "function" ? p[1].apply(null, m) : key.replace(p[0], p[1]);
      if (out != null) return out;
    }
    return null;
  }
  // translate a whole string keeping its surrounding whitespace; null if unknown
  function tr(s) {
    if (!s || !THAI.test(s)) return null;
    var key = norm(s);
    var v = lookup(key);
    if (v == null) {
      seenMissing[key] = 1;
      return null;
    }
    for (var i = 0; i < inline.length; i++) v = v.replace(inline[i][0], inline[i][1]);
    var lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
    return lead + v + trail;
  }

  function skipEl(el) {
    for (var n = el; n && n.nodeType === 1; n = n.parentNode) {
      if (SKIP_TAGS[n.tagName] || n.hasAttribute("data-i18n-skip") || n.isContentEditable) return true;
    }
    return false;
  }

  // Each node remembers { orig: the page's Thai text, shown: what we last left in it }.
  // If the text no longer equals `shown`, the page changed it, so the current text is the new original.
  function doText(node) {
    var st = textState.get(node);
    var cur = node.nodeValue;
    if (st && cur !== st.shown) st = null;
    var orig = st ? st.orig : cur;
    if (lang === "th") {
      if (st && cur !== orig) { node.nodeValue = orig; st.shown = orig; }
      return;
    }
    if (!THAI.test(orig) || skipEl(node.parentNode)) return;
    var out = tr(orig);
    if (out == null) return;
    textState.set(node, { orig: orig, shown: out });
    tracked.add(node);
    if (cur !== out) node.nodeValue = out;
  }
  function doAttrs(el) {
    if (el.nodeType !== 1) return;
    var map = attrState.get(el);
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute(a)) continue;
      var cur = el.getAttribute(a);
      var st = map && map[a];
      if (st && cur !== st.shown) st = null;
      var orig = st ? st.orig : cur;
      if (lang === "th") {
        if (st && cur !== orig) { el.setAttribute(a, orig); st.shown = orig; }
        continue;
      }
      if (!THAI.test(orig) || (el.tagName === "TEXTAREA" ? el.hasAttribute("data-i18n-skip") || skipEl(el.parentNode) : skipEl(el))) continue;
      var out = tr(orig);
      if (out == null) continue;
      if (!map) { map = {}; attrState.set(el, map); }
      map[a] = { orig: orig, shown: out };
      tracked.add(el);
      if (cur !== out) el.setAttribute(a, out);
    }
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) return doText(root);
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    if (root.nodeType === 1) {
      if (SKIP_TAGS[root.tagName] || root.hasAttribute("data-i18n-skip")) return;
      doAttrs(root);
    }
    var w = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.nodeType === 1) {
          if (n.tagName === "TEXTAREA" && !n.hasAttribute("data-i18n-skip")) doAttrs(n); // its placeholder, never its text
          return SKIP_TAGS[n.tagName] || n.hasAttribute("data-i18n-skip") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    var n;
    while ((n = w.nextNode())) {
      if (n.nodeType === 3) doText(n);
      else doAttrs(n);
    }
  }
  function doTitle() {
    var cur = document.title;
    var st = titleState && cur === titleState.shown ? titleState : null;
    var orig = st ? st.orig : cur;
    if (lang === "th") {
      if (cur !== orig) document.title = orig;
      titleState = { orig: orig, shown: orig };
      return;
    }
    var out = tr(orig) || orig;
    titleState = { orig: orig, shown: out };
    if (cur !== out) document.title = out;
  }

  function restoreAll() {
    tracked.forEach(function (n) {
      if (!n.isConnected) { tracked.delete(n); return; }
      if (n.nodeType === 3) doText(n);
      else doAttrs(n);
    });
  }
  function apply() {
    document.documentElement.lang = lang;
    document.documentElement.classList.toggle("lang-en", lang === "en");
    if (!started) return;
    if (lang === "en") walk(document.body);
    else restoreAll();
    doTitle();
    syncButtons();
  }

  function onMutations(list) {
    if (lang !== "en") return; // Thai is what the page writes; a later switch reads the text fresh
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.type === "characterData") doText(m.target);
      else if (m.type === "attributes") doAttrs(m.target);
      else for (var k = 0; k < m.addedNodes.length; k++) walk(m.addedNodes[k]);
    }
    if (document.title !== (titleState && titleState.shown)) doTitle();
  }

  function start() {
    if (started) return;
    started = true;
    observer = new MutationObserver(onMutations);
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    var t = document.querySelector("title");
    if (t) new MutationObserver(function () { if (document.title !== (titleState && titleState.shown)) doTitle(); }).observe(t, { childList: true, characterData: true, subtree: true });
    mountToggle();
    apply();
    document.documentElement.classList.remove("i18n-wait");
  }

  // ---------------------------------------------------------------- toggle button
  var STYLE =
    ".lang-toggle{display:inline-flex;align-items:center;justify-content:center;gap:2px;min-width:44px;height:36px;padding:0 8px;" +
    "border:2.5px solid #1d1b2e;border-radius:999px;background:#fff;color:#1d1b2e;font:700 13px/1 'Fredoka','Kanit',system-ui,sans-serif;" +
    "cursor:pointer;box-shadow:2px 2px 0 #1d1b2e;letter-spacing:.02em;white-space:nowrap}" +
    ".lang-toggle:active{transform:translate(1px,1px);box-shadow:1px 1px 0 #1d1b2e}" +
    ".lang-toggle .lt-on{background:#1d1b2e;color:#fff;border-radius:999px;padding:3px 5px}" +
    ".lang-toggle .lt-off{opacity:.55;padding:3px 3px}" +
    ".lang-toggle.floating{position:fixed;left:62px;bottom:15px;z-index:9000}" +
    "@media print{.lang-toggle{display:none}}";
  function label(btn) {
    btn.innerHTML = lang === "en"
      ? '<span class="lt-off">TH</span><span class="lt-on">EN</span>'
      : '<span class="lt-on">TH</span><span class="lt-off">EN</span>';
    btn.setAttribute("aria-label", lang === "en" ? "เปลี่ยนเป็นภาษาไทย" : "Switch to English");
    btn.title = btn.getAttribute("aria-label");
    btn.setAttribute("data-i18n-skip", "");
  }
  function syncButtons() {
    var all = document.querySelectorAll("[data-lang-toggle]");
    for (var i = 0; i < all.length; i++) label(all[i]);
  }
  function mountToggle() {
    if (!document.getElementById("lang-toggle-style")) {
      var st = document.createElement("style");
      st.id = "lang-toggle-style";
      st.textContent = STYLE;
      document.head.appendChild(st);
    }
    document.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-lang-toggle]");
      if (!b) return;
      e.preventDefault();
      API.toggle();
    });
    if (document.querySelector("[data-lang-toggle]") || document.body.getAttribute("data-lang-toggle-auto") === "off") return syncButtons();
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "lang-toggle";
    btn.setAttribute("data-lang-toggle", "");
    btn.setAttribute("data-sfx", "off");
    var actions = document.querySelector(".header .header-actions");
    if (actions) actions.insertBefore(btn, actions.firstChild);
    else { btn.classList.add("floating"); document.body.appendChild(btn); }
    syncButtons();
  }

  var API = {
    get lang() { return lang; },
    set: function (l) {
      lang = l === "en" ? "en" : "th";
      try { localStorage.setItem(KEY, lang); } catch (e) {}
      apply();
      try { window.dispatchEvent(new CustomEvent("staygo:lang", { detail: lang })); } catch (e) {}
      if (window.SFX) window.SFX.play("select");
    },
    toggle: function () { API.set(lang === "en" ? "th" : "en"); },
    add: function (o) { for (var k in o) dict[norm(k)] = o[k]; if (started && lang === "en") walk(document.body); },
    addInline: function (list) { inline.push.apply(inline, list); if (started && lang === "en") walk(document.body); },
    addPatterns: function (list) { patterns.push.apply(patterns, list); if (started && lang === "en") walk(document.body); },
    t: function (s) { if (lang !== "en") return s; var o = tr(String(s)); return o == null ? s : o; },
    // English for a phrase whatever the current language (null if there is none), e.g. to accept guesses in either language
    en: function (s) { var v = lookup(norm(String(s || ""))); return v == null ? null : v; },
    start: start,
    missing: function () {
      var out = [];
      for (var k in seenMissing) if (lookup(k) == null) out.push(k);
      return out;
    },
  };
  window.STAYGO_I18N = API;

  // alert / confirm / prompt messages are not part of the page, so translate them on the way out
  ["alert", "confirm", "prompt"].forEach(function (fn) {
    var orig = window[fn];
    if (typeof orig !== "function") return;
    window[fn] = function (msg) {
      var args = Array.prototype.slice.call(arguments);
      if (typeof msg === "string" && lang === "en") args[0] = msg.split("\n").map(function (line) { return API.t(line); }).join("\n");
      return orig.apply(window, args);
    };
  });

  // ---------------------------------------------------------------- site-wide phrases
  var MONTHS = { "ม.ค.": "Jan", "ก.พ.": "Feb", "มี.ค.": "Mar", "เม.ย.": "Apr", "พ.ค.": "May", "มิ.ย.": "Jun", "ก.ค.": "Jul", "ส.ค.": "Aug", "ก.ย.": "Sep", "ต.ค.": "Oct", "พ.ย.": "Nov", "ธ.ค.": "Dec" };
  API.addPatterns([
    // "12 ม.ค. 2569" -> "12 Jan 2026"
    [/^(\d{1,2}) (ม\.ค\.|ก\.พ\.|มี\.ค\.|เม\.ย\.|พ\.ค\.|มิ\.ย\.|ก\.ค\.|ส\.ค\.|ก\.ย\.|ต\.ค\.|พ\.ย\.|ธ\.ค\.) (\d{4})$/, function (_, d, m, y) { return d + " " + MONTHS[m] + " " + (+y - 543); }],
    [/^ลงเมื่อ (\d{1,2}) (\S+) (\d{4})$/, function (_, d, m, y) { return "Posted " + d + " " + (MONTHS[m] || m) + " " + (+y - 543); }],
    [/^(\d+)[–-](\d+) คน$/, "$1–$2 players"],
    [/^(\d+) คน$/, "$1 players"],
    [/^(\d+)\+ คน$/, "$1+ players"],
    [/^(\d+)[–-](\d+) นาที$/, "$1–$2 min"],
    [/^(\d+)[–-](\d+) นาทีต่อเกม$/, "$1–$2 min per game"],
    [/^(\d+) นาทีขึ้นไป$/, "$1+ min"],
    [/^(\d+) คนขึ้นไป$/, "$1+ players"],
    [/^(\d+)[–-](\d+)\+ คน \(แบ่ง 2 ทีม\)$/, "$1–$2+ players (2 teams)"],
    [/^(\d+)[–-](\d+) คน \(สนุกสุด (\d+)[–-](\d+)\)$/, "$1–$2 players (best with $3–$4)"],
    [/^(\d+)[–-](\d+) คน \(Killer 1 คน vs Survivor\)$/, "$1–$2 players (1 Killer vs Survivors)"],
    [/^(\d+) นาที$/, "$1 min"],
    [/^(\d+)[–-](\d+) ชั่วโมง$/, "$1–$2 hr"],
    [/^วิธีเล่น (.+) - STAYGO$/, "How to play $1 - STAYGO"],
    [/^([\d.]+[KMB]?) วิว$/, "$1 views"],
    [/^มี (\d+) เกมที่เข้าเงื่อนไข$/, "$1 games match"],
    [/^บอกจำนวนคนและแนวเกมที่อยากเล่น แล้วสุ่มบอร์ดเกมจาก (\d+) เกมที่ STAYGO เคยเล่น พร้อมคลิปและวิธีเล่นย่อ$/, "Tell us how many players and what kind of game you want, and we'll pick from $1 board games STAYGO has played, with clips and quick rules"],
  ]);
  API.add({
    // header / menu / footer (Next.js and the static pages)
    "เมนูหลัก": "Main menu",
    "เมนู": "Menu",
    "ปิดเมนู": "Close menu",
    "ติดตามเรา": "Follow us",
    "วิธีเล่นบอร์ดเกม": "How to play board games",
    "ปิดเสียง": "Mute",
    "เปิดเสียง": "Unmute",
    "เกมทั้งหมด": "All games",
    "← เกมทั้งหมด": "← All games",
    "← เครื่องมือทั้งหมด": "← All tools",
    "เครื่องมือทั้งหมด": "All tools",
    "กลับหน้าแรก": "Back to home",
    "ย้อนกลับ": "Back",

    // cookie banner (analytics.js)
    "การใช้คุกกี้": "Cookies",
    "เว็บนี้ใช้คุกกี้เพื่อนับสถิติการใช้งาน ช่วยให้เราพัฒนาเกมและเครื่องมือได้ดีขึ้น": "This site uses cookies to count visits, which helps us make better games and tools",
    "ไม่อนุญาต": "Decline",
    "ยอมรับ": "Accept",

    // live rooms (live-room.js)
    "สร้างห้องไม่สำเร็จ ลองใหม่อีกครั้ง": "Couldn't create the room. Please try again",
    "ไม่พบห้องนี้ ตรวจรหัสอีกครั้ง": "Room not found. Check the code and try again",
    "คัดลอกลิงก์แล้ว": "Link copied",
    "คัดลอกลิงก์นี้": "Copy this link",

    // metadata
    "STAYGO - เว็บไซต์เกมและเครื่องมือสำหรับเล่นเกม": "STAYGO - Party games and game-night tools",
    "เว็บไซต์สำหรับเล่นเกมออนไลน์และเครื่องมือช่วยเล่นเกมต่างๆ จากช่อง STAYGO": "Free online party games and game-night tools from the STAYGO channel",
    "เกมปาร์ตี้ทั้งหมด - STAYGO": "All party games - STAYGO",
    "เครื่องมือช่วยเล่นเกมทั้งหมด - STAYGO": "All game-night tools - STAYGO",
    "เกี่ยวกับเรา - STAYGO": "About us - STAYGO",
    "ดูคลิป STAYGO ทุกรายการ | STAYGO": "Watch every STAYGO show | STAYGO",
    "วิธีเล่นบอร์ดเกม - STAYGO": "How to play board games - STAYGO",
    "สุ่มบอร์ดเกม: คืนนี้เล่นอะไรดี? - STAYGO": "Board game picker: what should we play tonight? - STAYGO",

    // home
    "สุ่มบอร์ดเกม": "Pick a board game",
    "เว็บไซต์ของ STAYGO Channel": "The STAYGO Channel website",
    "เกมเล่นบนเว็บ & เครื่องมือช่วยเล่นเกม": "Web games & game-night tools",
    "▶ เล่นเกม": "▶ Play games",
    "เล่นเกม": "Play",
    "ไม่รู้จะเล่นอะไร?": "Can't decide what to play?",
    "สุ่มบอร์ดเกมคืนนี้เลย!": "Pick tonight's board game!",
    "เครื่องมือช่วยเล่นเกม": "Game-night tools",
    "ใหม่": "New",
    "เกมเล่นบนเว็บ": "Web games",
    "พาร์ทเนอร์ของเรา": "Our partners",
    "ใช้โค้ด ส่วนลด 5%:": "Use code for 5% off:",
    "เยี่ยมชมเว็บไซต์": "Visit website",
    "คลิปล่าสุดจากช่อง": "Latest from the channel",
    "ดูทุกรายการ →": "See all shows →",
    "รายการจากช่อง STAYGO": "Shows from the STAYGO channel",
    "🎲 สุ่มบอร์ดเกมที่จะเล่นคืนนี้ →": "🎲 Pick a board game for tonight →",
    "เลือกจาก": "Choose from",
    "ดูทั้งหมด (": "See all (",
    "ดูวิธีเล่นบอร์ดเกมทั้งหมด (": "See how to play all board games (",
    "เกมที่เคยลงคลิปในช่อง": "games featured on the channel",
    "เกมที่เคยลงคลิปในช่อง)": "games featured on the channel)",
    "🔔 ติดตามช่อง": "🔔 Subscribe",
    "🔔 ติดตามช่อง →": "🔔 Subscribe →",
    "▶ ดูวิดีโอทั้งหมด": "▶ Watch all videos",
    // homepage welcome popup
    "ขอบคุณที่แวะมาเล่นนะ!": "Thanks for stopping by!",
    "ถ้าชอบเว็บนี้ ฝากกดติดตามช่อง STAYGO ด้วยนะครับ 🙏": "If you enjoy the site, please subscribe to the STAYGO channel 🙏",
    "🔥 คลิปยอดฮิตของช่อง": "🔥 Most-watched on the channel",
    "🆕 คลิปล่าสุดของช่อง": "🆕 Latest on the channel",
    "🔔 ติดตามช่อง STAYGO": "🔔 Subscribe to STAYGO",
    "ไม่ต้องแสดงอีกวันนี้": "Don't show again today",
    "ปิด": "Close",
    "คลิปใหม่ล่าสุด": "Newest video",
    "ลงเมื่อ": "Posted",
    "อ่านวิธีเล่น": "Read how to play",
    "ล่าสุด": "Latest",
    "🆕 ล่าสุด": "🆕 Latest",
    "คลิปใหม่ทุกรายการจากช่อง": "New videos from every show",
    "รายการจากช่อง": "Shows on the channel",
    "ดูทั้งเพลย์ลิสต์บน YouTube →": "See the whole playlist on YouTube →",

    // playlists
    "บอร์ดเกม": "Board games",
    "สอนเล่นและเล่นจริง บอร์ดเกมใหม่ทุกสัปดาห์": "How to play and real games, a new board game every week",
    "ภารกิจท้าทาย ตอบคำถาม แข่งกันเอง": "Challenges, quizzes and head-to-head battles",
    "สะแตกโก": "STAYGO Eats",
    "แก๊งซ่า Challenge": "Gang Challenge",
    "แก๊ง STAYGO พาไปกินร้านเด็ด": "The STAYGO gang finds the best places to eat",
    "เอาวะลองดู": "Let's Try It",
    "ลองของใหม่ เล่นอะไรแปลกๆ ด้วยกัน": "Trying new and weird things together",
    "เกมมีเท่านี้": "That's the Game",
    "เกมเล็กๆ เล่นจบไว ลองดูว่าสนุกไหม": "Small, quick games: are they any fun?",
    "เบื้องหลัง งานบอร์ดเกม และเรื่องเล่าของแก๊ง": "Behind the scenes, board game events and stories from the gang",

    // games page
    "รวมเกมปาร์ตี้สนุกๆ เล่นฟรีบนเว็บ": "Fun party games, free to play on the web",
    "เกมปาร์ตี้เล่นฟรีบนเว็บ": "Free party games on the web",
    "🎮 เกมทั้งหมด": "🎮 All games",
    "เลือกเกมที่อยากเล่น (ในอนาคตจะเพิ่มเกมใหม่เข้ามาเรื่อย ๆ)": "Pick a game to play (new games are added all the time)",
    "เกมใหม่": "New game",
    "เร็วๆ นี้": "Coming soon",
    "เกมใหม่กำลังจะมาเร็วๆ นี้ ติดตามได้ทางช่อง YouTube": "More games are on the way. Follow the YouTube channel for news",

    // tools page
    "รวมเครื่องมือช่วยเล่นเกมฟรีบนเว็บ": "Free game-night tools on the web",
    "🔧 เครื่องมือทั้งหมด": "🔧 All tools",
    "เครื่องมือช่วยเล่นเกมและจัดกิจกรรม ใช้ฟรีบนเว็บ": "Tools for game nights and events, free on the web",

    // web game cards (src/data/webGames.ts)
    "STAYGO! ออนไลน์": "STAYGO! Online",
    "2–5 Players • เกมการ์ดออนไลน์": "2–5 Players • Online card game",
    "เรียงแถว S-T-A-Y-G-O ให้ครบก่อนใคร": "Be first to complete the row S-T-A-Y-G-O",
    "เกมการ์ด STAYGO! เล่นออนไลน์กับเพื่อนคนละเครื่อง สร้างห้องแล้วแชร์รหัส เรียงแถว S T A Y G O ให้ครบก่อนใคร ใช้พลัง Swap Take Again Yolo Got Oops! แกล้งกันได้เต็มที่": "The STAYGO! card game online, each friend on their own device. Create a room, share the code and be first to line up S T A Y G O. Use Swap, Take, Again, Yolo, Got and Oops! to mess with each other",
    "สร้าง / เข้าห้อง": "Create / Join room",
    "วาดไว 15 วิ": "15-Second Sketch",
    "2–30 Players • เกมวาดรูปปาร์ตี้": "2–30 Players • Party drawing game",
    "วาดตามโจทย์ข้อละ 15 วิ 10 รูปรวด แล้วเรียงรูปตัวเองให้ถูก": "Draw 10 prompts, 15 seconds each, then put your drawings back in order",
    "เกมปาร์ตี้วาดรูปบนมือถือ โฮสต์เปิดห้องบนจอใหญ่ ทุกคนวาดโจทย์เดียวกันข้อละ 15 วินาทีติดกัน 10 รูป แล้วมีเวลา 1 นาทีเรียงรูปของตัวเองให้ตรงกับโจทย์ที่ถูกสลับ เฉลยพร้อมกันพร้อมดูรูปของทุกคน": "A party drawing game on phones. The host opens a room on a big screen, everyone draws the same 10 prompts for 15 seconds each, then has 1 minute to match their drawings to the shuffled prompts. Everyone's answers and drawings are revealed together",
    "ลุ้นจั่ว": "Push Your Luck",
    "2–6 Players • เกมเสี่ยงดวง": "2–6 Players • Push-your-luck game",
    "เปิดการ์ดทีละใบ เก็บ STAYGO ให้ครบ ตัวซ้ำ = ระเบิด!": "Flip cards one by one to collect STAYGO. A repeat = BOOM!",
    "เกมเสี่ยงดวงด้วยการ์ด STAYGO เล่นบนเครื่องเดียว เปิดการ์ดทีละใบเก็บตัวอักษร S T A Y G O ให้ครบก่อนใคร แต่ถ้าเปิดได้ตัวซ้ำในเทิร์นเดียว ระเบิด! มีโหมดจอใหญ่สำหรับเปิดให้ทุกคนดู": "A push-your-luck game with STAYGO cards on one device. Flip cards one at a time to be first to collect S T A Y G O, but flip a repeat in the same turn and BOOM! Has a big-screen mode so everyone can watch",
    "FLIPPED: พินบอลกลับด้าน": "FLIPPED: Reverse Pinball",
    "1 Player • เกมฟิสิกส์ Roguelike": "1 Player • Physics roguelike",
    "คุณคือลูกเหล็ก ไม้ตีคือบอส ลงหลุมให้ได้!": "You are the ball, the flippers are the boss. Get down the drain!",
    "พินบอลกลับด้านแนว roguelike คุณเป็นลูกเหล็กที่ดีดตัวเองชนบัมเปอร์ ทำลายเกราะแล้วพุ่งชนไม้ตีให้พังจนลงหลุมได้ เก็บบัฟทุกตู้ ตายแล้วเอาเศษเหล็กไปอัปเกรดถาวร เล่นได้ทั้งมือถือและคอม": "Reverse pinball roguelike. You are the steel ball: launch yourself into bumpers, break the shield, then smash the flippers until you can drop down the drain. Collect buffs every machine and spend scrap on permanent upgrades. Works on phone and computer",
    "ใครวาดมั่ว": "Fake Artist",
    "3–20 Players • เกมวาดรูปจับผิด": "3–20 Players • Drawing and deduction",
    "ทุกคนรู้คำยกเว้น 1 คน ผลัดกันวาดคนละเส้น แล้วโหวตจับคนวาดมั่ว": "Everyone knows the word except one. Take turns adding one line each, then vote out the fake",
    "เกมปาร์ตี้วาดรูปจับผิด เปิดจอกลางบนทีวีหรือคอม ทุกคนเข้าห้องจากมือถือ เกือบทุกคนเห็นคำลับ ยกเว้นคนวาดมั่ว 1 คน ผลัดกันวาดคนละเส้นบนภาพเดียวกัน แล้วโหวตหาตัวคนที่ไม่รู้คำ ถ้าโดนจับยังพลิกชนะได้ด้วยการเดาคำ": "A party drawing and deduction game. Put the main screen on a TV or computer and everyone joins from their phone. Everyone sees the secret word except the fake artist. Take turns adding one line to the same picture, then vote for who didn't know the word. A caught fake can still win by guessing the word",
    "แม่ฝากซื้อ": "Mom's Errand",
    "1 Player • เกมจ่ายตลาดแข่งเวลา": "1 Player • Race-the-clock shopping",
    "ซื้อของให้แม่ให้ครบ หาร้านลดราคา เงินที่เหลือคือค่าขนม!": "Get everything on Mom's list, hunt the deals — the change is your pocket money!",
    "แม่ให้เงินไปจ่ายตลาด ซื้อของตามลิสต์ให้ครบก่อนหมดเวลา แต่ละร้านราคาและโปรสุ่มใหม่ทุกวัน ต้องเดินไปเช็กเอง ระวังแฟลชเซลที่มาแป๊บเดียว ยิ่งเหลือเงินมาก ยิ่งได้ค่าขนมไปซื้อขนมและของเล่น เล่น 3 วันแล้วบันทึกคะแนนลงกระดาน": "Mom gives you money for the market. Buy everything on the list before time runs out. Each shop's prices and deals change every day, so you have to walk over and check, and flash sales vanish fast. The more change you bring home, the more pocket money you get for snacks and toys. Play 3 days and save your score to the board",
    "จับคู่อีโมจิ": "Emoji Match",
    "1 Player • เกมจำ": "1 Player • Memory game",
    "จับคู่อีโมจิให้ถูกต้อง": "Match the emoji pairs",
    "จับคู่อีโมจิให้ถูกต้อง เลือกระดับความยากและโหมดจับเวลา": "Match the emoji pairs. Choose a difficulty and a timed mode",
    "1 Player • เกมกลยุทธ์": "1 Player • Strategy game",
    "ทอยเต๋าผจญภัยใน Dungeon": "Roll dice through a dungeon",
    "เกมผจญภัยด้วยลูกเต๋า วางแผนการต่อสู้แบบเทิร์นเบส รวบรวมไอเทมและเอาชนะบอส": "A dice adventure: plan turn-based fights, collect items and beat the boss",
    "ถอดรหัสตัวเลข": "Number Decoder",
    "1 Player • เกมปริศนา": "1 Player • Puzzle game",
    "ทายตัวเลขลับภายใน 8 ครั้ง": "Guess the secret number in 8 tries",
    "ใช้ logic ทายตัวเลขลับภายใน 8 ครั้ง ด้วยระบบสีที่บอกคำใบ้ เหมือน Mastermind": "Use logic to guess the secret number in 8 tries with color clues, like Mastermind",
    "เกมทอยเต๋า": "Dice Challenge",
    "Multiplayer • เกมทอยเต๋า": "Multiplayer • Dice game",
    "เลือกแผ่นป้ายและทอยเต๋าเพื่อเก็บแต้ม": "Pick a card and roll dice to score",
    "เลือกแผ่นป้ายและทอยเต๋า d6 เพื่อเก็บแต้ม รองรับโหมดปกติและโหมด Team สำหรับจัดกิจกรรม": "Pick a card and roll d6 dice to score. Has a normal mode and a Team mode for events",
    "1 Player • เกม Idle ผจญภัย": "1 Player • Idle adventure",
    "สุ่มฮีโร่ ลุยดันเจี้ยนแบบ auto-battle": "Recruit heroes and auto-battle through dungeons",
    "สุ่มฮีโร่ ลุยดันเจี้ยนแบบ auto-battle เก็บไอเทม ตีเสริมพลัง แล้วบันทึกทุกการต่อสู้ลงในสมุดบัญชี": "Recruit heroes, auto-battle through dungeons, collect and enchant items, and record every fight in the ledger",
    "2–6 Players • เกมกระดานไล่ล่า": "2–6 Players • Chase board game",
    "งูกินหาง เป็นทั้งผู้ล่าและผู้ถูกล่า รอดคนสุดท้ายชนะ": "A snake eating its tail: hunter and hunted at once. Last one alive wins",
    "วนรอบบนกระดาน เลือกลูกเต๋าแบบปิดหน้าจอ ไล่กินคู่แข่ง รอดคนสุดท้ายคือผู้ชนะ เล่นแบบส่งต่ออุปกรณ์เดียวหรือห้องออนไลน์": "Circle the board, pick your dice in secret and eat your rivals. Last one alive wins. Pass one device around or play in an online room",
    "Multiplayer • เกมทายภาพ": "Multiplayer • Picture quiz",
    "สร้าง quiz ภาพซูมของตัวเอง แล้วให้เพื่อนทาย": "Make your own zoomed-picture quiz for friends to guess",
    "สร้างเกมทายภาพของตัวเอง ใส่รูปแล้วเพิ่มตัวเลือกช่วยทายได้ ภาพจะซูมเข้าสุดแล้วค่อยๆ ซูมออก ให้ทุกคนช่วยกันทาย": "Make your own picture quiz: add photos and optional answer choices. Each picture starts fully zoomed in and slowly zooms out while everyone guesses",
    "ทายคำศัพท์ 5 ตัว": "Thai Wordle",
    "1 Player • เกมทายคำ": "1 Player • Word game",
    "ทายคำศัพท์ไทยสไตล์ Wordle มีคำประจำวันให้เล่นทุกวัน": "Guess Thai words, Wordle style, with a new daily word",
    "เกมทายคำศัพท์ไทยสไตล์ Wordle ทายให้ถูกภายใน 6 ครั้ง มีคำประจำวันให้เล่นทุกวันและโหมดฝึกฝนเล่นได้ไม่จำกัด": "A Thai word game in the style of Wordle. Guess the word in 6 tries. There's a daily word and an unlimited practice mode",
    "กระดานจดแต้มสำหรับ JinxO": "JinxO Score Board",
    "4–7 Players • กระดานช่วยเล่นบอร์ดเกม": "4–7 Players • Board game companion",
    "ใช้แทนกระดานผู้เล่น คู่กับเกมตัวจริง": "Replaces the player boards, use with the real game",
    "เครื่องมือเสริมสำหรับเล่นคู่กับเกม JinxO ตัวจริง ใช้มือถือแทนกระดานผู้เล่น เขียนคำตอบ วงกลม กากบาท ดาว Jinx พร้อมนับโบนัสและคะแนน 3 รอบให้อัตโนมัติ": "A companion for the physical JinxO game. Use your phone as the player board: write answers, mark circles, crosses and Jinx stars, and it counts bonuses and scores for all 3 rounds automatically",
    "เปิดกระดาน": "Open board",
    "เปิดแผ่นป้ายทายภาพ": "Reveal Board",
    "4–20 Players • เกมปาร์ตี้": "4–20 Players • Party game",
    "เปิดแผ่นป้ายทีละช่องเพื่อทายภาพ": "Reveal tiles one at a time to guess the picture",
    "เปิดแผ่นป้ายทีละช่องเพื่อทายภาพ เหมาะสำหรับเล่นเป็นกลุ่ม": "Reveal tiles one at a time to guess the picture. Great for groups",
    "ลูปนรกหมกมุ่น": "Card Loop",
    "1 Player • เกมไพ่": "1 Player • Card game",
    "ตอบคำถาม 4 ข้อติดเพื่อชนะ": "Answer 4 questions in a row to win",
    "ตอบคำถาม 4 ข้อให้ถูกต้องติดต่อกันเพื่อชนะ เกมท้าทายความจำและโชค": "Get 4 questions right in a row to win. A test of memory and luck",

    // tool cards (src/data/tools.ts)
    "ปุ่มกดแข่ง (Buzzer)": "Buzzer",
    "มือถือทุกคนเป็นปุ่มกด จอโฮสต์บอกว่าใครกดก่อน สำหรับเกมตอบคำถาม": "Every phone becomes a buzzer and the host screen shows who pressed first. For quiz games",
    "โหวตจากมือถือ": "Phone Voting",
    "ตั้งคำถาม ให้ทุกคนโหวตจากมือถือ แล้วเปิดผลบนจอใหญ่พร้อมกัน": "Ask a question, everyone votes from their phone, then reveal the results on the big screen",
    "วางนิ้วสุ่ม": "Finger Picker",
    "ทุกคนวางนิ้วบนจอ สุ่มคนเริ่มเกม สุ่มหลายคน หรือแบ่งทีม": "Everyone puts a finger on the screen to pick a first player, pick several, or split teams",
    "บิงโก": "Bingo",
    "ทายจากคุณสมบัติ": "Guess from Clues",
    "ใส่คำเฉลยกับคุณสมบัติกี่ข้อก็ได้ แล้วเปิดป้ายใบ้ทีละแผ่นให้ทุกคนทาย มีปุ่มเปิดทั้งหมดและเฉลย": "Write an answer with any number of clues, then reveal them one by one while everyone guesses. Open-all and reveal buttons included",
    "จอคนจับเลขพร้อมกงล้อลูกบอล และการ์ดบิงโก 5x5 บนมือถือ แตะวงเลข ครบแถวขีดเส้นให้": "A caller screen with a ball wheel, plus 5x5 bingo cards on phones. Tap to circle; full lines get crossed out",
    "แจกบทลับ": "Secret Roles",
    "หมาป่า สายลับ ใครคือสปาย หรือตั้งบทเอง แจกบทลงมือถือทุกคน พร้อมสคริปต์คนเล่า": "Werewolf, Spyfall, Who's the Spy or your own roles, dealt to every phone, with a narrator script",
    "โต๊ะผจญภัย (TRPG)": "Adventure Table (TRPG)",
    "ใบตัวละครบนมือถือ หลอดพลัง ลูกเต๋า ลำดับเทิร์น มอนสเตอร์ และจอของผู้คุมเกม": "Character sheets on phones, health bars, dice, turn order, monsters and a game master screen",
    "สุ่มคำ / หัวข้อ": "Random Words / Topics",
    "คำใบ้คำ วาดรูปทาย คำถามใครใช่ที่สุด คำถามเปิดใจ พร้อมโหมดจับเวลา": "Charades words, drawing prompts, 'most likely to' and deep-talk questions, with a timed mode",
    "จัดโต๊ะสลับคน": "Table Shuffler",
    "แบ่งคนลงโต๊ะหลายรอบ ให้เจอคนใหม่ซ้ำน้อยที่สุด สำหรับงานคนเยอะ": "Seat people at tables over several rounds so they meet as many new people as possible. For big events",
    "ทอยลูกเต๋า": "Dice Roller",
    "ทอยลูกเต๋าออนไลน์ ใช้แทนลูกเต๋าจริงตอนเล่นเกมกระดาน": "Roll dice online instead of real dice when playing board games",
    "นับเวลาถอยหลัง/จับเวลา": "Timer / Stopwatch",
    "นับถอยหลังและจับเวลา สำหรับจำกัดเวลาแต่ละตา": "Countdown and stopwatch for timing each turn",
    "สุ่มทีม": "Team Randomizer",
    "ใส่รายชื่อแล้วสุ่มแบ่งทีมให้อัตโนมัติ": "Enter names and split them into random teams",
    "ตารางคะแนน": "Scoreboard",
    "จดและรวมคะแนนผู้เล่นหรือทีมระหว่างเล่นเกม": "Keep and total scores for players or teams during a game",
    "จัดสายการแข่งขัน": "Tournament Bracket",
    "แพ้คัดออก แพ้ 2 ครั้งตกรอบ หรือพบกันหมด แตะใส่ผล เลื่อนผู้ชนะให้เอง": "Single elimination, double elimination or round robin. Tap to enter results and winners advance automatically",
    "จับเวลาสำหรับแข่ง": "Competition Timer",
    "จับเวลาแยกของผู้เล่นหลายคน สำหรับการแข่งขัน": "Separate clocks for several players, for competitions",
    "จับสลาก": "Lucky Draw",
    "สุ่มจับสลากหรือสุ่มเลือกรายชื่อ": "Draw lots or pick a random name",
    "ไวท์บอร์ด": "Whiteboard",
    "ไวท์บอร์ดออนไลน์ วาดเขียนบนเว็บ": "An online whiteboard for drawing and writing",
    "ผู้เล่น นับแต้ม ลำดับเทิร์น จับเวลาต่อเทิร์น และลูกเต๋า ในหน้าเดียว": "Players, scores, turn order, turn timer and dice on one page",

    // about
    "ยินดีต้อนรับสู่ Website STAYGO": "Welcome to the STAYGO website",
    "Website ที่รวบรวมเกมเล่นบนเว็บและเครื่องมือช่วยเหลือในการเล่นปาร์ตี้เกม": "A home for web games and tools that help with party games",
    "เกี่ยวกับเรา": "About us",
    "STAYGO เป็น Channel YouTube ที่สร้างขึ้นจากการรวมตัวของกลุ่มเพื่อนๆสมัยมัธยมที่เรียนโรงเรียนหอวังด้วยกัน หลังจากเรียนจบจนแยกย้ายเข้ามหาลัยไปแล้ว วันหนึ่งได้นัดกันมาเล่นบอร์ดเกมและเกิดการชอบในการเล่นบอร์ดเกมจนเป็นที่มาของ STAYGO Channel": "STAYGO is a YouTube channel started by a group of friends from Horwang high school. After graduating and heading off to different universities, we met up one day to play board games, fell in love with them, and that became the STAYGO Channel",
    "นอกจากการรีวิวและแนะนำเกมบน YouTube แล้วเรายังพัฒนาเว็บไซต์นี้ขึ้นมาเพื่อเป็นเครื่องมือช่วยเหลือในการเล่นเกม รวมถึงเกมปาร์ตี้ที่สามารถเล่นได้ฟรีผ่านเว็บเบราว์เซอร์ เพื่อให้ทุกคนสามารถเข้าถึงความสนุกได้ง่ายๆ": "Besides reviewing and recommending games on YouTube, we built this website with tools to help you play, plus party games you can play free in your browser, so everyone can join the fun easily",
    "ติดตามเนื้อหาและอัพเดทล่าสุดจากเราได้ที่": "Follow our latest content and updates on",
    "ช่องรวมความบันเทิงของกลุ่มเพื่อน": "Our friend group's entertainment channel",
    "ดูช่องของเรา →": "Visit our channel →",
    "โพสต์ประกาศและเนื้อหาต่างๆ": "News and posts",
    "เยี่ยมชมเพจของเรา →": "Visit our page →",
    "รูปภาพและไฮไลท์": "Photos and highlights",
    "ติดตามเรา →": "Follow us →",
    "คลิปสั้นสนุกๆ": "Fun short videos",
    "เข้าชม →": "Visit →",
    "สตรีมสด": "Live streams",
    "ดูการสตรีม →": "Watch streams →",
    "ทำความรู้จักกับ STAYGO Channel และวัตถุประสงค์ของเว็บไซต์นี้": "Get to know the STAYGO Channel and what this website is for",

    // watch
    "📺 ดูคลิป STAYGO": "📺 Watch STAYGO",
    "อ่านวิธีเล่นบอร์ดเกมแบบสรุป →": "Read quick board game rules →",
    "🎲 สุ่มบอร์ดเกมจากคลิปในช่อง →": "🎲 Pick a board game from the channel →",
    "ดูทั้งหมดบน YouTube": "See all on YouTube",
    "รวมคลิปจากช่อง STAYGO: บอร์ดเกม แก๊งซ่า Challenge สะแตกโก เอาวะลองดู และอีกมากมาย อัปเดตคลิปใหม่ทุกสัปดาห์": "Videos from the STAYGO channel: board games, challenges, food trips, trying new things and more. New videos every week",

    // how to play (page chrome; the rules themselves come in a later phase)
    "ค้นหาชื่อเกม...": "Search games...",
    "ค้นหาชื่อเกม": "Search games",
    "กรองตามแนวเกม": "Filter by genre",
    "ทั้งหมด": "All",
    "ไม่พบเกมที่ค้นหา": "No games found",
    "📖 วิธีเล่นบอร์ดเกม": "📖 How to play board games",
    "🎲 ไม่รู้จะเล่นอะไร? สุ่มให้เลย": "🎲 Can't decide? Let us pick",
    "รวม": "",
    "บอร์ดเกมที่ STAYGO เคยเล่น พร้อมกติกาย่อและคลิปสอนเล่นจากช่อง": "board games STAYGO has played, with quick rules and how-to-play clips from the channel",
    "รวมวิธีเล่นบอร์ดเกม พร้อมคลิปสอนเล่นจากช่อง STAYGO": "Board game rules with how-to-play clips from the STAYGO channel",
    "รวมวิธีเล่นบอร์ดเกมที่ STAYGO เคยเล่น บอกแนวเกม จำนวนผู้เล่น เวลาที่ใช้ พร้อมคลิปสอนเล่นจากช่อง STAYGO": "How to play the board games STAYGO has played: genre, player count, play time and how-to-play clips from the STAYGO channel",
    "ปาร์ตี้": "Party",
    "วางแผน": "Strategy",
    "ร่วมมือกัน": "Co-op",
    "บลัฟ / จับโกหก": "Bluffing",
    "ใช้มือ / ความไว": "Dexterity / speed",
    "ทายคำ / สื่อสาร": "Words / communication",
    "← กลับไปหน้ารวมบอร์ดเกม": "← Back to all board games",
    "แนวเกม": "Genre",
    "จำนวนผู้เล่น": "Players",
    "เวลาเล่น": "Play time",
    "▶ ดูคลิปเต็มบน YouTube": "▶ Watch the full video on YouTube",
    "ชอบคลิปนี้? ฝากติดตาม STAYGO ด้วยนะครับ": "Enjoyed this? Please subscribe to STAYGO",
    "มีคลิปบอร์ดเกมใหม่ๆ ลงเรื่อยๆ": "New board game videos all the time",
    "เกมนี้เกี่ยวกับอะไร": "What's this game about",
    "เป้าหมาย": "Goal",
    "วิธีเล่นแบบย่อ": "Quick rules",
    "🎲 ใช้เครื่องมือช่วยเล่นเกมนี้": "🎲 Use a tool for this game",
    "ดูคลิปเกมอื่นต่อ": "Watch more games",
    "คลิปด้านบนเริ่มที่ช่วงสอนเล่น (": "The video above starts at the how-to-play part (",

    // board game picker
    "สุ่มบอร์ดเกม คืนนี้เล่นอะไรดี": "Board game picker: what should we play tonight",
    "← ดูบอร์ดเกมทั้งหมด": "← See all board games",
    "🎲 คืนนี้เล่นอะไรดี?": "🎲 What should we play tonight?",
    "บอกจำนวนคนกับแนวเกมที่อยากเล่น แล้วให้เราสุ่มจาก": "Tell us how many players and what kind of game you want, and we'll pick from",
    "เกมที่ STAYGO เคยเล่น พร้อมคลิปและวิธีเล่นย่อ": "games STAYGO has played, with clips and quick rules",
    "บอร์ดเกมที่ STAYGO เคยเล่นในช่อง": "board games STAYGO has played on the channel",
    "ไม่จำกัด": "Any",
    "ไม่เกิน 20 นาที": "Up to 20 min",
    "ไม่เกิน 30 นาที": "Up to 30 min",
    "ไม่เกิน 1 ชั่วโมง": "Up to 1 hour",
    "กำลังสุ่ม…": "Picking…",
    "🎲 สุ่มใหม่": "🎲 Pick again",
    "🎲 สุ่มเกม!": "🎲 Pick a game!",
    "ไม่มีเกมที่เข้าเงื่อนไขนี้ ลองเปลี่ยนจำนวนคน แนวเกม หรือเวลาดูนะ": "No games match. Try a different player count, genre or play time",
    "สุ่มอยู่…": "Picking…",
    "คืนนี้เล่นเกมนี้เลย!": "Play this one tonight!",
    "👥 เล่นกันกี่คน": "👥 How many players",
    "🎯 แนวเกม": "🎯 Genre",
    "(เลือกได้หลายแนว)": "(pick any)",
    "แนวไหนก็ได้": "Any genre",
    "⏱ มีเวลาเล่น": "⏱ Time available",
    "▶ ดูคลิปที่ STAYGO เล่น": "▶ Watch STAYGO play it",
    "📖 อ่านวิธีเล่นย่อ": "📖 Read quick rules",
    "🎲 เครื่องมือช่วยเล่น": "🎲 Game tool",
    "เลือกจำนวนคนกับแนวเกม แล้วกดสุ่มได้เลย": "Choose the player count and genre, then hit pick",
    "เกมอื่นที่เข้าเงื่อนไข (": "Other matching games (",
    "ดูทั้งหมด": "See all",
    "คน": "players",
    "เกม": "games",

    // "watch STAYGO play" card on game-over screens (staygo-cta.js)
    "ชอบเกมแนวนี้? ดู STAYGO เล่นบอร์ดเกมจริง": "Like this kind of game? Watch STAYGO play real board games",
    "คลิปบอร์ดเกมแนวใกล้เคียง": "Similar board game videos",
    "ดูคลิป & วิธีเล่น": "Watch & learn to play",
    "ติดตามช่อง": "Subscribe",
  });

  // ---------------------------------------------------------------- boot
  document.documentElement.lang = lang;
  if (lang === "en") {
    // hide the Thai text until it has been swapped (removed in start(), or after 1.5s at most)
    document.documentElement.classList.add("lang-en", "i18n-wait");
    var hide = document.createElement("style");
    hide.textContent = "html.i18n-wait body{opacity:0!important}";
    (document.head || document.documentElement).appendChild(hide);
  }
  function boot() {
    if (document.documentElement.hasAttribute("data-i18n-manual") && !window.__staygoHydrated) return; // Next.js calls start() after hydration
    start();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  // never leave the page hidden if something goes wrong
  setTimeout(function () { document.documentElement.classList.remove("i18n-wait"); }, 1500);
})();

/* ด่วนจี๋ทะลุแยก — endless rotate-the-road puzzle against the clock.
 * Tap road tiles to rotate them and link the rider 🛵 to the yellow goal:
 * shop (pick up) -> customer (deliver) -> next shop ... until time runs out.
 * Every leg carves a guaranteed route, scrambles it, then adds obstacles off that route.
 */
(() => {
  'use strict';

  const COLS = 6, ROWS = 8, SIZE = COLS * ROWS;
  const N = 1, E = 2, S = 4, W = 8;
  const DIRS = [
    { b: N, dx: 0, dy: -1, o: S, c: 'n' },
    { b: E, dx: 1, dy: 0, o: W, c: 'e' },
    { b: S, dx: 0, dy: 1, o: N, c: 's' },
    { b: W, dx: -1, dy: 0, o: E, c: 'w' },
  ];
  const SHAPE = { I: N | S, L: N | E, T: N | E | S, X: 15 };

  const START_TIME = 40;
  const MAX_TIME = 99;
  const PICKUP_BONUS = 3;
  const STEP_MS = 110; // ride speed per tile
  const TRAFFIC_MS = 1100; // extra per 🚗 tile
  const WARM_DECAY = 4; // heat lost per second while carrying food (100 -> 0 in 25 s)
  const DOG_TAPS = 3;
  const BEST_KEY = 'staygo-rider-best';
  const URL = 'https://www.staygoch.com/games/rider-rush/';

  const SHOPS = [
    { e: '🍜', n: 'ก๋วยเตี๋ยวเรือ' },
    { e: '🍛', n: 'ข้าวกะเพรา' },
    { e: '🍗', n: 'ข้าวมันไก่' },
    { e: '🍢', n: 'หมูปิ้ง' },
    { e: '🥭', n: 'ข้าวเหนียวมะม่วง' },
    { e: '🧋', n: 'ชานมไข่มุก' },
    { e: '🍕', n: 'พิซซ่า' },
    { e: '🍣', n: 'ซูชิ' },
    { e: '🍔', n: 'เบอร์เกอร์' },
    { e: '🥘', n: 'แกงเขียวหวาน' },
    { e: '🦐', n: 'ต้มยำกุ้ง' },
    { e: '🥗', n: 'ส้มตำ' },
  ];
  const HOMES = ['🏠', '🏡', '🏢', '🏘️'];
  // obstacles introduced as deliveries go up
  const NEWS = {
    2: '🚧 เริ่มมีถนนปิดซ่อม หาทางอ้อมนะ',
    3: '🔩 ถนนบางช่องหมุนไม่ได้แล้ว',
    4: '🚗 รถติด! ผ่านได้แต่ช้า',
    6: '🐕 ระวังหมาวิ่งขวางทาง',
    8: '🌧️ ระวังฝนตก เวลาจะเดินไวขึ้น',
    10: '📞 ลูกค้าอาจขอเปลี่ยนที่ส่งกลางทาง',
  };

  const $ = (id) => document.getElementById(id);
  const rnd = (n) => Math.floor(Math.random() * n);
  const pick = (a) => a[rnd(a.length)];
  const xy = (i) => [i % COLS, Math.floor(i / COLS)];
  const idx = (x, y) => y * COLS + x;
  const inside = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
  const rotMask = (m, r) => { for (let k = 0; k < ((r % 4) + 4) % 4; k++) m = ((m << 1) | (m >> 3)) & 15; return m; };
  const sfx = (n) => { try { if (window.SFX) window.SFX.play(n); } catch { /* no sound */ } };
  const track = (action, extra) => {
    if (typeof window.gtag === 'function') window.gtag('event', 'rider_rush', Object.assign({ game_action: action }, extra || {}));
  };
  const readBest = () => { try { return JSON.parse(localStorage.getItem(BEST_KEY)) || null; } catch { return null; } };
  const writeBest = (b) => { try { localStorage.setItem(BEST_KEY, JSON.stringify(b)); } catch { /* private mode */ } };

  const el = {
    hero: $('hero'), start: $('scrStart'), play: $('scrPlay'), over: $('scrOver'),
    board: $('board'), wrap: $('boardWrap'), toasts: $('toasts'),
    time: $('hudTime'), clock: $('clockBox'), score: $('hudScore'), count: $('hudCount'),
    ordEmo: $('ordEmo'), ordTitle: $('ordTitle'), ordSub: $('ordSub'),
    heat: $('heat'), heatBar: $('heatBar'), heatIcon: $('heatIcon'),
    countLayer: $('countLayer'), pauseLayer: $('pauseLayer'),
  };

  let G = null;
  let cellEls = [];
  let rider = null;

  /* ---------- cells ---------- */
  // road: {t:'road', base, r, lock, traffic} | block: {t:'block'} | spot: {t:'spot', kind, emo}
  function randomRoad() {
    const s = Math.random();
    const base = s < 0.42 ? SHAPE.I : s < 0.84 ? SHAPE.L : s < 0.97 ? SHAPE.T : SHAPE.X;
    return { t: 'road', base, r: rnd(4), lock: false, traffic: false };
  }
  const maskOf = (c) => (c.t === 'spot' ? 15 : c.t === 'road' ? rotMask(c.base, c.r) : 0);

  function buildBoard() {
    el.board.innerHTML = '';
    cellEls = [];
    for (let i = 0; i < SIZE; i++) {
      const b = document.createElement('button');
      const [x, y] = xy(i);
      b.type = 'button';
      b.className = 'rr-cell' + ((x + y) % 2 ? ' alt' : '');
      b.dataset.i = i;
      b.setAttribute('aria-label', `ช่อง ${x + 1},${y + 1}`);
      el.board.appendChild(b);
      cellEls.push(b);
    }
    rider = document.createElement('div');
    rider.className = 'rr-rider';
    rider.setAttribute('aria-hidden', 'true');
    rider.textContent = '🛵';
    el.board.appendChild(rider);
  }

  function cellHTML(c, i) {
    let h = '';
    if (c.t === 'block') h = '<span class="rr-ob">🚧</span>';
    else if (c.t === 'spot') h = `<span class="rr-pad"></span><span class="rr-spot">${c.emo}</span>`;
    else {
      let arms = '';
      for (const d of DIRS) if (c.base & d.b) arms += `<i class="${d.c}"></i>`;
      h = `<span class="rr-rd" style="transform:rotate(${c.r * 90}deg)">${arms}<i class="hub"></i></span>`;
      if (c.lock) h += '<span class="rr-lock">🔩</span>';
      if (c.traffic) h += '<span class="rr-car">🚗</span>';
    }
    if (G.dog && G.dog.i === i) h += '<span class="rr-dog">🐕</span>';
    return h;
  }

  function renderCell(i, lit) {
    const c = G.cells[i];
    const b = cellEls[i];
    const dog = G.dog && G.dog.i === i;
    const key = [c.t, c.base, c.lock, c.traffic, c.emo, dog].join('|');
    if (b.dataset.key !== key) {
      b.dataset.key = key;
      b.innerHTML = cellHTML(c, i);
    } else if (c.t === 'road') {
      b.firstChild.style.transform = `rotate(${c.r * 90}deg)`;
    }
    b.classList.toggle('block', c.t === 'block');
    b.classList.toggle('locked', c.t === 'road' && c.lock);
    b.classList.toggle('spot', c.t === 'spot');
    b.classList.toggle('goal', i === G.target);
    b.classList.toggle('lit', !!(lit && lit[i]));
    b.classList.toggle('hasdog', dog);
  }

  function renderAll() {
    const t = trace();
    for (let i = 0; i < SIZE; i++) renderCell(i, t.seen);
    return t;
  }

  function placeRider(i, instant) {
    const [x, y] = xy(i);
    if (instant) rider.classList.add('snap');
    rider.style.left = (x * 100) / COLS + '%';
    rider.style.top = (y * 100) / ROWS + '%';
    if (instant) { void rider.offsetWidth; rider.classList.remove('snap'); }
  }

  /* ---------- routes ---------- */
  // flood from the rider through matching road ends; reports whether the goal is reached
  function trace() {
    const prev = new Int16Array(SIZE).fill(-1);
    const seen = new Uint8Array(SIZE);
    const q = [G.rider];
    seen[G.rider] = 1;
    let found = false;
    while (q.length) {
      const i = q.shift();
      if (i === G.target) { found = true; break; }
      const [x, y] = xy(i);
      const m = maskOf(G.cells[i]);
      for (const d of DIRS) {
        if (!(m & d.b)) continue;
        const nx = x + d.dx, ny = y + d.dy;
        if (!inside(nx, ny)) continue;
        const j = idx(nx, ny);
        if (seen[j]) continue;
        const c = G.cells[j];
        if (c.t === 'block' || (G.dog && G.dog.i === j)) continue;
        if (c.t === 'spot' && j !== G.target) continue;
        if (!(maskOf(c) & d.o)) continue;
        seen[j] = 1;
        prev[j] = i;
        q.push(j);
      }
    }
    return { found, prev, seen };
  }

  // a winding route (random-weight shortest path) from -> to, ignoring obstacles
  function carve(from, to) {
    const w = Array.from({ length: SIZE }, () => 1 + Math.random() * 3);
    const dist = new Array(SIZE).fill(Infinity);
    const prev = new Array(SIZE).fill(-1);
    const done = new Uint8Array(SIZE);
    dist[from] = 0;
    for (;;) {
      let u = -1, best = Infinity;
      for (let i = 0; i < SIZE; i++) if (!done[i] && dist[i] < best) { best = dist[i]; u = i; }
      if (u < 0 || u === to) break;
      done[u] = 1;
      const [x, y] = xy(u);
      for (const d of DIRS) {
        const nx = x + d.dx, ny = y + d.dy;
        if (!inside(nx, ny)) continue;
        const j = idx(nx, ny);
        if (G.cells[j].t === 'spot' && j !== to) continue;
        if (dist[u] + w[j] < dist[j]) { dist[j] = dist[u] + w[j]; prev[j] = u; }
      }
    }
    const path = [];
    for (let i = to; i !== -1; i = prev[i]) path.unshift(i);
    // lay a road piece that can join each step, then scramble its rotation
    const dirTo = (a, b) => { const [ax, ay] = xy(a), [bx, by] = xy(b); return DIRS.find((d) => ax + d.dx === bx && ay + d.dy === by).b; };
    for (let k = 1; k < path.length - 1; k++) {
      const need = dirTo(path[k], path[k - 1]) | dirTo(path[k], path[k + 1]);
      const straight = need === (N | S) || need === (E | W);
      const base = straight ? (Math.random() < 0.85 ? SHAPE.I : SHAPE.T) : (Math.random() < 0.8 ? SHAPE.L : SHAPE.T);
      G.cells[path[k]] = { t: 'road', base, r: rnd(4), lock: false, traffic: false };
    }
    G.route = new Set(path);
    return path;
  }

  function scrambleUntilBroken(path) {
    for (let tries = 0; tries < 40 && trace().found; tries++) {
      const c = G.cells[path[1 + rnd(path.length - 2)]];
      if (c.t === 'road' && !c.lock) c.r += 1 + rnd(3);
    }
  }

  function chooseGoal() {
    const L = G.count;
    const dmin = Math.min(3 + Math.floor(L / 3), 8);
    const dmax = dmin + 3;
    const [rx, ry] = xy(G.rider);
    const ok = (lo, hi) => {
      const out = [];
      for (let i = 0; i < SIZE; i++) {
        if (i === G.rider || G.cells[i].t === 'spot') continue;
        const [x, y] = xy(i);
        const d = Math.abs(x - rx) + Math.abs(y - ry);
        if (d >= lo && d <= hi) out.push(i);
      }
      return out;
    };
    let list = ok(dmin, dmax);
    if (!list.length) list = ok(3, 99);
    return pick(list);
  }

  function placeObstacles() {
    const L = G.count;
    for (let i = 0; i < SIZE; i++) {
      const c = G.cells[i];
      if (c.t === 'block') G.cells[i] = randomRoad();
      else if (c.t === 'road') { c.lock = false; c.traffic = false; }
    }
    const free = () => {
      const out = [];
      for (let i = 0; i < SIZE; i++) if (G.cells[i].t === 'road' && !G.route.has(i) && !G.cells[i].lock) out.push(i);
      return out;
    };
    const take = (list, n, fn) => {
      for (let k = 0; k < n && list.length; k++) fn(list.splice(rnd(list.length), 1)[0]);
    };
    const blocks = L < 2 ? 0 : Math.min(9, 1 + Math.floor(L / 2));
    const locks = L < 3 ? 0 : Math.min(7, Math.floor((L - 1) / 2));
    const cars = L < 4 ? 0 : Math.min(5, 1 + Math.floor((L - 4) / 3));
    take(free(), blocks, (i) => { G.cells[i] = { t: 'block' }; });
    take(free(), locks, (i) => { G.cells[i].lock = true; });
    const roads = [];
    for (let i = 0; i < SIZE; i++) if (G.cells[i].t === 'road') roads.push(i);
    take(roads, cars, (i) => { G.cells[i].traffic = true; });
  }

  function newLeg() {
    if (G.from != null && G.from !== G.rider && G.cells[G.from].t === 'spot') G.cells[G.from] = randomRoad();
    G.from = G.rider;
    G.dog = null;
    const goal = chooseGoal();
    G.cells[goal] = G.leg === 'pickup'
      ? { t: 'spot', kind: 'shop', emo: G.order.e }
      : { t: 'spot', kind: 'home', emo: pick(HOMES) };
    G.target = goal;
    const path = carve(G.rider, goal);
    placeObstacles();
    scrambleUntilBroken(path);
    G.moveAt = G.leg === 'deliver' && G.count >= 10 && Math.random() < 0.3 ? G.clock + 4 + Math.random() * 5 : Infinity;
    renderOrder();
    renderAll();
  }

  /* ---------- order card / HUD ---------- */
  function renderOrder() {
    el.ordEmo.textContent = G.order.e;
    if (G.leg === 'pickup') {
      el.ordTitle.textContent = `ไปรับ${G.order.n}ที่ร้าน`;
      el.ordSub.textContent = 'ต่อถนนจาก 🛵 ไปที่ช่องสีเหลือง';
      el.heat.hidden = true;
    } else {
      el.ordTitle.textContent = `ส่ง${G.order.n}ให้ลูกค้า`;
      el.ordSub.textContent = 'รีบส่งก่อนข้าวเย็น!';
      el.heat.hidden = false;
    }
  }

  let lastSec = -1;
  function hud() {
    const sec = Math.ceil(G.time);
    el.time.textContent = sec;
    el.clock.classList.toggle('hurry', G.time <= 10);
    if (sec !== lastSec) {
      if (sec <= 5 && sec > 0 && lastSec !== -1) sfx('tick');
      lastSec = sec;
    }
    el.score.textContent = `฿${G.score}`;
    el.count.textContent = G.count;
    if (G.leg === 'deliver') {
      el.heatBar.style.width = G.warm + '%';
      el.heat.classList.toggle('cold', G.warm < 35);
      el.heatIcon.textContent = G.warm >= 35 ? '🔥' : G.warm > 0 ? '💨' : '🧊';
    }
  }

  function toast(text, kind) {
    const t = document.createElement('div');
    t.className = 'rr-toast' + (kind ? ' ' + kind : '');
    t.textContent = text;
    el.toasts.appendChild(t);
    while (el.toasts.children.length > 2) el.toasts.firstChild.remove();
    setTimeout(() => t.remove(), 2600);
  }

  function addTime(s) { G.time = Math.min(MAX_TIME, G.time + s); }

  /* ---------- play ---------- */
  function onTap(e) {
    const b = e.target.closest('.rr-cell');
    if (!b || !G || !G.running || G.busy || G.paused || G.counting) return;
    const i = +b.dataset.i;
    if (G.dog && G.dog.i === i) {
      G.dog.taps++;
      b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake');
      sfx('pop');
      if (G.dog.taps >= DOG_TAPS) { G.dog = null; toast('🐕 ไล่หมาไปแล้ว!'); afterChange(); }
      return;
    }
    const c = G.cells[i];
    if (c.t !== 'road') return;
    if (c.lock) { b.classList.remove('shake'); void b.offsetWidth; b.classList.add('shake'); sfx('wrong'); return; }
    c.r += 1;
    sfx('flip');
    afterChange();
  }

  function afterChange() {
    const t = renderAll();
    if (t.found) ride(t.prev);
  }

  // a lucky board can already link the rider to the goal: drive off without waiting for a tap
  function autoRide() {
    setTimeout(() => {
      if (!G || !G.running || G.busy || G.paused || G.counting) return;
      const t = trace();
      if (t.found) { toast('🍀 ทางโล่งพอดี! ซิ่งเลย'); ride(t.prev); }
    }, 450);
  }

  function ride(prev) {
    const steps = [];
    for (let i = G.target; i !== G.rider; i = prev[i]) steps.unshift(i);
    G.busy = true;
    el.wrap.classList.add('riding');
    sfx('go');
    let k = 0;
    const step = () => {
      if (!G.running) return;
      if (k >= steps.length) { arrive(); return; }
      const i = steps[k++];
      placeRider(i);
      let ms = STEP_MS;
      const c = G.cells[i];
      if (c.t === 'road' && c.traffic) {
        ms += TRAFFIC_MS;
        cellEls[i].classList.add('jam');
        sfx('buzz');
      }
      G.rideTimer = setTimeout(step, ms);
    };
    step();
  }

  function arrive() {
    el.wrap.classList.remove('riding');
    cellEls.forEach((b) => b.classList.remove('jam'));
    G.rider = G.target;
    if (G.leg === 'pickup') {
      G.leg = 'deliver';
      G.warm = 100;
      addTime(PICKUP_BONUS);
      sfx('coin');
      toast(`รับ${G.order.n}แล้ว! +${PICKUP_BONUS} วิ`);
    } else {
      const tip = 5 + Math.round(G.warm * 0.25);
      const bonus = Math.max(5, Math.round(11 - G.count * 0.25));
      G.score += tip;
      G.count++;
      addTime(bonus);
      sfx(G.warm >= 70 ? 'combo' : 'point');
      toast(`ทิป ฿${tip} · +${bonus} วิ`, 'good');
      toast(review(G.warm), 'review');
      const news = NEWS[G.count];
      if (news) setTimeout(() => G && G.running && toast(news, 'news'), 700);
      G.leg = 'pickup';
      G.order = pick(SHOPS.filter((s) => s !== G.order));
    }
    newLeg();
    G.busy = false;
    hud();
    autoRide();
  }

  function review(w) {
    if (w >= 70) return '⭐⭐⭐⭐⭐ ร้อนมาก! ไรเดอร์บินมาเหรอ';
    if (w >= 40) return '⭐⭐⭐⭐ ยังอุ่นอยู่ ขอบคุณครับ';
    if (w > 0) return '⭐⭐ เริ่มเย็นแล้วนะ…';
    return '⭐ เย็นเฉียบ ต้องเข้าไมโครเวฟก่อน';
  }

  function spawnDog() {
    const onRoute = [...G.route].filter((i) => i !== G.rider && i !== G.target && G.cells[i].t === 'road');
    const roads = [];
    for (let i = 0; i < SIZE; i++) if (G.cells[i].t === 'road' && i !== G.rider) roads.push(i);
    const list = onRoute.length && Math.random() < 0.65 ? onRoute : roads;
    if (!list.length) return;
    G.dog = { i: pick(list), taps: 0, until: G.clock + 9 };
    sfx('buzz');
    toast(`🐕 หมาขวางทาง! แตะ ${DOG_TAPS} ทีไล่ไป`, 'news');
    renderAll();
  }

  function moveCustomer() {
    G.moveAt = Infinity;
    G.cells[G.target] = randomRoad();
    G.dog = null;
    const goal = chooseGoal();
    G.cells[goal] = { t: 'spot', kind: 'home', emo: pick(HOMES) };
    G.target = goal;
    const path = carve(G.rider, goal);
    scrambleUntilBroken(path);
    addTime(3);
    sfx('notify');
    toast('📞 ลูกค้าขอเปลี่ยนที่ส่ง! +3 วิ', 'news');
    renderAll();
    autoRide();
  }

  function events() {
    const L = G.count;
    if (G.dog && G.clock >= G.dog.until) { G.dog = null; if (G.busy) renderAll(); else afterChange(); }
    if (!G.busy && L >= 6 && !G.dog && G.clock >= G.nextDog) {
      spawnDog();
      G.nextDog = G.clock + 10 + Math.random() * 7;
    }
    if (L >= 8 && G.clock >= G.nextRain && !G.raining) {
      G.raining = true;
      G.rainUntil = G.clock + 10;
      G.nextRain = G.clock + 30 + Math.random() * 12;
      el.wrap.classList.add('raining');
      sfx('notify');
      toast('🌧️ ฝนตก! เวลาเดินไวขึ้น', 'news');
    }
    if (G.raining && G.clock >= G.rainUntil) {
      G.raining = false;
      el.wrap.classList.remove('raining');
      toast('☀️ ฝนหยุดแล้ว');
    }
    if (!G.busy && G.clock >= G.moveAt) moveCustomer();
  }

  function frame(ts) {
    if (!G || !G.running) return;
    const dt = Math.min(0.1, (ts - (G.last || ts)) / 1000);
    G.last = ts;
    if (!G.paused && !G.counting) {
      G.clock += dt;
      G.time -= dt * (G.raining ? 1.5 : 1);
      if (G.leg === 'deliver') G.warm = Math.max(0, G.warm - dt * WARM_DECAY);
      events();
      if (G.time <= 0) { G.time = 0; hud(); gameOver(); return; }
      hud();
    }
    requestAnimationFrame(frame);
  }

  function show(scr) {
    for (const s of [el.start, el.play, el.over]) s.hidden = s !== scr;
    el.hero.hidden = scr === el.play;
  }

  function startGame() {
    clearTimeout(G && G.rideTimer);
    G = {
      cells: Array.from({ length: SIZE }, randomRoad),
      rider: 0, target: -1, from: null, route: new Set(),
      leg: 'pickup', order: pick(SHOPS), warm: 100,
      time: START_TIME, clock: 0, score: 0, count: 0,
      dog: null, nextDog: 0, raining: false, rainUntil: 0, nextRain: 0, moveAt: Infinity,
      running: true, busy: false, paused: false, counting: true, last: 0,
    };
    lastSec = -1;
    el.toasts.innerHTML = '';
    el.wrap.classList.remove('raining', 'riding');
    el.pauseLayer.hidden = true;
    show(el.play);
    buildBoard();
    G.rider = idx(rnd(COLS), ROWS - 1);
    G.cells[G.rider] = { t: 'spot', kind: 'base', emo: '' };
    placeRider(G.rider, true);
    newLeg();
    hud();
    el.play.scrollIntoView({ block: 'start', behavior: 'smooth' });
    track('start');
    countdown(['3', '2', '1', 'ไป!'], () => {
      G.counting = false;
      requestAnimationFrame(frame);
      autoRide();
    });
  }

  function countdown(seq, done) {
    el.countLayer.hidden = false;
    let k = 0;
    const next = () => {
      if (!G || !G.running) return;
      if (k >= seq.length) { el.countLayer.hidden = true; done(); return; }
      el.countLayer.innerHTML = `<b>${seq[k]}</b>`;
      sfx(k === seq.length - 1 ? 'go' : 'count');
      k++;
      setTimeout(next, k === seq.length ? 450 : 650);
    };
    next();
  }

  function rankOf(n) {
    if (n === 0) return 'ยังไม่ได้ส่งเลยสักออเดอร์ 😅';
    if (n < 5) return 'ไรเดอร์มือใหม่ 🛵';
    if (n < 10) return 'ไรเดอร์ขาประจำ ⭐';
    if (n < 20) return 'ไรเดอร์ดาวรุ่ง 🌟';
    if (n < 30) return 'ไรเดอร์ระดับตำนาน 🏆';
    return 'ไรเดอร์เทพเจ้าความเร็ว ⚡';
  }

  function gameOver() {
    G.running = false;
    clearTimeout(G.rideTimer);
    sfx('timeup');
    const best = readBest();
    const record = !best || G.score > best.score;
    if (record) writeBest({ score: G.score, count: G.count });
    $('shareBtn').textContent = 'แชร์ผล 📤';
    $('overScore').textContent = `฿${G.score}`;
    $('overCount').textContent = G.count;
    $('overRank').textContent = rankOf(G.count);
    $('overRecord').hidden = !record || G.score === 0;
    $('overBest').textContent = record ? '' : `สถิติสูงสุด ฿${best.score} · ส่ง ${best.count} ออเดอร์`;
    track('over', { score: G.score, deliveries: G.count });
    setTimeout(() => {
      show(el.over);
      if (record && G.score > 0) sfx('fanfare');
      el.over.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }, 900);
  }

  function renderBest() {
    const b = readBest();
    $('bestBox').textContent = b ? `🏆 สถิติสูงสุด ฿${b.score} · ส่ง ${b.count} ออเดอร์` : 'ยังไม่มีสถิติ ลองออกกะแรกเลย!';
  }

  function setPaused(p) {
    if (!G || !G.running || G.counting) return;
    G.paused = p;
    el.pauseLayer.hidden = !p;
    G.last = 0;
    if (!p) autoRide();
  }

  async function share() {
    const text = `🛵 ด่วนจี๋ทะลุแยก: ส่งได้ ${G.count} ออเดอร์ รายได้ ฿${G.score}\nมาแข่งกัน 👉 ${URL}`;
    track('share');
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
      await navigator.clipboard.writeText(text);
      $('shareBtn').textContent = 'คัดลอกแล้ว ✓';
    } catch { /* cancelled */ }
  }

  el.board.addEventListener('click', onTap);
  $('startBtn').addEventListener('click', startGame);
  $('againBtn').addEventListener('click', startGame);
  $('pauseBtn').addEventListener('click', () => setPaused(true));
  $('resumeBtn').addEventListener('click', () => setPaused(false));
  $('quitBtn').addEventListener('click', () => { el.pauseLayer.hidden = true; G.paused = false; G.time = 0; G.last = 0; hud(); gameOver(); });
  $('shareBtn').addEventListener('click', share);
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && G && G.running) setPaused(!G.paused);
  });
  renderBest();
})();

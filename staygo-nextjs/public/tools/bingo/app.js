// Bingo: an offline caller screen (wheel + rolling ball) and a 5x5 player card.
// Nothing is online: the caller announces numbers out loud and players mark their own cards.
(function () {
  const $ = (id) => document.getElementById(id);
  const sfx = (n) => window.SFX?.play(n);
  const LETTERS = ['B', 'I', 'N', 'G', 'O'];
  const letterOf = (n) => LETTERS[Math.floor((n - 1) / 15)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  const KEY_CARD = 'staygo-bingo-card';
  const KEY_CALL = 'staygo-bingo-caller';
  // Two-tap confirm inside the page: in-app browsers (LINE, embedded views) often block confirm() and return false.
  function confirmTap(btn, ask, run) {
    if (btn.dataset.armed) { clearTimeout(btn._t); delete btn.dataset.armed; btn.textContent = btn._label; btn.classList.remove('red'); run(); return; }
    btn._label = btn.textContent;
    btn.dataset.armed = '1';
    btn.textContent = ask;
    btn.classList.add('red');
    sfx('notify');
    btn._t = setTimeout(() => { delete btn.dataset.armed; btn.textContent = btn._label; btn.classList.remove('red'); }, 3000);
  }
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- screens ----------
  function show(role) {
    $('scrRole').hidden = !!role;
    $('hero').hidden = !!role;
    $('scrPlayer').hidden = role !== 'player';
    $('scrCaller').hidden = role !== 'caller';
    if (role === 'player') renderCard();
    if (role === 'caller') { renderCaller(); keepAwake(); }
    window.scrollTo(0, 0);
  }
  function route() {
    const r = location.hash.slice(1);
    show(r === 'player' || r === 'caller' ? r : null);
  }
  document.querySelectorAll('[data-role]').forEach((b) =>
    b.addEventListener('click', () => { sfx('select'); location.hash = b.dataset.role; }));
  document.querySelectorAll('[data-back]').forEach((b) =>
    b.addEventListener('click', () => { sfx('back'); history.replaceState(null, '', location.pathname); route(); }));
  addEventListener('hashchange', route);

  let wakeLock = null;
  async function keepAwake() {
    try { if (!wakeLock && navigator.wakeLock) wakeLock = await navigator.wakeLock.request('screen'); wakeLock?.addEventListener('release', () => { wakeLock = null; }); } catch {}
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('scrCaller').hidden) keepAwake(); });

  // ---------- player card ----------
  // Column c holds 5 different numbers from c*15+1 .. c*15+15; the centre is a free star.
  function newCard() {
    const nums = new Array(25);
    for (let c = 0; c < 5; c++) {
      const pick = shuffle(Array.from({ length: 15 }, (_, i) => c * 15 + i + 1)).slice(0, 5);
      for (let r = 0; r < 5; r++) nums[r * 5 + c] = pick[r];
    }
    nums[12] = 0;
    const marks = new Array(25).fill(false);
    marks[12] = true;
    return { nums, marks };
  }
  let card = store.get(KEY_CARD, null);
  if (!card || !Array.isArray(card.nums) || card.nums.length !== 25) { card = newCard(); store.set(KEY_CARD, card); }

  const LINES = [];
  for (let r = 0; r < 5; r++) LINES.push({ cells: [0, 1, 2, 3, 4].map((c) => r * 5 + c), x1: 8, y1: r * 100 + 50, x2: 492, y2: r * 100 + 50 });
  for (let c = 0; c < 5; c++) LINES.push({ cells: [0, 1, 2, 3, 4].map((r) => r * 5 + c), x1: c * 100 + 50, y1: 8, x2: c * 100 + 50, y2: 492 });
  LINES.push({ cells: [0, 6, 12, 18, 24], x1: 14, y1: 14, x2: 486, y2: 486 });
  LINES.push({ cells: [4, 8, 12, 16, 20], x1: 486, y1: 14, x2: 14, y2: 486 });
  const doneLines = () => LINES.filter((l) => l.cells.every((i) => card.marks[i]));

  function renderCard() {
    const grid = $('grid');
    grid.innerHTML = '';
    card.nums.forEach((n, i) => {
      const cell = document.createElement('div');
      cell.className = 'bg-cell';
      const b = document.createElement('button');
      b.type = 'button';
      if (i === 12) { b.className = 'bg-free on'; b.innerHTML = '<span>⭐</span><small>FREE</small>'; b.disabled = true; b.setAttribute('aria-label', 'ช่องฟรี'); }
      else {
        b.textContent = n;
        b.classList.toggle('on', card.marks[i]);
        b.setAttribute('aria-pressed', card.marks[i]);
        b.addEventListener('click', () => toggle(i, b));
      }
      cell.appendChild(b);
      grid.appendChild(cell);
    });
    drawStrikes(false);
  }
  function toggle(i, b) {
    const before = doneLines().length;
    card.marks[i] = !card.marks[i];
    store.set(KEY_CARD, card);
    b.classList.toggle('on', card.marks[i]);
    b.setAttribute('aria-pressed', card.marks[i]);
    sfx(card.marks[i] ? 'tap' : 'back');
    const after = doneLines().length;
    drawStrikes(after > before);
    if (after > before) { sfx('fanfare'); bingoBanner(); }
  }
  function drawStrikes(animateNew) {
    const svg = $('strikes');
    const prev = new Set([...svg.querySelectorAll('line')].map((l) => l.dataset.k));
    svg.innerHTML = '';
    const lines = doneLines();
    for (const l of lines) {
      const k = l.cells.join('-');
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      el.setAttribute('x1', l.x1); el.setAttribute('y1', l.y1); el.setAttribute('x2', l.x2); el.setAttribute('y2', l.y2);
      el.dataset.k = k;
      if (animateNew && !prev.has(k) && !reduce) el.classList.add('draw');
      svg.appendChild(el);
    }
    const n = lines.length;
    $('lineCount').textContent = n ? `ครบ ${n} แถว` : '';
  }
  let bannerT;
  function bingoBanner() {
    const el = $('bingoBanner');
    el.hidden = false;
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
    clearTimeout(bannerT);
    bannerT = setTimeout(() => { el.hidden = true; }, 2600);
  }
  $('newCard').addEventListener('click', (e) => {
    const go = () => newCardNow();
    if (card.marks.some((m, i) => m && i !== 12)) confirmTap(e.currentTarget, 'กดอีกครั้งเพื่อสุ่มการ์ดใหม่ (วงที่ทำไว้จะหาย)', go);
    else go();
  });
  function newCardNow() {
    card = newCard(); store.set(KEY_CARD, card);
    $('bingoBanner').hidden = true;
    sfx('shuffle');
    renderCard();
    $('grid').classList.remove('deal'); void $('grid').offsetWidth; $('grid').classList.add('deal');
  }

  // ---------- caller ----------
  // drawn: numbers in the order they came out; pending: the last one is still a closed ball in the tray.
  let call = store.get(KEY_CALL, null);
  if (!call || !Array.isArray(call.drawn)) call = { drawn: [], pending: false };
  let busy = false;

  // the wheel holds one little ball per number still inside
  function fillWheel() {
    const wheel = $('wheel');
    wheel.innerHTML = '';
    const left = 75 - call.drawn.length;
    const shown = Math.min(left, 34);
    for (let i = 0; i < shown; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 38;
      const d = document.createElement('i');
      d.className = 'bg-mini L' + (i % 5);
      d.style.left = 50 + Math.cos(a) * r + '%';
      d.style.top = 50 + Math.sin(a) * r + '%';
      wheel.appendChild(d);
    }
  }
  function setBall(n, open) {
    const ball = $('ball');
    ball.hidden = n == null;
    $('trayHint').hidden = n != null;
    if (n == null) return;
    ball.className = 'bg-ball L' + LETTERS.indexOf(letterOf(n)) + (open ? ' open' : '');
    ball.querySelector('small').textContent = letterOf(n);
    ball.querySelector('b').textContent = n;
    ball.setAttribute('aria-label', open ? `${letterOf(n)} ${n}` : 'กดเปิดลูกบอล');
  }
  function renderCaller() {
    fillWheel();
    const last = call.drawn[call.drawn.length - 1];
    setBall(last ?? null, !call.pending);
    if (!call.drawn.length) $('trayHint').textContent = 'กดหมุนเพื่อสุ่มลูกบอล';
    renderBoard();
    updateSpin();
  }
  function opened() { return call.pending ? call.drawn.slice(0, -1) : call.drawn; }
  function renderBoard() {
    const seen = opened();
    const set = new Set(seen);
    const latest = seen[seen.length - 1];
    const board = $('board');
    board.innerHTML = '';
    LETTERS.forEach((L, c) => {
      const row = document.createElement('div');
      row.className = 'bg-brow';
      row.innerHTML = `<b class="L${c}">${L}</b>`;
      for (let k = 1; k <= 15; k++) {
        const n = c * 15 + k;
        const s = document.createElement('span');
        s.textContent = n;
        if (set.has(n)) s.className = 'on L' + c + (n === latest ? ' latest' : '');
        row.appendChild(s);
      }
      board.appendChild(row);
    });
    const recent = $('recent');
    recent.innerHTML = '';
    seen.slice(-6).reverse().forEach((n, i) => {
      const d = document.createElement('div');
      d.className = 'bg-rball L' + LETTERS.indexOf(letterOf(n)) + (i === 0 ? ' big' : '');
      d.innerHTML = `<small>${letterOf(n)}</small><b>${n}</b>`;
      recent.appendChild(d);
    });
    if (!seen.length) recent.innerHTML = '<p class="tl-hint" style="margin:0">ยังไม่มีเลขออก</p>';
    $('calledCount').textContent = `ออกแล้ว ${seen.length}/75`;
  }
  function updateSpin() {
    const btn = $('spinBtn');
    const done = call.drawn.length >= 75 && !call.pending;
    btn.disabled = busy || call.pending || done;
    btn.textContent = done ? 'ครบ 75 ลูกแล้ว 🎉' : call.pending ? '👆 กดเปิดลูกบอลก่อน' : '🎡 หมุน!';
  }

  function spin() {
    if (busy || call.pending || call.drawn.length >= 75) return;
    busy = true;
    const left = [];
    for (let n = 1; n <= 75; n++) if (!call.drawn.includes(n)) left.push(n);
    const n = left[Math.floor(Math.random() * left.length)];
    call.drawn.push(n);
    call.pending = true;
    store.set(KEY_CALL, call);
    setBall(null);
    $('trayHint').textContent = 'กำลังหมุน…';
    $('trayHint').hidden = false;
    updateSpin();

    const cage = $('cage');
    const spinMs = reduce ? 200 : 1700;
    cage.classList.add('spinning');
    let ticks = 0;
    const tickT = setInterval(() => { if (ticks++ < 14) sfx('spin'); }, 110);
    setTimeout(() => {
      clearInterval(tickT);
      cage.classList.remove('spinning');
      fillWheel();
      rollBall(n);
    }, spinMs);
  }

  // the ball leaves the bottom of the wheel, rolls down the chute and bounces into the tray
  function rollBall(n) {
    setBall(n, false);
    const ball = $('ball');
    const done = () => { busy = false; updateSpin(); sfx('land'); ball.focus({ preventScroll: true }); };
    if (reduce) return done();
    const cage = $('cage').getBoundingClientRect();
    const b = ball.getBoundingClientRect();
    const sx = cage.left + cage.width * 0.5 - (b.left + b.width / 2);
    const sy = cage.top + cage.height * 0.88 - (b.top + b.height / 2);
    const chute = document.querySelector('.bg-chute').getBoundingClientRect();
    const mx = chute.right - 10 - (b.left + b.width / 2);
    const my = chute.top + chute.height / 2 - (b.top + b.height / 2);
    sfx('whoosh');
    const anim = ball.animate([
      { transform: `translate(${sx}px, ${sy}px) rotate(0deg) scale(.55)`, offset: 0 },
      { transform: `translate(${mx}px, ${my}px) rotate(300deg) scale(.8)`, offset: 0.45, easing: 'ease-in' },
      { transform: 'translate(0, 0) rotate(720deg) scale(1)', offset: 0.78, easing: 'ease-in' },
      { transform: 'translate(0, -26px) rotate(780deg) scale(1)', offset: 0.88, easing: 'ease-out' },
      { transform: 'translate(0, 0) rotate(800deg) scale(1)', offset: 1, easing: 'ease-in' },
    ], { duration: 1300, fill: 'none' });
    setTimeout(() => sfx('bounce'), 1000);
    anim.onfinish = done;
  }

  function openBall() {
    if (!call.pending || busy) return;
    call.pending = false;
    store.set(KEY_CALL, call);
    const n = call.drawn[call.drawn.length - 1];
    setBall(n, true);
    sfx('reveal');
    renderBoard();
    updateSpin();
  }

  $('spinBtn').addEventListener('click', spin);
  $('ball').addEventListener('click', openBall);
  $('resetCaller').addEventListener('click', (e) => {
    if (busy || !call.drawn.length) return;
    confirmTap(e.currentTarget, 'กดอีกครั้งเพื่อล้างเลขทั้งหมด', () => {
      call = { drawn: [], pending: false };
      store.set(KEY_CALL, call);
      sfx('shuffle');
      renderCaller();
    });
  });
  addEventListener('keydown', (e) => {
    if ($('scrCaller').hidden || e.target.closest?.('input, textarea')) return;
    if (e.code === 'Space' || e.key === 'Enter') {
      if (e.target.closest?.('button') && e.key === 'Enter') return; // let Enter press the focused button
      e.preventDefault();
      call.pending ? openBall() : spin();
    }
  });

  route();
})();

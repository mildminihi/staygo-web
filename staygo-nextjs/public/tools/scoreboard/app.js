// Scoreboard: players or teams with big − / + buttons. One step setting (1 / 5 / 10) drives every
// card, every change can be undone, and the whole board is kept in localStorage so a refresh or a
// closed tab never loses the scores. Teams from the team randomizer arrive via ?fromTeams=true.
(function () {
  const $ = (id) => document.getElementById(id);
  const sfx = (n) => window.SFX?.play(n);
  const KEY = 'staygo-scoreboard';
  const COLORS = ['#e8202a', '#1a9bf0', '#ffc21a', '#22b573', '#8b5cf6', '#ff7a1a', '#ec4899', '#14b8a6'];
  const TEAM_NAMES = ['ทีมแดง', 'ทีมน้ำเงิน', 'ทีมเหลือง', 'ทีมเขียว', 'ทีมม่วง', 'ทีมส้ม'];
  const STEPS = [1, 5, 10];
  const MAX = 20;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const store = {
    get() { try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} },
  };
  // board: { players:[{id,name,color,members?,score}], step, history:[{id,d}], nextId }
  let board = store.get();
  if (!board || !Array.isArray(board.players)) board = { players: [], step: 1, history: [], nextId: 1 };
  const save = () => store.set(board);

  /** Dark text on light colours (yellow), white on the rest. */
  function inkOn(hex) {
    const hsl = /^hsl\(\s*[\d.]+,\s*[\d.]+%,\s*([\d.]+)%\)$/i.exec(hex || ''); // team randomizer colours
    if (hsl) return +hsl[1] >= 58 ? '#1d1b2e' : '#fff';
    const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || '');
    if (!m) return '#fff';
    const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16));
    return 0.299 * r + 0.587 * g + 0.114 * b > 170 ? '#1d1b2e' : '#fff';
  }
  const nextColor = (list) => COLORS.find((c) => !list.some((p) => p.color === c)) || COLORS[list.length % COLORS.length];

  // ---------------------------------------------------------------- screens
  function show(scr) {
    $('scrSetup').hidden = scr !== 'setup';
    $('scrPlay').hidden = scr !== 'play';
    $('hero').hidden = scr === 'play'; // more room for the cards while scoring
    window.scrollTo(0, 0);
  }

  // ---------------------------------------------------------------- setup
  // draft: the rows being edited. Editing an existing board keeps each player's id (and score).
  let draft = [];
  function openSetup() {
    draft = board.players.length
      ? board.players.map((p) => ({ id: p.id, name: p.name, color: p.color, members: p.members }))
      : [{ name: '', color: COLORS[0] }, { name: '', color: COLORS[1] }];
    $('startBtn').textContent = board.players.length ? '✓ บันทึกแล้วนับต่อ' : '▶ เริ่มนับคะแนน';
    $('cancelEdit').hidden = !board.players.length;
    renderDraft();
    show('setup');
  }
  function renderDraft(focus) {
    const list = $('rows');
    list.innerHTML = draft
      .map(
        (r, i) => `<div class="sb-row">
          <button class="sb-swatch" data-color="${i}" style="--c:${r.color}" aria-label="เปลี่ยนสี"></button>
          <input class="sg-input" data-name="${i}" maxlength="30" placeholder="ผู้เล่น ${i + 1}" />
          <button class="sb-del" data-del="${i}" aria-label="ลบ" ${draft.length <= 1 ? 'disabled' : ''}>✕</button>
        </div>`,
      )
      .join('');
    list.querySelectorAll('[data-name]').forEach((inp) => (inp.value = draft[+inp.dataset.name].name));
    $('addRow').disabled = draft.length >= MAX;
    if (focus != null) list.querySelector(`[data-name="${focus}"]`)?.focus();
  }
  $('rows').addEventListener('input', (e) => {
    const i = e.target.dataset.name;
    if (i != null) draft[+i].name = e.target.value;
  });
  $('rows').addEventListener('keydown', (e) => {
    const i = e.target.dataset.name;
    if (i == null || e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    if (+i < draft.length - 1) $('rows').querySelector(`[data-name="${+i + 1}"]`)?.focus();
    else if (draft.length < MAX) addRow();
    else start();
  });
  $('rows').addEventListener('click', (e) => {
    const c = e.target.closest('[data-color]');
    if (c) {
      const r = draft[+c.dataset.color];
      r.color = COLORS[(COLORS.indexOf(r.color) + 1) % COLORS.length];
      c.style.setProperty('--c', r.color);
      sfx('tap');
      return;
    }
    const d = e.target.closest('[data-del]');
    if (d && draft.length > 1) {
      draft.splice(+d.dataset.del, 1);
      sfx('back');
      renderDraft();
    }
  });
  function addRow() {
    draft.push({ name: '', color: nextColor(draft) });
    sfx('pop');
    renderDraft(draft.length - 1);
  }
  $('addRow').addEventListener('click', addRow);
  $('presets').addEventListener('click', (e) => {
    const b = e.target.closest('[data-teams]');
    if (!b) return;
    const n = +b.dataset.teams;
    draft = TEAM_NAMES.slice(0, n).map((name, i) => ({ name: window.STAYGO_I18N ? STAYGO_I18N.t(name) : name, color: COLORS[i] }));
    sfx('select');
    renderDraft();
  });

  function start() {
    const old = new Map(board.players.map((p) => [p.id, p]));
    board.players = draft.map((r, i) => {
      const prev = r.id != null ? old.get(r.id) : null;
      return {
        id: prev ? prev.id : board.nextId++,
        name: r.name.trim() || (window.STAYGO_I18N ? STAYGO_I18N.t(`ผู้เล่น ${i + 1}`) : `ผู้เล่น ${i + 1}`),
        color: r.color,
        ink: prev && prev.color === r.color ? prev.ink : undefined,
        members: r.members,
        score: prev ? prev.score : 0,
      };
    });
    const ids = new Set(board.players.map((p) => p.id));
    board.history = board.history.filter((h) => ids.has(h.id));
    save();
    sfx('go');
    renderPlay();
    show('play');
  }
  $('startBtn').addEventListener('click', start);
  $('cancelEdit').addEventListener('click', () => { sfx('back'); renderPlay(); show('play'); });

  // ---------------------------------------------------------------- play
  function ranks() {
    const scores = board.players.map((p) => p.score);
    return board.players.map((p) => 1 + scores.filter((s) => s > p.score).length);
  }
  function renderSteps() {
    $('steps').innerHTML = STEPS.map((s) => `<button data-step="${s}" class="${board.step === s ? 'on' : ''}">${s}</button>`).join('');
  }
  function renderPlay() {
    renderSteps();
    const rk = ranks();
    const lead = board.players.length > 1 && board.players.some((p) => p.score > 0);
    const s = board.step;
    $('cards').innerHTML = board.players
      .map((p, i) => {
        const crown = lead && rk[i] === 1;
        return `<article class="sb-card${crown ? ' lead' : ''}" style="--c:${p.color};--t:${p.ink || inkOn(p.color)}" data-id="${p.id}">
          <header class="sb-head">
            <span class="sb-rank">${crown ? '👑' : rk[i]}</span>
            <b class="sb-name" data-i18n-skip>${esc(p.name)}</b>
          </header>
          ${p.members?.length ? `<div class="sb-members" data-i18n-skip>${p.members.map((m) => `<span>${esc(m)}</span>`).join('')}</div>` : ''}
          <div class="sb-score tl-num"><span data-score>${p.score}</span></div>
          <div class="sb-ctrl">
            <button class="sb-minus" data-d="-1" aria-label="ลด ${s} คะแนน">−${s}</button>
            <button class="sb-plus" data-d="1" aria-label="เพิ่ม ${s} คะแนน">+${s}</button>
          </div>
        </article>`;
      })
      .join('');
    $('cards').toggleAttribute('data-many', board.players.length >= 3);
    $('undoBtn').disabled = !board.history.length;
  }
  function change(id, d, quiet) {
    const p = board.players.find((x) => x.id === id);
    if (!p) return;
    p.score += d;
    if (!quiet) {
      board.history.push({ id, d });
      if (board.history.length > 200) board.history.shift();
      sfx(d > 0 ? (d >= 5 ? 'coin' : 'point') : 'minus');
      navigator.vibrate?.(10);
    }
    save();
    renderPlay();
    popAt(id, d);
  }
  /** Floating "+5" over the score that just changed. */
  function popAt(id, d) {
    const card = $('cards').querySelector(`[data-id="${id}"] .sb-score`);
    if (!card) return;
    const el = document.createElement('i');
    el.className = `sb-pop ${d > 0 ? 'up' : 'down'}`;
    el.textContent = d > 0 ? `+${d}` : `−${-d}`;
    card.appendChild(el);
    card.querySelector('[data-score]').classList.add('bump');
    setTimeout(() => el.remove(), 800);
  }
  $('cards').addEventListener('click', (e) => {
    const b = e.target.closest('[data-d]');
    if (!b) return;
    change(+b.closest('[data-id]').dataset.id, +b.dataset.d * board.step);
  });
  $('steps').addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    board.step = +b.dataset.step;
    save();
    sfx('select');
    renderPlay();
  });
  $('undoBtn').addEventListener('click', () => {
    const h = board.history.pop();
    if (!h) return;
    sfx('back');
    change(h.id, -h.d, true);
  });

  // two taps to confirm (confirm() is blocked in LINE and other in-app browsers)
  function confirmTap(btn, ask, run) {
    if (btn.dataset.armed) {
      clearTimeout(btn._t);
      delete btn.dataset.armed;
      btn.textContent = btn._label;
      btn.classList.remove('red');
      run();
      return;
    }
    btn._label = btn.textContent;
    btn.dataset.armed = '1';
    btn.textContent = ask;
    btn.classList.add('red');
    sfx('notify');
    btn._t = setTimeout(() => {
      delete btn.dataset.armed;
      btn.textContent = btn._label;
      btn.classList.remove('red');
    }, 3000);
  }
  $('zeroBtn').addEventListener('click', (e) => {
    if (!board.players.some((p) => p.score)) return;
    confirmTap(e.currentTarget, 'แตะอีกครั้งเพื่อล้างคะแนน', () => {
      board.players.forEach((p) => (p.score = 0));
      board.history = [];
      save();
      sfx('shuffle');
      renderPlay();
    });
  });
  $('newBtn').addEventListener('click', (e) => {
    confirmTap(e.currentTarget, 'แตะอีกครั้งเพื่อเริ่มเกมใหม่', () => {
      board = { players: [], step: board.step, history: [], nextId: 1 };
      save();
      openSetup();
    });
  });
  $('editBtn').addEventListener('click', () => { sfx('tap'); openSetup(); });

  // ---------------------------------------------------------------- summary
  const MEDALS = ['🥇', '🥈', '🥉'];
  $('summaryBtn').addEventListener('click', () => {
    const rk = ranks();
    const rows = board.players.map((p, i) => ({ ...p, rank: rk[i] })).sort((a, b) => a.rank - b.rank);
    $('ranking').innerHTML = rows
      .map(
        (p) => `<li class="r${p.rank}" style="--c:${p.color}">
          <span class="sb-medal">${MEDALS[p.rank - 1] || p.rank}</span>
          <b data-i18n-skip>${esc(p.name)}</b>
          <span class="tl-num">${p.score}</span>
        </li>`,
      )
      .join('');
    $('summary').hidden = false;
    sfx('fanfare');
  });
  const closeSummary = () => ($('summary').hidden = true);
  $('closeSummary').addEventListener('click', closeSummary);
  $('summary').addEventListener('click', (e) => { if (e.target === $('summary')) closeSummary(); });

  // ---------------------------------------------------------------- big screen
  const setBig = (on) => {
    document.body.classList.toggle('tl-big', on);
    $('exitBig').hidden = !on;
  };
  $('bigBtn').addEventListener('click', () => setBig(true));
  $('exitBig').addEventListener('click', () => setBig(false));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { setBig(false); closeSummary(); }
    if (e.target.closest?.('input, textarea') || $('scrPlay').hidden) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); $('undoBtn').click(); }
  });

  // ---------------------------------------------------------------- boot
  // teams sent over from the team randomizer replace the current board
  if (new URLSearchParams(location.search).get('fromTeams') === 'true') {
    try {
      const teams = JSON.parse(localStorage.getItem('scoreboardTeams') || 'null');
      if (Array.isArray(teams) && teams.length) {
        board = {
          players: teams.slice(0, MAX).map((t, i) => ({ id: i + 1, name: t.name, color: t.color || COLORS[i % COLORS.length], ink: t.ink, members: t.members, score: 0 })),
          step: board.step || 1,
          history: [],
          nextId: teams.length + 1,
        };
        save();
      }
      localStorage.removeItem('scoreboardTeams');
    } catch {}
    history.replaceState(null, '', location.pathname);
  }
  if (!STEPS.includes(board.step)) board.step = 1;
  if (board.players.length) { renderPlay(); show('play'); } else openSetup();
})();

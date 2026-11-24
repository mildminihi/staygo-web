// Guess from clues: the host writes an answer plus any number of clues per round,
// then reveals the clue cards one at a time on a big screen. Scoring is up to the players.
(function () {
  const $ = (id) => document.getElementById(id);
  const sfx = (n) => window.SFX?.play(n);
  const KEY = 'staygo-clue-reveal';
  const store = {
    get(d) { try { return JSON.parse(localStorage.getItem(KEY)) ?? d; } catch { return d; } },
    set(v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch {} },
  };
  const blankRound = () => ({ q: '', answer: '', clues: ['', '', ''] });
  let data = store.get(null);
  if (!data || !Array.isArray(data.rounds) || !data.rounds.length) data = { rounds: [blankRound()], shuffle: false };
  const save = () => store.set(data);

  const SAMPLE = [
    { q: 'สัตว์ชนิดนี้คืออะไร?', answer: 'ช้าง', clues: ['เป็นสัตว์เลี้ยงลูกด้วยนม', 'ตัวใหญ่มาก', 'มีงา', 'เป็นสัตว์ประจำชาติไทย', 'ใช้จมูกหยิบของได้'] },
    { q: 'อาหารนี้คืออะไร?', answer: 'ส้มตำ', clues: ['เป็นอาหารอีสาน', 'ใช้ครกกับสาก', 'มีรสเปรี้ยว เค็ม หวาน เผ็ด', 'วัตถุดิบหลักคือมะละกอ'] },
    { q: 'บอร์ดเกมนี้คืออะไร?', answer: 'UNO', clues: ['เล่นด้วยไพ่', 'มีไพ่ 4 สี', 'มีการ์ด +4', 'ต้องตะโกนตอนเหลือไพ่ใบเดียว'] },
  ];

  // ---------- setup editor ----------
  const isPlayable = (r) => r.answer.trim() && r.clues.some((c) => c.trim());
  function renderEditor() {
    const wrap = $('rounds');
    wrap.innerHTML = '';
    data.rounds.forEach((r, ri) => {
      const p = document.createElement('div');
      p.className = 'sg-panel tl-stack cr-round';
      p.innerHTML = `
        <div class="cr-roundhead"><b>ข้อ ${ri + 1}</b><button class="cr-x" data-del aria-label="ลบข้อนี้">✕</button></div>
        <label><span class="tl-label">โจทย์</span><input class="sg-input" data-f="q" maxlength="80" placeholder="เช่น คุณสมบัตินี้คือใคร?" /></label>
        <label><span class="tl-label">คำเฉลย</span><input class="sg-input" data-f="answer" maxlength="60" placeholder="เช่น มายด์" /></label>
        <div><span class="tl-label">คุณสมบัติ (ป้ายใบ้)</span><div class="cr-clues"></div></div>
        <button class="sg-btn small" data-addclue>＋ เพิ่มคุณสมบัติ</button>`;
      p.querySelector('[data-f="q"]').value = r.q;
      p.querySelector('[data-f="answer"]').value = r.answer;
      p.querySelectorAll('[data-f]').forEach((inp) => inp.addEventListener('input', () => { r[inp.dataset.f] = inp.value; save(); updateStart(); }));
      const list = p.querySelector('.cr-clues');
      r.clues.forEach((c, ci) => list.appendChild(clueRow(r, ri, ci)));
      p.querySelector('[data-addclue]').addEventListener('click', () => addClue(ri, r.clues.length));
      p.querySelector('[data-del]').addEventListener('click', () => {
        const filled = r.q.trim() || r.answer.trim() || r.clues.some((c) => c.trim());
        if (filled && !p.classList.contains('armed')) { armDelete(p); return; }
        data.rounds.splice(ri, 1);
        if (!data.rounds.length) data.rounds.push(blankRound());
        save(); sfx('back'); renderEditor();
      });
      wrap.appendChild(p);
    });
    $('shuffleClues').checked = !!data.shuffle;
    updateStart();
  }
  // a filled round needs a second tap on ✕ (confirm() is blocked in many in-app browsers)
  function armDelete(p) {
    p.classList.add('armed');
    const x = p.querySelector('[data-del]');
    x.textContent = 'กดอีกครั้งเพื่อลบ';
    sfx('notify');
    setTimeout(() => { p.classList.remove('armed'); x.textContent = '✕'; }, 3000);
  }
  function clueRow(r, ri, ci) {
    const row = document.createElement('div');
    row.className = 'cr-cluerow';
    row.innerHTML = `<span class="cr-num">${ci + 1}</span><input class="sg-input" maxlength="120" placeholder="เช่น เป็นผู้ชาย" /><button class="cr-x" aria-label="ลบคุณสมบัตินี้">✕</button>`;
    const inp = row.querySelector('input');
    inp.value = r.clues[ci];
    inp.addEventListener('input', () => { r.clues[ci] = inp.value; save(); updateStart(); });
    // Enter jumps to the next clue, adding one at the end
    inp.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' || e.isComposing) return;
      e.preventDefault();
      if (ci === r.clues.length - 1) addClue(ri, ci + 1);
      else focusClue(ri, ci + 1);
    });
    row.querySelector('button').addEventListener('click', () => {
      r.clues.splice(ci, 1);
      if (!r.clues.length) r.clues.push('');
      save(); sfx('back'); renderEditor();
    });
    return row;
  }
  function focusClue(ri, ci) {
    $('rounds').children[ri]?.querySelectorAll('.cr-cluerow input')[ci]?.focus();
  }
  function addClue(ri, at) {
    data.rounds[ri].clues.splice(at, 0, '');
    save(); sfx('pop'); renderEditor(); focusClue(ri, at);
  }
  function updateStart() {
    const n = data.rounds.filter(isPlayable).length;
    const skipped = data.rounds.length - n;
    $('startBtn').disabled = !n;
    $('startNote').textContent = !n
      ? 'ใส่คำเฉลยและคุณสมบัติอย่างน้อย 1 ข้อก่อนเริ่มเกม'
      : skipped ? `จะเล่น ${n} ข้อ (ข้าม ${skipped} ข้อที่ยังไม่มีคำเฉลยหรือคุณสมบัติ)` : `พร้อมเล่น ${n} ข้อ`;
  }
  $('addRound').addEventListener('click', () => {
    data.rounds.push(blankRound()); save(); sfx('pop'); renderEditor();
    $('rounds').lastElementChild?.querySelector('[data-f="q"]')?.focus();
  });
  $('sample').addEventListener('click', () => {
    const empty = data.rounds.every((r) => !r.q.trim() && !r.answer.trim() && !r.clues.some((c) => c.trim()));
    const copy = SAMPLE.map((r) => ({ ...r, clues: r.clues.slice() }));
    data.rounds = empty ? copy : data.rounds.concat(copy);
    save(); sfx('sparkle'); renderEditor();
  });
  $('shuffleClues').addEventListener('change', (e) => { data.shuffle = e.target.checked; save(); });

  // ---------- play ----------
  let game = null; // { rounds, idx, opened:Set, revealed }
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  function show(scr) {
    ['scrSetup', 'scrPlay', 'scrEnd'].forEach((s) => { $(s).hidden = s !== scr; });
    $('hero').hidden = scr === 'scrPlay';
    window.scrollTo(0, 0);
  }
  function startGame() {
    const rounds = data.rounds.filter(isPlayable).map((r) => {
      const clues = r.clues.map((c) => c.trim()).filter(Boolean);
      return { q: r.q.trim(), own: !!r.q.trim(), answer: r.answer.trim(), clues: data.shuffle ? shuffle(clues) : clues };
    });
    if (!rounds.length) return;
    game = { rounds, idx: 0 };
    sfx('go');
    show('scrPlay');
    loadRound();
  }
  function loadRound() {
    const r = game.rounds[game.idx];
    game.opened = new Set();
    game.revealed = false;
    $('roundNo').textContent = `ข้อ ${game.idx + 1}/${game.rounds.length}`;
    // the host's own text stays as written; only the default question gets translated
    $('qText').textContent = r.q || 'คุณสมบัตินี้คืออะไร?';
    $('qText').toggleAttribute('data-i18n-skip', r.own);
    const cards = $('cards');
    cards.innerHTML = '';
    cards.classList.toggle('few', r.clues.length <= 4);
    r.clues.forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cr-card';
      b.style.animationDelay = i * 0.05 + 's';
      b.innerHTML = `<span class="cr-inner"><span class="cr-front"><b>${i + 1}</b><small>แตะเพื่อเปิด</small></span><span class="cr-back"><i>${i + 1}</i><span class="cr-text" data-i18n-skip></span></span></span><span class="cr-size cr-text" aria-hidden="true" data-i18n-skip></span>`;
      b.querySelector('.cr-text').textContent = c;
      b.querySelector('.cr-size').textContent = c; // invisible copy that sets the card height for long clues
      b.setAttribute('aria-label', `ป้ายที่ ${i + 1}`);
      b.addEventListener('click', () => openCard(i));
      cards.appendChild(b);
    });
    $('answer').textContent = '❓❓❓';
    $('answerBox').classList.remove('shown');
    $('nextBtn').textContent = game.idx === game.rounds.length - 1 ? 'จบเกม 🏁' : 'ข้อต่อไป ▶';
    updateCounts();
  }
  function openCard(i, quiet) {
    if (!game || game.opened.has(i)) return;
    const b = $('cards').children[i];
    if (!b) return;
    game.opened.add(i);
    b.classList.add('open');
    b.setAttribute('aria-label', `ป้ายที่ ${i + 1}: ${game.rounds[game.idx].clues[i]}`);
    if (!quiet) sfx('flip');
    updateCounts();
  }
  function updateCounts() {
    const total = game.rounds[game.idx].clues.length;
    $('opened').textContent = `เปิดแล้ว ${game.opened.size}/${total} ป้าย`;
    $('openAll').disabled = game.opened.size >= total;
  }
  function openAll() {
    const total = game.rounds[game.idx].clues.length;
    let k = 0;
    for (let i = 0; i < total; i++) {
      if (game.opened.has(i)) continue;
      const delay = k++ * 90;
      setTimeout(() => openCard(i, true), delay);
    }
    if (k) sfx('deal');
  }
  function reveal() {
    if (game.revealed) return;
    game.revealed = true;
    $('answer').textContent = game.rounds[game.idx].answer;
    const box = $('answerBox');
    box.classList.remove('shown'); void box.offsetWidth; box.classList.add('shown');
    sfx('reveal');
    setTimeout(() => sfx('fanfare'), 120);
  }
  function next() {
    if (game.idx >= game.rounds.length - 1) { sfx('win'); show('scrEnd'); return; }
    game.idx++;
    sfx('whoosh');
    loadRound();
    window.scrollTo(0, 0);
  }

  $('startBtn').addEventListener('click', startGame);
  $('openAll').addEventListener('click', openAll);
  $('revealBtn').addEventListener('click', reveal);
  $('nextBtn').addEventListener('click', next);
  $('editBtn').addEventListener('click', () => { sfx('back'); show('scrSetup'); renderEditor(); });
  $('backEdit').addEventListener('click', () => { sfx('back'); show('scrSetup'); renderEditor(); });
  $('againBtn').addEventListener('click', startGame);
  addEventListener('keydown', (e) => {
    if ($('scrPlay').hidden || e.target.closest?.('input, textarea')) return;
    if (/^[1-9]$/.test(e.key)) openCard(+e.key - 1);
    else if (e.key === 'a' || e.key === 'A') openAll();
    else if (e.key === 'Enter' && !e.target.closest?.('button')) { e.preventDefault(); reveal(); }
    else if (e.key === 'ArrowRight') next();
  });

  renderEditor();
})();

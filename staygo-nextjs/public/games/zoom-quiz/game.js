/* =========================================================
   ZOOM QUIZ — build-your-own picture quiz
   Single device, no backend: host builds a set of questions
   (image + answer + optional multiple-choice hints), then plays
   through them one at a time. Each image starts heavily zoomed
   in and slowly zooms out over a configurable duration; the host
   can pause the zoom to give people time to answer, or hit
   "reveal" to snap straight to the full picture + answer.
   Scoring is tracked by the host outside the app, same as the
   other party-game tools on this site.
   ========================================================= */

const DURATION_OPTIONS = [15, 20, 30, 45, 60]; // seconds
const START_ZOOM_NORMAL = 6; // scale factor when a question begins (normal mode)
const START_ZOOM_HARD = 12; // hard mode starts noticeably more zoomed in
const NEXT_COUNTDOWN_SECONDS = 3;
function getStartZoom(){ return state.hardMode ? START_ZOOM_HARD : START_ZOOM_NORMAL; }

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

function formatTime(ms){
  const s = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${r}`;
}

/* ---------- state ---------- */

const DEFAULT_PROMPT = 'จับเวลาทายภาพ';

let state = {
  screen: 'setup',      // setup | play | summary
  duration: 30,          // seconds to fully zoom out
  promptText: '',         // custom question text shown during play; falls back to DEFAULT_PROMPT
  hardMode: false,        // hard mode starts more zoomed in
  questions: [],          // {id, url, answer, choices:[]}
  currentIndex: 0,
  phase: 'guessing',      // guessing | revealed
  elapsedMs: 0,
  paused: false,
  rafId: null,
  lastFrameTime: null,
  countingDown: false,    // true while the 3s "next question" countdown is running
  countdown: 0,
  countdownTimeoutId: null,
  confirmingClear: false, // summary screen: two-step confirm for the destructive clear action
};

let qCounter = 0;
function newQuestion(url){
  qCounter++;
  return { id: 'q' + qCounter, url, answer: '', choices: [] };
}

function render(){ App.innerHTML = ''; App.appendChild(Screens[state.screen]()); }
const App = document.getElementById('app');

const Screens = {};

/* ---------- setup screen ---------- */

Screens.setup = () => {
  const el = document.createElement('div'); el.className = 'card';
  el.innerHTML = `
    <div class="eyebrow">สร้างเกมทายภาพ</div>
    <h1 class="display">Zoom Quiz</h1>
    <p class="sub">ใส่รูปภาพ ตั้งคำเฉลย แล้วเลือกได้ว่าจะใส่ตัวเลือกช่วยทายไหม พอเริ่มเล่น รูปจะซูมเข้าสุดแล้วค่อยๆ ซูมออก ให้ทุกคนช่วยกันทายว่าคือใคร สิ่งใด หรือที่ไหน</p>
  `;

  const settingsRow = document.createElement('div'); settingsRow.className = 'zq-settings-row';
  const durField = document.createElement('div'); durField.className = 'field';
  durField.innerHTML = `<label for="zqDuration">ระยะเวลาซูมออก</label>`;
  const durSelect = document.createElement('select'); durSelect.id = 'zqDuration';
  DURATION_OPTIONS.forEach(s => {
    const opt = document.createElement('option'); opt.value = String(s); opt.textContent = s + ' วินาที';
    if (s === state.duration) opt.selected = true;
    durSelect.appendChild(opt);
  });
  durSelect.onchange = () => { state.duration = Number(durSelect.value); };
  durField.appendChild(durSelect);
  settingsRow.appendChild(durField);

  const promptField = document.createElement('div'); promptField.className = 'field zq-prompt-field';
  promptField.innerHTML = `<label for="zqPrompt">ข้อความคำถาม (ไม่บังคับ)</label>`;
  const promptInput = document.createElement('input');
  promptInput.id = 'zqPrompt'; promptInput.placeholder = DEFAULT_PROMPT;
  promptInput.value = state.promptText;
  promptInput.oninput = (e) => { state.promptText = e.target.value; };
  promptField.appendChild(promptInput);
  settingsRow.appendChild(promptField);

  const modeField = document.createElement('div'); modeField.className = 'field';
  modeField.innerHTML = `<label>โหมดความยาก</label>`;
  const modeLabel = document.createElement('label'); modeLabel.className = 'zq-checkbox-label';
  const modeCheckbox = document.createElement('input'); modeCheckbox.type = 'checkbox';
  modeCheckbox.checked = state.hardMode;
  modeCheckbox.onchange = (e) => { state.hardMode = e.target.checked; };
  modeLabel.appendChild(modeCheckbox);
  modeLabel.appendChild(document.createTextNode('โหมดยาก (ซูมเข้าเริ่มต้นมากขึ้น)'));
  modeField.appendChild(modeLabel);
  settingsRow.appendChild(modeField);

  el.appendChild(settingsRow);

  const addRow = document.createElement('div'); addRow.className = 'zq-add-row';
  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = 'image/*'; fileInput.multiple = true;
  fileInput.className = 'zq-file-input'; fileInput.id = 'zqFileInput';
  fileInput.onchange = (e) => {
    const files = Array.from(e.target.files || []);
    files.forEach(f => {
      const url = URL.createObjectURL(f);
      state.questions.push(newQuestion(url));
    });
    fileInput.value = '';
    render();
  };
  const addBtn = document.createElement('button'); addBtn.className = 'primary'; addBtn.textContent = '📷 เพิ่มรูปภาพ';
  addBtn.onclick = () => fileInput.click();
  addRow.appendChild(fileInput); addRow.appendChild(addBtn);
  el.appendChild(addRow);

  const list = document.createElement('div'); list.className = 'zq-question-list';
  if (state.questions.length === 0) {
    const empty = document.createElement('div'); empty.className = 'zq-empty';
    empty.textContent = 'ยังไม่มีรูปภาพ — กด "เพิ่มรูปภาพ" เพื่อเริ่มสร้างเกม (เลือกได้ทีละหลายรูป)';
    list.appendChild(empty);
  } else {
    state.questions.forEach((q, i) => list.appendChild(renderQuestionCard(q, i)));
  }
  el.appendChild(list);

  const incomplete = state.questions.filter(q => !q.answer.trim());
  if (state.questions.length && incomplete.length) {
    const note = document.createElement('p'); note.className = 'zq-validation-note';
    note.textContent = `ℹ️ มี ${incomplete.length} ข้อที่ยังไม่ได้ใส่คำเฉลย — เริ่มเกมได้ปกติ แต่ตอนกดเฉลยจะไม่มีข้อความคำเฉลยแสดง`;
    el.appendChild(note);
  }

  const startBtn = document.createElement('button');
  startBtn.className = 'primary'; startBtn.style.cssText = 'margin-top:18px;width:100%;';
  startBtn.textContent = `เริ่มเกม (${state.questions.length} ข้อ)`;
  startBtn.disabled = state.questions.length === 0;
  startBtn.onclick = startQuiz;
  el.appendChild(startBtn);

  return el;
};

function renderQuestionCard(q, i){
  const card = document.createElement('div'); card.className = 'zq-qcard';

  const thumb = document.createElement('div'); thumb.className = 'zq-qcard-thumb';
  const img = document.createElement('img'); img.src = q.url; img.alt = '';
  thumb.appendChild(img);
  card.appendChild(thumb);

  const body = document.createElement('div'); body.className = 'zq-qcard-body';

  const head = document.createElement('div'); head.className = 'zq-qcard-head';
  const num = document.createElement('span'); num.className = 'zq-qcard-num'; num.textContent = `ข้อ ${i + 1}`;
  const rmBtn = document.createElement('button'); rmBtn.className = 'danger'; rmBtn.textContent = 'ลบ';
  rmBtn.onclick = () => {
    URL.revokeObjectURL(q.url);
    state.questions.splice(i, 1);
    render();
  };
  head.appendChild(num); head.appendChild(rmBtn);
  body.appendChild(head);

  const answerInput = document.createElement('input');
  answerInput.placeholder = 'คำเฉลย (คือใคร สิ่งใด หรือที่ไหน)';
  answerInput.value = q.answer;
  answerInput.oninput = (e) => { q.answer = e.target.value; };
  body.appendChild(answerInput);

  if (q.choices.length) {
    const choicesList = document.createElement('div'); choicesList.className = 'zq-choices-list';
    q.choices.forEach((c, ci) => {
      const chip = document.createElement('span'); chip.className = 'zq-chip';
      const label = document.createElement('span'); label.textContent = c;
      const rm = document.createElement('button'); rm.textContent = '✕'; rm.setAttribute('aria-label', 'ลบตัวเลือก');
      rm.onclick = () => { q.choices.splice(ci, 1); render(); };
      chip.appendChild(label); chip.appendChild(rm);
      choicesList.appendChild(chip);
    });
    body.appendChild(choicesList);
  }

  const choiceAdd = document.createElement('div'); choiceAdd.className = 'zq-choice-add';
  const choiceInput = document.createElement('input'); choiceInput.placeholder = 'ตัวเลือกช่วยทาย (ไม่บังคับ)';
  const choiceBtn = document.createElement('button'); choiceBtn.textContent = '+ เพิ่ม';
  function addChoice(){
    const v = choiceInput.value.trim();
    if (!v) return;
    q.choices.push(v);
    render();
  }
  choiceBtn.onclick = addChoice;
  choiceInput.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); addChoice(); } };
  choiceAdd.appendChild(choiceInput); choiceAdd.appendChild(choiceBtn);
  body.appendChild(choiceAdd);

  card.appendChild(body);
  return card;
}

function startQuiz(){
  state.screen = 'play';
  state.currentIndex = 0;
  beginQuestion();
}

/* ---------- play screen ---------- */

function beginQuestion(){
  state.phase = 'guessing';
  state.elapsedMs = 0;
  state.paused = false;
  state.lastFrameTime = null;
  render();
  scheduleZoomFrame();
}

function currentScale(){
  const durationMs = state.duration * 1000;
  const progress = durationMs > 0 ? Math.min(1, state.elapsedMs / durationMs) : 1;
  const eased = 1 - Math.pow(1 - progress, 2); // ease-out: fast at first, settles gently
  const startZoom = getStartZoom();
  return startZoom - (startZoom - 1) * eased;
}

function scheduleZoomFrame(){
  if (state.rafId) cancelAnimationFrame(state.rafId);
  state.lastFrameTime = performance.now();
  state.rafId = requestAnimationFrame(zoomFrame);
}

function zoomFrame(now){
  if (state.paused || state.phase !== 'guessing') { state.rafId = null; return; }
  const dt = now - (state.lastFrameTime || now);
  state.lastFrameTime = now;
  state.elapsedMs += dt;
  const durationMs = state.duration * 1000;
  const done = state.elapsedMs >= durationMs;
  if (done) state.elapsedMs = durationMs;

  const img = document.getElementById('zqImage');
  if (img) img.style.transform = `scale(${currentScale()})`;
  const timerEl = document.getElementById('zqTimer');
  if (timerEl) timerEl.textContent = formatTime(durationMs - state.elapsedMs);

  if (done) {
    state.rafId = null;
    render(); // nothing left to pause once fully zoomed out — refresh controls
  } else {
    state.rafId = requestAnimationFrame(zoomFrame);
  }
}

function togglePause(){
  state.paused = !state.paused;
  if (!state.paused && state.phase === 'guessing') {
    scheduleZoomFrame();
  } else if (state.rafId) {
    cancelAnimationFrame(state.rafId);
    state.rafId = null;
  }
  render();
}

function revealAnswer(){
  if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
  state.phase = 'revealed';
  render();
  const img = document.getElementById('zqImage');
  if (img) {
    void img.offsetWidth; // force a reflow so the transition below animates from the current scale, not skips straight to it
    requestAnimationFrame(() => { img.style.transform = 'scale(1)'; });
  }
}

function nextQuestion(){
  if (state.currentIndex + 1 < state.questions.length) {
    state.countingDown = true;
    state.countdown = NEXT_COUNTDOWN_SECONDS;
    render();
    tickNextCountdown();
  } else {
    state.screen = 'summary';
    render();
  }
}

function tickNextCountdown(){
  state.countdownTimeoutId = setTimeout(() => {
    state.countdown--;
    if (state.countdown <= 0) {
      state.countingDown = false;
      state.countdownTimeoutId = null;
      state.currentIndex++;
      beginQuestion();
    } else {
      render();
      tickNextCountdown();
    }
  }, 1000);
}

function leaveQuiz(){
  if (state.rafId) { cancelAnimationFrame(state.rafId); state.rafId = null; }
  if (state.countdownTimeoutId) { clearTimeout(state.countdownTimeoutId); state.countdownTimeoutId = null; }
  state.countingDown = false;
  state.screen = 'setup';
  render();
}

Screens.play = () => {
  const el = document.createElement('div'); el.className = 'card';
  const q = state.questions[state.currentIndex];
  const total = state.questions.length;

  el.innerHTML = `<div class="eyebrow">ข้อที่ ${state.currentIndex + 1} / ${total}</div>`;

  const head = document.createElement('div'); head.className = 'zq-play-head';
  const h = document.createElement('h2'); h.className = 'display';
  const promptLabel = (state.promptText && state.promptText.trim()) || DEFAULT_PROMPT;
  h.textContent = state.phase === 'revealed' ? 'เฉลย!' : promptLabel;
  const durationMs = state.duration * 1000;
  const remainingMs = durationMs - state.elapsedMs;
  const timer = document.createElement('div');
  timer.className = 'zq-timer' + (remainingMs <= 0 ? ' zq-timer-done' : ''); timer.id = 'zqTimer';
  timer.textContent = formatTime(remainingMs);
  head.appendChild(h); head.appendChild(timer);
  el.appendChild(head);

  const frame = document.createElement('div'); frame.className = 'zq-frame'; frame.id = 'zqFrame';
  if (state.phase === 'revealed') frame.classList.add('zq-revealed');
  const img = document.createElement('img'); img.id = 'zqImage'; img.src = q.url; img.alt = '';
  img.style.transform = `scale(${currentScale()})`;
  frame.appendChild(img);
  if (state.paused && state.phase === 'guessing') {
    const badge = document.createElement('div'); badge.className = 'zq-paused-badge'; badge.textContent = '⏸ หยุดชั่วคราว';
    frame.appendChild(badge);
  }
  el.appendChild(frame);

  if (q.choices.length) {
    const hint = document.createElement('div'); hint.className = 'zq-choices-hint';
    q.choices.forEach(c => {
      const pill = document.createElement('span'); pill.className = 'zq-choice-pill';
      if (state.phase === 'revealed' && c.trim().toLowerCase() === q.answer.trim().toLowerCase()) pill.classList.add('zq-correct');
      pill.textContent = c;
      hint.appendChild(pill);
    });
    el.appendChild(hint);
  }

  if (state.phase === 'revealed' && q.answer.trim()) {
    const banner = document.createElement('div'); banner.className = 'zq-answer-banner';
    banner.innerHTML = `<div class="zq-answer-label">เฉลย</div><div class="zq-answer-text">${escapeHtml(q.answer)}</div>`;
    el.appendChild(banner);
  }

  const actions = document.createElement('div'); actions.className = 'zq-actions';
  if (state.phase === 'guessing') {
    const pauseBtn = document.createElement('button'); pauseBtn.className = 'ghost';
    pauseBtn.disabled = remainingMs <= 0 && !state.paused;
    pauseBtn.textContent = state.paused ? '▶ ทำต่อ' : '⏸ หยุดซูม';
    pauseBtn.onclick = togglePause;
    const revealBtn = document.createElement('button'); revealBtn.className = 'primary';
    revealBtn.textContent = '👁️ เฉลย';
    revealBtn.onclick = revealAnswer;
    actions.appendChild(pauseBtn); actions.appendChild(revealBtn);
  } else if (state.countingDown) {
    const cd = document.createElement('div'); cd.className = 'zq-countdown';
    cd.textContent = `ข้อถัดไปในอีก ${state.countdown} วินาที...`;
    actions.appendChild(cd);
  } else {
    const nextBtn = document.createElement('button'); nextBtn.className = 'primary';
    nextBtn.textContent = state.currentIndex + 1 < total ? 'ข้อถัดไป →' : 'จบเกม 🏁';
    nextBtn.onclick = nextQuestion;
    actions.appendChild(nextBtn);
  }
  el.appendChild(actions);

  const leaveRow = document.createElement('div'); leaveRow.className = 'zq-leave-row';
  const leaveBtn = document.createElement('button'); leaveBtn.textContent = 'ออกจากเกม';
  leaveBtn.onclick = leaveQuiz;
  leaveRow.appendChild(leaveBtn);
  el.appendChild(leaveRow);

  return el;
};

/* ---------- summary screen ---------- */

Screens.summary = () => {
  const el = document.createElement('div'); el.className = 'card';
  el.innerHTML = `
    <div class="zq-summary-icon">🏁</div>
    <div class="eyebrow" style="text-align:center;">จบเกมแล้ว</div>
    <h1 class="display" style="text-align:center;">เล่นครบ ${state.questions.length} ข้อ</h1>
    <p class="sub" style="text-align:center;">อย่าลืมนับคะแนนที่จดไว้ ใครตอบถูกเยอะสุดคือผู้ชนะ 🎉</p>
  `;

  const again = document.createElement('button'); again.className = 'primary'; again.style.width = '100%';
  again.textContent = '🔁 เล่นชุดเดิมอีกครั้ง';
  again.onclick = () => { state.confirmingClear = false; state.currentIndex = 0; state.screen = 'play'; beginQuestion(); };
  el.appendChild(again);

  const editBtn = document.createElement('button'); editBtn.className = 'ghost'; editBtn.style.cssText = 'width:100%;margin-top:10px;';
  editBtn.textContent = '✏️ กลับไปแก้ไขชุดคำถาม';
  editBtn.onclick = () => { state.confirmingClear = false; state.screen = 'setup'; render(); };
  el.appendChild(editBtn);

  if (state.confirmingClear) {
    const warn = document.createElement('p'); warn.className = 'zq-validation-note';
    warn.style.marginTop = '10px';
    warn.textContent = '⚠️ ล้างคำถามทั้งหมดและเริ่มสร้างชุดใหม่? การกระทำนี้ย้อนกลับไม่ได้';
    el.appendChild(warn);

    const confirmRow = document.createElement('div'); confirmRow.style.cssText = 'display:flex;gap:10px;margin-top:8px;';
    const confirmBtn = document.createElement('button'); confirmBtn.className = 'confirm-danger'; confirmBtn.style.flex = '1';
    confirmBtn.textContent = 'ยืนยันล้างข้อมูล';
    confirmBtn.onclick = () => {
      state.questions.forEach(q => URL.revokeObjectURL(q.url));
      state.questions = [];
      state.confirmingClear = false;
      state.screen = 'setup';
      render();
    };
    const cancelBtn = document.createElement('button'); cancelBtn.style.flex = '1';
    cancelBtn.textContent = 'ยกเลิก';
    cancelBtn.onclick = () => { state.confirmingClear = false; render(); };
    confirmRow.appendChild(confirmBtn); confirmRow.appendChild(cancelBtn);
    el.appendChild(confirmRow);
  } else {
    const newQuizBtn = document.createElement('button'); newQuizBtn.style.cssText = 'width:100%;margin-top:10px;';
    newQuizBtn.textContent = '🗑️ ล้างแล้วสร้างชุดใหม่';
    newQuizBtn.onclick = () => { state.confirmingClear = true; render(); };
    el.appendChild(newQuizBtn);
  }

  return el;
};

render();

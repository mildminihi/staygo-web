/* Thai Wordle Game Logic */
(function () {
  'use strict';

  // ---------- 1. WORD BANK ----------
  // Every entry has exactly 5 Unicode grapheme clusters (checked with Intl.Segmenter),
  // so it always fills the 5-tile row correctly regardless of Thai combining marks.
  var WORDS = ["ข้าวผัด","ผัดไทย","ขนมปัง","ไก่ทอด","มะม่วง","ทุเรียน","แตงโม","ช้างป่า","ม้าลาย","กุ้งเผา","จระเข้","แมงมุม","ท้องฟ้า","สายรุ้ง","ลมพายุ","เสื้อผ้า","แว่นตา","นาฬิกา","หนังสือ","ปากกา","ยางลบ","วิ่งเร็ว","ปีนเขา","ลูกโป่ง","รถเมล์","ตลาดน้ำ","งานวัด","ตรุษจีน","วันเกิด","ฤดูร้อน","อุณหภูมิ","แดดจัด","เมฆฝน","ฟ้าร้อง","พายุฝน","น้ำทะเล","บ่อปลา","กรงนก","หุบเขา","หมาป่า","กระทิง","นกแก้ว","จิ้งหรีด","ตั๊กแตน","ผึ้งงาน","มดแดง","ผ้าไหม","ผ้าฝ้าย","เข็มขัด","ถุงเท้า","ไม้เท้า","ยาสีฟัน","กาน้ำชา","ถังขยะ","ผ้าถูพื้น","ปลั๊กไฟ","โน้ตบุ๊ก","เงินสด","ข้าวต้ม","น้ำมันพืช","ชีสแผ่น","กุ้งแม่น้ำ","งูเห่าดำ","น้ำพุร้อน","ถ้ำหินปูน"];

  var MAX_GUESSES = 6;
  var WORD_LEN = 5;

  var segmenter = ('Intl' in window && Intl.Segmenter)
    ? new Intl.Segmenter('th', { granularity: 'grapheme' })
    : null;

  function clustersOf(str) {
    if (!str) return [];
    if (segmenter) {
      return Array.from(segmenter.segment(str), function (s) { return s.segment; });
    }
    // Fallback: treat each UTF-16 codepoint as its own cluster (rare browsers only).
    return Array.from(str);
  }

  // ---------- 2. KEYBOARD LAYOUT ----------
  var CONSONANTS = ['ก','ข','ค','ฆ','ง','จ','ฉ','ช','ซ','ฌ','ญ','ฎ','ฏ','ฐ','ฑ','ฒ','ณ','ด','ต','ถ','ท','ธ','น','บ','ป','ผ','ฝ','พ','ฟ','ภ','ม','ย','ร','ล','ว','ศ','ษ','ส','ห','ฬ','อ','ฮ'];
  var LEADING_VOWELS = ['เ','แ','โ','ใ','ไ'];
  var VOWEL_SIGNS = ['ะ','ั','า','ิ','ี','ึ','ื','ุ','ู','ำ','็'];
  var TONE_MARKS = ['่','้','๊','๋','์'];
  var ALL_TYPABLE = CONSONANTS.concat(LEADING_VOWELS, VOWEL_SIGNS, TONE_MARKS);
  var TYPABLE_SET = new Set(ALL_TYPABLE);

  // ---------- 3. STATE ----------
  var state = {
    mode: 'daily', // 'daily' | 'practice'
    answer: '',
    answerClusters: [],
    guesses: [],        // array of { clusters: [...], statuses: [...] }
    currentGuess: '',
    finished: false,
    won: false
  };

  var keyColors = {}; // char -> 'correct' | 'present' | 'absent'

  // ---------- 4. DATE / DAILY WORD HELPERS ----------
  function bangkokToday() {
    var now = new Date();
    var bkk = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' }));
    return bkk;
  }

  function todayKey() {
    var d = bangkokToday();
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }

  function dailyIndex() {
    var d = bangkokToday();
    var todayMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    var days = Math.floor((todayMidnight - new Date(2025, 0, 1).getTime()) / 86400000);
    var idx = ((days % WORDS.length) + WORDS.length) % WORDS.length;
    return idx;
  }

  function pickAnswer(mode) {
    if (mode === 'daily') {
      return WORDS[dailyIndex()];
    }
    return WORDS[Math.floor(Math.random() * WORDS.length)];
  }

  // ---------- 5. PERSISTENCE ----------
  var STATE_KEY = 'thaiWordleDailyState';
  var STATS_KEY = 'thaiWordleStats';

  function saveDailyState() {
    if (state.mode !== 'daily') return;
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify({
        date: todayKey(),
        answer: state.answer,
        guesses: state.guesses,
        finished: state.finished,
        won: state.won
      }));
    } catch (e) { /* ignore storage errors */ }
  }

  function loadDailyState() {
    try {
      var raw = localStorage.getItem(STATE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed.date !== todayKey()) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function loadStats() {
    try {
      var raw = localStorage.getItem(STATS_KEY);
      if (!raw) return { streak: 0, maxStreak: 0, lastWinDate: null, played: 0, won: 0 };
      return JSON.parse(raw);
    } catch (e) {
      return { streak: 0, maxStreak: 0, lastWinDate: null, played: 0, won: 0 };
    }
  }

  function saveStats(stats) {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    } catch (e) { /* ignore */ }
  }

  function updateStatsAfterDailyGame(won) {
    var stats = loadStats();
    stats.played += 1;
    if (won) {
      var d = bangkokToday();
      var yesterday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
      var yKey = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');
      stats.streak = (stats.lastWinDate === yKey) ? stats.streak + 1 : 1;
      stats.maxStreak = Math.max(stats.maxStreak, stats.streak);
      stats.lastWinDate = todayKey();
      stats.won += 1;
    } else {
      stats.streak = 0;
    }
    saveStats(stats);
    return stats;
  }

  // ---------- 6. DOM REFS ----------
  var setupScreen = document.getElementById('setupScreen');
  var playingScreen = document.getElementById('playingScreen');
  var endScreen = document.getElementById('endScreen');
  var startGameBtn = document.getElementById('startGameBtn');
  var modeButtons = document.querySelectorAll('.mode-btn');
  var wordGrid = document.getElementById('wordGrid');
  var keyboardEl = document.getElementById('keyboard');
  var attemptsEl = document.getElementById('attempts');
  var modeBadge = document.getElementById('modeBadge');
  var toastEl = document.getElementById('toast');
  var endTitle = document.getElementById('endTitle');
  var secretWordEl = document.getElementById('secretWord');
  var shareGridEl = document.getElementById('shareGrid');
  var finalAttemptsEl = document.getElementById('finalAttempts');
  var finalModeEl = document.getElementById('finalMode');
  var finalStatsEl = document.querySelector('.final-stats');
  var playAgainBtn = document.getElementById('playAgainBtn');
  var changeModeBtn = document.getElementById('changeModeBtn');
  var copyResultBtn = document.getElementById('copyResultBtn');

  var selectedMode = 'daily';
  var toastTimer = null;

  // ---------- 7. SCREEN MANAGEMENT ----------
  function showScreen(el) {
    [setupScreen, playingScreen, endScreen].forEach(function (s) {
      s.classList.remove('active');
    });
    el.classList.add('active');
  }

  function showToast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 1500);
  }

  // ---------- 8. MODE SELECTION (setup screen) ----------
  modeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      modeButtons.forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      selectedMode = btn.dataset.mode;
    });
  });

  startGameBtn.addEventListener('click', function () {
    startGame(selectedMode);
  });

  playAgainBtn.addEventListener('click', function () {
    startGame(state.mode === 'daily' ? 'practice' : state.mode);
  });

  changeModeBtn.addEventListener('click', function () {
    showScreen(setupScreen);
  });

  copyResultBtn.addEventListener('click', function () {
    var text = buildShareText();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('คัดลอกผลลัพธ์แล้ว!');
      }).catch(function () {
        showToast('คัดลอกไม่สำเร็จ');
      });
    } else {
      showToast('เบราว์เซอร์ไม่รองรับการคัดลอก');
    }
  });

  // ---------- 9. GAME SETUP ----------
  function startGame(mode) {
    // Resuming an already-finished daily game shows its saved result instead of a new round.
    if (mode === 'daily') {
      var saved = loadDailyState();
      if (saved && saved.finished) {
        restoreFinishedGame(saved);
        return;
      }
    }

    state.mode = mode;
    state.answer = pickAnswer(mode);
    state.answerClusters = clustersOf(state.answer);
    state.guesses = [];
    state.currentGuess = '';
    state.finished = false;
    state.won = false;
    keyColors = {};

    modeBadge.textContent = mode === 'daily' ? 'คำประจำวัน' : 'โหมดฝึกฝน';
    buildGrid();
    buildKeyboard();
    updateAttempts();
    showScreen(playingScreen);
  }

  function restoreFinishedGame(saved) {
    state.mode = 'daily';
    state.answer = saved.answer;
    state.answerClusters = clustersOf(saved.answer);
    state.guesses = saved.guesses;
    state.finished = true;
    state.won = saved.won;
    showEndScreen();
  }

  // ---------- 10. GRID ----------
  function buildGrid() {
    wordGrid.innerHTML = '';
    for (var r = 0; r < MAX_GUESSES; r++) {
      var row = document.createElement('div');
      row.className = 'word-row';
      row.dataset.row = String(r);
      for (var c = 0; c < WORD_LEN; c++) {
        var tile = document.createElement('div');
        tile.className = 'tile';
        row.appendChild(tile);
      }
      wordGrid.appendChild(row);
    }
    renderGrid();
  }

  function renderGrid() {
    var rows = wordGrid.querySelectorAll('.word-row');
    for (var r = 0; r < MAX_GUESSES; r++) {
      var row = rows[r];
      var tiles = row.querySelectorAll('.tile');
      if (r < state.guesses.length) {
        var g = state.guesses[r];
        for (var c = 0; c < WORD_LEN; c++) {
          tiles[c].textContent = g.clusters[c] || '';
          tiles[c].className = 'tile filled ' + g.statuses[c];
        }
      } else if (r === state.guesses.length) {
        var clusters = clustersOf(state.currentGuess);
        for (var c2 = 0; c2 < WORD_LEN; c2++) {
          tiles[c2].textContent = clusters[c2] || '';
          tiles[c2].className = 'tile' + (clusters[c2] ? ' filled' : '');
        }
      } else {
        for (var c3 = 0; c3 < WORD_LEN; c3++) {
          tiles[c3].textContent = '';
          tiles[c3].className = 'tile';
        }
      }
    }
  }

  function flipCurrentRow(callback) {
    var rows = wordGrid.querySelectorAll('.word-row');
    var row = rows[state.guesses.length - 1];
    var tiles = row.querySelectorAll('.tile');
    tiles.forEach(function (tile, i) {
      setTimeout(function () {
        tile.classList.add('flip');
      }, i * 80);
    });
    setTimeout(function () {
      if (callback) callback();
    }, WORD_LEN * 80 + 300);
  }

  function shakeCurrentRow() {
    var rows = wordGrid.querySelectorAll('.word-row');
    var row = rows[state.guesses.length];
    row.classList.add('shake');
    setTimeout(function () { row.classList.remove('shake'); }, 500);
  }

  // ---------- 11. KEYBOARD ----------
  function buildKeyboard() {
    keyboardEl.innerHTML = '';
    keyboardEl.appendChild(buildKeyRow(CONSONANTS.slice(0, 21)));
    keyboardEl.appendChild(buildKeyRow(CONSONANTS.slice(21)));
    keyboardEl.appendChild(buildKeyRow(LEADING_VOWELS.concat(VOWEL_SIGNS)));
    keyboardEl.appendChild(buildKeyRow(TONE_MARKS));

    // Confirm/backspace get their own row so they read as clear, prominent
    // actions instead of being squeezed in next to the tiny tone-mark keys.
    var actionRow = document.createElement('div');
    actionRow.className = 'keyboard-row keyboard-action-row';
    actionRow.appendChild(makeKey('⌫ ลบ', 'back'));
    actionRow.appendChild(makeKey('ยืนยัน ✓', 'enter'));
    keyboardEl.appendChild(actionRow);

    updateKeyboardColors();
  }

  function buildKeyRow(chars) {
    var row = document.createElement('div');
    row.className = 'keyboard-row';
    chars.forEach(function (ch) {
      row.appendChild(makeKey(ch, 'char'));
    });
    return row;
  }

  function makeKey(label, type) {
    var btn = document.createElement('button');
    btn.type = 'button';
    var cls = 'key';
    if (type === 'enter') cls += ' action action-enter';
    else if (type === 'back') cls += ' action action-back';
    btn.className = cls;
    btn.textContent = label;
    if (type === 'char') {
      btn.dataset.char = label;
      btn.addEventListener('click', function () { handleChar(label); });
    } else if (type === 'enter') {
      btn.addEventListener('click', handleSubmit);
    } else if (type === 'back') {
      btn.addEventListener('click', handleBackspace);
    }
    return btn;
  }

  function updateKeyboardColors() {
    var keys = keyboardEl.querySelectorAll('.key[data-char]');
    keys.forEach(function (btn) {
      var ch = btn.dataset.char;
      btn.classList.remove('correct', 'present', 'absent');
      if (keyColors[ch]) {
        btn.classList.add(keyColors[ch]);
      }
    });
  }

  function recordKeyColors(clusters, statuses) {
    var rank = { absent: 0, present: 1, correct: 2 };
    clusters.forEach(function (cluster, i) {
      var status = statuses[i];
      Array.from(cluster).forEach(function (ch) {
        var existing = keyColors[ch];
        if (!existing || rank[status] > rank[existing]) {
          keyColors[ch] = status;
        }
      });
    });
    updateKeyboardColors();
  }

  // ---------- 12. INPUT HANDLING ----------
  function handleChar(ch) {
    if (state.finished) return;
    var tentative = state.currentGuess + ch;
    var clusters = clustersOf(tentative);
    if (clusters.length > WORD_LEN) return;
    state.currentGuess = tentative;
    renderGrid();
  }

  function handleBackspace() {
    if (state.finished) return;
    var chars = Array.from(state.currentGuess);
    chars.pop();
    state.currentGuess = chars.join('');
    renderGrid();
  }

  function handleSubmit() {
    if (state.finished) return;
    var clusters = clustersOf(state.currentGuess);
    if (clusters.length !== WORD_LEN) {
      showToast('พิมพ์ให้ครบ 5 ตัวอักษร');
      shakeCurrentRow();
      return;
    }

    var statuses = evaluateGuess(clusters, state.answerClusters);
    state.guesses.push({ clusters: clusters, statuses: statuses });
    state.currentGuess = '';
    renderGrid();
    updateAttempts();

    flipCurrentRow(function () {
      recordKeyColors(clusters, statuses);
      var won = clusters.join('') === state.answerClusters.join('');
      if (won) {
        finishGame(true);
      } else if (state.guesses.length >= MAX_GUESSES) {
        finishGame(false);
      }
    });
  }

  function evaluateGuess(guess, answer) {
    var statuses = new Array(WORD_LEN).fill('absent');
    var counts = {};
    answer.forEach(function (c) {
      counts[c] = (counts[c] || 0) + 1;
    });

    for (var i = 0; i < WORD_LEN; i++) {
      if (guess[i] === answer[i]) {
        statuses[i] = 'correct';
        counts[guess[i]]--;
      }
    }
    for (var j = 0; j < WORD_LEN; j++) {
      if (statuses[j] === 'correct') continue;
      var ch = guess[j];
      if (counts[ch] > 0) {
        statuses[j] = 'present';
        counts[ch]--;
      }
    }
    return statuses;
  }

  function updateAttempts() {
    attemptsEl.textContent = state.guesses.length + ' / ' + MAX_GUESSES;
  }

  // ---------- 13. PHYSICAL KEYBOARD ----------
  document.addEventListener('keydown', function (e) {
    if (!playingScreen.classList.contains('active')) return;
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'Backspace') {
      handleBackspace();
    } else if (e.key && e.key.length === 1 && TYPABLE_SET.has(e.key)) {
      handleChar(e.key);
    }
  });

  // ---------- 14. END SCREEN ----------
  function finishGame(won) {
    state.finished = true;
    state.won = won;
    if (state.mode === 'daily') {
      saveDailyState();
      updateStatsAfterDailyGame(won);
    }
    showEndScreen();
  }

  function showEndScreen() {
    endTitle.textContent = state.won ? 'ยอดเยี่ยม!' : 'ไม่เป็นไร!';
    endTitle.className = 'end-title ' + (state.won ? 'victory' : 'gameover');

    secretWordEl.innerHTML = '';
    state.answerClusters.forEach(function (c) {
      var t = document.createElement('div');
      t.className = 'secret-tile';
      t.textContent = c;
      secretWordEl.appendChild(t);
    });

    shareGridEl.innerHTML = '';
    state.guesses.forEach(function (g) {
      var rowDiv = document.createElement('div');
      rowDiv.className = 'share-row';
      rowDiv.textContent = g.statuses.map(function (s) {
        return s === 'correct' ? '🟩' : (s === 'present' ? '🟨' : '⬜');
      }).join('');
      shareGridEl.appendChild(rowDiv);
    });

    finalAttemptsEl.textContent = state.won ? (state.guesses.length + ' / ' + MAX_GUESSES) : 'ไม่สำเร็จ';
    finalModeEl.textContent = state.mode === 'daily' ? 'ประจำวัน' : 'ฝึกฝน';

    var existingStreakCard = finalStatsEl.querySelector('.streak-card');
    if (existingStreakCard) existingStreakCard.remove();
    if (state.mode === 'daily') {
      var stats = loadStats();
      var card = document.createElement('div');
      card.className = 'stat-card streak-card';
      card.innerHTML = '<div class="stat-card-label">สตรีคปัจจุบัน</div><div class="stat-card-value">' + stats.streak + '</div>';
      finalStatsEl.appendChild(card);
    }

    playAgainBtn.textContent = state.mode === 'daily' ? 'เล่นโหมดฝึกฝน' : 'เล่นอีกครั้ง';

    showScreen(endScreen);
  }

  function buildShareText() {
    var header = 'STAYGO ทายคำศัพท์ 5 ตัว ' + (state.mode === 'daily' ? todayKey() : 'ฝึกฝน');
    var result = state.won ? (state.guesses.length + '/' + MAX_GUESSES) : 'X/' + MAX_GUESSES;
    var rows = state.guesses.map(function (g) {
      return g.statuses.map(function (s) {
        return s === 'correct' ? '🟩' : (s === 'present' ? '🟨' : '⬜');
      }).join('');
    }).join('\n');
    return header + ' ' + result + '\n' + rows + '\nhttps://staygoch.com/games/thai-wordle/';
  }

  // ---------- 15. INITIAL SETUP-SCREEN STATE ----------
  (function initSetupScreen() {
    var saved = loadDailyState();
    if (saved && saved.finished) {
      var dailyBtn = document.querySelector('.mode-btn[data-mode="daily"]');
      if (dailyBtn) {
        var desc = dailyBtn.querySelector('.mode-desc');
        if (desc) desc.textContent = saved.won ? 'วันนี้ทายถูกแล้ว ✓ ดูผลลัพธ์' : 'วันนี้ทายไม่สำเร็จ · ดูผลลัพธ์';
      }
    }
  })();
})();

/* =========================================================
   OUROBOROS — game engine + UI
   Two modes:
     - local  : pass-and-play, single device, no backend
     - online : realtime room via Firebase (opt-in — fill in
                FIREBASE_CONFIG below to enable; Local mode
                always works with zero setup)
   ========================================================= */

/* ---------- 1. FILL THIS IN FOR ONLINE MODE ----------
   Create a free project at https://console.firebase.google.com
   -> Build > Realtime Database > Create database (test mode is fine for a private game night)
   -> Project settings > General > "Your apps" > Web app > copy the config object below.
   Leave as-is to keep Online mode disabled (Local mode always works with zero setup).
   The Firebase SDK is loaded lazily from a CDN <script> tag only when a player opens
   Online mode — it is not an npm dependency and adds nothing to the build when unused. */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCvuni1siJjL88H9E9CQYeHk6P7vTYbe3M",
  databaseURL: "https://staygo-ouroboros-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "staygo-ouroboros"
};
const FIREBASE_ENABLED = !!FIREBASE_CONFIG.apiKey && !!FIREBASE_CONFIG.databaseURL;

/* ---------- 2. DICE ---------- */
const DICE_TYPES = {
  d6:    { label: 'มาตรฐาน', icon:'⚀', faces:[1,2,3,4,5,6] },
  d4:    { label: 'สี่หน้า',  icon:'◆', faces:[1,2,3,4] },
  even:  { label: 'เลขคู่',   icon:'⬢', faces:[2,2,4,4,6,6] },
  odd:   { label: 'เลขคี่',   icon:'⬡', faces:[1,1,3,3,5,5] },
};
const DICE_ORDER = ['d6','d4','even','odd'];

// shared die-button builder used by both local pass-and-play and online picking —
// shows the icon, name, every face value (so players know exactly what they're
// rolling, incl. duplicate faces on the even/odd dice), and the average.
function buildDieButton(dieKey, cooldown, onClick){
  const def = DICE_TYPES[dieKey];
  const avg = (def.faces.reduce((a,c)=>a+c)/def.faces.length).toFixed(1);
  const b = document.createElement('button');
  b.className = `die-btn die-${dieKey}`;
  b.disabled = cooldown > 0;
  b.innerHTML = `<span class="die-icon">${def.icon}</span><span class="die-label">${def.label}</span>` +
    (cooldown > 0
      ? `<span class="cooldown-badge">พัก ${cooldown} รอบ</span>`
      : `<span class="die-faces">${def.faces.join(' · ')}</span><small>เฉลี่ย ${avg}</small>`);
  b.onclick = onClick;
  return b;
}

/* ---------- 3. SPECIAL TILES ---------- */
const SPECIAL_TILES = {
  skip:    { label:'หยุดพัก',      icon:'⏭️', kind:'penalty', desc:'พักหนึ่งรอบ ไม่ได้ทอยเต๋า' },
  extra:   { label:'ทอยเพิ่ม',     icon:'🎲', kind:'bonus',   desc:'ทอยลูกเต๋าโบนัส เดินเพิ่มทันที' },
  swap:    { label:'สลับตำแหน่ง',  icon:'🔄', kind:'chaos',   desc:'สลับที่กับผู้เล่นที่ใกล้ที่สุดข้างหน้า' },
  shield:  { label:'โล่กันกิน',    icon:'🛡️', kind:'bonus',   desc:'กันไม่ให้ถูกกินในรอบถัดไป 1 ครั้ง' },
  back:    { label:'ถอยหลัง',      icon:'🕳️', kind:'penalty', desc:'ถอยหลัง 3 ช่องทันที' },
  reverse: { label:'พลิกทิศ',      icon:'🔁', kind:'chaos',   desc:'ทุกคนพลิกทิศทางเดินรอบวง' },
};

/* ---------- 4. BOARD ---------- */
function boardSizeFor(playerCount){ return playerCount <= 3 ? 32 : 24; }

// returns ordered [{row,col}] tracing the perimeter of an NxN grid, ring length = 4N-4
function ringPositions(n){
  const pts = [];
  for(let c=0;c<n;c++) pts.push({row:0,col:c});                 // top
  for(let r=1;r<n;r++) pts.push({row:r,col:n-1});                // right
  for(let c=n-2;c>=0;c--) pts.push({row:n-1,col:c});             // bottom
  for(let r=n-2;r>0;r--) pts.push({row:r,col:0});                // left
  return pts;
}
function gridSizeForTiles(tileCount){ return (tileCount + 4) / 4; } // inverse of 4N-4

function buildBoard(tileCount, seed){
  const rng = mulberry32(seed);
  const tiles = new Array(tileCount).fill(null);
  const specialKeys = Object.keys(SPECIAL_TILES);
  const specialCount = Math.round(tileCount * 0.22);
  const usedIdx = new Set([0]); // keep tile 0 clean (a start-ish landmark)
  let placed = 0;
  const place = (key) => {
    let idx;
    do { idx = Math.floor(rng()*tileCount); } while(usedIdx.has(idx));
    usedIdx.add(idx); tiles[idx] = key; placed++;
  };
  place('reverse');
  while(placed < specialCount){
    const key = specialKeys[Math.floor(rng()*specialKeys.length)];
    if(key === 'reverse') continue;
    place(key);
  }
  return tiles;
}

function mulberry32(seed){
  let a = seed;
  return function(){
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.min ? Math.imul(a ^ (a>>>15), 1 | a) : a;
    t = (t + Math.imul(t ^ (t>>>7), 61 | t)) ^ t;
    return ((t ^ (t>>>14)) >>> 0) / 4294967296;
  };
}

const PLAYER_COLORS = ['#c8993f','#5a9b7c','#a4342a','#4d7ea8','#8b5fbf','#c46b3f'];

/* ---------- 5. SHARED TURN-RESOLUTION ENGINE ----------
   Pure-ish function used by BOTH local and online mode: given a full
   roster, the board, current direction and this round's picks, it
   mutates player positions/status in place and returns {log, direction}.
   Backend-agnostic — local mode calls it on state.players directly,
   online mode calls it on a snapshot built from Firebase data and
   writes the result back to the room. */
function resolveTurnPure(allPlayers, boardTiles, boardSize, direction, picks){
  const n = boardSize;
  const aliveBefore = allPlayers.filter(p=>p.alive);

  // age every die's cooldown down by one round first, THEN lock the die that
  // gets used this round back up to 1. Doing the decrement here (once per
  // resolved round) instead of at the start of the next picking phase means
  // a die is genuinely unusable for the whole round right after it's picked —
  // previously the "next round starts" step immediately cancelled the
  // cooldown it had just been given, so the same die was pickable again right
  // away.
  aliveBefore.forEach(p=>{
    p.dice.forEach(d=>{ if(d.cooldown>0) d.cooldown--; });
  });

  // paths[id] records every tile a player's token visits this round, in
  // order (starting with where they stood before resolving) — used to
  // animate the walk step-by-step instead of snapping straight to the end.
  const startPos = {};
  const paths = {};
  aliveBefore.forEach(p=>{ startPos[p.id] = p.pos; paths[p.id] = [p.pos]; });

  function stepPlayer(p, dir, steps){
    let pos = paths[p.id][paths[p.id].length - 1];
    for(let i=0;i<steps;i++){
      pos = (pos + dir + n) % n;
      paths[p.id].push(pos);
    }
    return pos;
  }

  const destinations = {};
  aliveBefore.forEach(p=>{
    if(p.skipNext){ p.skipNext=false; destinations[p.id]=p.pos; return; }
    const pick = picks[p.id];
    if(!pick){ destinations[p.id]=p.pos; return; }
    const die = p.dice.find(d=>d.key===pick.dieKey);
    if(die) die.cooldown = 1;
    destinations[p.id] = stepPlayer(p, direction, pick.roll);
  });

  const log = [];
  const eaten = new Set();
  aliveBefore.forEach(mover=>{
    aliveBefore.forEach(target=>{
      if(mover.id===target.id) return;
      if(eaten.has(target.id)) return;
      if(destinations[mover.id] === startPos[target.id]){
        if(target.shield){ target.shield=false; log.push(`${target.name} ใช้โล่ปกป้องตัวเองจาก ${mover.name}`); }
        else { eaten.add(target.id); log.push(`${mover.name} กิน ${target.name} ที่ช่อง ${startPos[target.id]}`); }
      }
    });
  });

  eaten.forEach(id=>{ const p = allPlayers.find(x=>x.id===id); if(p) p.alive=false; });

  const survivors = allPlayers.filter(p=>p.alive);

  // settle every survivor onto their rolled destination in its own pass,
  // BEFORE any tile effects run. Tile effects (swap in particular) mutate
  // .pos directly — if that ran interleaved with this assignment, a swap
  // could get silently overwritten the moment the loop later reached the
  // partner it swapped with and reset them back to their own destination.
  survivors.forEach(p=>{ p.pos = destinations[p.id]; });

  let newDirection = direction;
  survivors.forEach(p=>{
    const landedFresh = destinations[p.id] !== startPos[p.id];
    const tileKey = boardTiles[destinations[p.id]];
    // only trigger the tile's effect when a player actually moves onto it this
    // round — otherwise a player parked on it (e.g. frozen by 'skip') would
    // re-trigger it every round forever (a 'skip' tile in particular would
    // trap them there permanently).
    if(!tileKey || !landedFresh) return;
    switch(tileKey){
      case 'skip': p.skipNext=true; log.push(`${p.name} ตกช่องหยุดพัก ⏭️`); break;
      case 'shield': p.shield=true; log.push(`${p.name} ได้รับโล่กันกิน 🛡️`); break;
      case 'back': { const newPos = stepPlayer(p, -1, 3); p.pos = newPos; log.push(`${p.name} ถอยหลัง 3 ช่อง`); break; }
      case 'swap': {
        const ahead = survivors
          .filter(x=>x.id!==p.id)
          .map(x=>({x, d:((x.pos-p.pos)+n)%n}))
          .filter(o=>o.d>0)
          .sort((a,b)=>a.d-b.d)[0];
        if(ahead){
          const tmp=p.pos; p.pos=ahead.x.pos; ahead.x.pos=tmp;
          paths[p.id].push(p.pos);
          if(paths[ahead.x.id]) paths[ahead.x.id].push(ahead.x.pos);
          log.push(`${p.name} สลับตำแหน่งกับ ${ahead.x.name}`);
        }
        break;
      }
      case 'reverse': newDirection *= -1; log.push(`🔁 ทุกคนพลิกทิศทางเดิน!`); break;
      case 'extra': {
        const def = DICE_TYPES.d4;
        const roll = def.faces[Math.floor(Math.random()*def.faces.length)];
        const newPos = stepPlayer(p, newDirection, roll);
        p.pos = newPos;
        log.push(`${p.name} ได้โบนัสทอยเพิ่ม +${roll} ช่อง`);
        break;
      }
    }
  });

  return { log, direction: newDirection, paths };
}

/* ---------- 6. GAME STATE ---------- */
let state = {
  screen: 'home',      // home | setup | mode | game | gameover | online-*
  mode: null,           // 'local' | 'online'
  players: [],          // {id,name,color,pos,alive,dice:[{key,cooldown}],shield,skipNext,eatenAnim}
  boardTiles: [],
  boardSize: 24,
  direction: 1,          // 1 = forward index increasing
  round: 0,
  turnOrder: [],          // for local pass-and-play secret picking
  pickIndex: 0,
  picks: {},              // playerId -> {dieKey, roll}
  phase: 'setup-players', // setup-players | passing | reveal | resolved
  log: [],
  passScreenFor: null,
  online: { fb:null, room:null, code:null, myId:null, isHost:false, role:null },
  onlineRoomData: null,
  pendingJoinCode: null, // pre-filled from a scanned QR / shared ?code= link
};

function render(){ App.innerHTML=''; App.appendChild(Screens[state.screen]()); }
const App = document.getElementById('app');

/* ---------- 7. SCREENS ---------- */
const Screens = {};

const HOWTO_STEPS = [
  'ทุกรอบ แต่ละคนเลือกลูกเต๋า 1 ลูกแบบปิด ไม่ให้คนอื่นเห็นว่าเลือกอะไร',
  'กด "เปิดพร้อมกัน" ทุกคนเดินไปตามที่ทอยได้พร้อมกันทีเดียว',
  'เดินไปตกตำแหน่งเดิมของใคร คนนั้นถูกกิน ออกจากเกมทันที',
  'ช่องพิเศษบนกระดานมีทั้งผลดีและร้าย ดูคำอธิบายสัญลักษณ์ได้ระหว่างเล่น',
  'ผู้รอดชีวิตคนสุดท้ายคือผู้ชนะ 🐍',
];

function renderHowTo(){
  const wrap = document.createElement('div'); wrap.className = 'howto';
  const title = document.createElement('div'); title.className = 'howto-title'; title.textContent = 'วิธีเล่นคร่าวๆ';
  wrap.appendChild(title);
  const list = document.createElement('div'); list.className = 'howto-list';
  HOWTO_STEPS.forEach((text, i) => {
    const step = document.createElement('div'); step.className = 'howto-step';
    step.innerHTML = `<span class="num">${i+1}</span><span>${text}</span>`;
    list.appendChild(step);
  });
  wrap.appendChild(list);
  return wrap;
}

Screens.home = () => {
  const el = document.createElement('div');
  el.className='card';
  el.innerHTML = `
    <div class="eyebrow">เกมกระดาน · 2–6 คน</div>
    <h1 class="display">Ouroboros</h1>
    <p class="sub">วนรอบ ไล่ล่า กินกัน — รอดคนสุดท้ายคือผู้ชนะ</p>
  `;
  el.appendChild(renderHowTo());
  const btn = document.createElement('button');
  btn.className='primary'; btn.style.marginTop='20px';
  btn.textContent='เริ่มตั้งเกม';
  btn.onclick = () => { state.screen='mode'; render(); };
  el.appendChild(btn);
  return el;
};

Screens.setup = () => {
  const el = document.createElement('div');
  el.className='card';
  el.innerHTML = `<div class="eyebrow">ตั้งค่า · จอเดียว ส่งต่อกัน</div><h2 class="display">ผู้เล่น</h2>`;
  if(state.players.length===0){
    state.players = [0,1].map(i => mkPlayer(i));
  }
  const list = document.createElement('div');
  state.players.forEach((p,i)=>{
    const row = document.createElement('div'); row.className='player-row';
    row.innerHTML = `<span class="dot" style="background:${p.color}"></span>`;
    const input = document.createElement('input');
    input.value = p.name; input.placeholder = `ผู้เล่น ${i+1}`;
    input.oninput = (e)=> p.name = e.target.value;
    row.appendChild(input);
    if(state.players.length>2){
      const rm = document.createElement('button');
      rm.textContent='ลบ'; rm.onclick=()=>{ state.players.splice(i,1); render(); };
      row.appendChild(rm);
    }
    list.appendChild(row);
  });
  el.appendChild(list);

  const controls = document.createElement('div');
  controls.className='row'; controls.style.marginTop='10px';
  const addBtn = document.createElement('button');
  addBtn.textContent='+ เพิ่มผู้เล่น'; addBtn.disabled = state.players.length>=6;
  addBtn.onclick = ()=>{ state.players.push(mkPlayer(state.players.length)); render(); };
  controls.appendChild(addBtn);
  el.appendChild(controls);

  const next = document.createElement('button');
  next.className='primary'; next.style.marginTop='20px';
  next.textContent='เริ่มเกม';
  next.onclick = () => startLocalGame();
  el.appendChild(next);
  const back = document.createElement('button');
  back.style.marginTop='20px'; back.textContent='← กลับ';
  back.onclick = ()=>{ state.screen='mode'; render(); };
  el.appendChild(back);
  return el;
};

function mkPlayer(i){
  return { id:'p'+i, name:'', color:PLAYER_COLORS[i%PLAYER_COLORS.length],
           pos:0, alive:true, shield:false, skipNext:false,
           dice: DICE_ORDER.map(k=>({key:k, cooldown:0})) };
}

Screens.mode = () => {
  const el = document.createElement('div');
  el.className='card';
  el.innerHTML = `<div class="eyebrow">รูปแบบการเล่น</div><h2 class="display">เล่นแบบไหน</h2>`;
  const wrap = document.createElement('div'); wrap.className='row'; wrap.style.marginTop='16px';

  const localCard = document.createElement('div');
  localCard.className='mode-card';
  localCard.innerHTML = `<h3>📱 จอเดียว ส่งต่อกัน</h3><p>ทุกคนแชร์อุปกรณ์เดียว ผลัดกันเลือกลูกเต๋าแบบปิดหน้าจอ ไม่ต้องตั้งค่าอะไรเลย</p>`;
  localCard.onclick = () => { state.screen='setup'; render(); };
  wrap.appendChild(localCard);

  const onlineCard = document.createElement('div');
  onlineCard.className='mode-card';
  if(FIREBASE_ENABLED){
    onlineCard.innerHTML = `<h3>🌐 ห้องออนไลน์</h3><p>แต่ละคนใช้มือถือตัวเอง เข้าห้องด้วยโค้ด แล้วโชว์กระดานบนจอกลาง</p>`;
    onlineCard.onclick = () => { state.screen='online-setup'; render(); };
  } else {
    onlineCard.style.opacity=.5; onlineCard.style.cursor='default';
    onlineCard.innerHTML = `<h3>🌐 ห้องออนไลน์</h3><p>ยังไม่ได้ตั้งค่า Firebase — ดูวิธีตั้งค่าด้านล่าง</p>`;
  }
  wrap.appendChild(onlineCard);
  el.appendChild(wrap);

  if(!FIREBASE_ENABLED){
    const note = document.createElement('p');
    note.className='sub'; note.style.marginTop='16px'; note.style.fontSize='12px';
    note.innerHTML = `เปิดโหมดออนไลน์ได้โดยกรอกค่า <code>FIREBASE_CONFIG</code> ในไฟล์ <code>game.js</code> (ดูคอมเมนต์ด้านบนของไฟล์)`;
    el.appendChild(note);
  }
  const back = document.createElement('button');
  back.style.marginTop='16px'; back.textContent='← กลับ';
  back.onclick = ()=>{ state.screen='home'; render(); };
  el.appendChild(back);
  return el;
};

/* ---------- 8. LOCAL PASS-AND-PLAY ---------- */
function startLocalGame(){
  state.players.forEach((p,i)=> p.name = p.name.trim() || `ผู้เล่น ${i+1}`);
  state.boardSize = boardSizeFor(state.players.length);
  state.boardTiles = buildBoard(state.boardSize, Date.now() & 0xffffffff);
  const step = state.boardSize / state.players.length;
  state.players.forEach((p,i)=> p.pos = Math.floor(i*step));
  state.direction = 1; state.round = 0; state.mode='local'; state.log=[];
  beginPickingPhase();
}

function alivePlayers(){ return state.players.filter(p=>p.alive); }

function beginPickingPhase(){
  state.round++;
  state.picks = {};
  // dice cooldowns are aged down inside resolveTurnPure (once per resolved
  // round) — not here, so a die stays locked for the whole round after use.
  state.turnOrder = alivePlayers().filter(p=>!p.skipNext).map(p=>p.id);
  state.pickIndex = 0;
  state.phase = state.turnOrder.length ? 'passing' : 'reveal';
  state.screen = 'game';
  render();
}

Screens.game = () => {
  if(state.phase === 'passing') return renderPassScreen();
  return renderBoardScreen();
};

function renderPassScreen(){
  const pid = state.turnOrder[state.pickIndex];
  const p = state.players.find(x=>x.id===pid);
  const wrap = document.createElement('div');

  if(!state.passScreenFor || state.passScreenFor !== pid){
    // hand-off overlay first
    const overlay = document.createElement('div');
    overlay.className='overlay-shield';
    overlay.innerHTML = `
      <div class="eyebrow">ส่งต่ออุปกรณ์</div>
      <h1 class="display" style="color:${p.color}">${p.name}</h1>
      <p class="sub">คนอื่นห้ามมอง — พร้อมแล้วกดเพื่อดูลูกเต๋าของตัวเอง</p>
    `;
    const btn = document.createElement('button');
    btn.className='primary'; btn.textContent='ฉันคือ ' + p.name + ' — พร้อมแล้ว';
    btn.onclick = ()=>{ state.passScreenFor = pid; render(); };
    overlay.appendChild(btn);
    wrap.appendChild(overlay);
    return wrap;
  }

  const el = document.createElement('div'); el.className='card';
  el.innerHTML = `<div class="eyebrow">รอบที่ ${state.round} · ${p.name}</div><h2 class="display">เลือกลูกเต๋า</h2>`;
  const grid = document.createElement('div'); grid.className='row'; grid.style.marginTop='16px';
  p.dice.forEach(d=>{
    const def = DICE_TYPES[d.key];
    const b = buildDieButton(d.key, d.cooldown, ()=>{
      const roll = def.faces[Math.floor(Math.random()*def.faces.length)];
      state.picks[pid] = { dieKey:d.key, roll };
      state.passScreenFor = null;
      state.pickIndex++;
      if(state.pickIndex >= state.turnOrder.length){ state.phase='reveal'; }
      render();
    });
    grid.appendChild(b);
  });
  el.appendChild(grid);
  wrap.appendChild(el);
  return wrap;
}

// shown next to a player's name once a round is resolved — which die they
// used and what it rolled (kept hidden during 'reveal' to preserve the
// closed-pick surprise).
function renderPickBadge(pick){
  if(!pick) return `<span class="die-used dim">— พักตานี้</span>`;
  const def = DICE_TYPES[pick.dieKey];
  return `<span class="die-used" title="${def.label}">${def.icon} ${pick.roll}</span>`;
}

function renderDirectionPill(direction){
  const cw = direction === 1;
  return `<span class="pill direction-pill">${cw ? '↻ ตามเข็มนาฬิกา' : '↺ ทวนเข็มนาฬิกา'}</span>`;
}

function renderBoardScreen(){
  const el = document.createElement('div'); el.className='card';
  el.innerHTML = `<div class="eyebrow">รอบที่ ${state.round}</div>
    <div class="board-head-row"><h2 class="display">กระดาน</h2>${renderDirectionPill(state.direction)}</div>`;
  el.appendChild(renderBoard());
  el.appendChild(renderTileLegend());

  const showPicks = state.phase === 'resolved';
  const list = document.createElement('div'); list.style.marginTop='16px';
  state.players.forEach(p=>{
    const row = document.createElement('div'); row.className='player-row';
    row.style.opacity = p.alive ? 1 : .35;
    row.innerHTML = `<span class="dot" style="background:${p.color}"></span>
      <span>${p.name}${!p.alive?' (ถูกกิน)':''}${p.shield?' 🛡️':''}${p.skipNext?' ⏭️':''}</span>` +
      (showPicks ? renderPickBadge(state.picks[p.id]) : '');
    list.appendChild(row);
  });
  el.appendChild(list);

  if(state.phase === 'reveal'){
    const btn = document.createElement('button');
    btn.className='primary'; btn.style.marginTop='16px';
    btn.textContent = 'เปิดพร้อมกัน ✦';
    btn.onclick = resolveRound;
    el.appendChild(btn);
  } else if(state.phase === 'resolved'){
    const logDiv = document.createElement('div'); logDiv.className='log';
    state.log.slice().reverse().forEach(line=>{
      const d = document.createElement('div');
      d.className = line.includes('กิน') ? 'kill' : (line.includes('โบนัส')?'bonus':'');
      d.textContent = line; logDiv.appendChild(d);
    });
    el.appendChild(logDiv);

    if(alivePlayers().length <= 1){
      const winner = alivePlayers()[0];
      const h = document.createElement('h3'); h.className='display';
      h.style.color='var(--gold-bright)'; h.style.marginTop='16px';
      h.textContent = winner ? `${winner.name} คือผู้รอดชีวิตคนสุดท้าย 🐍` : 'ไม่มีผู้รอดชีวิต';
      el.appendChild(h);
      const again = document.createElement('button');
      again.className='primary'; again.style.marginTop='10px';
      again.textContent='เล่นใหม่'; again.onclick = ()=>{ state = {...state, screen:'setup', players:[], log:[]}; render(); };
      el.appendChild(again);
    } else {
      const btn = document.createElement('button');
      btn.className='primary'; btn.style.marginTop='16px';
      btn.textContent = 'รอบถัดไป →';
      btn.onclick = beginPickingPhase;
      el.appendChild(btn);
    }
  }
  return el;
}

// builds the static tile grid (no tokens) — shared by the normal board
// render and the step-walk animation below, so the tile layout logic only
// lives in one place.
function buildBoardShell(boardTiles, boardSize){
  const n = gridSizeForTiles(boardSize);
  const cell = 44;
  const board = document.createElement('div');
  board.id='board'; board.style.width=(n*cell)+'px'; board.style.height=(n*cell)+'px';
  const pts = ringPositions(n);

  pts.forEach((pt,i)=>{
    const t = document.createElement('div');
    const isSpecial = !!boardTiles[i];
    const kind = isSpecial ? SPECIAL_TILES[boardTiles[i]].kind : null;
    t.className = 'tile' + (isSpecial?' special kind-'+kind:'') + (i===0?' start':'');
    t.style.left = (pt.col*cell)+'px'; t.style.top=(pt.row*cell)+'px';
    t.style.width=cell+'px'; t.style.height=cell+'px';
    if(isSpecial) t.innerHTML = `<span class="tile-glyph">${SPECIAL_TILES[boardTiles[i]].icon}</span>`;
    else if(i===0) t.innerHTML = `<span class="tile-glyph">◎</span>`;
    board.appendChild(t);
  });

  return { board, pts, cell };
}

function renderBoardGeneric(boardTiles, boardSize, playersArr){
  const wrap = document.createElement('div'); wrap.className='grid-wrap';
  const { board, pts, cell } = buildBoardShell(boardTiles, boardSize);

  // group players by tile to offset overlapping tokens
  const byTile = {};
  playersArr.filter(p=>p.alive).forEach(p=>{ (byTile[p.pos] = byTile[p.pos]||[]).push(p); });
  Object.entries(byTile).forEach(([idx,ps])=>{
    ps.forEach((p,j)=>{
      const pt = pts[idx];
      const tok = document.createElement('div');
      tok.className='token'; tok.style.setProperty('--token-color', p.color);
      tok.style.left = (pt.col*cell + cell/2 - 14 + j*8)+'px';
      tok.style.top = (pt.row*cell + cell/2 - 14 - j*8)+'px';
      tok.textContent = (p.name||'?').slice(0,1).toUpperCase();
      tok.title = p.name;
      board.appendChild(tok);
    });
  });
  wrap.appendChild(board);
  return wrap;
}

function renderBoard(){ return renderBoardGeneric(state.boardTiles, state.boardSize, state.players); }

// animates each player's token hopping tile-by-tile along `paths` (all
// players stepping simultaneously), reusing the same token DOM elements
// across frames so the .token CSS transition glides each hop, then hands
// off to `onDone` (the real render()) once every path has finished.
function animateTokenWalk({ boardTiles, boardSize, paths, players, headerHTML, killLog, eatenIds, onDone }){
  const STEP_MS = 260;
  killLog = killLog || [];
  eatenIds = eatenIds || [];
  const maxLen = Math.max(1, ...Object.values(paths).map(arr => arr.length));

  const el = document.createElement('div'); el.className = 'card';
  el.innerHTML = headerHTML;
  const wrap = document.createElement('div'); wrap.className = 'grid-wrap';
  const { board, pts, cell } = buildBoardShell(boardTiles, boardSize);
  wrap.appendChild(board);
  el.appendChild(wrap);
  const note = document.createElement('p'); note.className = 'sub'; note.style.cssText = 'margin-top:12px;text-align:center;';
  note.textContent = 'กำลังเดิน...';
  el.appendChild(note);

  const tokenEls = {};
  players.forEach(p=>{
    const tok = document.createElement('div');
    tok.className = 'token';
    tok.style.setProperty('--token-color', p.color);
    tok.textContent = (p.name||'?').slice(0,1).toUpperCase();
    tok.title = p.name;
    board.appendChild(tok);
    tokenEls[p.id] = tok;
  });

  function positionTokens(step){
    const byTile = {};
    players.forEach(p=>{
      const path = paths[p.id] || [0];
      const idx = path[Math.min(step, path.length - 1)];
      (byTile[idx] = byTile[idx] || []).push(p.id);
    });
    Object.keys(byTile).forEach(idxStr=>{
      const idx = Number(idxStr);
      const pt = pts[idx];
      byTile[idx].forEach((pid,j)=>{
        const tok = tokenEls[pid];
        tok.style.left = (pt.col*cell + cell/2 - 14 + j*8) + 'px';
        tok.style.top = (pt.row*cell + cell/2 - 14 - j*8) + 'px';
      });
    });
  }

  App.innerHTML = '';
  App.appendChild(el);
  positionTokens(0);

  let step = 1;
  function tick(){
    positionTokens(step);
    step++;
    if(step < maxLen){
      setTimeout(tick, STEP_MS);
    } else {
      setTimeout(()=> playEatenReveal(board, killLog, eatenIds, tokenEls, onDone), STEP_MS);
    }
  }
  setTimeout(tick, STEP_MS);
}

// after everyone's finished walking: shrink/fade out whoever got eaten right
// where they stand, and flash a callout in the dead center of the board
// naming who ate whom. Skipped entirely if nobody was eaten this round.
function playEatenReveal(board, killLog, eatenIds, tokenEls, onDone){
  if(!killLog.length && !eatenIds.length){ onDone(); return; }

  eatenIds.forEach(id=>{
    const tok = tokenEls[id];
    if(tok) tok.classList.add('eaten');
  });

  if(killLog.length){
    const callout = document.createElement('div'); callout.className = 'eat-callout';
    const card = document.createElement('div'); card.className = 'eat-callout-card';
    card.innerHTML = '<div class="eat-callout-icon">🐍</div>' +
      killLog.map(line => `<div class="eat-callout-line">${line}</div>`).join('');
    callout.appendChild(card);
    board.appendChild(callout);
  }

  setTimeout(onDone, 1400);
}

// explains every icon that can appear on the board — shown alongside it so
// players aren't left guessing what a glyph does.
function renderTileLegend(){
  const wrap = document.createElement('div'); wrap.className = 'legend';
  const title = document.createElement('div'); title.className = 'legend-title'; title.textContent = 'สัญลักษณ์บนกระดาน';
  wrap.appendChild(title);

  const grid = document.createElement('div'); grid.className = 'legend-grid';
  function addItem(icon, label, desc, kindClass){
    const item = document.createElement('div'); item.className = 'legend-item ' + kindClass;
    item.innerHTML = `<span class="legend-icon">${icon}</span><div><div class="legend-label">${label}</div><div class="legend-desc">${desc}</div></div>`;
    grid.appendChild(item);
  }

  addItem('◎', 'จุดเริ่มต้น', 'ตำแหน่งเริ่มเกมของทุกคน', 'legend-start');
  Object.keys(SPECIAL_TILES).forEach(key=>{
    const t = SPECIAL_TILES[key];
    addItem(t.icon, t.label, t.desc, 'kind-'+t.kind);
  });

  wrap.appendChild(grid);
  return wrap;
}

/* ---------- 9. LOCAL ROUND RESOLUTION ---------- */
function resolveRound(){
  const walkers = state.players.filter(p=>p.alive).map(p=>({id:p.id, name:p.name, color:p.color}));
  const result = resolveTurnPure(state.players, state.boardTiles, state.boardSize, state.direction, state.picks);
  state.direction = result.direction;
  state.log.push(...result.log);
  state.phase = 'resolved';

  const eatenIds = walkers
    .filter(w => { const p = state.players.find(x=>x.id===w.id); return p && !p.alive; })
    .map(w => w.id);
  const killLog = result.log.filter(l => l.includes('กิน'));

  const headerHTML = `<div class="eyebrow">รอบที่ ${state.round}</div>
    <div class="board-head-row"><h2 class="display">กระดาน</h2>${renderDirectionPill(state.direction)}</div>`;
  animateTokenWalk({
    boardTiles: state.boardTiles, boardSize: state.boardSize,
    paths: result.paths, players: walkers, headerHTML,
    killLog, eatenIds, onDone: render,
  });
}

/* ---------- 10. ONLINE MODE (Firebase) ---------- */
Screens['online-setup'] = () => {
  const el = document.createElement('div'); el.className='card';
  el.innerHTML = `<div class="eyebrow">ห้องออนไลน์</div><h2 class="display">สร้างหรือเข้าห้อง</h2>
    <p class="sub">แนวคิด: การ 'ปิดข้อมูล' ระหว่างเลือกลูกเต๋าอาศัยความร่วมมือ (UI ไม่โชว์ของคนอื่นจนกว่าจะเปิด) ไม่ใช่การเข้ารหัสจริงจัง — เหมาะกับเล่นในห้องประชุม/กับเพื่อนที่ไว้ใจกัน</p>`;
  const row = document.createElement('div'); row.className='row'; row.style.marginTop='16px';
  const create = document.createElement('button'); create.className='primary'; create.textContent='สร้างห้องใหม่ (โฮสต์)';
  create.onclick = ()=> initFirebaseAndCreateRoom();
  const join = document.createElement('button'); join.textContent='เข้าห้องด้วยโค้ด';
  join.onclick = ()=>{ state.screen='online-join'; render(); };
  row.appendChild(create); row.appendChild(join);
  el.appendChild(row);
  const back = document.createElement('button'); back.style.marginTop='16px'; back.textContent='← กลับ';
  back.onclick = ()=>{ state.screen='mode'; render(); };
  el.appendChild(back);
  return el;
};

Screens['online-join'] = () => {
  const el = document.createElement('div'); el.className='card';
  el.innerHTML = `<div class="eyebrow">เข้าห้อง</div><h2 class="display">กรอกโค้ดห้อง</h2>`;
  const input = document.createElement('input'); input.placeholder='เช่น 4821'; input.style.marginTop='12px';
  if(state.pendingJoinCode) input.value = state.pendingJoinCode;
  const nameInput = document.createElement('input'); nameInput.placeholder='ชื่อของคุณ'; nameInput.style.marginTop='10px';
  el.appendChild(input); el.appendChild(nameInput);
  const btn = document.createElement('button'); btn.className='primary'; btn.style.marginTop='14px'; btn.textContent='เข้าห้อง';
  btn.onclick = ()=> initFirebaseAndJoinRoom(input.value.trim(), nameInput.value.trim() || 'ผู้เล่น');
  el.appendChild(btn);
  return el;
};

let fb = null;
function initFirebase(){
  if(fb) return fb;
  const s1 = document.createElement('script'); s1.src='https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
  const s2 = document.createElement('script'); s2.src='https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js';
  document.head.appendChild(s1); document.head.appendChild(s2);
  return new Promise(resolve=>{
    s2.onload = ()=>{
      firebase.initializeApp(FIREBASE_CONFIG);
      fb = firebase.database();
      resolve(fb);
    };
  });
}

async function initFirebaseAndCreateRoom(){
  const db = await initFirebase();
  const code = String(Math.floor(1000 + Math.random()*9000));
  const myId = 'u' + Math.random().toString(36).slice(2,8);
  // the device that creates the room becomes the shared "board" screen — a
  // spectator, not a player. Everyone who actually plays joins separately
  // with their own device via the code/QR/link, even if they're standing
  // right next to the board.
  state.online = { fb:db, code, myId, isHost:true, role:'board' };
  await db.ref('rooms/'+code).set({
    phase:'lobby', round:0, direction:1, boardTiles:[], boardSize:24, log:[],
    players: {}
  });
  listenRoom(db, code);
  state.screen='online-lobby'; render();
}

async function initFirebaseAndJoinRoom(code, name){
  if(!code) return;
  const db = await initFirebase();
  const myId = 'u' + Math.random().toString(36).slice(2,8);
  const snap = await db.ref('rooms/'+code+'/players').get();
  if(!snap.exists() && (await db.ref('rooms/'+code).get()).val() == null){
    alert('ไม่พบห้องนี้ — ตรวจสอบโค้ดอีกครั้ง'); return;
  }
  const count = snap.exists() ? Object.keys(snap.val()).length : 0;
  state.online = { fb:db, code, myId, isHost:false, role:'player' };
  await db.ref(`rooms/${code}/players/${myId}`).set({
    name, color:PLAYER_COLORS[count%PLAYER_COLORS.length], pos:0, alive:true, shield:false, skipNext:false,
    dice: Object.fromEntries(DICE_ORDER.map(k=>[k,{cooldown:0}]))
  });
  listenRoom(db, code);
  state.screen='online-lobby'; render();
}

function listenRoom(db, code){
  db.ref('rooms/'+code).on('value', snap=>{
    const val = snap.val();
    if(!val) return;
    const prev = state.onlineRoomData;
    state.onlineRoomData = val;
    if(val.phase === 'lobby' && state.screen === 'online-game'){
      state.screen = 'online-lobby';
    } else if(val.phase !== 'lobby' && state.screen === 'online-lobby'){
      state.screen = 'online-game';
    }
    if(!state.screen.startsWith('online')) return;

    // whoever resolves a round writes lastPaths alongside it — every
    // connected client (not just the host who triggered it) replays the
    // same tile-by-tile walk once, the first time they see that round
    // land as 'resolved'.
    const justResolved = val.phase === 'resolved' && val.lastPaths &&
      prev && prev.phase !== 'resolved' &&
      state.online.lastAnimatedRound !== val.round;

    if(justResolved && state.screen === 'online-game' && state.online.role === 'board'){
      state.online.lastAnimatedRound = val.round;
      const animIds = Object.keys(val.lastPaths);
      const players = animIds.map(id => {
        const p = val.players[id] || {};
        return { id, name: p.name, color: p.color };
      });
      const eatenIds = animIds.filter(id => val.players[id] && val.players[id].alive === false);
      const killLog = (val.lastLog || []).filter(l => l.includes('กิน'));
      const headerHTML = `<div class="eyebrow">รอบที่ ${val.round}</div>
        <div class="board-head-row"><h2 class="display">กระดาน</h2>${renderDirectionPill(val.direction)}</div>`;
      animateTokenWalk({
        boardTiles: val.boardTiles || [], boardSize: val.boardSize,
        paths: val.lastPaths, players, headerHTML,
        killLog, eatenIds, onDone: render,
      });
    } else {
      render();
    }
  });
}

/* ---------- 10b. JOIN LINK + QR CODE ----------
   The board's join link/QR are generated fully client-side — no npm
   dependency, and (like Firebase) the tiny QR library is only fetched from
   its CDN the moment the board's lobby actually needs to draw one. */
function joinUrl(code){
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('code', code);
  return url.toString();
}

let qrLibPromise = null;
function loadQrLib(){
  if(qrLibPromise) return qrLibPromise;
  qrLibPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
    s.onload = () => resolve(window.qrcode);
    s.onerror = () => reject(new Error('qrcode-generator failed to load'));
    document.head.appendChild(s);
  });
  return qrLibPromise;
}

async function mountQrCode(container, text){
  try {
    const qrcodeFn = await loadQrLib();
    const qr = qrcodeFn(0, 'M'); // 0 = auto-pick the smallest size that fits
    qr.addData(text);
    qr.make();
    container.innerHTML = qr.createSvgTag(4, 8);
  } catch (e) {
    container.textContent = 'โหลด QR ไม่สำเร็จ — ใช้ลิงก์หรือโค้ดด้านบนแทนได้';
  }
}

Screens['online-lobby'] = () => {
  const data = state.onlineRoomData || {players:{}};
  return state.online.role === 'board' ? renderBoardLobby(data) : renderPlayerLobby(data);
};

function renderBoardLobby(data){
  const el = document.createElement('div'); el.className='card';
  const url = joinUrl(state.online.code);
  el.innerHTML = `<div class="eyebrow">ห้องรอ · จอกลาง</div><h2 class="display">ห้องประชุม</h2>
    <p class="room-code">${state.online.code}</p>
    <p class="sub">ให้ผู้เล่นสแกน QR หรือกดลิงก์ เพื่อเข้าห้องด้วยมือถือของตัวเอง — จอนี้ใช้แสดงกระดานอย่างเดียว ไม่ต้องเลือกเต๋า</p>`;

  const joinRow = document.createElement('div'); joinRow.className = 'join-row';
  const qrBox = document.createElement('div'); qrBox.className = 'qr-box';
  qrBox.innerHTML = '<span class="sub" style="margin:0;color:#888;">กำลังโหลด QR...</span>';
  mountQrCode(qrBox, url);
  joinRow.appendChild(qrBox);

  const linkBox = document.createElement('div'); linkBox.className = 'link-box';
  const linkLabel = document.createElement('label'); linkLabel.textContent = 'ลิงก์เข้าห้อง';
  const linkInput = document.createElement('input'); linkInput.readOnly = true; linkInput.value = url;
  linkInput.onclick = () => linkInput.select();
  const copyBtn = document.createElement('button'); copyBtn.textContent = 'คัดลอกลิงก์';
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(url).then(()=>{
      copyBtn.textContent = 'คัดลอกแล้ว ✓';
      setTimeout(()=>{ copyBtn.textContent = 'คัดลอกลิงก์'; }, 1500);
    });
  };
  linkBox.appendChild(linkLabel);
  linkBox.appendChild(linkInput);
  linkBox.appendChild(copyBtn);
  joinRow.appendChild(linkBox);
  el.appendChild(joinRow);

  const listTitle = document.createElement('div'); listTitle.className='sub'; listTitle.style.margin='16px 0 6px';
  listTitle.textContent = 'ผู้เล่นที่เข้าห้องแล้ว';
  el.appendChild(listTitle);
  const list = document.createElement('div');
  Object.values(data.players||{}).forEach(p=>{
    const row = document.createElement('div'); row.className='player-row';
    row.innerHTML = `<span class="dot" style="background:${p.color}"></span><span>${p.name}</span>`;
    list.appendChild(row);
  });
  if(!Object.keys(data.players||{}).length){
    const empty = document.createElement('p'); empty.className='sub'; empty.style.margin='0';
    empty.textContent = 'ยังไม่มีใครเข้าห้อง...';
    list.appendChild(empty);
  }
  el.appendChild(list);

  const count = Object.keys(data.players||{}).length;
  const btn = document.createElement('button');
  btn.className='primary'; btn.style.marginTop='16px';
  btn.disabled = count < 2;
  btn.textContent = count < 2 ? 'ต้องมีผู้เล่นอย่างน้อย 2 คน' : `เริ่มเกม (${count} คน)`;
  btn.onclick = startOnlineGame;
  el.appendChild(btn);
  el.appendChild(renderLeaveRoomButton());
  return el;
}

function renderPlayerLobby(data){
  const el = document.createElement('div'); el.className='card';
  const me = (data.players||{})[state.online.myId];
  el.innerHTML = `<div class="eyebrow">เข้าร่วมห้องแล้ว</div>
    <h1 class="display" style="color:${me?me.color:'inherit'}">${me?me.name:'ผู้เล่น'}</h1>
    <p class="sub">รอโฮสต์กดเริ่มเกมที่จอกลาง — เปิดหน้านี้ค้างไว้</p>`;
  el.appendChild(renderLeaveRoomButton());
  return el;
}

async function startOnlineGame(){
  const db = state.online.fb, code = state.online.code;
  const data = state.onlineRoomData;
  const ids = Object.keys(data.players);
  const boardSize = boardSizeFor(ids.length);
  const boardTiles = buildBoard(boardSize, Date.now() & 0xffffffff);
  const step = boardSize/ids.length;
  const updates = { phase:'picking', round:1, boardSize, boardTiles, direction:1, log:[] };
  ids.forEach((id,i)=>{ updates['players/'+id+'/pos'] = Math.floor(i*step); });
  await db.ref('rooms/'+code).update(updates);
  await db.ref('rooms/'+code+'/picks').set(null);
}

/* ---------- 10a. ONLINE IN-GAME SCREENS (picking / reveal / resolved) ----------
   Same DICE_TYPES / SPECIAL_TILES / resolveTurnPure engine as local mode,
   wired to Firebase instead of local state. */

function playersArrayFromRoom(data){
  return Object.keys(data.players||{}).map(id => Object.assign({id}, data.players[id]));
}

Screens['online-game'] = () => {
  const data = state.onlineRoomData;
  if(!data){ const el=document.createElement('div'); el.className='card'; el.textContent='กำลังโหลด...'; return el; }

  // the board device is a spectator — it shows the shared board on 'reveal'
  // and 'resolved', and a waiting/progress view (no dice, it never plays)
  // during 'picking'. Player devices are the opposite: a die-picker during
  // 'picking', and a minimal "watch the board" status otherwise — they
  // never render the board itself.
  if(state.online.role === 'board'){
    if(data.phase==='reveal') return renderOnlineReveal(data);
    if(data.phase==='resolved') return renderOnlineResolved(data);
    return renderBoardPicking(data);
  }
  if(data.phase==='picking') return renderOnlinePicking(data);
  return renderPlayerWaiting(data);
};

function renderBoardPicking(data){
  const el = document.createElement('div'); el.className = 'card';
  const eligibleIds = Object.keys(data.players||{}).filter(id => { const p=data.players[id]; return p.alive && !p.skipNext; });
  el.innerHTML = `<div class="eyebrow">รอบที่ ${data.round} · ห้อง ${state.online.code}</div>
    <div class="board-head-row"><h2 class="display">รอผู้เล่นเลือกลูกเต๋า</h2>${renderDirectionPill(data.direction)}</div>
    <p class="sub">ผู้เล่นแต่ละคนกำลังเลือกลูกเต๋าบนมือถือของตัวเอง — จอนี้จะไม่โชว์ว่าใครเลือกอะไรจนกว่าจะเปิดพร้อมกัน</p>`;
  el.appendChild(renderOnlineWaitingList(data, eligibleIds));
  el.appendChild(renderLeaveRoomButton());
  return el;
}

function renderPlayerWaiting(data){
  const el = document.createElement('div'); el.className = 'card';
  const myId = state.online.myId;
  const me = (data.players||{})[myId] || {};
  el.innerHTML = `<div class="eyebrow">รอบที่ ${data.round}</div>
    <h2 class="display">ดูผลที่จอกลาง 🐍</h2>
    <p class="sub">ผลของรอบนี้กำลังแสดงอยู่บนจอกลาง</p>`;

  const status = document.createElement('div'); status.className = 'card'; status.style.cssText = 'margin-top:4px;padding:16px;';
  if(me.alive === false){
    status.innerHTML = `<div class="eyebrow" style="color:var(--danger)">สถานะของคุณ</div><p class="sub" style="margin:0;">😵 คุณถูกกินไปแล้ว — รอดูจนจบเกมได้</p>`;
  } else {
    const pick = (data.picks||{})[myId];
    const pickText = pick ? `${DICE_TYPES[pick.dieKey].icon} ${DICE_TYPES[pick.dieKey].label} → ทอยได้ ${pick.roll}` : 'พักตานี้';
    status.innerHTML = `<div class="eyebrow">สถานะของคุณ</div>
      <p class="sub" style="margin:0;">ยังอยู่รอด${me.shield?' 🛡️ มีโล่':''}${me.skipNext?' · รอบหน้าพัก ⏭️':''}<br>รอบนี้เลือก: ${pickText}</p>`;
  }
  el.appendChild(status);
  el.appendChild(renderLeaveRoomButton());
  return el;
}

function renderOnlinePicking(data){
  const el = document.createElement('div'); el.className='card';
  const myId = state.online.myId;
  const me = data.players[myId];
  const eligibleIds = Object.keys(data.players).filter(id => { const p=data.players[id]; return p.alive && !p.skipNext; });
  const picks = data.picks || {};
  const iHavePicked = !!picks[myId];

  el.innerHTML = `<div class="eyebrow">รอบที่ ${data.round} · ห้อง ${state.online.code}</div><h2 class="display">เลือกลูกเต๋า</h2>`;

  if(!me || !me.alive){
    const p = document.createElement('p'); p.className='sub'; p.textContent = 'คุณถูกกินไปแล้ว รอดูผลจนจบเกม';
    el.appendChild(p);
  } else if(me.skipNext){
    const p = document.createElement('p'); p.className='sub'; p.textContent = 'รอบนี้คุณหยุดพัก ⏭️ รอรอบถัดไป';
    el.appendChild(p);
  } else if(iHavePicked){
    const p = document.createElement('p'); p.className='sub'; p.textContent = 'เลือกแล้ว — รอผู้เล่นคนอื่น...';
    el.appendChild(p);
  } else {
    const grid = document.createElement('div'); grid.className='row'; grid.style.marginTop='16px';
    DICE_ORDER.forEach(k=>{
      const d = (me.dice && me.dice[k]) || {cooldown:0};
      const b = buildDieButton(k, d.cooldown, ()=> submitOnlinePick(k));
      grid.appendChild(b);
    });
    el.appendChild(grid);
  }

  const listTitle = document.createElement('div'); listTitle.className='sub'; listTitle.style.marginTop='18px'; listTitle.textContent='สถานะผู้เล่น';
  el.appendChild(listTitle);
  el.appendChild(renderOnlineWaitingList(data, eligibleIds));
  el.appendChild(renderLeaveRoomButton());
  return el;
}

async function submitOnlinePick(dieKey){
  const db = state.online.fb, code = state.online.code, myId = state.online.myId;
  const def = DICE_TYPES[dieKey];
  const roll = def.faces[Math.floor(Math.random()*def.faces.length)];
  await db.ref('rooms/'+code+'/picks/'+myId).set({ dieKey, roll });

  // whoever completes the last pending pick advances the room to reveal
  const snap = await db.ref('rooms/'+code).get();
  const fresh = snap.val();
  if(!fresh || fresh.phase !== 'picking') return;
  const eligible = Object.keys(fresh.players||{}).filter(id => { const p=fresh.players[id]; return p.alive && !p.skipNext; });
  const freshPicks = fresh.picks || {};
  const allPicked = eligible.length>0 && eligible.every(id => !!freshPicks[id]);
  if(allPicked){ await db.ref('rooms/'+code+'/phase').set('reveal'); }
}

function renderOnlineReveal(data){
  const el = document.createElement('div'); el.className='card';
  el.innerHTML = `<div class="eyebrow">รอบที่ ${data.round}</div>
    <div class="board-head-row"><h2 class="display">พร้อมเปิดผล</h2>${renderDirectionPill(data.direction)}</div>`;
  el.appendChild(renderBoardGeneric(data.boardTiles||[], data.boardSize, playersArrayFromRoom(data)));
  el.appendChild(renderTileLegend());
  el.appendChild(renderOnlinePlayerList(data));
  if(state.online.isHost){
    const btn = document.createElement('button'); btn.className='primary'; btn.style.marginTop='16px';
    btn.textContent='เปิดพร้อมกัน ✦'; btn.onclick = resolveOnlineRound;
    el.appendChild(btn);
  } else {
    const p = document.createElement('p'); p.className='sub'; p.style.marginTop='16px'; p.textContent='รอโฮสต์เปิดเผยผล...';
    el.appendChild(p);
  }
  el.appendChild(renderLeaveRoomButton());
  return el;
}

async function resolveOnlineRound(){
  const db = state.online.fb, code = state.online.code;
  const data = state.onlineRoomData;
  const playersArr = Object.keys(data.players).map(id=>{
    const pd = data.players[id];
    return {
      id, name: pd.name, color: pd.color, pos: pd.pos, alive: pd.alive,
      shield: !!pd.shield, skipNext: !!pd.skipNext,
      dice: DICE_ORDER.map(k => ({ key:k, cooldown: (pd.dice && pd.dice[k] && pd.dice[k].cooldown) || 0 })),
    };
  });
  const picks = data.picks || {};
  const result = resolveTurnPure(playersArr, data.boardTiles || [], data.boardSize, data.direction, picks);

  const updates = { direction: result.direction, phase: 'resolved' };
  playersArr.forEach(p=>{
    updates['players/'+p.id+'/pos'] = p.pos;
    updates['players/'+p.id+'/alive'] = p.alive;
    updates['players/'+p.id+'/shield'] = p.shield;
    updates['players/'+p.id+'/skipNext'] = p.skipNext;
    const diceObj = {};
    p.dice.forEach(d=>{ diceObj[d.key] = { cooldown: d.cooldown }; });
    updates['players/'+p.id+'/dice'] = diceObj;
  });
  updates['log'] = (data.log||[]).concat(result.log).slice(-80);
  // written so every connected client (including this one, via its own
  // listener) can replay the same tile-by-tile walk — and the eaten-reveal
  // callout — once this lands.
  updates['lastPaths'] = result.paths;
  updates['lastLog'] = result.log;

  // picks are intentionally left in the room here (not cleared) so the
  // 'resolved' screen can show who used which die this round; they get
  // cleared once the next picking phase actually starts.
  await db.ref('rooms/'+code).update(updates);
}

function renderOnlineResolved(data){
  const el = document.createElement('div'); el.className='card';
  el.innerHTML = `<div class="eyebrow">รอบที่ ${data.round}</div>
    <div class="board-head-row"><h2 class="display">กระดาน</h2>${renderDirectionPill(data.direction)}</div>`;
  const playersArr = playersArrayFromRoom(data);
  el.appendChild(renderBoardGeneric(data.boardTiles||[], data.boardSize, playersArr));
  el.appendChild(renderTileLegend());
  el.appendChild(renderOnlinePlayerList(data, data.picks || {}));

  const logDiv = document.createElement('div'); logDiv.className='log';
  (data.log||[]).slice().reverse().slice(0,30).forEach(line=>{
    const d = document.createElement('div');
    d.className = line.includes('กิน') ? 'kill' : (line.includes('โบนัส')?'bonus':'');
    d.textContent = line; logDiv.appendChild(d);
  });
  el.appendChild(logDiv);

  const aliveCount = playersArr.filter(p=>p.alive).length;
  if(aliveCount<=1){
    const winner = playersArr.find(p=>p.alive);
    const h = document.createElement('h3'); h.className='display'; h.style.color='var(--gold-bright)'; h.style.marginTop='16px';
    h.textContent = winner ? `${winner.name} คือผู้รอดชีวิตคนสุดท้าย 🐍` : 'ไม่มีผู้รอดชีวิต';
    el.appendChild(h);
    if(state.online.isHost){
      const again = document.createElement('button'); again.className='primary'; again.style.marginTop='10px';
      again.textContent='เริ่มห้องใหม่'; again.onclick = restartOnlineRoom;
      el.appendChild(again);
    }
  } else if(state.online.isHost){
    const btn = document.createElement('button'); btn.className='primary'; btn.style.marginTop='16px';
    btn.textContent='รอบถัดไป →'; btn.onclick = beginOnlinePickingPhase;
    el.appendChild(btn);
  } else {
    const p = document.createElement('p'); p.className='sub'; p.style.marginTop='16px'; p.textContent='รอโฮสต์เริ่มรอบถัดไป...';
    el.appendChild(p);
  }
  el.appendChild(renderLeaveRoomButton());
  return el;
}

async function beginOnlinePickingPhase(){
  const db = state.online.fb, code = state.online.code;
  const data = state.onlineRoomData;
  const ids = Object.keys(data.players);
  const updates = { round: (data.round||0)+1, phase: 'picking' };
  // dice cooldowns are aged down inside resolveOnlineRound/resolveTurnPure
  // (once per resolved round) — not here, so a die stays locked for the
  // whole round after use.
  let anyEligible = false;
  ids.forEach(id=>{
    const pd = data.players[id];
    if(!pd.alive) return;
    if(!pd.skipNext) anyEligible = true;
  });
  if(!anyEligible) updates.phase = 'reveal';
  await db.ref('rooms/'+code).update(updates);
  await db.ref('rooms/'+code+'/picks').set(null);
}

async function restartOnlineRoom(){
  const db = state.online.fb, code = state.online.code;
  const data = state.onlineRoomData;
  const ids = Object.keys(data.players);
  const updates = { phase:'lobby', round:0, direction:1, boardTiles:[], boardSize:24, log:[] };
  ids.forEach(id=>{
    updates['players/'+id+'/pos']=0;
    updates['players/'+id+'/alive']=true;
    updates['players/'+id+'/shield']=false;
    updates['players/'+id+'/skipNext']=false;
    DICE_ORDER.forEach(k=>{ updates['players/'+id+'/dice/'+k+'/cooldown']=0; });
  });
  await db.ref('rooms/'+code).update(updates);
  await db.ref('rooms/'+code+'/picks').set(null);
}

function renderOnlinePlayerList(data, picks){
  const list = document.createElement('div'); list.style.marginTop='16px';
  playersArrayFromRoom(data).forEach(p=>{
    const row = document.createElement('div'); row.className='player-row';
    row.style.opacity = p.alive ? 1 : .35;
    row.innerHTML = `<span class="dot" style="background:${p.color}"></span>
      <span>${p.name}${!p.alive?' (ถูกกิน)':''}${p.shield?' 🛡️':''}${p.skipNext?' ⏭️':''}</span>` +
      (picks ? renderPickBadge(picks[p.id]) : '');
    list.appendChild(row);
  });
  return list;
}

function renderOnlineWaitingList(data, eligibleIds){
  const picks = data.picks || {};
  const wrap = document.createElement('div'); wrap.className='waiting-list';
  eligibleIds.forEach(id=>{
    const p = data.players[id];
    const picked = !!picks[id];
    const row = document.createElement('div'); row.className='player-row';
    row.innerHTML = `<span class="dot" style="background:${p.color}"></span><span${picked?' class="picked"':''}>${p.name}${picked?' ✓ เลือกแล้ว':' … กำลังเลือก'}</span>`;
    wrap.appendChild(row);
  });
  return wrap;
}

function renderLeaveRoomButton(){
  const btn = document.createElement('button'); btn.style.marginTop='20px'; btn.textContent='ออกจากห้อง';
  btn.onclick = leaveOnlineRoom;
  return btn;
}

function leaveOnlineRoom(){
  if(state.online.fb && state.online.code){
    state.online.fb.ref('rooms/'+state.online.code).off();
  }
  state.online = { fb:null, room:null, code:null, myId:null, isHost:false, role:null };
  state.onlineRoomData = null;
  state.screen = 'home'; state.mode = null;
  render();
}

// a QR scan or shared "?code=XXXX" link jumps straight to the join screen
// with the code pre-filled — skip the usual home/setup/mode flow entirely.
// Only honored when online mode is actually configured; otherwise it would
// try to join a Firebase project that doesn't exist.
if(FIREBASE_ENABLED){
  const joinCode = new URLSearchParams(location.search).get('code');
  if(joinCode){
    state.pendingJoinCode = joinCode;
    state.screen = 'online-join';
  }
}

render();

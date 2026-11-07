/*
 * การ์ด "ชอบเกมแนวนี้? ดู STAYGO เล่นบอร์ดเกมจริง" ที่หน้าจบเกม
 *
 * วิธีใช้: ใส่ <div data-staygo-cta="<game-key>"></div> ไว้ในหน้าจอจบเกม
 * สคริปต์นี้จะเติมการ์ดให้เอง รวมถึง placeholder ที่ถูก render ทีหลังด้วย JS
 * แต่ละครั้งจะสุ่มคลิป 1 คลิปจากรายการของเกมนั้น
 *
 * slug ต้องตรงกับ src/data/boardgames.ts (หน้า /how-to-play/<slug>/)
 */
(function () {
  var SUBSCRIBE_URL = 'https://www.youtube.com/@STAYGO?sub_confirmation=1';

  var CLIPS = {
    'bomb-busters': { name: 'Bomb Busters', video: 'QlVaZABu0tY' },
    ito: { name: 'ito', video: 'X99GEDdtjzA' },
    antidote: { name: 'Antidote', video: 'S7qlHMo0Gx4' },
    trophies: { name: 'Trophies', video: 'sJdAhWyHw-E' },
    codenames: { name: 'Codenames', video: 'TjAVPm0BxCA' },
    'forbidden-word': { name: 'คำต้องห้าม', video: 'Wa5t5_qJYTI' },
    'love-letter': { name: 'Love Letter', video: 'f4tGQ_ANC8Q' },
    'hot-streak': { name: 'Hot Streak', video: '0BYL_hJqHk8' },
    'uno-show-em-no-mercy': { name: "UNO Show 'Em No Mercy", video: '2tUUn1ywX80' },
    'name-it': { name: 'มหึหมา (Name IT!)', video: 'V3hhI8NH3YY' },
    'art-frenzy': { name: 'Art Frenzy', video: 't3rfK9E5Xvk' },
    'hues-and-cues': { name: 'Hues and Cues', video: 's2T67aQ8KDU' },
    'here-to-slay': { name: 'Here to Slay', video: 'R1Lqqi087r8' },
    'marvel-united-spiderman': { name: 'Marvel United', video: 'FwdbZ1KRoGk' },
    'quest-master-new-era': { name: 'Quest Master New Era', video: 'SLIVcAzwkqA' },
    'get-bit': { name: 'Get Bit! ฉลามงับ', video: 'iyxjQAcYCno' },
    perudo: { name: 'Perudo', video: 'ZlRhOjCpkpA' },
    'sitting-ducks': { name: 'Sitting Ducks', video: 'gw5bMi9oMCI' },
    'black-stories': { name: 'Black Stories', video: 'uyGbehtraZU' },
    jinxo: { name: 'JinxO', video: 'a_2HmwxGpqI' },
  };

  // เกมบนเว็บ -> คลิปบอร์ดเกมแนวใกล้เคียง
  var GAME_CLIPS = {
    decoder: ['bomb-busters', 'ito', 'antidote'],
    'thai-wordle': ['trophies', 'codenames', 'forbidden-word'],
    cardloop: ['love-letter', 'hot-streak', 'uno-show-em-no-mercy'],
    'emoji-match': ['name-it', 'art-frenzy', 'hues-and-cues'],
    'dungeon-ledger': ['here-to-slay', 'marvel-united-spiderman', 'quest-master-new-era'],
    ouroboros: ['get-bit', 'perudo', 'sitting-ducks'],
    'zoom-quiz': ['hues-and-cues', 'black-stories', 'jinxo'],
    lunjua: ['get-bit', 'perudo', 'hot-streak'],
    staygo: ['love-letter', 'uno-show-em-no-mercy', 'here-to-slay'],
  };

  var CSS =
    '.sg-cta{display:flex;gap:12px;align-items:center;text-align:left;margin:16px auto;max-width:440px;padding:12px;' +
    'border-radius:14px;background:#fff;border:1px solid #E5E7EB;box-shadow:0 4px 14px rgba(0,0,0,.08);' +
    "color:#111827;font:14px/1.45 Kanit,Inter,system-ui,sans-serif}" +
    '.sg-cta-thumb{position:relative;flex:0 0 120px;aspect-ratio:16/9;border-radius:8px;overflow:hidden;background:#F3F4F6;display:block}' +
    '.sg-cta-thumb img{width:100%;height:100%;object-fit:cover;display:block}' +
    '.sg-cta-thumb span{position:absolute;right:6px;bottom:6px;width:22px;height:22px;border-radius:50%;background:#FF0000;color:#fff;' +
    'font-size:9px;display:flex;align-items:center;justify-content:center;padding-left:2px}' +
    '.sg-cta-body{flex:1;min-width:0}' +
    '.sg-cta-eyebrow{font-size:12px;color:#6B7280;margin:0}' +
    '.sg-cta-title{font-weight:700;font-size:15px;margin:2px 0 8px;color:#111827}' +
    '.sg-cta-actions{display:flex;flex-wrap:wrap;gap:6px}' +
    '.sg-cta-actions a{display:inline-flex;align-items:center;border-radius:8px;padding:5px 10px;font-size:13px;font-weight:600;text-decoration:none}' +
    '.sg-cta-watch{background:#3B82F6;color:#fff}' +
    '.sg-cta-sub{background:#FF0000;color:#fff}' +
    '@media (max-width:380px){.sg-cta{flex-direction:column;align-items:stretch}.sg-cta-thumb{flex-basis:auto}}';

  function injectStyle() {
    if (document.getElementById('sg-cta-style')) return;
    var style = document.createElement('style');
    style.id = 'sg-cta-style';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function track(action, slug, game) {
    if (typeof window.gtag === 'function') {
      window.gtag('event', 'staygo_cta_click', { cta_action: action, clip_slug: slug, source_game: game });
    }
  }

  // คลิปที่สุ่มได้จะคงเดิมตลอดที่หน้าจบเกมยังเปิดอยู่ (บางเกม render ใหม่ทั้งหน้าบ่อยๆ)
  // พอหน้าจบเกมปิดไปแล้ว รอบหน้าค่อยสุ่มใหม่
  var chosen = {};

  function fill(el) {
    var game = el.getAttribute('data-staygo-cta');
    var slugs = GAME_CLIPS[game];
    if (!slugs) return;
    if (!chosen[game]) chosen[game] = slugs[Math.floor(Math.random() * slugs.length)];
    var slug = chosen[game];
    var clip = CLIPS[slug];
    var page = '/how-to-play/' + slug + '/';

    el.setAttribute('data-staygo-cta-filled', '');
    el.innerHTML =
      '<div class="sg-cta">' +
      '<a class="sg-cta-thumb" href="' + page + '" target="_blank" rel="noopener" data-sg="thumb">' +
      '<img src="https://i.ytimg.com/vi/' + clip.video + '/mqdefault.jpg" alt="" loading="lazy" /><span>▶</span></a>' +
      '<div class="sg-cta-body">' +
      '<p class="sg-cta-eyebrow">ชอบเกมแนวนี้? ดู STAYGO เล่นบอร์ดเกมจริง</p>' +
      '<p class="sg-cta-title">' + clip.name + '</p>' +
      '<div class="sg-cta-actions">' +
      '<a class="sg-cta-watch" href="' + page + '" target="_blank" rel="noopener" data-sg="watch">▶ ดูคลิป & วิธีเล่น</a>' +
      '<a class="sg-cta-sub" href="' + SUBSCRIBE_URL + '" target="_blank" rel="noopener noreferrer" data-sg="subscribe">🔔 ติดตามช่อง</a>' +
      '</div></div></div>';

    el.addEventListener('click', function (event) {
      var link = event.target.closest('a[data-sg]');
      if (link) track(link.getAttribute('data-sg'), slug, game);
    });
  }

  function fillAll() {
    for (var game in chosen) {
      if (!document.querySelector('[data-staygo-cta="' + game + '"]')) delete chosen[game];
    }
    var nodes = document.querySelectorAll('[data-staygo-cta]:not([data-staygo-cta-filled])');
    for (var i = 0; i < nodes.length; i++) fill(nodes[i]);
  }

  function start() {
    injectStyle();
    fillAll();
    // รองรับหน้าจบเกมที่ถูก render ทีหลังด้วย JS
    new MutationObserver(function () {
      fillAll();
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start);
})();

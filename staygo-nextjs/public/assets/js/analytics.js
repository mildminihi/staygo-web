/*
 * Google Analytics 4 สำหรับทั้งเว็บ (หน้า Next.js + หน้าเกม/เครื่องมือใน public/)
 *
 * ใส่ Measurement ID ที่ GA_MEASUREMENT_ID ด้านล่าง (รูปแบบ G-XXXXXXXXXX)
 * ถ้ายังเว้นว่างไว้ สคริปต์นี้จะไม่ทำอะไรเลย และไม่ขึ้นแบนเนอร์คุกกี้
 *
 * - ใช้ Consent Mode: เริ่มต้นไม่เก็บคุกกี้ จนกว่าผู้ใช้จะกด "ยอมรับ" ในแบนเนอร์
 * - ส่ง event "youtube_click" ทุกครั้งที่มีคนกดลิงก์ไป YouTube
 *   พร้อม link_type = subscribe | video | channel
 */
(function () {
  var GA_MEASUREMENT_ID = 'G-368M1JZZVN';

  if (!GA_MEASUREMENT_ID || window.__staygoAnalytics) return;
  window.__staygoAnalytics = true;

  var CONSENT_KEY = 'staygo-analytics-consent';

  function readConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY);
    } catch (e) {
      return null;
    }
  }

  function saveConsent(value) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch (e) {
      /* private mode: ถามใหม่ครั้งหน้า */
    }
  }

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  var consent = readConsent();
  gtag('consent', 'default', {
    analytics_storage: consent === 'granted' ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID);

  var script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_MEASUREMENT_ID;
  document.head.appendChild(script);

  // ---- นับคลิกลิงก์ไป YouTube ----
  function youtubeLinkType(url) {
    if (url.indexOf('sub_confirmation=1') !== -1) return 'subscribe';
    if (url.indexOf('watch?v=') !== -1 || url.indexOf('youtu.be/') !== -1) return 'video';
    return 'channel';
  }

  document.addEventListener(
    'click',
    function (event) {
      var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
      if (!link) return;
      var href = link.href;
      if (!/(^https?:\/\/)(www\.|m\.)?(youtube\.com|youtu\.be)\//.test(href)) return;

      gtag('event', 'youtube_click', {
        link_type: youtubeLinkType(href),
        link_url: href,
        link_text: (link.textContent || link.getAttribute('aria-label') || '').trim().slice(0, 100),
      });
    },
    true
  );

  // ---- แบนเนอร์ขอความยินยอมคุกกี้ ----
  if (consent) return;

  function showBanner() {
    var style = document.createElement('style');
    style.textContent =
      '#staygo-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483000;max-width:560px;margin:0 auto;' +
      'display:flex;flex-wrap:wrap;align-items:center;gap:10px 16px;padding:14px 16px;border-radius:14px;' +
      'background:#111827;color:#F9FAFB;font:14px/1.5 Kanit,Inter,system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.25)}' +
      '#staygo-consent p{margin:0;flex:1 1 240px}' +
      '#staygo-consent div{display:flex;gap:8px;margin-left:auto}' +
      '#staygo-consent button{border:0;border-radius:10px;padding:8px 14px;font:600 14px Kanit,Inter,system-ui,sans-serif;cursor:pointer}' +
      '#staygo-consent .accept{background:#3B82F6;color:#fff}' +
      '#staygo-consent .decline{background:transparent;color:#D1D5DB;border:1px solid #4B5563}';
    document.head.appendChild(style);

    var banner = document.createElement('div');
    banner.id = 'staygo-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'การใช้คุกกี้');
    banner.innerHTML =
      '<p>เว็บนี้ใช้คุกกี้เพื่อนับสถิติการใช้งาน ช่วยให้เราพัฒนาเกมและเครื่องมือได้ดีขึ้น</p>' +
      '<div><button type="button" class="decline">ไม่อนุญาต</button>' +
      '<button type="button" class="accept">ยอมรับ</button></div>';

    function choose(value) {
      saveConsent(value);
      gtag('consent', 'update', { analytics_storage: value });
      banner.remove();
    }
    banner.querySelector('.accept').addEventListener('click', function () {
      choose('granted');
    });
    banner.querySelector('.decline').addEventListener('click', function () {
      choose('denied');
    });

    document.body.appendChild(banner);
  }

  if (document.body) showBanner();
  else document.addEventListener('DOMContentLoaded', showBanner);
})();

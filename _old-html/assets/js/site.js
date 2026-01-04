function getConfig() {
  const cfg = (window.STAYGO_CONFIG || {});
  return {
    latestYouTubeVideoId: typeof cfg.latestYouTubeVideoId === "string" ? cfg.latestYouTubeVideoId.trim() : "",

    youTubeApiKey: typeof cfg.youTubeApiKey === "string" ? cfg.youTubeApiKey.trim() : "",
    youTubeChannelId: typeof cfg.youTubeChannelId === "string" ? cfg.youTubeChannelId.trim() : "",
    youTubeApiBaseUrl: typeof cfg.youTubeApiBaseUrl === "string" ? cfg.youTubeApiBaseUrl.trim() : "",
    youTubeMaxPlaylists: Number.isFinite(cfg.youTubeMaxPlaylists) ? cfg.youTubeMaxPlaylists : 50,
    youTubeMaxVideosPerPlaylist: Number.isFinite(cfg.youTubeMaxVideosPerPlaylist) ? cfg.youTubeMaxVideosPerPlaylist : 200,
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function fetchJson(url, { timeoutMs = 12000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "Accept": "application/json" },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = typeof data?.error?.message === "string" ? data.error.message : `Request failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      err.details = data;
      throw err;
    }
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function buildYouTubeUrl(path, params, { baseUrl = "" } = {}) {
  const base = (baseUrl || "").trim() || "https://www.googleapis.com/youtube/v3";
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  const url = new URL(`${normalizedBase}/${path}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });
  return url.toString();
}

function normalizeLimit(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  if (n <= 0) return Infinity;
  return Math.floor(n);
}

async function fetchAllPages(fetchPage, { pageSize = 50, limit = Infinity } = {}) {
  const items = [];
  let pageToken = "";

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await fetchPage({ pageToken, pageSize });
    const pageItems = Array.isArray(page?.items) ? page.items : [];
    items.push(...pageItems);
    if (items.length >= limit) return items.slice(0, limit);

    pageToken = typeof page?.nextPageToken === "string" ? page.nextPageToken : "";
    if (!pageToken) return items;
  }
}

function pickThumb(thumbnails) {
  const t = thumbnails || {};
  return (
    t.maxres?.url ||
    t.standard?.url ||
    t.high?.url ||
    t.medium?.url ||
    t.default?.url ||
    ""
  );
}

function formatThaiDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

async function getLatestYouTubeVideoId({ apiKey, channelId, baseUrl }) {
  const url = buildYouTubeUrl(
    "search",
    {
    part: "snippet",
    channelId,
    order: "date",
    type: "video",
    maxResults: 1,
    key: apiKey,
    },
    { baseUrl }
  );

  const data = await fetchJson(url);
  const first = Array.isArray(data?.items) ? data.items[0] : null;
  const id = first?.id?.videoId;
  return typeof id === "string" ? id : "";
}

function renderLatestVideoEmbed({ mount, videoId }) {
  const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}`;
  mount.innerHTML = `
    <div class="responsive-iframe">
      <iframe
        src="${src}"
        title="STAYGO latest YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowfullscreen
        referrerpolicy="strict-origin-when-cross-origin"
      ></iframe>
    </div>
  `;
}

async function renderLatestVideo() {
  const mount = document.querySelector("[data-latest-youtube]");
  if (!mount) return;

  const cfg = getConfig();

  // Prefer fetching the real latest upload when Data API is configured.
  // Note: For security, prefer using a proxy (youTubeApiBaseUrl) and keep apiKey empty.
  if (cfg.youTubeChannelId && (cfg.youTubeApiKey || cfg.youTubeApiBaseUrl)) {
    mount.innerHTML = "<p class=\"muted\">กำลังโหลดคลิปล่าสุดจาก YouTube…</p>";
    try {
      const latestId = await getLatestYouTubeVideoId({
        apiKey: cfg.youTubeApiKey,
        channelId: cfg.youTubeChannelId,
        baseUrl: cfg.youTubeApiBaseUrl,
      });
      if (latestId) {
        renderLatestVideoEmbed({ mount, videoId: latestId });
        return;
      }
    } catch {
      // fall through to config-based fallback
    }
  }

  // Fallback: use manually configured id.
  if (!cfg.latestYouTubeVideoId) {
    mount.innerHTML = "<p class=\"muted\">ยังไม่สามารถดึงคลิปล่าสุดได้ — ตั้งค่า <strong>youTubeApiKey</strong>/<strong>youTubeChannelId</strong> หรือใส่ <strong>latestYouTubeVideoId</strong> ใน <strong>assets/config.js</strong></p>";
    return;
  }

  renderLatestVideoEmbed({ mount, videoId: cfg.latestYouTubeVideoId });
}

function renderVideoBrowserSkeleton({ mount, statusEl }) {
  if (statusEl) statusEl.textContent = "กำลังโหลดรายการคลิป…";
  if (mount) {
    mount.innerHTML = `
      <div class="muted">กำลังดึงข้อมูลจาก YouTube…</div>
    `;
  }
}

function renderVideoBrowserError({ mount, statusEl, message }) {
  if (statusEl) statusEl.textContent = "";
  if (!mount) return;
  mount.innerHTML = `
    <p class="muted">${escapeHtml(message || "โหลดรายการคลิปไม่สำเร็จ")}</p>
  `;
}

function renderVideoBrowser({ mount, statusEl, playlists, query }) {
  if (!mount) return;
  const q = (query || "").trim().toLowerCase();

  const filtered = playlists
    .map((pl) => {
      const items = (pl.items || []).filter((v) => {
        if (!q) return true;
        return (v.title || "").toLowerCase().includes(q);
      });
      return { ...pl, items };
    })
    .filter((pl) => (pl.items || []).length > 0);

  const totalVideos = playlists.reduce((acc, pl) => acc + (pl.items || []).length, 0);
  const shownVideos = filtered.reduce((acc, pl) => acc + (pl.items || []).length, 0);

  if (statusEl) {
    statusEl.textContent = q
      ? `พบ ${shownVideos} คลิป จากทั้งหมด ${totalVideos} คลิป`
      : `ทั้งหมด ${totalVideos} คลิป`;
  }

  if (filtered.length === 0) {
    mount.innerHTML = `<p class="muted">${q ? "ไม่พบคลิปที่ตรงกับคำค้น" : "ยังไม่มีรายการคลิป"}</p>`;
    return;
  }

  mount.innerHTML = filtered
    .map((pl) => {
      const listHtml = (pl.items || [])
        .map((v) => {
          const href = `https://www.youtube.com/watch?v=${encodeURIComponent(v.videoId)}`;
          const dateText = v.publishedAt ? formatThaiDate(v.publishedAt) : "";
          const sub = [dateText].filter(Boolean).join(" • ");

          return `
            <a class="video-item" href="${href}" target="_blank" rel="noopener noreferrer">
              <div class="thumb">${v.thumbUrl ? `<img src="${escapeHtml(v.thumbUrl)}" alt="" loading="lazy" />` : ""}</div>
              <div class="video-meta">
                <p class="video-title">${escapeHtml(v.title || "(ไม่มีชื่อคลิป)")}</p>
                ${sub ? `<p class="video-sub">${escapeHtml(sub)}</p>` : ""}
              </div>
            </a>
          `;
        })
        .join("");

      return `
        <section class="playlist">
          <h3 class="playlist-title">${escapeHtml(pl.title || "(ไม่มีชื่อ Playlist)")}</h3>
          <div class="video-list">${listHtml}</div>
        </section>
      `;
    })
    .join("");
}

async function loadYouTubePlaylistsAndVideos() {
  const mount = document.querySelector("[data-video-browser]");
  const searchInput = document.querySelector("[data-video-search]");
  const statusEl = document.querySelector("[data-video-search-status]");

  if (!mount) return;

  const cfg = getConfig();
  const apiKey = cfg.youTubeApiKey;
  const channelId = cfg.youTubeChannelId;
  const baseUrl = cfg.youTubeApiBaseUrl;
  const maxPlaylists = normalizeLimit(cfg.youTubeMaxPlaylists, 50);
  const maxVideosPerPlaylist = normalizeLimit(cfg.youTubeMaxVideosPerPlaylist, 200);

  if (!channelId || (!apiKey && !baseUrl)) {
    renderVideoBrowserError({
      mount,
      statusEl,
      message: "ยังไม่ได้ตั้งค่า youTubeChannelId และ (youTubeApiKey หรือ youTubeApiBaseUrl) ใน assets/config.js — ถ้าตั้งค่าแล้วจะแสดงรายการคลิปแยกตาม Playlist และค้นหาได้",
    });
    return;
  }

  renderVideoBrowserSkeleton({ mount, statusEl });

  try {
    const playlists = await fetchAllPages(
      async ({ pageToken, pageSize }) => {
        const url = buildYouTubeUrl(
          "playlists",
          {
          part: "snippet,contentDetails",
          channelId,
          maxResults: Math.min(pageSize, 50),
          pageToken,
          key: apiKey,
          },
          { baseUrl }
        );
        return fetchJson(url);
      },
      { pageSize: 50, limit: maxPlaylists }
    );

    const playlistModels = playlists
      .map((pl) => {
        const title = pl?.snippet?.title || "";
        const id = pl?.id || "";
        return { id, title, items: [] };
      })
      .filter((pl) => pl.id);

    // Fetch videos for each playlist (sequential to avoid hitting rate limits)
    for (const pl of playlistModels) {
      const items = await fetchAllPages(
        async ({ pageToken, pageSize }) => {
          const url = buildYouTubeUrl(
            "playlistItems",
            {
            part: "snippet,contentDetails",
            playlistId: pl.id,
            maxResults: Math.min(pageSize, 50),
            pageToken,
            key: apiKey,
            },
            { baseUrl }
          );
          return fetchJson(url);
        },
        { pageSize: 50, limit: maxVideosPerPlaylist }
      );

      pl.items = items
        .map((it) => {
          const videoId = it?.contentDetails?.videoId || it?.snippet?.resourceId?.videoId || "";
          const title = it?.snippet?.title || "";
          const publishedAt = it?.contentDetails?.videoPublishedAt || it?.snippet?.publishedAt || "";
          const thumbUrl = pickThumb(it?.snippet?.thumbnails);
          return { videoId, title, publishedAt, thumbUrl };
        })
        .filter((v) => v.videoId && v.title && v.title !== "Deleted video" && v.title !== "Private video");
    }

    const state = {
      playlists: playlistModels,
      query: "",
    };

    const rerender = () => {
      renderVideoBrowser({
        mount,
        statusEl,
        playlists: state.playlists,
        query: state.query,
      });
    };

    rerender();

    if (searchInput) {
      let t = 0;
      searchInput.addEventListener("input", () => {
        window.clearTimeout(t);
        t = window.setTimeout(() => {
          state.query = String(searchInput.value || "");
          rerender();
        }, 120);
      });
    }
  } catch (err) {
    const msg = err && typeof err.message === "string" ? err.message : "โหลดรายการคลิปไม่สำเร็จ";
    renderVideoBrowserError({ mount, statusEl, message: msg });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  renderLatestVideo();
  loadYouTubePlaylistsAndVideos();
  initScrollSpy();
});

// Scroll spy for navigation highlighting
function initScrollSpy() {
  const navLinks = document.querySelectorAll('.nav-link');
  const sections = document.querySelectorAll('section[id]');
  
  if (!navLinks.length || !sections.length) return;

  function updateActiveNav() {
    const scrollPos = window.scrollY + 100; // offset for header height

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const sectionId = section.getAttribute('id');
      
      if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
        navLinks.forEach(link => {
          link.classList.remove('active');
          if (link.getAttribute('href') === `#${sectionId}`) {
            link.classList.add('active');
          }
        });
      }
    });
  }

  // Update on scroll
  window.addEventListener('scroll', updateActiveNav, { passive: true });
  
  // Update on load
  updateActiveNav();
  
  // Smooth scroll for anchor links
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const targetId = href.substring(1);
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
          const headerHeight = document.querySelector('.header')?.offsetHeight || 64;
          const targetPosition = targetSection.offsetTop - headerHeight;
          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      }
    });
  });
}


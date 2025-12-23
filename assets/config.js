// Home page: Latest clip
// If you set youTubeApiKey + youTubeChannelId below, the site will auto-fetch the REAL latest upload.
// latestYouTubeVideoId is used as a fallback when API isn't available.
window.STAYGO_CONFIG = {
  latestYouTubeVideoId: "2tUUn1ywX80",

  // Optional: show ALL videos grouped by playlist + enable search on Home page.
  // Requires a YouTube Data API v3 key.
  // 1) Create API key in Google Cloud Console
  // 2) Enable: YouTube Data API v3
  // 3) Fill in key + channel id below
  // IMPORTANT: Do NOT commit a real API key to a public repo.
  // Put your key here locally, or create a restricted key for your domains.
  youTubeApiKey: "",
  youTubeChannelId: "UC5Z1w5HIJKqXCegr4zHH5Wg",

  // Safety limits (optional). Leave as numbers.
  // Set to 0 to attempt to fetch everything (may be slower and use more quota).
  youTubeMaxPlaylists: 50,
  youTubeMaxVideosPerPlaylist: 200,
};

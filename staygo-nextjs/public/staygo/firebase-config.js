// STAYGO! online — Firebase web config.
// Fill these in after creating the Firebase project (see staygo-online/README.md).
// Firebase console → Project settings → General → Your apps → Web app → SDK config.
// These values are public by design; security comes from database.rules.json + Cloud Functions.
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyCSet1Y1xR6Qh8_JlFI6-rc-mVbMlx6ykk",
  authDomain: "staygo-online.firebaseapp.com",
  databaseURL: "https://staygo-online-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "staygo-online",
  appId: "1:1006176583388:web:89b4ddf455730fb5bf7e19",
};

// Must match REGION in staygo-online/functions/src/index.ts
export const FUNCTIONS_REGION = "asia-southeast1";

// STAYGO! online — Firebase web config.
// Fill these in after creating the Firebase project (see staygo-online/README.md).
// Firebase console → Project settings → General → Your apps → Web app → SDK config.
// These values are public by design; security comes from database.rules.json + Cloud Functions.
export const FIREBASE_CONFIG = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  appId: "",
};

// Must match REGION in staygo-online/functions/src/index.ts
export const FUNCTIONS_REGION = "asia-southeast1";

# STAYGO Online

Two games, one 60-card deck:

| Game | Where | Backend |
|---|---|---|
| **ลุ้นจั่ว** (push-your-luck, 2–6) | `staygo-nextjs/public/games/lunjua/` → `/games/lunjua/` | none, runs in the browser |
| **STAYGO!** (hidden hands, 2–5) | `staygo-nextjs/public/staygo/` → `/staygo/?room=K7QX` | Firebase RTDB + Cloud Functions |

```
staygo-online/
  engine/engine.ts         pure rules for both games (no Firebase, no DOM)
  engine/engine.test.ts    random-game simulations + projection/turn checks
  functions/src/index.ts   createRoom, joinRoom, leaveRoom, gameAction
  database.rules.json      players can read public + only their own private node
  firebase.json
staygo-nextjs/public/assets/js/staygo-engine/
  engine.js                compiled from engine/engine.ts (do not edit by hand)
  ui.js                    shared card/row rendering helpers (hand-written)
staygo-nextjs/public/assets/css/staygo-cards.css   brand colors, cards, row pills
```

## Engine

```bash
cd staygo-online
npm test                # node --test (Node 23+ runs .ts directly)
npm run build:web       # recompile engine.ts → public/assets/js/staygo-engine/engine.js
```

After changing `engine/engine.ts`, run **both** `npm run build:web` (browser copy) and redeploy functions (server copy).

`build:web` uses `tsc`; if `staygo-online` has no `node_modules`, run `npm install` here first or use
`../staygo-nextjs/node_modules/.bin/tsc` with the same flags.

## Test the online UI without Firebase

On localhost only, open `/staygo/index.html?mock=1`. It runs the same engine and projections in
memory, and a dark test bar lets you add players, view as any seat, mark the current player offline,
and set up a near-complete row to try the 5-second STAYGO! window.

(`next dev` does not serve `public/**/index.html` at the folder URL, so use `.../index.html` locally.
The static export on staygoch.com serves `/staygo/` normally.)

## Deploy STAYGO! online (one-time setup)

Use a **new** Firebase project. Do not reuse `staygo-ouroboros`: deploying these locked-down
database rules there would break Ouroboros, which writes to the database directly from the browser.

1. **Create the project** at <https://console.firebase.google.com> (e.g. `staygo-online`).
2. **Upgrade to Blaze** (Cloud Functions needs it). Set a budget alert; normal traffic for a few
   rooms should stay inside the free quota.
3. **Authentication → Sign-in method → Anonymous → Enable.**
4. **Realtime Database → Create database**, region `asia-southeast1` (Singapore), start in locked mode.
5. **Project settings → General → Your apps → Add app → Web.** Copy the config into
   `staygo-nextjs/public/staygo/firebase-config.js` (`apiKey`, `authDomain`, `databaseURL`,
   `projectId`, `appId`). These values are public by design.
6. **Authentication → Settings → Authorized domains:** make sure `staygoch.com` is listed.
7. Deploy rules and functions:

   ```bash
   npm install -g firebase-tools
   firebase login
   cd staygo-online
   cp .firebaserc.example .firebaserc      # put your project id in it
   npm --prefix functions install
   firebase deploy --only database,functions
   ```

8. Build and deploy the site as usual (`npm run build` in `staygo-nextjs`). Until step 5 is done,
   `/staygo/` shows a "coming soon" page that links to ลุ้นจั่ว.

Functions run in `asia-southeast1`. If you change the region, change it in both
`functions/src/index.ts` (`REGION`) and `public/staygo/firebase-config.js` (`FUNCTIONS_REGION`).

## How the online game keeps secrets

- The client only sends intents (`{ type: "place", cardId }` …) to the `gameAction` function.
- The function loads the room in a transaction, runs `applyStaygo(state, seat, action, rng, now)`,
  and writes three things:
  - `rooms/{code}/public`: rows, hand counts, phase, log (no card ids, no hand contents)
  - `rooms/{code}/private/{uid}`: that player's hand, private notices, and pending choice
  - `rooms/{code}/secret/state`: the full engine state as a JSON string (nobody can read it)
- Randomness comes from `crypto.randomInt` on the server. Time checks (5 s shout, 30 s absent skip)
  use server time.
- Clients may only write their own `seats/{i}/online` and `offlineAt` (presence).

## Spec decisions made while building

- The prototype `staygo-playtest.html` was not available, so the engine was written from the spec.
- Room id = the 4-character join code (no I, O, 0, 1).
- While a player is choosing a target (and can still cancel), others only see "กำลังเลือกเป้าหมาย…",
  not which power card they hold.
- If an absent player is skipped mid-Swap, a random card is given back; mid-discard, random cards are
  discarded down to 6.
- A player whose turn starts with no cards and an empty draw pile is skipped automatically.
- Oops! and Yolo may target yourself; Swap, Got and STAY may not.
- ลุ้นจั่ว: you must flip at least one card before stopping. The bust chance uses only visible info
  (every card not in the flip area or discard pile is in the draw pile).
- Rejoin after refresh works on the same browser (seat is bound to the anonymous uid). Open questions
  from the spec (catching a missed shout, rejoin codes, spectators) are not built yet.
- Old rooms are never deleted. Add a scheduled cleanup function later if the database grows.

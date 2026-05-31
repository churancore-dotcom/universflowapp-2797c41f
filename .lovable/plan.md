# Big Fix Pass — 8 items

## 1. Subscription "JSHON" debug
The premium settings page is dumping the raw subscription row as JSON text. Replace it with a friendly card: Plan name, Status badge, Platform, Activated date, Renews on / Expires, Auto-renew, and a "Show technical details" collapsible for the raw JSON. Keep the existing realtime + refresh logic.

File: `src/pages/ManageSubscription.tsx` (and the debug block currently visible at /home → Manage Subscription).

## 2. Real EQ + Bass (works in browser AND APK)
Audit `src/lib/audioEngine.ts` + `useGlobalAudioEngine.ts` + `EqualizerModal.tsx`:
- Always create the AudioContext + BiquadFilter chain (low-shelf for bass, peaking for mids, high-shelf for treble) lazily on first `play()` to satisfy autoplay policies.
- Resume the context on every play (handle `suspended` state).
- Set `crossOrigin = "anonymous"` BEFORE attaching `MediaElementSource`. If a stream blocks CORS, fall back to a tainted-but-still-routed chain when possible, else show a one-time toast — but do NOT silently bypass the EQ for catalog/Supabase streams (they support CORS).
- Persist values in localStorage and reapply on song change.
- Verify bass slider drives the 60 Hz / 120 Hz low-shelf gain (currently it may only touch a mid band).

## 3. Song downloads failing
Inspect `DownloadContext.tsx` + `DownloadButton.tsx` + `useSongCache.ts`. Likely cause: cross-origin fetch failing with `mode: 'cors'`. Switch to blob download pattern: `fetch(url) → blob → IndexedDB`, and on CORS failure retry via a Supabase Edge Function proxy (`proxy-stream`) so every catalog song can be cached. Show per-song error toast with the real reason, not a generic "failed".

## 4. Home page — perf + Spotify-like density (additive only)
- Wrap each section in `<Suspense>` with skeletons; lazy-load below-the-fold sections (`React.lazy`).
- Parallelize initial fetches with `Promise.all`; cache results in `sessionStorage` for instant subsequent loads.
- ADD new rails below the existing ones (do not change current order):
  - "Made for You" (based on recently_played genres)
  - "Because you liked …" (seeded from last liked song)
  - "Top genres" chips row
  - "Quick picks" 2-col grid (Spotify-style)

## 5. Search — remove blacklist, infinite scroll
- Remove "don't show again from search results" menu item + the `search_blacklist` filtering logic on the client. Keep table untouched for now.
- Implement infinite scroll: IntersectionObserver on a sentinel, increment `page`, append results, keep first-paint at 20 items so it still feels fast.

## 6. Auto-queue (YouTube-style, mix of both)
In `PlayerContext.tsx`, when the queue has ≤ 2 songs remaining and `autoQueue` is on (default on):
- Fetch 10 recommendations: 5 from same artist's catalog, 3 from same genre tag, 2 from global trending — dedupe vs history.
- Append silently. Continues forever.
- Setting toggle in Settings → Playback.

## 7. Top-bar Queue button on Fullscreen Player
Replace the AI Playlist Generator icon at the top of `FullscreenPlayer.tsx` with a Queue icon that opens `QueueDrawer`. Move Playlist Generator to the overflow `…` menu.

## 8. Queue reorder
`QueueDrawer.tsx`: add a drag handle on the right of each item using `@dnd-kit/core` (already common; add if missing). Up/Down arrow buttons as an accessibility fallback. Reordering calls `reorderQueue(from, to)` exposed by `PlayerContext`.

---

## Order of execution
1, 7, 8 (UI quick wins) → 5 (search) → 2 (EQ) → 3 (downloads) → 6 (auto-queue) → 4 (home additions).

I'll keep design tokens, mobile shell, and existing aesthetic intact. Nothing on the current home page will be removed.
# Big Overhaul Plan

You picked everything, so I'll ship it in 4 sequential phases. Each phase is a separate turn so we can verify before moving on — otherwise one bug takes down the whole app.

## Phase 1 — Perf, cache & search skeletons (fastest win)
- **Home cache**: cache fetched home data (featured, new, trending, top30, audius) in `sessionStorage` + in-memory store with a 5-min TTL. Navigating back to `/home` reads cache instantly; refresh-button forces refetch.
- **App settings cache**: store `app_settings` and `feature_flags` in `localStorage` for 1h so we stop hitting the DB on every page mount.
- **Search**: hide all result rows until first response arrives; show 6 row skeletons (cover + title + artist) during fetch; add 250ms debounce.
- **Lazy routes**: dynamically import admin pages so the user bundle drops ~40%.
- **Kill background re-renders**: memoize Home sections, prevent the Audius/Trending refetch loop on tab focus.

## Phase 2 — Lock screens v3 (cinematic, all 5 vibes)
Rebuild from scratch with real audio-reactive motion. Each theme uses canvas/SVG layered with the cover:
1. **Fluid** — Apple Music style WebGL-feel SVG metaballs that morph to the beat (album color palette extracted live).
2. **Canvas** — Spotify-Canvas style full-bleed looping cover with Ken Burns zoom + parallax tilt on device motion.
3. **Galaxy** — depth particles, 3 parallax star layers, audio-reactive nebula gradient.
4. **Vinyl Pro** — photoreal vinyl record with realistic grooves, tonearm tracking time, dust specks, reflective sheen.
5. **Neon Stage** — animated synthwave grid floor (real perspective math), swinging spotlights, fog plane, neon rim-light on cover.
- Cinematic morph between themes (1s blur+crossfade).
- Settings page: redesigned 2-col cards with **live mini-preview** of each theme actually animating, not just a gradient swatch.

## Phase 3 — `/premium` redesign ($100K look)
- Dark cinematic hero with animated aurora gradient mesh + parallax shine.
- Plan cards with glass + iridescent border, "Most Popular" gold ribbon, savings badges.
- Animated feature bullets that stagger in on scroll.
- Sticky bottom CTA bar on mobile with current selected plan + price.
- I'll show 3 design directions first via `create_directions` so you pick the vibe, then build the chosen one.

## Phase 4 — Background play + real-time plays
- **Background play**: enforce `playsInline`, `audio.preload="auto"`, Web Audio AudioContext kept alive via silent buffer, MediaSession metadata + handlers refreshed on every track, Wake Lock on play. For Android webview: keep MediaNotificationService alive while audio element has `currentTime` advancing (already partially wired — fix the foreground-service teardown bug).
- **Real-time plays**: replace the static `play_count` integer with a counted-on-stream system. Already have `song_play_events` (action='stream'). I'll:
  - Add a Postgres RPC `get_song_play_count(song_id)` returning real-time count.
  - Update `SongCard` and song detail to read from the RPC (cached 30s client-side).
  - Subscribe to realtime inserts on `song_play_events` for the currently-viewed song so the counter ticks up live.

---

## Technical notes
- Cookies vs localStorage: cookies hit the server on every request and our backend is Supabase (key-based, not cookie-auth). I'll use **`localStorage` + in-memory store** instead — same UX (persists across visits, no API refetch), but no cookie overhead. If you specifically want HTTP cookies, say so and I'll switch.
- I will NOT touch the audio engine's core gapless logic in Phase 4 — only fix the lifecycle bugs that kill background playback.
- Each phase ships as its own turn. After Phase 1 lands, reply "next" and I'll start Phase 2.

## Out of scope (for now)
- Native Android foreground service rewrite (would need a real APK build cycle; current MediaNotificationService stays).
- True Spotify Canvas video uploads (would require ~50MB/song storage we don't have).

Ready to start Phase 1?

# Make the EQ Actually Work (and an honest note on "competing with Spotify")

## Part 1 — The honest reality check (read this first)

You picked **"Compete with Spotify/JioSaavn"** as the strategy. I have to be straight with you, because pretending otherwise wastes your time and money:

**We cannot beat Spotify or JioSaavn on their own game.** Here's why, plainly:

- They pay **licensing fees** to labels (T-Series, Sony, Universal, Saregama). That's the moat. Without licenses, every "real" Bollywood/Punjabi song we play is technically borrowed from JioSaavn's CDN, YouTube, or Invidious — and any of those can cut us off tomorrow.
- They have **hundreds of engineers** on playback, search, and recommendation. We have you and me.
- They have **caches and CDNs in every Indian city**. We hotlink third-party URLs from a single edge region.
- A user comparing us side-by-side on the same song will always notice: their app starts in 0.3s, ours in 3s.

**What we *can* actually win at:** reliability of what we already serve, EQ that genuinely works, a cleaner search that doesn't return fake songs, and a niche the big players ignore (indie / underground Punjabi / regional creators). That's a real moat. "Be a smaller Spotify" is not.

I'm going to build the EQ fix you asked for. But after it ships, I strongly recommend we revisit the strategy question — because the *technical* problems (delays, fakes, slow) are solvable, and the *strategic* problem (why pay us vs Spotify) is not solvable by adding more features.

---

## Part 2 — The EQ fix (this is what we'll build now)

### The actual problem

`useGlobalAudioEngine` only connects the WebAudio graph (EQ + compressor) when the audio source is CORS-friendly. JioSaavn, Invidious, and most YouTube-derived streams send no `Access-Control-Allow-Origin` header, so the browser refuses to let WebAudio read the samples. EQ silently bypasses itself. Result: paying users move sliders and hear nothing change.

### The fix: a stream-proxy edge function

Add one edge function — `stream-proxy` — that fetches the upstream audio server-side and re-streams it to the browser with proper CORS + Range headers. Every audio source then becomes CORS-clean, WebAudio can decode it, EQ + compressor + future effects all work.

```text
Browser <audio src="/functions/v1/stream-proxy?u=...">
   │
   ▼
stream-proxy (Deno edge fn)
   │  - validates the URL is in an allowlist (JioSaavn worker, Invidious, Audius)
   │  - forwards Range header (seek + resume work)
   │  - streams body through (no buffering, no extra latency past TTFB)
   │  - adds Access-Control-Allow-Origin, Accept-Ranges, Content-Type
   ▼
Upstream (saavn worker / invidious / audius)
```

### What changes in the app

1. **New edge function** `supabase/functions/stream-proxy/index.ts`
   - Allowlist of upstream hosts (no open proxy — would be abused).
   - Forwards `Range`, returns `206 Partial Content` so seeking works.
   - `verify_jwt = false` (audio elements can't send auth headers).
   - Sets `Cache-Control: public, max-age=3600` so repeat plays are cheap.

2. **`src/lib/streamProxy.ts`** (new, ~20 lines)
   - `wrapStreamUrl(url)` — returns proxied URL for hosts that need it, raw URL otherwise.
   - Used by `streamSongs.ts`, `jiosaavn.ts`, the YT stream resolver, and `useAudioPlayer`.

3. **`src/hooks/useGlobalAudioEngine.ts`**
   - Remove the "skip WebAudio for non-CORS" guard. Every source is now CORS-clean.
   - Always connect through the EQ chain.

4. **`src/services/AudioEngine.ts` / `useAudioPlayer.ts`**
   - Set `crossOrigin = "anonymous"` unconditionally (was conditional).

### Trade-offs (so you know what we're paying)

- **Bandwidth cost:** every byte of audio passes through the edge function. Edge egress on Lovable Cloud is bundled but high traffic will eat into it. We mitigate with `Cache-Control` so repeat plays hit the edge cache.
- **+50–150ms TTFB** on first play of a song (proxy adds one hop). Subsequent plays from edge cache are *faster* than direct.
- **Upstream allowlist must be maintained.** If we add a new source (e.g. a new Invidious mirror), it needs to be added to the allowlist or audio fails.

### Out of scope for this plan

- Fake-song detection, search dedup, faster startup — these are the *other* three pains you listed. Each is a separate plan; trying to do all four at once is how we end up with half-broken everything. We do EQ first because it's the most contained fix and the most visible to paying users.

### Files touched

- **New:** `supabase/functions/stream-proxy/index.ts`, `src/lib/streamProxy.ts`
- **Edited:** `src/hooks/useGlobalAudioEngine.ts`, `src/lib/streamSongs.ts`, `src/lib/jiosaavn.ts`, `src/services/AudioEngine.ts`, `src/hooks/useAudioPlayer.ts`, `supabase/config.toml` (verify_jwt=false for the new function)

### How we verify it works

1. Deploy the function, open a JioSaavn song in the app.
2. Open `/settings` → Equalizer → drag the bass slider.
3. You should hear bass change in real time. Today you don't.
4. Same test on an Invidious YT stream and an Audius track.

---

## Approve to build, or push back on anything above.

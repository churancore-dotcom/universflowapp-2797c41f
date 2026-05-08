# QA Checklist — Home, Trending & Player Instant-Load

Run end-to-end on a real device (mid-range Android, e.g. Vivo Y28s) **and** desktop preview.
Use Chrome DevTools → Network → "Disable cache" OFF for cold-vs-warm tests.

---

## 1. Cold start (first-ever visit)

- [ ] Clear `localStorage` (`uf_country_v1`, `uf_piped_trending_v1::*`, `uf_piped_streams_v1`).
- [ ] Hard reload `/home`.
- [ ] **Hero carousel** shows a single full-width skeleton (no spinner).
- [ ] **Viral in [Country]** shows 6 card-shaped skeletons (image + 2 text bars).
- [ ] Background is pure `#000000`, no flash of white.
- [ ] First real hero slide appears within ~2.5 s on 4G; first viral cards within ~3 s.
- [ ] Heading updates from "Viral right now" → **"Viral in {Country}"** with flag emoji as soon as ip-api resolves.
- [ ] Rank badges (#1, #2, #3 …) appear top-left of every card.

## 2. Warm start (cached visit)

- [ ] Reload `/home` after step 1 succeeded.
- [ ] **Hero + Viral cards render in <300 ms** with no skeleton flash (SWR served from `localStorage`).
- [ ] DevTools → Network shows Piped `/trending` request still firing in the background.
- [ ] When the background fetch resolves, cards update **silently** (no layout shift, no flash).

## 3. Skeleton lifecycle

- [ ] Skeletons never persist after data arrives (check both hero and viral sections).
- [ ] No spinner (`Loader2`) appears on initial load — only skeletons.
- [ ] Empty/failed fetch with no cache → section gracefully hides (no broken skeletons left behind).

## 4. Player open — no second loading state

- [ ] Tap the **#1 viral card**: stream resolves and audio starts within ~1 s (top 3 are pre-warmed).
- [ ] Tap a card **outside the top 3** (e.g. #8): button shows the inline `Loader2` spinner only on that card; rest of UI stays interactive.
- [ ] Once playing, opening the **MiniPlayer → Fullscreen Player** is **instant** — no spinner, no "loading" text, artwork already present.
- [ ] Navigate to `/library` then back to `/home`: previously-played track still in `currentSong`, player state intact.
- [ ] Tap the same playing card again → toggles pause without re-resolving (check Network: no `/streams/` call).

## 5. Country detection fallback

- [ ] Block `demo.ip-api.com` in DevTools → app falls back to `ipapi.co` and still shows correct country.
- [ ] Block both → app defaults to `US` trending; heading reads "Viral in USA" 🇺🇸.

## 6. Image optimization

- [ ] Viral cards request **low-res** thumbnails (`cover_url_low`, ~120px); hero uses high-res.
- [ ] Off-screen card images have `loading="lazy"` (verify in Elements panel).
- [ ] Scrolling the viral rail triggers additional image requests only as cards enter viewport.

## 7. Resilience

- [ ] Kill `pipedapi.kavin.rocks` in Network blocking → another instance wins via `Promise.any` race; data still loads.
- [ ] Airplane mode → cached trending still renders instantly; new fetch fails silently (no error toast spam).

## 8. Visual / Theme

- [ ] All surfaces stay in **Dark Mode** (background `#000`, glass surfaces `rgba(255,255,255,0.06)`).
- [ ] Bottom nav icons (Home, Search, Library, Profile) are thin-line, single-weight.
- [ ] No purple gradient bleeds, no white flashes during route transitions.

---

### Pass criteria

All boxes ticked on **both** cold and warm starts, on a throttled "Slow 4G" profile, with no console errors and no Sentry warnings.

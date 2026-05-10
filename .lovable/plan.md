# What we're shipping (7 tracks)

## 1. Playlist sharing via link + import-to-own (Premium)

**DB migration**
- Add `share_token TEXT UNIQUE` and `is_public BOOLEAN DEFAULT false` to `playlists`.
- New RLS policy: anyone can `SELECT` a playlist row when `share_token IS NOT NULL` (read-only public access).
- Same idea for `playlist_songs` — public select when parent playlist has a share_token.
- RPC `import_shared_playlist(p_share_token text)` (SECURITY DEFINER): creates a copy of the source playlist for `auth.uid()` plus all its songs. Premium gate enforced inside the function via `has_premium_subscription(auth.uid())`.

**Frontend**
- `PlaylistDetail.tsx`: add a "Share link" button (owner only). Generates share_token if missing, copies `https://universflow.in/p/{token}` to clipboard, native share on mobile.
- New route `/p/:token` → loads playlist via share_token (no auth required to view), shows tracks, with a big "Save to my library" button that calls the RPC. If not premium, redirect to `/premium` with toast.
- Add "Shareable Playlists" entry to the Premium FEATURES list.

## 2. Premium page cleanup
- Remove the "I have a redeem code" button and `RedeemCodeModal` import from `Premium.tsx` (keeps redeem flow available inside checkout sheet only).
- Audit FEATURES: the listed items are all real (Zero Ads, Spatial 3D, EQ, Studio Spaces, Late Night, Play With Mate, Downloads, AI Playlist, Crossfade/Gapless, Premium Tracks, Badge, Priority Support). Add new "Shareable Playlists" entry. Drop "Premium Badge" since it's cosmetic vapor — replace with the new Share entry.

## 3. Crossfade / Gapless / Autoplay actually working
- **Autoplay**: confirmed working via `handleEnded` → `playSongAtIndex(nextIdx)`. No change.
- **Crossfade**: currently gated by `isPremiumUser && !isEqProcessingEnabled() && queue.length > 1`. Bug: EQ is enabled by default for catalog songs, so crossfade silently no-ops. Fix: when crossfade is on, route the second audio element through a separate Web Audio chain OR temporarily bypass EQ during the fade. Simplest reliable fix: drop the EQ guard and run crossfade on raw audio elements — accept that EQ won't apply to the outgoing tail (acceptable). Also verify both audio elements share `crossOrigin="anonymous"` so the fade doesn't blow up on CORS streams.
- **Gapless**: existing `preloadNextSong` only sets `src` on `nextAudioRef`. Fix: actually start it `paused` with `currentTime = 0` and swap on `ended` instead of fetching a fresh element. This eliminates the 200–800ms gap.
- Add a small toast / settings indicator confirming each is active so user can verify.

## 4. Followed Artists section in Library
- The Library `artists` tab already shows followed artists. The user wants the **songs from followed artists** rail too. Add `<FollowedArtistSongsSection songs={...} />` at the top of the Library page (above the tabs) — but only when there are followed-artist songs.
- Source the songs from the Library liked + downloaded pool already loaded; if not enough, lazy-load the catalog via `loadLibrarySongs`-style fetch already in scope.

## 5. Remove Gemma AI / Donations / Song Requests (full purge)
**Files deleted:**
- `src/pages/admin/AIAssistant.tsx`
- `src/pages/admin/DonationHistory.tsx`
- `src/pages/admin/SongRequests.tsx`
- `src/pages/SongRequest.tsx`
- `supabase/functions/gemma-chat/` (and call `delete_edge_functions` for `gemma-chat`)

**References scrubbed in:**
- `src/App.tsx`: drop the three lazy imports + 3 routes.
- `src/pages/admin/AdminLayout.tsx`: remove navItems for Donations, Song Requests, Gemma 4 AI; drop unused icon imports (`Heart`, `Inbox`, `Bot`).
- Any user-facing nav linking to `/song-request` or admin donations: remove.
- Memory: update mem://index.md to drop song-request / donation / Gemma references.

## 6. Admin sidebar reopening fix
The `useEffect` already closes on `pathname` change, but each admin page is lazy-loaded → during `Suspense` fallback the layout re-renders with `sidebarOpen=true` from the click handler timing. Fix: switch `setSidebarOpen(false)` to fire **before** `navigate()` in `handleNavigation` (already does) — true root cause is each admin page's own `<Sheet>`/`Drawer` mounting. Audit: any admin page using shadcn `Sheet` with `defaultOpen` or controlled open derived from URL? If yes, fix that page. Otherwise, replace `useState` with `useState(false)` reset on mount and add `key={location.pathname}` to `<Outlet />` to force remount, which guarantees no leftover open state.

## 7. "From Your Artists" placement + Top 30 rework
- Remove `FollowedArtistSongsSection` usage from `Home.tsx` (line 369) and confirm it's not on Search.
- Replace "Global Top 30" with "Top 30 from Your Artists":
  - Rename `GlobalTopTracksSection` → `Top30ArtistsSection`.
  - Source: pull the user's followed artists, fetch their top tracks (via existing `getTopIndexedTracks` filtered by artist, or a new `getTopTracksForArtists(names)`).
  - Empty state: "Follow artists to see their Top 30 here" with CTA to `/artists`.
- Update Home to render only this new section in place of the global one.

---

## Technical notes
- Premium gate for share-import lives in the RPC, not just the UI, so curl can't bypass it.
- New `/p/:token` route must be unauthenticated (move outside `ProtectedRoute`).
- Crossfade fix touches `PlayerContext.tsx` lines 827, 884–955.
- Sidebar fix is one line: add `key={location.pathname}` to `<Outlet />` in AdminLayout.
- All deletions must include `delete_edge_functions(["gemma-chat"])`.

## Out of scope
- I will not redesign the admin dashboard, only remove the 3 entries.
- I will not migrate existing playlists; share_token is generated lazily on first share.

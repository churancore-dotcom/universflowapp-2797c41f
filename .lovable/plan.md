
# Artist Program — Sign up, Verify, Studio Dashboard

A second signup flow ("**Sign up as Artist**") that asks an extra field (phone), collects KYC docs + artist photo, waits 1–3 days for admin review, then unlocks a real-time **Artist Studio** dashboard where verified artists publish songs via **direct URL only** (no YouTube, no MP3 upload — keeps storage at zero). Plus dedicated **Terms** and **Privacy Policy** for both Users and Artists.

All on existing Lovable Cloud → **$0 extra cost**, no new servers, no new edge functions beyond a single optional cleanup hook (can run from existing cron).

---

## 1. Storage-safe KYC strategy (zero ongoing storage cost)

Problem: 8 GB total bucket and you don't want IDs sitting there forever.

Solution:
- New **private** bucket `artist-kyc` (RLS: owner write, admin read, nobody else)
- Client-side compress every image to **JPEG ≤ 1200px, ≤ 400 KB** before upload (reuse `src/lib/imageCompression.ts`)
- On admin approve **OR** reject: a Postgres trigger nulls the file paths and the existing `bootstrap-system-push`-style hook removes them from storage. We never keep KYC for more than the review window.
- Daily safety sweep using existing pg_cron: hard-delete any `artist-kyc` object older than 7 days regardless of state.
- Artist **PFP and banner** go to the existing public `covers` bucket (already used, no new bucket needed).

Net storage held permanently per artist = **0 bytes for KYC**, just their PFP/banner thumbnails (~50 KB).

---

## 2. Database (one migration)

### New enums
- `artist_app_status` → `pending | approved | rejected`
- `id_doc_type` → `voter_id | pan | passport | drivers_license | national_id`
- Add `'artist'` to existing `app_role` enum (RBAC via `user_roles` table — never on profiles)

### `artist_applications`
Per-user submission. Fields: `user_id` (unique), `stage_name`, `real_name`, `phone`, `country_code`, `social_links` (jsonb), `id_doc_type`, `id_doc_front_path`, `id_doc_back_path` (nullable, wiped after review), `selfie_path` (nullable, wiped after review), `artist_photo_path` (kept — becomes PFP), `status`, `admin_note`, `reviewed_at`, `reviewed_by`.

### `artist_profiles`
Created on approval. Fields: `user_id` (unique), `stage_name`, `slug` (unique, for `/artist/:slug`), `bio`, `avatar_url`, `banner_url`, `country_code`, `social_links`, `is_verified` (true), `total_plays`, `total_likes`, `total_followers`.

### `artist_songs`
Separate from main `songs` so admin catalog stays clean. Fields: `artist_user_id`, `title`, `cover_url`, `stream_url` (direct URL, validated — **no youtube/youtu.be/jiosaavn**), `duration`, `play_count`, `like_count`, `download_count`, `status` (`live | taken_down`), `takedown_reason`. Auto-publish per your choice.

### `artist_song_events` (optional — or reuse existing `song_play_events`)
Reuse `song_play_events` with `source = 'artist'` so the existing analytics pipeline + Realtime works for free.

### `artist_followers`
`artist_user_id`, `follower_user_id`, `created_at` — drives follower count.

### RLS (every table gets GRANTs in the same migration)
- `artist_applications` — user reads/inserts own; admin reads/updates all
- `artist_profiles` — public select; owner update bio/avatar/banner/socials/slug; admin full
- `artist_songs` — public select where `status='live'`; owner full CRUD; admin can set `taken_down`
- `artist_followers` — public select; auth users insert/delete own follow row

### Triggers
- On `artist_applications.status → approved`: insert `user_roles(role='artist')`, create `artist_profiles` row (copying `artist_photo_path` → `avatar_url`), null KYC paths, fire push "You're verified ✓"
- On `artist_applications.status → rejected`: null KYC paths, fire push with admin note
- On `artist_songs.insert`: validate `stream_url` doesn't match `youtube.com|youtu.be|music.youtube|jiosaavn|soundcloud.com/.../stream` patterns — raise exception if it does

### Realtime
Enable `ALTER PUBLICATION supabase_realtime ADD TABLE artist_songs, song_play_events, artist_followers` so the dashboard streams stats live with no polling.

---

## 3. Frontend pages & flows

### Auth changes (`src/pages/Auth.tsx`)
Add a third tab next to Login/Signup: **"I'm an Artist"**. It collects: email, password, **phone number** (new field), stage name, country. On submit → standard signup + immediately redirect to `/artist/apply`.

### `/artist/apply` — multi-step KYC form
1. Real name + phone (prefilled)
2. Social links (at least 1 of IG / YouTube / Spotify / Apple Music required)
3. ID upload — country-aware:
   - 🇮🇳 India → Voter ID **or** PAN (front only)
   - 🇺🇸 USA → Passport or Driver's License (front + back if DL)
   - 🌍 Others → National ID or Passport
4. Selfie holding the ID
5. Clean artist photo (becomes PFP)
6. Consent gate (see §5): two checkboxes — Artist Terms + Artist Privacy. Both texts open in modal.

Shows "Review takes 1–3 days" success state with status pill.

### `/artist/status`
Pending / Approved / Rejected view with admin note. Approved CTA → "Open Studio".

### `/artist/studio` — gated by `has_role(user, 'artist')`
The dashboard you want. Top-quality, Apple-Music aesthetic, matches existing design system.

Layout:
- **Hero card** — avatar, verified badge, stage name, follower count, "Edit profile" button
- **Stat grid (real-time via Realtime subscription)**:
  - Total Plays (yes — we show **Views/Plays** from `song_play_events`)
  - Total Likes
  - Total Downloads
  - Total Followers
  - 7-day spark chart per stat
- **Top countries** list (from `song_play_events.country_code`)
- **Tabs**:
  - **Songs** — list of own uploads with inline play count / like count / download count, edit/delete actions
  - **Add song** — paste **direct stream URL** + cover image + title. Modal shows clear text:
    > *"We only accept direct audio URLs from sources you own or have rights to (your website, your CDN, your label's HLS, etc.). YouTube, JioSaavn, Spotify and other platform links are not allowed."*
    Live validation rejects blacklisted hosts, previews a 5s clip to confirm playable, then saves.
  - **Profile** — edit name, bio, PFP, banner, social links, slug
  - **Earnings/Tips** — placeholder "Coming soon"

### `/artist/:slug` — public artist page
Banner, PFP, verified ✓ badge, follower count, follow button, song list. Reuses existing `SongCard` so when a user plays from search / artist page, they see **zero "catalog" wording** — songs look identical to the rest of the app (already the case; just need to merge `artist_songs` into the existing search query path).

### Search integration
Extend the existing search (`src/pages/Search.tsx` + `lib/musicIndexer.ts`) to also query `artist_songs` and surface verified-artist results inline with everything else. Same `SongCard`, same look. The only differentiator is a small verified ✓ next to the artist name.

### Admin — `/admin/artists`
New admin page: pending queue (signed-URL preview of ID + selfie), approve / reject + note, list of live artists, one-click takedown of any artist song.

### Verified badge
Tiny rose ✓ next to artist name in: player, mini-player, song cards, search results, artist page. Driven by a single join on `artist_profiles.is_verified`, cached in a React Query store.

---

## 4. Real-time stats (free, no polling, no cron)

Two Realtime channels in `/artist/studio`:
```ts
supabase.channel('artist-stats')
  .on('postgres_changes', { event:'INSERT', schema:'public',
      table:'song_play_events', filter:`artist_user_id=eq.${uid}` }, bump)
  .on('postgres_changes', { event:'*', schema:'public',
      table:'artist_followers', filter:`artist_user_id=eq.${uid}` }, bump)
  .subscribe();
```
Each event increments local counters → numbers tick up live, zero polling cost. Initial load = one aggregated query.

---

## 5. Terms & Privacy Policy (separate sets)

Four new static pages, plain React + Tailwind, no DB:
- `/legal/terms` — **User Terms of Service**
- `/legal/privacy` — **User Privacy Policy**
- `/legal/artist-terms` — **Artist Terms** (covers content ownership, takedown, no copyrighted material, license to stream, no royalties yet, etc.)
- `/legal/artist-privacy` — **Artist Privacy** (KYC retention policy: docs deleted within 7 days of review, what we store, your rights, contact email, India DPDP + GDPR notes)

Signup flows get a **mandatory checkbox** with inline links that open the policies in modals. Footer + /auth + /artist/apply all link to them.

---

## 6. Cost guarantees ($0 forever)

| Component | Cost |
|---|---|
| New tables | 0 — fits in current DB |
| KYC storage | 0 — auto-deleted after review (≤7 days hard cap) |
| Real-time dashboard | 0 — uses existing Supabase Realtime quota |
| Stream hosting | 0 — artists host their own audio URLs |
| Edge functions | 0 new functions needed (reuse `notify_system_push`) |
| Cron | 0 — reuses existing pg_cron daily job |
| Image storage | minimal — PFP/banner only, WebP-compressed |

---

## 7. Legal safety

- **No government ID retention** — only viewed once, then deleted; clearly disclosed in Artist Privacy Policy. India's DPDP Act + GDPR both permit short-lived KYC for identity verification with consent.
- **No royalty/payment promises** — Artist Terms explicitly states no monetary obligation yet.
- **Copyright takedown** — Artist Terms includes DMCA-style takedown clause + admin can remove any song instantly.
- **URL allowlist** — DB trigger blocks platform URLs (YouTube, JioSaavn, Spotify) so no aggregator-style infringement.
- **Verified badge** — only granted manually by admin after KYC + social check.

---

## 8. Out of scope (for later, when you ask)
- Tips / payouts to artists
- Artist analytics CSV export
- Multi-collaborator songs
- Public `/artists` SEO landing page

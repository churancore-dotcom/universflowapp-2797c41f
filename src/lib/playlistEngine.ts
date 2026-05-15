/**
 * YouTube-style auto-playlist engine.
 *
 * Pure, deterministic, no AI calls. Given a seed song + listening signals,
 * returns the top 20 candidate songs ranked by a weighted blend of:
 *   - Tag similarity   (Jaccard over tags)        40%
 *   - Collaborative    (avg affinity of co-fans)  40%
 *   - Trending         (7d plays in same genre)   20%
 *
 * Recency weights are applied to user_history when computing self-affinity
 * (in case the caller doesn't pre-aggregate user_song_scores). Cold start
 * (< 3 plays OR no cross-user data) falls back to (0.6 × tag) + (0.4 × trending).
 */

export interface SeedSong {
  id: string;
  tags: string[];
  genre?: string | null;
}

export interface CandidateSong {
  id: string;
  tags: string[];
  genre?: string | null;
  /** plays in the last 7d, or any monotonically meaningful popularity metric */
  play_count_7d?: number;
}

export interface HistoryEntry {
  song_id: string;
  /** 0..1 — fraction of the song the user listened to. Defaults to 1. */
  listen_percent?: number;
  /** ms epoch */
  timestamp: number;
}

export interface UserSongScore {
  user_id: string;
  song_id: string;
  /** 0..1 affinity */
  score: number;
}

export interface EngineInput {
  seed_song: SeedSong;
  user_history: HistoryEntry[];
  session_played: string[];
  all_songs: CandidateSong[];
  user_song_scores: UserSongScore[];
}

export interface EngineOutput {
  playlist: { song_id: string; final_score: number }[];
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function recencyWeight(ts: number, now: number): number {
  const age = now - ts;
  if (age <= HOUR) return 3.0;
  if (age <= DAY) return 2.0;
  if (age <= 7 * DAY) return 1.5;
  return 0.5;
}

function jaccard(a: string[], b: string[]): number {
  if (!a?.length || !b?.length) return 0;
  const A = new Set(a.map((t) => t.toLowerCase().trim()).filter(Boolean));
  const B = new Set(b.map((t) => t.toLowerCase().trim()).filter(Boolean));
  if (A.size === 0 || B.size === 0) return 0;
  let shared = 0;
  A.forEach((t) => { if (B.has(t)) shared++; });
  const union = new Set<string>();
  A.forEach((t) => union.add(t));
  B.forEach((t) => union.add(t));
  return shared / union.size;
}

export function runPlaylistEngine(input: EngineInput, now: number = Date.now()): EngineOutput {
  const { seed_song, user_history, session_played, all_songs, user_song_scores } = input;

  // --- Step 4: recency-weighted self affinity (used as a collab fallback when
  //     no cross-user data is provided) -----------------------------------
  const selfAffinity = new Map<string, number>();
  for (const h of user_history) {
    const w = recencyWeight(h.timestamp, now) * (h.listen_percent ?? 1);
    selfAffinity.set(h.song_id, (selfAffinity.get(h.song_id) ?? 0) + w);
  }
  // Normalise self-affinity to 0..1
  let maxSelf = 0;
  selfAffinity.forEach((v) => { if (v > maxSelf) maxSelf = v; });
  if (maxSelf > 0) selfAffinity.forEach((v, k) => selfAffinity.set(k, v / maxSelf));

  // --- Step 2: collaborative — users who loved the seed (>0.6) ----------
  const seedFans = new Set<string>();
  for (const r of user_song_scores) {
    if (r.song_id === seed_song.id && r.score > 0.6) seedFans.add(r.user_id);
  }
  const collabAccum = new Map<string, { sum: number; n: number }>();
  if (seedFans.size > 0) {
    for (const r of user_song_scores) {
      if (!seedFans.has(r.user_id)) continue;
      if (r.song_id === seed_song.id) continue;
      const cur = collabAccum.get(r.song_id) ?? { sum: 0, n: 0 };
      cur.sum += r.score;
      cur.n += 1;
      collabAccum.set(r.song_id, cur);
    }
  }

  // --- Step 3: trending — same genre as seed, normalised by genre max ---
  const seedGenre = (seed_song.genre || '').toLowerCase().trim();
  let genreMax = 0;
  if (seedGenre) {
    for (const s of all_songs) {
      const sg = (s.genre || '').toLowerCase().trim();
      if (sg === seedGenre && (s.play_count_7d ?? 0) > genreMax) {
        genreMax = s.play_count_7d ?? 0;
      }
    }
  }

  // Cold start: <3 distinct plays OR no cross-user signal at all
  const distinctPlays = new Set(user_history.map((h) => h.song_id)).size;
  const coldStart = distinctPlays < 3 || seedFans.size === 0;

  const sessionSet = new Set(session_played);

  const scored: { song_id: string; final_score: number }[] = [];

  for (const cand of all_songs) {
    if (cand.id === seed_song.id) continue;
    if (sessionSet.has(cand.id)) continue;

    // Step 1
    const tagScore = jaccard(seed_song.tags, cand.tags);

    // Step 3
    const candGenre = (cand.genre || '').toLowerCase().trim();
    const trendingScore =
      seedGenre && candGenre === seedGenre && genreMax > 0
        ? (cand.play_count_7d ?? 0) / genreMax
        : 0;

    let final: number;
    if (coldStart) {
      final = 0.6 * tagScore + 0.4 * trendingScore;
    } else {
      // Step 2
      const c = collabAccum.get(cand.id);
      const collabScore = c && c.n > 0 ? c.sum / c.n : 0;
      final = 0.4 * tagScore + 0.4 * collabScore + 0.2 * trendingScore;
    }

    if (final > 0) scored.push({ song_id: cand.id, final_score: final });
  }

  // Step 6
  scored.sort((a, b) => b.final_score - a.final_score);
  return { playlist: scored.slice(0, 20) };
}

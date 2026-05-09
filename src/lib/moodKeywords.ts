// Mood / genre / language detection for YouTube-style search.
// We split the query into a "mood" tag (sad, happy, chill, workout, ...) and a
// "language/region" tag (hindi, punjabi, bollywood, kpop, latin, ...). When BOTH
// are present (e.g. "hindi sad song") we want to fetch tracks that match both,
// not just the first matched word.

const STOP_WORDS = new Set([
  'songs', 'song', 'music', 'tracks', 'track', 'tunes', 'tune',
  'playlist', 'playlists', 'mix', 'mixes', 'beat', 'beats',
  'vibes', 'vibe', 'mood', 'moods', 'sounds', 'sound',
  'best', 'top', 'good', 'new', 'hits', 'hit', 'latest', 'old',
  'a', 'an', 'the', 'of', 'for', 'and', 'or', 'with', 'me', 'my',
]);

// Mood / genre tags Last.fm supports as tag.getTopTracks queries.
const MOOD_TAGS = new Set([
  'chill', 'chillout', 'lofi', 'lo-fi', 'sad', 'happy', 'romantic', 'love',
  'workout', 'gym', 'party', 'dance', 'edm', 'house', 'techno', 'trance',
  'rock', 'pop', 'rap', 'hip-hop', 'hip hop', 'hiphop', 'trap', 'r&b', 'rnb',
  'jazz', 'blues', 'classical', 'piano', 'guitar', 'acoustic',
  'country', 'folk', 'metal', 'indie', 'alternative', 'punk',
  'soul', 'funk', 'disco', 'reggae',
  'sleep', 'study', 'focus', 'relax', 'relaxing', 'meditation',
  'morning', 'night', 'driving', 'summer', 'winter',
  'breakup', 'heartbreak', 'wedding', 'birthday', 'christmas',
  'energetic', 'motivational', 'instrumental', 'ambient', 'cinematic',
]);

// Language / region tags. These take precedence in producing locale-appropriate results.
const LANGUAGE_TAGS = new Set([
  'hindi', 'bollywood', 'punjabi', 'tamil', 'telugu', 'bhojpuri', 'marathi',
  'bengali', 'gujarati', 'malayalam', 'kannada', 'urdu',
  'k-pop', 'kpop', 'j-pop', 'jpop', 'c-pop', 'cpop',
  'latin', 'spanish', 'reggaeton', 'arabic', 'turkish', 'french', 'german',
  'italian', 'portuguese', 'russian', 'african', 'afrobeats',
]);

const SYNONYM_MAP: Record<string, string> = {
  'lofi': 'lo-fi',
  'lo fi': 'lo-fi',
  'hiphop': 'hip-hop',
  'hip hop': 'hip-hop',
  'rnb': 'r&b',
  'kpop': 'k-pop',
  'jpop': 'j-pop',
  'cpop': 'c-pop',
  'gym': 'workout',
  'studying': 'study',
  'relaxing': 'chill',
  'relax': 'chill',
  'chillout': 'chill',
  'heartbreak': 'sad',
  'breakup': 'sad',
  'romance': 'romantic',
  'love': 'romantic',
  'reggaeton': 'latin',
  'afrobeats': 'african',
};

const canon = (t: string) => SYNONYM_MAP[t] || t;

export interface MoodDetection {
  /** mood/genre tag (sad, chill, workout, ...) or null */
  mood: string | null;
  /** language/region tag (hindi, latin, k-pop, ...) or null */
  language: string | null;
  /** true when the entire query was just mood/language/stop words (no real title) */
  pureBrowse: boolean;
}

export function detectMoodAndLanguage(query: string): MoodDetection {
  const q = query.toLowerCase().trim();
  if (!q || q.length > 80) return { mood: null, language: null, pureBrowse: false };

  let mood: string | null = null;
  let language: string | null = null;

  // Multi-word phrase pass first
  const allTags = [...MOOD_TAGS, ...LANGUAGE_TAGS, ...Object.keys(SYNONYM_MAP)];
  for (const tag of allTags) {
    if (!tag.includes(' ') && !tag.includes('-')) continue;
    if (q === tag || q.startsWith(tag + ' ') || q.endsWith(' ' + tag) || q.includes(' ' + tag + ' ')) {
      const c = canon(tag);
      if (LANGUAGE_TAGS.has(c) || LANGUAGE_TAGS.has(tag)) language ||= c;
      else if (MOOD_TAGS.has(c) || MOOD_TAGS.has(tag)) mood ||= c;
    }
  }

  // Token pass
  const tokens = q.split(/\s+/).filter(Boolean);
  let nonTagTokens = 0;
  for (const raw of tokens) {
    const tok = canon(raw);
    if (STOP_WORDS.has(raw)) continue;
    if (LANGUAGE_TAGS.has(tok) || LANGUAGE_TAGS.has(raw)) {
      language ||= tok;
      continue;
    }
    if (MOOD_TAGS.has(tok) || MOOD_TAGS.has(raw)) {
      mood ||= tok;
      continue;
    }
    nonTagTokens++;
  }

  return { mood, language, pureBrowse: nonTagTokens === 0 };
}

/** Backwards-compatible single-tag helper (prefers language, then mood). */
export function detectMoodTag(query: string): string | null {
  const { mood, language } = detectMoodAndLanguage(query);
  return language || mood;
}

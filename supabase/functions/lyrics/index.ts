// Lyrics edge function: LRCLIB (primary, synced) + Genius (fallback metadata link)
// Public endpoint — no JWT required, safe to call from client.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GENIUS_TOKEN = Deno.env.get('GENIUS_ACCESS_TOKEN') || '';

interface LyricsResponse {
  success: boolean;
  synced?: string | null;       // raw LRC text with [mm:ss.xx] tags
  plain?: string | null;        // plain text fallback
  source?: 'lrclib' | 'genius' | null;
  geniusUrl?: string | null;    // link out to genius.com (legal reading)
  error?: string;
}

function clean(s: string): string {
  return s
    .replace(/\(feat\.?[^)]*\)/gi, '')
    .replace(/\[feat\.?[^\]]*\]/gi, '')
    .replace(/\(.*?(remaster|remix|version|edit|live|deluxe).*?\)/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchLrclib(artist: string, title: string, durationSec?: number): Promise<{ synced?: string; plain?: string } | null> {
  try {
    // Try the high-precision /get endpoint first (artist + track + duration)
    if (durationSec && durationSec > 0) {
      const url = `https://lrclib.net/api/get?artist_name=${encodeURIComponent(clean(artist))}&track_name=${encodeURIComponent(clean(title))}&duration=${Math.round(durationSec)}`;
      const r = await fetch(url, { headers: { 'User-Agent': 'Universflow/1.0 (https://universflow.in)' } });
      if (r.ok) {
        const j = await r.json();
        if (j && (j.syncedLyrics || j.plainLyrics)) {
          return { synced: j.syncedLyrics || undefined, plain: j.plainLyrics || undefined };
        }
      }
    }
    // Fallback: search by artist + title
    const sUrl = `https://lrclib.net/api/search?artist_name=${encodeURIComponent(clean(artist))}&track_name=${encodeURIComponent(clean(title))}`;
    const sr = await fetch(sUrl, { headers: { 'User-Agent': 'Universflow/1.0 (https://universflow.in)' } });
    if (!sr.ok) return null;
    const arr = await sr.json();
    if (!Array.isArray(arr) || arr.length === 0) return null;
    // Prefer a result with synced lyrics
    const synced = arr.find((x: any) => x?.syncedLyrics);
    const pick = synced || arr.find((x: any) => x?.plainLyrics) || arr[0];
    if (!pick) return null;
    return { synced: pick.syncedLyrics || undefined, plain: pick.plainLyrics || undefined };
  } catch {
    return null;
  }
}

async function fetchGeniusUrl(artist: string, title: string): Promise<string | null> {
  if (!GENIUS_TOKEN) return null;
  try {
    const q = encodeURIComponent(`${clean(title)} ${clean(artist)}`);
    const r = await fetch(`https://api.genius.com/search?q=${q}`, {
      headers: { Authorization: `Bearer ${GENIUS_TOKEN}` },
    });
    if (!r.ok) return null;
    const j = await r.json();
    const hit = j?.response?.hits?.[0]?.result;
    return hit?.url || null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const artist = String(body?.artist || '').trim();
    const title = String(body?.title || '').trim();
    const duration = Number(body?.duration) || undefined;

    if (!artist || !title) {
      return new Response(JSON.stringify({ success: false, error: 'artist and title required' } satisfies LyricsResponse), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const [lrc, geniusUrl] = await Promise.all([
      fetchLrclib(artist, title, duration),
      fetchGeniusUrl(artist, title),
    ]);

    const payload: LyricsResponse = {
      success: true,
      synced: lrc?.synced || null,
      plain: lrc?.plain || null,
      source: lrc?.synced || lrc?.plain ? 'lrclib' : (geniusUrl ? 'genius' : null),
      geniusUrl: geniusUrl || null,
    };

    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=86400' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: String(e) } satisfies LyricsResponse), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

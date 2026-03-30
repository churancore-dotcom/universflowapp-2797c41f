import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Music, Download, Loader2, Play, Pause, CheckCircle2, AlertCircle, Youtube, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  duration: number;
}

type ImportStatus = 'idle' | 'extracting' | 'importing' | 'done' | 'error';

interface TrackImportState {
  status: ImportStatus;
  error?: string;
  audioUrl?: string;
}

const QUICK_SEARCHES = [
  { label: '🇮🇳 Bollywood Hits', query: 'bollywood hits 2024 official audio' },
  { label: '🎵 Punjabi Viral', query: 'punjabi viral songs official audio' },
  { label: '🔥 Phonk', query: 'phonk viral music' },
  { label: '🎤 Hip Hop', query: 'hip hop trending 2024 official' },
  { label: '🌍 English Pop', query: 'english pop hits 2024 official audio' },
  { label: '🎸 Funk', query: 'funk music best' },
  { label: '💜 Haryanvi', query: 'haryanvi songs trending official' },
  { label: '🎧 Lo-Fi', query: 'lofi chill beats' },
  { label: '⚡ EDM', query: 'edm dance hits official' },
  { label: '🎶 Arijit Singh', query: 'Arijit Singh official audio' },
  { label: '🔊 AP Dhillon', query: 'AP Dhillon official audio' },
  { label: '🌟 Diljit Dosanjh', query: 'Diljit Dosanjh official audio' },
  { label: '🎵 BTS', query: 'BTS official audio' },
  { label: '🔥 Travis Scott', query: 'Travis Scott official audio' },
  { label: '💎 Drake', query: 'Drake official audio' },
  { label: '🎤 Eminem', query: 'Eminem official audio' },
];

// Piped instances — called from BROWSER (not server), so they work
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://pipedapi.r4fo.com',
  'https://pipedapi.leptons.xyz',
  'https://pipedapi.moomoo.me',
  'https://piped-api.lunar.icu',
];

const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://invidious.perennialte.ch',
  'https://iv.datura.network',
  'https://invidious.privacyredirect.com',
];

function shuffleArr<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function decodeEntities(str: string): string {
  const el = document.createElement('textarea');
  el.innerHTML = str;
  return el.value;
}

function cleanTitle(raw: string): { title: string; artist: string } {
  let s = raw
    .replace(/\s*\(official\s*(video|audio|music\s*video|lyric\s*video|visualizer|mv)\)\s*/gi, '')
    .replace(/\s*\[official\s*(video|audio|music\s*video|lyric\s*video|visualizer|mv)\]\s*/gi, '')
    .replace(/\s*\|\s*official\s*(video|audio|music\s*video).*/gi, '')
    .replace(/\s*official\s*(video|audio|music\s*video|lyric\s*video)\s*/gi, '')
    .replace(/\s*\(lyrics?\)\s*/gi, '')
    .replace(/\s*\[lyrics?\]\s*/gi, '')
    .replace(/\s*\(audio\)\s*/gi, '')
    .replace(/\s*\[audio\]\s*/gi, '')
    .replace(/\s*\(visualizer\)\s*/gi, '')
    .replace(/\s*ft\.?\s*/gi, ' ft. ')
    .replace(/\s+/g, ' ')
    .trim();

  const dashMatch = s.match(/^(.+?)\s*[-–—]\s*(.+)$/);
  if (dashMatch) {
    return { artist: dashMatch[1].trim(), title: dashMatch[2].trim() };
  }
  return { title: s, artist: '' };
}

function guessGenre(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('bollywood') || q.includes('hindi')) return 'Bollywood';
  if (q.includes('punjabi')) return 'Punjabi';
  if (q.includes('haryanvi')) return 'Haryanvi';
  if (q.includes('phonk')) return 'Phonk';
  if (q.includes('hip hop') || q.includes('hiphop') || q.includes('rap')) return 'Hip Hop';
  if (q.includes('funk')) return 'Funk';
  if (q.includes('edm') || q.includes('electronic')) return 'Electronic';
  if (q.includes('lofi') || q.includes('lo-fi')) return 'Lo-Fi';
  if (q.includes('pop')) return 'Pop';
  if (q.includes('rock')) return 'Rock';
  return 'Pop';
}

// ─── BROWSER-SIDE search via Piped ───
async function searchViaPiped(query: string): Promise<SearchResult[]> {
  const instances = shuffleArr(PIPED_INSTANCES);
  for (const base of instances) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch(`${base}/search?q=${encodeURIComponent(query)}&filter=music_songs`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!resp.ok) { await resp.text(); continue; }
      const data = await resp.json();
      const items = (data.items || [])
        .filter((i: any) => i.url && i.type === 'stream')
        .map((i: any) => {
          const match = i.url?.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
          return {
            videoId: match ? match[1] : '',
            title: decodeEntities(i.title || ''),
            channelTitle: decodeEntities(i.uploaderName || ''),
            thumbnail: i.thumbnail || '',
            duration: i.duration || 0,
          };
        })
        .filter((r: any) => r.videoId);
      if (items.length > 0) return items;
    } catch { /* next instance */ }
  }

  // Fallback: try 'videos' filter
  for (const base of instances) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const resp = await fetch(`${base}/search?q=${encodeURIComponent(query)}&filter=videos`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!resp.ok) { await resp.text(); continue; }
      const data = await resp.json();
      const items = (data.items || [])
        .filter((i: any) => i.url && i.type === 'stream')
        .map((i: any) => {
          const match = i.url?.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
          return {
            videoId: match ? match[1] : '',
            title: decodeEntities(i.title || ''),
            channelTitle: decodeEntities(i.uploaderName || ''),
            thumbnail: i.thumbnail || '',
            duration: i.duration || 0,
          };
        })
        .filter((r: any) => r.videoId);
      if (items.length > 0) return items;
    } catch { /* next instance */ }
  }

  return [];
}

// ─── BROWSER-SIDE stream extraction via Piped/Invidious ───
async function getAudioStream(videoId: string): Promise<{
  audioUrl: string; title?: string; artist?: string; thumbnail?: string; duration?: number;
} | null> {
  // Try Piped first
  const piped = shuffleArr(PIPED_INSTANCES);
  for (const base of piped) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(`${base}/streams/${videoId}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) { await resp.text(); continue; }
      const data = await resp.json();
      const streams = (data.audioStreams || [])
        .filter((s: any) => s.url && s.mimeType)
        .sort((a: any, b: any) => {
          const aM4a = a.mimeType.includes('mp4') ? 1 : 0;
          const bM4a = b.mimeType.includes('mp4') ? 1 : 0;
          if (bM4a !== aM4a) return bM4a - aM4a;
          return (b.bitrate || 0) - (a.bitrate || 0);
        });
      if (streams.length > 0) {
        return {
          audioUrl: streams[0].url,
          title: data.title || '',
          artist: (data.uploader || '').replace(/ - Topic$/, ''),
          thumbnail: data.thumbnailUrl || '',
          duration: data.duration || 0,
        };
      }
    } catch { /* next */ }
  }

  // Fallback: Invidious
  const inv = shuffleArr(INVIDIOUS_INSTANCES);
  for (const base of inv) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(`${base}/api/v1/videos/${videoId}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) { await resp.text(); continue; }
      const data = await resp.json();
      const audioFormats = (data.adaptiveFormats || [])
        .filter((f: any) => f.type?.startsWith('audio/') && f.url)
        .sort((a: any, b: any) => {
          const aM4a = a.type.includes('mp4') ? 1 : 0;
          const bM4a = b.type.includes('mp4') ? 1 : 0;
          if (bM4a !== aM4a) return bM4a - aM4a;
          return (parseInt(b.bitrate) || 0) - (parseInt(a.bitrate) || 0);
        });
      if (audioFormats.length > 0) {
        return {
          audioUrl: audioFormats[0].url,
          title: data.title || '',
          artist: (data.author || '').replace(/ - Topic$/, ''),
          thumbnail: data.videoThumbnails?.[0]?.url || '',
          duration: data.lengthSeconds || 0,
        };
      }
    } catch { /* next */ }
  }

  return null;
}

// ─── Component ───
const DeezerImport = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [importStates, setImportStates] = useState<Record<string, TrackImportState>>({});
  const [lastQuery, setLastQuery] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const searchSongs = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setResults([]);

    try {
      const items = await searchViaPiped(searchQuery);
      if (items.length === 0) {
        toast.error('No results found. Try a different search term.');
      } else {
        toast.success(`Found ${items.length} results`);
      }
      setResults(items.slice(0, 30));
      setLastQuery(searchQuery);
    } catch (err: any) {
      toast.error('Search failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  const importTrack = useCallback(async (result: SearchResult): Promise<boolean> => {
    setImportStates(prev => ({ ...prev, [result.videoId]: { status: 'extracting' } }));

    try {
      // Step 1: Extract audio stream (browser-side)
      const stream = await getAudioStream(result.videoId);
      if (!stream) throw new Error('Could not extract audio. All providers busy — try again.');

      setImportStates(prev => ({ ...prev, [result.videoId]: { status: 'importing', audioUrl: stream.audioUrl } }));

      // Step 2: Parse title/artist
      const cleaned = cleanTitle(result.title);
      const streamCleaned = stream.title ? cleanTitle(stream.title) : null;
      const finalTitle = streamCleaned?.title || cleaned.title;
      const finalArtist = stream.artist || cleaned.artist || result.channelTitle.replace(/ - Topic$/, '');

      // Step 3: Check for duplicates
      const { data: existing } = await supabase
        .from('songs')
        .select('id')
        .ilike('title', finalTitle)
        .ilike('artist', finalArtist)
        .limit(1);

      if (existing && existing.length > 0) {
        setImportStates(prev => ({ ...prev, [result.videoId]: { status: 'done' } }));
        toast.info(`"${finalTitle}" already exists`);
        return true;
      }

      // Step 4: Insert into database
      const { error: insertError } = await supabase.from('songs').insert({
        title: finalTitle,
        artist: finalArtist,
        audio_url: stream.audioUrl,
        cover_url: stream.thumbnail || result.thumbnail || `https://i.ytimg.com/vi/${result.videoId}/mqdefault.jpg`,
        duration: stream.duration || result.duration || 0,
        genre: guessGenre(lastQuery),
        is_visible: true,
        show_in_new_releases: true,
      });

      if (insertError) throw insertError;

      setImportStates(prev => ({ ...prev, [result.videoId]: { status: 'done' } }));
      toast.success(`✅ Imported "${finalTitle}" by ${finalArtist}`);
      return true;
    } catch (err: any) {
      console.error('Import error:', err);
      setImportStates(prev => ({
        ...prev,
        [result.videoId]: { status: 'error', error: err.message || 'Import failed' },
      }));
      toast.error(`Failed: ${err.message}`);
      return false;
    }
  }, [lastQuery]);

  const importAll = useCallback(async () => {
    const unimported = results.filter(r => {
      const state = importStates[r.videoId];
      return !state || state.status === 'idle' || state.status === 'error';
    });
    if (unimported.length === 0) { toast.info('All tracks already imported'); return; }

    setBulkImporting(true);
    let success = 0, failed = 0;
    for (const result of unimported) {
      const ok = await importTrack(result);
      if (ok) success++; else failed++;
      await new Promise(r => setTimeout(r, 1500));
    }
    setBulkImporting(false);
    toast.success(`Done: ${success} imported, ${failed} failed`);
  }, [results, importStates, importTrack]);

  const handlePreview = useCallback(async (result: SearchResult) => {
    if (playingId === result.videoId) {
      previewAudio?.pause();
      setPlayingId(null);
      return;
    }
    previewAudio?.pause();

    try {
      toast.info('Loading preview...');
      const stream = await getAudioStream(result.videoId);
      if (stream) {
        const audio = new Audio(stream.audioUrl);
        audio.play();
        setPreviewAudio(audio);
        setPlayingId(result.videoId);
        audio.addEventListener('ended', () => setPlayingId(null));
        setTimeout(() => { audio.pause(); setPlayingId(null); }, 30000);
      } else {
        toast.error('Preview not available');
      }
    } catch {
      toast.error('Preview not available');
    }
  }, [playingId, previewAudio]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchSongs(query);
  };

  const formatDuration = (sec: number) => {
    if (!sec) return '';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center shadow-lg">
            <Youtube className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">YouTube Import</h1>
            <p className="text-sm text-muted-foreground">Search & import any song instantly (no API key needed)</p>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search any song, artist, genre..."
            className="pl-10 bg-card border-border"
          />
        </div>
        <Button type="submit" disabled={loading || !query.trim()} className="bg-red-600 hover:bg-red-700">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </Button>
      </form>

      {/* Quick Search */}
      <div className="flex flex-wrap gap-2">
        {QUICK_SEARCHES.map(qs => (
          <Button key={qs.query} variant="outline" size="sm"
            onClick={() => { setQuery(qs.query); searchSongs(qs.query); }}
            disabled={loading} className="text-xs"
          >{qs.label}</Button>
        ))}
      </div>

      {/* Results Header */}
      {results.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{lastQuery}</span> · {results.length} results
          </p>
          <div className="flex gap-2">
            <Button onClick={() => searchSongs(lastQuery)} disabled={loading} size="sm" variant="outline">
              <RefreshCw className="w-3 h-3 mr-1" /> Refresh
            </Button>
            <Button onClick={importAll} disabled={bulkImporting || loading} size="sm"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700">
              {bulkImporting ? <><Loader2 className="w-3 h-3 animate-spin mr-1" /> Importing...</> : <><Download className="w-3 h-3 mr-1" /> Import All</>}
            </Button>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="space-y-2">
        <AnimatePresence>
          {results.map((result, i) => {
            const state = importStates[result.videoId] || { status: 'idle' };
            const isPlaying = playingId === result.videoId;
            return (
              <motion.div key={result.videoId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group"
              >
                <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {result.thumbnail ? (
                    <img src={result.thumbnail} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Music className="w-5 h-5 text-muted-foreground" /></div>
                  )}
                  <button onClick={() => handlePreview(result)}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    {isPlaying ? <Pause className="w-5 h-5 text-white" fill="white" /> : <Play className="w-5 h-5 text-white" fill="white" />}
                  </button>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{result.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{result.channelTitle}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex items-center gap-1">
                      <Youtube className="w-3 h-3 text-red-500" />
                      <span className="text-[10px] text-red-400">YouTube</span>
                    </div>
                    {result.duration > 0 && <span className="text-[10px] text-muted-foreground">{formatDuration(result.duration)}</span>}
                  </div>
                </div>

                <div className="flex-shrink-0">
                  {state.status === 'idle' && (
                    <Button size="sm" variant="ghost" onClick={() => importTrack(result)} className="text-primary hover:bg-primary/10">
                      <Download className="w-4 h-4" />
                    </Button>
                  )}
                  {(state.status === 'extracting' || state.status === 'importing') && (
                    <div className="flex items-center gap-1.5 text-xs text-amber-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{state.status === 'extracting' ? 'Extracting...' : 'Saving...'}</span>
                    </div>
                  )}
                  {state.status === 'done' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  {state.status === 'error' && (
                    <button onClick={() => importTrack(result)} title={state.error}>
                      <AlertCircle className="w-5 h-5 text-destructive hover:text-destructive/80" />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Empty State */}
      {!loading && results.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16 space-y-3">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <Youtube className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">YouTube Music Import</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Search for any song — Phonk, Funk, Bollywood, Hip Hop, anything. Searches directly from your browser with no API key needed. Click import to add full songs to your app instantly.
          </p>
        </motion.div>
      )}

      {loading && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
          <p className="text-sm text-muted-foreground">Searching...</p>
        </div>
      )}
    </div>
  );
};

export default DeezerImport;

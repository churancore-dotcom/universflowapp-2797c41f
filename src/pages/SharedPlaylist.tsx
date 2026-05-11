import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music, Loader2, Play, ChevronLeft, Plus, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer, Song } from '@/contexts/PlayerContext';
import { toast } from 'sonner';
import SEOHead from '@/components/SEOHead';
import PlaylistCover from '@/components/PlaylistCover';

interface PlaylistRow {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  user_id: string | null;
}

type LoadState = 'loading' | 'ready' | 'not_found' | 'error';

const SharedPlaylist = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playSong, setQueue } = usePlayer();
  const [state, setState] = useState<LoadState>('loading');
  const [playlist, setPlaylist] = useState<PlaylistRow | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [missingCount, setMissingCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setState('not_found');
      return;
    }
    let cancelled = false;
    (async () => {
      setState('loading');
      try {
        const { data: pl, error: plErr } = await supabase
          .from('playlists')
          .select('id, title, description, cover_url, user_id')
          .eq('share_token', token)
          .maybeSingle();
        if (cancelled) return;
        if (plErr) {
          setState('error');
          return;
        }
        if (!pl) {
          setState('not_found');
          return;
        }
        setPlaylist(pl as PlaylistRow);

        const { data: rows, error: rowsErr } = await supabase
          .from('playlist_songs')
          .select('song_id, position, track_source')
          .eq('playlist_id', pl.id)
          .order('position');

        if (cancelled) return;
        if (rowsErr) {
          setState('error');
          return;
        }

        const items = rows || [];
        const libIds = items.filter((r: any) => r.track_source === 'library').map((r: any) => r.song_id);
        const streamIds = items.filter((r: any) => r.track_source !== 'library').map((r: any) => r.song_id);

        const [libRes, streamRes] = await Promise.all([
          libIds.length
            ? supabase.from('songs').select('id, title, artist, album, cover_url, audio_url, duration').in('id', libIds)
            : Promise.resolve({ data: [] as any[] }),
          streamIds.length
            ? supabase.from('stream_songs').select('track_id, title, artist, album, cover_url, audio_url, duration').in('track_id', streamIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        if (cancelled) return;

        const libMap = new Map<string, any>((libRes.data || []).map((s: any) => [s.id, s]));
        const streamMap = new Map<string, any>((streamRes.data || []).map((s: any) => [s.track_id, s]));

        let missing = 0;
        const ordered: Song[] = items
          .map((r: any) => {
            if (r.track_source === 'library') {
              const s = libMap.get(r.song_id);
              if (!s) { missing++; return null; }
              return s as Song;
            }
            const s = streamMap.get(r.song_id);
            if (!s) { missing++; return null; }
            return {
              id: s.track_id,
              title: s.title,
              artist: s.artist,
              album: s.album || undefined,
              cover_url: s.cover_url || undefined,
              audio_url: s.audio_url || undefined,
              duration: s.duration || 0,
            } as unknown as Song;
          })
          .filter(Boolean) as Song[];

        setSongs(ordered);
        setMissingCount(missing);
        if (!pl.cover_url && ordered.some((song) => song.cover_url)) {
          setPlaylist({ ...(pl as PlaylistRow), cover_url: ordered.find((song) => song.cover_url)?.cover_url || null });
        }
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  const handlePlayAll = () => {
    if (songs.length === 0) return;
    setQueue(songs);
    playSong(songs[0], null, songs);
  };

  const handleSaveCopy = async () => {
    if (!user) { navigate(`/auth?redirect=/p/${token}`); return; }
    if (!token) return;
    setSaving(true);
    const { data, error } = await supabase.rpc('import_shared_playlist', { p_share_token: token });
    setSaving(false);
    if (error) {
      toast.error('Could not save this playlist. Please try again.');
      return;
    }
    toast.success('Saved to your library');
    navigate(`/playlist/${data}`);
  };

  if (state === 'loading') {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col">
        <header className="px-4 py-3 safe-area-pt flex items-center gap-3 border-b border-white/5">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
        </header>
        <div className="px-6 py-8 flex flex-col items-center">
          <div className="w-44 h-44 rounded-2xl bg-white/5 animate-pulse" />
          <div className="mt-6 h-5 w-48 rounded bg-white/10 animate-pulse" />
          <div className="mt-2 h-3 w-24 rounded bg-white/5 animate-pulse" />
        </div>
        <div className="px-4 mt-4 space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5">
              <div className="w-11 h-11 rounded-xl bg-white/5 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 rounded bg-white/10 animate-pulse" />
                <div className="h-2.5 w-1/3 rounded bg-white/5 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (state === 'not_found' || state === 'error') {
    const isError = state === 'error';
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center text-center px-6">
        {isError ? (
          <AlertCircle className="w-12 h-12 text-muted-foreground/60 mb-3" />
        ) : (
          <Music className="w-12 h-12 text-muted-foreground/40 mb-3" />
        )}
        <p className="font-semibold text-base">
          {isError ? 'Something went wrong' : 'Shared playlist not found'}
        </p>
        <p className="text-xs text-muted-foreground mt-1.5 max-w-xs">
          {isError
            ? "We couldn't load this playlist right now. Please check your connection and try again."
            : 'This link may have expired or been removed by its owner.'}
        </p>
        <div className="mt-6 flex items-center gap-2">
          {isError && (
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-full bg-white/10 text-sm font-semibold"
            >
              Try again
            </button>
          )}
          <Link to="/home" className="px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
            Go home
          </Link>
        </div>
      </div>
    );
  }

  if (!playlist) return null;

  const coverUrls = songs.map((s) => s.cover_url);

  return (
    <div className="min-h-[100dvh] bg-background pb-32">
      <SEOHead title={`${playlist.title} • Shared playlist`} description={playlist.description || `Listen to ${playlist.title} on Universflow`} />

      <header className="sticky top-0 z-30 px-4 py-3 safe-area-pt flex items-center gap-3 bg-background/85 backdrop-blur-xl border-b border-white/5">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-white/10">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <p className="font-semibold truncate flex-1">Shared playlist</p>
      </header>

      <div className="px-6 py-6 text-center">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="w-44 h-44 mx-auto shadow-2xl"
        >
          <PlaylistCover
            coverUrl={playlist.cover_url}
            coverUrls={coverUrls}
            className="w-full h-full"
            iconClassName="w-16 h-16 text-white/40"
          />
        </motion.div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">{playlist.title}</h1>
        {playlist.description && <p className="mt-1 text-sm text-muted-foreground">{playlist.description}</p>}
        <p className="mt-2 text-xs text-muted-foreground">
          {songs.length} {songs.length === 1 ? 'song' : 'songs'}
          {missingCount > 0 && (
            <span className="text-amber-400/80"> · {missingCount} unavailable</span>
          )}
        </p>

        {missingCount > 0 && songs.length > 0 && (
          <p className="mt-2 text-[11px] text-muted-foreground/80 max-w-xs mx-auto">
            Some tracks in this playlist are no longer available and have been skipped.
          </p>
        )}

        {songs.length === 0 ? (
          <div className="mt-6 mx-auto max-w-xs rounded-2xl border border-white/5 bg-white/5 p-5">
            <Music className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm font-semibold">No playable songs</p>
            <p className="text-xs text-muted-foreground mt-1">
              The tracks in this playlist aren't available right now.
            </p>
          </div>
        ) : (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={handlePlayAll}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-[15px]"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                color: 'hsl(var(--primary-foreground))',
                boxShadow: '0 14px 40px -10px hsl(var(--primary) / 0.6)',
              }}
            >
              <Play className="w-5 h-5" fill="currentColor" />
              Play
            </button>
            <button
              onClick={handleSaveCopy}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full font-semibold text-[14px] bg-white/10"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Save
            </button>
          </div>
        )}
      </div>

      <div className="px-4 space-y-1">
        {songs.map((s, i) => (
          <button
            key={s.id}
            onClick={() => { setQueue(songs); playSong(s, null, songs); }}
            className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left active:bg-white/5"
          >
            <div className="w-11 h-11 rounded-xl overflow-hidden bg-white/5 flex items-center justify-center">
              {s.cover_url ? <img src={s.cover_url} alt="" className="w-full h-full object-cover" /> : <Music className="w-4 h-4 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{s.title}</p>
              <p className="text-xs text-muted-foreground truncate">{s.artist}</p>
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">{i + 1}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SharedPlaylist;

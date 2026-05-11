import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music, Loader2, Play, ChevronLeft, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer, Song } from '@/contexts/PlayerContext';
import { toast } from 'sonner';
import SEOHead from '@/components/SEOHead';

interface PlaylistRow {
  id: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  user_id: string | null;
}

const SharedPlaylist = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { playSong, setQueue } = usePlayer();
  const [loading, setLoading] = useState(true);
  const [playlist, setPlaylist] = useState<PlaylistRow | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: pl, error: plErr } = await supabase
        .from('playlists')
        .select('id, title, description, cover_url, user_id')
        .eq('share_token', token)
        .maybeSingle();
      if (cancelled) return;
      if (plErr) console.error('shared playlist load error', plErr);
      if (!pl) { setLoading(false); return; }
      setPlaylist(pl as PlaylistRow);

      const { data: rows } = await supabase
        .from('playlist_songs')
        .select('song_id, position, track_source')
        .eq('playlist_id', pl.id)
        .order('position');

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

      const libMap = new Map<string, any>((libRes.data || []).map((s: any) => [s.id, s]));
      const streamMap = new Map<string, any>((streamRes.data || []).map((s: any) => [s.track_id, s]));

      const ordered: Song[] = items
        .map((r: any) => {
          if (r.track_source === 'library') {
            const s = libMap.get(r.song_id);
            return s ? (s as Song) : null;
          }
          const s = streamMap.get(r.song_id);
          if (!s) return null;
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

      if (!cancelled) {
        setSongs(ordered);
        if (!pl.cover_url && ordered.some((song) => song.cover_url)) {
          setPlaylist({ ...(pl as PlaylistRow), cover_url: ordered.find((song) => song.cover_url)?.cover_url || null });
        }
        setLoading(false);
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
    if (error) { toast.error(error.message || 'Could not save'); return; }
    toast.success('Saved to your library');
    navigate(`/playlist/${data}`);
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center text-center px-6">
        <Music className="w-12 h-12 text-muted-foreground/40 mb-3" />
        <p className="font-semibold">Shared playlist not found</p>
        <p className="text-xs text-muted-foreground mt-1">The link may have expired.</p>
        <Link to="/home" className="mt-6 px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold">Go home</Link>
      </div>
    );
  }

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
          className="w-44 h-44 mx-auto rounded-2xl shadow-2xl overflow-hidden"
          style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.4), hsl(var(--accent) / 0.4))' }}
        >
          {playlist.cover_url ? (
            <img src={playlist.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center"><Music className="w-16 h-16 text-white/40" /></div>
          )}
        </motion.div>
        <h1 className="mt-5 text-2xl font-bold tracking-tight">{playlist.title}</h1>
        {playlist.description && <p className="mt-1 text-sm text-muted-foreground">{playlist.description}</p>}
        <p className="mt-2 text-xs text-muted-foreground">{songs.length} songs</p>

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={handlePlayAll}
            disabled={songs.length === 0}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-bold text-[15px] disabled:opacity-50"
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

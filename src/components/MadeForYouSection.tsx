import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer, Song } from '@/contexts/PlayerContext';
import { supabase } from '@/integrations/supabase/client';
import { getUserArtistPrefs } from '@/lib/userArtistPrefs';
import { resolveIndexedTrack } from '@/lib/musicIndexer';
import { triggerHaptic } from '@/hooks/useHaptics';
import HorizontalSection from '@/components/HorizontalSection';
import { toast } from 'sonner';

interface MFYTrack extends Song {
  _external?: boolean;
}

const MadeForYouSection = () => {
  const { user } = useAuth();
  const { playSong, currentSong } = usePlayer();
  const [tracks, setTracks] = useState<MFYTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!user) { setTracks([]); setLoading(false); return; }

    (async () => {
      try {
        const prefs = await getUserArtistPrefs(user.id);
        if (cancelled) return;
        if (!prefs.length) { setTracks([]); setLoading(false); return; }

        const names = prefs.map(p => p.artist_name);

        // 1) Try catalog first (instant playback)
        const { data: catalog } = await supabase
          .from('songs')
          .select('id, title, artist, album, cover_url, audio_url, duration, artist_id, is_premium_only')
          .in('artist', names)
          .eq('is_visible', true)
          .order('created_at', { ascending: false })
          .limit(30);

        const catalogSongs: MFYTrack[] = (catalog || []).map((s: any) => ({
          id: s.id, title: s.title, artist: s.artist, album: s.album || undefined,
          cover_url: s.cover_url || undefined, audio_url: s.audio_url,
          duration: s.duration || undefined, artist_id: s.artist_id || undefined,
          is_premium_only: s.is_premium_only,
        }));

        // 2) Top up with external streams from each followed artist
        const externalPlaceholders: MFYTrack[] = prefs.slice(0, 8).map((p) => ({
          id: `mfy-ext-${p.artist_name.toLowerCase().replace(/\s+/g, '-')}`,
          title: 'Top track',
          artist: p.artist_name,
          cover_url: p.artist_image || undefined,
          audio_url: 'resolving',
          source: 'indexed',
          _external: true,
        }));

        // Interleave catalog first, then placeholders, dedupe by artist
        const seen = new Set<string>();
        const merged: MFYTrack[] = [];
        for (const t of [...catalogSongs, ...externalPlaceholders]) {
          const key = `${t.artist}::${t.title}`.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          merged.push(t);
          if (merged.length >= 20) break;
        }

        if (!cancelled) setTracks(merged);
      } catch (e) {
        console.error('MadeForYou load failed:', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  const queue = useMemo(() => tracks, [tracks]);

  const handlePlay = async (track: MFYTrack) => {
    triggerHaptic('selection');
    if (!track._external) {
      playSong(track, undefined, queue);
      return;
    }
    setResolvingId(track.id);
    try {
      const resolved = await resolveIndexedTrack(track.artist, track.title === 'Top track' ? '' : track.title);
      if (!resolved.streamUrl) throw new Error('No stream available');
      const song: Song = {
        id: track.id,
        title: resolved.title || track.title,
        artist: resolved.artist || track.artist,
        cover_url: resolved.cover_url || track.cover_url,
        audio_url: resolved.streamUrl,
        duration: resolved.duration,
        source: 'indexed',
      };
      playSong(song, undefined, queue);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not play this track');
    } finally {
      setResolvingId(null);
    }
  };

  if (!user || loading || tracks.length === 0) return null;

  return (
    <HorizontalSection title="Made For You" subtitle="From artists you follow" songs={tracks}>
      {tracks.map((song, i) => (
        <motion.button
          key={song.id}
          onClick={() => handlePlay(song)}
          className="flex-shrink-0 w-[140px] snap-start text-left"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.03, duration: 0.3 }}
          whileTap={{ scale: 0.96 }}
          disabled={resolvingId === song.id}
        >
          <div
            className="relative w-[140px] h-[140px] rounded-2xl overflow-hidden mb-2 bg-muted"
            style={{ boxShadow: '0 6px 20px rgba(0,0,0,0.35)', border: '0.5px solid rgba(255,255,255,0.08)' }}
          >
            {song.cover_url ? (
              <img src={song.cover_url} alt="" className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Music className="w-7 h-7 text-muted-foreground" />
              </div>
            )}
            {currentSong?.id === song.id && <div className="absolute inset-0 bg-primary/10" />}
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full bg-background/70 backdrop-blur-md flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-primary" />
              <span className="text-[8px] font-bold text-primary uppercase tracking-wider">For You</span>
            </div>
          </div>
          <p className="text-[13px] font-bold truncate text-foreground leading-tight">{song.title}</p>
          <p className="text-[11px] text-muted-foreground/70 truncate mt-0.5">{song.artist}</p>
        </motion.button>
      ))}
    </HorizontalSection>
  );
};

export default MadeForYouSection;

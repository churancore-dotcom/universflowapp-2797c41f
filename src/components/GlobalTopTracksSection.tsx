import { useCallback, useEffect, useState } from 'react';
import { Loader2, Music2, Play, Pause, Flame } from 'lucide-react';
import { usePlayer, Song } from '@/contexts/PlayerContext';
import { getTopIndexedTracks, prefetchIndexedTrack, resolveIndexedTrack, forceResolveIndexedTrack, type IndexedTrack } from '@/lib/musicIndexer';
import { triggerHaptic } from '@/hooks/useHaptics';

const GlobalTopTracksSection = () => {
  const [tracks, setTracks] = useState<IndexedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const { playSong, currentSong, isPlaying } = usePlayer();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getTopIndexedTracks(30);
        if (!cancelled) setTracks(data);
      } catch (e) {
        console.warn('viral load failed', e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    tracks.slice(0, 6).forEach((t) => prefetchIndexedTrack(t.artist, t.title));
  }, [tracks]);

  const handlePlay = useCallback(async (track: IndexedTrack) => {
    triggerHaptic('selection');
    setResolvingId(track.id);
    try {
      let resolved = await resolveIndexedTrack(track.artist, track.title);
      if (!resolved.streamUrl) {
        resolved = await forceResolveIndexedTrack(track.artist, track.title);
      }
      if (!resolved.streamUrl) return;
      const song: Song = {
        id: track.id,
        title: resolved.title || track.title,
        artist: resolved.artist || track.artist,
        album: track.album,
        cover_url: resolved.cover_url || track.cover_url,
        audio_url: resolved.streamUrl,
        duration: resolved.duration || track.duration,
        source: 'indexed',
      };
      const queue: Song[] = tracks.map((t) => ({
        id: t.id, title: t.title, artist: t.artist, album: t.album,
        cover_url: t.cover_url, audio_url: 'resolving', source: 'indexed' as const,
      }));
      playSong(song, undefined, queue);
    } catch (e) {
      console.warn('viral play failed', e);
    } finally {
      setResolvingId(null);
    }
  }, [playSong, tracks]);

  if (loading) {
    return (
      <section className="space-y-3 px-1">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-primary" />
          <h2 className="text-[22px] font-extrabold tracking-tight">Trending Now</h2>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="aspect-square w-full rounded-3xl bg-muted/40 animate-pulse" />
        ))}
      </section>
    );
  }

  if (!tracks.length) return null;

  const featured = tracks[0];
  const rest = tracks.slice(1);

  return (
    <section className="space-y-4 px-1">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-primary" />
            <h2 className="text-[22px] font-extrabold tracking-tight text-foreground">Trending Now</h2>
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5 font-medium">
            Going viral worldwide · ranked
          </p>
        </div>
      </div>

      {/* Featured #1 — large social-card */}
      <FeedCard
        track={featured}
        rank={1}
        size="hero"
        active={currentSong?.id === featured.id}
        playing={isPlaying}
        resolving={resolvingId === featured.id}
        onPlay={() => handlePlay(featured)}
      />

      {/* Vertical feed */}
      <div className="space-y-3">
        {rest.map((t, i) => (
          <FeedCard
            key={t.id}
            track={t}
            rank={i + 2}
            size="row"
            active={currentSong?.id === t.id}
            playing={isPlaying}
            resolving={resolvingId === t.id}
            onPlay={() => handlePlay(t)}
          />
        ))}
      </div>
    </section>
  );
};

interface FeedCardProps {
  track: IndexedTrack;
  rank: number;
  size: 'hero' | 'row';
  active: boolean;
  playing: boolean;
  resolving: boolean;
  onPlay: () => void;
}

const FeedCard = ({ track, rank, size, active, playing, resolving, onPlay }: FeedCardProps) => {
  if (size === 'hero') {
    return (
      <button
        type="button"
        onClick={onPlay}
        className="group relative w-full overflow-hidden rounded-3xl text-left active:scale-[0.99] transition-transform"
        style={{ aspectRatio: '1 / 1', boxShadow: '0 18px 50px -12px rgba(0,0,0,0.7)' }}
      >
        {track.cover_url ? (
          <img
            src={track.cover_url}
            alt={`${track.title} by ${track.artist}`}
            className="absolute inset-0 h-full w-full object-cover"
            loading="eager"
            decoding="async"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <Music2 className="w-16 h-16 text-muted-foreground" />
          </div>
        )}

        {/* Top-left: viral rank badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 shadow-lg">
          <Flame className="w-3.5 h-3.5 text-primary-foreground" />
          <span className="text-[11px] font-extrabold tracking-wider text-primary-foreground">
            #{rank} VIRAL
          </span>
        </div>

        {/* Bottom gradient + text + play */}
        <div className="absolute inset-x-0 bottom-0 p-5 pt-20"
             style={{ background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 70%, rgba(0,0,0,0.95) 100%)' }}>
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-white text-[22px] font-extrabold leading-tight tracking-tight line-clamp-2"
                 style={{ textShadow: '0 2px 12px rgba(0,0,0,0.6)' }}>
                {track.title}
              </p>
              <p className="text-white/80 text-[14px] font-semibold mt-1 truncate">
                {track.artist}
              </p>
            </div>
            <div className="flex-shrink-0 w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-2xl">
              {resolving ? (
                <Loader2 className="w-6 h-6 text-primary-foreground animate-spin" />
              ) : active && playing ? (
                <Pause className="w-6 h-6 text-primary-foreground" fill="currentColor" />
              ) : (
                <Play className="w-6 h-6 text-primary-foreground ml-0.5" fill="currentColor" />
              )}
            </div>
          </div>
        </div>
      </button>
    );
  }

  // Row card
  return (
    <button
      type="button"
      onClick={onPlay}
      className="group relative flex w-full items-center gap-3 rounded-2xl p-2 text-left active:scale-[0.98] transition-transform"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
        border: '0.5px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-muted">
        {track.cover_url ? (
          <img src={track.cover_url} alt={track.title} className="h-full w-full object-cover" loading="lazy" decoding="async" referrerPolicy="no-referrer" />
        ) : (
          <div className="h-full w-full flex items-center justify-center"><Music2 className="w-7 h-7 text-muted-foreground" /></div>
        )}
        <div className="absolute top-1 left-1 rounded-md bg-black/70 px-1.5 py-0.5">
          <span className="text-[10px] font-extrabold text-white">#{rank}</span>
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-bold leading-tight ${active ? 'text-primary' : 'text-foreground'}`}>
          {track.title}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground font-medium">{track.artist}</p>
      </div>
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center mr-1">
        {resolving ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : active && playing ? (
          <Pause className="w-4 h-4 text-primary" fill="currentColor" />
        ) : (
          <Play className="w-4 h-4 text-primary ml-0.5" fill="currentColor" />
        )}
      </div>
    </button>
  );
};

export default GlobalTopTracksSection;

import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import { useSongCache } from '@/hooks/useSongCache';
import { useAuth } from '@/contexts/AuthContext';
import { useDownloads } from '@/contexts/DownloadContext';

import ArtistsRail from '@/components/home/ArtistsRail';
import QueueDrawer from '@/components/QueueDrawer';
import BottomNav from '@/components/BottomNav';
import LockScreenPlayer from '@/components/LockScreenPlayer';
import EqualizerModal from '@/components/EqualizerModal';
import OfflineIndicator from '@/components/OfflineIndicator';
import { TabTransition } from '@/components/PageTransition';
import LikeButton from '@/components/LikeButton';
import AddToPlaylistModal from '@/components/AddToPlaylistModal';
import {
  Music, Lock, ListMusic, Sliders, Search, Play, Pause,
  Loader2, Radio, Plus,
} from 'lucide-react';
import { triggerHaptic } from '@/hooks/useHaptics';
import appLogo from '@/assets/app-logo.png';
import { HomeSkeleton } from '@/components/PageSkeletons';
import {
  getTopIndexedTracks,
  resolveIndexedTrack,
  forceResolveIndexedTrack,
  prefetchIndexedTrack,
  detectCountry,
  type IndexedTrack,
} from '@/lib/musicIndexer';
import { flagFor, nameFor } from '@/lib/countries';

const HOME_SONGS_QUERY_KEY = ['home', 'songs'] as const;

const fetchHomeSongs = async (): Promise<Song[]> => {
  const { data, error } = await supabase
    .from('songs')
    .select('*, artists(id, name, photo_url)')
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw error;
  if (!data) return [];
  return data.map((s: any) => {
    const artistData = s.artists as { id: string; name: string; photo_url: string | null } | null;
    return {
      id: s.id, title: s.title, artist: s.artist,
      album: s.album || undefined, cover_url: s.cover_url || undefined,
      audio_url: s.audio_url, duration: s.duration || undefined,
      artist_id: artistData?.id || s.artist_id || undefined,
      artist_photo_url: artistData?.photo_url || undefined,
      genre: s.genre || undefined, mood: s.mood || undefined,
      created_at: s.created_at || undefined,
      show_in_new_releases: s.show_in_new_releases,
      show_in_trending: s.show_in_trending,
      is_premium_only: s.is_premium_only,
    } as Song;
  });
};

const Home = () => {
  const navigate = useNavigate();
  const { currentSong, isPlaying, togglePlay, setExpanded, playSong } = usePlayer();
  const { cachedSongs, updateCache } = useSongCache();
  const { isOffline, user } = useAuth() as any;
  const { downloads } = useDownloads();
  const queryClient = useQueryClient();
  const [showLockScreen, setShowLockScreen] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [addToPlaylistSong, setAddToPlaylistSong] = useState<Song | null>(null);

  const { data: onlineSongs = (cachedSongs || []), isLoading } = useQuery({
    queryKey: HOME_SONGS_QUERY_KEY,
    queryFn: fetchHomeSongs,
    initialData: cachedSongs && cachedSongs.length > 0 ? cachedSongs : undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !isOffline,
  });

  const songs: Song[] = useMemo(() => {
    if (isOffline) {
      return downloads.map((d) => ({
        id: d.id, title: d.title, artist: d.artist, album: d.album,
        cover_url: d.cover_url, audio_url: d.audio_url, duration: d.duration,
      } as Song));
    }
    return onlineSongs;
  }, [isOffline, downloads, onlineSongs]);

  useEffect(() => {
    if (!isOffline && onlineSongs && onlineSongs.length > 0) updateCache(onlineSongs);
  }, [onlineSongs, updateCache, isOffline]);

  const loading = isLoading && songs.length === 0 && !isOffline;

  // Realtime diff patching
  useEffect(() => {
    if (isOffline) return;
    const channel = supabase
      .channel('songs-realtime-diff')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'songs' }, (payload) => {
        const eventType = payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE';
        const newRow = payload.new as any;
        const oldRow = payload.old as any;
        queryClient.setQueryData<Song[]>(HOME_SONGS_QUERY_KEY, (current) => {
          if (!current) return current;
          if (eventType === 'DELETE') return current.filter((s) => s.id !== oldRow?.id);
          if (!newRow) return current;
          if (newRow.is_visible === false) return current.filter((s) => s.id !== newRow.id);
          const mapped: Song = {
            id: newRow.id, title: newRow.title, artist: newRow.artist,
            album: newRow.album || undefined, cover_url: newRow.cover_url || undefined,
            audio_url: newRow.audio_url, duration: newRow.duration || undefined,
            artist_id: newRow.artist_id || undefined,
            show_in_new_releases: newRow.show_in_new_releases,
            show_in_trending: newRow.show_in_trending,
            is_premium_only: newRow.is_premium_only,
          } as Song;
          const idx = current.findIndex((s) => s.id === newRow.id);
          if (eventType === 'INSERT' || idx === -1) return [mapped, ...current];
          const next = current.slice();
          next[idx] = { ...current[idx], ...mapped };
          return next;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient, isOffline]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return 'Late night';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Good night';
  }, []);

  // User country
  const { data: userCountry = '' } = useQuery({
    queryKey: ['profile', 'country', user?.id || 'anon'],
    queryFn: async () => {
      if (!user?.id) return detectCountry();
      const { data } = await supabase
        .from('profiles')
        .select('country_code')
        .eq('user_id', user.id)
        .maybeSingle();
      return ((data as any)?.country_code as string) || detectCountry();
    },
    staleTime: 60 * 60 * 1000,
  });

  // Real viral trending — country scoped (Global Top 30)
  const {
    data: trending = [],
    isLoading: trendingLoading,
  } = useQuery({
    queryKey: ['home', 'viral', userCountry || 'auto'],
    queryFn: () => getTopIndexedTracks(30, userCountry || undefined),
    staleTime: 15 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !isOffline,
  });

  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const handlePlayTrending = useCallback(async (track: IndexedTrack, queue: IndexedTrack[]) => {
    triggerHaptic('selection');
    if (currentSong?.id === track.id) { togglePlay(); return; }
    setResolvingId(track.id);
    try {
      let r = await resolveIndexedTrack(track.artist, track.title);
      if (!r.streamUrl) r = await forceResolveIndexedTrack(track.artist, track.title);
      if (!r.streamUrl) return;
      const song: Song = {
        id: track.id,
        title: r.title || track.title,
        artist: r.artist || track.artist,
        album: track.album,
        cover_url: r.cover_url || track.cover_url,
        audio_url: r.streamUrl,
        duration: r.duration || track.duration,
        source: 'indexed',
      } as Song;
      const q: Song[] = queue.map((t) => ({
        id: t.id, title: t.title, artist: t.artist, album: t.album,
        cover_url: t.cover_url, audio_url: 'resolving', duration: t.duration,
        source: 'indexed' as const,
      } as Song));
      playSong(song, undefined, q);
    } finally {
      setResolvingId(null);
    }
  }, [currentSong, togglePlay, playSong]);

  // Prefetch top 8 stream resolutions
  useEffect(() => {
    trending.slice(0, 8).forEach((t) => prefetchIndexedTrack(t.artist, t.title));
  }, [trending]);

  // New releases
  const newReleases = useMemo(() => songs.slice(0, 16), [songs]);

  return (
    <TabTransition>
      <div className="h-[100dvh] bg-black relative flex flex-col overflow-hidden text-white">
        {/* ───── Header ───── */}
        <header
          className="flex-shrink-0 z-30 px-4 pt-3 pb-3 safe-area-pt"
          style={{
            background: 'rgba(0,0,0,0.78)',
            backdropFilter: 'blur(40px)',
            WebkitBackdropFilter: 'blur(40px)',
            borderBottom: '0.5px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => { triggerHaptic('selection'); navigate('/profile'); }}
              className="flex items-center gap-3 min-w-0 active:opacity-60"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-white/15">
                <img src={appLogo} alt="UniversFlow" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-[16px] font-extrabold tracking-tight leading-tight truncate">
                  {greeting}
                </p>
                <p className="text-[11px] text-white/55 font-medium truncate mt-0.5">
                  Your music, anytime
                </p>
              </div>
            </button>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              {[
                { icon: Search, action: () => navigate('/search'), label: 'Search' },
                { icon: ListMusic, action: () => setShowQueue(true), label: 'Queue' },
                { icon: Sliders, action: () => setShowEqualizer(true), label: 'Equalizer' },
                { icon: Lock, action: () => setShowLockScreen(true), label: 'Lock screen' },
              ].map(({ icon: Icon, action, label }) => (
                <motion.button
                  key={label}
                  aria-label={label}
                  onClick={() => { triggerHaptic('selection'); action(); }}
                  whileTap={{ scale: 0.85 }}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/10"
                >
                  <Icon className="w-[16px] h-[16px] text-white/85" />
                </motion.button>
              ))}
            </div>
          </div>
        </header>

        {/* ───── Scrollable content ───── */}
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden pb-36 relative z-10"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {loading ? (
            <div className="px-3 pt-4"><HomeSkeleton /></div>
          ) : (
            <>
              {/* ───── Now Playing ───── */}
              {currentSong && (
                <section className="px-3 pt-4">
                  <NowPlayingHero
                    song={currentSong}
                    isPlaying={isPlaying}
                    onToggle={() => { triggerHaptic('selection'); togglePlay(); }}
                    onExpand={() => { triggerHaptic('selection'); setExpanded(true); }}
                  />
                </section>
              )}

              {/* ───── Featured Artists ───── */}
              <section className="px-3 pt-4">
                <CardShell>
                  <ArtistsRail />
                </CardShell>
              </section>

              {/* ───── Global Top 30 (Trending) ───── */}
              <section className="pt-5">
                <div className="px-4 flex items-center gap-2">
                  <Radio className="w-4 h-4 text-rose-500" />
                  <h2 className="text-[18px] font-extrabold tracking-tight">
                    {userCountry ? `${flagFor(userCountry)} Top 30 in ${nameFor(userCountry)}` : 'Global Top 30'}
                  </h2>
                </div>
                <div
                  className="mt-3 flex gap-3 overflow-x-auto hide-scrollbar px-3 pb-1 snap-x"
                  style={{ WebkitOverflowScrolling: 'touch' }}
                >
                  {trendingLoading && trending.length === 0
                    ? Array.from({ length: 6 }).map((_, i) => (
                        <div key={`sk-${i}`} className="flex-shrink-0 w-[210px]">
                          <div className="aspect-square rounded-2xl bg-white/[0.05] animate-pulse" />
                          <div className="h-3 w-3/4 rounded bg-white/[0.05] animate-pulse mt-3" />
                          <div className="h-2.5 w-1/2 rounded bg-white/[0.04] animate-pulse mt-2" />
                        </div>
                      ))
                    : trending.map((t) => {
                        const active = currentSong?.id === t.id;
                        return (
                          <TopChartCard
                            key={t.id}
                            track={t}
                            active={active}
                            isPlaying={active && isPlaying}
                            isResolving={resolvingId === t.id}
                            onPlay={() => handlePlayTrending(t, trending)}
                          />
                        );
                      })}
                </div>
              </section>

              {/* ───── New Releases ───── */}
              {newReleases.length > 0 && (
                <section className="px-3 pt-5">
                  <CardShell>
                    <div className="px-1 mb-3">
                      <h2 className="text-[18px] font-extrabold tracking-tight">New Releases</h2>
                      <p className="text-[11px] text-white/45 font-medium mt-0.5">Fresh tracks just dropped</p>
                    </div>
                    <div
                      className="-mx-1 px-1 flex gap-3 overflow-x-auto hide-scrollbar pb-1 snap-x"
                      style={{ WebkitOverflowScrolling: 'touch' }}
                    >
                      {newReleases.map((s) => (
                        <NewReleaseCard
                          key={s.id}
                          song={s}
                          active={currentSong?.id === s.id}
                          isPlaying={currentSong?.id === s.id && isPlaying}
                          onPlay={() => {
                            triggerHaptic('selection');
                            if (currentSong?.id === s.id) togglePlay();
                            else playSong(s, undefined, newReleases);
                          }}
                          onAddToPlaylist={() => setAddToPlaylistSong(s)}
                        />
                      ))}
                    </div>
                  </CardShell>
                </section>
              )}

              {/* Wordmark */}
              <div className="pt-8 pb-2 text-center">
                <p className="text-[10px] tracking-[0.5em] text-white/15 font-black">
                  UNIVERSFLOW
                </p>
              </div>
            </>
          )}
        </main>

        <BottomNav />
        {showLockScreen && <LockScreenPlayer isOpen={showLockScreen} onClose={() => setShowLockScreen(false)} />}
        {showQueue && <QueueDrawer isOpen={showQueue} onClose={() => setShowQueue(false)} />}
        {showEqualizer && <EqualizerModal isOpen={showEqualizer} onClose={() => setShowEqualizer(false)} />}
        {addToPlaylistSong && (
          <AddToPlaylistModal
            isOpen={!!addToPlaylistSong}
            onClose={() => setAddToPlaylistSong(null)}
            song={addToPlaylistSong}
            onCreateNew={() => { setAddToPlaylistSong(null); navigate('/library'); }}
          />
        )}
        <OfflineIndicator />
      </div>
    </TabTransition>
  );
};

/* ───────────── Reusable card shell ───────────── */
const CardShell = memo(({ children }: { children: React.ReactNode }) => (
  <div
    className="rounded-2xl p-3"
    style={{
      background:
        'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
      border: '0.5px solid rgba(255,255,255,0.08)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
    }}
  >
    {children}
  </div>
));
CardShell.displayName = 'CardShell';

/* ───────────── Now Playing Hero ───────────── */
const NowPlayingHero = memo(({ song, isPlaying, onToggle, onExpand }: {
  song: Song; isPlaying: boolean; onToggle: () => void; onExpand: () => void;
}) => (
  <div
    className="relative rounded-2xl overflow-hidden p-3 flex items-center gap-3"
    style={{
      background:
        'linear-gradient(135deg, rgba(255,45,85,0.18) 0%, rgba(255,45,85,0.04) 60%, rgba(255,255,255,0.03) 100%)',
      border: '0.5px solid rgba(255,255,255,0.1)',
      backdropFilter: 'blur(30px)',
      WebkitBackdropFilter: 'blur(30px)',
      boxShadow: '0 12px 32px -10px rgba(255,45,85,0.25)',
    }}
  >
    <button
      onClick={onExpand}
      className="w-[68px] h-[68px] rounded-xl overflow-hidden bg-white/5 flex-shrink-0 active:scale-95 transition-transform"
    >
      {song.cover_url ? (
        <img src={song.cover_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><Music className="w-7 h-7 text-white/40" /></div>
      )}
    </button>
    <button onClick={onExpand} className="flex-1 min-w-0 text-left">
      <p className="text-[10px] uppercase tracking-[0.24em] text-rose-400 font-black">Now Playing</p>
      <p className="text-[15px] font-extrabold text-white truncate leading-tight mt-1">{song.title}</p>
      <p className="text-[12px] text-white/55 truncate mt-0.5">{song.artist}</p>
    </button>
    <motion.button
      whileTap={{ scale: 0.88 }}
      onClick={onToggle}
      aria-label={isPlaying ? 'Pause' : 'Play'}
      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: '#FF2D55', boxShadow: '0 8px 22px rgba(255,45,85,0.45)' }}
    >
      {isPlaying
        ? <Pause className="w-5 h-5 text-white" fill="currentColor" />
        : <Play className="w-5 h-5 text-white ml-0.5" fill="currentColor" />}
    </motion.button>
  </div>
));
NowPlayingHero.displayName = 'NowPlayingHero';

/* ───────────── Top Chart card (large square) ───────────── */
const TopChartCard = memo(({ track, active, isPlaying, isResolving, onPlay }: {
  track: IndexedTrack; active: boolean; isPlaying: boolean; isResolving: boolean; onPlay: () => void;
}) => (
  <button
    onClick={onPlay}
    className="flex-shrink-0 w-[210px] snap-start text-left active:scale-[0.98] transition-transform"
  >
    <div
      className="relative aspect-square rounded-2xl overflow-hidden bg-white/5"
      style={{ boxShadow: '0 14px 30px -8px rgba(0,0,0,0.65)' }}
    >
      {track.cover_url ? (
        <img src={track.cover_url} alt={track.title} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
      ) : (
        <div className="w-full h-full flex items-center justify-center"><Music className="w-10 h-10 text-white/30" /></div>
      )}
      <div className="absolute bottom-2 right-2 w-11 h-11 rounded-full flex items-center justify-center" style={{ background: '#FF2D55', boxShadow: '0 8px 18px rgba(255,45,85,0.5)' }}>
        {isResolving
          ? <Loader2 className="w-4 h-4 text-white animate-spin" />
          : isPlaying
            ? <Pause className="w-4 h-4 text-white" fill="currentColor" />
            : <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />}
      </div>
    </div>
    <p className={`mt-2.5 truncate text-[14px] font-extrabold leading-tight ${active ? 'text-rose-400' : 'text-white'}`}>
      {track.title}
    </p>
    <p className="mt-0.5 truncate text-[12px] text-white/55">{track.artist}</p>
    <div className="flex items-center gap-1 mt-1.5">
      <Radio className="w-3 h-3 text-white/30" />
      <span className="text-[10px] text-white/35 font-medium">Tap to stream</span>
    </div>
  </button>
));
TopChartCard.displayName = 'TopChartCard';

/* ───────────── New Release card ───────────── */
const NewReleaseCard = memo(({ song, active, isPlaying, onPlay, onAddToPlaylist }: {
  song: Song; active: boolean; isPlaying: boolean; onPlay: () => void; onAddToPlaylist: () => void;
}) => (
  <div className="flex-shrink-0 w-[170px] snap-start">
    <button
      onClick={onPlay}
      className="block w-full text-left active:scale-[0.97] transition-transform"
    >
      <div
        className="relative aspect-square rounded-2xl overflow-hidden bg-white/5"
        style={{ boxShadow: '0 10px 24px -6px rgba(0,0,0,0.6)' }}
      >
        {song.cover_url ? (
          <img src={song.cover_url} alt={song.title} className="w-full h-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"><Music className="w-9 h-9 text-white/30" /></div>
        )}

        {/* Floating action buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <div
            onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
            className="w-9 h-9 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center"
          >
            <LikeButton songId={song.id} song={song} size="sm" />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation(); e.preventDefault();
              triggerHaptic('selection'); onAddToPlaylist();
            }}
            aria-label="Add to playlist"
            className="w-9 h-9 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center active:scale-90 transition-transform"
          >
            <Plus className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Play state pill */}
        {active && (
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-full bg-rose-500/90 text-[9px] font-black uppercase tracking-wider text-white">
            {isPlaying ? 'Playing' : 'Paused'}
          </div>
        )}
      </div>
      <p className={`mt-2 truncate text-[13px] font-bold leading-tight ${active ? 'text-rose-400' : 'text-white'}`}>
        {song.title}
      </p>
      <p className="mt-0.5 truncate text-[11px] text-white/50">{song.artist}</p>
    </button>
  </div>
));
NewReleaseCard.displayName = 'NewReleaseCard';

export default Home;

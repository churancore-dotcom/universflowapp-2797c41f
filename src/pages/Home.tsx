import React, { useEffect, useState, useCallback, useMemo, memo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Music, Lock, ListMusic, Sliders, Headphones, Search, Play, Pause,
  Radio, Heart, Download, Settings as SettingsIcon, Crown, Sparkles,
  Flame, Disc3, Mic2, Compass, Clock, ChevronRight, TrendingUp, Star,
} from 'lucide-react';

import { supabase } from '@/integrations/supabase/client';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import { useSongCache } from '@/hooks/useSongCache';
import { useAuth } from '@/contexts/AuthContext';
import { useDownloads } from '@/contexts/DownloadContext';
import { usePremium } from '@/hooks/usePremium';
import { triggerHaptic } from '@/hooks/useHaptics';

import SleepTimerModal from '@/components/SleepTimerModal';
import QueueDrawer from '@/components/QueueDrawer';
import BottomNav from '@/components/BottomNav';
import LockScreenPlayer from '@/components/LockScreenPlayer';
import EqualizerModal from '@/components/EqualizerModal';
import OfflineIndicator from '@/components/OfflineIndicator';
import OptimizedImage from '@/components/OptimizedImage';
import AllSongsSection from '@/components/AllSongsSection';
import AlbumsShelf from '@/components/AlbumsShelf';
import CountryViralSection from '@/components/CountryViralSection';
import FeaturedArtistsSection from '@/components/FeaturedArtistsSection';
import { TabTransition } from '@/components/PageTransition';
import { HomeSkeleton } from '@/components/PageSkeletons';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import SEOHead from '@/components/SEOHead';
import PullToRefreshIndicator from '@/components/PullToRefresh';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import appLogo from '@/assets/app-logo.png';

/* ============================================================== *
 *  DATA
 * ============================================================== */
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
    const a = s.artists as { id: string; name: string; photo_url: string | null } | null;
    return {
      id: s.id, title: s.title, artist: s.artist,
      album: s.album || undefined, cover_url: s.cover_url || undefined,
      audio_url: s.audio_url, duration: s.duration || undefined,
      artist_id: a?.id || s.artist_id || undefined,
      artist_photo_url: a?.photo_url || undefined,
      genre: s.genre || undefined, mood: s.mood || undefined,
      created_at: s.created_at || undefined,
      show_in_new_releases: s.show_in_new_releases,
      show_in_trending: s.show_in_trending,
      is_premium_only: s.is_premium_only,
      play_count: s.play_count ?? 0,
    } as Song;
  });
};

const fetchRecentlyPlayed = async (userId: string, allSongs: Song[]): Promise<Song[]> => {
  if (!userId) return [];
  const { data } = await supabase
    .from('recently_played')
    .select('song_id, played_at')
    .eq('user_id', userId)
    .order('played_at', { ascending: false })
    .limit(40);
  if (!data) return [];
  const seen = new Set<string>();
  const list: Song[] = [];
  for (const r of data as any[]) {
    if (seen.has(r.song_id)) continue;
    seen.add(r.song_id);
    const s = allSongs.find((x) => x.id === r.song_id);
    if (s) list.push(s);
    if (list.length >= 10) break;
  }
  return list;
};

/* ============================================================== *
 *  SECTION HEADER
 * ============================================================== */
const SectionTitle = memo(({
  eyebrow, title, subtitle, icon: Icon, accent = 'hsl(350 100% 60%)', onMore,
}: {
  eyebrow?: string; title: string; subtitle?: string;
  icon?: any; accent?: string; onMore?: () => void;
}) => (
  <div className="flex items-end justify-between gap-3 px-1 mb-3">
    <div className="min-w-0 flex-1">
      {eyebrow && (
        <p className="text-[9px] uppercase tracking-[0.28em] font-extrabold mb-1"
           style={{ color: accent }}>{eyebrow}</p>
      )}
      <div className="flex items-center gap-2">
        {Icon && (
          <span className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: `${accent.replace(')', ' / 0.18)')}` }}>
            <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
          </span>
        )}
        <h2 className="text-[20px] font-black tracking-tight text-foreground leading-none"
            style={{ fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif' }}>
          {title}
        </h2>
      </div>
      {subtitle && <p className="text-[11px] text-muted-foreground/60 mt-1 truncate">{subtitle}</p>}
    </div>
    {onMore && (
      <button onClick={() => { triggerHaptic('selection'); onMore(); }}
              className="text-[11px] font-bold text-muted-foreground/70 flex items-center gap-0.5 active:opacity-60">
        See all <ChevronRight className="w-3 h-3" />
      </button>
    )}
  </div>
));
SectionTitle.displayName = 'SectionTitle';

/* ============================================================== *
 *  CONTINUE LISTENING RAIL — circular avatars
 * ============================================================== */
const ContinueListeningRail = memo(({ songs }: { songs: Song[] }) => {
  const { playSong, currentSong } = usePlayer();
  if (songs.length === 0) return null;
  return (
    <section className="mb-1">
      <SectionTitle eyebrow="Pick up where you left off" title="Continue listening" icon={Clock} accent="hsl(195 100% 55%)" />
      <div className="flex gap-3 overflow-x-auto -mx-3 px-3 pb-2 scrollbar-none">
        {songs.map((s, i) => {
          const isCur = currentSong?.id === s.id;
          return (
            <motion.button key={s.id} whileTap={{ scale: 0.93 }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => { triggerHaptic('selection'); playSong(s, undefined, songs); }}
              className="flex-shrink-0 w-[78px] flex flex-col items-center">
              <div className="relative w-[72px] h-[72px] rounded-full overflow-hidden"
                style={{
                  boxShadow: isCur
                    ? '0 0 0 2px hsl(var(--primary)), 0 8px 22px hsl(var(--primary) / 0.4)'
                    : '0 6px 18px rgba(0,0,0,0.4)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                }}>
                {s.cover_url
                  ? <OptimizedImage src={s.cover_url} alt={s.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-primary/20 flex items-center justify-center"><Music className="w-6 h-6 text-primary" /></div>}
                {isCur && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <div className="flex items-end gap-[2px] h-3.5">
                      {[0, 1, 2].map(k => <div key={k} className="w-[2px] bg-white rounded-full animate-audio-wave" style={{ animationDelay: `${k * 0.12}s` }} />)}
                    </div>
                  </div>
                )}
              </div>
              <p className="text-[11px] font-semibold text-foreground/90 mt-1.5 text-center line-clamp-1 w-full">{s.title}</p>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
});
ContinueListeningRail.displayName = 'ContinueListeningRail';

/* ============================================================== *
 *  MADE-FOR-YOU MIX CARD
 * ============================================================== */
const MadeForYouCard = memo(({ songs, username }: { songs: Song[]; username: string }) => {
  const { playSong } = usePlayer();
  const mix = useMemo(() => [...songs].sort(() => Math.random() - 0.5).slice(0, 30), [songs]);
  const collage = mix.slice(0, 4);
  if (mix.length === 0) return null;
  const start = () => { triggerHaptic('impactMedium'); playSong(mix[0], undefined, mix); };
  return (
    <motion.button onClick={start} whileTap={{ scale: 0.985 }}
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="w-full relative rounded-3xl overflow-hidden text-left mb-1"
      style={{
        background: 'linear-gradient(135deg, #5b21b6 0%, #ec4899 50%, #f97316 100%)',
        boxShadow: '0 16px 50px -16px rgba(236,72,153,0.55)',
      }}>
      {/* collage grid */}
      <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 opacity-25 mix-blend-overlay">
        {collage.map((s, i) => (
          <div key={i} className="overflow-hidden">
            {s.cover_url && <img src={s.cover_url} alt="" className="w-full h-full object-cover" />}
          </div>
        ))}
      </div>
      <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18), transparent 60%)' }} />
      <div className="relative p-5 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-[0.22em] font-extrabold text-white/80 mb-1">Made for {username || 'you'}</p>
          <p className="text-[22px] font-black text-white leading-tight mb-1"
             style={{ fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif' }}>
            Your Daily Mix
          </p>
          <p className="text-[12px] text-white/75 mb-3">A fresh blend, refreshed every visit</p>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white text-black text-[12px] font-bold">
            <Play className="w-3 h-3" fill="black" /> Play mix
          </span>
        </div>
        <div className="w-20 h-20 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center flex-shrink-0"
             style={{ border: '0.5px solid rgba(255,255,255,0.3)' }}>
          <Sparkles className="w-9 h-9 text-white" />
        </div>
      </div>
    </motion.button>
  );
});
MadeForYouCard.displayName = 'MadeForYouCard';

/* ============================================================== *
 *  TOP CHARTS — numbered ranked top 5
 * ============================================================== */
const TopChartsCard = memo(({ songs }: { songs: Song[] }) => {
  const { playSong, currentSong } = usePlayer();
  const top = useMemo(() => {
    const flagged = songs.filter((s) => (s as any).show_in_trending);
    const pool = flagged.length > 0 ? flagged : [...songs].sort((a, b) => ((b as any).play_count || 0) - ((a as any).play_count || 0));
    return pool.slice(0, 5);
  }, [songs]);
  if (top.length === 0) return null;
  return (
    <section className="mb-1">
      <SectionTitle eyebrow="Charts" title="Top 5 right now" icon={TrendingUp} accent="hsl(350 100% 60%)" />
      <div className="rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(255,45,85,0.10) 0%, rgba(255,255,255,0.02) 100%)',
          border: '0.5px solid rgba(255,45,85,0.18)',
        }}>
        {top.map((s, i) => {
          const cur = currentSong?.id === s.id;
          return (
            <motion.button key={s.id} whileTap={{ scale: 0.98 }}
              onClick={() => { triggerHaptic('selection'); playSong(s, undefined, top); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left active:bg-white/5"
              style={{ borderBottom: i < top.length - 1 ? '0.5px solid rgba(255,255,255,0.05)' : undefined }}>
              <span className={`text-[28px] font-black tabular-nums w-9 text-center ${i === 0 ? 'text-rose-400' : 'text-muted-foreground/35'}`}
                    style={i === 0 ? { textShadow: '0 0 14px rgba(255,45,85,0.5)' } : undefined}>
                {i + 1}
              </span>
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
                   style={{ boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}>
                {s.cover_url
                  ? <OptimizedImage src={s.cover_url} alt={s.title} className="w-full h-full object-cover" />
                  : <div className="w-full h-full bg-primary/20" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-[14px] font-bold truncate ${cur ? 'text-primary' : 'text-foreground'}`}>{s.title}</p>
                <p className="text-[12px] text-muted-foreground/60 truncate mt-0.5">{s.artist}</p>
              </div>
              <Play className="w-4 h-4 text-foreground/70 flex-shrink-0" fill="currentColor" />
            </motion.button>
          );
        })}
      </div>
    </section>
  );
});
TopChartsCard.displayName = 'TopChartsCard';

/* ============================================================== *
 *  NEW RELEASES — 2-col rich grid
 * ============================================================== */
const NewReleasesGrid = memo(({ songs }: { songs: Song[] }) => {
  const { playSong } = usePlayer();
  const fresh = useMemo(() => {
    const flagged = songs.filter((s) => (s as any).show_in_new_releases);
    const pool = flagged.length > 0 ? flagged
      : [...songs].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));
    return pool.slice(0, 6);
  }, [songs]);
  if (fresh.length === 0) return null;
  return (
    <section className="mb-1">
      <SectionTitle eyebrow="Just dropped" title="New releases" icon={Sparkles} accent="hsl(280 100% 65%)" />
      <div className="grid grid-cols-2 gap-3">
        {fresh.map((s, i) => (
          <motion.button key={s.id}
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.04 }} whileTap={{ scale: 0.96 }}
            onClick={() => { triggerHaptic('selection'); playSong(s, undefined, fresh); }}
            className="relative aspect-square rounded-2xl overflow-hidden text-left"
            style={{ boxShadow: '0 10px 28px -10px rgba(0,0,0,0.6)' }}>
            {s.cover_url
              ? <OptimizedImage src={s.cover_url} alt={s.title} className="absolute inset-0 w-full h-full object-cover" />
              : <div className="absolute inset-0 bg-primary/20" />}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.9) 100%)' }} />
            <div className="absolute bottom-2.5 left-2.5 right-2.5">
              <p className="text-[12.5px] font-bold text-white leading-tight line-clamp-1">{s.title}</p>
              <p className="text-[10.5px] text-white/65 line-clamp-1 mt-0.5">{s.artist}</p>
            </div>
            <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white flex items-center justify-center"
                 style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
              <Play className="w-3 h-3 text-black ml-0.5" fill="black" />
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
});
NewReleasesGrid.displayName = 'NewReleasesGrid';

/* ============================================================== *
 *  GENRE / MOOD MOSAIC
 * ============================================================== */
const GENRE_TILES = [
  { name: 'Lo-fi',   keys: ['lofi', 'lo-fi', 'chill'],            color: '#9333ea', emoji: '🌙' },
  { name: 'Hip Hop', keys: ['hip', 'rap', 'trap'],                color: '#f59e0b', emoji: '🎤' },
  { name: 'Pop',     keys: ['pop'],                                color: '#ec4899', emoji: '✨' },
  { name: 'Rock',    keys: ['rock', 'metal'],                      color: '#dc2626', emoji: '🤘' },
  { name: 'Indie',   keys: ['indie', 'alt'],                       color: '#0891b2', emoji: '🎸' },
  { name: 'Dance',   keys: ['dance', 'edm', 'electro', 'house'],   color: '#10b981', emoji: '🕺' },
];

const GenreMosaic = memo(({ songs }: { songs: Song[] }) => {
  const { playSong } = usePlayer();
  const navigate = useNavigate();

  const matchSongs = (keys: string[]) =>
    songs.filter((s) => {
      const g = (s.genre || '').toLowerCase();
      const m = (s.mood || '').toLowerCase();
      return keys.some((k) => g.includes(k) || m.includes(k));
    });

  const playGenre = (keys: string[]) => {
    const list = matchSongs(keys).sort(() => Math.random() - 0.5).slice(0, 30);
    if (list.length > 0) { triggerHaptic('impactMedium'); playSong(list[0], undefined, list); }
    else { triggerHaptic('selection'); navigate('/search'); }
  };

  return (
    <section className="mb-1">
      <SectionTitle eyebrow="Browse" title="Moods & genres" icon={Compass} accent="hsl(160 80% 50%)" />
      <div className="grid grid-cols-2 gap-2.5">
        {GENRE_TILES.map((g, i) => (
          <motion.button key={g.name} whileTap={{ scale: 0.95 }}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => playGenre(g.keys)}
            className="relative h-[88px] rounded-2xl overflow-hidden text-left p-3"
            style={{
              background: `linear-gradient(135deg, ${g.color} 0%, ${g.color}cc 100%)`,
              boxShadow: `0 8px 20px -8px ${g.color}80`,
            }}>
            <p className="text-[16px] font-black text-white leading-tight"
               style={{ fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif' }}>
              {g.name}
            </p>
            <span className="absolute -bottom-2 -right-2 text-[56px] leading-none opacity-90 rotate-[18deg]">
              {g.emoji}
            </span>
          </motion.button>
        ))}
      </div>
    </section>
  );
});
GenreMosaic.displayName = 'GenreMosaic';

/* ============================================================== *
 *  HOME COMPONENT
 * ============================================================== */
const EmptyState = memo(() => (
  <div className="text-center py-12">
    <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
         style={{ background: 'linear-gradient(135deg, hsl(350 100% 60% / 0.25), hsl(280 100% 65% / 0.15))' }}>
      <Music className="w-9 h-9 text-primary" />
    </div>
    <h2 className="text-lg font-bold mb-1">No music yet</h2>
    <p className="text-muted-foreground text-xs px-4">Your library will appear here once tracks are added.</p>
  </div>
));
EmptyState.displayName = 'EmptyState';

const Home = () => {
  const navigate = useNavigate();
  const { currentSong, isPlaying, togglePlay, playSong } = usePlayer();
  const { cachedSongs, updateCache } = useSongCache();
  const { isOffline, user } = useAuth();
  const { downloads } = useDownloads();
  const { isPremium } = usePremium();
  const queryClient = useQueryClient();

  const [showLockScreen, setShowLockScreen] = useState(false);
  const [showSleepTimer, setShowSleepTimer] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showEqualizer, setShowEqualizer] = useState(false);
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

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
        cover_url: d.cover_url, audio_url: d.blobUrl || d.audio_url, duration: d.duration,
      } as Song));
    }
    return onlineSongs;
  }, [isOffline, downloads, onlineSongs]);

  useEffect(() => {
    if (!isOffline && onlineSongs && onlineSongs.length > 0) updateCache(onlineSongs);
  }, [onlineSongs, updateCache, isOffline]);

  const loading = isLoading && songs.length === 0 && !isOffline;
  const allSongs = useMemo(() => songs, [songs]);

  const { data: recent = [] } = useQuery({
    queryKey: ['home', 'recently-played', user?.id, allSongs.length],
    queryFn: () => fetchRecentlyPlayed(user!.id, allSongs),
    enabled: !!user && !isOffline && allSongs.length > 0,
    staleTime: 60_000,
  });

  // Realtime diff
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

  const greeting = useCallback(() => {
    const h = now.getHours();
    if (h < 5) return 'Late night';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Tonight';
  }, [now]);

  const timeLabel = useMemo(
    () => now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
    [now]
  );

  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      triggerHaptic('impactMedium');
      await queryClient.invalidateQueries({ queryKey: HOME_SONGS_QUERY_KEY });
      await queryClient.refetchQueries({ queryKey: HOME_SONGS_QUERY_KEY });
    },
  });

  const heroPick = useMemo(() => allSongs.find((s) => s.cover_url) || allSongs[0], [allSongs]);

  const startShuffle = useCallback(() => {
    if (allSongs.length === 0) return;
    triggerHaptic('impactMedium');
    const pool = [...allSongs].sort(() => Math.random() - 0.5).slice(0, 25);
    playSong(pool[0], undefined, pool);
  }, [allSongs, playSong]);

  const username = useMemo(() => {
    const meta: any = user?.user_metadata || {};
    return meta.username || meta.full_name || (user?.email ? user.email.split('@')[0] : '');
  }, [user]);

  return (
    <TabTransition>
      <div className="h-[100dvh] bg-background relative flex flex-col overflow-hidden">
        <SEOHead
          title="Univers Flow — Free Music Streaming & Playlists"
          description="Your personalized music feed: trending tracks, featured artists, auto-generated mixes, and your now-playing card. Stream and download free."
          path="/home"
          jsonLdId="home-jsonld"
          jsonLd={{
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Univers Flow — Home',
            url: 'https://universflow.in/home',
            description: 'Personalized music feed with trending tracks, featured artists, and auto-generated mixes.',
            isPartOf: { '@type': 'WebSite', name: 'Univers Flow', url: 'https://universflow.in' },
          }}
        />
        <h1 className="sr-only">Univers Flow Music Player</h1>

        {/* Ambient background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {currentSong?.cover_url && (
            <img src={currentSong.cover_url} alt="" aria-hidden
              className="absolute -top-32 left-1/2 -translate-x-1/2 w-[260%] h-[80%] object-cover opacity-[0.18] saturate-[1.6]"
              style={{ filter: 'blur(120px)' }} />
          )}
          <div className="absolute inset-0" style={{
            background: `
              radial-gradient(ellipse 90% 55% at 50% -10%, hsl(350 100% 60% / 0.18), transparent 60%),
              radial-gradient(ellipse 60% 45% at 100% 10%, hsl(280 100% 65% / 0.10), transparent 65%),
              radial-gradient(ellipse 50% 35% at 0% 70%, hsl(210 100% 60% / 0.08), transparent 70%)`,
          }} />
          <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
            style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 0.5px, transparent 0.5px)', backgroundSize: '3px 3px' }} />
        </div>

        {/* Header */}
        <header className="flex-shrink-0 z-30 px-4 pt-3 pb-3 safe-area-pt"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.55) 100%)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            borderBottom: '0.5px solid rgba(255,255,255,0.07)',
          }}>
          <div className="flex items-center justify-between gap-2">
            <button onClick={() => { triggerHaptic('selection'); navigate('/profile'); }}
              className="flex items-center gap-3 min-w-0 active:opacity-70">
              <div className="w-11 h-11 rounded-full overflow-hidden flex-shrink-0"
                style={{ boxShadow: '0 4px 18px hsl(var(--primary) / 0.35), inset 0 0 0 1.5px hsl(var(--primary) / 0.4)' }}>
                <img src={appLogo} alt="Univers Flow" width={44} height={44} {...({ fetchpriority: 'high' } as any)} decoding="async" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0 text-left">
                <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-primary/80">{greeting()} · {timeLabel}</p>
                <p className="text-[15px] font-bold text-foreground tracking-tight truncate leading-tight">
                  {username || 'Welcome back'}
                </p>
              </div>
            </button>
            <div className="flex items-center gap-1.5">
              {[
                { icon: Search, label: 'Search', onClick: () => navigate('/search') },
                { icon: ListMusic, label: 'Queue', onClick: () => setShowQueue(true) },
                { icon: Lock, label: 'Lock screen', onClick: () => setShowLockScreen(true), primary: true },
              ].map((b, i) => (
                <motion.button key={i} whileTap={{ scale: 0.85 }}
                  aria-label={b.label}
                  onClick={() => { triggerHaptic('selection'); b.onClick(); }}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={b.primary
                    ? { background: 'linear-gradient(135deg, hsl(var(--primary) / 0.25), hsl(var(--primary) / 0.08))', border: '0.5px solid hsl(var(--primary) / 0.35)' }
                    : { background: 'rgba(255,255,255,0.07)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
                  <b.icon className={`w-4 h-4 ${b.primary ? 'text-primary' : 'text-foreground/75'}`} />
                </motion.button>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden px-3 pt-3 pb-36 relative z-10"
          style={{ WebkitOverflowScrolling: 'touch' }} {...pullToRefresh.handlers}>
          <PullToRefreshIndicator
            pullDistance={pullToRefresh.pullDistance} isRefreshing={pullToRefresh.isRefreshing}
            progress={pullToRefresh.progress} isTriggered={pullToRefresh.isTriggered} />

          {loading ? <HomeSkeleton />
            : isOffline && songs.length === 0 ? <EmptyState />
            : (
              <div className="space-y-5">
                <AnnouncementBanner />

                {/* HERO */}
                {!isOffline && heroPick && (
                  <motion.button
                    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    whileTap={{ scale: 0.985 }}
                    onClick={() => { triggerHaptic('impactMedium'); playSong(heroPick, undefined, allSongs); }}
                    className="relative w-full rounded-[28px] overflow-hidden text-left"
                    style={{
                      aspectRatio: '16 / 10',
                      boxShadow: '0 20px 60px -20px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.08)',
                    }}>
                    {heroPick.cover_url && (
                      <img src={heroPick.cover_url} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110" />
                    )}
                    <div className="absolute inset-0" style={{
                      background: 'linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.92) 100%)',
                    }} />
                    <div className="absolute inset-0 flex flex-col justify-between p-5">
                      <span className="self-start text-[10px] uppercase tracking-[0.22em] font-extrabold px-2.5 py-1 rounded-full"
                        style={{ background: 'rgba(255,45,85,0.95)', color: 'white', boxShadow: '0 4px 14px rgba(255,45,85,0.5)' }}>
                        Editor's Pick
                      </span>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-white/65 mb-1">{heroPick.artist}</p>
                        <p className="text-[26px] leading-[1.05] font-black text-white tracking-tight line-clamp-2 mb-3"
                           style={{ fontFamily: '"SF Pro Display", -apple-system, system-ui, sans-serif' }}>
                          {heroPick.title}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="w-11 h-11 rounded-full flex items-center justify-center"
                            style={{ background: 'white', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                            <Play className="w-4 h-4 text-black ml-0.5" fill="black" />
                          </span>
                          <span className="text-[12px] font-semibold text-white/80">Play now</span>
                        </div>
                      </div>
                    </div>
                  </motion.button>
                )}

                {/* QUICK CHIPS */}
                <div className="flex gap-2 overflow-x-auto -mx-3 px-3 scrollbar-none">
                  {[
                    { icon: Radio, label: 'Shuffle Mix', onClick: startShuffle, accent: 'hsl(350 100% 60%)' },
                    { icon: Heart, label: 'Liked', onClick: () => navigate('/library?tab=liked'), accent: 'hsl(328 100% 60%)' },
                    { icon: Download, label: 'Downloads', onClick: () => navigate('/downloads'), accent: 'hsl(195 100% 55%)' },
                    ...(isPremium || isOffline
                      ? [{ icon: Sliders, label: 'Equalizer', onClick: () => setShowEqualizer(true), accent: 'hsl(280 100% 65%)' }]
                      : [{ icon: Crown, label: 'Go Premium', onClick: () => navigate('/premium'), accent: 'hsl(45 100% 55%)' }]),
                    { icon: SettingsIcon, label: 'Settings', onClick: () => navigate('/settings'), accent: 'hsl(0 0% 70%)' },
                  ].map((c, i) => (
                    <motion.button key={i} whileTap={{ scale: 0.92 }}
                      onClick={() => { triggerHaptic('selection'); c.onClick(); }}
                      className="flex-shrink-0 flex items-center gap-2 pl-2.5 pr-3.5 py-2 rounded-full"
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '0.5px solid rgba(255,255,255,0.1)',
                        backdropFilter: 'blur(20px)',
                      }}>
                      <span className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: c.accent.replace(')', ' / 0.18)'), border: `0.5px solid ${c.accent.replace(')', ' / 0.3)')}` }}>
                        <c.icon className="w-3.5 h-3.5" style={{ color: c.accent }} />
                      </span>
                      <span className="text-[12.5px] font-semibold text-foreground/90 whitespace-nowrap">{c.label}</span>
                    </motion.button>
                  ))}
                </div>

                {/* NOW PLAYING ribbon */}
                {currentSong && (
                  <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                    className="relative rounded-3xl overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                      border: '0.5px solid rgba(255,255,255,0.12)',
                      backdropFilter: 'blur(30px)', WebkitBackdropFilter: 'blur(30px)',
                    }}>
                    {currentSong.cover_url && (
                      <img src={currentSong.cover_url} alt="" aria-hidden
                        className="absolute inset-0 w-full h-full object-cover opacity-30 blur-2xl saturate-150" />
                    )}
                    <div className="relative flex items-center gap-3.5 p-3.5">
                      <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0"
                        style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.5)', border: '0.5px solid rgba(255,255,255,0.12)' }}>
                        {currentSong.cover_url
                          ? <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                          : <div className="w-full h-full bg-primary/20 flex items-center justify-center"><Headphones className="w-7 h-7 text-primary" /></div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className="flex items-end gap-[2px] h-2.5">
                            {[0, 1, 2].map((i) => (
                              <div key={i} className="w-[2.5px] bg-primary rounded-full animate-audio-wave"
                                style={{ animationDelay: `${i * 0.14}s`, animationPlayState: isPlaying ? 'running' : 'paused' }} />
                            ))}
                          </div>
                          <p className="text-[9px] uppercase tracking-[0.2em] font-extrabold text-primary">
                            {isPlaying ? 'Now Playing' : 'Paused'}
                          </p>
                        </div>
                        <p className="text-[15px] font-bold text-foreground truncate leading-tight">{currentSong.title}</p>
                        <p className="text-[12px] text-muted-foreground/70 truncate mt-0.5">{currentSong.artist}</p>
                      </div>
                      <motion.button whileTap={{ scale: 0.88 }}
                        onClick={() => { triggerHaptic('selection'); togglePlay(); }}
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                        className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center"
                        style={{
                          background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(350 100% 50%))',
                          boxShadow: '0 6px 20px hsl(var(--primary) / 0.45)',
                        }}>
                        {isPlaying ? <Pause className="w-4 h-4 text-white" fill="white" />
                                   : <Play className="w-4 h-4 text-white ml-0.5" fill="white" />}
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* CONTINUE LISTENING */}
                {!isOffline && recent.length > 0 && <ContinueListeningRail songs={recent} />}

                {/* MADE FOR YOU */}
                {!isOffline && allSongs.length > 5 && <MadeForYouCard songs={allSongs} username={username} />}

                {/* TOP CHARTS */}
                {!isOffline && <TopChartsCard songs={allSongs} />}

                {/* NEW RELEASES */}
                {!isOffline && <NewReleasesGrid songs={allSongs} />}

                {/* GENRE MOSAIC */}
                {!isOffline && allSongs.length > 0 && <GenreMosaic songs={allSongs} />}

                {/* ALBUMS */}
                {!isOffline && (
                  <div>
                    <SectionTitle eyebrow="Full records" title="Albums" icon={Disc3} accent="hsl(45 100% 55%)" />
                    <AlbumsShelf songs={allSongs} />
                  </div>
                )}

                {/* FEATURED ARTISTS */}
                {!isOffline && (
                  <div>
                    <SectionTitle eyebrow="Voices" title="Featured artists" icon={Mic2} accent="hsl(195 100% 55%)"
                                  onMore={() => navigate('/artists')} />
                    <FeaturedArtistsSection />
                  </div>
                )}

                {/* COUNTRY VIRAL */}
                {!isOffline && (
                  <div>
                    <SectionTitle eyebrow="Worldwide" title="Viral right now" icon={Flame} accent="hsl(15 100% 55%)" />
                    <CountryViralSection />
                  </div>
                )}

                {/* OFFLINE-ONLY */}
                {isOffline && allSongs.length > 0 && <AllSongsSection songs={allSongs} />}

                {/* PREMIUM TEASE */}
                {!isPremium && !isOffline && (
                  <motion.button whileTap={{ scale: 0.985 }}
                    onClick={() => { triggerHaptic('selection'); navigate('/premium'); }}
                    className="w-full relative rounded-3xl overflow-hidden text-left p-5"
                    style={{
                      background: 'linear-gradient(135deg, #18181b 0%, #27272a 50%, #18181b 100%)',
                      border: '0.5px solid rgba(255,215,0,0.25)',
                      boxShadow: '0 14px 40px -14px rgba(255,215,0,0.25)',
                    }}>
                    <div className="absolute inset-0 opacity-30"
                         style={{ background: 'radial-gradient(circle at 80% 20%, rgba(255,215,0,0.35), transparent 50%)' }} />
                    <div className="relative flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                           style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', boxShadow: '0 8px 20px rgba(245,158,11,0.4)' }}>
                        <Crown className="w-7 h-7 text-black" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.22em] font-extrabold text-amber-400 mb-1">Universflow Premium</p>
                        <p className="text-[16px] font-bold text-white leading-tight">Lossless audio, EQ & ad-free</p>
                        <p className="text-[11px] text-white/60 mt-0.5">From ₹49 · cancel anytime</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/60" />
                    </div>
                  </motion.button>
                )}

                {/* Footer mark */}
                <div className="pt-4 pb-2 text-center">
                  <p className="text-[10px] uppercase tracking-[0.35em] font-bold text-muted-foreground/40">Universflow</p>
                  <div className="mx-auto mt-2 h-[1px] w-12"
                       style={{ background: 'linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent)' }} />
                  <p className="text-[10px] text-muted-foreground/40 mt-2">{allSongs.length.toLocaleString()} tracks ready · You've reached the end</p>
                </div>
              </div>
            )}
        </main>

        <BottomNav />
        {showLockScreen && <LockScreenPlayer isOpen={showLockScreen} onClose={() => setShowLockScreen(false)} />}
        {showSleepTimer && <SleepTimerModal isOpen={showSleepTimer} onClose={() => setShowSleepTimer(false)} />}
        {showQueue && <QueueDrawer isOpen={showQueue} onClose={() => setShowQueue(false)} />}
        {showEqualizer && <EqualizerModal isOpen={showEqualizer} onClose={() => setShowEqualizer(false)} />}
        <OfflineIndicator />
      </div>
    </TabTransition>
  );
};

export default Home;

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Music2, Radio, Sparkles } from 'lucide-react';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import { useDownloads } from '@/contexts/DownloadContext';
import { useAuth } from '@/contexts/AuthContext';
import { getUserArtistPrefs } from '@/lib/userArtistPrefs';
import { prefetchIndexedTrack, searchIndexedTracks, type IndexedTrack } from '@/lib/musicIndexer';
import { triggerHaptic } from '@/hooks/useHaptics';

interface Props {
  songs: Song[];
}

const normalize = (value?: string | null) => value?.trim().toLowerCase() || '';
const tileShadow = { boxShadow: '0 6px 18px rgba(0,0,0,0.45)' } as const;

const FollowedArtistSongsSection = memo(function FollowedArtistSongsSection({ songs }: Props) {
  const { user } = useAuth();
  const { currentSong, isPlaying, playSong, togglePlay } = usePlayer();
  const { getDownloadedUrl } = useDownloads();
  const [followed, setFollowed] = useState<Set<string>>(new Set());
  const [vibeTracks, setVibeTracks] = useState<IndexedTrack[]>([]);
  const [loadingVibes, setLoadingVibes] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setFollowed(new Set());
      return;
    }
    getUserArtistPrefs(user.id).then((prefs) => {
      if (!cancelled) setFollowed(new Set(prefs.map((pref) => normalize(pref.artist_name))));
    });
    return () => { cancelled = true; };
  }, [user?.id]);

  const followedSongs = useMemo(() => {
    if (!followed.size) return [];
    return songs
      .filter((song) => followed.has(normalize(song.artist)))
      .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
      .slice(0, 18);
  }, [followed, songs]);

  const followedNames = useMemo(() => Array.from(followed).filter(Boolean), [followed]);

  useEffect(() => {
    let cancelled = false;
    if (!user || followedNames.length === 0) {
      setVibeTracks([]);
      setLoadingVibes(false);
      return;
    }

    setLoadingVibes(true);
    Promise.all(followedNames.slice(0, 4).map((artist) => searchIndexedTracks(artist, 8).catch(() => [])))
      .then((groups) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const tracks = groups.flat().filter((track) => {
          const key = `${normalize(track.artist)}::${normalize(track.title)}`;
          if (!key || seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 18);
        setVibeTracks(tracks);
        tracks.slice(0, 6).forEach((track) => prefetchIndexedTrack(track.artist, track.title));
      })
      .finally(() => {
        if (!cancelled) setLoadingVibes(false);
      });

    return () => { cancelled = true; };
  }, [followedNames, user]);

  const playIndexed = useCallback((track: IndexedTrack) => {
    triggerHaptic('impactLight');
    const queue: Song[] = vibeTracks.map((t) => ({
      id: t.id,
      title: t.title,
      artist: t.artist,
      album: t.album,
      cover_url: t.cover_url,
      audio_url: 'resolving',
      duration: t.duration,
      source: 'indexed',
    }));
    const song = queue.find((item) => item.id === track.id) || queue[0];
    if (song) playSong(song, undefined, queue);
  }, [playSong, vibeTracks]);

  if (!user || (followedSongs.length === 0 && vibeTracks.length === 0 && !loadingVibes)) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">From Your Artists</h2>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 snap-x snap-mandatory">
        {followedSongs.map((song) => {
          const active = currentSong?.id === song.id;
          return (
            <button
              key={song.id}
              type="button"
              onClick={() => {
                triggerHaptic('impactLight');
                if (active) togglePlay();
                else playSong(song, getDownloadedUrl(song.id), followedSongs);
              }}
              className={`w-36 flex-shrink-0 snap-start text-left active:scale-[0.96] transition-transform ${sectionShell}`}
            >
              <div className={`relative mb-2 aspect-square overflow-hidden rounded-2xl bg-muted/50 ${active ? 'ring-2 ring-primary' : ''}`}>
                {song.cover_url ? (
                  <img src={song.cover_url} alt={`${song.title} cover art`} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Music2 className="w-7 h-7 text-muted-foreground" />
                  </div>
                )}
                {active && (
                  <div className="absolute bottom-2 right-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-bold text-primary">
                    {isPlaying ? '▶' : 'Ⅱ'}
                  </div>
                )}
              </div>
              <p className={`truncate text-[13px] font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>{song.title}</p>
              <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{song.artist}</p>
            </button>
          );
        })}
      </div>

      {(loadingVibes || vibeTracks.length > 0) && (
        <div className="space-y-2 pt-1">
          <div className="flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            <Radio className="w-3.5 h-3.5 text-primary" />
            Your Vibe
          </div>
          <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-1 snap-x snap-mandatory">
            {loadingVibes && vibeTracks.length === 0
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className={`w-36 flex-shrink-0 snap-start animate-pulse ${sectionShell}`}>
                    <div className="mb-2 aspect-square rounded-2xl bg-muted/60" />
                    <div className="h-3 rounded bg-muted/60 mb-2" />
                    <div className="h-3 w-2/3 rounded bg-muted/40" />
                  </div>
                ))
              : vibeTracks.map((track) => {
                  const active = currentSong?.id === track.id;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => active ? togglePlay() : playIndexed(track)}
                      className={`w-36 flex-shrink-0 snap-start text-left active:scale-[0.96] transition-transform ${sectionShell}`}
                    >
                      <div className={`relative mb-2 aspect-square overflow-hidden rounded-2xl bg-muted/50 ${active ? 'ring-2 ring-primary' : ''}`}>
                        {track.cover_url ? (
                          <img src={track.cover_url} alt={`${track.title} cover art`} className="h-full w-full object-cover" loading="lazy" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Music2 className="w-7 h-7 text-muted-foreground" />
                          </div>
                        )}
                        {active && (
                          <div className="absolute bottom-2 right-2 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {isPlaying ? '▶' : 'Ⅱ'}
                          </div>
                        )}
                      </div>
                      <p className={`truncate text-[13px] font-semibold ${active ? 'text-primary' : 'text-foreground'}`}>{track.title}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{track.artist}</p>
                    </button>
                  );
                })}
            {loadingVibes && vibeTracks.length > 0 && <Loader2 className="mt-14 h-4 w-4 flex-shrink-0 animate-spin text-muted-foreground" />}
          </div>
        </div>
      )}
    </section>
  );
});

export default FollowedArtistSongsSection;
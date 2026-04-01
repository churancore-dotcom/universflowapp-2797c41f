import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import { usePlayer, Song } from '@/contexts/PlayerContext';

const SongSuggestions = memo(function SongSuggestions({ allSongs }: { allSongs: Song[] }) {
  const { currentSong, playSong } = usePlayer();

  const suggestions = useMemo(() => {
    if (!currentSong || allSongs.length === 0) return [];
    // Filter out current song, prefer same genre/artist, then random
    const sameGenre = allSongs.filter(
      s => s.id !== currentSong.id && s.genre && s.genre === currentSong.genre
    );
    const sameArtist = allSongs.filter(
      s => s.id !== currentSong.id && s.artist === currentSong.artist
    );
    const others = allSongs.filter(s => s.id !== currentSong.id);

    // Combine: artist first, then genre, then others – deduplicate
    const seen = new Set<string>();
    const result: Song[] = [];
    for (const list of [sameArtist, sameGenre, others]) {
      for (const s of list) {
        if (!seen.has(s.id) && result.length < 15) {
          seen.add(s.id);
          result.push(s);
        }
      }
    }
    return result;
  }, [currentSong, allSongs]);

  if (suggestions.length === 0) return null;

  return (
    <div className="w-full mt-2">
      <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2 px-1">
        Up Next
      </p>
      <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
        {suggestions.map((song, i) => (
          <motion.button
            key={song.id}
            className="flex-shrink-0 w-[60px] group"
            onClick={() => playSong(song)}
            whileTap={{ scale: 0.92 }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03, duration: 0.2 }}
          >
            <div className="w-[60px] h-[60px] rounded-lg overflow-hidden mb-1 relative">
              {song.cover_url ? (
                <img src={song.cover_url} alt="" className="w-full h-full object-cover" draggable={false} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center">
                  <span className="text-white/50 text-lg">♪</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/0 group-active:bg-black/30 transition-colors" />
            </div>
            <p className="text-[10px] text-white/60 truncate text-center leading-tight">
              {song.title}
            </p>
          </motion.button>
        ))}
      </div>
    </div>
  );
});

export default SongSuggestions;

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Disc3, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Song, usePlayer } from '@/contexts/PlayerContext';
import OptimizedImage from './OptimizedImage';
import { triggerHaptic } from '@/hooks/useHaptics';

interface Album {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  release_year: number | null;
}

interface Props { songs: Song[] }

const fetchAlbums = async (): Promise<Album[]> => {
  const { data, error } = await supabase
    .from('albums')
    .select('id, title, artist, cover_url, release_year')
    .order('created_at', { ascending: false })
    .limit(8);
  if (error) throw error;
  return (data || []) as Album[];
};

/**
 * Spotify "Made for You" style — 2-column bento grid with big square covers,
 * NOT horizontal scroll. Easier to scan, feels more curated.
 */
const AlbumsShelf = memo(({ songs }: Props) => {
  const { playSong } = usePlayer();
  const { data: albums = [] } = useQuery({
    queryKey: ['home', 'albums'],
    queryFn: fetchAlbums,
    staleTime: 10 * 60 * 1000,
  });

  if (albums.length === 0) return null;

  const playAlbum = (album: Album) => {
    triggerHaptic('impactLight');
    const tracks = songs.filter(
      (s) =>
        (s.album || '').toLowerCase() === album.title.toLowerCase() &&
        (s.artist || '').toLowerCase() === album.artist.toLowerCase()
    );
    if (tracks.length > 0) playSong(tracks[0], undefined, tracks);
  };

  return (
    <section className="mb-2">
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, rgba(0,200,150,0.08) 0%, rgba(255,255,255,0.02) 60%)',
          border: '0.5px solid rgba(0,200,150,0.16)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
        }}
      >
        <div className="flex items-center gap-2.5 px-4 pt-4 pb-3">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #00c896, #00d4ff)' }}
          >
            <Disc3 className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] font-bold tracking-tight text-foreground">Albums</h2>
            <p className="text-[11px] text-muted-foreground/60 font-medium">Full records, one tap</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 px-3 pb-3">
          {albums.map((album, idx) => (
            <motion.button
              key={album.id}
              onClick={() => playAlbum(album)}
              whileTap={{ scale: 0.96 }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03 }}
              className="relative aspect-square rounded-2xl overflow-hidden text-left group"
              style={{
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                border: '0.5px solid rgba(255,255,255,0.08)',
              }}
            >
              {album.cover_url ? (
                <OptimizedImage src={album.cover_url} alt={album.title} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 to-cyan-500/20 flex items-center justify-center">
                  <Disc3 className="w-12 h-12 text-white/50" />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
              <div className="absolute bottom-2 left-2.5 right-2.5">
                <p className="text-[13px] font-bold text-white truncate leading-tight" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.7)' }}>
                  {album.title}
                </p>
                <p className="text-[10.5px] text-white/70 truncate mt-0.5">
                  {album.artist}{album.release_year ? ` · ${album.release_year}` : ''}
                </p>
              </div>
              <div className="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/95 flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
                <Play className="w-4 h-4 text-black ml-0.5" fill="currentColor" />
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
});

AlbumsShelf.displayName = 'AlbumsShelf';
export default AlbumsShelf;

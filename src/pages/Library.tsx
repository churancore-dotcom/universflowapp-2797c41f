import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Music, Heart, ListMusic, Clock, Plus, Download, CloudOff, Trash2, User, Play } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePlayer, Song } from '@/contexts/PlayerContext';
import { useDownloads } from '@/contexts/DownloadContext';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullscreenPlayer from '@/components/FullscreenPlayer';
import CreatePlaylistModal from '@/components/CreatePlaylistModal';
import LikeButton from '@/components/LikeButton';
import DownloadButton from '@/components/DownloadButton';
import { TabTransition } from '@/components/PageTransition';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { iosSpring, iosBounce } from '@/lib/animations';

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const Library = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { playSong, currentSong, isPlaying } = usePlayer();
  const { downloads, removeSong, getDownloadedUrl, totalStorageUsed, clearAllDownloads } = useDownloads();
  const [likedSongs, setLikedSongs] = useState<Song[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [artists, setArtists] = useState<{ name: string; songCount: number; coverUrl: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('liked');
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);

  useEffect(() => {
    if (user) {
      fetchLibrary();
    }
  }, [user]);

  const fetchLibrary = async () => {
    if (!user) return;

    const [liked, recent, userPlaylists, allSongs] = await Promise.all([
      supabase
        .from('user_library')
        .select('*, songs(*)')
        .eq('user_id', user.id)
        .order('added_at', { ascending: false }),
      supabase
        .from('recently_played')
        .select('*, songs(*)')
        .eq('user_id', user.id)
        .order('played_at', { ascending: false })
        .limit(20),
      supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('songs')
        .select('artist, cover_url')
        .eq('is_visible', true),
    ]);

    if (liked.data) {
      setLikedSongs(liked.data.map(l => ({
        id: l.songs.id,
        title: l.songs.title,
        artist: l.songs.artist,
        album: l.songs.album || undefined,
        cover_url: l.songs.cover_url || undefined,
        audio_url: l.songs.audio_url,
      })));
    }

    if (recent.data) {
      const uniqueSongs = new Map();
      recent.data.forEach(r => {
        if (!uniqueSongs.has(r.songs.id)) {
          uniqueSongs.set(r.songs.id, {
            id: r.songs.id,
            title: r.songs.title,
            artist: r.songs.artist,
            album: r.songs.album || undefined,
            cover_url: r.songs.cover_url || undefined,
            audio_url: r.songs.audio_url,
          });
        }
      });
      setRecentlyPlayed(Array.from(uniqueSongs.values()));
    }

    if (userPlaylists.data) {
      setPlaylists(userPlaylists.data);
    }

    // Build artists list from all songs - normalize names for intelligent grouping
    if (allSongs.data) {
      const artistMap = new Map<string, { displayName: string; count: number; coverUrl: string | null }>();
      
      allSongs.data.forEach(song => {
        // Normalize: trim, collapse multiple spaces, lowercase for matching
        const normalizedKey = song.artist.trim().replace(/\s+/g, ' ').toLowerCase();
        const displayName = song.artist.trim().replace(/\s+/g, ' ');
        
        const existing = artistMap.get(normalizedKey);
        if (existing) {
          existing.count++;
          // Keep the first (or most common) capitalization and first cover found
        } else {
          artistMap.set(normalizedKey, { 
            displayName, 
            count: 1, 
            coverUrl: song.cover_url 
          });
        }
      });
      
      const artistList = Array.from(artistMap.values())
        .map(data => ({
          name: data.displayName,
          songCount: data.count,
          coverUrl: data.coverUrl,
        }))
        .sort((a, b) => b.songCount - a.songCount); // Sort by song count
      
      setArtists(artistList);
    }

    setLoading(false);
  };

  const handlePlaySong = (song: Song) => {
    const offlineUrl = getDownloadedUrl(song.id);
    playSong(song, offlineUrl);
  };

  const SongList = ({ songs, emptyMessage, emptyIcon: EmptyIcon }: { songs: Song[]; emptyMessage: string; emptyIcon: React.ElementType }) => (
    songs.length === 0 ? (
      <motion.div 
        className="text-center py-16"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={iosSpring}
      >
        <motion.div
          className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'rgba(118, 118, 128, 0.12)' }}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...iosBounce, delay: 0.1 }}
        >
          <EmptyIcon className="w-10 h-10 text-muted-foreground/50" />
        </motion.div>
        <p className="text-muted-foreground text-lg">{emptyMessage}</p>
      </motion.div>
    ) : (
      <div className="space-y-1">
        {songs.map((song, index) => {
          const isActive = currentSong?.id === song.id;
          return (
            <motion.div
              key={song.id}
              className={`flex items-center gap-3 p-3 rounded-2xl transition-all ${
                isActive ? 'bg-primary/10' : 'active:bg-white/5'
              }`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...iosSpring, delay: index * 0.03 }}
            >
              <motion.button
                className="flex-1 flex items-center gap-3 text-left min-w-0"
                onClick={() => handlePlaySong(song)}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg">
                  {song.cover_url ? (
                    <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Music className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-[15px] truncate ${isActive ? 'text-primary' : ''}`}>
                    {song.title}
                  </p>
                  <p className="text-[13px] text-muted-foreground truncate">{song.artist}</p>
                </div>
              </motion.button>
              
              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {isActive && isPlaying ? (
                  <div className="flex items-end gap-[3px] h-4 mr-2">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-[3px] bg-primary rounded-full"
                        animate={{ height: [5, 14, 5] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    <LikeButton songId={song.id} size="sm" />
                    <DownloadButton song={song} size="sm" />
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    )
  );

  const DownloadsList = () => (
    downloads.length === 0 ? (
      <motion.div 
        className="text-center py-16"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={iosSpring}
      >
        <motion.div
          className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center"
          style={{ background: 'rgba(118, 118, 128, 0.12)' }}
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...iosBounce, delay: 0.1 }}
        >
          <CloudOff className="w-10 h-10 text-muted-foreground/50" />
        </motion.div>
        <p className="text-muted-foreground text-lg">No downloaded songs</p>
        <p className="text-sm text-muted-foreground/70 mt-2">Songs you download will appear here for offline listening</p>
      </motion.div>
    ) : (
      <div className="space-y-4">
        {/* Storage info */}
        <motion.div 
          className="flex items-center justify-between p-4 rounded-2xl"
          style={{ background: 'rgba(118, 118, 128, 0.12)' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div>
            <p className="text-sm font-medium">{downloads.length} songs downloaded</p>
            <p className="text-xs text-muted-foreground">{formatBytes(totalStorageUsed)} used</p>
          </div>
          {downloads.length > 0 && (
            <motion.button
              className="px-4 py-2 rounded-xl text-sm font-medium text-destructive bg-destructive/10"
              onClick={clearAllDownloads}
              whileTap={{ scale: 0.95 }}
            >
              Clear All
            </motion.button>
          )}
        </motion.div>

        {/* Downloaded songs list */}
        <div className="space-y-1">
          {downloads.map((song, index) => {
            const isActive = currentSong?.id === song.id;
            return (
              <motion.div
                key={song.id}
                className={`flex items-center gap-4 p-3 rounded-2xl transition-all ${
                  isActive ? 'bg-primary/10' : 'active:bg-white/5'
                }`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...iosSpring, delay: index * 0.03 }}
              >
                <motion.button
                  className="flex-1 flex items-center gap-4 text-left"
                  onClick={() => handlePlaySong(song)}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-lg">
                    {song.cover_url ? (
                      <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-6 h-6 text-muted-foreground" />
                    )}
                    {/* Offline badge */}
                    <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <CloudOff className="w-2.5 h-2.5 text-primary-foreground" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-[15px] truncate ${isActive ? 'text-primary' : ''}`}>
                      {song.title}
                    </p>
                    <p className="text-[13px] text-muted-foreground truncate">{song.artist}</p>
                    <p className="text-[11px] text-muted-foreground/60">{formatBytes(song.size)}</p>
                  </div>
                </motion.button>
                
                {isActive && isPlaying ? (
                  <div className="flex items-end gap-[3px] h-4 mr-2">
                    {[...Array(3)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="w-[3px] bg-primary rounded-full"
                        animate={{ height: [5, 14, 5] }}
                        transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }}
                      />
                    ))}
                  </div>
                ) : (
                  <motion.button
                    className="p-2 rounded-full text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => removeSong(song.id)}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Trash2 className="w-5 h-5" />
                  </motion.button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    )
  );

  return (
    <TabTransition>
      <motion.div 
        className="min-h-screen bg-black pb-52"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
      {/* iOS-style header */}
      <motion.header
        className="sticky top-0 z-30 px-5 pt-4 pb-3 safe-area-pt"
        style={{
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(40px) saturate(180%)',
          WebkitBackdropFilter: 'blur(40px) saturate(180%)',
        }}
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={iosSpring}
      >
        <motion.h1 
          className="text-[28px] font-bold"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...iosSpring, delay: 0.1 }}
        >
          Your Library
        </motion.h1>
      </motion.header>

      <main className="px-5 pt-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* iOS-style segmented control */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...iosSpring, delay: 0.15 }}
          >
            <TabsList 
              className="w-full h-12 p-1 mb-6 rounded-xl"
              style={{ background: 'rgba(118, 118, 128, 0.12)' }}
            >
              {[
                { value: 'liked', icon: Heart, label: 'Liked' },
                { value: 'artists', icon: User, label: 'Artists' },
                { value: 'downloads', icon: Download, label: 'Downloads' },
                { value: 'playlists', icon: ListMusic, label: 'Playlists' },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <TabsTrigger 
                    key={tab.value}
                    value={tab.value} 
                    className="flex-1 h-full rounded-lg gap-1 text-[11px] sm:text-[13px] font-semibold data-[state=active]:bg-white/15 data-[state=active]:shadow-sm transition-all duration-200"
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </motion.div>

          <AnimatePresence mode="wait">
            <TabsContent value="liked" className="mt-0">
              {loading ? (
                <motion.div 
                  className="flex justify-center py-16"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <motion.div 
                    className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </motion.div>
              ) : (
                <SongList songs={likedSongs} emptyMessage="No liked songs yet" emptyIcon={Heart} />
              )}
            </TabsContent>

            <TabsContent value="artists" className="mt-0">
              {loading ? (
                <motion.div className="flex justify-center py-16">
                  <motion.div 
                    className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </motion.div>
              ) : artists.length === 0 ? (
                <motion.div 
                  className="text-center py-16"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={iosSpring}
                >
                  <motion.div
                    className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: 'rgba(118, 118, 128, 0.12)' }}
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ ...iosBounce, delay: 0.1 }}
                  >
                    <User className="w-10 h-10 text-muted-foreground/50" />
                  </motion.div>
                  <p className="text-muted-foreground text-lg">No artists yet</p>
                  <p className="text-sm text-muted-foreground/70 mt-2">Upload songs to see artists here</p>
                </motion.div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {artists.map((artist, index) => (
                    <motion.div
                      key={artist.name}
                      className="rounded-2xl overflow-hidden cursor-pointer"
                      style={{
                        background: 'rgba(28, 28, 30, 0.8)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ ...iosSpring, delay: index * 0.03 }}
                      whileHover={{ scale: 1.03, y: -4 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => navigate(`/artist/${encodeURIComponent(artist.name)}`)}
                    >
                      <div className="aspect-square bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center relative overflow-hidden">
                        {artist.coverUrl ? (
                          <img src={artist.coverUrl} alt={artist.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-12 h-12 text-muted-foreground" />
                        )}
                        {/* Play indicator */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-lg">
                            <Play className="w-6 h-6 fill-current text-primary-foreground ml-0.5" />
                          </div>
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-[15px] truncate">{artist.name}</p>
                        <p className="text-[13px] text-muted-foreground">
                          {artist.songCount} {artist.songCount === 1 ? 'song' : 'songs'}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="downloads" className="mt-0">
              <DownloadsList />
            </TabsContent>

            <TabsContent value="playlists" className="mt-0">
              {loading ? (
                <motion.div className="flex justify-center py-16">
                  <motion.div 
                    className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  />
                </motion.div>
              ) : playlists.length === 0 ? (
                <motion.div 
                  className="text-center py-16"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={iosSpring}
                >
                  <motion.div
                    className="w-20 h-20 rounded-3xl mx-auto mb-4 flex items-center justify-center"
                    style={{ background: 'rgba(118, 118, 128, 0.12)' }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ ...iosBounce, delay: 0.1 }}
                  >
                    <ListMusic className="w-10 h-10 text-muted-foreground/50" />
                  </motion.div>
                  <p className="text-muted-foreground text-lg">No playlists yet</p>
                  <motion.button
                    className="mt-4 px-6 py-3 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-2 mx-auto"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={iosBounce}
                    onClick={() => setShowCreatePlaylist(true)}
                  >
                    <Plus className="w-5 h-5" />
                    Create Playlist
                  </motion.button>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {/* Create new playlist button */}
                  <motion.button
                    onClick={() => setShowCreatePlaylist(true)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl bg-primary/10"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={iosBounce}
                  >
                    <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
                      <Plus className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <span className="font-semibold text-lg">Create New Playlist</span>
                  </motion.button>

                  <div className="grid grid-cols-2 gap-4">
                    {playlists.map((playlist, index) => (
                      <motion.div
                        key={playlist.id}
                        className="rounded-2xl overflow-hidden cursor-pointer"
                        style={{
                          background: 'rgba(28, 28, 30, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ ...iosSpring, delay: index * 0.05 }}
                        whileHover={{ scale: 1.03, y: -4 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate(`/playlist/${playlist.id}`)}
                      >
                        <div className="aspect-square bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                          {playlist.cover_url ? (
                            <img src={playlist.cover_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ListMusic className="w-12 h-12 text-muted-foreground" />
                          )}
                        </div>
                        <div className="p-3">
                          <p className="font-semibold text-[15px] truncate">{playlist.title}</p>
                          <p className="text-[13px] text-muted-foreground truncate">{playlist.description || 'Playlist'}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </main>

      <BottomNav />
      <MiniPlayer />
      <FullscreenPlayer />
      
      <CreatePlaylistModal
        isOpen={showCreatePlaylist}
        onClose={() => setShowCreatePlaylist(false)}
        onCreated={fetchLibrary}
      />
      </motion.div>
    </TabTransition>
  );
};

export default Library;

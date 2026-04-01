import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Upload, Music, Image, Send, Loader2, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import BottomNav from '@/components/BottomNav';
import MiniPlayer from '@/components/MiniPlayer';
import FullscreenPlayer from '@/components/FullscreenPlayer';
import PageTransition from '@/components/PageTransition';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';

const genres = ['Pop', 'Rock', 'Hip-Hop', 'R&B', 'Electronic', 'Jazz', 'Classical', 'Country', 'Phonk', 'Funk', 'Lo-Fi', 'Metal', 'Indie', 'Latin', 'K-Pop', 'Other'];
const moods = ['Energetic', 'Chill', 'Happy', 'Sad', 'Romantic', 'Dark', 'Motivational', 'Party', 'Focus', 'Peaceful'];

const ALLOWED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
const ALLOWED_IMAGE = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface SongRequest {
  id: string;
  title: string;
  artist: string;
  status: string;
  created_at: string;
}

const RequestSong = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [album, setAlbum] = useState('');
  const [genre, setGenre] = useState('');
  const [mood, setMood] = useState('');
  const [bpm, setBpm] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [myRequests, setMyRequests] = useState<SongRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // Drag states
  const [audioDragOver, setAudioDragOver] = useState(false);
  const [coverDragOver, setCoverDragOver] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from('song_requests' as any)
        .select('id, title, artist, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setMyRequests((data as any[]) || []);
      setLoadingRequests(false);
    })();
  }, [user]);

  const handleAudioDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setAudioDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && ALLOWED_AUDIO.includes(file.type)) {
      setAudioFile(file);
    } else {
      toast.error('Please drop a valid audio file (MP3, WAV, FLAC, AAC, OGG, M4A)');
    }
  }, []);

  const handleCoverDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setCoverDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && ALLOWED_IMAGE.includes(file.type)) {
      setCoverFile(file);
    } else {
      toast.error('Please drop a valid image file (JPG, PNG, WebP)');
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user) { toast.error('Please log in first'); return; }
    if (!title.trim() || !artist.trim()) {
      toast.error('Title and Artist are required');
      return;
    }
    if (!audioFile) {
      toast.error('Please upload an audio file');
      return;
    }

    setSubmitting(true);
    setUploadProgress(10);

    try {
      // Upload audio file
      const audioExt = audioFile.name.split('.').pop() || 'mp3';
      const audioPath = `requests/${user.id}/${Date.now()}.${audioExt}`;
      setUploadProgress(20);

      const { error: audioErr } = await supabase.storage
        .from('music')
        .upload(audioPath, audioFile, { contentType: audioFile.type });
      if (audioErr) throw new Error('Failed to upload audio: ' + audioErr.message);
      setUploadProgress(60);

      const { data: audioUrlData } = supabase.storage.from('music').getPublicUrl(audioPath);
      const audioUrl = audioUrlData.publicUrl;

      // Upload cover if provided
      let coverUrl: string | null = null;
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop() || 'webp';
        const coverPath = `requests/${user.id}/${Date.now()}_cover.${coverExt}`;
        const { error: coverErr } = await supabase.storage
          .from('covers')
          .upload(coverPath, coverFile, { contentType: coverFile.type });
        if (!coverErr) {
          const { data: coverUrlData } = supabase.storage.from('covers').getPublicUrl(coverPath);
          coverUrl = coverUrlData.publicUrl;
        }
      }
      setUploadProgress(80);

      // Insert request
      const { error } = await supabase.from('song_requests' as any).insert({
        user_id: user.id,
        title: title.trim(),
        artist: artist.trim(),
        audio_url: audioUrl,
        cover_url: coverUrl,
        genre: genre || null,
        mood: mood || null,
      } as any);

      if (error) throw error;
      setUploadProgress(100);

      toast.success('Song request submitted! Admin will review it.');
      setTitle(''); setArtist(''); setAlbum(''); setGenre(''); setMood(''); setBpm('');
      setAudioFile(null); setCoverFile(null); setUploadProgress(0);

      // Refresh
      const { data } = await supabase
        .from('song_requests' as any)
        .select('id, title, artist, status, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      setMyRequests((data as any[]) || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
      setUploadProgress(0);
    }
  }, [user, title, artist, audioFile, coverFile, genre, mood]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'accepted': return 'Accepted';
      case 'rejected': return 'Rejected';
      default: return 'Pending';
    }
  };

  return (
    <PageTransition>
      <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
        <header className="flex-shrink-0 z-30 px-2 pt-3 pb-2 flex items-center safe-area-pt" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(40px)' }}>
          <button onClick={() => navigate(-1)} className="flex items-center gap-0.5 px-2 py-2 -ml-1 text-primary">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <h1 className="text-sm font-semibold absolute left-1/2 -translate-x-1/2">Request a Song</h1>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-32 space-y-5" style={{ WebkitOverflowScrolling: 'touch' }}>
          {/* Audio File Upload */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Audio File *</h3>
            <div
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                audioDragOver ? 'border-primary bg-primary/10' : audioFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border bg-card'
              }`}
              onClick={() => audioInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setAudioDragOver(true); }}
              onDragLeave={() => setAudioDragOver(false)}
              onDrop={handleAudioDrop}
            >
              <Music className="w-8 h-8 text-muted-foreground" />
              {audioFile ? (
                <p className="text-sm text-emerald-400 font-medium">{audioFile.name}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-muted-foreground">Drop audio file here</p>
                  <p className="text-[11px] text-muted-foreground/60">MP3, WAV, FLAC, AAC, OGG, M4A</p>
                </>
              )}
            </div>
            <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setAudioFile(f); }} />
          </div>

          {/* Cover Art Upload */}
          <div>
            <h3 className="text-sm font-semibold mb-2">Cover Art</h3>
            <div
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-colors ${
                coverDragOver ? 'border-primary bg-primary/10' : coverFile ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-border bg-card'
              }`}
              onClick={() => coverInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setCoverDragOver(true); }}
              onDragLeave={() => setCoverDragOver(false)}
              onDrop={handleCoverDrop}
            >
              <Image className="w-8 h-8 text-muted-foreground" />
              {coverFile ? (
                <p className="text-sm text-emerald-400 font-medium">{coverFile.name}</p>
              ) : (
                <>
                  <p className="text-sm font-medium text-muted-foreground">Drop cover image here</p>
                  <p className="text-[11px] text-muted-foreground/60">Auto-compressed to WebP</p>
                </>
              )}
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) setCoverFile(f); }} />
          </div>

          {/* Song Details */}
          <div className="rounded-2xl p-4 bg-card border border-border space-y-4">
            <h3 className="text-base font-bold">Song Details</h3>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Title *</label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Song title" className="bg-background" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Artist *</label>
              <Input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Artist name" className="bg-background" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Album</label>
              <Input value={album} onChange={e => setAlbum(e.target.value)} placeholder="Album name" className="bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Genre</label>
                <select value={genre} onChange={e => setGenre(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground">
                  <option value="">Genre</option>
                  {genres.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Mood</label>
                <select value={mood} onChange={e => setMood(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm text-foreground">
                  <option value="">Mood</option>
                  {moods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">BPM</label>
              <Input type="number" value={bpm} onChange={e => setBpm(e.target.value)} placeholder="120" className="bg-background" />
            </div>

            {/* Upload Progress */}
            {submitting && uploadProgress > 0 && (
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }} />
              </div>
            )}

            <Button onClick={handleSubmit} disabled={submitting || !title || !artist || !audioFile} className="w-full gap-2">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? 'Uploading...' : 'Submit Request'}
            </Button>
          </div>

          {/* My Requests */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">My Requests</h3>
            {loadingRequests ? (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            ) : myRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No requests yet</div>
            ) : (
              <div className="space-y-2">
                {myRequests.map(req => (
                  <motion.div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-card border border-border" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{req.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{req.artist}</p>
                    </div>
                    <div className="flex items-center gap-1.5 ml-2">
                      {getStatusIcon(req.status)}
                      <span className={`text-xs font-medium ${req.status === 'accepted' ? 'text-emerald-400' : req.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </section>
        </main>

        <BottomNav />
        <MiniPlayer />
        <FullscreenPlayer />
      </div>
    </PageTransition>
  );
};

export default RequestSong;

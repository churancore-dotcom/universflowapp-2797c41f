import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Music, Image, X, Check, Loader2, AlertCircle, FileAudio, Link, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const genres = ['Pop', 'Rock', 'Hip Hop', 'R&B', 'Electronic', 'Jazz', 'Classical', 'Country', 'Indie', 'Metal', 'Phonk', 'Lo-Fi', 'Bollywood', 'Punjabi', 'Haryanvi'];
const moods = ['Happy', 'Sad', 'Energetic', 'Calm', 'Romantic', 'Dark', 'Uplifting', 'Chill', 'Slow Reverb', 'Bass Boosted'];

// File validation constants
const MAX_AUDIO_SIZE = 100 * 1024 * 1024; // 100MB
const MAX_COVER_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/flac', 'audio/aac', 'audio/ogg', 'audio/mp4', 'audio/x-m4a'];
const ALLOWED_COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

interface ValidationError {
  type: 'audio' | 'cover' | 'url';
  message: string;
}

const UploadMusic = () => {
  const [uploadMode, setUploadMode] = useState<'file' | 'url'>('file');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingAudio, setIsDraggingAudio] = useState(false);
  const [isDraggingCover, setIsDraggingCover] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  
  // URL import state
  const [audioUrl, setAudioUrl] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [urlValidated, setUrlValidated] = useState(false);
  
  const [metadata, setMetadata] = useState({
    title: '',
    artist: '',
    album: '',
    genre: '',
    mood: '',
    bpm: '',
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const validateAudioFile = (file: File): string | null => {
    if (!ALLOWED_AUDIO_TYPES.includes(file.type) && !file.name.match(/\.(mp3|wav|flac|aac|ogg|m4a)$/i)) {
      return 'Invalid audio format. Supported: MP3, WAV, FLAC, AAC, OGG, M4A';
    }
    if (file.size > MAX_AUDIO_SIZE) {
      return `Audio file too large. Maximum size: ${formatFileSize(MAX_AUDIO_SIZE)}`;
    }
    return null;
  };

  const validateCoverFile = (file: File): string | null => {
    if (!ALLOWED_COVER_TYPES.includes(file.type)) {
      return 'Invalid image format. Supported: JPG, PNG, WebP, GIF';
    }
    if (file.size > MAX_COVER_SIZE) {
      return `Cover image too large. Maximum size: ${formatFileSize(MAX_COVER_SIZE)}`;
    }
    return null;
  };

  const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(Math.round(audio.duration));
      };
      audio.onerror = () => resolve(0);
      audio.src = URL.createObjectURL(file);
    });
  };

  const getAudioDurationFromUrl = (url: string): Promise<number> => {
    return new Promise((resolve) => {
      const audio = new Audio();
      audio.onloadedmetadata = () => {
        resolve(Math.round(audio.duration));
      };
      audio.onerror = () => resolve(0);
      audio.crossOrigin = 'anonymous';
      audio.src = url;
    });
  };

  const validateAudioUrl = async () => {
    if (!audioUrl.trim()) {
      toast.error('Please enter an audio URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(audioUrl);
    } catch {
      setValidationErrors(prev => [...prev.filter(e => e.type !== 'url'), { type: 'url', message: 'Invalid URL format' }]);
      toast.error('Invalid URL format');
      return;
    }

    setIsValidatingUrl(true);
    setValidationErrors(prev => prev.filter(e => e.type !== 'url'));

    try {
      // Try to fetch headers to check if it's a valid audio file
      const response = await fetch(audioUrl, { method: 'HEAD', mode: 'cors' }).catch(() => null);
      
      if (response) {
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.includes('audio') && !contentType.includes('octet-stream')) {
          // Not definitely audio, but still try to load it
          console.warn('Content type may not be audio:', contentType);
        }
      }

      // Try to get duration
      const duration = await getAudioDurationFromUrl(audioUrl);
      if (duration > 0) {
        setAudioDuration(duration);
        setUrlValidated(true);
        toast.success('Audio URL validated successfully!');
      } else {
        // URL might still work, just can't get duration
        setUrlValidated(true);
        toast.success('URL accepted - duration will be detected on playback');
      }
    } catch (error) {
      console.error('URL validation error:', error);
      // Still allow the URL - it might work when played
      setUrlValidated(true);
      toast.info('URL accepted - please verify it plays correctly');
    } finally {
      setIsValidatingUrl(false);
    }
  };

  const handleAudioDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingAudio(false);
    const file = e.dataTransfer.files[0];
    
    if (file) {
      const error = validateAudioFile(file);
      if (error) {
        setValidationErrors(prev => [...prev.filter(e => e.type !== 'audio'), { type: 'audio', message: error }]);
        toast.error(error);
        return;
      }
      
      setValidationErrors(prev => prev.filter(e => e.type !== 'audio'));
      setAudioFile(file);
      
      const duration = await getAudioDuration(file);
      setAudioDuration(duration);
      
      const name = file.name.replace(/\.[^/.]+$/, '');
      setMetadata(prev => ({ ...prev, title: prev.title || name }));
    }
  }, []);

  const handleCoverDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingCover(false);
    const file = e.dataTransfer.files[0];
    
    if (file) {
      const error = validateCoverFile(file);
      if (error) {
        setValidationErrors(prev => [...prev.filter(e => e.type !== 'cover'), { type: 'cover', message: error }]);
        toast.error(error);
        return;
      }
      
      setValidationErrors(prev => prev.filter(e => e.type !== 'cover'));
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  }, []);

  const handleAudioSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateAudioFile(file);
      if (error) {
        setValidationErrors(prev => [...prev.filter(e => e.type !== 'audio'), { type: 'audio', message: error }]);
        toast.error(error);
        return;
      }
      
      setValidationErrors(prev => prev.filter(e => e.type !== 'audio'));
      setAudioFile(file);
      
      const duration = await getAudioDuration(file);
      setAudioDuration(duration);
      
      const name = file.name.replace(/\.[^/.]+$/, '');
      setMetadata(prev => ({ ...prev, title: prev.title || name }));
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const error = validateCoverFile(file);
      if (error) {
        setValidationErrors(prev => [...prev.filter(e => e.type !== 'cover'), { type: 'cover', message: error }]);
        toast.error(error);
        return;
      }
      
      setValidationErrors(prev => prev.filter(e => e.type !== 'cover'));
      setCoverFile(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async () => {
    if (uploadMode === 'file') {
      if (!audioFile || !metadata.title || !metadata.artist) {
        toast.error('Please fill in required fields');
        return;
      }
    } else {
      if (!audioUrl || !metadata.title || !metadata.artist) {
        toast.error('Please fill in required fields');
        return;
      }
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      let finalAudioUrl = audioUrl;
      let fileSize = 0;

      if (uploadMode === 'file' && audioFile) {
        // Upload audio file
        const audioExt = audioFile.name.split('.').pop();
        const audioPath = `${Date.now()}-${Math.random().toString(36).substring(7)}.${audioExt}`;
        
        setUploadProgress(20);
        const { error: audioError } = await supabase.storage
          .from('music')
          .upload(audioPath, audioFile);

        if (audioError) throw audioError;

        const { data: audioUrlData } = supabase.storage.from('music').getPublicUrl(audioPath);
        finalAudioUrl = audioUrlData.publicUrl;
        fileSize = audioFile.size;
      }

      setUploadProgress(50);

      // Handle cover
      let finalCoverUrl = coverUrl || null;
      let coverSize = 0;

      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop();
        const coverPath = `${Date.now()}-${Math.random().toString(36).substring(7)}.${coverExt}`;
        
        const { error: coverError } = await supabase.storage
          .from('covers')
          .upload(coverPath, coverFile);

        if (!coverError) {
          const { data } = supabase.storage.from('covers').getPublicUrl(coverPath);
          finalCoverUrl = data.publicUrl;
          coverSize = coverFile.size;
        }
      }

      setUploadProgress(75);

      // Insert song record
      const { error: dbError } = await supabase.from('songs').insert({
        title: metadata.title,
        artist: metadata.artist,
        album: metadata.album || null,
        genre: metadata.genre || null,
        mood: metadata.mood || null,
        bpm: metadata.bpm ? parseInt(metadata.bpm) : null,
        audio_url: finalAudioUrl,
        cover_url: finalCoverUrl,
        is_visible: true,
        file_size: fileSize,
        duration: audioDuration,
        cover_size: coverSize,
      });

      if (dbError) throw dbError;

      setUploadProgress(100);
      toast.success('Song added successfully!');

      // Reset form
      setTimeout(() => {
        setAudioFile(null);
        setCoverFile(null);
        setCoverPreview(null);
        setAudioDuration(0);
        setAudioUrl('');
        setCoverUrl('');
        setUrlValidated(false);
        setMetadata({ title: '', artist: '', album: '', genre: '', mood: '', bpm: '' });
        setUploadProgress(0);
        setIsUploading(false);
      }, 1000);

    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const canSubmit = uploadMode === 'file' 
    ? (audioFile && metadata.title && metadata.artist)
    : (audioUrl && metadata.title && metadata.artist);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl md:text-3xl font-display font-bold">Upload Music</h1>
        <p className="text-muted-foreground mt-1 text-sm md:text-base">Add new tracks to your music library</p>
      </motion.div>

      {/* Upload Mode Tabs */}
      <Tabs value={uploadMode} onValueChange={(v) => setUploadMode(v as 'file' | 'url')} className="mb-6">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50">
          <TabsTrigger value="file" className="flex items-center gap-2">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">File Upload</span>
            <span className="sm:hidden">File</span>
          </TabsTrigger>
          <TabsTrigger value="url" className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            <span className="hidden sm:inline">URL Import</span>
            <span className="sm:hidden">URL</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="file" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* File Upload Section */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* Audio Upload */}
              <div>
                <Label className="mb-2 block text-sm">Audio File *</Label>
                <motion.div
                  className={`relative border-2 border-dashed rounded-2xl p-6 md:p-8 text-center transition-all ${
                    isDraggingAudio
                      ? 'border-primary bg-primary/10'
                      : audioFile
                      ? 'border-green-500/50 bg-green-500/5'
                      : validationErrors.some(e => e.type === 'audio')
                      ? 'border-destructive/50 bg-destructive/5'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingAudio(true); }}
                  onDragLeave={() => setIsDraggingAudio(false)}
                  onDrop={handleAudioDrop}
                  whileHover={{ scale: 1.01 }}
                >
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <AnimatePresence mode="wait">
                    {audioFile ? (
                      <motion.div
                        key="file"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="flex items-center justify-center gap-3"
                      >
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <Check className="w-5 h-5 md:w-6 md:h-6 text-green-500" />
                        </div>
                        <div className="text-left min-w-0">
                          <p className="font-medium truncate text-sm md:text-base">{audioFile.name}</p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {formatFileSize(audioFile.size)} • {audioDuration > 0 ? formatDuration(audioDuration) : 'Loading...'}
                          </p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setAudioFile(null); setAudioDuration(0); }}
                          className="p-2 hover:bg-white/10 rounded-full flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Music className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="font-medium text-sm md:text-base">Drop audio file here</p>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1">
                          MP3, WAV, FLAC, AAC, OGG, M4A
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* Cover Upload */}
              <div>
                <Label className="mb-2 block text-sm">Cover Art</Label>
                <motion.div
                  className={`relative border-2 border-dashed rounded-2xl p-6 md:p-8 text-center transition-all ${
                    isDraggingCover
                      ? 'border-primary bg-primary/10'
                      : coverFile
                      ? 'border-accent/50 bg-accent/5'
                      : validationErrors.some(e => e.type === 'cover')
                      ? 'border-destructive/50 bg-destructive/5'
                      : 'border-white/10 hover:border-white/20'
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingCover(true); }}
                  onDragLeave={() => setIsDraggingCover(false)}
                  onDrop={handleCoverDrop}
                  whileHover={{ scale: 1.01 }}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverSelect}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <AnimatePresence mode="wait">
                    {coverPreview ? (
                      <motion.div
                        key="preview"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="relative inline-block"
                      >
                        <img
                          src={coverPreview}
                          alt="Cover preview"
                          className="w-24 h-24 md:w-32 md:h-32 rounded-xl object-cover mx-auto"
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCoverFile(null);
                            setCoverPreview(null);
                          }}
                          className="absolute -top-2 -right-2 p-1 bg-destructive rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <Image className="w-10 h-10 md:w-12 md:h-12 mx-auto mb-3 text-muted-foreground" />
                        <p className="font-medium text-sm md:text-base">Drop cover image here</p>
                        <p className="text-xs md:text-sm text-muted-foreground mt-1">
                          JPG, PNG, WebP
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>
            </motion.div>

            {/* Metadata Section */}
            <MetadataForm 
              metadata={metadata}
              setMetadata={setMetadata}
              genres={genres}
              moods={moods}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              canSubmit={!!canSubmit}
              onSubmit={handleUpload}
            />
          </div>
        </TabsContent>

        <TabsContent value="url" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* URL Import Section */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
            >
              {/* Audio URL */}
              <div className="glass rounded-2xl p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-5 h-5 text-primary" />
                  <Label className="text-base font-medium">Audio URL *</Label>
                </div>
                <p className="text-xs text-muted-foreground mb-4">
                  Enter a direct link to an MP3 file (e.g., from Google Drive, Dropbox, or your own server)
                </p>
                <div className="flex gap-2">
                  <Input
                    value={audioUrl}
                    onChange={(e) => { setAudioUrl(e.target.value); setUrlValidated(false); }}
                    placeholder="https://example.com/song.mp3"
                    className="flex-1 bg-muted/50 border-white/10"
                  />
                  <Button
                    onClick={validateAudioUrl}
                    disabled={isValidatingUrl || !audioUrl}
                    variant="outline"
                    className="flex-shrink-0"
                  >
                    {isValidatingUrl ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : urlValidated ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      'Verify'
                    )}
                  </Button>
                </div>
                {urlValidated && audioDuration > 0 && (
                  <p className="text-xs text-green-500 mt-2">
                    ✓ Audio verified • Duration: {formatDuration(audioDuration)}
                  </p>
                )}
                {validationErrors.find(e => e.type === 'url') && (
                  <p className="text-xs text-destructive mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {validationErrors.find(e => e.type === 'url')?.message}
                  </p>
                )}
              </div>

              {/* Cover URL */}
              <div className="glass rounded-2xl p-4 md:p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Image className="w-5 h-5 text-accent" />
                  <Label className="text-base font-medium">Cover Image URL</Label>
                </div>
                <Input
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="https://example.com/cover.jpg"
                  className="bg-muted/50 border-white/10"
                />
                {coverUrl && (
                  <div className="mt-4 flex justify-center">
                    <img 
                      src={coverUrl} 
                      alt="Cover preview" 
                      className="w-24 h-24 rounded-xl object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Tips */}
              <div className="glass rounded-2xl p-4 md:p-6 bg-primary/5 border-primary/20">
                <h3 className="font-medium text-sm mb-2">💡 Tips for URL Import</h3>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Use direct links to audio files (ending in .mp3, .wav, etc.)</li>
                  <li>• Google Drive: Use "Anyone with link" sharing</li>
                  <li>• Dropbox: Change "dl=0" to "dl=1" in the URL</li>
                  <li>• Make sure the URL is publicly accessible</li>
                </ul>
              </div>
            </motion.div>

            {/* Metadata Section */}
            <MetadataForm 
              metadata={metadata}
              setMetadata={setMetadata}
              genres={genres}
              moods={moods}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              canSubmit={!!canSubmit}
              onSubmit={handleUpload}
              isUrlMode
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Separate component for metadata form to avoid duplication
interface MetadataFormProps {
  metadata: { title: string; artist: string; album: string; genre: string; mood: string; bpm: string };
  setMetadata: React.Dispatch<React.SetStateAction<{ title: string; artist: string; album: string; genre: string; mood: string; bpm: string }>>;
  genres: string[];
  moods: string[];
  isUploading: boolean;
  uploadProgress: number;
  canSubmit: boolean;
  onSubmit: () => void;
  isUrlMode?: boolean;
}

const MetadataForm = ({ metadata, setMetadata, genres, moods, isUploading, uploadProgress, canSubmit, onSubmit, isUrlMode }: MetadataFormProps) => (
  <motion.div
    className="glass rounded-2xl p-4 md:p-6 space-y-4"
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: 0.2 }}
  >
    <h2 className="text-lg font-display font-bold mb-4">Song Details</h2>
    
    <div>
      <Label htmlFor="title" className="text-sm">Title *</Label>
      <Input
        id="title"
        value={metadata.title}
        onChange={(e) => setMetadata(prev => ({ ...prev, title: e.target.value }))}
        className="mt-1.5 bg-muted/50 border-white/10"
        placeholder="Song title"
      />
    </div>

    <div>
      <Label htmlFor="artist" className="text-sm">Artist *</Label>
      <Input
        id="artist"
        value={metadata.artist}
        onChange={(e) => setMetadata(prev => ({ ...prev, artist: e.target.value }))}
        className="mt-1.5 bg-muted/50 border-white/10"
        placeholder="Artist name"
      />
    </div>

    <div>
      <Label htmlFor="album" className="text-sm">Album</Label>
      <Input
        id="album"
        value={metadata.album}
        onChange={(e) => setMetadata(prev => ({ ...prev, album: e.target.value }))}
        className="mt-1.5 bg-muted/50 border-white/10"
        placeholder="Album name"
      />
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label className="text-sm">Genre</Label>
        <Select
          value={metadata.genre}
          onValueChange={(value) => setMetadata(prev => ({ ...prev, genre: value }))}
        >
          <SelectTrigger className="mt-1.5 bg-muted/50 border-white/10">
            <SelectValue placeholder="Genre" />
          </SelectTrigger>
          <SelectContent>
            {genres.map((genre) => (
              <SelectItem key={genre} value={genre}>{genre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm">Mood</Label>
        <Select
          value={metadata.mood}
          onValueChange={(value) => setMetadata(prev => ({ ...prev, mood: value }))}
        >
          <SelectTrigger className="mt-1.5 bg-muted/50 border-white/10">
            <SelectValue placeholder="Mood" />
          </SelectTrigger>
          <SelectContent>
            {moods.map((mood) => (
              <SelectItem key={mood} value={mood}>{mood}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>

    <div>
      <Label htmlFor="bpm" className="text-sm">BPM</Label>
      <Input
        id="bpm"
        type="number"
        value={metadata.bpm}
        onChange={(e) => setMetadata(prev => ({ ...prev, bpm: e.target.value }))}
        className="mt-1.5 bg-muted/50 border-white/10"
        placeholder="120"
      />
    </div>

    {/* Progress Bar */}
    <AnimatePresence>
      {isUploading && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="pt-4"
        >
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-accent"
              initial={{ width: 0 }}
              animate={{ width: `${uploadProgress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-sm text-muted-foreground text-center mt-2">
            {isUrlMode ? 'Adding song...' : 'Uploading...'} {uploadProgress}%
          </p>
        </motion.div>
      )}
    </AnimatePresence>

    <Button
      onClick={onSubmit}
      disabled={isUploading || !canSubmit}
      className="w-full h-12 btn-premium mt-4"
    >
      {isUploading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {isUrlMode ? <Link className="w-5 h-5 mr-2" /> : <Upload className="w-5 h-5 mr-2" />}
          {isUrlMode ? 'Add Song from URL' : 'Upload Song'}
        </>
      )}
    </Button>
  </motion.div>
);

export default UploadMusic;

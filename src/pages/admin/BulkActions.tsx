import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Music, 
  Trash2, 
  Eye, 
  EyeOff, 
  Download, 
  CheckSquare, 
  Square,
  Search,
  AlertTriangle,
  Loader2,
  FileJson,
  FileSpreadsheet,
  Archive
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Song {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  genre: string | null;
  cover_url: string | null;
  is_visible: boolean;
  play_count: number;
  created_at: string;
}

const BulkActions = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'delete' | 'hide' | 'show' | null; count: number }>({ type: null, count: 0 });

  useEffect(() => {
    fetchSongs();
  }, []);

  const fetchSongs = async () => {
    const { data, error } = await supabase
      .from('songs')
      .select('id, title, artist, album, genre, cover_url, is_visible, play_count, created_at')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSongs(data);
    }
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredSongs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSongs.map(s => s.id)));
    }
  };

  const bulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);

    const { error } = await supabase
      .from('songs')
      .delete()
      .in('id', Array.from(selectedIds));

    if (error) {
      toast.error('Failed to delete songs');
    } else {
      toast.success(`Deleted ${selectedIds.size} songs`);
      setSelectedIds(new Set());
      fetchSongs();
    }
    
    setIsProcessing(false);
    setConfirmDialog({ type: null, count: 0 });
  };

  const bulkVisibility = async (visible: boolean) => {
    if (selectedIds.size === 0) return;
    setIsProcessing(true);

    const { error } = await supabase
      .from('songs')
      .update({ is_visible: visible })
      .in('id', Array.from(selectedIds));

    if (error) {
      toast.error('Failed to update visibility');
    } else {
      toast.success(`${visible ? 'Shown' : 'Hidden'} ${selectedIds.size} songs`);
      setSelectedIds(new Set());
      fetchSongs();
    }
    
    setIsProcessing(false);
    setConfirmDialog({ type: null, count: 0 });
  };

  const exportData = (format: 'json' | 'csv') => {
    const dataToExport = selectedIds.size > 0 
      ? songs.filter(s => selectedIds.has(s.id))
      : songs;

    if (format === 'json') {
      const json = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      downloadFile(blob, 'songs-export.json');
    } else {
      const headers = ['ID', 'Title', 'Artist', 'Album', 'Genre', 'Visible', 'Play Count', 'Created At'];
      const rows = dataToExport.map(s => [
        s.id, s.title, s.artist, s.album || '', s.genre || '', s.is_visible, s.play_count, s.created_at
      ]);
      const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      downloadFile(blob, 'songs-export.csv');
    }
    
    toast.success(`Exported ${dataToExport.length} songs as ${format.toUpperCase()}`);
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const filteredSongs = songs.filter(song =>
    song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCount = selectedIds.size;

  return (
    <div className="p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-display font-bold">Bulk Actions</h1>
        <p className="text-muted-foreground mt-1">Manage multiple songs at once</p>
      </motion.div>

      {/* Action Bar */}
      <motion.div
        className="glass rounded-xl p-4 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search songs..."
              className="pl-10 bg-muted/50 border-white/10"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ type: 'show', count: selectedCount })}
              disabled={selectedCount === 0 || isProcessing}
              className="gap-2"
            >
              <Eye className="w-4 h-4" />
              Show ({selectedCount})
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ type: 'hide', count: selectedCount })}
              disabled={selectedCount === 0 || isProcessing}
              className="gap-2"
            >
              <EyeOff className="w-4 h-4" />
              Hide ({selectedCount})
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmDialog({ type: 'delete', count: selectedCount })}
              disabled={selectedCount === 0 || isProcessing}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedCount})
            </Button>
          </div>
        </div>

        {/* Export Options */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
          <span className="text-sm text-muted-foreground self-center mr-2">Export:</span>
          <Button variant="ghost" size="sm" onClick={() => exportData('json')} className="gap-2">
            <FileJson className="w-4 h-4" />
            JSON
          </Button>
          <Button variant="ghost" size="sm" onClick={() => exportData('csv')} className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            CSV
          </Button>
          {selectedCount > 0 && (
            <span className="text-xs text-muted-foreground self-center ml-2">
              ({selectedCount} selected, or all if none selected)
            </span>
          )}
        </div>
      </motion.div>

      {/* Songs List */}
      <motion.div
        className="glass rounded-2xl overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {/* Header */}
        <div className="flex items-center gap-4 p-4 border-b border-white/5 bg-muted/30">
          <button
            onClick={selectAll}
            className="w-6 h-6 flex items-center justify-center"
          >
            {selectedIds.size === filteredSongs.length && filteredSongs.length > 0 ? (
              <CheckSquare className="w-5 h-5 text-primary" />
            ) : (
              <Square className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
          <span className="text-sm font-medium">
            {selectedCount > 0 ? `${selectedCount} selected` : `${filteredSongs.length} songs`}
          </span>
        </div>

        {/* Songs */}
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredSongs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No songs found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <AnimatePresence>
              {filteredSongs.map((song, index) => (
                <motion.div
                  key={song.id}
                  className={`flex items-center gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer ${
                    selectedIds.has(song.id) ? 'bg-primary/10' : ''
                  }`}
                  onClick={() => toggleSelect(song.id)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.01 }}
                >
                  <div className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                    {selectedIds.has(song.id) ? (
                      <CheckSquare className="w-5 h-5 text-primary" />
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {song.cover_url ? (
                      <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{song.title}</p>
                    <p className="text-sm text-muted-foreground truncate">{song.artist}</p>
                  </div>
                  <div className="hidden md:flex items-center gap-4">
                    <span className="text-xs text-muted-foreground">{song.genre || '-'}</span>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                      song.is_visible ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {song.is_visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </span>
                    <span className="text-xs text-muted-foreground w-16 text-right">
                      {song.play_count.toLocaleString()} plays
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Confirmation Dialog */}
      <Dialog open={confirmDialog.type !== null} onOpenChange={() => setConfirmDialog({ type: null, count: 0 })}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Confirm Action
            </DialogTitle>
            <DialogDescription>
              {confirmDialog.type === 'delete' && `Are you sure you want to delete ${confirmDialog.count} song(s)? This cannot be undone.`}
              {confirmDialog.type === 'hide' && `Are you sure you want to hide ${confirmDialog.count} song(s)?`}
              {confirmDialog.type === 'show' && `Are you sure you want to show ${confirmDialog.count} song(s)?`}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setConfirmDialog({ type: null, count: 0 })}
            >
              Cancel
            </Button>
            <Button
              className={`flex-1 ${confirmDialog.type === 'delete' ? 'bg-destructive hover:bg-destructive/90' : 'btn-premium'}`}
              onClick={() => {
                if (confirmDialog.type === 'delete') bulkDelete();
                else if (confirmDialog.type === 'hide') bulkVisibility(false);
                else if (confirmDialog.type === 'show') bulkVisibility(true);
              }}
              disabled={isProcessing}
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulkActions;

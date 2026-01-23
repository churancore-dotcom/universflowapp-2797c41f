import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  Music, 
  Eye, 
  EyeOff, 
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

interface Song {
  id: string;
  title: string;
  artist: string;
  cover_url: string | null;
  is_visible: boolean;
}

interface ScheduledAction {
  id: string;
  songId: string;
  songTitle: string;
  songArtist: string;
  action: 'show' | 'hide';
  scheduledFor: Date;
  executed: boolean;
}

const ContentScheduler = () => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [schedules, setSchedules] = useState<ScheduledAction[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedSong, setSelectedSong] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<'show' | 'hide'>('show');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSongs();
    loadSchedules();
    
    // Check scheduled actions every minute
    const interval = setInterval(checkScheduledActions, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchSongs = async () => {
    const { data } = await supabase
      .from('songs')
      .select('id, title, artist, cover_url, is_visible')
      .order('title');
    
    if (data) setSongs(data);
    setLoading(false);
  };

  const loadSchedules = () => {
    const saved = localStorage.getItem('scheduled_actions');
    if (saved) {
      const parsed = JSON.parse(saved).map((s: any) => ({
        ...s,
        scheduledFor: new Date(s.scheduledFor),
      }));
      setSchedules(parsed);
    }
  };

  const saveSchedules = (newSchedules: ScheduledAction[]) => {
    localStorage.setItem('scheduled_actions', JSON.stringify(newSchedules));
    setSchedules(newSchedules);
  };

  const checkScheduledActions = async () => {
    const now = new Date();
    let hasChanges = false;
    
    const updatedSchedules = await Promise.all(
      schedules.map(async (schedule) => {
        if (!schedule.executed && schedule.scheduledFor <= now) {
          // Execute the action
          const { error } = await supabase
            .from('songs')
            .update({ is_visible: schedule.action === 'show' })
            .eq('id', schedule.songId);
          
          if (!error) {
            toast.success(`Scheduled action executed: ${schedule.action === 'show' ? 'Shown' : 'Hidden'} "${schedule.songTitle}"`);
            hasChanges = true;
            return { ...schedule, executed: true };
          }
        }
        return schedule;
      })
    );
    
    if (hasChanges) {
      saveSchedules(updatedSchedules);
      fetchSongs();
    }
  };

  const addSchedule = () => {
    if (!selectedSong || !scheduledDate || !scheduledTime) {
      toast.error('Please fill in all fields');
      return;
    }

    const song = songs.find(s => s.id === selectedSong);
    if (!song) return;

    const scheduledFor = new Date(`${scheduledDate}T${scheduledTime}`);
    if (scheduledFor <= new Date()) {
      toast.error('Scheduled time must be in the future');
      return;
    }

    const newSchedule: ScheduledAction = {
      id: crypto.randomUUID(),
      songId: song.id,
      songTitle: song.title,
      songArtist: song.artist,
      action: selectedAction,
      scheduledFor,
      executed: false,
    };

    saveSchedules([...schedules, newSchedule]);
    toast.success('Action scheduled successfully');
    setShowDialog(false);
    resetForm();
  };

  const removeSchedule = (id: string) => {
    saveSchedules(schedules.filter(s => s.id !== id));
    toast.success('Schedule removed');
  };

  const resetForm = () => {
    setSelectedSong('');
    setSelectedAction('show');
    setScheduledDate('');
    setScheduledTime('');
  };

  const pendingSchedules = schedules.filter(s => !s.executed).sort((a, b) => a.scheduledFor.getTime() - b.scheduledFor.getTime());
  const completedSchedules = schedules.filter(s => s.executed).sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime());

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTimeUntil = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    
    if (diff < 0) return 'Past due';
    
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days}d ${hours % 24}h`;
    }
    if (hours > 0) return `in ${hours}h ${mins}m`;
    return `in ${mins}m`;
  };

  return (
    <div className="p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">Content Scheduler</h1>
          <p className="text-muted-foreground mt-1">Schedule song visibility changes</p>
        </div>
        <Button onClick={() => setShowDialog(true)} className="gap-2 btn-premium">
          <Plus className="w-4 h-4" />
          Schedule Action
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <motion.div
          className="glass rounded-xl p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingSchedules.length}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
          </div>
        </motion.div>
        <motion.div
          className="glass rounded-xl p-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedSchedules.length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Pending Schedules */}
      <motion.div
        className="glass rounded-2xl overflow-hidden mb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="font-bold">Pending Schedules</h2>
        </div>
        
        {pendingSchedules.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No pending schedules</p>
            <p className="text-sm mt-1">Schedule visibility changes for your songs</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            <AnimatePresence>
              {pendingSchedules.map((schedule, index) => (
                <motion.div
                  key={schedule.id}
                  className="flex items-center gap-4 p-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    schedule.action === 'show' ? 'bg-green-500/20' : 'bg-yellow-500/20'
                  }`}>
                    {schedule.action === 'show' ? (
                      <Eye className="w-5 h-5 text-green-500" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{schedule.songTitle}</p>
                    <p className="text-sm text-muted-foreground truncate">{schedule.songArtist}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-medium">{formatDate(schedule.scheduledFor)}</p>
                    <p className="text-xs text-primary">{getTimeUntil(schedule.scheduledFor)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeSchedule(schedule.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>

      {/* Completed Schedules */}
      {completedSchedules.length > 0 && (
        <motion.div
          className="glass rounded-2xl overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="p-4 border-b border-white/5 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <h2 className="font-bold">Completed</h2>
          </div>
          <div className="divide-y divide-white/5 max-h-64 overflow-y-auto">
            {completedSchedules.slice(0, 10).map((schedule) => (
              <div key={schedule.id} className="flex items-center gap-4 p-4 opacity-60">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  schedule.action === 'show' ? 'bg-green-500/20' : 'bg-yellow-500/20'
                }`}>
                  {schedule.action === 'show' ? (
                    <Eye className="w-5 h-5 text-green-500" />
                  ) : (
                    <EyeOff className="w-5 h-5 text-yellow-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{schedule.songTitle}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(schedule.scheduledFor)}</p>
                </div>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Schedule Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="glass border-white/10">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Schedule Action
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Select Song</label>
              <Select value={selectedSong} onValueChange={setSelectedSong}>
                <SelectTrigger className="bg-muted/50 border-white/10">
                  <SelectValue placeholder="Choose a song..." />
                </SelectTrigger>
                <SelectContent>
                  {songs.map(song => (
                    <SelectItem key={song.id} value={song.id}>
                      <div className="flex items-center gap-2">
                        <Music className="w-4 h-4" />
                        {song.title} - {song.artist}
                        {song.is_visible ? (
                          <Eye className="w-3 h-3 text-green-500 ml-1" />
                        ) : (
                          <EyeOff className="w-3 h-3 text-yellow-500 ml-1" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Action</label>
              <Select value={selectedAction} onValueChange={(v: 'show' | 'hide') => setSelectedAction(v)}>
                <SelectTrigger className="bg-muted/50 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="show">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-green-500" />
                      Show Song
                    </div>
                  </SelectItem>
                  <SelectItem value="hide">
                    <div className="flex items-center gap-2">
                      <EyeOff className="w-4 h-4 text-yellow-500" />
                      Hide Song
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Date</label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  className="bg-muted/50 border-white/10"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Time</label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="bg-muted/50 border-white/10"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={addSchedule} className="flex-1 btn-premium">
                <Save className="w-4 h-4 mr-2" />
                Schedule
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContentScheduler;

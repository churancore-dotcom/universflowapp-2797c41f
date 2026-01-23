import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Upload, 
  Trash2, 
  Edit2, 
  Eye, 
  EyeOff, 
  UserPlus, 
  Music, 
  Clock,
  Filter,
  Search,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface ActivityLog {
  id: string;
  action: string;
  entity_type: string;
  entity_name: string;
  created_at: string;
  details?: string;
}

// Generate mock activity from real data changes
const ActivityLogs = () => {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    
    // Fetch recent songs as "uploads"
    const { data: recentSongs } = await supabase
      .from('songs')
      .select('id, title, artist, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(20);

    // Fetch recent playlists
    const { data: recentPlaylists } = await supabase
      .from('playlists')
      .select('id, title, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch recent users
    const { data: recentUsers } = await supabase
      .from('profiles')
      .select('id, email, username, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    const logs: ActivityLog[] = [];

    // Add song activities
    recentSongs?.forEach(song => {
      logs.push({
        id: `song-create-${song.id}`,
        action: 'upload',
        entity_type: 'song',
        entity_name: `${song.title} by ${song.artist}`,
        created_at: song.created_at,
      });
      
      if (song.updated_at !== song.created_at) {
        logs.push({
          id: `song-edit-${song.id}`,
          action: 'edit',
          entity_type: 'song',
          entity_name: `${song.title} by ${song.artist}`,
          created_at: song.updated_at,
        });
      }
    });

    // Add playlist activities
    recentPlaylists?.forEach(playlist => {
      logs.push({
        id: `playlist-create-${playlist.id}`,
        action: 'create',
        entity_type: 'playlist',
        entity_name: playlist.title,
        created_at: playlist.created_at,
      });
    });

    // Add user activities
    recentUsers?.forEach(user => {
      logs.push({
        id: `user-join-${user.id}`,
        action: 'user_joined',
        entity_type: 'user',
        entity_name: user.username || user.email || 'Unknown User',
        created_at: user.created_at,
      });
    });

    // Sort by date
    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setActivities(logs);
    setLoading(false);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'upload': return <Upload className="w-4 h-4" />;
      case 'edit': return <Edit2 className="w-4 h-4" />;
      case 'delete': return <Trash2 className="w-4 h-4" />;
      case 'show': return <Eye className="w-4 h-4" />;
      case 'hide': return <EyeOff className="w-4 h-4" />;
      case 'user_joined': return <UserPlus className="w-4 h-4" />;
      case 'create': return <Music className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'upload': return 'from-green-500 to-emerald-400';
      case 'edit': return 'from-blue-500 to-cyan-400';
      case 'delete': return 'from-red-500 to-rose-400';
      case 'show': return 'from-primary to-cyan-400';
      case 'hide': return 'from-yellow-500 to-amber-400';
      case 'user_joined': return 'from-purple-500 to-violet-400';
      case 'create': return 'from-accent to-pink-400';
      default: return 'from-muted-foreground to-muted';
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'upload': return 'Uploaded';
      case 'edit': return 'Edited';
      case 'delete': return 'Deleted';
      case 'show': return 'Made visible';
      case 'hide': return 'Hidden';
      case 'user_joined': return 'New user';
      case 'create': return 'Created';
      default: return action;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.entity_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || activity.entity_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    today: activities.filter(a => {
      const date = new Date(a.created_at);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    }).length,
    thisWeek: activities.filter(a => {
      const date = new Date(a.created_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    }).length,
    uploads: activities.filter(a => a.action === 'upload').length,
    users: activities.filter(a => a.action === 'user_joined').length,
  };

  return (
    <div className="p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-display font-bold">Activity Logs</h1>
        <p className="text-muted-foreground mt-1">Track all platform activities and changes</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Today', value: stats.today, icon: Clock, color: 'from-primary to-cyan-400' },
          { label: 'This Week', value: stats.thisWeek, icon: Activity, color: 'from-accent to-pink-400' },
          { label: 'Uploads', value: stats.uploads, icon: Upload, color: 'from-green-500 to-emerald-400' },
          { label: 'New Users', value: stats.users, icon: UserPlus, color: 'from-purple-500 to-violet-400' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              className="glass rounded-xl p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Filters */}
      <motion.div
        className="flex flex-col sm:flex-row gap-4 mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activities..."
            className="pl-10 bg-muted/50 border-white/10"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-40 bg-muted/50 border-white/10">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="song">Songs</SelectItem>
            <SelectItem value="playlist">Playlists</SelectItem>
            <SelectItem value="user">Users</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={fetchActivities} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </motion.div>

      {/* Activity List */}
      <motion.div
        className="glass rounded-2xl overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No activities found</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            <AnimatePresence>
              {filteredActivities.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.02 }}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getActionColor(activity.action)} flex items-center justify-center flex-shrink-0`}>
                    {getActionIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                        {activity.entity_type}
                      </span>
                      <span className="text-sm font-medium text-primary">
                        {getActionLabel(activity.action)}
                      </span>
                    </div>
                    <p className="font-medium truncate mt-1">{activity.entity_name}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm text-muted-foreground">{formatTimeAgo(activity.created_at)}</p>
                    <p className="text-xs text-muted-foreground/60">
                      {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ActivityLogs;

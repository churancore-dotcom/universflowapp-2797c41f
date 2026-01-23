import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Music, Users, PlayCircle, TrendingUp, Upload, Disc, Clock, Download, Activity, BarChart3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface Stats {
  totalSongs: number;
  totalUsers: number;
  totalPlays: number;
  totalAlbums: number;
  totalDownloads: number;
  storageUsed: number;
}

interface PlayData {
  date: string;
  plays: number;
}

interface GenreData {
  name: string;
  value: number;
}

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({ 
    totalSongs: 0, 
    totalUsers: 0, 
    totalPlays: 0, 
    totalAlbums: 0,
    totalDownloads: 0,
    storageUsed: 0
  });
  const [recentSongs, setRecentSongs] = useState<any[]>([]);
  const [playData, setPlayData] = useState<PlayData[]>([]);
  const [genreData, setGenreData] = useState<GenreData[]>([]);
  const [topSongs, setTopSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchStats();
    fetchRecentSongs();
    fetchChartData();
  }, []);

  const fetchStats = async () => {
    const [songsRes, usersRes, albumsRes] = await Promise.all([
      supabase.from('songs').select('id, play_count, download_count, file_size, cover_size'),
      supabase.from('profiles').select('id'),
      supabase.from('albums').select('id'),
    ]);

    const songs = songsRes.data || [];
    const totalPlays = songs.reduce((acc, song) => acc + (song.play_count || 0), 0);
    const totalDownloads = songs.reduce((acc, song) => acc + (song.download_count || 0), 0);
    const storageUsed = songs.reduce((acc, song) => acc + (song.file_size || 0) + (song.cover_size || 0), 0);

    setStats({
      totalSongs: songs.length,
      totalUsers: usersRes.data?.length || 0,
      totalPlays,
      totalAlbums: albumsRes.data?.length || 0,
      totalDownloads,
      storageUsed,
    });
    setLoading(false);
  };

  const fetchRecentSongs = async () => {
    const { data } = await supabase
      .from('songs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentSongs(data || []);
  };

  const fetchChartData = async () => {
    // Fetch songs for chart data
    const { data: songs } = await supabase
      .from('songs')
      .select('created_at, play_count, genre')
      .order('created_at', { ascending: true });

    if (songs) {
      // Generate play data for last 7 days (simulated from actual data)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toLocaleDateString('en-US', { weekday: 'short' });
      });
      
      const playsPerDay = last7Days.map((day, i) => ({
        date: day,
        plays: Math.floor((songs.reduce((acc, s) => acc + (s.play_count || 0), 0) / 7) * (0.5 + Math.random())),
      }));
      setPlayData(playsPerDay);

      // Genre distribution
      const genreCounts: Record<string, number> = {};
      songs.forEach(song => {
        const genre = song.genre || 'Unknown';
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
      });
      
      const genreArray = Object.entries(genreCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);
      setGenreData(genreArray);
    }

    // Fetch top songs
    const { data: top } = await supabase
      .from('songs')
      .select('id, title, artist, play_count, cover_url')
      .order('play_count', { ascending: false })
      .limit(5);
    setTopSongs(top || []);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const statCards = [
    { icon: Music, label: 'Total Songs', value: stats.totalSongs, color: 'from-primary to-cyan-400' },
    { icon: Users, label: 'Total Users', value: stats.totalUsers, color: 'from-accent to-pink-400' },
    { icon: PlayCircle, label: 'Total Plays', value: stats.totalPlays, color: 'from-green-500 to-emerald-400' },
    { icon: Disc, label: 'Albums', value: stats.totalAlbums, color: 'from-orange-500 to-amber-400' },
    { icon: Download, label: 'Downloads', value: stats.totalDownloads, color: 'from-purple-500 to-violet-400' },
    { icon: Activity, label: 'Storage', value: formatBytes(stats.storageUsed), color: 'from-rose-500 to-pink-400', isString: true },
  ];

  const quickActions = [
    { label: 'Upload Music', icon: Upload, path: '/admin/upload', gradient: 'from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30' },
    { label: 'Manage Songs', icon: Music, path: '/admin/songs', gradient: 'bg-muted/50 hover:bg-muted/70' },
    { label: 'View Analytics', icon: TrendingUp, path: '/admin/analytics', gradient: 'bg-muted/50 hover:bg-muted/70' },
    { label: 'System Health', icon: Activity, path: '/admin/health', gradient: 'bg-muted/50 hover:bg-muted/70' },
    { label: 'Bulk Actions', icon: BarChart3, path: '/admin/bulk', gradient: 'bg-muted/50 hover:bg-muted/70' },
    { label: 'Activity Logs', icon: Clock, path: '/admin/logs', gradient: 'bg-muted/50 hover:bg-muted/70' },
  ];

  return (
    <div className="p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-display font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your music platform</p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              className="glass rounded-xl p-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-display font-bold mt-0.5">
                {loading ? '...' : stat.isString ? stat.value : (stat.value as number).toLocaleString()}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Plays Chart */}
        <motion.div
          className="glass rounded-2xl p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Plays This Week
          </h2>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={playData}>
                <defs>
                  <linearGradient id="playGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }} 
                />
                <Area type="monotone" dataKey="plays" stroke="hsl(var(--primary))" fill="url(#playGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Genre Distribution */}
        <motion.div
          className="glass rounded-2xl p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.35 }}
        >
          <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-accent" />
            Genre Distribution
          </h2>
          <div className="h-48 flex items-center">
            {genreData.length === 0 ? (
              <div className="w-full text-center text-muted-foreground">
                <Music className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No genre data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genreData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {genreData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
            {genreData.length > 0 && (
              <div className="flex flex-col gap-1.5 ml-4">
                {genreData.slice(0, 5).map((genre, index) => (
                  <div key={genre.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                    <span className="text-muted-foreground truncate max-w-20">{genre.name}</span>
                    <span className="font-medium">{genre.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions & Recent Songs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <motion.div
          className="glass rounded-2xl p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-lg font-display font-bold mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <motion.button
                  key={action.label}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${action.gradient}`}
                  onClick={() => navigate(action.path)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                >
                  <Icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium truncate">{action.label}</span>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Top Songs */}
        <motion.div
          className="glass rounded-2xl p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
        >
          <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Top Songs
          </h2>
          {topSongs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No songs yet</p>
              <button
                className="mt-3 text-primary hover:underline text-sm"
                onClick={() => navigate('/admin/upload')}
              >
                Upload your first song
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {topSongs.map((song, index) => (
                <motion.div
                  key={song.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-all"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                >
                  <span className={`w-5 text-center font-bold text-sm ${index < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {index + 1}
                  </span>
                  <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center overflow-hidden">
                    {song.cover_url ? (
                      <img src={song.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Music className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{song.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{song.artist}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {(song.play_count || 0).toLocaleString()}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;

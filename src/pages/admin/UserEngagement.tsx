import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Clock, Play, Heart, MessageSquare, TrendingUp, Activity, Calendar, Zap, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface EngagementData {
  day: string;
  activeUsers: number;
  sessions: number;
  avgDuration: number;
}

interface Insight {
  label: string;
  value: number;
  delta: number; // % vs previous period
  icon: React.ElementType;
  color: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_GAP_MIN = 30; // a gap > 30min ends a session

const UserEngagement = () => {
  const [totalUsers, setTotalUsers] = useState(0);
  const [dailyActive, setDailyActive] = useState(0);
  const [weeklyActive, setWeeklyActive] = useState(0);
  const [avgSessionTime, setAvgSessionTime] = useState('0m');
  const [engagementData, setEngagementData] = useState<EngagementData[]>([]);
  const [topFeatures, setTopFeatures] = useState<{ name: string; usage: number }[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEngagementData = useCallback(async () => {
    setLoading(true);
    try {
      const now = Date.now();
      const sevenDaysAgo = new Date(now - 7 * DAY_MS).toISOString();
      const fourteenDaysAgo = new Date(now - 14 * DAY_MS).toISOString();
      const yesterday = new Date(now - DAY_MS).toISOString();
      const twoDaysAgo = new Date(now - 2 * DAY_MS).toISOString();

      const [
        { count: profileCount },
        { data: recentPlays14 },
        { count: librarySize },
        { count: playlistCount },
        { count: songRequestCount },
        { count: donationCount },
        { count: reportCount },
        { count: likesToday },
        { count: likesYesterday },
        { count: playsToday },
        { count: playsYesterday },
        { count: commentsToday },
        { count: commentsYesterday },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('recently_played').select('user_id, played_at').gte('played_at', fourteenDaysAgo),
        supabase.from('user_library').select('*', { count: 'exact', head: true }),
        supabase.from('playlists').select('*', { count: 'exact', head: true }),
        supabase.from('song_requests').select('*', { count: 'exact', head: true }),
        supabase.from('donations').select('*', { count: 'exact', head: true }),
        supabase.from('content_reports').select('*', { count: 'exact', head: true }),
        supabase.from('user_library').select('*', { count: 'exact', head: true }).gte('added_at', yesterday),
        supabase.from('user_library').select('*', { count: 'exact', head: true })
          .gte('added_at', twoDaysAgo).lt('added_at', yesterday),
        supabase.from('recently_played').select('*', { count: 'exact', head: true }).gte('played_at', yesterday),
        supabase.from('recently_played').select('*', { count: 'exact', head: true })
          .gte('played_at', twoDaysAgo).lt('played_at', yesterday),
        supabase.from('app_reviews').select('*', { count: 'exact', head: true }).gte('created_at', yesterday),
        supabase.from('app_reviews').select('*', { count: 'exact', head: true })
          .gte('created_at', twoDaysAgo).lt('created_at', yesterday),
      ]);

      setTotalUsers(profileCount || 0);

      const plays = recentPlays14 || [];
      const last7 = plays.filter(p => new Date(p.played_at).getTime() >= now - 7 * DAY_MS);

      // Daily / weekly active
      const dailySet = new Set(plays.filter(p => now - new Date(p.played_at).getTime() < DAY_MS).map(p => p.user_id));
      const weeklySet = new Set(last7.map(p => p.user_id));
      setDailyActive(dailySet.size);
      setWeeklyActive(weeklySet.size);

      // 7-day engagement series (real)
      const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const series: EngagementData[] = Array.from({ length: 7 }, (_, i) => {
        const start = now - (6 - i) * DAY_MS;
        const end = start + DAY_MS;
        const dayPlays = last7.filter(p => {
          const t = new Date(p.played_at).getTime();
          return t >= start && t < end;
        });
        const uniqueUsers = new Set(dayPlays.map(p => p.user_id)).size;

        // Sessions: per user, count gaps > SESSION_GAP_MIN as new session
        const byUser: Record<string, number[]> = {};
        for (const p of dayPlays) {
          (byUser[p.user_id] ||= []).push(new Date(p.played_at).getTime());
        }
        let sessions = 0;
        let totalSessionMin = 0;
        for (const times of Object.values(byUser)) {
          times.sort((a, b) => a - b);
          let sessionStart = times[0];
          let lastT = times[0];
          sessions++;
          for (let k = 1; k < times.length; k++) {
            if (times[k] - lastT > SESSION_GAP_MIN * 60_000) {
              totalSessionMin += Math.max(2, (lastT - sessionStart) / 60_000);
              sessions++;
              sessionStart = times[k];
            }
            lastT = times[k];
          }
          totalSessionMin += Math.max(2, (lastT - sessionStart) / 60_000);
        }
        const avgDuration = sessions ? Math.round(totalSessionMin / sessions) : 0;

        return {
          day: dayLabels[new Date(start).getDay()],
          activeUsers: uniqueUsers,
          sessions,
          avgDuration,
        };
      });
      setEngagementData(series);

      // Avg session time across the week
      const totalSessions = series.reduce((s, d) => s + d.sessions, 0);
      const weightedAvg = totalSessions
        ? Math.round(series.reduce((s, d) => s + d.avgDuration * d.sessions, 0) / totalSessions)
        : 0;
      setAvgSessionTime(weightedAvg ? `${Math.floor(weightedAvg / 60) ? `${Math.floor(weightedAvg / 60)}h ` : ''}${weightedAvg % 60}m` : '0m');

      // Feature usage = relative scale across the platform
      const max = Math.max(plays.length, librarySize || 0, playlistCount || 0, songRequestCount || 0, donationCount || 0, reportCount || 0, 1);
      setTopFeatures([
        { name: 'Music Playback', usage: Math.round((plays.length / max) * 100) },
        { name: 'Library / Likes', usage: Math.round(((librarySize || 0) / max) * 100) },
        { name: 'Playlists', usage: Math.round(((playlistCount || 0) / max) * 100) },
        { name: 'Song Requests', usage: Math.round(((songRequestCount || 0) / max) * 100) },
        { name: 'Donations', usage: Math.round(((donationCount || 0) / max) * 100) },
        { name: 'Content Reports', usage: Math.round(((reportCount || 0) / max) * 100) },
      ]);

      const pctDelta = (today: number, prev: number) =>
        prev === 0 ? (today > 0 ? 100 : 0) : Math.round(((today - prev) / prev) * 100);

      setInsights([
        { label: 'Likes Today', value: likesToday || 0, delta: pctDelta(likesToday || 0, likesYesterday || 0), icon: Heart, color: 'text-rose-500' },
        { label: 'Reviews Today', value: commentsToday || 0, delta: pctDelta(commentsToday || 0, commentsYesterday || 0), icon: MessageSquare, color: 'text-blue-500' },
        { label: 'Plays Today', value: playsToday || 0, delta: pctDelta(playsToday || 0, playsYesterday || 0), icon: Play, color: 'text-primary' },
      ]);
    } catch (error) {
      console.error('Error fetching engagement data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEngagementData();
    const ch = supabase
      .channel('engagement_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'recently_played' }, () => fetchEngagementData())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchEngagementData]);

  const stats = [
    { label: 'Total Users', value: totalUsers.toLocaleString(), icon: Users, color: 'from-primary to-cyan-400' },
    { label: 'Daily Active', value: dailyActive.toLocaleString(), icon: Activity, color: 'from-green-500 to-emerald-400' },
    { label: 'Weekly Active', value: weeklyActive.toLocaleString(), icon: Calendar, color: 'from-accent to-pink-400' },
    { label: 'Avg Session', value: avgSessionTime, icon: Clock, color: 'from-orange-500 to-amber-400' },
  ];

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
            <Zap className="w-8 h-8 text-primary" />
            User Engagement
          </h1>
          <p className="text-muted-foreground mt-1">Real-time activity computed from your database.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchEngagementData} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div key={stat.label} className="glass rounded-xl p-4"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-xl font-display font-bold mt-0.5">{loading ? '…' : stat.value}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <motion.div className="glass rounded-2xl p-6" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" /> Daily Active Users (last 7 days)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={engagementData}>
                <defs>
                  <linearGradient id="userGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="activeUsers" stroke="hsl(var(--primary))" fill="url(#userGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div className="glass rounded-2xl p-6" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.25 }}>
          <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" /> Avg Session Duration (min)
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" opacity={0.3} />
                <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                  formatter={(value: number) => [`${value} min`, 'Duration']} />
                <Bar dataKey="avgDuration" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <motion.div className="glass rounded-2xl p-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h2 className="text-lg font-display font-bold mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" /> Feature Usage (relative volume)
        </h2>
        <div className="space-y-4">
          {topFeatures.map((feature, index) => (
            <div key={feature.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">{feature.name}</span>
                <span className="text-sm text-muted-foreground">{feature.usage}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <motion.div className="h-full bg-gradient-to-r from-primary to-accent rounded-full"
                  initial={{ width: 0 }} animate={{ width: `${feature.usage}%` }}
                  transition={{ delay: 0.4 + index * 0.1, duration: 0.5 }} />
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      <motion.div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
        {insights.map((ins) => {
          const Icon = ins.icon;
          const positive = ins.delta >= 0;
          return (
            <div key={ins.label} className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 ${ins.color}`} />
                <span className="font-medium">{ins.label}</span>
              </div>
              <p className="text-2xl font-bold">{ins.value.toLocaleString()}</p>
              <p className={`text-xs ${positive ? 'text-green-400' : 'text-red-400'}`}>
                {positive ? '+' : ''}{ins.delta}% vs yesterday
              </p>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default UserEngagement;

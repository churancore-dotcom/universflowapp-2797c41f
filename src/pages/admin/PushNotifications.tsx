import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Send, Users, Clock, Target, BarChart3, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Audience = 'all' | 'premium' | 'free';
type NotifType = 'info' | 'success' | 'warning';

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: NotifType;
  target_audience: Audience;
  is_active: boolean;
  starts_at: string;
  ends_at: string | null;
  created_at: string;
}

const audienceLabels: Record<Audience, string> = {
  all: 'All Users',
  premium: 'Premium Only',
  free: 'Free Users',
};

interface KPI { delivered: number; opened: number; clicked: number; }

const PushNotifications = () => {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCompose, setShowCompose] = useState(false);
  const [reach, setReach] = useState({ all: 0, premium: 0, free: 0 });
  const [kpi, setKpi] = useState<Record<string, KPI>>({});
  const [draft, setDraft] = useState({
    title: '', message: '', target_audience: 'all' as Audience, type: 'info' as NotifType,
  });

  const fetchKPIs = useCallback(async () => {
    const { data } = await supabase.from('announcement_events').select('announcement_id, event_type');
    const map: Record<string, KPI> = {};
    (data || []).forEach((row: any) => {
      const k = map[row.announcement_id] ||= { delivered: 0, opened: 0, clicked: 0 };
      if (row.event_type === 'delivered') k.delivered++;
      else if (row.event_type === 'opened') k.opened++;
      else if (row.event_type === 'clicked') k.clicked++;
    });
    setKpi(map);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [annRes, profilesRes, premiumRes] = await Promise.all([
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('user_subscriptions').select('user_id, status, subscription_type, expires_at')
        .neq('subscription_type', 'free').eq('status', 'active'),
    ]);
    if (annRes.error) toast.error('Failed to load notifications');
    setItems((annRes.data ?? []) as Announcement[]);

    const totalUsers = profilesRes.count ?? 0;
    const premiumActive = (premiumRes.data ?? []).filter(s =>
      !s.expires_at || new Date(s.expires_at) > new Date()
    ).length;
    setReach({
      all: totalUsers, premium: premiumActive,
      free: Math.max(totalUsers - premiumActive, 0),
    });
    await fetchKPIs();
    setLoading(false);
  }, [fetchKPIs]);

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel('announcements_admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, fetchAll)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcement_events' }, fetchKPIs)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll, fetchKPIs]);

  const send = async () => {
    if (!draft.title.trim() || !draft.message.trim()) {
      toast.error('Title and message are required');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('announcements').insert({
      title: draft.title.trim(),
      message: draft.message.trim(),
      type: draft.type,
      target_audience: draft.target_audience,
      is_active: true,
    });
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Sent to ${reach[draft.target_audience].toLocaleString()} users`);
    setDraft({ title: '', message: '', target_audience: 'all', type: 'info' });
    setShowCompose(false);
  };

  const toggleActive = async (n: Announcement) => {
    const { error } = await supabase.from('announcements')
      .update({ is_active: !n.is_active }).eq('id', n.id);
    if (error) toast.error(error.message);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this notification?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) toast.error(error.message); else toast.success('Deleted');
  };

  const totalReach = items
    .filter(n => n.is_active)
    .reduce((sum, n) => sum + (reach[n.target_audience] ?? 0), 0);

  const stats = [
    { label: 'Total Notifications', value: items.length.toLocaleString(), icon: Send },
    { label: 'Active Now', value: items.filter(n => n.is_active).length.toLocaleString(), icon: Target },
    { label: 'Cumulative Reach', value: totalReach.toLocaleString(), icon: BarChart3 },
    { label: 'Total Users', value: reach.all.toLocaleString(), icon: Users },
  ];

  return (
    <div className="p-4 md:p-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
              <Bell className="w-8 h-8 text-primary" />
              Notifications
            </h1>
            <p className="text-muted-foreground mt-1">
              In-app announcements delivered to targeted users in real time.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setShowCompose(true)} className="gap-2">
              <Plus className="w-4 h-4" /> New
            </Button>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} className="glass rounded-xl p-4"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <stat.icon className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="text-xl font-bold">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {showCompose && (
          <motion.div className="glass rounded-2xl p-6 mb-8"
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Send className="w-5 h-5 text-primary" /> Compose
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Title</label>
                <Input placeholder="Notification title" value={draft.title}
                  onChange={(e) => setDraft(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Message</label>
                <Textarea placeholder="Notification message" rows={3} value={draft.message}
                  onChange={(e) => setDraft(p => ({ ...p, message: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Audience</label>
                <div className="flex gap-2 flex-wrap">
                  {(Object.keys(audienceLabels) as Audience[]).map((key) => (
                    <button key={key} onClick={() => setDraft(p => ({ ...p, target_audience: key }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        draft.target_audience === key ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                      }`}>
                      {audienceLabels[key]} <span className="opacity-60">({reach[key].toLocaleString()})</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Style</label>
                <div className="flex gap-2 flex-wrap">
                  {(['info', 'success', 'warning'] as NotifType[]).map(t => (
                    <button key={t} onClick={() => setDraft(p => ({ ...p, type: t }))}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        draft.type === t ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                      }`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowCompose(false)} className="flex-1">Cancel</Button>
                <Button onClick={send} disabled={saving} className="flex-1 gap-2">
                  <Send className="w-4 h-4" /> {saving ? 'Sending…' : 'Send Now'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div>
        <h2 className="text-xl font-bold mb-4">History</h2>
        <div className="space-y-4">
          {loading ? (
            <p className="text-center text-muted-foreground py-12">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No notifications yet.</p>
          ) : items.map((n, index) => (
            <motion.div key={n.id} className="glass rounded-2xl p-5"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(index * 0.03, 0.3) }}>
              <div className="flex items-start justify-between mb-3 gap-3">
                <div className="min-w-0">
                  <h3 className="font-bold text-lg">{n.title}</h3>
                  <p className="text-muted-foreground text-sm mt-1">{n.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    n.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground'
                  }`}>
                    {n.is_active ? 'Active' : 'Disabled'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(n)}>
                    {n.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(n.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs flex-wrap mb-2">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="w-3.5 h-3.5" /> {audienceLabels[n.target_audience as Audience] ?? n.target_audience}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Send className="w-3.5 h-3.5" /> Reach ~{(reach[n.target_audience as Audience] ?? 0).toLocaleString()}
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" /> {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
              {/* Live KPIs */}
              <div className="grid grid-cols-3 gap-2 mt-2 pt-3 border-t border-border/40">
                {(['delivered','opened','clicked'] as const).map(k => {
                  const v = kpi[n.id]?.[k] ?? 0;
                  const denom = k === 'delivered' ? Math.max(reach[n.target_audience as Audience] ?? 0, 1) : Math.max(kpi[n.id]?.delivered ?? 0, 1);
                  const pct = Math.min(100, Math.round((v / denom) * 100));
                  const colors = { delivered: 'hsl(195 100% 55%)', opened: 'hsl(145 80% 50%)', clicked: 'hsl(var(--primary))' } as const;
                  return (
                    <div key={k} className="rounded-lg p-2 bg-muted/30">
                      <p className="text-[10px] uppercase text-muted-foreground tracking-wide">{k}</p>
                      <p className="text-lg font-bold" style={{ color: colors[k] }}>{v.toLocaleString()}</p>
                      <p className="text-[10px] text-muted-foreground">{pct}%</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PushNotifications;

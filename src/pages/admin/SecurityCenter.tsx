import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Shield, AlertTriangle, CheckCircle2, XCircle, RefreshCw,
  LogIn, LogOut, KeyRound, Activity, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AuditLog {
  id: string;
  event_type: string;
  severity: string;
  user_id: string | null;
  user_email: string | null;
  ip_address: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

const eventIcon = (type: string) => {
  if (type.includes('login_success')) return LogIn;
  if (type.includes('login_failed')) return XCircle;
  if (type.includes('logout')) return LogOut;
  if (type.includes('password')) return KeyRound;
  if (type.includes('suspicious')) return AlertTriangle;
  if (type.includes('admin')) return Shield;
  if (type.includes('subscription')) return Clock;
  return Activity;
};

const severityColor = (sev: string) => {
  switch (sev) {
    case 'critical': return 'text-red-500 bg-red-500/10';
    case 'error': return 'text-red-400 bg-red-500/10';
    case 'warn': return 'text-yellow-400 bg-yellow-500/10';
    default: return 'text-emerald-400 bg-emerald-500/10';
  }
};

const formatTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
};

const SecurityCenter = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [score, setScore] = useState(95);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      toast.error('Failed to load audit logs');
      setLoading(false);
      return;
    }
    setLogs((data ?? []) as AuditLog[]);

    const dayAgo = Date.now() - 24 * 3600 * 1000;
    const recent = (data ?? []).filter(l => new Date(l.created_at).getTime() > dayAgo);
    const failed = recent.filter(l => l.event_type === 'login_failed').length;
    const suspicious = recent.filter(l => l.severity === 'warn' || l.severity === 'error' || l.severity === 'critical').length;
    setScore(Math.max(40, 100 - failed * 2 - suspicious * 5));
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLogs();
    const channel = supabase
      .channel('audit_logs_live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' },
        (payload) => {
          setLogs(prev => [payload.new as AuditLog, ...prev].slice(0, 200));
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLogs]);

  const filtered = logs.filter(l => {
    if (severityFilter !== 'all' && l.severity !== severityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return l.event_type.toLowerCase().includes(q) ||
             (l.user_email ?? '').toLowerCase().includes(q);
    }
    return true;
  });

  const stats = {
    total: logs.length,
    failed: logs.filter(l => l.event_type === 'login_failed').length,
    suspicious: logs.filter(l => l.severity === 'warn' || l.severity === 'error').length,
    last24h: logs.filter(l => Date.now() - new Date(l.created_at).getTime() < 86400000).length,
  };

  return (
    <div className="p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Security Center
          </h1>
          <p className="text-muted-foreground mt-1">Real-time audit logs and security events</p>
        </div>
        <Button onClick={fetchLogs} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </motion.div>

      <motion.div
        className="glass rounded-2xl p-6 mb-6 flex items-center justify-between"
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      >
        <div>
          <p className="text-sm text-muted-foreground">Security Score</p>
          <p className="text-4xl font-bold mt-1">{score}/100</p>
        </div>
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${score >= 80 ? 'bg-emerald-500/20' : score >= 60 ? 'bg-yellow-500/20' : 'bg-red-500/20'}`}>
          {score >= 80 ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> :
            <AlertTriangle className="w-8 h-8 text-yellow-400" />}
        </div>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Events', value: stats.total, icon: Activity },
          { label: 'Failed Logins', value: stats.failed, icon: XCircle },
          { label: 'Suspicious', value: stats.suspicious, icon: AlertTriangle },
          { label: 'Last 24h', value: stats.last24h, icon: Clock },
        ].map((s, i) => (
          <motion.div key={s.label} className="glass rounded-xl p-4"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}>
            <s.icon className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        <Input placeholder="Search events / emails…" value={search}
          onChange={e => setSearch(e.target.value)} className="flex-1" />
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="info">Info</SelectItem>
            <SelectItem value="warn">Warning</SelectItem>
            <SelectItem value="error">Error</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No events yet. Login activity and admin actions will appear here in real-time.
          </div>
        ) : filtered.map((log, i) => {
          const Icon = eventIcon(log.event_type);
          return (
            <motion.div key={log.id}
              className="glass rounded-xl p-4 flex items-center gap-4"
              initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.4) }}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${severityColor(log.severity)}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium capitalize">{log.event_type.replace(/_/g, ' ')}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {log.user_email ?? 'system'} · {formatTimeAgo(log.created_at)}
                  {log.ip_address && ` · ${log.ip_address}`}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${severityColor(log.severity)}`}>
                {log.severity}
              </span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SecurityCenter;

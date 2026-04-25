import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Key, Copy, Plus, Trash2, Shield, CheckCircle2, Clock, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  is_active: boolean;
  last_used_at: string | null;
  usage_count: number;
  expires_at: string | null;
  created_at: string;
}

// Generate a secure random key client-side, hash with SubtleCrypto, then store hash only.
async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function generateKey(): string {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  const body = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  return `uf_live_${body}`;
}

const APIManagement = () => {
  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('api_keys').select('*').order('created_at', { ascending: false });
    if (error) toast.error('Failed to load API keys');
    setKeys((data ?? []) as APIKey[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchKeys();
    const ch = supabase.channel('api_keys_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'api_keys' }, fetchKeys)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchKeys]);

  const createKey = async () => {
    if (!newName.trim()) { toast.error('Name required'); return; }
    const fullKey = generateKey();
    const hash = await sha256(fullKey);
    const prefix = fullKey.slice(0, 12);

    const { error } = await supabase.from('api_keys').insert({
      name: newName.trim(),
      key_prefix: prefix,
      key_hash: hash,
      permissions: ['read'],
    });
    if (error) { toast.error(error.message); return; }
    setCreatedKey(fullKey);
    setNewName('');
    toast.success('API key created');
  };

  const toggleActive = async (k: APIKey) => {
    const { error } = await supabase.from('api_keys')
      .update({ is_active: !k.is_active }).eq('id', k.id);
    if (error) toast.error(error.message);
    else toast.success(k.is_active ? 'Disabled' : 'Enabled');
  };

  const remove = async (id: string) => {
    if (!confirm('Permanently delete this API key?')) return;
    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    if (error) toast.error(error.message); else toast.success('Deleted');
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
            <Key className="w-8 h-8 text-primary" />
            API Management
          </h1>
          <p className="text-muted-foreground mt-1">Real API keys — hashed in DB, only prefix shown</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchKeys}><RefreshCw className="w-4 h-4" /></Button>
          <Button onClick={() => { setCreatedKey(null); setShowCreate(true); }} className="gap-2">
            <Plus className="w-4 h-4" /> Create
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Keys', value: keys.length, icon: Key },
          { label: 'Active', value: keys.filter(k => k.is_active).length, icon: CheckCircle2 },
          { label: 'Total Uses', value: keys.reduce((s, k) => s + k.usage_count, 0), icon: Shield },
          { label: 'Last 7d', value: keys.filter(k => k.last_used_at && Date.now() - new Date(k.last_used_at).getTime() < 7*86400000).length, icon: Clock },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4">
            <s.icon className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {loading ? <p className="text-center text-muted-foreground py-12">Loading…</p>
          : keys.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No API keys yet.</p>
          ) : keys.map((k, i) => (
            <motion.div key={k.id} className="glass rounded-2xl p-5"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.03, 0.3) }}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{k.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      k.is_active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                    }`}>{k.is_active ? 'Active' : 'Disabled'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Created {new Date(k.created_at).toLocaleDateString()}
                    {k.last_used_at && ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                    {` · ${k.usage_count} uses`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => toggleActive(k)}>
                    {k.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(k.id)} className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-muted/40 rounded-lg p-3">
                <code className="flex-1 font-mono text-sm">{k.key_prefix}{'•'.repeat(40)}</code>
                <Button variant="ghost" size="sm" onClick={() => copy(k.key_prefix)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex gap-2 mt-2">
                {k.permissions.map(p => (
                  <span key={p} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">{p}</span>
                ))}
              </div>
            </motion.div>
          ))}
      </div>

      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) setCreatedKey(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createdKey ? 'Save your key now' : 'New API Key'}</DialogTitle>
          </DialogHeader>
          {createdKey ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Copy this key — it will <strong>never be shown again</strong>. Only its hash is stored.
              </p>
              <div className="bg-muted/50 rounded-lg p-3 font-mono text-sm break-all">{createdKey}</div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => copy(createdKey)}>
                  <Copy className="w-4 h-4 mr-2" /> Copy
                </Button>
                <Button className="flex-1" onClick={() => { setCreatedKey(null); setShowCreate(false); }}>
                  Done
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Input placeholder="Key name (e.g. Production API)"
                value={newName} onChange={e => setNewName(e.target.value)} />
              <Button onClick={createKey} className="w-full">Generate Key</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default APIManagement;

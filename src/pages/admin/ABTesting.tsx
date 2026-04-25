import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TestTube, Plus, Play, Pause, Trophy, Trash2, RefreshCw, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Variant { name: string; traffic: number }
interface Experiment {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: Variant[];
  winner: string | null;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}
interface AssignmentStat {
  variant: string;
  users: number;
  conversions: number;
}

const ABTesting = () => {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [stats, setStats] = useState<Record<string, AssignmentStat[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newVariants, setNewVariants] = useState('A,B');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: exps, error } = await supabase
      .from('experiments').select('*').order('created_at', { ascending: false });
    if (error) { toast.error('Failed to load experiments'); setLoading(false); return; }

    const list = (exps ?? []).map(e => ({
      ...e, variants: (e.variants as unknown as Variant[]) ?? [],
    })) as Experiment[];
    setExperiments(list);

    if (list.length) {
      const ids = list.map(e => e.id);
      const { data: asg } = await supabase
        .from('experiment_assignments')
        .select('experiment_id, variant, converted')
        .in('experiment_id', ids);
      const grouped: Record<string, AssignmentStat[]> = {};
      list.forEach(exp => {
        const rows = (asg ?? []).filter(a => a.experiment_id === exp.id);
        grouped[exp.id] = exp.variants.map(v => ({
          variant: v.name,
          users: rows.filter(r => r.variant === v.name).length,
          conversions: rows.filter(r => r.variant === v.name && r.converted).length,
        }));
      });
      setStats(grouped);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const ch = supabase.channel('experiments_live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'experiments' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'experiment_assignments' }, fetchAll)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  const createExperiment = async () => {
    if (!newName.trim()) { toast.error('Name required'); return; }
    const variants = newVariants.split(',').map(s => s.trim()).filter(Boolean);
    if (variants.length < 2) { toast.error('Need at least 2 variants'); return; }
    const traffic = Math.floor(100 / variants.length);
    const { error } = await supabase.from('experiments').insert({
      name: newName.trim(),
      description: newDesc.trim() || null,
      status: 'draft',
      variants: variants.map(v => ({ name: v, traffic })) as never,
      starts_at: new Date().toISOString(),
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Experiment created');
    setNewName(''); setNewDesc(''); setNewVariants('A,B'); setShowCreate(false);
  };

  const setStatus = async (id: string, status: Experiment['status']) => {
    const { error } = await supabase.from('experiments').update({ status }).eq('id', id);
    if (error) toast.error(error.message); else toast.success(`Marked ${status}`);
  };

  const declareWinner = async (id: string, variant: string) => {
    const { error } = await supabase.from('experiments')
      .update({ winner: variant, status: 'completed', ends_at: new Date().toISOString() })
      .eq('id', id);
    if (error) toast.error(error.message); else toast.success(`Winner: ${variant}`);
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this experiment and all assignments?')) return;
    const { error } = await supabase.from('experiments').delete().eq('id', id);
    if (error) toast.error(error.message); else toast.success('Deleted');
  };

  const totalUsers = Object.values(stats).flat().reduce((s, x) => s + x.users, 0);
  const running = experiments.filter(e => e.status === 'running').length;
  const completed = experiments.filter(e => e.status === 'completed').length;

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
            <TestTube className="w-8 h-8 text-primary" />
            A/B Testing
          </h1>
          <p className="text-muted-foreground mt-1">Real experiments backed by your database</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchAll}><RefreshCw className="w-4 h-4" /></Button>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: experiments.length, icon: TestTube },
          { label: 'Running', value: running, icon: Play },
          { label: 'Completed', value: completed, icon: Trophy },
          { label: 'Users in tests', value: totalUsers, icon: BarChart3 },
        ].map(s => (
          <div key={s.label} className="glass rounded-xl p-4">
            <s.icon className="w-5 h-5 text-primary mb-2" />
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <AnimatePresence>
          {loading ? <p className="text-center text-muted-foreground py-12">Loading…</p>
            : experiments.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                No experiments yet. Click <strong>New</strong> to create your first A/B test.
              </p>
            ) : experiments.map((exp, i) => {
              const expStats = stats[exp.id] ?? [];
              const totalForExp = expStats.reduce((s, v) => s + v.users, 0);
              return (
                <motion.div key={exp.id} className="glass rounded-2xl p-6"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-lg">{exp.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          exp.status === 'running' ? 'bg-emerald-500/20 text-emerald-400' :
                          exp.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
                          exp.status === 'completed' ? 'bg-primary/20 text-primary' :
                          'bg-muted text-muted-foreground'
                        }`}>{exp.status}</span>
                        {exp.winner && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary flex items-center gap-1">
                            <Trophy className="w-3 h-3" /> {exp.winner}
                          </span>
                        )}
                      </div>
                      {exp.description && <p className="text-sm text-muted-foreground">{exp.description}</p>}
                    </div>
                    <div className="flex gap-1">
                      {exp.status === 'draft' && (
                        <Button variant="ghost" size="sm" onClick={() => setStatus(exp.id, 'running')}>
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      {exp.status === 'running' && (
                        <Button variant="ghost" size="sm" onClick={() => setStatus(exp.id, 'paused')}>
                          <Pause className="w-4 h-4" />
                        </Button>
                      )}
                      {exp.status === 'paused' && (
                        <Button variant="ghost" size="sm" onClick={() => setStatus(exp.id, 'running')}>
                          <Play className="w-4 h-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => remove(exp.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {expStats.map(v => {
                      const rate = v.users ? (v.conversions / v.users * 100) : 0;
                      const share = totalForExp ? (v.users / totalForExp * 100) : 0;
                      return (
                        <div key={v.variant} className="bg-muted/30 rounded-xl p-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">Variant {v.variant}</span>
                            <span className="text-sm text-muted-foreground">{rate.toFixed(1)}% CR</span>
                          </div>
                          <Progress value={share} className="h-1.5 mb-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>{v.users} users</span>
                            <span>{v.conversions} conversions</span>
                          </div>
                          {exp.status !== 'completed' && v.users > 10 && (
                            <Button variant="ghost" size="sm" className="mt-2 w-full text-xs"
                              onClick={() => declareWinner(exp.id, v.variant)}>
                              Declare winner
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
        </AnimatePresence>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Experiment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Experiment name" value={newName} onChange={e => setNewName(e.target.value)} />
            <Textarea placeholder="What are you testing?" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            <Input placeholder="Variants, comma-separated (e.g. A,B,C)"
              value={newVariants} onChange={e => setNewVariants(e.target.value)} />
            <Button onClick={createExperiment} className="w-full">Create</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ABTesting;

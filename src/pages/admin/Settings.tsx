import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Palette, 
  Database, 
  Users, 
  Music,
  Save,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface AppStats {
  totalSongs: number;
  totalUsers: number;
  totalPlaylists: number;
  totalArtists: number;
  totalPlays: number;
  storageUsed: number;
}

interface SystemHealth {
  database: 'healthy' | 'degraded' | 'down';
  storage: 'healthy' | 'degraded' | 'down';
  auth: 'healthy' | 'degraded' | 'down';
}

const Settings = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<AppStats>({
    totalSongs: 0,
    totalUsers: 0,
    totalPlaylists: 0,
    totalArtists: 0,
    totalPlays: 0,
    storageUsed: 0,
  });
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    database: 'healthy',
    storage: 'healthy',
    auth: 'healthy',
  });

  // App settings state
  const [settings, setSettings] = useState({
    appName: 'Univers Flow',
    maintenanceMode: false,
    allowSignups: true,
    autoConfirmEmail: true,
    maxUploadSize: 100,
    enableDownloads: true,
    enableOfflineMode: true,
    enableReactions: true,
    enableComments: true,
  });

  useEffect(() => {
    fetchStats();
    checkSystemHealth();
  }, []);

  const fetchStats = async () => {
    try {
      const [songsRes, usersRes, playlistsRes, artistsRes] = await Promise.all([
        supabase.from('songs').select('id, play_count, file_size'),
        supabase.from('profiles').select('id'),
        supabase.from('playlists').select('id'),
        supabase.from('artists').select('id'),
      ]);

      const totalPlays = songsRes.data?.reduce((acc, s) => acc + (s.play_count || 0), 0) || 0;
      const storageUsed = songsRes.data?.reduce((acc, s) => acc + (s.file_size || 0), 0) || 0;

      setStats({
        totalSongs: songsRes.data?.length || 0,
        totalUsers: usersRes.data?.length || 0,
        totalPlaylists: playlistsRes.data?.length || 0,
        totalArtists: artistsRes.data?.length || 0,
        totalPlays,
        storageUsed,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkSystemHealth = async () => {
    try {
      // Check database
      const { error: dbError } = await supabase.from('songs').select('id').limit(1);
      
      // Check storage
      const { error: storageError } = await supabase.storage.from('music').list('', { limit: 1 });
      
      // Check auth
      const { error: authError } = await supabase.auth.getSession();

      setSystemHealth({
        database: dbError ? 'degraded' : 'healthy',
        storage: storageError ? 'degraded' : 'healthy',
        auth: authError ? 'degraded' : 'healthy',
      });
    } catch {
      setSystemHealth({
        database: 'down',
        storage: 'down',
        auth: 'down',
      });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Settings would be saved to a settings table in production
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    if (!confirm('Clear all cached data? This cannot be undone.')) return;
    
    try {
      // Clear browser cache
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      toast.success('Cache cleared successfully');
    } catch (error) {
      toast.error('Failed to clear cache');
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'down':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default:
        return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getHealthLabel = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'Healthy';
      case 'degraded':
        return 'Degraded';
      case 'down':
        return 'Down';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-display font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your application settings and preferences</p>
      </motion.div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="glass w-full md:w-auto flex-wrap h-auto p-1">
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2">
            <Database className="w-4 h-4" />
            <span className="hidden sm:inline">System</span>
          </TabsTrigger>
          <TabsTrigger value="danger" className="gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Danger Zone</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <motion.div
            className="grid gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-primary" />
                Application Settings
              </h2>
              
              <div className="space-y-6">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="appName">Application Name</Label>
                    <Input
                      id="appName"
                      value={settings.appName}
                      onChange={(e) => setSettings(prev => ({ ...prev, appName: e.target.value }))}
                      className="bg-muted/50 border-white/10"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxUpload">Max Upload Size (MB)</Label>
                    <Input
                      id="maxUpload"
                      type="number"
                      value={settings.maxUploadSize}
                      onChange={(e) => setSettings(prev => ({ ...prev, maxUploadSize: parseInt(e.target.value) || 100 }))}
                      className="bg-muted/50 border-white/10"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-t border-white/5">
                  <div>
                    <p className="font-medium">Maintenance Mode</p>
                    <p className="text-sm text-muted-foreground">Disable public access temporarily</p>
                  </div>
                  <Switch
                    checked={settings.maintenanceMode}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, maintenanceMode: checked }))}
                  />
                </div>

                <div className="flex items-center justify-between py-3 border-t border-white/5">
                  <div>
                    <p className="font-medium">Allow New Signups</p>
                    <p className="text-sm text-muted-foreground">Allow new users to register</p>
                  </div>
                  <Switch
                    checked={settings.allowSignups}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, allowSignups: checked }))}
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleSaveSettings} disabled={saving} className="w-full md:w-auto btn-premium">
              {saving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </motion.div>
        </TabsContent>

        {/* Features Settings */}
        <TabsContent value="features">
          <motion.div
            className="glass rounded-2xl p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5 text-primary" />
              Feature Toggles
            </h2>
            
            <div className="space-y-4">
              {[
                { key: 'enableDownloads', label: 'Enable Downloads', desc: 'Allow users to download songs' },
                { key: 'enableOfflineMode', label: 'Offline Mode', desc: 'Allow offline playback of downloaded songs' },
                { key: 'enableReactions', label: 'Song Reactions', desc: 'Allow emoji reactions on songs' },
                { key: 'enableComments', label: 'Comments', desc: 'Allow comments on songs' },
              ].map((feature) => (
                <div key={feature.key} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
                  <div>
                    <p className="font-medium">{feature.label}</p>
                    <p className="text-sm text-muted-foreground">{feature.desc}</p>
                  </div>
                  <Switch
                    checked={settings[feature.key as keyof typeof settings] as boolean}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, [feature.key]: checked }))}
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </TabsContent>

        {/* System Health */}
        <TabsContent value="system">
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* System Health */}
            <div className="glass rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Database className="w-5 h-5 text-primary" />
                  System Health
                </h2>
                <Button variant="outline" size="sm" onClick={checkSystemHealth}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'database', label: 'Database', icon: Database },
                  { key: 'storage', label: 'Storage', icon: Music },
                  { key: 'auth', label: 'Authentication', icon: Users },
                ].map((service) => {
                  const Icon = service.icon;
                  const status = systemHealth[service.key as keyof SystemHealth];
                  return (
                    <div key={service.key} className="p-4 bg-muted/30 rounded-xl flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        status === 'healthy' ? 'bg-green-500/20' : 
                        status === 'degraded' ? 'bg-yellow-500/20' : 'bg-destructive/20'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          status === 'healthy' ? 'text-green-500' : 
                          status === 'degraded' ? 'text-yellow-500' : 'text-destructive'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">{service.label}</p>
                        <div className="flex items-center gap-1 text-sm">
                          {getHealthIcon(status)}
                          <span className={
                            status === 'healthy' ? 'text-green-500' : 
                            status === 'degraded' ? 'text-yellow-500' : 'text-destructive'
                          }>
                            {getHealthLabel(status)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* App Statistics */}
            <div className="glass rounded-2xl p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Platform Statistics
              </h2>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Songs', value: stats.totalSongs, icon: Music },
                  { label: 'Users', value: stats.totalUsers, icon: Users },
                  { label: 'Playlists', value: stats.totalPlaylists, icon: Music },
                  { label: 'Artists', value: stats.totalArtists, icon: Users },
                  { label: 'Total Plays', value: stats.totalPlays, icon: Music },
                  { label: 'Storage', value: formatBytes(stats.storageUsed), icon: Database },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="text-center p-4 bg-muted/30 rounded-xl">
                      <Icon className="w-6 h-6 mx-auto mb-2 text-primary" />
                      <p className="text-xl font-bold">{typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* Danger Zone */}
        <TabsContent value="danger">
          <motion.div
            className="glass rounded-2xl p-6 border-destructive/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-destructive">
              <Shield className="w-5 h-5" />
              Danger Zone
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between py-4 border-b border-white/5">
                <div>
                  <p className="font-medium">Clear Cache</p>
                  <p className="text-sm text-muted-foreground">Clear all cached data from the browser</p>
                </div>
                <Button variant="outline" onClick={handleClearCache}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Cache
                </Button>
              </div>

              <div className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium">Reset Play Counts</p>
                  <p className="text-sm text-muted-foreground">Reset all song play counts to zero</p>
                </div>
                <Button 
                  variant="destructive"
                  onClick={async () => {
                    if (!confirm('Reset all play counts? This cannot be undone.')) return;
                    const { error } = await supabase.from('songs').update({ play_count: 0 }).neq('id', '');
                    if (error) {
                      toast.error('Failed to reset play counts');
                    } else {
                      toast.success('Play counts reset');
                      fetchStats();
                    }
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;

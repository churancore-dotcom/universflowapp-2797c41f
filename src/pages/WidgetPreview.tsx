import { ArrowLeft, Smartphone, Grid3X3, Music, Heart, Search, Zap, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const widgets = [
  {
    name: 'Now Playing',
    icon: Music,
    size: '4×2',
    description: 'Shows the current track with album art, playback controls, and a progress bar.',
    preview: (
      <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/30 p-3 flex gap-3 items-center">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/60 to-accent/60 flex items-center justify-center shrink-0">
          <Music className="w-6 h-6 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm font-semibold text-foreground truncate">Song Title</p>
          <p className="text-xs text-muted-foreground truncate">Artist Name</p>
          <div className="h-1 rounded-full bg-muted overflow-hidden">
            <div className="h-full w-2/3 rounded-full bg-primary" />
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {['◀', '▶', '▶▶'].map((s, i) => (
            <div key={i} className="w-7 h-7 rounded-full bg-muted/60 flex items-center justify-center text-[10px] text-foreground">{s}</div>
          ))}
        </div>
      </div>
    ),
  },
  {
    name: 'Favorites',
    icon: Heart,
    size: '4×3',
    description: 'Displays your top 6 liked songs as a grid. Tap any to play instantly.',
    preview: (
      <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/30 p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Heart className="w-3 h-3 text-primary" /> Favorites</span>
          <span className="text-[10px] text-muted-foreground">See All</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-gradient-to-br from-muted to-muted/40 flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-primary/40" />
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    name: 'Quick Actions',
    icon: Zap,
    size: '4×1',
    description: 'One-tap shortcuts to open, search, shuffle, view recent, or browse your library.',
    preview: (
      <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/30 p-2.5 flex items-center justify-around">
        {[
          { label: 'Open', icon: '🎵' },
          { label: 'Search', icon: '🔍' },
          { label: 'Shuffle', icon: '🔀' },
          { label: 'Recent', icon: '🕐' },
          { label: 'Library', icon: '📚' },
        ].map((a) => (
          <div key={a.label} className="flex flex-col items-center gap-0.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${a.label === 'Shuffle' ? 'bg-primary text-primary-foreground' : 'bg-muted/60 text-foreground'}`}>{a.icon}</div>
            <span className="text-[9px] text-muted-foreground">{a.label}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: 'Recently Played',
    icon: Clock,
    size: '4×3',
    description: 'Lists your last 4 played tracks so you can quickly revisit them.',
    preview: (
      <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/30 p-3 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Recently Played</span>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2 py-1 border-b border-border/20 last:border-0">
            <div className="w-8 h-8 rounded-md bg-muted/50 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-foreground truncate">Track {i + 1}</p>
              <p className="text-[10px] text-muted-foreground truncate">Artist</p>
            </div>
            <div className="w-5 h-5 rounded-full bg-muted/40 flex items-center justify-center text-[8px] text-foreground">▶</div>
          </div>
        ))}
      </div>
    ),
  },
  {
    name: 'Music Search',
    icon: Search,
    size: '4×1',
    description: 'A compact search bar widget that opens the app directly to search.',
    preview: (
      <div className="rounded-2xl bg-card/80 backdrop-blur-xl border border-border/30 p-2.5 flex items-center gap-2">
        <Search className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground flex-1">Search UniversFlow…</span>
        <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
          <Search className="w-3 h-3 text-primary" />
        </div>
      </div>
    ),
  },
];

const steps = [
  { step: '1', text: 'Long-press on your Android home screen' },
  { step: '2', text: 'Tap "Widgets" from the menu' },
  { step: '3', text: 'Find "UniversFlow" in the list' },
  { step: '4', text: 'Drag any widget to your home screen' },
];

export default function WidgetPreview() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted/50 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-foreground">Home Screen Widgets</h1>
            <p className="text-xs text-muted-foreground">Customize your Android experience</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-6">
        {/* How to add */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-card/60 border border-border/30 p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">How to Add Widgets</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {steps.map((s) => (
              <div key={s.step} className="flex items-start gap-2 p-2 rounded-xl bg-muted/30">
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">{s.step}</span>
                <p className="text-[11px] text-muted-foreground leading-tight">{s.text}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Widget previews */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Grid3X3 className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold text-foreground">Available Widgets</h2>
          </div>

          {widgets.map((w, i) => (
            <motion.div
              key={w.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <w.icon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">{w.name}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{w.size}</span>
              </div>
              <p className="text-xs text-muted-foreground">{w.description}</p>
              {/* Simulated home screen */}
              <div className="rounded-2xl bg-[hsl(var(--muted)/0.3)] p-4 border border-border/20">
                {w.preview}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

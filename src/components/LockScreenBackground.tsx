import type { LockScreenThemeId } from '@/lib/lockScreenTheme';

interface Props {
  themeId?: LockScreenThemeId;
  coverUrl?: string | null;
  isPlaying?: boolean;
}

/**
 * Lock-screen background renderer.
 *
 * Performance rules:
 *  - Heavy blur is allowed ONLY when the layer behind it is static.
 *  - All motion uses CSS keyframes on transform/opacity — no JS RAF, no canvas.
 *  - Never stack backdrop-blur over an animated layer (causes per-frame resampling).
 *
 * `classic` is the calm iOS-style purple lock screen — no animation, pure GPU
 * composite of a heavily blurred album cover + violet scrim.
 */
const LockScreenBackground = ({ themeId = 'classic', coverUrl }: Props) => {
  if (themeId === 'aurora') {
    return (
      <div className="absolute inset-0 overflow-hidden bg-black">
        <div className="lockfx-aurora-a" />
        <div className="lockfx-aurora-b" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/80" />
      </div>
    );
  }

  if (themeId === 'waves') {
    return (
      <div className="absolute inset-0 overflow-hidden bg-[#0a0618]">
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 400 800"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="lockfx-wave-1" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ff2d55" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lockfx-wave-2" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#ff2d55" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path
            className="lockfx-wave-path-1"
            d="M0,420 C100,360 200,500 400,420 L400,800 L0,800 Z"
            fill="url(#lockfx-wave-1)"
          />
          <path
            className="lockfx-wave-path-2"
            d="M0,520 C120,460 240,600 400,520 L400,800 L0,800 Z"
            fill="url(#lockfx-wave-2)"
          />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80" />
      </div>
    );
  }

  if (themeId === 'glow') {
    return (
      <div className="absolute inset-0 overflow-hidden bg-black">
        <div className="lockfx-glow" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/85" />
      </div>
    );
  }

  // classic — iOS-style purple lock screen.
  // Static blurred cover (or violet fallback) + heavy violet scrim.
  // Zero animation; entire stack is GPU-composited.
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #2a1248 0%, #170828 60%, #0a0414 100%)' }}
    >
      {coverUrl && (
        <img
          src={coverUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-125 opacity-70"
          draggable={false}
          style={{ filter: 'blur(90px) saturate(1.2)' }}
        />
      )}
      {/* Violet wash */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 35%, rgba(80,30,140,0.55), transparent 70%)',
        }}
      />
      {/* Top/bottom darkening for legibility */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.25) 70%, rgba(0,0,0,0.7) 100%)',
        }}
      />
    </div>
  );
};

export default LockScreenBackground;

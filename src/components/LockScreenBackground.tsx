import type { LockScreenThemeId } from '@/lib/lockScreenTheme';

interface Props {
  themeId?: LockScreenThemeId;
  coverUrl?: string | null;
  isPlaying?: boolean;
}

/**
 * Lock-screen background renderer.
 *
 * Performance rules (per project memory):
 *  - Heavy backdrop blur is allowed ONLY when the layer behind it is static.
 *  - All motion is CSS keyframes on transform/opacity — no JS RAF loops.
 *  - No audio reactivity, no parallax, no canvas.
 *
 * Themes:
 *   classic — iOS-style: blurred cover + dark scrim + soft rose bloom (no motion)
 *   aurora  — two drifting rose/violet blobs over a black field
 *   waves   — layered slow-flowing SVG sine waves
 *   glow    — pulsing radial rose ember
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
              <stop offset="0%" stopColor="#ff2d55" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="lockfx-wave-2" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.45" />
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

  // classic — calm blurred cover + dark scrim + static rose bloom
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {coverUrl && (
        <img
          src={coverUrl}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-110"
          draggable={false}
        />
      )}
      <div className="absolute inset-0 backdrop-blur-[80px] bg-black/55" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 30%, rgba(255,45,85,0.18), transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/80"
      />
    </div>
  );
};

export default LockScreenBackground;

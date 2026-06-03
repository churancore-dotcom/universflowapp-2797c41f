import type { LockScreenThemeId } from '@/lib/lockScreenTheme';

interface Props {
  themeId?: LockScreenThemeId;
  coverUrl?: string | null;
  isPlaying?: boolean;
}

/**
 * Single, calm classic lock-screen background:
 *   - blurred album art behind everything
 *   - dark scrim so the player UI stays legible
 *   - one static rose bloom for warmth
 *
 * No continuous animations, no parallax, no audio reactivity.
 * Burned mid-range Android devices and looked toy-like — gone.
 */
const LockScreenBackground = ({ coverUrl }: Props) => {
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
      {/* Heavy blur is OK here because the background is static (per project memory). */}
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

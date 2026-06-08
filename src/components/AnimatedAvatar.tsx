import { memo } from 'react';

export type AvatarVariant =
  | 'wave'
  | 'vibe'
  | 'dj'
  | 'sleepy'
  | 'wink'
  | 'star'
  | 'heart'
  | 'dance'
  | 'cool'
  | 'rockstar';

interface Props {
  variant: AvatarVariant;
  size?: number;
  /** Pause animations (useful inside scrolling lists) */
  paused?: boolean;
}

/**
 * Premium animated SVG avatars. Pure CSS keyframes — no canvas, no RAF.
 * Each variant has a unique gradient bg + character + idle animation loop.
 */
const AnimatedAvatar = memo(({ variant, size = 96, paused = false }: Props) => {
  const config = VARIANTS[variant] ?? VARIANTS.wave;

  return (
    <div
      className="relative w-full h-full overflow-hidden rounded-full select-none"
      style={{ background: config.bg, animationPlayState: paused ? 'paused' : 'running' }}
      aria-hidden="true"
    >
      <style>{`
        @keyframes uf-av-wave { 0%,60%,100%{transform:rotate(0deg)} 70%{transform:rotate(-22deg)} 80%{transform:rotate(14deg)} 90%{transform:rotate(-10deg)} }
        @keyframes uf-av-blink { 0%,92%,100%{transform:scaleY(1)} 95%{transform:scaleY(0.1)} }
        @keyframes uf-av-bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes uf-av-sway { 0%,100%{transform:rotate(-4deg)} 50%{transform:rotate(4deg)} }
        @keyframes uf-av-float-note { 0%{transform:translate(0,0) scale(0.6);opacity:0} 20%{opacity:1} 100%{transform:translate(8px,-22px) scale(1);opacity:0} }
        @keyframes uf-av-float-note2 { 0%{transform:translate(0,0) scale(0.6);opacity:0} 20%{opacity:1} 100%{transform:translate(-10px,-26px) scale(1);opacity:0} }
        @keyframes uf-av-zzz { 0%{transform:translate(0,0) scale(0.5);opacity:0} 30%{opacity:1} 100%{transform:translate(10px,-18px) scale(1.1);opacity:0} }
        @keyframes uf-av-pulse-ring { 0%{transform:scale(0.95);opacity:0.6} 100%{transform:scale(1.4);opacity:0} }
        @keyframes uf-av-wink { 0%,80%,100%{transform:scaleY(1)} 88%{transform:scaleY(0.05)} }
        @keyframes uf-av-spark { 0%,100%{transform:scale(0.5);opacity:0} 50%{transform:scale(1);opacity:1} }
        @keyframes uf-av-heart-beat { 0%,100%{transform:scale(1)} 15%{transform:scale(1.25)} 30%{transform:scale(1)} 45%{transform:scale(1.18)} 60%{transform:scale(1)} }
        @keyframes uf-av-dance { 0%,100%{transform:translateX(-3px) rotate(-3deg)} 50%{transform:translateX(3px) rotate(3deg)} }
        @keyframes uf-av-glow { 0%,100%{opacity:0.35} 50%{opacity:0.7} }
      `}</style>

      <svg viewBox="0 0 100 100" width={size} height={size} className="block">
        {/* Subtle glow disc */}
        <circle cx="50" cy="58" r="38" fill={config.glow} style={{ animation: paused ? 'none' : 'uf-av-glow 3s ease-in-out infinite' }} />

        {/* Pulse ring (DJ / vibe) */}
        {(variant === 'dj' || variant === 'vibe') && (
          <circle cx="50" cy="52" r="32" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="1.2"
            style={{ animation: paused ? 'none' : 'uf-av-pulse-ring 1.6s ease-out infinite', transformOrigin: '50px 52px' }} />
        )}

        {/* === CHARACTER (head group, optional sway/dance) === */}
        <g style={{
          transformOrigin: '50px 55px',
          animation: paused ? 'none' :
            variant === 'dance' ? 'uf-av-dance 1.4s ease-in-out infinite' :
            variant === 'vibe' ? 'uf-av-bob 1.6s ease-in-out infinite' :
            variant === 'dj' ? 'uf-av-bob 0.9s ease-in-out infinite' :
            'none',
        }}>
          {/* Neck */}
          <rect x="44" y="68" width="12" height="14" rx="5" fill={config.skin} />
          {/* Body / shirt */}
          <path d={`M22 96 Q 22 78 50 78 Q 78 78 78 96 Z`} fill={config.shirt} />

          {/* Hair back (for long-hair variants) */}
          {config.longHair && (
            <path d="M26 50 Q 22 80 36 90 L 36 56 Z M74 50 Q 78 80 64 90 L 64 56 Z" fill={config.hair} />
          )}

          {/* Head */}
          <ellipse cx="50" cy="48" rx="22" ry="24" fill={config.skin} />

          {/* Hair top */}
          {config.hair && (
            <path d={config.hairPath} fill={config.hair} />
          )}

          {/* Headphones (DJ) */}
          {variant === 'dj' && (
            <>
              <path d="M28 46 Q 50 22 72 46" stroke="#111" strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <rect x="22" y="44" width="9" height="14" rx="3.5" fill="#ff2d55" />
              <rect x="69" y="44" width="9" height="14" rx="3.5" fill="#ff2d55" />
            </>
          )}

          {/* Sunglasses (cool) */}
          {variant === 'cool' && (
            <g>
              <rect x="32" y="44" width="14" height="10" rx="3" fill="#111" />
              <rect x="54" y="44" width="14" height="10" rx="3" fill="#111" />
              <rect x="46" y="48" width="8" height="2" fill="#111" />
              <rect x="35" y="46" width="3" height="2" rx="1" fill="#fff" opacity="0.6" />
              <rect x="57" y="46" width="3" height="2" rx="1" fill="#fff" opacity="0.6" />
            </g>
          )}

          {/* Star headband (rockstar) */}
          {variant === 'rockstar' && (
            <g>
              <rect x="28" y="34" width="44" height="5" rx="2" fill="#ff2d55" />
              <path d="M48 30 L 50 35 L 55 35 L 51 38 L 53 43 L 48 40 L 43 43 L 45 38 L 41 35 L 46 35 Z" fill="#fff" />
            </g>
          )}

          {/* Eyes — blink */}
          {variant !== 'cool' && variant !== 'wink' && (
            <g style={{ transformOrigin: '50px 50px', animation: paused ? 'none' : 'uf-av-blink 4s ease-in-out infinite' }}>
              <ellipse cx="41" cy="50" rx="2.4" ry="3" fill="#111" />
              <ellipse cx="59" cy="50" rx="2.4" ry="3" fill="#111" />
              <circle cx="41.8" cy="49" r="0.8" fill="#fff" />
              <circle cx="59.8" cy="49" r="0.8" fill="#fff" />
            </g>
          )}

          {/* Eyes — wink */}
          {variant === 'wink' && (
            <>
              <ellipse cx="41" cy="50" rx="2.4" ry="3" fill="#111" />
              <circle cx="41.8" cy="49" r="0.8" fill="#fff" />
              <path d="M55 50 Q 59 47 63 50" stroke="#111" strokeWidth="2" fill="none" strokeLinecap="round"
                style={{ transformOrigin: '59px 50px', animation: paused ? 'none' : 'uf-av-wink 3s ease-in-out infinite' }} />
            </>
          )}

          {/* Sleepy eyes */}
          {variant === 'sleepy' && (
            <>
              <path d="M37 50 Q 41 53 45 50" stroke="#111" strokeWidth="2" fill="none" strokeLinecap="round" />
              <path d="M55 50 Q 59 53 63 50" stroke="#111" strokeWidth="2" fill="none" strokeLinecap="round" />
            </>
          )}

          {/* Cheeks */}
          <circle cx="36" cy="58" r="3" fill="#ff2d55" opacity="0.35" />
          <circle cx="64" cy="58" r="3" fill="#ff2d55" opacity="0.35" />

          {/* Mouth */}
          {variant === 'sleepy' ? (
            <ellipse cx="50" cy="62" rx="2.2" ry="2.8" fill="#111" />
          ) : (
            <path d="M44 61 Q 50 67 56 61" stroke="#111" strokeWidth="2" fill="none" strokeLinecap="round" />
          )}
        </g>

        {/* Waving hand */}
        {variant === 'wave' && (
          <g style={{ transformOrigin: '78px 72px', animation: paused ? 'none' : 'uf-av-wave 2.4s ease-in-out infinite' }}>
            <rect x="74" y="64" width="4" height="14" rx="2" fill={config.skin} />
            <circle cx="76" cy="62" r="5" fill={config.skin} />
          </g>
        )}

        {/* Floating music notes */}
        {(variant === 'vibe' || variant === 'dj') && (
          <g fill="#fff">
            <g style={{ animation: paused ? 'none' : 'uf-av-float-note 2.2s ease-out infinite', transformOrigin: '18px 38px' }}>
              <circle cx="18" cy="40" r="2.4" />
              <rect x="20" y="30" width="1.2" height="10" />
            </g>
            <g style={{ animation: paused ? 'none' : 'uf-av-float-note2 2.6s ease-out infinite 0.7s', transformOrigin: '82px 36px' }}>
              <circle cx="82" cy="38" r="2.4" />
              <rect x="84" y="28" width="1.2" height="10" />
            </g>
          </g>
        )}

        {/* Zzz */}
        {variant === 'sleepy' && (
          <g fill="#fff" fontSize="9" fontWeight="700" fontFamily="system-ui">
            <text x="74" y="40" style={{ animation: paused ? 'none' : 'uf-av-zzz 2.2s ease-out infinite' }}>z</text>
            <text x="80" y="32" style={{ animation: paused ? 'none' : 'uf-av-zzz 2.2s ease-out infinite 0.8s' }}>Z</text>
          </g>
        )}

        {/* Sparkles (star) */}
        {variant === 'star' && (
          <g fill="#fff">
            {[[18, 30, 0], [82, 32, 0.4], [22, 70, 0.8], [80, 70, 1.2]].map(([x, y, d], i) => (
              <path key={i} d={`M${x} ${(y as number) - 4} L${(x as number) + 1.2} ${y} L${(x as number) + 5} ${(y as number) + 1} L${(x as number) + 1.2} ${(y as number) + 2} L${x} ${(y as number) + 6} L${(x as number) - 1.2} ${(y as number) + 2} L${(x as number) - 5} ${(y as number) + 1} L${(x as number) - 1.2} ${y} Z`}
                style={{ transformOrigin: `${x}px ${y}px`, animation: paused ? 'none' : `uf-av-spark 2s ease-in-out infinite ${d}s` }} />
            ))}
          </g>
        )}

        {/* Heart (heart) */}
        {variant === 'heart' && (
          <g style={{ transformOrigin: '80px 38px', animation: paused ? 'none' : 'uf-av-heart-beat 1.3s ease-in-out infinite' }}>
            <path d="M80 44 C 72 38, 74 30, 80 32 C 86 30, 88 38, 80 44 Z" fill="#ff2d55" />
          </g>
        )}
      </svg>
    </div>
  );
});

AnimatedAvatar.displayName = 'AnimatedAvatar';

interface VariantConfig {
  bg: string;
  glow: string;
  skin: string;
  shirt: string;
  hair?: string;
  hairPath?: string;
  longHair?: boolean;
}

const VARIANTS: Record<AvatarVariant, VariantConfig> = {
  wave: {
    bg: 'linear-gradient(135deg,#ff8a9b,#ff2d55)',
    glow: 'rgba(255,255,255,0.18)',
    skin: '#f4c8a8',
    shirt: '#1a1a1a',
    hair: '#2b1d15',
    hairPath: 'M28 38 Q 32 24 50 24 Q 68 24 72 38 Q 70 30 50 30 Q 30 30 28 38 Z',
  },
  vibe: {
    bg: 'linear-gradient(135deg,#7c3aed,#ec4899)',
    glow: 'rgba(255,255,255,0.16)',
    skin: '#e8b48a',
    shirt: '#fff',
    hair: '#0f0f0f',
    hairPath: 'M26 42 Q 28 22 50 22 Q 72 22 74 42 Q 60 30 50 32 Q 40 30 26 42 Z',
    longHair: true,
  },
  dj: {
    bg: 'linear-gradient(135deg,#0f0f10,#3f3f46)',
    glow: 'rgba(255,45,85,0.4)',
    skin: '#d9a479',
    shirt: '#ff2d55',
  },
  sleepy: {
    bg: 'linear-gradient(135deg,#1e293b,#334155)',
    glow: 'rgba(255,255,255,0.1)',
    skin: '#e8b48a',
    shirt: '#475569',
    hair: '#1f1612',
    hairPath: 'M28 40 Q 30 22 50 22 Q 70 22 72 40 Q 60 32 50 32 Q 40 32 28 40 Z',
  },
  wink: {
    bg: 'linear-gradient(135deg,#fbbf24,#f97316)',
    glow: 'rgba(255,255,255,0.2)',
    skin: '#f4c8a8',
    shirt: '#1f2937',
    hair: '#3b1c0a',
    hairPath: 'M26 40 Q 30 22 50 22 Q 70 22 74 40 Q 60 30 50 30 Q 40 30 26 40 Z',
    longHair: true,
  },
  star: {
    bg: 'linear-gradient(135deg,#06b6d4,#3b82f6)',
    glow: 'rgba(255,255,255,0.18)',
    skin: '#f4c8a8',
    shirt: '#0f172a',
    hair: '#1a1a1a',
    hairPath: 'M28 38 Q 32 24 50 24 Q 68 24 72 38 Q 70 30 50 30 Q 30 30 28 38 Z',
  },
  heart: {
    bg: 'linear-gradient(135deg,#fb7185,#e11d48)',
    glow: 'rgba(255,255,255,0.2)',
    skin: '#f5c9ab',
    shirt: '#fff',
    hair: '#4a1c10',
    hairPath: 'M26 40 Q 30 22 50 22 Q 70 22 74 40 Q 60 30 50 32 Q 40 30 26 40 Z',
    longHair: true,
  },
  dance: {
    bg: 'linear-gradient(135deg,#10b981,#06b6d4)',
    glow: 'rgba(255,255,255,0.16)',
    skin: '#d6a07a',
    shirt: '#fef3c7',
    hair: '#1a1a1a',
    hairPath: 'M28 38 Q 32 22 50 22 Q 68 22 72 38 Q 70 28 50 28 Q 30 28 28 38 Z',
  },
  cool: {
    bg: 'linear-gradient(135deg,#27272a,#52525b)',
    glow: 'rgba(255,45,85,0.25)',
    skin: '#c98e63',
    shirt: '#fff',
    hair: '#0a0a0a',
    hairPath: 'M28 38 Q 32 22 50 22 Q 68 22 72 38 Q 70 28 50 28 Q 30 28 28 38 Z',
  },
  rockstar: {
    bg: 'linear-gradient(135deg,#dc2626,#7c2d12)',
    glow: 'rgba(255,255,255,0.18)',
    skin: '#f4c8a8',
    shirt: '#0a0a0a',
    hair: '#0a0a0a',
    hairPath: 'M22 44 Q 26 18 50 20 Q 74 18 78 44 Q 60 28 50 30 Q 40 28 22 44 Z',
    longHair: true,
  },
};

export default AnimatedAvatar;

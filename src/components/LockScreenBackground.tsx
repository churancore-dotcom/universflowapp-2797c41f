import { memo, useEffect, useState } from 'react';
import type { LockScreenThemeId } from '@/lib/lockScreenTheme';

interface Props {
  themeId?: LockScreenThemeId;
  coverUrl?: string | null;
  isPlaying?: boolean;
}

/**
 * Module-level decoded-image cache. Browsers already cache the byte response,
 * but creating a fresh <img> on every track change re-decodes + re-rasterises
 * the heavy 90px blur. Preloading + reusing the same <img>.src across mounts
 * keeps the blurred layer warm on the GPU and removes the per-track hiccup.
 */
const decodedCache = new Map<string, Promise<void>>();
function preloadCover(url: string) {
  if (decodedCache.has(url)) return decodedCache.get(url)!;
  const p = new Promise<void>((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.onload = img.onerror = () => resolve();
    img.src = url;
  });
  decodedCache.set(url, p);
  return p;
}

/**
 * Persistent blurred cover layer. Renders TWO stacked covers and crossfades
 * between them on URL change so the GPU never sees a blank → re-blur frame.
 */
const CachedBlurCover = memo(({ url }: { url: string | null | undefined }) => {
  const [current, setCurrent] = useState<string | null>(url || null);
  const [previous, setPrevious] = useState<string | null>(null);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!url || url === current) return;
    let cancelled = false;
    preloadCover(url).then(() => {
      if (cancelled) return;
      setPrevious(current);
      setCurrent(url);
      setFading(true);
      const t = window.setTimeout(() => setFading(false), 450);
      return () => window.clearTimeout(t);
    });
    return () => { cancelled = true; };
  }, [url, current]);

  return (
    <>
      {previous && fading && (
        <img
          src={previous}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-125 opacity-70 transition-opacity duration-500"
          style={{ filter: 'blur(90px) saturate(1.2)', willChange: 'opacity', transform: 'translateZ(0) scale(1.25)' }}
          draggable={false}
        />
      )}
      {current && (
        <img
          src={current}
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover scale-125 opacity-70"
          style={{
            filter: 'blur(90px) saturate(1.2)',
            willChange: 'filter',
            transform: 'translateZ(0) scale(1.25)',
            animation: fading ? 'lockfxFadeIn 450ms ease-out' : undefined,
          }}
          draggable={false}
        />
      )}
    </>
  );
});
CachedBlurCover.displayName = 'CachedBlurCover';

const LockScreenBackground = ({ themeId = 'vinyl', coverUrl }: Props) => {
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

  // vinyl (default) and classic both use the cached blurred-cover layer.
  // The vinyl theme tints toward deep blue (matches screenshot), classic stays violet.
  const bgGradient =
    themeId === 'vinyl'
      ? 'linear-gradient(180deg, #142a5e 0%, #0a1430 60%, #060818 100%)'
      : 'linear-gradient(180deg, #2a1248 0%, #170828 60%, #0a0414 100%)';
  const tint =
    themeId === 'vinyl'
      ? 'radial-gradient(120% 80% at 50% 35%, rgba(40,80,200,0.42), transparent 70%)'
      : 'radial-gradient(120% 80% at 50% 35%, rgba(80,30,140,0.55), transparent 70%)';

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: bgGradient }}>
      <CachedBlurCover url={coverUrl} />
      <div aria-hidden className="absolute inset-0" style={{ background: tint }} />
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

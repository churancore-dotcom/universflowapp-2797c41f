import { useEffect, useState } from 'react';

/**
 * Lock screen themes.
 *
 * All themes use pure CSS (keyframes + transform/opacity) for animation —
 * no requestAnimationFrame loops, no canvas, no audio reactivity. This keeps
 * battery + CPU flat on mid-range Android while still looking premium.
 *
 * `vinyl` is the new default — free, animated. A square cover with a
 * spinning vinyl disc peeking out behind it (per latest design ref).
 */

export type LockScreenThemeId = 'vinyl' | 'classic' | 'aurora' | 'waves';

const STORAGE_KEY = 'uf_lock_screen_theme';
const EVENT = 'uf:lock-theme-change';

export interface LockScreenThemeMeta {
  id: LockScreenThemeId;
  label: string;
  description: string;
  premium: boolean;
  preview: string;
  badge: string;
}

export const LOCK_SCREEN_THEMES: LockScreenThemeMeta[] = [
  {
    id: 'vinyl',
    label: 'Vinyl',
    description: 'Spinning disc behind the cover.',
    premium: false,
    preview:
      'radial-gradient(circle at 70% 50%, #1a1a1a 0%, #0a0a0a 60%), linear-gradient(135deg, #1e3a8a 0%, #0a0a14 100%)',
    badge: 'Default',
  },
  {
    id: 'classic',
    label: 'Classic',
    description: 'Calm blurred cover.',
    premium: false,
    preview: 'linear-gradient(160deg, #3a1a4a 0%, #1a0a2a 100%)',
    badge: 'Free',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    description: 'Drifting rose & violet light.',
    premium: true,
    preview:
      'radial-gradient(circle at 30% 30%, #ff2d55 0%, transparent 55%), radial-gradient(circle at 70% 70%, #7c3aed 0%, #0a0a1a 70%)',
    badge: 'Premium',
  },
  {
    id: 'waves',
    label: 'Waves',
    description: 'Soft flowing tide of colour.',
    premium: true,
    preview: 'linear-gradient(180deg, #0a0a1a 0%, #1b1240 50%, #ff2d55 140%)',
    badge: 'Premium',
  },
];

const isValid = (v: unknown): v is LockScreenThemeId =>
  v === 'vinyl' || v === 'classic' || v === 'aurora' || v === 'waves';

export const getStoredLockScreenTheme = (): LockScreenThemeId => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isValid(v) ? v : 'vinyl';
  } catch {
    return 'vinyl';
  }
};

export const setStoredLockScreenTheme = (id: LockScreenThemeId) => {
  try {
    localStorage.setItem(STORAGE_KEY, id);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: id }));
  } catch {
    /* ignore */
  }
};

/**
 * Premium-aware theme hook. Non-premium users always fall back to `vinyl`
 * (new default) when they have a premium theme stored.
 */
export const useLockScreenTheme = (isPremium: boolean): LockScreenThemeId => {
  const [id, setId] = useState<LockScreenThemeId>(() => getStoredLockScreenTheme());

  useEffect(() => {
    const handler = (e: Event) => {
      const next = (e as CustomEvent<LockScreenThemeId>).detail;
      if (isValid(next)) setId(next);
    };
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);

  const meta = LOCK_SCREEN_THEMES.find((t) => t.id === id);
  if (meta?.premium && !isPremium) return 'vinyl';
  return id;
};

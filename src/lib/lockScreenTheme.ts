import { useEffect, useState } from 'react';

/**
 * Lock screen themes.
 *
 * All themes use pure CSS (keyframes + transform/opacity) for animation —
 * no requestAnimationFrame loops, no canvas, no audio reactivity. This keeps
 * battery + CPU flat on mid-range Android while still looking premium.
 *
 * `classic` is free and is the default look (matches the iOS-style
 * purple-tinted blurred-cover screenshot shipped before).
 */

export type LockScreenThemeId = 'classic' | 'aurora' | 'waves' | 'glow';

const STORAGE_KEY = 'uf_lock_screen_theme';
const EVENT = 'uf:lock-theme-change';

export interface LockScreenThemeMeta {
  id: LockScreenThemeId;
  label: string;
  description: string;
  premium: boolean;
  preview: string; // CSS gradient for the picker swatch
  badge: string;
}

export const LOCK_SCREEN_THEMES: LockScreenThemeMeta[] = [
  {
    id: 'classic',
    label: 'Classic',
    description: 'Calm blurred cover. Always smooth.',
    premium: false,
    preview: 'linear-gradient(160deg, #3a1a4a 0%, #1a0a2a 100%)',
    badge: 'Default',
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
    preview:
      'linear-gradient(180deg, #0a0a1a 0%, #1b1240 50%, #ff2d55 140%)',
    badge: 'Premium',
  },
  {
    id: 'glow',
    label: 'Glow',
    description: 'Pulsing rose ember.',
    premium: true,
    preview:
      'radial-gradient(circle at 50% 60%, #ff2d55 0%, #2a0010 60%, #000 100%)',
    badge: 'Premium',
  },
];

const isValid = (v: unknown): v is LockScreenThemeId =>
  v === 'classic' || v === 'aurora' || v === 'waves' || v === 'glow';

export const getStoredLockScreenTheme = (): LockScreenThemeId => {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isValid(v) ? v : 'classic';
  } catch {
    return 'classic';
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
 * Premium-aware theme hook. Non-premium users always render `classic`,
 * even if an old premium theme is still in localStorage.
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

  if (!isPremium && id !== 'classic') return 'classic';
  return id;
};

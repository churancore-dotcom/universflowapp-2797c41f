import { useEffect, useState } from 'react';

export type LockScreenThemeId = 'album' | 'aurora' | 'starfield' | 'liquid' | 'neon' | 'waves';

export interface LockScreenTheme {
  id: LockScreenThemeId;
  label: string;
  description: string;
  premium: boolean;
  preview: string; // CSS background for the thumbnail
}

export const LOCK_SCREEN_THEMES: LockScreenTheme[] = [
  {
    id: 'album',
    label: 'Album Art',
    description: 'Classic blurred cover',
    premium: false,
    preview: 'linear-gradient(135deg, #1f1f25 0%, #3a3a45 100%)',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    description: 'Northern lights',
    premium: true,
    preview:
      'linear-gradient(135deg, #0b1e3f 0%, #1f7a6a 40%, #b833a8 80%, #0b1e3f 100%)',
  },
  {
    id: 'starfield',
    label: 'Starfield',
    description: 'Drifting cosmos',
    premium: true,
    preview:
      'radial-gradient(circle at 30% 30%, #2a2563 0%, #06030f 70%), radial-gradient(circle at 70% 70%, #5b2a8c 0%, transparent 50%)',
  },
  {
    id: 'liquid',
    label: 'Liquid Glow',
    description: 'Flowing blobs',
    premium: true,
    preview:
      'radial-gradient(circle at 25% 30%, #ff2d55 0%, transparent 45%), radial-gradient(circle at 80% 70%, #5e5ce6 0%, transparent 50%), #0b0b14',
  },
  {
    id: 'neon',
    label: 'Neon Grid',
    description: 'Synthwave retro',
    premium: true,
    preview:
      'linear-gradient(180deg, #1b0633 0%, #4a0e6e 50%, #ff2d8a 100%)',
  },
  {
    id: 'waves',
    label: 'Pulse Waves',
    description: 'Beat-driven rings',
    premium: true,
    preview:
      'radial-gradient(circle at 50% 50%, #ff2d55 0%, #5e5ce6 40%, #06030f 90%)',
  },
];

const STORAGE_KEY = 'uf_lockscreen_theme';

export const getStoredLockScreenTheme = (): LockScreenThemeId => {
  try {
    const v = localStorage.getItem(STORAGE_KEY) as LockScreenThemeId | null;
    if (v && LOCK_SCREEN_THEMES.some(t => t.id === v)) return v;
  } catch { /* ignore */ }
  return 'album';
};

export const setStoredLockScreenTheme = (id: LockScreenThemeId) => {
  try { localStorage.setItem(STORAGE_KEY, id); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('uf:lockscreen-theme', { detail: { id } }));
};

export const useLockScreenTheme = (isPremium: boolean): LockScreenThemeId => {
  const [theme, setTheme] = useState<LockScreenThemeId>(getStoredLockScreenTheme);

  useEffect(() => {
    const handler = (e: Event) => setTheme((e as CustomEvent).detail.id);
    window.addEventListener('uf:lockscreen-theme', handler);
    return () => window.removeEventListener('uf:lockscreen-theme', handler);
  }, []);

  // Non-premium users always fall back to the free album theme.
  if (!isPremium) return 'album';
  return theme;
};

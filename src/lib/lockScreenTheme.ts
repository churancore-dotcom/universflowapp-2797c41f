// Lock screen styles were over-engineered (animated metaballs, vinyl, neon stage,
// starfields, etc.). Per product call we ship ONE calm classic lock screen.
// This file is kept only so existing imports compile; there is no selector,
// no premium gating, no theme switching.

export type LockScreenThemeId = 'classic';

export const getStoredLockScreenTheme = (): LockScreenThemeId => 'classic';
export const setStoredLockScreenTheme = (_id: LockScreenThemeId) => { /* no-op */ };
export const useLockScreenTheme = (_isPremium: boolean): LockScreenThemeId => 'classic';

// Empty array so any leftover `.map` callers render nothing instead of crashing.
export const LOCK_SCREEN_THEMES: Array<{
  id: LockScreenThemeId;
  label: string;
  description: string;
  premium: boolean;
  preview: string;
  badge: string;
}> = [];

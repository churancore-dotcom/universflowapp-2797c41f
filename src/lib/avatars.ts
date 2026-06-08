import type { AvatarVariant } from '@/components/AnimatedAvatar';

export interface PresetAvatar {
  id: AvatarVariant;
  name: string;
  tag: string;
}

export const PRESET_AVATARS: PresetAvatar[] = [
  { id: 'wave', name: 'Hi there', tag: 'Waves at you' },
  { id: 'vibe', name: 'Vibing', tag: 'Head bobs to music' },
  { id: 'dj', name: 'DJ Mode', tag: 'Beats & headphones' },
  { id: 'cool', name: 'Too Cool', tag: 'Shades on' },
  { id: 'wink', name: 'Wink', tag: 'Cheeky wink' },
  { id: 'star', name: 'Starlight', tag: 'Sparkles around' },
  { id: 'heart', name: 'In Love', tag: 'Beating heart' },
  { id: 'dance', name: 'Dance', tag: 'Side to side' },
  { id: 'rockstar', name: 'Rockstar', tag: 'Headband on' },
  { id: 'sleepy', name: 'Sleepy', tag: 'Catching Zzz' },
];

export const isPresetAvatar = (value: string | null | undefined): value is AvatarVariant => {
  if (!value) return false;
  return PRESET_AVATARS.some(a => a.id === value);
};

/**
 * Returns the URL for a stored image avatar, or null if the value
 * refers to a preset animated avatar (caller should render <AnimatedAvatar />).
 */
export const resolveAvatar = (url: string | null | undefined): string | null => {
  if (!url) return null;
  if (isPresetAvatar(url)) return null;
  return url;
};

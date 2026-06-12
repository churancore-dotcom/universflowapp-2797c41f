// Bridge between Capacitor's native AudioFocus plugin and the web AudioEngine.
// Safe to import in any environment — becomes a no-op outside the Capacitor APK.

declare global {
  interface Window {
    Capacitor?: {
      isNativePlatform: () => boolean;
      Plugins: Record<string, any>;
    };
  }
}

export function initNativeBridge(
  onPause: () => void,
  onResume: () => void
): void {
  if (typeof window === 'undefined') return;
  if (!window.Capacitor?.isNativePlatform?.()) return;

  const { AudioFocus } = window.Capacitor.Plugins;
  if (!AudioFocus) return;

  AudioFocus.addListener('audioFocus', (data: { action: string }) => {
    if (data?.action === 'pause') onPause();
    if (data?.action === 'resume') onResume();
  });

  try {
    AudioFocus.keepAlive?.();
  } catch {
    /* noop */
  }
}

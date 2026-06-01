import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { bypassAudioElement, connectAudioElement, setBands, setReverb, setSpatial, setLateNight, setStudioSpace as engineSetStudioSpace, resume, subscribe, type StudioSpaceId } from '@/lib/audioEngine';
import { usePremium } from '@/hooks/usePremium';

const STORAGE_KEY = 'eq_settings';

interface StoredEQ {
  bands?: number[];
  bassBoost?: number;
  reverb?: number;
  spatialAudio?: boolean;
  playbackSpeed?: number;
  studioSpace?: StudioSpaceId;
  lateNight?: boolean;
}

function readStored(): StoredEQ {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function hasActiveProcessing(s: StoredEQ) {
  return Boolean(
    s.bands?.some((gain) => Math.abs(gain) >= 0.5) ||
    (s.bassBoost ?? 0) > 0 ||
    (s.reverb ?? 0) > 0 ||
    s.spatialAudio ||
    (s.studioSpace && s.studioSpace !== 'off') ||
    s.lateNight ||
    (typeof s.playbackSpeed === 'number' && s.playbackSpeed !== 1)
  );
}

/**
 * Mount once at app root. Connects the engine to the live <audio> element
 * and re-applies persisted EQ settings whenever the source changes.
 */
export function useGlobalAudioEngine(audioElement: HTMLAudioElement | null) {
  const { isPremium, isLoading } = usePremium();

  useEffect(() => {
    if (!audioElement) return;

    const isNativeApk = (() => {
      try { return Capacitor.isNativePlatform?.() === true; }
      catch { return false; }
    })();

    // NOTE: premium status flows through the runtime flag in
    // src/lib/premiumState.ts (set by usePremium after a server fetch).
    // We intentionally no longer write `uf_audio_fx_allowed` to
    // localStorage — that key was trivially editable from DevTools.

    // Track whether processed chain is "wanted" so we can switch to direct
    // when backgrounded (to avoid Android throttling glitches) and restore
    // when foregrounded.
    let processedWanted = false;

    const reapply = () => {
      // APK priority: Spotify-like background reliability beats Web Audio DSP.
      // Android can suspend AudioContext while the app is minimized; keeping the
      // stream on the native <audio> path avoids background pause/error loops.
      if (isNativeApk) {
        bypassAudioElement(audioElement);
        audioElement.playbackRate = 1;
        processedWanted = false;
        return;
      }

      // Browser EQ is available to ALL users (not just premium). On APK we
      // still bypass for background-playback reliability above.
      if (false && !isPremium) {
        bypassAudioElement(audioElement);
        audioElement.playbackRate = 1;
        processedWanted = false;
        return;
      }

      const s = readStored();
      if (!hasActiveProcessing(s)) {
        bypassAudioElement(audioElement);
        audioElement.playbackRate = 1;
        processedWanted = false;
        return;
      }

      processedWanted = true;

      // KEEP EQ CONNECTED across track changes and backgrounding on browser.
      // (APK path already returned above for background-playback reliability.)
      const ok = connectAudioElement(audioElement);
      if (!ok) return;
      setBands(s.bands ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], s.bassBoost ?? 0);
      setReverb(s.reverb ?? 0);
      engineSetStudioSpace(s.studioSpace ?? 'off');
      setSpatial(!!s.spatialAudio);
      setLateNight(!!s.lateNight);
      if (typeof s.playbackSpeed === 'number') audioElement.playbackRate = s.playbackSpeed;
    };

    // Resume the AudioContext on first user gesture / play
    const onPlay = () => resume();
    const onPointer = () => resume();

    // Background → DO NOT swap chains. Disconnecting/reconnecting the
    // MediaElementSource mid-playback causes an audible pop and on Android
    // WebView can stall the stream entirely (suspends AudioContext). Just
    // resume the context when we come back to the foreground.
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') {
        resume();
      }
    };

    if (!isLoading) reapply();
    audioElement.addEventListener('loadedmetadata', reapply);
    audioElement.addEventListener('canplay', reapply);
    audioElement.addEventListener('play', onPlay);
    document.addEventListener('pointerdown', onPointer, { once: true });
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      audioElement.removeEventListener('loadedmetadata', reapply);
      audioElement.removeEventListener('canplay', reapply);
      audioElement.removeEventListener('play', onPlay);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [audioElement, isPremium, isLoading]);
}

export function useEngineState() {
  const [mode, setMode] = useState(() => 'idle' as ReturnType<typeof import('@/lib/audioEngine').getState>);
  useEffect(() => subscribe(setMode), []);
  return mode;
}

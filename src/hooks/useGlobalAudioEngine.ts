import { useEffect, useState } from 'react';
import { connectAudioElement, setBands, setReverb, setSpatial, setLateNight, setStudioSpace as engineSetStudioSpace, resume, subscribe, type StudioSpaceId } from '@/lib/audioEngine';

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

/**
 * Mount once at app root. Connects the engine to the live <audio> element
 * and re-applies persisted EQ settings whenever:
 *  - the audio element instance changes (crossfade swap)
 *  - its `src` attribute changes (next song / queue advance)
 *  - any of: loadstart, loadedmetadata, canplay, playing, emptied fire
 *  - the user changes EQ in the modal (uf-eq-changed event)
 *
 * Critical: we ALWAYS re-push setBands/setReverb/etc on every reapply, even
 * if the engine chain didn't need a rebuild — otherwise a silent disconnect
 * (e.g. AudioContext suspend → resume on Android) would leave EQ neutralised
 * until the user toggled it again. EQ should ONLY go off when the user
 * explicitly disables it.
 */
export function useGlobalAudioEngine(audioElement: HTMLAudioElement | null) {
  useEffect(() => {
    if (!audioElement) return;

    let lastAppliedSrc = '';
    let reapplyTimer: number | null = null;

    const doReapply = () => {
      const s = readStored();
      // Always keep normal HTMLAudio songs attached to the WebAudio graph.
      // Flat EQ still sounds neutral, but the graph remains ready so the next
      // song and the next slider/preset change apply instantly without a
      // silent "direct mode" gap.
      const ok = connectAudioElement(audioElement);
      if (ok) {
        setBands(s.bands ?? [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], s.bassBoost ?? 0);
        setReverb(s.reverb ?? 0);
        engineSetStudioSpace(s.studioSpace ?? 'off');
        setSpatial(!!s.spatialAudio);
        setLateNight(!!s.lateNight);
      }
      if (typeof s.playbackSpeed === 'number') audioElement.playbackRate = s.playbackSpeed;
      lastAppliedSrc = audioElement.currentSrc || audioElement.src || '';
    };

    // Coalesce burst events (loadstart + loadedmetadata + canplay all fire
    // within ms of each other on a track change) into a single rebuild.
    const reapply = () => {
      if (reapplyTimer != null) return;
      reapplyTimer = window.setTimeout(() => {
        reapplyTimer = null;
        doReapply();
      }, 30);
    };

    // Force immediate reapply when src actually changes — catches the
    // crossfade swap case where the audio element is already past canplay
    // by the time we re-attach listeners.
    const reapplyIfSrcChanged = () => {
      const now = audioElement.currentSrc || audioElement.src || '';
      if (now && now !== lastAppliedSrc) reapply();
    };

    // Resume the AudioContext on first user gesture / play
    const onPlay = () => { resume(); reapplyIfSrcChanged(); };
    const onPlaying = () => { resume(); reapplyIfSrcChanged(); };
    const onPointer = () => resume();

    // Background → DO NOT swap chains or even call reapply on foreground.
    // Disconnecting/reconnecting the MediaElementSource mid-playback causes
    // an audible pop and can stall the stream on Android WebView. Just resume
    // the AudioContext when we come back into focus; EQ values are already
    // wired and remain so. This is the Spotify-like contract: nothing the UI
    // does ever interrupts the audio graph.
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') resume();
    };


    // User toggled EQ in modal — apply right now.
    const onEqChanged = () => reapply();

    // Watch for programmatic src changes (PlayerContext sets audio.src on
    // every track change). MutationObserver fires synchronously and BEFORE
    // any media events, so EQ is wired up the instant the new song loads.
    const srcObserver = new MutationObserver(() => reapply());
    srcObserver.observe(audioElement, { attributes: true, attributeFilter: ['src'] });

    doReapply();
    audioElement.addEventListener('loadstart', reapply);
    audioElement.addEventListener('loadedmetadata', reapply);
    audioElement.addEventListener('canplay', reapply);
    audioElement.addEventListener('emptied', reapply);
    audioElement.addEventListener('durationchange', reapplyIfSrcChanged);
    audioElement.addEventListener('play', onPlay);
    audioElement.addEventListener('playing', onPlaying);
    document.addEventListener('pointerdown', onPointer, { once: true });
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('uf-eq-changed', onEqChanged);

    return () => {
      if (reapplyTimer != null) clearTimeout(reapplyTimer);
      srcObserver.disconnect();
      audioElement.removeEventListener('loadstart', reapply);
      audioElement.removeEventListener('loadedmetadata', reapply);
      audioElement.removeEventListener('canplay', reapply);
      audioElement.removeEventListener('emptied', reapply);
      audioElement.removeEventListener('durationchange', reapplyIfSrcChanged);
      audioElement.removeEventListener('play', onPlay);
      audioElement.removeEventListener('playing', onPlaying);
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('uf-eq-changed', onEqChanged);
    };
  }, [audioElement]);
}

export function useEngineState() {
  const [mode, setMode] = useState(() => 'idle' as ReturnType<typeof import('@/lib/audioEngine').getState>);
  useEffect(() => subscribe(setMode), []);
  return mode;
}

// Mirrors all HTMLAudioElement playback control to the native ExoPlayer
// foreground service on Android. On native:
//   - HTMLAudio is muted (still drives ended/timeupdate UI events).
//   - ExoPlayer (in NativeAudioPlayerService) is the audible source, so
//     playback survives backgrounding / screen lock without stuttering.
//   - Lock-screen / Bluetooth transport controls call back into JS via
//     nextRequested / previousRequested events.
//
// On web/iOS this is a complete no-op (HTMLAudio is the only player).

import {
  isNativeAndroid,
  nativeAudioLoad,
  nativeAudioPlay,
  nativeAudioPause,
  nativeAudioSeek,
  nativeAudioSetVolume,
  onNativeAudioEvent,
  type NativeAudioEvent,
} from './nativeAudioPlayer';

export interface NativeMirrorRefs {
  /** Latest currentSong metadata used when load events fire. */
  getMeta: () => {
    title?: string;
    artist?: string;
    album?: string;
    cover?: string;
  } | null;
  onNext: () => void;
  onPrev: () => void;
  /** Called when native ExoPlayer signals end-of-track (fallback when
   *  the HTMLAudio 'ended' event doesn't fire because the WebView was
   *  throttled in background). */
  onEnded: () => void;
}

interface MirrorHandle {
  attach: (audio: HTMLAudioElement) => void;
  detach: () => void;
}

let activeMirror: { audio: HTMLAudioElement; cleanups: Array<() => void> } | null = null;

export function createNativePlaybackMirror(refs: NativeMirrorRefs): MirrorHandle {
  if (!isNativeAndroid()) {
    return { attach: () => {}, detach: () => {} };
  }

  // Wire the lock-screen / BT transport events ONCE for the lifetime of the app.
  // These fire independently of any specific audio element.
  onNativeAudioEvent((e: NativeAudioEvent) => {
    if (e.type === 'nextRequested') refs.onNext();
    else if (e.type === 'previousRequested') refs.onPrev();
    else if (e.type === 'ended') refs.onEnded();
  });

  const attach = (audio: HTMLAudioElement) => {
    detachInternal();
    audio.muted = true; // Silence WebView audio; ExoPlayer is the audible source.

    let lastLoadedSrc = '';
    let suppressNextPlay = false;
    let suppressNextPause = false;

    const handleLoadStart = () => {
      const src = audio.currentSrc || audio.src;
      if (!src || src === lastLoadedSrc) return;
      lastLoadedSrc = src;
      const meta = refs.getMeta() || {};
      void nativeAudioLoad({
        url: src,
        title: meta.title || '',
        artist: meta.artist || '',
        album: meta.album || '',
        cover: meta.cover || '',
        startPositionMs: 0,
      });
    };

    const handlePlay = () => {
      if (suppressNextPlay) { suppressNextPlay = false; return; }
      void nativeAudioPlay();
    };
    const handlePause = () => {
      if (suppressNextPause) { suppressNextPause = false; return; }
      void nativeAudioPause();
    };
    const handleSeeked = () => {
      void nativeAudioSeek(audio.currentTime * 1000);
    };
    const handleVolumeChange = () => {
      // The element itself stays muted; pass the *intent* volume to ExoPlayer.
      void nativeAudioSetVolume(audio.volume);
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('volumechange', handleVolumeChange);

    activeMirror = {
      audio,
      cleanups: [
        () => audio.removeEventListener('loadstart', handleLoadStart),
        () => audio.removeEventListener('play', handlePlay),
        () => audio.removeEventListener('pause', handlePause),
        () => audio.removeEventListener('seeked', handleSeeked),
        () => audio.removeEventListener('volumechange', handleVolumeChange),
      ],
    };
  };

  const detachInternal = () => {
    if (!activeMirror) return;
    activeMirror.cleanups.forEach((fn) => { try { fn(); } catch { /* noop */ } });
    activeMirror = null;
  };

  return { attach, detach: detachInternal };
}

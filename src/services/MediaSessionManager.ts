export function setupMediaSession(handlers: {
  play: () => void;
  pause: () => void;
  previousTrack: () => void;
  nextTrack: () => void;
  track: { title: string; artist: string; album: string; artwork?: string };
}): void {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: handlers.track.title,
    artist: handlers.track.artist,
    album: handlers.track.album,
    artwork: handlers.track.artwork
      ? [{ src: handlers.track.artwork, sizes: '512x512', type: 'image/png' }]
      : [],
  });
  navigator.mediaSession.setActionHandler('play', handlers.play);
  navigator.mediaSession.setActionHandler('pause', handlers.pause);
  navigator.mediaSession.setActionHandler('previoustrack', handlers.previousTrack);
  navigator.mediaSession.setActionHandler('nexttrack', handlers.nextTrack);
}

export function setMediaSessionState(state: 'playing' | 'paused'): void {
  if ('mediaSession' in navigator) {
    navigator.mediaSession.playbackState = state;
  }
}

import { useState, useEffect, useRef, useCallback } from 'react';
import { audioEngine } from '../services/AudioEngine';
import { preloadBuffer } from '../services/AudioBufferLoader';
import { setupMediaSession, setMediaSessionState } from '../services/MediaSessionManager';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  url: string;
  artwork?: string;
}

export function useAudioPlayer(tracks: Track[]) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isPlaying) {
      progressInterval.current = setInterval(() => {
        setCurrentTime(audioEngine.getCurrentTime());
        setDuration(audioEngine.getDuration());
      }, 250);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
    return () => { if (progressInterval.current) clearInterval(progressInterval.current); };
  }, [isPlaying]);

  const loadAndPlay = useCallback(async (index: number) => {
    if (!tracks[index]) return;
    setIsLoading(true);
    const track = tracks[index];
    try {
      const buffer = await preloadBuffer(track.url, audioEngine);
      await audioEngine.play(buffer);
      setIsPlaying(true);
      setDuration(buffer.duration);
      setMediaSessionState('playing');
      setupMediaSession({
        play: () => { audioEngine.resume(); setIsPlaying(true); },
        pause: () => { audioEngine.pause(); setIsPlaying(false); },
        previousTrack: () => playPrev(),
        nextTrack: () => playNext(),
        track,
      });
      if (tracks[index + 1]) preloadBuffer(tracks[index + 1].url, audioEngine);
    } catch (e) {
      console.error('Audio load error:', e);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks]);

  const togglePlay = useCallback(async () => {
    if (!isPlaying) {
      if (audioEngine.getDuration() > 0) {
        audioEngine.resume(); setIsPlaying(true); setMediaSessionState('playing');
      } else {
        await loadAndPlay(currentIndex);
      }
    } else {
      audioEngine.pause(); setIsPlaying(false); setMediaSessionState('paused');
    }
  }, [isPlaying, currentIndex, loadAndPlay]);

  const playNext = useCallback(async () => {
    const next = (currentIndex + 1) % tracks.length;
    setCurrentIndex(next);
    await loadAndPlay(next);
  }, [currentIndex, tracks.length, loadAndPlay]);

  const playPrev = useCallback(async () => {
    const prev = (currentIndex - 1 + tracks.length) % tracks.length;
    setCurrentIndex(prev);
    await loadAndPlay(prev);
  }, [currentIndex, tracks.length, loadAndPlay]);

  const seek = useCallback(async (time: number) => {
    const track = tracks[currentIndex];
    const buffer = await preloadBuffer(track.url, audioEngine);
    await audioEngine.play(buffer, time);
    setCurrentTime(time);
  }, [tracks, currentIndex]);

  const setVolume = useCallback((value: number) => {
    audioEngine.setVolume(value);
    setVolumeState(value);
  }, []);

  const playTrack = useCallback(async (index: number) => {
    setCurrentIndex(index);
    await loadAndPlay(index);
  }, [loadAndPlay]);

  return { currentTrack: tracks[currentIndex], currentIndex, isPlaying, isLoading, currentTime, duration, volume, togglePlay, playNext, playPrev, seek, setVolume, playTrack };
}

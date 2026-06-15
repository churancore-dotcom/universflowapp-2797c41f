import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { usePlayer } from '@/contexts/PlayerContext';
import { usePlayerProgress } from '@/lib/playerProgressStore';
import { Slider } from '@/components/ui/slider';
import { setLockscreenOpen } from '@/lib/lockscreenState';
import LockScreenBackground from '@/components/LockScreenBackground';
import AnimatedLyricsStage from '@/components/AnimatedLyricsStage';
import {
  Play, Pause, SkipBack, SkipForward, Music,
  Shuffle, Repeat, Repeat1, Lock, ChevronDown
} from 'lucide-react';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface LockScreenPlayerProps {
  isOpen: boolean;
  onClose: () => void;
}

// Wake Lock hook to prevent screen timeout
const useWakeLock = (enabled: boolean) => {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!enabled) {
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
      return;
    }
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
        }
      } catch (e) {
        console.warn('Wake Lock not supported:', e);
      }
    };
    requestWakeLock();
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && enabled) requestWakeLock();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, [enabled]);
};

const LockScreenPlayer = ({ isOpen, onClose }: LockScreenPlayerProps) => {
  const {
    currentSong, isPlaying,
    shuffle, repeat, togglePlay, nextSong, prevSong,
    toggleShuffle, toggleRepeat, seek,
  } = usePlayer();
  const { progress, duration } = usePlayerProgress();

  const [time, setTime] = useState(new Date());
  const dragY = useMotionValue(0);
  const dragOpacity = useTransform(dragY, [-200, 0], [0, 1]);

  useWakeLock(isOpen);

  useEffect(() => {
    setLockscreenOpen(isOpen);
    return () => setLockscreenOpen(false);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!currentSong) return null;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -120) onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex flex-col select-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
        >
          {/* Background: animated blurred cover */}
          <LockScreenBackground coverUrl={currentSong.cover_url} isPlaying={isPlaying} />

          {/* Foreground */}
          <motion.div
            className="relative z-10 flex flex-col h-full w-full max-w-[430px] mx-auto"
            style={{ opacity: dragOpacity }}
            drag="y"
            dragConstraints={{ top: -200, bottom: 0 }}
            dragElastic={0.3}
            onDragEnd={handleDragEnd}
          >
            {/* Status bar */}
            <div className="flex items-center justify-between px-6 pt-[env(safe-area-inset-top,12px)] pb-1">
              <Lock className="w-3.5 h-3.5 text-white/40" />
              <button
                onClick={onClose}
                className="w-7 h-7 -m-1.5 rounded-full flex items-center justify-center active:bg-white/10"
                aria-label="Close lock screen"
              >
                <ChevronDown className="w-4 h-4 text-white/55" />
              </button>
            </div>

            {/* Compact clock + track header */}
            <motion.div
              className="text-center mt-1 mb-1 px-6"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="text-[44px] leading-none font-extralight text-white tracking-tight tabular-nums">
                {time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
              </div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/45 font-semibold mt-1.5">
                Now Playing · Lyrics
              </div>
            </motion.div>

            {/* ── Lyrics stage takes the whole middle ── */}
            <div className="flex-1 min-h-0 relative mt-2 mb-2">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`stage-${currentSong.id}`}
                  className="absolute inset-0"
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
                >
                  <AnimatedLyricsStage
                    artist={currentSong.artist}
                    title={currentSong.title}
                    duration={duration}
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Bottom controls bar: glass, minimal ── */}
            <motion.div
              className="mx-3 mb-[env(safe-area-inset-bottom,16px)] mb-4 rounded-[28px] overflow-hidden"
              style={{
                background: 'rgba(18,18,24,0.62)',
                backdropFilter: 'blur(28px) saturate(140%)',
                WebkitBackdropFilter: 'blur(28px) saturate(140%)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                boxShadow: '0 18px 48px -16px rgba(0,0,0,0.55)',
              }}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ delay: 0.18, duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
            >
              <div className="px-4 pt-3.5 pb-3">
                {/* Track row */}
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    className="relative w-11 h-11 rounded-[10px] overflow-hidden flex-shrink-0 shadow-lg"
                    animate={isPlaying ? { scale: [1, 1.025, 1] } : { scale: 1 }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={currentSong.id}
                        className="absolute inset-0"
                        initial={{ opacity: 0, scale: 1.1 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.3 }}
                      >
                        {currentSong.cover_url ? (
                          <img src={currentSong.cover_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-white/10 flex items-center justify-center">
                            <Music className="w-5 h-5 text-white/60" />
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </motion.div>

                  <div className="flex-1 min-w-0">
                    <AnimatePresence mode="popLayout">
                      <motion.div
                        key={currentSong.id}
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.28 }}
                      >
                        <h3 className="text-[14px] font-bold text-white truncate leading-tight">
                          {currentSong.title}
                        </h3>
                        <p className="text-[12px] text-white/55 truncate leading-tight mt-0.5">
                          {currentSong.artist}
                        </p>
                      </motion.div>
                    </AnimatePresence>
                  </div>

                  {isPlaying && (
                    <motion.div
                      className="flex items-end gap-[2px] h-4"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-[3px] rounded-full bg-primary"
                          animate={{ height: ['6px', '14px', '6px'] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                        />
                      ))}
                    </motion.div>
                  )}
                </div>

                {/* Progress */}
                <div className="mb-2">
                  <Slider
                    value={[progress]}
                    max={duration || 100}
                    step={0.1}
                    onValueChange={([v]) => seek(v)}
                    className="[&_[role=slider]]:w-[12px] [&_[role=slider]]:h-[12px] [&_[role=slider]]:bg-white [&_[role=slider]]:border-0 [&_[role=slider]]:shadow-md [&_[data-radix-slider-track]]:h-[2.5px] [&_[data-radix-slider-track]]:bg-white/15 [&_[data-radix-slider-range]]:bg-white/90"
                  />
                  <div className="flex justify-between mt-1 text-[10px] text-white/45 font-medium tabular-nums px-0.5">
                    <span>{formatTime(progress)}</span>
                    <span>-{formatTime(Math.max(0, duration - progress))}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between px-1">
                  <motion.button
                    onClick={toggleShuffle}
                    className="w-9 h-9 flex items-center justify-center rounded-full"
                    whileTap={{ scale: 0.82 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <Shuffle className={`w-[15px] h-[15px] ${shuffle ? 'text-primary' : 'text-white/40'}`} />
                  </motion.button>

                  <motion.button
                    onClick={prevSong}
                    className="w-11 h-11 flex items-center justify-center"
                    whileTap={{ scale: 0.82 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <SkipBack className="w-[22px] h-[22px] text-white" fill="white" />
                  </motion.button>

                  <motion.button
                    onClick={togglePlay}
                    className="w-[58px] h-[58px] rounded-full bg-white flex items-center justify-center shadow-xl"
                    whileTap={{ scale: 0.88 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      {isPlaying ? (
                        <motion.div
                          key="pause"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Pause className="w-[26px] h-[26px] text-black" fill="black" />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="play"
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0.5, opacity: 0 }}
                          transition={{ duration: 0.15 }}
                        >
                          <Play className="w-[26px] h-[26px] text-black ml-0.5" fill="black" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <motion.button
                    onClick={nextSong}
                    className="w-11 h-11 flex items-center justify-center"
                    whileTap={{ scale: 0.82 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    <SkipForward className="w-[22px] h-[22px] text-white" fill="white" />
                  </motion.button>

                  <motion.button
                    onClick={toggleRepeat}
                    className="w-9 h-9 flex items-center justify-center rounded-full"
                    whileTap={{ scale: 0.82 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  >
                    {repeat === 'one' ? (
                      <Repeat1 className="w-[15px] h-[15px] text-primary" />
                    ) : (
                      <Repeat className={`w-[15px] h-[15px] ${repeat !== 'off' ? 'text-primary' : 'text-white/40'}`} />
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Swipe-up hint */}
            <motion.div
              className="flex justify-center pb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div
                className="w-[36px] h-[5px] bg-white/25 rounded-full"
                animate={{ opacity: [0.25, 0.5, 0.25] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LockScreenPlayer;

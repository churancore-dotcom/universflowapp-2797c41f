import { motion, AnimatePresence } from 'framer-motion';
import { Music } from 'lucide-react';
import type { LockScreenThemeId } from '@/lib/lockScreenTheme';

interface Props {
  themeId?: LockScreenThemeId;
  coverUrl?: string | null;
  title: string;
  songId: string;
  isPlaying?: boolean;
}

const COVER_SIZE = 'min(58vw, 240px)';

/**
 * Lock-screen hero artwork.
 *
 * - `vinyl` (default): cover on the left with a spinning vinyl disc peeking
 *   from behind on the right. CSS `animation-play-state` is used so pausing
 *   the song pauses the disc without React re-rendering anything.
 * - All other themes: clean static cover with a crossfade on song change.
 */
const LockScreenArtwork = ({ themeId = 'vinyl', coverUrl, title, songId, isPlaying }: Props) => {
  if (themeId === 'vinyl') {
    return (
      <div className="flex justify-center items-center px-6 mb-2">
        <div className="relative" style={{ width: COVER_SIZE, aspectRatio: '1.3 / 1' }}>
          {/* Spinning vinyl disc — peeks out to the right behind the cover */}
          <div
            className="absolute top-1/2 -translate-y-1/2 rounded-full"
            style={{
              right: '0',
              width: '78%',
              aspectRatio: '1 / 1',
              background:
                'radial-gradient(circle at 50% 50%, #ff2d55 0%, #ff2d55 12%, #0a0a0a 14%, #0a0a0a 100%)',
              boxShadow:
                '0 12px 30px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)',
              animation: 'lockfxSpin 6s linear infinite',
              animationPlayState: isPlaying ? 'running' : 'paused',
              willChange: 'transform',
              transform: 'translateZ(0) translateY(-50%)',
            }}
            aria-hidden
          >
            {/* Subtle grooves */}
            <div
              className="absolute inset-[8%] rounded-full pointer-events-none"
              style={{
                background:
                  'repeating-radial-gradient(circle, rgba(255,255,255,0.025) 0 1px, transparent 1px 4px)',
              }}
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ width: '18%', aspectRatio: '1/1', background: '#ff2d55' }}
            />
            <div
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black"
              style={{ width: '4%', aspectRatio: '1/1' }}
            />
          </div>

          {/* Cover artwork — overlays the disc, anchored left */}
          <div
            className="absolute top-1/2 -translate-y-1/2 left-0 rounded-[18px] overflow-hidden"
            style={{
              width: '74%',
              aspectRatio: '1 / 1',
              boxShadow:
                '0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08) inset',
            }}
          >
            <AnimatePresence mode="popLayout">
              <motion.div
                key={songId}
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
              >
                {coverUrl ? (
                  <img
                    src={coverUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full bg-white/10 flex items-center justify-center">
                    <Music className="w-14 h-14 text-white/60" />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  // Other themes: clean square cover.
  return (
    <div className="flex justify-center items-center px-6 mb-2">
      <div className="relative" style={{ width: 'min(64vw, 260px)', aspectRatio: '1 / 1' }}>
        <div
          className="absolute inset-0 rounded-[24px] overflow-hidden"
          style={{
            boxShadow:
              '0 30px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08) inset',
          }}
        >
          <AnimatePresence mode="popLayout">
            <motion.div
              key={songId}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
            >
              {coverUrl ? (
                <img src={coverUrl} alt={title} className="w-full h-full object-cover" draggable={false} />
              ) : (
                <div className="w-full h-full bg-white/10 flex items-center justify-center">
                  <Music className="w-16 h-16 text-white/60" />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default LockScreenArtwork;

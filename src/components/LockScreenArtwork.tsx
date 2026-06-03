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

const COVER_SIZE = 'min(64vw, 260px)';

/**
 * Single classic lock-screen artwork: a clean square cover with soft shadow.
 * Song-change crossfade only — no spin, no pulse, no tilt.
 */
const LockScreenArtwork = ({ coverUrl, title, songId }: Props) => {
  return (
    <div className="flex justify-center items-center px-6 mb-2">
      <div className="relative" style={{ width: COVER_SIZE, aspectRatio: '1 / 1' }}>
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
                <img
                  src={coverUrl}
                  alt={title}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
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

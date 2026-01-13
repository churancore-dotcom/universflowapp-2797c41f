import { motion } from 'framer-motion';
import { iosSpring } from '@/lib/animations';

interface SplashScreenProps {
  onComplete: () => void;
}

const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  return (
    <motion.div
      className="fixed inset-0 bg-black flex items-center justify-center z-50"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      onAnimationComplete={() => {
        setTimeout(onComplete, 2500);
      }}
    >
      {/* Animated ambient background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Primary glow */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(211 100% 50% / 0.3), transparent 60%)',
            filter: 'blur(60px)',
          }}
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.4, 0.6, 0.4],
            x: [-50, 50, -50],
            y: [-30, 30, -30],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        {/* Secondary glow */}
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(328 100% 54% / 0.25), transparent 60%)',
            filter: 'blur(60px)',
          }}
          animate={{
            scale: [1.3, 1, 1.3],
            opacity: [0.3, 0.5, 0.3],
            x: [30, -30, 30],
            y: [20, -20, 20],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
        {/* Tertiary purple glow */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(270 100% 60% / 0.2), transparent 60%)',
            filter: 'blur(80px)',
          }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
        />
      </div>

      <div className="relative flex flex-col items-center">
        {/* Animated Logo */}
        <motion.div
          className="relative"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            ...iosSpring,
            delay: 0.2,
          }}
        >
          {/* Outer ring animation */}
          <motion.div
            className="absolute -inset-4 rounded-full"
            style={{
              background: 'conic-gradient(from 0deg, hsl(211 100% 50%), hsl(270 100% 60%), hsl(328 100% 54%), hsl(211 100% 50%))',
              opacity: 0.6,
            }}
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
          />
          <motion.div
            className="absolute -inset-4 rounded-full bg-black/80"
          />
          
          {/* Main logo container */}
          <motion.div
            className="w-32 h-32 rounded-[32px] flex items-center justify-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(211 100% 50%), hsl(270 100% 60%), hsl(328 100% 54%))',
            }}
            animate={{
              boxShadow: [
                "0 0 40px hsl(211 100% 50% / 0.5)",
                "0 0 80px hsl(270 100% 60% / 0.6), 0 0 120px hsl(328 100% 54% / 0.4)",
                "0 0 40px hsl(211 100% 50% / 0.5)",
              ]
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {/* Inner highlight */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent" />
            
            {/* Animated Flow Icon */}
            <motion.div className="relative z-10 flex items-center justify-center">
              <svg 
                width="64" 
                height="64" 
                viewBox="0 0 64 64" 
                fill="none"
                className="text-white"
              >
                {/* Infinity/Flow symbol */}
                <motion.path
                  d="M16 32C16 32 20 24 28 24C36 24 32 40 40 40C48 40 48 32 48 32C48 32 48 24 40 24C32 24 36 40 28 40C20 40 16 32 16 32Z"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
                />
                {/* Music note accent */}
                <motion.circle
                  cx="32"
                  cy="18"
                  r="4"
                  fill="currentColor"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.3 }}
                />
                <motion.path
                  d="M36 18V10"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ delay: 1.3, duration: 0.3 }}
                />
              </svg>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Animated waveform */}
        <motion.div
          className="flex items-center justify-center gap-1.5 mt-12 h-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...iosSpring, delay: 0.8 }}
        >
          {[...Array(9)].map((_, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full"
              style={{
                background: `linear-gradient(to top, hsl(211 100% 60%), hsl(328 100% 60%))`,
              }}
              animate={{
                height: [4, 24 + Math.sin(i * 0.8) * 12, 4],
              }}
              transition={{
                duration: 0.6 + Math.random() * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.06,
              }}
            />
          ))}
        </motion.div>

        {/* Brand name - Univers Flow */}
        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...iosSpring, delay: 1 }}
        >
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="gradient-text">Univers</span>
            <span className="text-white ml-2">Flow</span>
          </h1>
        </motion.div>

        <motion.p
          className="mt-3 text-muted-foreground text-sm font-medium tracking-wide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.5 }}
        >
          Premium Music Experience
        </motion.p>

        {/* Creator credit */}
        <motion.p
          className="mt-8 text-[11px] text-muted-foreground/60 font-medium tracking-widest uppercase"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.6 }}
        >
          by Shashank Yadav
        </motion.p>
      </div>
    </motion.div>
  );
};

export default SplashScreen;

import { useEffect, useRef } from 'react';
import splashVideo from '@/assets/splash.mp4.asset.json';

interface SplashScreenProps {
  onComplete: () => void;
}

/**
 * SplashScreen — full-bleed branded video.
 * No logo/text overlay, no fade-in delay. Fires onComplete the moment the
 * video ends, or after a hard cap so we never block the app.
 */
const SplashScreen = ({ onComplete }: SplashScreenProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  };

  useEffect(() => {
    // Hard cap so a broken video never wedges the app
    const cap = window.setTimeout(finish, 3500);
    // Try to start playback even if autoplay attribute is ignored on some webviews
    videoRef.current?.play().catch(() => finish());
    return () => window.clearTimeout(cap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={splashVideo.url}
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={finish}
        onError={finish}
        className="h-auto w-[55vw] max-w-[260px] object-contain"
      />
    </div>
  );
};

export default SplashScreen;

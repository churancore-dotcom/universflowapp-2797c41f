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
    <div className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col items-center justify-center overflow-hidden bg-black">
      {/* Crop bottom strip to hide Gemini watermark while keeping the logo centered */}
      <div
        className="relative overflow-hidden"
        style={{ width: 'min(55vw, 260px)', height: 'min(49.5vw, 234px)' }}
      >
        <video
          ref={videoRef}
          src={splashVideo.url}
          autoPlay
          muted
          playsInline
          preload="auto"
          onEnded={finish}
          onError={finish}
          className="absolute left-0 top-0 w-full"
          style={{ height: 'calc(100% / 0.9)' }}
        />
      </div>
      <div
        className="mt-6 text-white"
        style={{
          fontSize: 22,
          letterSpacing: '0.32em',
          fontWeight: 600,
        }}
      >
        UNIVERS FLOW
      </div>
    </div>
  );
};

export default SplashScreen;

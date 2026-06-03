import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Smartphone, Headphones, WifiOff, Sparkles, Star, ShieldCheck, Apple } from 'lucide-react';
import { isMedianApp } from '@/lib/median';
import { useAuth } from '@/contexts/AuthContext';

const APK_URL = '/UniversFlow.apk';
const APK_VERSION = '1.0';
const APK_SIZE = '~24 MB';

const GetApp = () => {
  const { user } = useAuth();
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || '';
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    document.title = 'Download Universflow APK — Free Music App for Android';
  }, []);

  const openWebHref = user ? '/home' : '/auth';

  const features = useMemo(() => ([
    { icon: Headphones, title: 'Unlimited streaming', desc: 'Millions of songs. No skip limits.' },
    { icon: WifiOff, title: 'Offline downloads', desc: 'Save tracks. Play in airplane mode.' },
    { icon: Sparkles, title: 'Studio-grade audio', desc: '8-band EQ, spatial, late-night mode.' },
  ]), []);

  return (
    <div className="min-h-[100dvh] w-full bg-black text-white overflow-x-hidden relative">
      {/* Static rose glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[140vw] h-[80vh] opacity-60"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(255,45,85,0.35) 0%, rgba(255,45,85,0.08) 35%, transparent 65%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-0 w-full h-[40vh] opacity-40"
        style={{
          background: 'radial-gradient(ellipse at bottom, rgba(255,45,85,0.2) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[480px] px-5 pt-10 pb-16 flex flex-col">
        {/* Brand */}
        <header className="flex items-center justify-between mb-12">
          <div className="flex items-center gap-2">
            <img src="/pwa-192x192.png" alt="Universflow" className="w-9 h-9 rounded-[10px]" />
            <span className="text-[17px] font-semibold tracking-tight">Universflow</span>
          </div>
          <Link
            to={openWebHref}
            className="text-[13px] text-white/60 hover:text-white transition-colors"
          >
            Open web →
          </Link>
        </header>

        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF2D55] animate-pulse" />
            <span className="text-[11px] tracking-wide uppercase text-white/70">
              v{APK_VERSION} • Android APK
            </span>
          </div>

          <h1 className="text-[40px] leading-[1.05] font-bold tracking-tight mb-4">
            Music, the way<br />
            <span className="bg-gradient-to-r from-[#FF2D55] to-[#FF6B8A] bg-clip-text text-transparent">
              it should sound.
            </span>
          </h1>

          <p className="text-[15px] text-white/70 leading-relaxed max-w-[340px] mx-auto mb-8">
            Universflow is a free music app built for Android. Stream millions of songs, download for offline, no credit card.
          </p>

          {/* Primary CTA */}
          {!isIOS ? (
            <motion.a
              whileTap={{ scale: 0.97 }}
              href={APK_URL}
              download
              className="group inline-flex items-center justify-center gap-2.5 w-full max-w-[320px] h-[58px] rounded-2xl bg-[#FF2D55] text-white font-semibold text-[17px] shadow-[0_10px_40px_-10px_rgba(255,45,85,0.6)] active:shadow-[0_6px_20px_-8px_rgba(255,45,85,0.5)] transition-shadow"
            >
              <Download className="w-5 h-5" />
              Download APK
            </motion.a>
          ) : (
            <div className="inline-flex flex-col items-center gap-3 w-full max-w-[320px] p-5 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-center gap-2 text-white/90">
                <Apple className="w-5 h-5" />
                <span className="font-semibold text-[15px]">iPhone install</span>
              </div>
              <p className="text-[13px] text-white/65 text-center leading-snug">
                Tap <strong>Share</strong> in Safari, then <strong>Add to Home Screen</strong>. Universflow runs as a full app.
              </p>
              <Link
                to={openWebHref}
                className="mt-1 inline-flex items-center justify-center gap-2 h-11 px-6 rounded-xl bg-[#FF2D55] text-white font-semibold text-[14px]"
              >
                Open in Safari
              </Link>
            </div>
          )}

          <div className="mt-3 text-[12px] text-white/40">
            Free • {APK_SIZE} • Android 5.1+
          </div>

          {!isIOS && (
            <Link
              to={openWebHref}
              className="mt-5 inline-block text-[14px] text-white/55 hover:text-white/85 underline-offset-4 hover:underline"
            >
              or use the web player
            </Link>
          )}
        </motion.section>

        {/* Trust strip */}
        <div className="flex items-center justify-center gap-5 mb-12 text-[12px] text-white/55">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 fill-[#FF2D55] text-[#FF2D55]" />
            <span>4.8</span>
          </div>
          <span className="w-px h-3 bg-white/15" />
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Safe install</span>
          </div>
          <span className="w-px h-3 bg-white/15" />
          <div className="flex items-center gap-1">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android</span>
          </div>
        </div>

        {/* Features */}
        <section className="space-y-3 mb-12">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 + i * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start gap-4 p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06]"
            >
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#FF2D55]/15 flex items-center justify-center">
                <f.icon className="w-5 h-5 text-[#FF2D55]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[15px] font-semibold text-white mb-0.5">{f.title}</h3>
                <p className="text-[13px] text-white/55 leading-snug">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </section>

        {/* Secondary download CTA */}
        {!isIOS && (
          <div className="mb-10 p-5 rounded-2xl bg-gradient-to-br from-[#FF2D55]/15 to-transparent border border-[#FF2D55]/20 text-center">
            <h4 className="text-[16px] font-semibold mb-1.5">Ready to install?</h4>
            <p className="text-[13px] text-white/60 mb-4">
              Tap below. Allow installs from this source if Android asks.
            </p>
            <a
              href={APK_URL}
              download
              className="inline-flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-white text-black font-semibold text-[15px] active:scale-[0.98] transition-transform"
            >
              <Download className="w-4 h-4" />
              Get Universflow.apk
            </a>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-auto pt-6 border-t border-white/[0.06] flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12px] text-white/40">
          <Link to="/premium" className="hover:text-white/70">Premium</Link>
          <Link to="/support" className="hover:text-white/70">Support</Link>
          <Link to={openWebHref} className="hover:text-white/70">Web app</Link>
          <span>© Universflow</span>
        </footer>
      </div>
    </div>
  );
};

export default GetApp;

// Re-export the webview guard so App.tsx can decide root behavior
export const shouldShowLandingAtRoot = (loggedIn: boolean) => {
  if (loggedIn) return false;
  if (isMedianApp) return false;
  // Capacitor native shell
  if (typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.()) return false;
  return true;
};

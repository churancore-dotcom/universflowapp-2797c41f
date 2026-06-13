import { Link } from "react-router-dom";
import { Download, Share2, ShieldCheck, ArrowUpRight } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const APK_URL = "https://kzaeahjeqlihmxrfhjqd.supabase.co/storage/v1/object/public/music/releases/UniversFlow.apk";
const VERSION = "1.0.0";
const SIZE = "11 MB";

const SHOTS = [
  { src: "/screenshots/player.png", alt: "Now Playing — fullscreen Apple Music-style player", rotate: -4, offset: 10 },
  { src: "/screenshots/home.png",   alt: "Universflow home — personalized recommendations", rotate: 6, offset: -20 },
  { src: "/screenshots/library.png", alt: "Your Library — liked songs and playlists", rotate: -3, offset: 20 },
  { src: "/screenshots/search.png",  alt: "Discover — search songs and artists", rotate: 4, offset: -10 },
];

const PILLARS = [
  {
    n: "01",
    title: "Native performance.",
    body: "A custom audio engine with gapless playback, smart prefetch and a frame-perfect player UI — engineered for mid-range Android.",
  },
  {
    n: "02",
    title: "Privacy first.",
    body: "No ad-network SDKs. No third-party trackers. Permissions limited to playback, downloads and notifications. Hosted directly on universflow.in.",
  },
  {
    n: "03",
    title: "Studio-grade EQ.",
    body: "An 8-band parametric equalizer with dynamics compression — tuned for earbuds, dialed for speakers, ready for headphones.",
  },
  {
    n: "04",
    title: "Truly offline.",
    body: "Save tracks straight to the device. Plane mode, metro tunnel, dead spot — the music keeps flowing.",
  },
];

const STEPS = [
  { n: 1, t: "Allow Unknown Sources", b: "First-time only — your browser will ask, just tap allow." },
  { n: 2, t: "Open Universflow.apk", b: "Pull down the notification or tap the file in Downloads." },
  { n: 3, t: "Install · Open · Play", b: "You're in. No account required to start listening." },
];

const handleShare = async () => {
  const data = {
    title: "Universflow",
    text: "Stream music free on Android — Universflow APK",
    url: "https://universflow.in/get",
  };
  try {
    if (navigator.share) await navigator.share(data);
    else await navigator.clipboard.writeText(data.url);
  } catch {
    /* ignore */
  }
};

const GetApp = () => {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "MobileApplication",
      name: "Universflow",
      operatingSystem: "ANDROID",
      applicationCategory: "MusicApplication",
      url: "https://universflow.in/get",
      installUrl: APK_URL,
      downloadUrl: APK_URL,
      softwareVersion: VERSION,
      fileSize: SIZE,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      image: "https://universflow.in/pwa-512x512.png",
      screenshot: SHOTS.map((s) => `https://universflow.in${s.src}`),
      description:
        "Free music streaming and download app for Android. Stream millions of songs, build playlists, and listen offline.",
    },
    {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: "How to install Universflow APK on Android",
      step: STEPS.map((s) => ({ "@type": "HowToStep", name: s.t, text: s.b })),
    },
  ];

  return (
    <>
      <SEOHead
        title="Universflow APK — Free Music App for Android"
        description="Download Universflow APK for Android. Stream millions of songs free, build playlists, and listen offline. No credit card required."
        path="/get"
        keywords="Univers Flow App, Universflow APK download, Universflow Android app, free music app Android APK, music streaming APK"
        type="website"
        jsonLd={jsonLd}
        jsonLdId="getapp-jsonld"
      />

      {/* Editorial fonts */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@1,700;1,900&display=swap"
      />

      <main className="min-h-[100dvh] w-full bg-[#050505] text-white overflow-x-hidden selection:bg-[#FF2D55] selection:text-white">
        <div className="w-full max-w-[430px] mx-auto">
          {/* ─── HERO ─────────────────────────────────────────── */}
          <section className="relative pt-14 pb-24 px-6">
            <div
              aria-hidden
              className="pointer-events-none absolute top-0 right-0 w-64 h-64 rounded-full opacity-40"
              style={{
                background:
                  "radial-gradient(closest-side, rgba(255,45,85,0.55), rgba(255,45,85,0) 70%)",
                filter: "blur(60px)",
              }}
            />

            <div className="flex items-center gap-3 mb-10">
              <div className="h-px w-8 bg-[#FF2D55]" />
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-[#FF2D55]">
                Universflow · Android
              </span>
            </div>

            <h1 className="text-[64px] font-black leading-[0.88] tracking-tighter mb-7">
              MUSIC
              <br />
              <span
                className="italic text-[#FF2D55] pr-1"
                style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900 }}
              >
                actually
              </span>
              <br />
              FLOWS.
            </h1>

            <p className="text-[17px] text-white/55 leading-relaxed mb-12 max-w-[300px]">
              A handcrafted music experience for the Android purist. No gates. No accounts. Just sound.
            </p>

            <div className="relative inline-block">
              <a
                href={APK_URL}
                download
                className="bg-[#FF2D55] text-white px-9 py-5 rounded-full font-bold text-[17px] inline-flex items-center gap-3 shadow-[0_20px_50px_-10px_rgba(255,45,85,0.55)] active:scale-[0.97] transition-transform"
              >
                <Download className="w-5 h-5" />
                Download APK
              </a>
              <div className="absolute -bottom-8 left-2 flex items-center gap-3 text-[10px] text-white/40 font-semibold tracking-[0.18em]">
                <span>V{VERSION}</span>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span>{SIZE.toUpperCase()}</span>
                <span className="w-1 h-1 rounded-full bg-white/30" />
                <span>ANDROID 5.1+</span>
              </div>
            </div>

            <div className="mt-16 flex items-center gap-6">
              <button
                onClick={handleShare}
                className="flex items-center gap-1.5 text-xs text-white/60 active:text-white"
              >
                <Share2 className="w-3.5 h-3.5" /> Share
              </button>
              <Link
                to="/auth"
                className="text-xs text-white/60 underline underline-offset-4 decoration-white/20 hover:text-white"
              >
                Try in browser first
              </Link>
            </div>
          </section>

          {/* ─── SCREENSHOT EDITORIAL STAGE ───────────────────── */}
          <section className="relative h-[460px] px-6 mb-8">
            {SHOTS.slice(0, 2).map((s, i) => (
              <div
                key={s.src}
                className={`absolute top-0 w-[230px] h-[420px] rounded-[32px] border border-white/10 bg-[#0a0a0a] overflow-hidden shadow-2xl ${
                  i === 0 ? "left-2 z-0" : "right-[-20px] z-10"
                }`}
                style={{
                  transform: `rotate(${s.rotate}deg) translateY(${s.offset}px)`,
                }}
              >
                <img
                  src={s.src}
                  alt={s.alt}
                  loading={i === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </section>

          {/* ─── PILLARS ──────────────────────────────────────── */}
          <section className="px-6 py-20">
            <h2 className="text-[32px] font-bold tracking-tight leading-[1.05] mb-14">
              Built for the
              <br />
              <span className="text-[#FF2D55]">uncompromised.</span>
            </h2>

            <div className="grid gap-12">
              {PILLARS.map((p) => (
                <article key={p.n} className="group">
                  <div
                    className="text-[44px] italic text-white/15 leading-none mb-2 transition-colors group-hover:text-[#FF2D55]/30"
                    style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700 }}
                  >
                    {p.n}
                  </div>
                  <h3 className="text-[19px] font-bold mb-1.5 tracking-tight">{p.title}</h3>
                  <p className="text-[14px] text-white/45 leading-relaxed max-w-[320px]">
                    {p.body}
                  </p>
                </article>
              ))}
            </div>
          </section>

          {/* ─── INSTALL CARD ─────────────────────────────────── */}
          <section className="px-6 mb-20">
            <div className="p-8 rounded-[32px] bg-[#0e0e0e] border border-white/[0.07]">
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#FF2D55] uppercase block mb-7">
                Installation Guide
              </span>
              <div className="space-y-6">
                {STEPS.map((s) => (
                  <div key={s.n} className="flex gap-4">
                    <div className="w-7 h-7 rounded-full border border-white/15 flex items-center justify-center text-[11px] font-semibold shrink-0 mt-0.5">
                      {s.n}
                    </div>
                    <div>
                      <p className="text-[14px] font-semibold text-white">{s.t}</p>
                      <p className="text-[13px] text-white/45 mt-1 leading-relaxed">{s.b}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ─── TRUST STRIP ──────────────────────────────────── */}
          <section className="px-6 mb-20">
            <div className="flex items-center justify-between border-y border-white/5 py-5">
              <div className="flex items-center gap-2 text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">
                <ShieldCheck className="w-3.5 h-3.5" /> Verified Safe
              </div>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">
                Direct Host
              </div>
              <span className="w-1 h-1 rounded-full bg-white/15" />
              <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/40">
                Ad Free
              </div>
            </div>
          </section>

          {/* ─── FINAL CTA ────────────────────────────────────── */}
          <section className="px-6 pb-12">
            <div className="bg-[#FF2D55] p-10 rounded-[40px] text-center relative overflow-hidden">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-20 -right-20 w-60 h-60 rounded-full bg-white/10 blur-3xl"
              />
              <h2 className="text-[30px] font-black leading-[1.05] mb-8 tracking-tight relative">
                Ready to
                <br />
                change your
                <br />
                <span
                  className="italic font-normal"
                  style={{ fontFamily: "'Playfair Display', serif", fontWeight: 900 }}
                >
                  rhythm?
                </span>
              </h2>
              <a
                href={APK_URL}
                download
                className="w-full bg-white text-black py-5 rounded-full font-extrabold text-[13px] uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2 active:scale-[0.97] transition-transform relative"
              >
                Get Universflow · {SIZE}
                <ArrowUpRight className="w-4 h-4" />
              </a>
              <p className="mt-6 text-[10px] font-bold text-white/70 tracking-[0.25em] uppercase relative">
                Free Forever · No Sign-up
              </p>
            </div>
          </section>

          {/* ─── FOOTER ───────────────────────────────────────── */}
          <footer className="px-6 py-10 text-center border-t border-white/5">
            <div className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/50 mb-3">
              Universflow
            </div>
            <div className="flex items-center justify-center gap-5 text-[11px] text-white/40">
              <Link to="/premium" className="hover:text-white">Premium</Link>
              <Link to="/support" className="hover:text-white">Support</Link>
              <Link to="/auth" className="hover:text-white">Sign in</Link>
            </div>
            <div className="mt-4 text-[10px] text-white/25">v{VERSION} · © Universflow</div>
          </footer>
        </div>
      </main>
    </>
  );
};

export default GetApp;

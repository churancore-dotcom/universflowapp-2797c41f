import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getArtistDestination } from '@/lib/artistRouting';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, AtSign,
  Mic, BadgeCheck, Music2, Sparkles, ArrowLeft, User as UserIcon, Phone, Calendar,
} from 'lucide-react';
import { toast } from 'sonner';
import { FadeTransition } from '@/components/PageTransition';
import SEOHead from '@/components/SEOHead';

function detectCountryCode(): string | undefined {
  try {
    const locale = (Intl.DateTimeFormat().resolvedOptions().locale || '').toUpperCase();
    const m = locale.match(/-([A-Z]{2})\b/);
    return m?.[1];
  } catch { return undefined; }
}

type Mode = 'login' | 'signup';

// Compact common list. Stored as dial code on the phone field.
const DIAL_CODES: Array<[string, string, string]> = [
  ['IN', '+91', '🇮🇳'],
  ['US', '+1', '🇺🇸'],
  ['GB', '+44', '🇬🇧'],
  ['CA', '+1', '🇨🇦'],
  ['AU', '+61', '🇦🇺'],
  ['DE', '+49', '🇩🇪'],
  ['FR', '+33', '🇫🇷'],
  ['BR', '+55', '🇧🇷'],
  ['JP', '+81', '🇯🇵'],
  ['AE', '+971', '🇦🇪'],
];

const panelVariants = {
  initial: (isLogin: boolean) => ({ opacity: 0, y: 16, x: isLogin ? -8 : 8, filter: 'blur(8px)' }),
  animate: { opacity: 1, y: 0, x: 0, filter: 'blur(0px)' },
  exit: (isLogin: boolean) => ({ opacity: 0, y: -8, x: isLogin ? 8 : -8, filter: 'blur(8px)' }),
};

function ageFromDob(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}

const ArtistAuth = () => {
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [dialIso, setDialIso] = useState(detectCountryCode() || 'IN');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const isLogin = mode === 'login';
  const dial = useMemo(
    () => DIAL_CODES.find(([iso]) => iso === dialIso) ?? DIAL_CODES[0],
    [dialIso],
  );
  const age = ageFromDob(dob);
  const maxDob = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 13);
    return d.toISOString().slice(0, 10);
  }, []);

  const signupValid =
    fullName.trim().length >= 2 &&
    username.trim().length >= 3 &&
    /\S+@\S+\.\S+/.test(email) &&
    password.length >= 6 &&
    phone.replace(/\D/g, '').length >= 6 &&
    age !== null && age >= 13 &&
    agreeTerms && agreePrivacy;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navigator.onLine) {
      toast.error('You are offline. Connect to the internet and try again.');
      return;
    }
    if (!isLogin) {
      if (age !== null && age < 13) {
        toast.error('You must be at least 13 to create an artist account.');
        return;
      }
      if (!agreeTerms || !agreePrivacy) {
        toast.error('Please accept the Artist Terms and Privacy Policy.');
        return;
      }
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if ((error as Error & { code?: string }).message === 'EMAIL_NOT_VERIFIED') {
            try {
              await supabase.functions.invoke('send-verification-link', { body: { email } });
            } catch { /* non-fatal */ }
            navigate(
              `/check-email?email=${encodeURIComponent(email)}&next=${encodeURIComponent('/artist/apply')}`,
              { state: { email, next: '/artist/apply' }, replace: true },
            );
            return;
          }
          toast.error(error.message);
          return;
        }
        // Strict separation: only accounts that signed up as an artist (have
        // the artist role or any application on file) can sign in here.
        // Pure listener accounts get rejected — they must use /auth instead.
        const authedUser = (await supabase.auth.getUser()).data.user;
        const destination = await getArtistDestination(authedUser);
        if (!destination) {
          await supabase.auth.signOut();
          toast.error('No artist account found for this email. Please sign up as an artist first.');
          return;
        }
        navigate(destination, { replace: true });
      } else {
        const fullPhone = `${dial[1]} ${phone.trim()}`;
        const { error } = await signUp(email, password, username, dial[0]);
        if (error) { toast.error(error.message); return; }

        // Stash artist-specific signup details to prefill the Apply form.
        try {
          localStorage.setItem(
            'uf_artist_signup',
            JSON.stringify({
              full_name: fullName.trim(),
              phone: fullPhone,
              country_code: dial[0],
              dob,
              account_type: 'artist',
            }),
          );
        } catch { /* ignore quota */ }

        // Best-effort: store on the auth user for future use.
        try {
          await supabase.auth.updateUser({
            data: {
              full_name: fullName.trim(),
              phone: fullPhone,
              dob,
              account_type: 'artist',
            },
          });
        } catch { /* non-fatal */ }

        localStorage.setItem('uf_just_signed_up', '1');
        localStorage.setItem('uf_post_verify_next', '/artist/apply');
        navigate(
          `/check-email?email=${encodeURIComponent(email)}&u=${encodeURIComponent(username)}&next=${encodeURIComponent('/artist/apply')}`,
          { state: { email, username, next: '/artist/apply' }, replace: true },
        );
        supabase.functions
          .invoke('send-verification-link', { body: { email, username } })
          .catch((er) => console.warn('verification email failed:', er));
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FadeTransition>
      <div className="min-h-[100dvh] bg-background text-foreground flex flex-col px-5 py-6 relative overflow-y-auto">
        <SEOHead
          title="Artists — Sign in to Universflow"
          description="Get verified on Universflow. Sign in or create your artist account to upload music, grow your audience, and reach new fans."
          path="/artist/auth"
        />

        {/* Cinematic spotlight background */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 18% -10%, hsl(340 100% 55% / 0.32) 0%, transparent 48%),' +
              'radial-gradient(ellipse at 90% 110%, hsl(42 100% 60% / 0.18) 0%, transparent 50%),' +
              'radial-gradient(ellipse at 50% 50%, hsl(0 0% 100% / 0.03) 0%, transparent 70%)',
          }}
        />
        <div
          className="fixed inset-0 pointer-events-none opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage:
              'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'120\'><filter id=\'n\'><feTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\'/></filter><rect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/></svg>")',
          }}
        />

        <Link
          to="/auth"
          className="relative z-10 inline-flex items-center gap-1.5 text-[12px] text-muted-foreground/80 hover:text-foreground transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to listener sign in
        </Link>

        <motion.div
          className="relative w-full max-w-sm mx-auto z-10 mt-4"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-col items-center mb-5">
            <motion.div
              className="relative"
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            >
              <div
                className="absolute -inset-6 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, hsl(340 100% 55% / 0.45), transparent 70%)', filter: 'blur(18px)' }}
              />
              <div
                className="relative w-[88px] h-[88px] rounded-[26px] flex items-center justify-center"
                style={{
                  background: 'linear-gradient(140deg, #18181b 0%, #0a0a0a 100%)',
                  boxShadow:
                    'inset 0 0 0 0.5px rgba(255,255,255,0.08),' +
                    ' 0 14px 40px hsl(340 100% 45% / 0.45),' +
                    ' inset 0 1px 0 rgba(255,255,255,0.06)',
                }}
              >
                <Mic className="w-9 h-9 text-white" strokeWidth={1.6} />
                <BadgeCheck
                  className="absolute -bottom-1 -right-1 w-7 h-7 text-white"
                  fill="#FF2D55"
                  strokeWidth={2}
                />
              </div>
            </motion.div>

            <motion.div
              className="mt-5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9.5px] uppercase tracking-[0.22em] font-semibold"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.14, duration: 0.4 }}
              style={{
                background: 'rgba(255, 45, 85, 0.12)',
                border: '0.5px solid rgba(255, 45, 85, 0.32)',
                color: '#FF6B85',
              }}
            >
              <Sparkles className="w-3 h-3" />
              I'm an Artist
            </motion.div>

            <motion.h1
              className="mt-3 text-[26px] leading-[1.1] font-display tracking-tight text-foreground text-center"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              {isLogin ? 'Welcome back, artist' : 'Create your artist account'}
            </motion.h1>
            <p className="mt-2 text-[12.5px] leading-snug text-muted-foreground/80 text-center px-2">
              {isLogin
                ? 'Sign in to continue your artist application.'
                : 'A few quick details, then upload your ID and you\'re in.'}
            </p>
          </div>

          <AnimatePresence initial={false}>
            {!isLogin && (
              <motion.div
                key="perks"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden mb-4"
              >
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { Icon: BadgeCheck, label: 'Rose verified' },
                    { Icon: Music2, label: 'Upload tracks' },
                    { Icon: Sparkles, label: 'Reach fans' },
                  ].map(({ Icon, label }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center justify-center gap-1.5 rounded-2xl py-2.5"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '0.5px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <Icon className="w-4 h-4 text-primary" strokeWidth={1.8} />
                      <span className="text-[10px] tracking-tight text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div
            className="relative grid grid-cols-2 p-1 rounded-full mb-4 mx-auto w-[78%]"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="absolute top-1 bottom-1 rounded-full"
              style={{
                width: 'calc(50% - 4px)',
                left: isLogin ? 'calc(50% + 0px)' : 4,
                background: '#FF2D55',
                boxShadow: '0 6px 18px hsl(340 100% 45% / 0.4)',
              }}
            />
            {(['signup', 'login'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="relative z-10 h-9 text-[12.5px] font-semibold tracking-tight transition-colors"
                style={{ color: mode === m ? '#fff' : 'hsl(var(--muted-foreground))' }}
              >
                {m === 'signup' ? 'New artist' : 'I have an account'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait" initial={false} custom={isLogin}>
            <motion.form
              key={mode}
              custom={isLogin}
              variants={panelVariants}
              onSubmit={handleSubmit}
              className="relative rounded-[26px] p-5 space-y-3.5"
              style={{
                background: 'rgba(16,16,18,0.78)',
                border: '0.5px solid rgba(255,255,255,0.07)',
                boxShadow: '0 30px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }}
            >
              <AnimatePresence initial={false} mode="popLayout">
                {!isLogin && (
                  <>
                    {/* Full name */}
                    <motion.div
                      key="fullname"
                      initial={{ opacity: 0, height: 0, y: -4 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -4 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <FieldLabel>Full name</FieldLabel>
                      <div className="relative">
                        <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                        <Input
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value.slice(0, 80))}
                          placeholder="As shown on your ID"
                          className="pl-10 h-12 text-[14px] rounded-xl border-0 bg-white/[0.04]"
                          required={!isLogin}
                          minLength={2}
                          autoComplete="name"
                          autoFocus
                        />
                      </div>
                    </motion.div>

                    {/* Username */}
                    <motion.div
                      key="username"
                      initial={{ opacity: 0, height: 0, y: -4 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -4 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <FieldLabel>Stage handle</FieldLabel>
                      <div className="relative">
                        <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                        <Input
                          value={username}
                          onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, 20))}
                          placeholder="yourstagehandle"
                          className="pl-10 h-12 text-[14px] rounded-xl border-0 bg-white/[0.04]"
                          required={!isLogin}
                          minLength={3}
                          maxLength={20}
                          autoComplete="username"
                        />
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <div>
                <FieldLabel>Email</FieldLabel>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                  <Input
                    type="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 text-[14px] rounded-xl border-0 bg-white/[0.04]"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <AnimatePresence initial={false} mode="popLayout">
                {!isLogin && (
                  <>
                    {/* Phone with country code */}
                    <motion.div
                      key="phone"
                      initial={{ opacity: 0, height: 0, y: -4 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -4 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <FieldLabel>Phone number</FieldLabel>
                      <div className="flex gap-2">
                        <select
                          value={dialIso}
                          onChange={(e) => setDialIso(e.target.value)}
                          className="h-12 rounded-xl bg-white/[0.04] border-0 px-2 text-[13px] tabular-nums"
                          aria-label="Country code"
                        >
                          {DIAL_CODES.map(([iso, code, flag]) => (
                            <option key={iso} value={iso}>{flag} {code}</option>
                          ))}
                        </select>
                        <div className="relative flex-1">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                          <Input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value.replace(/[^\d\s-]/g, '').slice(0, 16))}
                            placeholder="98xxx xxxxx"
                            className="pl-10 h-12 text-[14px] rounded-xl border-0 bg-white/[0.04]"
                            required={!isLogin}
                            autoComplete="tel-national"
                          />
                        </div>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground/60 mt-1.5 pl-1">
                        Used for account recovery. Never shown publicly.
                      </p>
                    </motion.div>

                    {/* DOB */}
                    <motion.div
                      key="dob"
                      initial={{ opacity: 0, height: 0, y: -4 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: -4 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <FieldLabel>Date of birth</FieldLabel>
                      <div className="relative">
                        <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                        <Input
                          type="date"
                          value={dob}
                          max={maxDob}
                          onChange={(e) => setDob(e.target.value)}
                          className="pl-10 h-12 text-[14px] rounded-xl border-0 bg-white/[0.04]"
                          required={!isLogin}
                        />
                      </div>
                      {age !== null && age < 13 && (
                        <p className="text-[10.5px] text-rose-400 mt-1.5 pl-1">
                          You must be at least 13 years old.
                        </p>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>

              <div>
                <FieldLabel>Password</FieldLabel>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isLogin ? 'Your password' : 'At least 6 characters'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 text-[14px] rounded-xl border-0 bg-white/[0.04]"
                    required
                    minLength={6}
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground/70 active:scale-90 transition-transform"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <AnimatePresence initial={false} mode="popLayout">
                {!isLogin && (
                  <motion.div
                    key="consents"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden space-y-2 pt-1"
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreeTerms}
                        onChange={(e) => setAgreeTerms(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-[#FF2D55] shrink-0"
                      />
                      <span className="text-[11.5px] leading-relaxed text-muted-foreground/90">
                        I agree to the{' '}
                        <Link to="/legal/artist-terms" target="_blank" className="underline text-primary">Artist Terms</Link>
                        {' '}and confirm I own or have rights to the music I will upload.
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={agreePrivacy}
                        onChange={(e) => setAgreePrivacy(e.target.checked)}
                        className="mt-0.5 w-4 h-4 accent-[#FF2D55] shrink-0"
                      />
                      <span className="text-[11.5px] leading-relaxed text-muted-foreground/90">
                        I agree to the{' '}
                        <Link to="/legal/artist-privacy" target="_blank" className="underline text-primary">Artist Privacy Policy</Link>
                        , including that my ID will be deleted after review.
                      </span>
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              <Button
                type="submit"
                className="w-full h-12 text-[14px] font-semibold rounded-xl border-0 text-white active:scale-[0.98] transition-transform mt-1"
                style={{
                  background: 'linear-gradient(180deg, #FF3B5C 0%, #E11D48 100%)',
                  boxShadow: '0 10px 28px hsl(340 100% 45% / 0.4), inset 0 1px 0 rgba(255,255,255,0.18)',
                }}
                disabled={loading || (!isLogin && !signupValid)}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span className="flex items-center gap-2">
                    {isLogin ? 'Sign in & continue' : 'Create artist account'}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>

              <p className="text-center text-[10.5px] leading-relaxed text-muted-foreground/70 px-3 pt-1">
                {isLogin
                  ? "You'll continue to your verification application after sign-in."
                  : 'Verification takes 1–3 days. We\'ll notify you the moment you\'re approved.'}
              </p>
            </motion.form>
          </AnimatePresence>

          <p className="text-center text-[11.5px] text-muted-foreground/70 mt-5">
            Just here to listen?{' '}
            <Link to="/auth" className="text-primary font-semibold">Use the listener sign in →</Link>
          </p>
        </motion.div>

        <p className="relative z-10 text-[10px] tracking-[0.22em] uppercase text-muted-foreground/50 mt-auto pt-6 text-center">
          Universflow for Artists
        </p>
      </div>
    </FadeTransition>
  );
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10.5px] uppercase tracking-[0.18em] font-semibold text-muted-foreground/70 mb-1.5 pl-1">
      {children}
    </label>
  );
}

export default ArtistAuth;

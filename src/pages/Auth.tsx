import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, AtSign, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { FadeTransition } from '@/components/PageTransition';
import SEOHead from '@/components/SEOHead';
import appLogo from '@/assets/app-logo.png';

function detectCountryCode(): string | undefined {
  try {
    const locale = (Intl.DateTimeFormat().resolvedOptions().locale || '').toUpperCase();
    const m = locale.match(/-([A-Z]{2})\b/);
    return m?.[1];
  } catch { return undefined; }
}

type Mode = 'login' | 'signup';

const Auth = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const isLogin = mode === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navigator.onLine) {
      toast.error('You are offline. Connect to the internet and try again.');
      return;
    }
    setLoading(true);
    try {
      if (isLogin) {
        const { error, isAdmin } = await signIn(email, password);
        if (error) {
          if ((error as Error & { code?: string }).message === 'EMAIL_NOT_VERIFIED') {
            toast.error('Please confirm your email to sign in');
            try {
              await supabase.functions.invoke('send-verification-link', { body: { email } });
            } catch { /* non-fatal */ }
            navigate(`/check-email?email=${encodeURIComponent(email)}`, { state: { email }, replace: true });
            return;
          }
          toast.error(error.message);
          return;
        }
        toast.success('Welcome back!');
        navigate(isAdmin ? '/admin' : '/home');
      } else {
        const { error } = await signUp(email, password, username, detectCountryCode());
        if (error) { toast.error(error.message); return; }
        localStorage.setItem('uf_just_signed_up', '1');
        navigate(
          `/check-email?email=${encodeURIComponent(email)}&u=${encodeURIComponent(username)}`,
          { state: { email, username }, replace: true }
        );
        toast.success('Account created — check your email');
        supabase.functions
          .invoke('send-verification-link', { body: { email, username } })
          .catch((e) => console.warn('verification email failed:', e));
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <FadeTransition>
      <div className="min-h-[100dvh] bg-background flex flex-col items-center px-5 pt-8 pb-6 relative overflow-y-auto">
        <SEOHead
          title="Sign in — Univers Flow Premium Music Experience"
          description="Sign in or create your free Univers Flow account to stream music, build playlists, and listen offline."
          path="/auth"
        />

        {/* Static atmospheric backdrop */}
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse at 20% 10%, hsl(340 100% 55% / 0.22) 0%, transparent 55%), radial-gradient(ellipse at 80% 90%, hsl(260 100% 60% / 0.18) 0%, transparent 55%), radial-gradient(ellipse at 60% 40%, hsl(210 100% 60% / 0.08) 0%, transparent 45%)',
          }}
        />

        <motion.div
          className="relative w-full max-w-sm z-10 my-auto"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Brand */}
          <div className="flex flex-col items-center mb-7">
            <motion.div
              className="relative"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            >
              <div
                className="absolute -inset-5 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, hsl(340 100% 55% / 0.32), transparent 70%)' }}
              />
              <div
                className="w-20 h-20 rounded-[26px] relative flex items-center justify-center overflow-hidden"
                style={{
                  background: '#000',
                  boxShadow: '0 0 28px hsl(var(--primary) / 0.45), inset 0 0 0 1px rgba(255,255,255,0.08)',
                }}
              >
                <img
                  src={appLogo}
                  alt="Univers Flow logo"
                  width={80}
                  height={80}
                  {...({ fetchpriority: 'high' } as any)}
                  decoding="async"
                  className="w-full h-full object-cover scale-[1.04]"
                />
              </div>
            </motion.div>

            <motion.h1
              className="mt-4 text-2xl font-bold tracking-tight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <span
                style={{
                  background: 'linear-gradient(135deg, #FF2D55, #BF5AF2, #5E5CE6)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Univers
              </span>
              <span className="text-foreground ml-1.5 font-light">Flow</span>
              <span className="sr-only"> — Premium Music Experience</span>
            </motion.h1>
            <motion.p
              className="mt-1 text-[10.5px] tracking-[0.18em] uppercase font-medium text-muted-foreground"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Premium Music Experience
            </motion.p>
          </div>

          {/* Segmented Login / Sign up switcher */}
          <div
            className="relative grid grid-cols-2 p-1 rounded-2xl mb-4"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <motion.div
              layout
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="absolute top-1 bottom-1 rounded-xl"
              style={{
                width: 'calc(50% - 4px)',
                left: isLogin ? 4 : 'calc(50% + 0px)',
                background: 'linear-gradient(135deg, #FF2D55, #BF5AF2)',
                boxShadow: '0 4px 18px hsl(340 100% 50% / 0.35)',
              }}
            />
            {(['login', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className="relative z-10 h-10 text-[13px] font-semibold tracking-tight transition-colors"
                style={{ color: mode === m ? '#fff' : 'hsl(var(--muted-foreground))' }}
              >
                {m === 'login' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <motion.form
            onSubmit={handleSubmit}
            className="relative rounded-3xl p-5 space-y-4"
            style={{
              background: 'rgba(22, 22, 24, 0.82)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              boxShadow: '0 24px 70px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
          >
            <div>
              <h2 className="text-[17px] font-bold text-foreground tracking-tight">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-muted-foreground text-[11.5px] mt-0.5">
                {isLogin ? 'Sign in to keep the music flowing' : 'Pick a username — your vibe starts here'}
              </p>
            </div>

            <div className="space-y-2.5">
              <AnimatePresence initial={false} mode="popLayout">
                {!isLogin && (
                  <motion.div
                    key="username"
                    initial={{ opacity: 0, height: 0, y: -6 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -6 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="relative">
                      <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Username (permanent)"
                        aria-label="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, '').slice(0, 20))}
                        className="pl-10 h-12 text-sm rounded-xl border-0"
                        style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                        required
                        minLength={3}
                        maxLength={20}
                        autoComplete="username"
                        autoFocus
                      />
                    </div>
                    <p className="mt-1.5 text-[10.5px] text-muted-foreground/80 flex items-center gap-1 px-1">
                      <Sparkles className="w-3 h-3 text-primary" />
                      We'll pick a fresh animated avatar for you
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="Email address"
                  aria-label="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12 text-sm rounded-xl border-0"
                  style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                  required
                  autoComplete={isLogin ? 'email' : 'email'}
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isLogin ? 'Password' : 'Password (min 6 characters)'}
                  aria-label="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-12 text-sm rounded-xl border-0"
                  style={{ background: 'rgba(255, 255, 255, 0.06)' }}
                  required
                  minLength={6}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-0.5 text-muted-foreground active:scale-90 transition-transform"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-[14px] font-bold rounded-xl border-0 text-primary-foreground active:scale-[0.97] transition-transform"
              style={{
                background: 'linear-gradient(135deg, #FF2D55, #BF5AF2, #5E5CE6)',
                boxShadow: '0 6px 24px hsl(340 100% 50% / 0.35)',
              }}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>

            {!isLogin && (
              <p className="text-center text-[10px] leading-relaxed text-muted-foreground/80 px-2">
                By creating an account, you agree to Universflow's Terms of Service and Privacy Policy.
              </p>
            )}
          </motion.form>
        </motion.div>

        <motion.div
          className="relative z-10 mt-7 px-3.5 py-1.5 rounded-full flex items-center gap-2"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          <p className="text-[10px] text-muted-foreground/70 tracking-wider">
            Universflow · Built for music lovers
          </p>
        </motion.div>
      </div>
    </FadeTransition>
  );
};

export default Auth;

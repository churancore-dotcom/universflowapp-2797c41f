import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft, Crown, Check, Sparkles, Download, Music2, Headphones,
  Zap, Shield, Heart, Star, Gift, MessageCircle, Infinity as InfinityIcon,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import PageTransition from '@/components/PageTransition';
import RedeemCodeModal from '@/components/RedeemCodeModal';
import Footer from '@/components/Footer';
import { iosSpring, iosBounce } from '@/lib/animations';
import { usePremium } from '@/hooks/usePremium';
import { useHaptics } from '@/hooks/useHaptics';

type PlanId = 'monthly' | 'yearly' | 'lifetime';

interface Plan {
  id: PlanId;
  name: string;
  price: string;
  perMonth?: string;
  badge?: string;
  highlight?: boolean;
  savings?: string;
}

const PLANS: Plan[] = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '₹99',
    perMonth: 'per month',
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '₹799',
    perMonth: '₹66/month · billed yearly',
    badge: 'BEST VALUE',
    highlight: true,
    savings: 'Save 33%',
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: '₹2,499',
    perMonth: 'one-time payment · forever',
    badge: 'POPULAR',
    savings: 'Pay once. Yours forever.',
  },
];

const FEATURES = [
  { icon: Music2, title: 'Ad-Free Listening', desc: 'Zero interruptions. Pure music, all the time.' },
  { icon: Download, title: 'Unlimited Offline Downloads', desc: 'Save your entire library. Listen anywhere — even on a flight.' },
  { icon: Headphones, title: 'Studio-Quality Audio', desc: 'Up to 320kbps lossless streaming for every track.' },
  { icon: Sparkles, title: 'Exclusive Premium-Only Tracks', desc: 'Early releases and members-only content.' },
  { icon: Zap, title: 'Skip Pre-roll Ads', desc: 'Songs start instantly — no waiting, no ads.' },
  { icon: Crown, title: 'Premium Badge on Profile', desc: 'Stand out with an exclusive premium identity.' },
  { icon: Shield, title: 'Priority Support', desc: 'Direct line to our team. Faster help, every time.' },
  { icon: Heart, title: 'Support Indie Music', desc: 'Your subscription directly supports artists & creators.' },
];

const PremiumPage = memo(function PremiumPage() {
  const navigate = useNavigate();
  const { isPremium } = usePremium();
  const haptics = useHaptics();
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('yearly');
  const [showRedeem, setShowRedeem] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const handleSelectPlan = useCallback((id: PlanId) => {
    haptics.light();
    setSelectedPlan(id);
  }, [haptics]);

  const handleUpgrade = useCallback(() => {
    haptics.medium();
    setShowCheckout(true);
  }, [haptics]);

  const selected = PLANS.find(p => p.id === selectedPlan)!;

  return (
    <PageTransition>
      <motion.div
        className="min-h-screen bg-background pb-44 relative overflow-hidden"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}
      >
        {/* Static glow backdrop */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-30 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.5), transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute -bottom-32 -right-20 w-[400px] h-[400px] rounded-full opacity-20 pointer-events-none"
          style={{
            background: 'radial-gradient(circle, hsl(var(--accent) / 0.5), transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Header */}
        <motion.header
          className="sticky top-0 z-30 px-2 pt-4 pb-3 flex items-center safe-area-pt"
          style={{
            background: 'hsl(var(--background) / 0.85)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
          }}
          initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={iosSpring}
        >
          <motion.button
            onClick={() => { haptics.light(); navigate(-1); }}
            className="flex items-center gap-1 px-2 py-2 -ml-1 text-primary"
            whileTap={{ scale: 0.95, opacity: 0.7 }} transition={iosBounce}
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="text-[17px]">Back</span>
          </motion.button>
          <motion.h1 className="text-[17px] font-semibold absolute left-1/2 -translate-x-1/2">
            Premium
          </motion.h1>
        </motion.header>

        <main className="relative px-5 pt-4 space-y-10">
          {/* Hero */}
          <motion.section
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ ...iosSpring, delay: 0.05 }}
            className="text-center pt-4"
          >
            <motion.div
              initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ ...iosSpring, delay: 0.1 }}
              className="w-28 h-28 mx-auto mb-5 rounded-3xl flex items-center justify-center relative"
              style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                boxShadow: '0 20px 60px -10px hsl(var(--primary) / 0.6)',
              }}
            >
              <Crown className="w-14 h-14 text-primary-foreground" strokeWidth={2.5} />
              <motion.div
                className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-background flex items-center justify-center"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.4, type: 'spring' }}
              >
                <Sparkles className="w-4 h-4 text-primary" fill="currentColor" />
              </motion.div>
            </motion.div>

            <h1 className="text-[32px] font-bold leading-tight tracking-tight mb-2">
              Unlock <span style={{
                background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Universflow Premium</span>
            </h1>
            <p className="text-muted-foreground text-[15px] max-w-sm mx-auto leading-relaxed">
              The ultimate music experience. Ad-free, offline-ready, studio-quality — designed for true listeners.
            </p>

            {isPremium && (
              <motion.div
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: 'spring' }}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full"
                style={{ background: 'hsl(var(--primary) / 0.15)', border: '1px solid hsl(var(--primary) / 0.3)' }}
              >
                <Crown className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">You're Premium 💜</span>
              </motion.div>
            )}
          </motion.section>

          {/* Features */}
          <motion.section
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ ...iosSpring, delay: 0.15 }}
          >
            <h2 className="text-xl font-bold mb-4 px-1">Everything you get</h2>
            <div className="grid grid-cols-1 gap-2.5">
              {FEATURES.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.04, ...iosSpring }}
                  className="flex items-start gap-3.5 p-4 rounded-2xl"
                  style={{
                    background: 'hsl(var(--card) / 0.6)',
                    border: '0.5px solid hsl(var(--border) / 0.5)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.05))' }}
                  >
                    <f.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] leading-tight mb-1">{f.title}</p>
                    <p className="text-[13px] text-muted-foreground leading-snug">{f.desc}</p>
                  </div>
                  <Check className="w-5 h-5 text-primary shrink-0 mt-1" strokeWidth={3} />
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* Plans */}
          {!isPremium && (
            <motion.section
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ ...iosSpring, delay: 0.3 }}
            >
              <h2 className="text-xl font-bold mb-2 px-1">Pick your plan</h2>
              <p className="text-sm text-muted-foreground mb-4 px-1">
                Cancel anytime. No hidden fees.
              </p>

              <div className="space-y-3">
                {PLANS.map((plan, i) => {
                  const isSelected = selectedPlan === plan.id;
                  return (
                    <motion.button
                      key={plan.id}
                      onClick={() => handleSelectPlan(plan.id)}
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.35 + i * 0.05 }}
                      className="w-full text-left p-5 rounded-2xl relative overflow-hidden transition-all"
                      style={{
                        background: isSelected
                          ? 'linear-gradient(135deg, hsl(var(--primary) / 0.18), hsl(var(--primary) / 0.05))'
                          : 'hsl(var(--card) / 0.6)',
                        border: isSelected
                          ? '2px solid hsl(var(--primary))'
                          : '0.5px solid hsl(var(--border) / 0.5)',
                        backdropFilter: 'blur(20px)',
                        WebkitBackdropFilter: 'blur(20px)',
                      }}
                    >
                      {plan.badge && (
                        <div
                          className="absolute top-0 right-0 px-3 py-1 text-[10px] font-bold tracking-wider rounded-bl-xl"
                          style={{
                            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                            color: 'hsl(var(--primary-foreground))',
                          }}
                        >
                          {plan.badge}
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all"
                            style={{
                              background: isSelected ? 'hsl(var(--primary))' : 'transparent',
                              border: isSelected ? 'none' : '2px solid hsl(var(--muted-foreground) / 0.4)',
                            }}
                          >
                            {isSelected && <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-[17px]">{plan.name}</p>
                              {plan.id === 'lifetime' && <InfinityIcon className="w-4 h-4 text-primary" />}
                            </div>
                            {plan.savings && (
                              <p className="text-[12px] text-primary font-semibold">{plan.savings}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-[20px] leading-none">{plan.price}</p>
                          {plan.perMonth && (
                            <p className="text-[11px] text-muted-foreground mt-1">{plan.perMonth}</p>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Sticky-ish CTA */}
              <motion.button
                onClick={handleUpgrade}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, ...iosSpring }}
                className="w-full mt-6 py-5 rounded-2xl font-bold text-[17px] flex items-center justify-center gap-2 relative overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
                  color: 'hsl(var(--primary-foreground))',
                  boxShadow: '0 10px 40px -10px hsl(var(--primary) / 0.6)',
                }}
              >
                <Crown className="w-5 h-5" />
                Get Premium — {selected.price}
              </motion.button>

              <button
                onClick={() => { haptics.light(); setShowRedeem(true); }}
                className="w-full mt-3 py-3.5 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2"
                style={{
                  background: 'hsl(var(--card) / 0.6)',
                  border: '0.5px solid hsl(var(--border) / 0.5)',
                }}
              >
                <Gift className="w-4 h-4 text-primary" />
                I have a redeem code
              </button>

              <p className="text-center text-[11px] text-muted-foreground mt-4 leading-relaxed">
                By upgrading, you agree to our Terms. Subscriptions auto-renew until cancelled.
                <br />Recurring billing can be managed anytime in Settings.
              </p>
            </motion.section>
          )}

          {/* Social proof */}
          <motion.section
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ ...iosSpring, delay: 0.4 }}
            className="rounded-3xl p-6 text-center relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, hsl(var(--primary) / 0.12), hsl(var(--accent) / 0.08))',
              border: '0.5px solid hsl(var(--primary) / 0.25)',
            }}
          >
            <div className="flex justify-center gap-1 mb-3">
              {[0, 1, 2, 3, 4].map(i => (
                <Star key={i} className="w-5 h-5 text-primary" fill="currentColor" />
              ))}
            </div>
            <p className="text-[15px] font-medium leading-relaxed mb-2">
              "Best music app I've used. The offline downloads alone are worth it."
            </p>
            <p className="text-xs text-muted-foreground">— Premium member since launch</p>
          </motion.section>

          <Footer />
        </main>

        <BottomNav />

        <RedeemCodeModal isOpen={showRedeem} onClose={() => setShowRedeem(false)} />

        {/* Checkout sheet */}
        <AnimatePresence>
          {showCheckout && (
            <CheckoutSheet
              plan={selected}
              onClose={() => setShowCheckout(false)}
              onRedeem={() => { setShowCheckout(false); setShowRedeem(true); }}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </PageTransition>
  );
});

interface CheckoutSheetProps {
  plan: Plan;
  onClose: () => void;
  onRedeem: () => void;
}

const TELEGRAM_URL = 'https://t.me/ERRORMATRIXx';

const CheckoutSheet = memo(function CheckoutSheet({ plan, onClose, onRedeem }: CheckoutSheetProps) {
  const haptics = useHaptics();

  const handleTelegram = () => {
    haptics.medium();
    window.open(`${TELEGRAM_URL}?text=${encodeURIComponent(`Hi! I want to upgrade to Universflow Premium (${plan.name} — ${plan.price}).`)}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={iosSpring}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md rounded-t-3xl p-6 pb-10"
        style={{
          background: 'linear-gradient(180deg, hsl(var(--card)), hsl(var(--background)))',
          border: '0.5px solid hsl(var(--border))',
        }}
      >
        <div className="w-12 h-1 rounded-full bg-muted mx-auto mb-5" />

        <div className="text-center mb-6">
          <div
            className="w-16 h-16 mx-auto mb-3 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))' }}
          >
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
          <h3 className="text-[22px] font-bold">{plan.name} Premium</h3>
          <p className="text-[28px] font-bold mt-1">{plan.price}</p>
          {plan.perMonth && (
            <p className="text-sm text-muted-foreground">{plan.perMonth}</p>
          )}
        </div>

        <div
          className="rounded-2xl p-4 mb-5"
          style={{ background: 'hsl(var(--primary) / 0.1)', border: '0.5px solid hsl(var(--primary) / 0.2)' }}
        >
          <p className="text-[13px] text-foreground/90 leading-relaxed">
            <strong className="text-primary">Quick & secure:</strong> Tap below to message us on Telegram. We'll send your premium activation code in minutes.
          </p>
        </div>

        <button
          onClick={handleTelegram}
          className="w-full py-4 rounded-2xl font-bold text-[16px] flex items-center justify-center gap-2 mb-3"
          style={{
            background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent)))',
            color: 'hsl(var(--primary-foreground))',
            boxShadow: '0 10px 30px -10px hsl(var(--primary) / 0.5)',
          }}
        >
          <MessageCircle className="w-5 h-5" />
          Continue on Telegram
        </button>

        <button
          onClick={onRedeem}
          className="w-full py-3.5 rounded-2xl font-semibold text-[15px] flex items-center justify-center gap-2 mb-2"
          style={{
            background: 'hsl(var(--muted) / 0.5)',
            border: '0.5px solid hsl(var(--border) / 0.5)',
          }}
        >
          <Gift className="w-4 h-4 text-primary" />
          Already have a code? Redeem
        </button>

        <button
          onClick={onClose}
          className="w-full py-3 text-sm text-muted-foreground"
        >
          Maybe later
        </button>
      </motion.div>
    </motion.div>
  );
});

export default PremiumPage;

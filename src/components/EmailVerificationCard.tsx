import { useState } from 'react';
import { CheckCircle2, MailWarning, Loader2 } from 'lucide-react';
import { useEmailVerified } from '@/hooks/useEmailVerified';

interface Props {
  compact?: boolean;
}

/**
 * Inline status card that surfaces email verification state on Profile/Settings.
 * Shows a green confirmation when verified, or a warning + Resend button otherwise.
 */
export const EmailVerificationCard = ({ compact = false }: Props) => {
  const { user, isVerified, resendVerification } = useEmailVerified();
  const [sending, setSending] = useState(false);

  if (!user) return null;

  const handleResend = async () => {
    setSending(true);
    try { await resendVerification(); } finally { setSending(false); }
  };

  if (isVerified) {
    return (
      <div className={`flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 ${compact ? 'py-2.5' : 'py-3'}`}>
        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground">Email verified</p>
          {!compact && (
            <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 space-y-2">
      <div className="flex items-center gap-2">
        <MailWarning className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-[13px] font-semibold text-foreground">Verify your email</p>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Check <span className="font-medium text-foreground">{user.email}</span> for the verification link. Some actions are locked until you confirm.
      </p>
      <button
        onClick={handleResend}
        disabled={sending}
        className="w-full inline-flex items-center justify-center gap-1.5 rounded-full bg-primary text-primary-foreground text-[12px] font-semibold py-2 active:scale-[0.98] disabled:opacity-60"
      >
        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
        {sending ? 'Sending…' : 'Resend verification email'}
      </button>
    </div>
  );
};

export default EmailVerificationCard;

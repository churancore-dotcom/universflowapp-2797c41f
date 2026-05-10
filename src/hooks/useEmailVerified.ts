import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Returns whether the current user's email is verified.
 * Falsy when there's no user. Provides a `requireVerified` guard helper that
 * sensitive actions can call — it shows a toast + returns false if not verified.
 */
export function useEmailVerified() {
  const { user } = useAuth();
  const isVerified = !!user?.email_confirmed_at;

  const resendVerification = async () => {
    if (!user?.email) return;
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: user.email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) toast.error(error.message);
    else toast.success('Verification email sent — check your inbox');
  };

  const requireVerified = (action = 'continue'): boolean => {
    if (!user) {
      toast.error('Please sign in first');
      return false;
    }
    if (!isVerified) {
      toast.error(`Please verify your email to ${action}`, {
        action: { label: 'Resend', onClick: resendVerification },
      });
      return false;
    }
    return true;
  };

  return { user, isVerified, resendVerification, requireVerified };
}

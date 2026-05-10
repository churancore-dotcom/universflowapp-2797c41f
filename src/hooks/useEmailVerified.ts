import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Returns whether the current user's email is verified (custom flow via profiles.email_verified).
 */
export function useEmailVerified() {
  const { user } = useAuth();
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user?.id) { setIsVerified(false); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('email_verified')
      .eq('user_id', user.id)
      .maybeSingle();
    setIsVerified(!!data?.email_verified);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { refresh(); }, [refresh]);

  const sendCode = async () => {
    const { error } = await supabase.functions.invoke('send-verification-code');
    if (error) { toast.error(error.message); return false; }
    toast.success('Verification code sent — check your inbox');
    return true;
  };

  const requireVerified = (action = 'continue'): boolean => {
    if (!user) { toast.error('Please sign in first'); return false; }
    if (!isVerified) {
      toast.error(`Please verify your email to ${action}`, {
        action: { label: 'Send code', onClick: sendCode },
      });
      return false;
    }
    return true;
  };

  return { user, isVerified, loading, refresh, sendCode, requireVerified, resendVerification: sendCode };
}

import { useState, useEffect, useCallback, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthContext } from '@/contexts/AuthContext';

export type SubscriptionType = 'free' | 'premium_monthly' | 'premium_yearly';
export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending';

interface Subscription {
  id: string;
  subscription_type: SubscriptionType;
  status: SubscriptionStatus;
  expires_at: string | null;
  platform: string;
}

interface UsePremiumReturn {
  isPremium: boolean;
  subscription: Subscription | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const usePremium = (): UsePremiumReturn => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user ?? null;
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (data) {
        // Check if subscription is expired
        const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
        
        setSubscription({
          id: data.id,
          subscription_type: data.subscription_type as SubscriptionType,
          status: isExpired ? 'expired' : (data.status as SubscriptionStatus),
          expires_at: data.expires_at,
          platform: data.platform,
        });
      } else {
        // No subscription found, user is on free tier
        setSubscription(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch subscription'));
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isPremium = 
    subscription?.status === 'active' && 
    subscription?.subscription_type !== 'free' &&
    (!subscription?.expires_at || new Date(subscription.expires_at) > new Date());

  return {
    isPremium,
    subscription,
    isLoading,
    error,
    refetch: fetchSubscription,
  };
};

export default usePremium;

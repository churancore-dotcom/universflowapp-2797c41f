import { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// ============================================================
// Batch Like Cache — single query loads ALL user likes,
// eliminates per-song DB calls (critical for 2000+ users)
// ============================================================

// Global cache shared across all LikeButton instances
let likeCache = new Set<string>();
let likeCacheLoaded = false;
let likeCacheUserId: string | null = null;
let likeCachePromise: Promise<void> | null = null;

const loadLikeCache = async (userId: string): Promise<void> => {
  if (likeCacheLoaded && likeCacheUserId === userId) return;
  
  // Deduplicate concurrent calls
  if (likeCachePromise && likeCacheUserId === userId) return likeCachePromise;

  likeCacheUserId = userId;
  likeCachePromise = (async () => {
    const { data } = await supabase
      .from('user_library')
      .select('song_id')
      .eq('user_id', userId);

    likeCache = new Set(data?.map(d => d.song_id) || []);
    likeCacheLoaded = true;
    likeCachePromise = null;
  })();

  return likeCachePromise;
};

const invalidateLikeCache = () => {
  likeCacheLoaded = false;
};

export const useLike = (songId: string) => {
  const { user } = useAuth();
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load entire library once, then check cache
  useEffect(() => {
    if (!user || !songId) return;

    const check = async () => {
      await loadLikeCache(user.id);
      if (mountedRef.current) {
        setIsLiked(likeCache.has(songId));
      }
    };
    check();
  }, [user?.id, songId]);

  const toggleLike = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to like songs');
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    const newLiked = !isLiked;
    
    // Optimistic update
    setIsLiked(newLiked);
    if (newLiked) {
      likeCache.add(songId);
    } else {
      likeCache.delete(songId);
    }

    try {
      if (!newLiked) {
        const { error } = await supabase
          .from('user_library')
          .delete()
          .eq('user_id', user.id)
          .eq('song_id', songId);
        if (error) throw error;
        toast.success('Removed from library');
      } else {
        const { error } = await supabase
          .from('user_library')
          .insert({ user_id: user.id, song_id: songId });
        if (error) throw error;
        toast.success('Added to library ❤️');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      // Rollback
      setIsLiked(!newLiked);
      if (!newLiked) {
        likeCache.add(songId);
      } else {
        likeCache.delete(songId);
      }
      toast.error('Failed to update library');
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [user, songId, isLiked, isLoading]);

  return { isLiked, isLoading, toggleLike };
};

export const useRecentlyPlayed = () => {
  const { user } = useAuth();

  const trackPlay = useCallback(async (songId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('recently_played')
        .insert({ user_id: user.id, song_id: songId });
    } catch (error) {
      // Silent fail
    }
  }, [user]);

  return { trackPlay };
};

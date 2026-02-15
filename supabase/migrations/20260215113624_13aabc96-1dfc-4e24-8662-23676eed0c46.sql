-- Critical indexes for 2000+ users/day performance
-- These indexes speed up the most frequent queries in the app

-- songs: filtered by is_visible on every page load
CREATE INDEX IF NOT EXISTS idx_songs_is_visible ON public.songs (is_visible) WHERE is_visible = true;

-- songs: sorted by created_at on home page
CREATE INDEX IF NOT EXISTS idx_songs_created_at ON public.songs (created_at DESC) WHERE is_visible = true;

-- recently_played: filtered by user_id + ordered by played_at (every user on home/library)
CREATE INDEX IF NOT EXISTS idx_recently_played_user_id ON public.recently_played (user_id, played_at DESC);

-- user_library: filtered by user_id (library page, like checks)
CREATE INDEX IF NOT EXISTS idx_user_library_user_id ON public.user_library (user_id);

-- playlists: filtered by user_id (library page)
CREATE INDEX IF NOT EXISTS idx_playlists_user_id ON public.playlists (user_id);

-- song_comments: filtered by song_id + ordered by created_at
CREATE INDEX IF NOT EXISTS idx_song_comments_song_created ON public.song_comments (song_id, created_at DESC);

-- song_dedications: filtered by recipient_id (inbox)
CREATE INDEX IF NOT EXISTS idx_song_dedications_recipient ON public.song_dedications (recipient_id, is_read);

-- friends: lookup by both user_id and friend_id
CREATE INDEX IF NOT EXISTS idx_friends_friend_id ON public.friends (friend_id);

-- user_subscriptions: lookup by user_id (premium checks)
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions (user_id);
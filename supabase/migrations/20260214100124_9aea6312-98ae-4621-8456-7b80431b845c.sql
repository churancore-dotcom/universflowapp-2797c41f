-- Remove the user_email column that exposes PII
ALTER TABLE public.song_comments DROP COLUMN user_email;
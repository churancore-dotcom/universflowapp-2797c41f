---
name: Mood Daily Push
description: Zero-PII daily mood-based push notifications inferred from recent plays via Gemini, with throttled artist-follower pushes and single premium-expired push.
type: feature
---
Uses GEMINI_API_KEY (user-provided, NOT Lovable AI). Edge function `mood-daily-push` runs via pg_cron at 03:30 & 13:30 UTC (9am/7pm IST). Per user: pulls last 10 song_play_events from 24h, sends to Gemini 2.0 Flash with hour, gets one of {sad,chill,hype,focus,romantic,power,happy}, picks a real chart_tracks song for that country, sends 1 push via send-system-push. Throttled 18h via profiles.last_mood_push_at. Opt-out: profiles.mood_pushes_enabled (default true), toggle in Settings as "Smart Mood Picks".

Artist follower notifications: trigger trg_artist_follower_push on artist_followers INSERT calls on_artist_follower_insert(), throttled to 1 push per artist per 30 min via artist_push_throttle table, batches as "X and N more started following you".

Premium expired: single push (no duplicates) via process_premium_expiry_notifications, guarded by notif_expired_at IS NULL, deep-links to /premium.

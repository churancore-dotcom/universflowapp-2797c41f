
-- 1) Remove unused stream_songs from realtime publication (defense-in-depth against future column additions).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'stream_songs'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.stream_songs';
  END IF;
END $$;

-- 2) Reschedule mood-daily-push cron jobs to include x-cron-secret header
DO $$
DECLARE
  v_url text;
  v_secret text;
  v_job text;
BEGIN
  SELECT trim(both '"' from (value #>> '{}')) INTO v_url FROM public.app_settings WHERE key = 'edge_mood_daily_push_url';
  IF v_url IS NULL OR v_url = '' THEN
    SELECT replace(trim(both '"' from (value #>> '{}')), 'send-system-push', 'mood-daily-push')
      INTO v_url FROM public.app_settings WHERE key = 'edge_send_system_push_url';
  END IF;

  SELECT value INTO v_secret FROM public.internal_secrets WHERE key = 'chart_aggregator_cron_secret';

  IF v_url IS NULL OR v_secret IS NULL OR v_url !~ '^https?://' THEN
    RAISE NOTICE 'mood-daily-push cron not reconfigured: URL or secret missing';
    RETURN;
  END IF;

  FOR v_job IN
    SELECT jobname FROM cron.job
    WHERE command ILIKE '%mood-daily-push%'
  LOOP
    PERFORM cron.unschedule(v_job);
  END LOOP;

  PERFORM cron.schedule(
    'mood-daily-push-morning',
    '30 3 * * *',
    format($cmd$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', %L),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      );
    $cmd$, v_url, v_secret)
  );

  PERFORM cron.schedule(
    'mood-daily-push-evening',
    '30 13 * * *',
    format($cmd$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', %L),
        body := '{}'::jsonb,
        timeout_milliseconds := 60000
      );
    $cmd$, v_url, v_secret)
  );
END $$;

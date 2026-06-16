DO $do$
DECLARE
  v_token text;
  v_url text;
BEGIN
  SELECT split_part(split_part(command, 'url := ''', 2), '''', 1)
    INTO v_url
  FROM cron.job
  WHERE jobname = 'chart-aggregator-every-6h'
  LIMIT 1;

  IF v_url IS NULL OR v_url = '' THEN
    SELECT trim(both '"' from (value #>> '{}'))
      INTO v_url
    FROM public.app_settings
    WHERE key = 'edge_chart_aggregator_url'
    LIMIT 1;
  END IF;

  IF v_url IS NULL OR v_url = '' THEN
    RAISE EXCEPTION 'chart aggregator URL is not configured';
  END IF;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');

  UPDATE public.internal_secrets
  SET value = v_token,
      updated_at = now()
  WHERE key = 'chart_aggregator_cron_secret';

  IF NOT FOUND THEN
    INSERT INTO public.internal_secrets(key, value, updated_at)
    VALUES ('chart_aggregator_cron_secret', v_token, now());
  END IF;

  BEGIN
    PERFORM cron.unschedule('chart-aggregator-every-6h');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  PERFORM cron.schedule(
    'chart-aggregator-every-6h',
    '0 */6 * * *',
    format(
      $cmd$
      SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', %L
        ),
        body := '{}'::jsonb,
        timeout_milliseconds := 25000
      );
      $cmd$,
      v_url,
      v_token
    )
  );
END
$do$;
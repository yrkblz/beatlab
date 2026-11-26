-- ==============================================================================
-- BEATLAB: AUTO-DRIP (masowa wysyłka w chmurze, działa przy WYŁĄCZONYM komputerze)
-- Uruchom ten skrypt w Supabase: Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Dane logowania nadawcy (Hasło aplikacji Google lub Google refresh token)
--    Sekret jest szyfrowany AES-256-GCM po stronie serwera.
--    RLS włączone BEZ polityk => tabela dostępna wyłącznie dla service role
--    (przeglądarka nigdy nie może odczytać sekretu).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drip_credentials (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  method           TEXT NOT NULL CHECK (method IN ('smtp', 'oauth')),
  sender_email     TEXT NOT NULL,
  secret_encrypted TEXT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.drip_credentials ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 2. Kampanie Auto-Drip (ustawienia tempa, limity, stan silnika)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drip_campaigns (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name               TEXT NOT NULL,
  subject            TEXT NOT NULL,
  message            TEXT NOT NULL,
  attachments        JSONB NOT NULL DEFAULT '[]'::jsonb,
  status             TEXT NOT NULL DEFAULT 'running'
                     CHECK (status IN ('running', 'paused', 'completed', 'cancelled', 'error')),
  state_note         TEXT,
  rate_per_hour      INT NOT NULL DEFAULT 30,
  jitter_pct         INT NOT NULL DEFAULT 40,
  daily_limit        INT NOT NULL DEFAULT 90,
  active_hours_start INT NOT NULL DEFAULT 9,
  active_hours_end   INT NOT NULL DEFAULT 21,
  timezone           TEXT NOT NULL DEFAULT 'Europe/Warsaw',
  batch_size         INT NOT NULL DEFAULT 10,
  batch_pause_min    INT NOT NULL DEFAULT 15,
  total_count        INT NOT NULL DEFAULT 0,
  sent_count         INT NOT NULL DEFAULT 0,
  failed_count       INT NOT NULL DEFAULT 0,
  skipped_count      INT NOT NULL DEFAULT 0,
  sent_today         INT NOT NULL DEFAULT 0,
  sent_today_date    TEXT,
  next_send_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_sent_at       TIMESTAMPTZ,
  last_error         TEXT,
  stats_campaign_id  TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS drip_campaigns_due_idx ON public.drip_campaigns (status, next_send_at);
CREATE INDEX IF NOT EXISTS drip_campaigns_user_idx ON public.drip_campaigns (user_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 3. Kolejka odbiorców (np. 3000 rekordów na kampanię)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.drip_queue (
  id               BIGSERIAL PRIMARY KEY,
  drip_campaign_id UUID NOT NULL REFERENCES public.drip_campaigns(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email            TEXT NOT NULL,
  position         INT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  attempts         INT NOT NULL DEFAULT 0,
  error            TEXT,
  subject_used     TEXT,
  processed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS drip_queue_next_idx ON public.drip_queue (drip_campaign_id, status, position);
CREATE INDEX IF NOT EXISTS drip_queue_recent_idx ON public.drip_queue (drip_campaign_id, processed_at DESC);

-- ------------------------------------------------------------------------------
-- 4. RLS: użytkownik może tylko ODCZYTAĆ własne kampanie i kolejkę.
--    Wszystkie zapisy idą przez API serwera (service role) po weryfikacji sesji.
-- ------------------------------------------------------------------------------
ALTER TABLE public.drip_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drip_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own drip campaigns" ON public.drip_campaigns;
CREATE POLICY "Users can view their own drip campaigns"
ON public.drip_campaigns FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own drip queue" ON public.drip_queue;
CREATE POLICY "Users can view their own drip queue"
ON public.drip_queue FOR SELECT
USING (auth.uid() = user_id);

-- ==============================================================================
-- 5. BUDZIK W CHMURZE (pg_cron + pg_net)
--    Co minutę baza Supabase wywołuje silnik /api/drip/process na Vercelu.
--    Dzięki temu wysyłka działa 24/7 nawet przy wyłączonym komputerze.
--
--    PRZED URUCHOMIENIEM tej sekcji:
--    a) W Vercel -> Settings -> Environment Variables dodaj CRON_SECRET
--       (dowolny długi losowy ciąg, np. 40 znaków) i zrób Redeploy.
--    b) Poniżej zamień WSTAW_TUTAJ_CRON_SECRET na tę samą wartość.
--    c) Jeśli Twoja domena jest inna niż www.beatlab.space – popraw adres URL.
-- ==============================================================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Usuń poprzednią wersję zadania (bezpieczne ponowne uruchomienie skryptu)
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'beatlab-drip-worker';

SELECT cron.schedule(
  'beatlab-drip-worker',
  '* * * * *',
  $$
  SELECT net.http_get(
    url := 'https://www.beatlab.space/api/drip/process',
    headers := '{"Authorization": "Bearer WSTAW_TUTAJ_CRON_SECRET"}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

-- Podgląd zadania i ostatnich wywołań:
-- SELECT * FROM cron.job WHERE jobname = 'beatlab-drip-worker';
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;
-- Wyłączenie budzika:
-- SELECT cron.unschedule('beatlab-drip-worker');

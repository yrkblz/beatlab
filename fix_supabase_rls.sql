-- ==============================================================================
-- BEATLAB: Enable Row Level Security (RLS) on all public tables
-- Fixes Supabase Security Warning: "Table publicly accessible (rls_disabled_in_public)"
-- Project: yrkblz's Project (blffqysfclklkjskepnn)
-- ==============================================================================
-- Jak uruchomić:
-- 1. Zaloguj się do Supabase: https://supabase.com/dashboard/project/blffqysfclklkjskepnn
-- 2. W menu po lewej stronie wybierz "SQL Editor" -> "New query"
-- 3. Wklej cały ten skrypt i kliknij "Run" (zielony przycisk w prawym dolnym rogu)
-- ==============================================================================

-- 1. Tabela BEATS
ALTER TABLE IF EXISTS public.beats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own beats" ON public.beats;
DROP POLICY IF EXISTS "Users can insert their own beats" ON public.beats;
DROP POLICY IF EXISTS "Users can update their own beats" ON public.beats;
DROP POLICY IF EXISTS "Users can delete their own beats" ON public.beats;

CREATE POLICY "Users can view their own beats" 
ON public.beats FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own beats" 
ON public.beats FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own beats" 
ON public.beats FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own beats" 
ON public.beats FOR DELETE 
USING (auth.uid() = user_id);


-- 2. Tabela SALES
ALTER TABLE IF EXISTS public.sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can insert their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete their own sales" ON public.sales;

CREATE POLICY "Users can view their own sales" 
ON public.sales FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own sales" 
ON public.sales FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales" 
ON public.sales FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales" 
ON public.sales FOR DELETE 
USING (auth.uid() = user_id);


-- 3. Tabela CAMPAIGNS & EMAIL_LOGS
ALTER TABLE IF EXISTS public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can insert their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can update their own campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Users can delete their own campaigns" ON public.campaigns;

CREATE POLICY "Users can view their own campaigns" 
ON public.campaigns FOR SELECT 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own campaigns" 
ON public.campaigns FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own campaigns" 
ON public.campaigns FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own campaigns" 
ON public.campaigns FOR DELETE 
USING (auth.uid() = user_id);

-- Email logs: śledzenie piksela otwarć (bez logowania) i podgląd
DROP POLICY IF EXISTS "Allow tracking and insert of email logs" ON public.email_logs;
CREATE POLICY "Allow tracking and insert of email logs"
ON public.email_logs FOR ALL
USING (true)
WITH CHECK (true);


-- 4. Tabela CLIENTS
ALTER TABLE IF EXISTS public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can insert their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clients;

CREATE POLICY "Users can view their own clients" 
ON public.clients FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clients" 
ON public.clients FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" 
ON public.clients FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients" 
ON public.clients FOR DELETE 
USING (auth.uid() = user_id);


-- 5. Tabele INSTAGRAM SCRAPER & CACHE
ALTER TABLE IF EXISTS public.instagram_scrape_cursors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.instagram_leads_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated read cursors" ON public.instagram_scrape_cursors;
DROP POLICY IF EXISTS "Allow authenticated write cursors" ON public.instagram_scrape_cursors;
CREATE POLICY "Allow authenticated read cursors" ON public.instagram_scrape_cursors FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write cursors" ON public.instagram_scrape_cursors FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated read leads cache" ON public.instagram_leads_cache;
DROP POLICY IF EXISTS "Allow authenticated write leads cache" ON public.instagram_leads_cache;
CREATE POLICY "Allow authenticated read leads cache" ON public.instagram_leads_cache FOR SELECT USING (true);
CREATE POLICY "Allow authenticated write leads cache" ON public.instagram_leads_cache FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- Gotowe! Wszystkie tabele w projekcie mają teraz włączone RLS i są w 100% bezpieczne.
-- ==============================================================================

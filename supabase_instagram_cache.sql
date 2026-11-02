-- SQL Migration for BeatLab Instagram Leads Engine
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/blffqysfclklkjskepnn/sql

-- 1. Table for tracking pagination cursors per target account (e.g. @ontheradarradio)
CREATE TABLE IF NOT EXISTS instagram_scrape_cursors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_source TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'following',
  next_cursor TEXT,
  total_scanned INTEGER DEFAULT 0,
  total_qualified INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(target_source, mode)
);

-- 2. Table for tracking all previously scanned profiles so we never re-scan them
CREATE TABLE IF NOT EXISTS instagram_leads_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_source TEXT NOT NULL,
  scanned_username TEXT NOT NULL,
  is_qualified BOOLEAN DEFAULT false,
  category TEXT,
  profile_data JSONB DEFAULT '{}'::jsonb,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(target_source, scanned_username)
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_ig_leads_cache_target ON instagram_leads_cache(target_source);
CREATE INDEX IF NOT EXISTS idx_ig_leads_cache_username ON instagram_leads_cache(scanned_username);

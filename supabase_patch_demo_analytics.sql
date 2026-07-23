-- Demo button analytics for Fit Progress
-- Run this once in Supabase SQL Editor before deploy/test.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.demo_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL DEFAULT 'view_demo_click',
  source text DEFAULT 'landing',
  language text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.demo_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_demo_analytics" ON public.demo_analytics;
CREATE POLICY "anon_insert_demo_analytics"
ON public.demo_analytics
FOR INSERT
TO anon, authenticated
WITH CHECK (
  event_name IN ('view_demo_click')
);

DROP POLICY IF EXISTS "admin_read_demo_analytics" ON public.demo_analytics;
CREATE POLICY "admin_read_demo_analytics"
ON public.demo_analytics
FOR SELECT
TO authenticated
USING (
  lower(auth.jwt() ->> 'email') = 'agencynula@gmail.com'
);

DROP POLICY IF EXISTS "admin_delete_demo_analytics" ON public.demo_analytics;
CREATE POLICY "admin_delete_demo_analytics"
ON public.demo_analytics
FOR DELETE
TO authenticated
USING (
  lower(auth.jwt() ->> 'email') = 'agencynula@gmail.com'
);

CREATE INDEX IF NOT EXISTS demo_analytics_created_at_idx ON public.demo_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS demo_analytics_event_name_idx ON public.demo_analytics(event_name);

-- Fit Progress v15 security + stricter validation patch
-- Run after the older demo/input-validation patches.
-- Safe to run multiple times.

-- 1) Helper: admin check. Only this email gets owner/admin access.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT lower(coalesce(auth.jwt() ->> 'email', '')) = 'agencynula@gmail.com';
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- 2) Utility to add CHECK constraints only when a table/column exists.
CREATE OR REPLACE FUNCTION public.v15_add_check_if_column_exists(
  p_table text,
  p_column text,
  p_constraint text,
  p_check_sql text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF to_regclass('public.' || p_table) IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_table AND column_name = p_column
  ) THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = p_constraint) THEN
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE public.%I ADD CONSTRAINT %I CHECK (%s) NOT VALID', p_table, p_constraint, p_check_sql);
END;
$$;

-- 3) Clean obvious invalid old test data.
DO $$
BEGIN
  IF to_regclass('public.merki') IS NOT NULL THEN
    DELETE FROM public.merki
    WHERE (tezina IS NOT NULL AND (tezina < 30 OR tezina > 250))
       OR (struk IS NOT NULL AND (struk < 20 OR struk > 250))
       OR (gradi IS NOT NULL AND (gradi < 20 OR gradi > 250))
       OR (butovi IS NOT NULL AND (butovi < 20 OR butovi > 250));
  END IF;

  IF to_regclass('public.obroci') IS NOT NULL THEN
    DELETE FROM public.obroci
    WHERE (kcal IS NOT NULL AND (kcal < 0 OR kcal > 5000))
       OR (proteini IS NOT NULL AND (proteini < 0 OR proteini > 500))
       OR (jaglehidrati IS NOT NULL AND (jaglehidrati < 0 OR jaglehidrati > 500))
       OR (masti IS NOT NULL AND (masti < 0 OR masti > 500));
  END IF;

  IF to_regclass('public.hrani_lista') IS NOT NULL THEN
    DELETE FROM public.hrani_lista
    WHERE (kcal IS NOT NULL AND (kcal < 0 OR kcal > 5000))
       OR (proteini IS NOT NULL AND (proteini < 0 OR proteini > 500))
       OR (jaglehidrati IS NOT NULL AND (jaglehidrati < 0 OR jaglehidrati > 500))
       OR (masti IS NOT NULL AND (masti < 0 OR masti > 500));
  END IF;
END $$;

-- 4) Stronger DB-level validation.
-- Names/email in profiles. NULL is allowed for older/auth-only accounts, but blank/invalid is blocked when present.
SELECT public.v15_add_check_if_column_exists('profili', 'ime', 'profili_ime_not_blank_v15', 'ime IS NULL OR length(btrim(ime)) >= 2');
SELECT public.v15_add_check_if_column_exists('profili', 'prezime', 'profili_prezime_not_blank_v15', 'prezime IS NULL OR length(btrim(prezime)) >= 2');
SELECT public.v15_add_check_if_column_exists('profili', 'full_name', 'profili_full_name_not_blank_v15', 'full_name IS NULL OR length(btrim(full_name)) >= 2');
SELECT public.v15_add_check_if_column_exists('profili', 'email', 'profili_email_format_v15', $$email IS NULL OR email ~* '^[^@\s]{1,64}@([A-Za-z0-9-]+\.)+[A-Za-z]{2,24}$'$$);

-- Food and measurements. These block negative numbers even if frontend validation is bypassed.
SELECT public.v15_add_check_if_column_exists('obroci', 'kcal', 'obroci_kcal_range_v15', 'kcal IS NULL OR (kcal >= 0 AND kcal <= 5000)');
SELECT public.v15_add_check_if_column_exists('obroci', 'proteini', 'obroci_proteini_range_v15', 'proteini IS NULL OR (proteini >= 0 AND proteini <= 500)');
SELECT public.v15_add_check_if_column_exists('obroci', 'jaglehidrati', 'obroci_jaglehidrati_range_v15', 'jaglehidrati IS NULL OR (jaglehidrati >= 0 AND jaglehidrati <= 500)');
SELECT public.v15_add_check_if_column_exists('obroci', 'masti', 'obroci_masti_range_v15', 'masti IS NULL OR (masti >= 0 AND masti <= 500)');
SELECT public.v15_add_check_if_column_exists('hrani_lista', 'kcal', 'hrani_lista_kcal_range_v15', 'kcal IS NULL OR (kcal >= 0 AND kcal <= 5000)');
SELECT public.v15_add_check_if_column_exists('hrani_lista', 'proteini', 'hrani_lista_proteini_range_v15', 'proteini IS NULL OR (proteini >= 0 AND proteini <= 500)');
SELECT public.v15_add_check_if_column_exists('hrani_lista', 'jaglehidrati', 'hrani_lista_jaglehidrati_range_v15', 'jaglehidrati IS NULL OR (jaglehidrati >= 0 AND jaglehidrati <= 500)');
SELECT public.v15_add_check_if_column_exists('hrani_lista', 'masti', 'hrani_lista_masti_range_v15', 'masti IS NULL OR (masti >= 0 AND masti <= 500)');
SELECT public.v15_add_check_if_column_exists('merki', 'tezina', 'merki_tezina_range_v15', 'tezina IS NULL OR (tezina >= 30 AND tezina <= 250)');
SELECT public.v15_add_check_if_column_exists('merki', 'struk', 'merki_struk_range_v15', 'struk IS NULL OR (struk >= 20 AND struk <= 250)');
SELECT public.v15_add_check_if_column_exists('merki', 'gradi', 'merki_gradi_range_v15', 'gradi IS NULL OR (gradi >= 20 AND gradi <= 250)');
SELECT public.v15_add_check_if_column_exists('merki', 'butovi', 'merki_butovi_range_v15', 'butovi IS NULL OR (butovi >= 20 AND butovi <= 250)');
SELECT public.v15_add_check_if_column_exists('feedback', 'poraka', 'feedback_poraka_not_blank_v15', 'length(btrim(poraka)) >= 3');
SELECT public.v15_add_check_if_column_exists('leaderboard_prefs', 'display_name', 'leaderboard_display_name_v15', 'display_name IS NULL OR length(btrim(display_name)) BETWEEN 2 AND 20');

-- 5) Enable RLS and remove older/looser policies for app tables.
DO $$
DECLARE
  tbl text;
  pol record;
  tables text[] := ARRAY[
    'profili','goals','vezbi','merki','obroci','voda','nedelen_plan','suplementi','suplementi_lista',
    'aktiven_plan','subscriptions','account_status','custom_vezbi','hidden_vezbi','hrani_lista',
    'push_subscriptions','wellness','feedback','leaderboard_prefs','demo_analytics','admin_audit_log','app_alarms'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    IF to_regclass('public.' || tbl) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
      FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = tbl LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
      END LOOP;
    END IF;
  END LOOP;
END $$;

-- 6) Grants: authenticated can use app tables, anon only demo analytics.
GRANT USAGE ON SCHEMA public TO authenticated, anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 7) Recreate strict owner/admin policies for tables with user_id.
CREATE OR REPLACE FUNCTION public.v15_apply_owner_policies(p_table text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF to_regclass('public.' || p_table) IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = p_table AND column_name = 'user_id'
  ) THEN
    RETURN;
  END IF;

  EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin())', p_table || '_v15_select_own_or_admin', p_table);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id OR public.is_admin())', p_table || '_v15_insert_own_or_admin', p_table);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.is_admin()) WITH CHECK (auth.uid() = user_id OR public.is_admin())', p_table || '_v15_update_own_or_admin', p_table);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.is_admin())', p_table || '_v15_delete_own_or_admin', p_table);
END;
$$;

SELECT public.v15_apply_owner_policies('profili');
SELECT public.v15_apply_owner_policies('goals');
SELECT public.v15_apply_owner_policies('vezbi');
SELECT public.v15_apply_owner_policies('merki');
SELECT public.v15_apply_owner_policies('obroci');
SELECT public.v15_apply_owner_policies('voda');
SELECT public.v15_apply_owner_policies('nedelen_plan');
SELECT public.v15_apply_owner_policies('suplementi');
SELECT public.v15_apply_owner_policies('suplementi_lista');
SELECT public.v15_apply_owner_policies('aktiven_plan');
SELECT public.v15_apply_owner_policies('subscriptions');
SELECT public.v15_apply_owner_policies('account_status');
SELECT public.v15_apply_owner_policies('custom_vezbi');
SELECT public.v15_apply_owner_policies('hidden_vezbi');
SELECT public.v15_apply_owner_policies('hrani_lista');
SELECT public.v15_apply_owner_policies('push_subscriptions');
SELECT public.v15_apply_owner_policies('wellness');
SELECT public.v15_apply_owner_policies('feedback');
SELECT public.v15_apply_owner_policies('leaderboard_prefs');

-- 8) Admin-only tables.
DO $$
BEGIN
  IF to_regclass('public.admin_audit_log') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY admin_audit_log_v15_admin_all ON public.admin_audit_log FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
  END IF;
  IF to_regclass('public.app_alarms') IS NOT NULL THEN
    EXECUTE 'CREATE POLICY app_alarms_v15_admin_all ON public.app_alarms FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
  END IF;
END $$;

-- 9) Demo analytics: anonymous visitors can insert a click, only admin can read/manage.
DO $$
BEGIN
  IF to_regclass('public.demo_analytics') IS NOT NULL THEN
    GRANT INSERT ON public.demo_analytics TO anon, authenticated;
    GRANT SELECT, UPDATE, DELETE ON public.demo_analytics TO authenticated;

    EXECUTE 'CREATE POLICY demo_analytics_v15_anon_insert ON public.demo_analytics FOR INSERT TO anon, authenticated WITH CHECK (true)';
    EXECUTE 'CREATE POLICY demo_analytics_v15_admin_select ON public.demo_analytics FOR SELECT TO authenticated USING (public.is_admin())';
    EXECUTE 'CREATE POLICY demo_analytics_v15_admin_update ON public.demo_analytics FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin())';
    EXECUTE 'CREATE POLICY demo_analytics_v15_admin_delete ON public.demo_analytics FOR DELETE TO authenticated USING (public.is_admin())';
  END IF;
END $$;


-- 10) Harden the convenience profile view if it exists.
-- It is for trusted database/dashboard inspection and should not bypass table RLS.
DO $$
BEGIN
  IF to_regclass('public.profili_pregled') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.profili_pregled SET (security_invoker = true)';
    EXECUTE 'REVOKE ALL ON public.profili_pregled FROM anon, authenticated';
  END IF;
END $$;

-- 11) Public leaderboard RPC. Returns only display name + counts, not private workout rows.
CREATE OR REPLACE FUNCTION public.get_public_leaderboard()
RETURNS TABLE (
  user_id uuid,
  display_name text,
  week_treninzi bigint,
  total_treninzi bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH visible_users AS (
    SELECT lp.user_id, NULLIF(btrim(lp.display_name), '') AS display_name
    FROM public.leaderboard_prefs lp
    WHERE lp.visible = true
  ), workout_counts AS (
    SELECT
      v.user_id,
      count(*) FILTER (WHERE v.datum >= date_trunc('week', now())::date) AS week_treninzi,
      count(*) AS total_treninzi
    FROM public.vezbi v
    JOIN visible_users vu ON vu.user_id = v.user_id
    GROUP BY v.user_id
  )
  SELECT
    vu.user_id,
    vu.display_name,
    coalesce(wc.week_treninzi, 0)::bigint AS week_treninzi,
    coalesce(wc.total_treninzi, 0)::bigint AS total_treninzi
  FROM visible_users vu
  LEFT JOIN workout_counts wc ON wc.user_id = vu.user_id
  ORDER BY coalesce(wc.week_treninzi, 0) DESC, coalesce(wc.total_treninzi, 0) DESC;
$$;

REVOKE ALL ON FUNCTION public.get_public_leaderboard() FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_leaderboard() TO authenticated;

DROP FUNCTION IF EXISTS public.v15_apply_owner_policies(text);
DROP FUNCTION IF EXISTS public.v15_add_check_if_column_exists(text, text, text, text);

NOTIFY pgrst, 'reload schema';

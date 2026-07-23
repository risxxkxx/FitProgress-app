-- Fit Progress input validation patch
-- Run this once in Supabase SQL Editor before/after deploying v14.
-- It removes obviously invalid test data and adds DB-level guards for future inputs.

CREATE OR REPLACE FUNCTION public.add_check_if_column_exists(
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

DO $$
BEGIN
  -- Clean invalid measurement test rows, e.g. 0kg, negative kg, 1900kg.
  IF to_regclass('public.merki') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='merki' AND column_name='tezina') THEN
    DELETE FROM public.merki WHERE tezina IS NOT NULL AND (tezina < 30 OR tezina > 250);
  END IF;
END $$;

DO $$
BEGIN
  -- Normalize impossible goal values already saved during testing.
  IF to_regclass('public.goals') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='goals' AND column_name='water_goal') THEN
      EXECUTE 'UPDATE public.goals SET water_goal = LEAST(GREATEST(water_goal, 1), 20) WHERE water_goal IS NOT NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='goals' AND column_name='train_goal') THEN
      EXECUTE 'UPDATE public.goals SET train_goal = LEAST(GREATEST(train_goal, 1), 7) WHERE train_goal IS NOT NULL';
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='goals' AND column_name='training_days') THEN
      EXECUTE 'UPDATE public.goals SET training_days = LEAST(GREATEST(training_days, 1), 7) WHERE training_days IS NOT NULL';
    END IF;
  END IF;
END $$;

-- Measurements
SELECT public.add_check_if_column_exists('merki', 'tezina', 'merki_tezina_range', 'tezina IS NULL OR (tezina >= 30 AND tezina <= 250)');
SELECT public.add_check_if_column_exists('merki', 'bmi', 'merki_bmi_range', 'bmi IS NULL OR (bmi >= 10 AND bmi <= 80)');
SELECT public.add_check_if_column_exists('merki', 'struk', 'merki_struk_range', 'struk IS NULL OR (struk >= 20 AND struk <= 250)');
SELECT public.add_check_if_column_exists('merki', 'gradi', 'merki_gradi_range', 'gradi IS NULL OR (gradi >= 20 AND gradi <= 250)');
SELECT public.add_check_if_column_exists('merki', 'butovi', 'merki_butovi_range', 'butovi IS NULL OR (butovi >= 20 AND butovi <= 250)');

-- Profiles
SELECT public.add_check_if_column_exists('profili', 'visina', 'profili_visina_range', 'visina IS NULL OR (visina >= 100 AND visina <= 230)');
SELECT public.add_check_if_column_exists('profili', 'tezina', 'profili_tezina_range', 'tezina IS NULL OR (tezina >= 30 AND tezina <= 250)');
SELECT public.add_check_if_column_exists('profili', 'vozrast', 'profili_vozrast_range', 'vozrast IS NULL OR (vozrast >= 13 AND vozrast <= 90)');

-- Goals
SELECT public.add_check_if_column_exists('goals', 'water_goal', 'goals_water_range', 'water_goal IS NULL OR (water_goal >= 1 AND water_goal <= 20)');
SELECT public.add_check_if_column_exists('goals', 'train_goal', 'goals_train_goal_range', 'train_goal IS NULL OR (train_goal >= 1 AND train_goal <= 7)');
SELECT public.add_check_if_column_exists('goals', 'training_days', 'goals_training_days_range', 'training_days IS NULL OR (training_days >= 1 AND training_days <= 7)');
SELECT public.add_check_if_column_exists('goals', 'weight_start', 'goals_weight_start_range', 'weight_start IS NULL OR (weight_start >= 30 AND weight_start <= 250)');
SELECT public.add_check_if_column_exists('goals', 'weight_goal', 'goals_weight_goal_range', 'weight_goal IS NULL OR (weight_goal >= 30 AND weight_goal <= 250)');
SELECT public.add_check_if_column_exists('goals', 'start_weight', 'goals_start_weight_range', 'start_weight IS NULL OR (start_weight >= 30 AND start_weight <= 250)');
SELECT public.add_check_if_column_exists('goals', 'target_weight', 'goals_target_weight_range', 'target_weight IS NULL OR (target_weight >= 30 AND target_weight <= 250)');
SELECT public.add_check_if_column_exists('goals', 'kcal_goal', 'goals_kcal_range', 'kcal_goal IS NULL OR (kcal_goal >= 1200 AND kcal_goal <= 5000)');
SELECT public.add_check_if_column_exists('goals', 'dnevni_kalorii', 'goals_dnevni_kalorii_range', 'dnevni_kalorii IS NULL OR (dnevni_kalorii >= 1200 AND dnevni_kalorii <= 5000)');
SELECT public.add_check_if_column_exists('goals', 'kalorii', 'goals_kalorii_range', 'kalorii IS NULL OR (kalorii >= 1200 AND kalorii <= 5000)');
SELECT public.add_check_if_column_exists('goals', 'prot_goal', 'goals_protein_range', 'prot_goal IS NULL OR (prot_goal >= 20 AND prot_goal <= 350)');
SELECT public.add_check_if_column_exists('goals', 'protein', 'goals_protein2_range', 'protein IS NULL OR (protein >= 20 AND protein <= 350)');

-- Water log
SELECT public.add_check_if_column_exists('voda', 'chasi', 'voda_chasi_range', 'chasi IS NULL OR (chasi >= 0 AND chasi <= 20)');

-- Meals
SELECT public.add_check_if_column_exists('obroci', 'kcal', 'obroci_kcal_range', 'kcal IS NULL OR (kcal >= 0 AND kcal <= 5000)');
SELECT public.add_check_if_column_exists('obroci', 'proteini', 'obroci_proteini_range', 'proteini IS NULL OR (proteini >= 0 AND proteini <= 500)');
SELECT public.add_check_if_column_exists('obroci', 'jaglehidrati', 'obroci_jaglehidrati_range', 'jaglehidrati IS NULL OR (jaglehidrati >= 0 AND jaglehidrati <= 500)');
SELECT public.add_check_if_column_exists('obroci', 'masti', 'obroci_masti_range', 'masti IS NULL OR (masti >= 0 AND masti <= 500)');

DROP FUNCTION IF EXISTS public.add_check_if_column_exists(text, text, text, text);

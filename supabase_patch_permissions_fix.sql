-- ПОПРАВКА: "permission denied for table X" + недостасувачки колони (пр. 'butovi' во merki)
--
-- Причина 1 (permission denied): кога табела се создава преку SQL Editor, понекогаш
-- Supabase не додели автоматски правa на "authenticated" ролата. RLS политиките сами
-- по себе не се доволни — треба и основен GRANT на табелата.
--
-- Причина 2 (недостасува колона): "create table if not exists" НЕ додава нови колони
-- ако табелата веќе постоела од претходно (пред некои колони да се додадат во кодот).
-- Затоа тука експлицитно ги додаваме сите колони со ADD COLUMN IF NOT EXISTS.
--
-- Безбедно е да се изврши повеќе пати.

-- 1) GRANT — реши "permission denied for table ..." за сите табели
grant usage on schema public to authenticated, anon;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;

-- Do not grant anonymous users blanket access to every table.
-- Public/anonymous features must receive explicit, table-specific grants and RLS policies.
revoke all on all tables in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;

alter default privileges in schema public grant all on tables to authenticated;
alter default privileges in schema public grant all on sequences to authenticated;

-- 2) Backfill недостасувачки колони на merki (fix за 'butovi' грешката)
alter table if exists public.merki add column if not exists struk integer;
alter table if exists public.merki add column if not exists gradi integer;
alter table if exists public.merki add column if not exists butovi integer;
alter table if exists public.merki add column if not exists bmi numeric(4,1);
alter table if exists public.merki add column if not exists beleshka text;

-- 3) Backfill на останати табели што можеби постоеле од постара верзија
alter table if exists public.obroci add column if not exists jaglehidrati numeric(6,1) default 0;
alter table if exists public.obroci add column if not exists masti numeric(6,1) default 0;
alter table if exists public.nedelen_plan add column if not exists pon text default '—';
alter table if exists public.nedelen_plan add column if not exists vto text default '—';
alter table if exists public.nedelen_plan add column if not exists sre text default '—';
alter table if exists public.nedelen_plan add column if not exists cet text default '—';
alter table if exists public.nedelen_plan add column if not exists pet text default '—';
alter table if exists public.nedelen_plan add column if not exists sab text default '—';
alter table if exists public.nedelen_plan add column if not exists ned text default '—';

notify pgrst, 'reload schema';

-- 4) ПОПРАВКА: "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification" — истата причина како кај 'butovi': табелата веќе постоела од
-- порано (пред UNIQUE да се додаде во кодот), па CREATE TABLE IF NOT EXISTS
-- никогаш не го применил constraint-от. UNIQUE INDEX ја решава истата работа
-- за ON CONFLICT и поддржува IF NOT EXISTS директно.
create unique index if not exists profili_user_id_uidx on public.profili(user_id);
create unique index if not exists goals_user_id_uidx on public.goals(user_id);
create unique index if not exists nedelen_plan_user_id_uidx on public.nedelen_plan(user_id);
create unique index if not exists aktiven_plan_user_id_uidx on public.aktiven_plan(user_id);
create unique index if not exists subscriptions_user_id_uidx on public.subscriptions(user_id);
create unique index if not exists account_status_user_id_uidx on public.account_status(user_id);
create unique index if not exists voda_user_datum_uidx on public.voda(user_id, datum);
create unique index if not exists suplementi_user_datum_uidx on public.suplementi(user_id, datum);

-- 5) leaderboard_prefs — табела што ја користи Leaderboard страницата, но никогаш
-- не била дефинирана во schema-та (недостасуваше целосно).
create table if not exists public.leaderboard_prefs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  visible boolean default false,
  display_name text,
  updated_at timestamptz default now()
);
alter table public.leaderboard_prefs enable row level security;
drop policy if exists "Users manage own leaderboard_prefs" on public.leaderboard_prefs;
create policy "Users manage own leaderboard_prefs" on public.leaderboard_prefs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Everyone reads visible leaderboard_prefs" on public.leaderboard_prefs;
create policy "Everyone reads visible leaderboard_prefs" on public.leaderboard_prefs for select using (visible = true or auth.uid() = user_id);
create unique index if not exists leaderboard_prefs_user_id_uidx on public.leaderboard_prefs(user_id);

notify pgrst, 'reload schema';

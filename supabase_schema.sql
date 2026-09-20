-- FIT Progress / FITNESS Supabase schema
-- Run this in Supabase SQL Editor. It is safe for existing projects because most changes use IF NOT EXISTS.

create extension if not exists "uuid-ossp";

-- Profiles
create table if not exists profili (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  email text,
  ime text,
  prezime text,
  full_name text,
  visina integer,
  onboarding_done boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table profili add column if not exists email text;
alter table profili add column if not exists ime text;
alter table profili add column if not exists prezime text;
alter table profili add column if not exists full_name text;
alter table profili add column if not exists onboarding_done boolean default false;
alter table profili add column if not exists updated_at timestamptz default now();
alter table profili add column if not exists tezina numeric;
alter table profili add column if not exists pol text;
alter table profili add column if not exists vozrast integer;
alter table profili add column if not exists cel text;
alter table profili add column if not exists aktivnost text;
alter table profili enable row level security;
drop policy if exists "Users manage own profile" on profili;
create policy "Users manage own profile" on profili for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Admin read all profiles" on profili;
create policy "Admin read all profiles" on profili for select using ((auth.jwt() ->> 'email') = 'agencynula@gmail.com');

create index if not exists profili_email_idx on profili(email);
create index if not exists profili_user_id_idx on profili(user_id);

-- Backfill existing rows from Supabase auth users, so Table Editor is readable.
update profili p
set
  email = coalesce(p.email, lower(u.email)),
  full_name = coalesce(p.full_name, u.raw_user_meta_data ->> 'full_name'),
  ime = coalesce(p.ime, u.raw_user_meta_data ->> 'ime', split_part(coalesce(p.full_name, u.raw_user_meta_data ->> 'full_name', ''), ' ', 1)),
  prezime = coalesce(p.prezime, u.raw_user_meta_data ->> 'prezime', nullif(trim(replace(coalesce(p.full_name, u.raw_user_meta_data ->> 'full_name', ''), split_part(coalesce(p.full_name, u.raw_user_meta_data ->> 'full_name', ''), ' ', 1), '')), '')),
  updated_at = now()
from auth.users u
where p.user_id = u.id;

-- Open this view in Supabase Table Editor when you want a clean readable list.
-- It shows email, name and surname first instead of starting with UUID columns.
create or replace view public.profili_pregled with (security_invoker = true) as
select
  coalesce(p.email, lower(u.email)) as email,
  coalesce(p.ime, u.raw_user_meta_data ->> 'ime', split_part(coalesce(p.full_name, u.raw_user_meta_data ->> 'full_name', ''), ' ', 1)) as ime,
  coalesce(p.prezime, u.raw_user_meta_data ->> 'prezime') as prezime,
  coalesce(p.full_name, u.raw_user_meta_data ->> 'full_name') as full_name,
  p.user_id,
  p.id,
  p.visina,
  p.pol,
  p.vozrast,
  p.cel,
  p.aktivnost,
  p.onboarding_done,
  p.created_at,
  p.updated_at
from profili p
left join auth.users u on u.id = p.user_id;

-- This view is intended for trusted database/dashboard inspection, not the public API.
revoke all on public.profili_pregled from anon, authenticated;

-- Goals
create table if not exists goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  kcal_goal integer default 2000,
  prot_goal integer default 150,
  water_goal integer default 10,
  train_goal integer default 3,
  weight_start numeric(5,1) default 80,
  weight_goal numeric(5,1) default 74,
  updated_at timestamptz default now()
);
alter table goals add column if not exists cel text;
alter table goals add column if not exists goal_type text;
alter table goals add column if not exists visina numeric;
alter table goals add column if not exists start_weight numeric;
alter table goals add column if not exists target_weight numeric;
alter table goals add column if not exists kalorii numeric;
alter table goals add column if not exists dnevni_kalorii numeric;
alter table goals add column if not exists protein numeric;
alter table goals add column if not exists carbs numeric;
alter table goals add column if not exists fats numeric;
alter table goals add column if not exists training_days integer;
alter table goals enable row level security;
drop policy if exists "Users manage own goals" on goals;
create policy "Users manage own goals" on goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Admin read goals" on goals;
create policy "Admin read goals" on goals for select using ((auth.jwt() ->> 'email') = 'agencynula@gmail.com');

-- Body measurements
create table if not exists merki (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  datum date not null,
  tezina numeric(5,1) not null,
  struk integer,
  gradi integer,
  butovi integer,
  bmi numeric(4,1),
  beleshka text,
  created_at timestamptz default now()
);
alter table merki enable row level security;
drop policy if exists "Users manage own merki" on merki;
create policy "Users manage own merki" on merki for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Admin read merki" on merki;
create policy "Admin read merki" on merki for select using ((auth.jwt() ->> 'email') = 'agencynula@gmail.com');
create index if not exists merki_user_datum on merki(user_id, datum desc);

-- Workouts
create table if not exists vezbi (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  naziv text not null,
  datum date not null,
  seriji jsonb,
  max_kg numeric(6,1) default 0,
  total_volumen numeric(8,1) default 0,
  beleshka text,
  created_at timestamptz default now()
);
alter table vezbi enable row level security;
drop policy if exists "Users manage own vezbi" on vezbi;
create policy "Users manage own vezbi" on vezbi for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Admin read vezbi" on vezbi;
create policy "Admin read vezbi" on vezbi for select using ((auth.jwt() ->> 'email') = 'agencynula@gmail.com');
create index if not exists vezbi_user_datum on vezbi(user_id, datum desc);
create index if not exists vezbi_user_naziv on vezbi(user_id, naziv);

-- Meals
create table if not exists obroci (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  tip text not null,
  jadenje text not null,
  kcal integer default 0,
  proteini integer default 0,
  datum date not null,
  created_at timestamptz default now()
);
alter table obroci enable row level security;
drop policy if exists "Users manage own obroci" on obroci;
create policy "Users manage own obroci" on obroci for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Admin read obroci" on obroci;
create policy "Admin read obroci" on obroci for select using ((auth.jwt() ->> 'email') = 'agencynula@gmail.com');
create index if not exists obroci_user_datum on obroci(user_id, datum desc);

-- Water
create table if not exists voda (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  datum date not null,
  chasi integer default 0,
  unique(user_id, datum)
);
alter table voda enable row level security;
drop policy if exists "Users manage own voda" on voda;
create policy "Users manage own voda" on voda for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Admin read voda" on voda;
create policy "Admin read voda" on voda for select using ((auth.jwt() ->> 'email') = 'agencynula@gmail.com');

-- Supplements daily checks and supplement list
create table if not exists suplementi (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  datum date not null,
  morning boolean default false,
  postworkout boolean default false,
  checked jsonb default '{}'::jsonb,
  unique(user_id, datum)
);
alter table suplementi add column if not exists checked jsonb default '{}'::jsonb;
alter table suplementi enable row level security;
drop policy if exists "Users manage own suplementi" on suplementi;
create policy "Users manage own suplementi" on suplementi for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists suplementi_lista (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  naziv text not null,
  doza text,
  vreme text,
  created_at timestamptz default now()
);
alter table suplementi_lista enable row level security;
drop policy if exists "Users manage own suplementi_lista" on suplementi_lista;
create policy "Users manage own suplementi_lista" on suplementi_lista for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Weekly plan
create table if not exists nedelen_plan (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  pon text default '—',
  vto text default '—',
  sre text default '—',
  cet text default '—',
  pet text default '—',
  sab text default '—',
  ned text default '—',
  updated_at timestamptz default now()
);
alter table nedelen_plan enable row level security;
drop policy if exists "Users manage own nedelen_plan" on nedelen_plan;
create policy "Users manage own nedelen_plan" on nedelen_plan for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Custom exercises
create table if not exists custom_vezbi (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  naziv text not null,
  grupa text not null default 'Мои вежби',
  created_at timestamptz default now()
);
alter table custom_vezbi enable row level security;
drop policy if exists "Users manage own custom_vezbi" on custom_vezbi;
create policy "Users manage own custom_vezbi" on custom_vezbi for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists hidden_vezbi (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  naziv text not null,
  unique(user_id, naziv)
);
alter table hidden_vezbi enable row level security;
drop policy if exists "Users manage own hidden_vezbi" on hidden_vezbi;
create policy "Users manage own hidden_vezbi" on hidden_vezbi for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Active predefined plan
create table if not exists aktiven_plan (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  plan_id text not null,
  started_at timestamptz default now()
);
alter table aktiven_plan enable row level security;
drop policy if exists "Users manage own aktiven_plan" on aktiven_plan;
create policy "Users manage own aktiven_plan" on aktiven_plan for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Future monetization and admin monitoring
create table if not exists subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  status text default 'free' check (status in ('free', 'trial', 'paid', 'past_due', 'cancelled')),
  plan_name text,
  payment_provider text,
  provider_customer_id text,
  current_period_end timestamptz,
  updated_at timestamptz default now()
);
alter table subscriptions add column if not exists payment_status text default 'free';
alter table subscriptions add column if not exists is_paid boolean default false;
alter table subscriptions add column if not exists plan text default 'free';
alter table subscriptions add column if not exists price_amount numeric default 0;
alter table subscriptions add column if not exists currency text default 'EUR';
alter table subscriptions enable row level security;
drop policy if exists "Admin manage subscriptions" on subscriptions;
create policy "Admin manage subscriptions" on subscriptions for all using ((auth.jwt() ->> 'email') = 'agencynula@gmail.com') with check ((auth.jwt() ->> 'email') = 'agencynula@gmail.com');
drop policy if exists "Users read own subscriptions" on subscriptions;
create policy "Users read own subscriptions" on subscriptions for select using (auth.uid() = user_id);

create table if not exists account_status (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  status text default 'active' check (status in ('active', 'blocked')),
  reason text,
  updated_by uuid references auth.users(id),
  updated_at timestamptz default now()
);
alter table account_status add column if not exists email text;
alter table account_status add column if not exists role text default 'user';
alter table account_status add column if not exists is_blocked boolean default false;
alter table account_status add column if not exists blocked_reason text;
alter table account_status add column if not exists alarm_level text default 'ok';
alter table account_status add column if not exists notes text;
alter table account_status enable row level security;
drop policy if exists "Admin manage account_status" on account_status;
create policy "Admin manage account_status" on account_status for all using ((auth.jwt() ->> 'email') = 'agencynula@gmail.com') with check ((auth.jwt() ->> 'email') = 'agencynula@gmail.com');
drop policy if exists "Users read own account_status" on account_status;
create policy "Users read own account_status" on account_status for select using (auth.uid() = user_id);

-- Optional table for future frontend/runtime alarms
create table if not exists app_alarms (
  id uuid default uuid_generate_v4() primary key,
  severity text default 'info',
  title text not null,
  details text,
  resolved boolean default false,
  created_at timestamptz default now()
);
alter table app_alarms enable row level security;
drop policy if exists "Admin manage app alarms" on app_alarms;
create policy "Admin manage app alarms" on app_alarms for all using ((auth.jwt() ->> 'email') = 'agencynula@gmail.com') with check ((auth.jwt() ->> 'email') = 'agencynula@gmail.com');

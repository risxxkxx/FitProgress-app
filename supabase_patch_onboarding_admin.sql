-- FITNESS APP SAFE PATCH
-- Run this once if onboarding, water/supplements, or admin overview show schema errors.

create extension if not exists "uuid-ossp";

alter table if exists public.profili add column if not exists email text;
alter table if exists public.profili add column if not exists ime text;
alter table if exists public.profili add column if not exists prezime text;
alter table if exists public.profili add column if not exists full_name text;
alter table if exists public.profili add column if not exists visina numeric;
alter table if exists public.profili add column if not exists tezina numeric;
alter table if exists public.profili add column if not exists pol text;
alter table if exists public.profili add column if not exists vozrast integer;
alter table if exists public.profili add column if not exists cel text;
alter table if exists public.profili add column if not exists aktivnost text;
alter table if exists public.profili add column if not exists onboarding_done boolean default false;
alter table if exists public.profili add column if not exists updated_at timestamptz default now();

create table if not exists public.goals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  updated_at timestamptz default now()
);
alter table public.goals add column if not exists kcal_goal integer default 2000;
alter table public.goals add column if not exists prot_goal integer default 150;
alter table public.goals add column if not exists water_goal integer default 10;
alter table public.goals add column if not exists train_goal integer default 3;
alter table public.goals add column if not exists weight_start numeric default 80;
alter table public.goals add column if not exists weight_goal numeric default 74;
alter table public.goals add column if not exists cel text;
alter table public.goals add column if not exists goal_type text;
alter table public.goals add column if not exists visina numeric;
alter table public.goals add column if not exists start_weight numeric;
alter table public.goals add column if not exists target_weight numeric;
alter table public.goals add column if not exists kalorii numeric;
alter table public.goals add column if not exists dnevni_kalorii numeric;
alter table public.goals add column if not exists protein numeric;
alter table public.goals add column if not exists carbs numeric;
alter table public.goals add column if not exists fats numeric;
alter table public.goals add column if not exists training_days integer;

create table if not exists public.voda (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  datum date not null,
  chasi integer default 0,
  unique(user_id, datum)
);

create table if not exists public.suplementi (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  datum date not null,
  checked jsonb default '{}'::jsonb,
  unique(user_id, datum)
);
alter table public.suplementi add column if not exists checked jsonb default '{}'::jsonb;

create table if not exists public.suplementi_lista (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  naziv text not null,
  doza text,
  vreme text,
  created_at timestamptz default now()
);

create table if not exists public.subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  updated_at timestamptz default now()
);
alter table public.subscriptions add column if not exists status text default 'free';
alter table public.subscriptions add column if not exists payment_status text default 'free';
alter table public.subscriptions add column if not exists is_paid boolean default false;
alter table public.subscriptions add column if not exists plan text default 'free';
alter table public.subscriptions add column if not exists plan_name text;
alter table public.subscriptions add column if not exists payment_provider text;
alter table public.subscriptions add column if not exists provider_customer_id text;
alter table public.subscriptions add column if not exists current_period_end timestamptz;

create table if not exists public.account_status (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade unique not null,
  updated_at timestamptz default now()
);
alter table public.account_status add column if not exists status text default 'active';
alter table public.account_status add column if not exists is_blocked boolean default false;
alter table public.account_status add column if not exists email text;
alter table public.account_status add column if not exists role text default 'user';
alter table public.account_status add column if not exists reason text;
alter table public.account_status add column if not exists blocked_reason text;
alter table public.account_status add column if not exists updated_by uuid references auth.users(id);
alter table public.account_status add column if not exists alarm_level text default 'ok';
alter table public.account_status add column if not exists notes text;

alter table public.profili enable row level security;
alter table public.goals enable row level security;
alter table public.voda enable row level security;
alter table public.suplementi enable row level security;
alter table public.suplementi_lista enable row level security;
alter table public.subscriptions enable row level security;
alter table public.account_status enable row level security;

drop policy if exists "Users manage own profile" on public.profili;
create policy "Users manage own profile" on public.profili for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Admin read all profiles" on public.profili;
create policy "Admin read all profiles" on public.profili for select using ((auth.jwt() ->> 'email') = 'agencynula@gmail.com');

drop policy if exists "Users manage own goals" on public.goals;
create policy "Users manage own goals" on public.goals for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Admin read goals" on public.goals;
create policy "Admin read goals" on public.goals for select using ((auth.jwt() ->> 'email') = 'agencynula@gmail.com');

drop policy if exists "Users manage own voda" on public.voda;
create policy "Users manage own voda" on public.voda for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Admin read voda" on public.voda;
create policy "Admin read voda" on public.voda for select using ((auth.jwt() ->> 'email') = 'agencynula@gmail.com');

drop policy if exists "Users manage own suplementi" on public.suplementi;
create policy "Users manage own suplementi" on public.suplementi for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users manage own suplementi_lista" on public.suplementi_lista;
create policy "Users manage own suplementi_lista" on public.suplementi_lista for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Admin manage subscriptions" on public.subscriptions;
create policy "Admin manage subscriptions" on public.subscriptions for all using ((auth.jwt() ->> 'email') = 'agencynula@gmail.com') with check ((auth.jwt() ->> 'email') = 'agencynula@gmail.com');
drop policy if exists "Users read own subscriptions" on public.subscriptions;
create policy "Users read own subscriptions" on public.subscriptions for select using (auth.uid() = user_id);

drop policy if exists "Admin manage account_status" on public.account_status;
create policy "Admin manage account_status" on public.account_status for all using ((auth.jwt() ->> 'email') = 'agencynula@gmail.com') with check ((auth.jwt() ->> 'email') = 'agencynula@gmail.com');
drop policy if exists "Users read own account_status" on public.account_status;
create policy "Users read own account_status" on public.account_status for select using (auth.uid() = user_id);

create or replace view public.profili_pregled as
select
  p.email,
  p.ime,
  p.prezime,
  p.full_name,
  p.user_id,
  p.id,
  p.visina,
  p.tezina,
  p.pol,
  p.vozrast,
  p.cel,
  p.aktivnost,
  p.onboarding_done,
  coalesce(a.role, case when lower(coalesce(p.email,'')) = 'agencynula@gmail.com' then 'admin' else 'user' end) as role,
  coalesce(a.is_blocked, a.status = 'blocked', false) as is_blocked,
  coalesce(s.payment_status, s.status, 'free') as payment_status,
  coalesce(s.is_paid, s.status = 'paid', false) as is_paid,
  p.created_at,
  p.updated_at
from public.profili p
left join public.account_status a on a.user_id = p.user_id
left join public.subscriptions s on s.user_id = p.user_id;

notify pgrst, 'reload schema';

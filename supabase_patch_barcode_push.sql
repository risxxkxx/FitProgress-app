-- Патч: бар-код скенер за храна (нови колони) + push нотификации (нова табела)
-- Безбедно е за постоечки проект — сите промени користат IF NOT EXISTS.

-- 1) Оброци — јаглехидрати и масти (бар-код скенерот ги пополнува автоматски)
alter table public.obroci add column if not exists jaglehidrati numeric(6,1) default 0;
alter table public.obroci add column if not exists masti numeric(6,1) default 0;

-- 2) Push subscriptions — за web push нотификации (потсетници за тренинг/вода/суплементи)
create table if not exists public.push_subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "Users manage own push_subscriptions" on public.push_subscriptions;
create policy "Users manage own push_subscriptions" on public.push_subscriptions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Admin read push_subscriptions" on public.push_subscriptions;
create policy "Admin read push_subscriptions" on public.push_subscriptions for select using ((auth.jwt() ->> 'email') = 'agencynula@gmail.com');
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

-- 3) Мои намирници — библиотека на често користена храна (рачно внесена или скенирана),
-- за побрзо логирање следниот пат без повторно внесување/скенирање.
create table if not exists public.hrani_lista (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  naziv text not null,
  kcal numeric(6,1) default 0,
  proteini numeric(6,1) default 0,
  jaglehidrati numeric(6,1) default 0,
  masti numeric(6,1) default 0,
  per_100g boolean default false,
  barcode text,
  created_at timestamptz default now(),
  unique(user_id, barcode)
);
alter table public.hrani_lista enable row level security;
drop policy if exists "Users manage own hrani_lista" on public.hrani_lista;
create policy "Users manage own hrani_lista" on public.hrani_lista for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists hrani_lista_user_idx on public.hrani_lista(user_id);

notify pgrst, 'reload schema';

-- Табела за забелешки/пријави од тестери, испратени директно од апликацијата
-- (копчето "📝 Забелешка" достапно на секоја страница).

create table if not exists public.feedback (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  kategorija text default 'other', -- 'bug' | 'idea' | 'other'
  poraka text not null,
  stranica text,
  resolved boolean default false,
  created_at timestamptz default now()
);
alter table public.feedback enable row level security;

drop policy if exists "Users insert own feedback" on public.feedback;
create policy "Users insert own feedback" on public.feedback for insert with check (auth.uid() = user_id);

drop policy if exists "Users read own feedback" on public.feedback;
create policy "Users read own feedback" on public.feedback for select using (auth.uid() = user_id);

drop policy if exists "Admin manage all feedback" on public.feedback;
create policy "Admin manage all feedback" on public.feedback for all using ((auth.jwt() ->> 'email') = 'agencynula@gmail.com');

create unique index if not exists feedback_id_uidx on public.feedback(id);
create index if not exists feedback_created_idx on public.feedback(created_at desc);

grant all on public.feedback to authenticated;

notify pgrst, 'reload schema';

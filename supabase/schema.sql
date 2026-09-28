-- QuestLogs Supabase schema
-- Run this once in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query).

create extension if not exists "pgcrypto";

-- One row per user: running gem total + their gem goal (Progress page)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gems integer not null default 0,
  gem_goal integer not null default 100,
  updated_at timestamptz not null default now()
);

-- Quest themes (color-coded categories from the Logs page)
create table if not exists public.themes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null,
  created_at timestamptz not null default now()
);

-- Active quests sitting in one of the four planner columns
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  column_id text not null check (column_id in ('today', 'tomorrow', 'week', 'unassigned')),
  name text not null,
  time text not null default '',
  description text not null default '',
  gems integer not null default 0,
  theme_id uuid references public.themes(id) on delete set null,
  position bigint not null default 0,
  created_at timestamptz not null default now()
);

-- Migration: earlier versions of this schema created "position" as integer,
-- which overflows for the Date.now()-based values the app uses. Safe to
-- re-run; a no-op once the column is already bigint.
alter table public.tasks alter column position type bigint;

-- Finished quests, one row per completion (this is the "logs" history)
create table if not exists public.completed_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  gems integer not null default 0,
  theme_id uuid references public.themes(id) on delete set null,
  completed_date date not null,
  completed_at timestamptz not null default now()
);

-- Base privileges: RLS policies (below) control *which rows* a role can touch,
-- but the role needs these grants before RLS is even consulted. Supabase's
-- dashboard adds these automatically when you create a table through its UI;
-- since these tables are created via raw SQL, we grant them explicitly here.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.themes to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.completed_tasks to authenticated;

-- Row Level Security: every table is locked to its own owner
alter table public.user_settings enable row level security;
alter table public.themes enable row level security;
alter table public.tasks enable row level security;
alter table public.completed_tasks enable row level security;

drop policy if exists "own settings" on public.user_settings;
create policy "own settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own themes" on public.themes;
create policy "own themes" on public.themes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own tasks" on public.tasks;
create policy "own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own completed_tasks" on public.completed_tasks;
create policy "own completed_tasks" on public.completed_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Realtime: broadcast row changes so other logged-in devices update live.
-- Wrapped so this is safe to re-run even after the tables are already added.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'user_settings') then
    alter publication supabase_realtime add table public.user_settings;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'themes') then
    alter publication supabase_realtime add table public.themes;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'tasks') then
    alter publication supabase_realtime add table public.tasks;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'completed_tasks') then
    alter publication supabase_realtime add table public.completed_tasks;
  end if;
end $$;

-- Auto-delete finished quests from the Logs page 60 days after they were completed.
-- Runs once a day server-side (not tied to anyone having the app open), so it's
-- consistent and never fires early/late/randomly.
create extension if not exists pg_cron;

create or replace function public.delete_old_completed_tasks()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.completed_tasks
  where completed_at < now() - interval '60 days';
$$;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'delete-old-completed-tasks') then
    perform cron.unschedule('delete-old-completed-tasks');
  end if;
end $$;

-- Runs every night at 03:00 UTC
select cron.schedule('delete-old-completed-tasks', '0 3 * * *', $$select public.delete_old_completed_tasks();$$);


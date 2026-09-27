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
  position integer not null default 0,
  created_at timestamptz not null default now()
);

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

-- Realtime: broadcast row changes so other logged-in devices update live
alter publication supabase_realtime add table public.user_settings, public.themes, public.tasks, public.completed_tasks;

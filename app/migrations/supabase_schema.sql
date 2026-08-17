-- ============================================================
-- AI-Driven Task/Todo Schema (v2)
-- Run this in Supabase SQL Editor after dropping old tables
-- ============================================================

-- Drop old tables and functions
DROP TABLE IF EXISTS public.todos CASCADE;
DROP FUNCTION IF EXISTS handle_updated_at() CASCADE;

-- Enable necessary extensions
create extension if not exists "pgcrypto";

-- ============================================================
-- TASKS TABLE
-- A task is a high-level goal created from user input (voice/text).
-- AI decomposes a task into multiple todos.
-- ============================================================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  source_text text,
  source_type text not null default 'text' check (source_type in ('text', 'voice')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tasks enable row level security;

create policy "Users CRUD own tasks"
  on public.tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_tasks_user_id on public.tasks(user_id, created_at desc);

-- ============================================================
-- TODOS TABLE
-- Each todo belongs to exactly one task.
-- ============================================================
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  completed boolean default false,
  "order" integer not null default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.todos enable row level security;

create policy "Users CRUD own todos"
  on public.todos for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_todos_task_id on public.todos(task_id, "order");

-- ============================================================
-- TRIGGERS for updated_at
-- ============================================================
create or replace function handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on public.tasks
  for each row
  execute procedure handle_updated_at();

create trigger todos_updated_at
  before update on public.todos
  for each row
  execute procedure handle_updated_at();

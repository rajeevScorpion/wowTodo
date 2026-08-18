-- ============================================================
-- Migration: Add Task Groups
-- Adds task_groups table and group_id FK to tasks table.
-- Run this in Supabase SQL Editor after the base schema.
-- ============================================================

-- ============================================================
-- TASK_GROUPS TABLE
-- Groups are broad categories (max 2-word names) that organize tasks.
-- AI suggests groups during task creation; users can also create custom ones.
-- ============================================================
create table public.task_groups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.task_groups enable row level security;

create policy "Users CRUD own groups"
  on public.task_groups for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index idx_task_groups_user_id on public.task_groups(user_id, created_at desc);

-- Reuse existing handle_updated_at() trigger function
create trigger task_groups_updated_at
  before update on public.task_groups
  for each row
  execute procedure handle_updated_at();

-- ============================================================
-- ADD group_id TO TASKS
-- SET NULL on delete: deleting a group ungroups tasks, not deletes them.
-- ============================================================
alter table public.tasks
  add column group_id uuid references public.task_groups(id) on delete set null;

create index idx_tasks_group_id on public.tasks(group_id);

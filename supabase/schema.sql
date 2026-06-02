-- =============================================================
-- Personal Finance & Time Management - Supabase schema
-- Run this whole file in: Supabase Dashboard -> SQL Editor -> New query
-- Safe to re-run (uses IF NOT EXISTS / DROP POLICY IF EXISTS).
-- =============================================================

-- Needed for gen_random_uuid()
create extension if not exists "pgcrypto";

-- -------------------------------------------------------------
-- Shared trigger: keep updated_at in sync on every UPDATE
-- -------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================
-- 1) profiles
-- =============================================================
create table if not exists public.profiles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id)
);

create index if not exists profiles_user_id_idx on public.profiles(user_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- =============================================================
-- 2) transactions  (income | expense)
-- =============================================================
create table if not exists public.transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  type             text not null check (type in ('income', 'expense')),
  amount           numeric(14, 2) not null check (amount >= 0),
  category         text not null,
  note             text,
  transaction_date date not null default current_date,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_date_idx on public.transactions(transaction_date);

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- =============================================================
-- 3) time_blocks
-- =============================================================
create table if not exists public.time_blocks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  type        text not null check (type in ('study', 'work', 'gym', 'school', 'rest', 'other')),
  start_time  time not null,
  end_time    time not null,
  block_date  date not null default current_date,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists time_blocks_user_id_idx on public.time_blocks(user_id);
create index if not exists time_blocks_date_idx on public.time_blocks(block_date);

drop trigger if exists set_time_blocks_updated_at on public.time_blocks;
create trigger set_time_blocks_updated_at
  before update on public.time_blocks
  for each row execute function public.set_updated_at();

-- =============================================================
-- 4) todos
-- =============================================================
create table if not exists public.todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  description text,
  status      text not null default 'pending' check (status in ('pending', 'done')),
  due_date    date,
  priority    text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists todos_user_id_idx on public.todos(user_id);
create index if not exists todos_due_date_idx on public.todos(due_date);

drop trigger if exists set_todos_updated_at on public.todos;
create trigger set_todos_updated_at
  before update on public.todos
  for each row execute function public.set_updated_at();

-- =============================================================
-- Auto-create a profile row when a new auth user signs up
-- =============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, display_name)
  values (new.id, split_part(new.email, '@', 1))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- Row Level Security
-- =============================================================
alter table public.profiles     enable row level security;
alter table public.transactions enable row level security;
alter table public.time_blocks  enable row level security;
alter table public.todos        enable row level security;

-- ---- profiles policies ----
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = user_id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "profiles_delete_own" on public.profiles;
create policy "profiles_delete_own" on public.profiles
  for delete using (auth.uid() = user_id);

-- ---- transactions policies ----
drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own" on public.transactions
  for select using (auth.uid() = user_id);

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own" on public.transactions
  for insert with check (auth.uid() = user_id);

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own" on public.transactions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own" on public.transactions
  for delete using (auth.uid() = user_id);

-- ---- time_blocks policies ----
drop policy if exists "time_blocks_select_own" on public.time_blocks;
create policy "time_blocks_select_own" on public.time_blocks
  for select using (auth.uid() = user_id);

drop policy if exists "time_blocks_insert_own" on public.time_blocks;
create policy "time_blocks_insert_own" on public.time_blocks
  for insert with check (auth.uid() = user_id);

drop policy if exists "time_blocks_update_own" on public.time_blocks;
create policy "time_blocks_update_own" on public.time_blocks
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "time_blocks_delete_own" on public.time_blocks;
create policy "time_blocks_delete_own" on public.time_blocks
  for delete using (auth.uid() = user_id);

-- ---- todos policies ----
drop policy if exists "todos_select_own" on public.todos;
create policy "todos_select_own" on public.todos
  for select using (auth.uid() = user_id);

drop policy if exists "todos_insert_own" on public.todos;
create policy "todos_insert_own" on public.todos
  for insert with check (auth.uid() = user_id);

drop policy if exists "todos_update_own" on public.todos;
create policy "todos_update_own" on public.todos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "todos_delete_own" on public.todos;
create policy "todos_delete_own" on public.todos
  for delete using (auth.uid() = user_id);

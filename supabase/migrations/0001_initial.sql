create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  timezone text not null default 'Asia/Bangkok',
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  notes text,
  status text not null default 'todo' check (status in ('todo', 'doing', 'waiting', 'done', 'cancelled')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_due_idx on public.tasks (user_id, due_at);
create index if not exists tasks_user_status_idx on public.tasks (user_id, status);

alter table public.tasks enable row level security;

create policy "Users can read own tasks"
on public.tasks for select
using (auth.uid() = user_id);

create policy "Users can insert own tasks"
on public.tasks for insert
with check (auth.uid() = user_id);

create policy "Users can update own tasks"
on public.tasks for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own tasks"
on public.tasks for delete
using (auth.uid() = user_id);

create table if not exists public.telegram_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  telegram_chat_id text not null unique,
  telegram_username text,
  linked_at timestamptz not null default now()
);

alter table public.telegram_accounts enable row level security;

create policy "Users can read own telegram account"
on public.telegram_accounts for select
using (auth.uid() = user_id);

create policy "Users can insert own telegram account"
on public.telegram_accounts for insert
with check (auth.uid() = user_id);

create policy "Users can update own telegram account"
on public.telegram_accounts for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own telegram account"
on public.telegram_accounts for delete
using (auth.uid() = user_id);

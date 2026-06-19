create table if not exists public.telegram_link_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists telegram_link_tokens_user_idx
on public.telegram_link_tokens (user_id, created_at desc);

alter table public.telegram_link_tokens enable row level security;

create policy "Users can read own telegram link tokens"
on public.telegram_link_tokens for select
using (auth.uid() = user_id);

create policy "Users can insert own telegram link tokens"
on public.telegram_link_tokens for insert
with check (auth.uid() = user_id);

grant select, insert, update
on public.telegram_link_tokens
to authenticated;

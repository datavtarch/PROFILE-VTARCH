# Database Design

## Core Tables

### profiles

- `id uuid primary key references auth.users(id)`
- `display_name text`
- `timezone text default 'Asia/Bangkok'`
- `created_at timestamptz default now()`

### tasks

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id)`
- `title text not null`
- `notes text`
- `status text not null default 'todo'`
- `priority text not null default 'normal'`
- `due_at timestamptz`
- `completed_at timestamptz`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

### telegram_accounts

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id)`
- `telegram_chat_id text not null unique`
- `telegram_username text`
- `linked_at timestamptz default now()`

## Status Values

- `todo`
- `doing`
- `waiting`
- `done`
- `cancelled`

## Security Rule

Every user-owned table must include `user_id` and RLS policies that only allow access when `user_id = auth.uid()`.

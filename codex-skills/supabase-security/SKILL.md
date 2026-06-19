---
name: supabase-security
description: Design, implement, and review Supabase authentication, database schema, Row Level Security, environment variables, and per-user data isolation for the task manager. Use when changing Supabase SQL, auth flows, user-owned tables, Telegram account linking, or data access code.
---

# Supabase Security

Protect per-user data first. Every user-owned table must have `user_id` and RLS policies based on `auth.uid()`.

## Workflow

1. Read `/docs/database-design.md` and `/docs/supabase-security.md`.
2. For every user-owned table, require:
   - `user_id uuid not null references auth.users(id)`
   - RLS enabled
   - policies for allowed select, insert, update, and delete operations
3. Ensure browser code uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Keep service role keys and Telegram tokens server-only.
5. Run `scripts/check-rls.ps1` against SQL migration files when migrations exist.
6. Add or update tests/checklists for data isolation when schema or access rules change.

## Automation

Use `scripts/check-rls.ps1 -Path <sql-folder-or-file>` to catch missing RLS basics in local SQL files.

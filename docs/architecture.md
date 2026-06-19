# Architecture

## Chosen Direction

```text
Code app -> GitHub -> Vercel -> Users
                  |
              Supabase
```

## Responsibilities

- GitHub stores source code, documentation, and project-local Codex skills.
- Vercel hosts the web app and lightweight API/webhook routes.
- Supabase handles authentication, database, and per-user data security.
- Telegram integration is added after the web app and Supabase security are stable.

## Recommended Stack

- Next.js with TypeScript for the web app.
- Supabase Auth for login.
- Supabase Postgres for task data.
- Row Level Security for data isolation.
- Vercel environment variables for public Supabase keys and webhook config.

## Core Data Flow

1. User signs in through Supabase Auth.
2. App receives the authenticated user id.
3. New tasks are inserted with `user_id = auth.uid()`.
4. Reads, updates, and deletes are restricted by Supabase RLS policies.
5. Vercel deploys updates automatically from GitHub.

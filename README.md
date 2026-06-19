# Task Tele

Personal task manager built with Next.js, Supabase, and a Telegram-ready architecture.

## Stack

- Next.js + TypeScript
- Supabase Auth + Postgres + Row Level Security
- Vercel deployment target
- Telegram reporting planned after the web app is stable

## Local Setup

1. Install dependencies:

```powershell
npm.cmd install
```

2. Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

3. Run the app:

```powershell
npm.cmd run dev
```

4. Open:

```text
http://127.0.0.1:3000
```

If Supabase env vars are empty, the app runs in local demo mode.

## Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/migrations/0001_initial.sql`.
4. Copy the project URL and publishable key into `.env.local`.

## Checks

```powershell
npm.cmd run typecheck
npm.cmd run build
powershell -ExecutionPolicy Bypass -File .\codex-skills\supabase-security\scripts\check-rls.ps1 -Path .\supabase\migrations
powershell -ExecutionPolicy Bypass -File .\codex-skills\vercel-deploy\scripts\predeploy-check.ps1 -Root .
```

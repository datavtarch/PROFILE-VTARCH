# Task Tele

Personal task manager with Supabase Auth, private per-user data, Telegram commands, reminders, and scheduled reports.

## Stack

- Next.js + TypeScript
- Supabase Auth + Postgres + Row Level Security
- Vercel hosting + Vercel Cron
- Telegram Bot API webhook

## Local Setup

```powershell
npm.cmd install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
CRON_SECRET=
```

Run:

```powershell
npm.cmd run dev
```

Open `http://127.0.0.1:3000`.

## Supabase Setup

Run migrations in order from `supabase/migrations`:

1. `0001_initial.sql`
2. `0002_authenticated_grants.sql`
3. `0003_telegram_link_tokens.sql`
4. `0004_service_role_grants.sql`
5. `0005_reports_and_reminders.sql`

RLS keeps each user's tasks private through `auth.uid() = user_id`.

## Vercel Env

Set these in Vercel Project Settings:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `CRON_SECRET`

`vercel.json` runs `/api/telegram/cron` every hour.

## Telegram

Set webhook:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
```

Body:

```json
{
  "url": "https://task-tele.vercel.app/api/telegram/webhook",
  "secret_token": "<TELEGRAM_WEBHOOK_SECRET>",
  "drop_pending_updates": true
}
```

Commands:

- `/help`
- `/link MA_LIEN_KET`
- `/add Ten viec | ghi chu`
- `/today`
- `/week`
- `/high`
- `/done MA_VIEC`
- `/report`

## Checks

```powershell
npm.cmd run typecheck
npm.cmd run build
powershell -ExecutionPolicy Bypass -File .\codex-skills\supabase-security\scripts\check-rls.ps1 -Path .\supabase\migrations
powershell -ExecutionPolicy Bypass -File .\codex-skills\vercel-deploy\scripts\predeploy-check.ps1 -Root .
```

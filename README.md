# Task Tele

Personal task manager using GitHub Pages, Supabase, Cloudflare Worker, and Telegram.

## Architecture

```text
GitHub Pages -> static Next.js app
Supabase     -> Auth + Postgres + RLS
Cloudflare Worker -> Telegram webhook + scheduled reminders
Telegram     -> commands and notifications
```

No Vercel is required for the current setup.

## Local Setup

```powershell
npm.cmd install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=task_tele_vtarch_bot
```

Run:

```powershell
npm.cmd run dev
```

## Supabase

Run migrations in order from `supabase/migrations`.

RLS keeps each user's tasks private through `auth.uid() = user_id`.

## GitHub Pages

The workflow `.github/workflows/pages.yml` builds static output to `out`.

The public Supabase URL, publishable key, and Telegram bot username are embedded in the workflow. They are safe for browser use because Supabase RLS protects private rows. Do not put `SUPABASE_SECRET_KEY` or Telegram bot token in the Pages workflow.

For this repo, the workflow uses:

```env
NEXT_PUBLIC_BASE_PATH=/PROFILE-VTARCH
```

After the workflow runs, enable GitHub Pages from **Settings -> Pages -> GitHub Actions**.

## Cloudflare Worker

Worker source: `worker/task-tele-worker.js`

Config: `wrangler.toml`

Set Cloudflare secrets:

```powershell
npx wrangler secret put SUPABASE_SECRET_KEY
npx wrangler secret put TELEGRAM_BOT_TOKEN
npx wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx wrangler secret put CRON_SECRET
```

Deploy:

```powershell
npx wrangler deploy
```

The Worker exposes:

- `POST /webhook` for Telegram webhook
- `GET /cron` for manual/authorized cron checks
- scheduled trigger every 15 minutes through Cloudflare

## Telegram Webhook

Set webhook to the Worker URL:

```text
https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook
```

Body:

```json
{
  "url": "https://<worker-domain>/webhook",
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
npm.cmd run check
npm.cmd run check:project
npm.cmd run check:rls
powershell -ExecutionPolicy Bypass -File .\scripts\check-production.ps1
```

## Forking

If someone forks this repo, they should create their own Supabase project, Telegram bot, and Cloudflare Worker. See `docs/fork-setup.md`.

Do not reuse the maintainer's Supabase project or Telegram bot for another person's deployment.

## Local Checks

```powershell
npm.cmd run typecheck
npm.cmd run build
powershell -ExecutionPolicy Bypass -File .\codex-skills\supabase-security\scripts\check-rls.ps1 -Path .\supabase\migrations
```

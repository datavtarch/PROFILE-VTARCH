# Deploy Guide

## Flow

1. Push code to GitHub.
2. Enable GitHub Pages from `Settings -> Pages -> GitHub Actions`.
3. Create a Supabase project and run migrations from `supabase/migrations` in order.
4. Create a Telegram bot through BotFather.
5. Deploy the Cloudflare Worker with Wrangler.
6. Set Telegram webhook to the Worker URL.
7. Test auth, task CRUD, Telegram commands, and cron.

## Expected Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
- `SUPABASE_SECRET_KEY` for Cloudflare Worker server-side data access. Use the legacy `service_role` JWT for PostgREST Worker calls.
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET` to verify Telegram webhook requests.
- `CRON_SECRET` to manually call `/cron`.

## Guardrails

- Never put service role keys in client-side code.
- Never commit `.env.local`.
- Keep `.env.example` updated with variable names only.
- Forked repos must use their own Supabase project and Telegram bot, not the original maintainer's.

# Fork Setup

Use this when another person wants their own private data and bot.

## What They Need

- A GitHub account.
- A Supabase free project.
- A Cloudflare account.
- A Telegram bot from BotFather.

## Steps

1. Fork the repository.
2. In Supabase, create a new project and run every SQL file in `supabase/migrations` in order.
3. Copy the Supabase project URL and publishable key into the GitHub Pages workflow or repository variables.
4. In BotFather, create a bot and keep the token private.
5. In Cloudflare, run:

```powershell
npm.cmd install
npx.cmd wrangler login
npx.cmd wrangler deploy
```

6. Set Worker secrets:

```powershell
npx.cmd wrangler secret put SUPABASE_SECRET_KEY
npx.cmd wrangler secret put TELEGRAM_BOT_TOKEN
npx.cmd wrangler secret put TELEGRAM_WEBHOOK_SECRET
npx.cmd wrangler secret put CRON_SECRET
```

7. Set Telegram webhook to:

```text
https://<worker-domain>/webhook
```

8. Open the GitHub Pages URL, create an account, generate a Telegram link code, and send it to the bot with:

```text
/link MA_LIEN_KET
```

## Important

Public browser keys are allowed in GitHub Pages only when Supabase RLS is enabled. Secret keys and Telegram bot tokens must stay in Cloudflare secrets only.

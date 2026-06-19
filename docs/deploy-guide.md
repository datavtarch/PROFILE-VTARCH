# Deploy Guide

## Flow

1. Push code to GitHub.
2. Import the GitHub repo into Vercel.
3. Add environment variables in Vercel.
4. Deploy.
5. Test auth and task CRUD on the production URL.

## Expected Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` only if a server-only feature needs privileged access.
- `TELEGRAM_BOT_TOKEN` only after Telegram integration is added.

## Guardrails

- Never put service role keys in client-side code.
- Never commit `.env.local`.
- Keep `.env.example` updated with variable names only.

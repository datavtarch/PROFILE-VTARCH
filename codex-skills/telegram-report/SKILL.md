---
name: telegram-report
description: Design and implement Telegram bot reporting for the task manager. Use when adding Telegram account linking, bot commands, webhook/API routes, scheduled reports, report formatting, or per-user Telegram data access.
---

# Telegram Report

Add Telegram only after core auth, tasks, and Supabase security are stable.

## Workflow

1. Read `/docs/telegram-report.md`, `/docs/database-design.md`, and `/docs/supabase-security.md`.
2. Link Telegram chats to app users through `telegram_accounts.user_id`.
3. For every bot response, query tasks by the linked `user_id`.
4. Keep bot tokens server-only.
5. Prefer webhook/API route handling on Vercel for incoming Telegram messages.
6. Use scheduled jobs only after manual `/today` and `/report` flows work.
7. Keep report text short, actionable, and timezone-aware.

## Initial Commands

- `/start`
- `/link`
- `/today`
- `/done <task_id>`
- `/report`

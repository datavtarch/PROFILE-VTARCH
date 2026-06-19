# Telegram Report

## Phase

Telegram should be added after the web app has stable login, tasks, and Supabase security.

## First Bot Features

- Link a Telegram chat to the signed-in user's account.
- Send today's tasks.
- Send overdue tasks.
- Mark a task done from Telegram.

## Later Bot Features

- Morning report.
- Evening review.
- Weekly summary.
- Quick add command.

## Commands

- `/start`
- `/link`
- `/today`
- `/done <task_id>`
- `/report`

## Security

Telegram chat ids must map to exactly one app user. Reports must query tasks by the linked `user_id`, never by a shared global dataset.

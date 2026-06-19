# Personal Task Manager - Product Requirements

## Goal

Build a personal task management app that multiple users can use from one shared web app while keeping each user's data isolated.

## First Usable Version

- Users can sign up, sign in, and sign out.
- Users can create, edit, complete, and delete their own tasks.
- Users can view tasks by today, upcoming, overdue, and completed.
- Tasks are stored in Supabase with per-user access control.
- The app is deployed from GitHub to Vercel.

## Later Versions

- Telegram account linking per user.
- Telegram commands: `/add`, `/today`, `/done`, `/report`.
- Morning and evening Telegram reports.
- Weekly productivity summary.
- User settings for reminder time, timezone, and report frequency.

## Non-Negotiables

- Never show one user's tasks to another user.
- Never commit secrets such as Supabase service role keys or Telegram bot tokens.
- Keep the first version small enough to finish and test end to end.

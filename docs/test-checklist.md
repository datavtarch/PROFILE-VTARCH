# Test Checklist

## Core User Flow

- Sign up works.
- Sign in works.
- Sign out works.
- User can create a task.
- User can edit a task.
- User can mark a task done.
- User can delete a task.
- Today, upcoming, overdue, and completed views show correct data.

## Data Isolation

- User A cannot see User B tasks.
- User A cannot update User B tasks.
- User A cannot delete User B tasks.
- Anonymous users cannot access tasks.

## Deployment

- Build passes locally.
- Required environment variables are documented.
- No secret keys are committed.
- Vercel deployment uses production Supabase values.

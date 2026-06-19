# Supabase Security

## Required Rules

- Enable Row Level Security on every user-owned table.
- Use `auth.uid()` in all user-data policies.
- Never expose `service_role` keys in browser code.
- Use the public anon key only for frontend access.
- Use server-only environment variables for bot tokens and privileged operations.

## Baseline Policy Pattern

```sql
alter table public.tasks enable row level security;

create policy "Users can read own tasks"
on public.tasks for select
using (auth.uid() = user_id);

create policy "Users can insert own tasks"
on public.tasks for insert
with check (auth.uid() = user_id);

create policy "Users can update own tasks"
on public.tasks for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete own tasks"
on public.tasks for delete
using (auth.uid() = user_id);
```

## Manual Review Checklist

- Confirm every user-owned table has a `user_id`.
- Confirm every user-owned table has RLS enabled.
- Confirm select, insert, update, and delete policies exist where needed.
- Confirm frontend queries do not request another user's data.

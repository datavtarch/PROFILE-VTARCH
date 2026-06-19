alter table public.profiles
add column if not exists telegram_reports_enabled boolean not null default true,
add column if not exists telegram_reminders_enabled boolean not null default true,
add column if not exists morning_report_time time not null default '08:00',
add column if not exists evening_report_time time not null default '18:00';

alter table public.tasks
add column if not exists reminded_at timestamptz;

create index if not exists tasks_due_reminder_idx
on public.tasks (due_at, reminded_at)
where status in ('todo', 'doing', 'waiting') and due_at is not null;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
grant select, insert, update, delete on public.telegram_accounts to authenticated;
grant select, insert, update, delete on public.telegram_link_tokens to authenticated;

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.tasks to service_role;
grant select, insert, update, delete on public.telegram_accounts to service_role;
grant select, insert, update, delete on public.telegram_link_tokens to service_role;

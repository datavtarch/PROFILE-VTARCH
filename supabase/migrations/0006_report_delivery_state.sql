alter table public.profiles
add column if not exists last_morning_report_date date,
add column if not exists last_evening_report_date date;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

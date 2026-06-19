grant usage on schema public to authenticated;

grant select, insert, update, delete
on public.profiles, public.tasks, public.telegram_accounts
to authenticated;

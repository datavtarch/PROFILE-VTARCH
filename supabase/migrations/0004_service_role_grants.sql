grant usage on schema public to service_role;

grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.tasks to service_role;
grant select, insert, update, delete on public.telegram_accounts to service_role;
grant select, insert, update, delete on public.telegram_link_tokens to service_role;

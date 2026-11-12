-- Slate: let a signed-in person delete their OWN account.
-- Run once in the Supabase SQL Editor of the project (SQL Editor > New query > paste all > Run).
--
-- Why this has to live in the database:
--   The app only ever holds the PUBLIC key, which is not allowed to delete a login. The admin call that can
--   (auth.admin.deleteUser) needs the service-role key, and that key must NEVER be put in the frontend, because
--   anyone visiting the public site could read it and delete anybody.
--
-- Why it is safe:
--   "security definer" means the function runs with its owner's rights, so it CAN delete from auth.users.
--   It takes no arguments and always deletes auth.uid(), the caller's own id, so there is no way to aim it at
--   someone else. Signed-out visitors are refused.
--
-- What it removes:
--   Everything. tasks, eod_updates and user_settings all say "references auth.users (id) on delete cascade"
--   in schema.sql, so deleting the login deletes that person's tasks, EOD updates and settings with it.
--   There is no undo, which is why the app makes you type DELETE first.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := (select auth.uid());
begin
  if caller is null then
    raise exception 'Not signed in' using errcode = '42501';
  end if;
  delete from auth.users where id = caller;
end;
$$;

-- Signed-in users only: never anonymous visitors.
revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

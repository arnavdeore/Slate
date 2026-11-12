-- Slate: each new user starts with their OWN name, not "Arnav".
-- Run once in the Supabase SQL Editor (it changes the starting values and the sign-up trigger; it does not touch existing rows).
--
-- Before: every new user was created as "Arnav" / "Data analyst".
-- After:  a new user starts with a name taken from their email (priya.sharma@x.com becomes "Priya") and a blank job title.
--         They change both on the Settings page. A name set as "full_name" when the user is created is used instead.

alter table public.user_settings alter column display_name set default 'User';
alter table public.user_settings alter column job_title set default '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_settings (user_id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(initcap(split_part(split_part(coalesce(new.email, ''), '@', 1), '.', 1)), ''),
        'User'
      ),
      60
    )
  );
  return new;
end;
$$;

-- Slate: tasks that repeat (every day, every working day, every week, or on chosen weekdays).
-- Run in the Supabase SQL Editor of the project (SQL Editor > New query > paste all > Run).
-- Safe to run again: every statement either uses "if not exists" or drops the rule before adding it.
--
-- How repeating works (Arnav chose this on 2026-11-09): there is never more than ONE open copy.
-- When a copy is marked Done, the app creates the next one with the dates moved forward. The board
-- stays short, and every finished copy is kept, so the Performance page still sees the full history.
--
-- Two new columns on tasks:
--   repeat_rule  NULL = does not repeat. 'daily', 'workday' (skips Sundays, public holidays and
--                bank 2nd/4th Saturdays), 'weekly' (the same weekday), 'fortnightly' (every 2 weeks),
--                'monthly' (the same day of the month) or 'custom' (the weekdays below).
--   repeat_days  'custom' only: ISO weekdays, 1 = Monday ... 7 = Sunday.
--
-- The holiday and working-day calendar stays in src/lib/holidays.js, so the APP works out the next
-- date, not the database. That keeps the hand-kept holiday table in one place.

alter table public.tasks add column if not exists repeat_rule text;
alter table public.tasks add column if not exists repeat_days smallint[];

alter table public.tasks drop constraint if exists tasks_repeat_rule_valid;
alter table public.tasks add constraint tasks_repeat_rule_valid
  check (repeat_rule is null or repeat_rule in ('daily', 'workday', 'weekly', 'fortnightly', 'monthly', 'custom'));

-- 'custom' needs one to seven weekdays, each 1-7; every other rule stores none.
alter table public.tasks drop constraint if exists tasks_repeat_days_match;
alter table public.tasks add constraint tasks_repeat_days_match
  check (
    case
      when repeat_rule = 'custom' then
        repeat_days is not null
        and array_length(repeat_days, 1) between 1 and 7
        and repeat_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
      else repeat_days is null
    end
  );

-- Calendar-aware plan progression (see xpSystem + Dashboard + Workout)
alter table public.workout_plans add column if not exists last_logged_date text;
-- Prevents multiple current_day advances on the same UTC day when re-fetching the plan
alter table public.workout_plans add column if not exists last_plan_roll_date text;

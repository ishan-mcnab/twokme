-- Performance indexes for workout plan lookups (run in SQL editor if not migrated yet).
create index if not exists workout_plans_user_id_idx on public.workout_plans(user_id);
create index if not exists workout_plans_build_id_idx on public.workout_plans(build_id);

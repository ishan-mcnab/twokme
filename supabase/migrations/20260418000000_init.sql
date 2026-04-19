-- TwoKMe Phase 1 schema + RLS
-- Apply in Supabase SQL editor, or via Supabase CLI migrations.

create extension if not exists "pgcrypto";

create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text,
  full_name text,
  position text, -- PG, SG, SF, PF, C
  height_inches int,
  weight_lbs int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.player_builds (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles (id) on delete cascade,
  archetype text,
  archetype_flavor_text text,
  player_comps jsonb, -- array of 3 player names
  overall_rating int,
  attributes jsonb, -- all 40 attribute scores as key/value
  development_path text, -- 'offensive' | 'defensive' | 'balanced'
  plan_duration_weeks int,
  training_environment text, -- 'home' | 'court'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.workout_plans (
  id uuid default gen_random_uuid() primary key,
  build_id uuid references public.player_builds (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete cascade,
  plan_data jsonb,
  current_day int default 1,
  created_at timestamptz default now()
);

create table public.workout_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles (id) on delete cascade,
  build_id uuid references public.player_builds (id) on delete cascade,
  day_number int,
  completed_at timestamptz default now(),
  xp_earned jsonb,
  streak_day int
);

create table public.attribute_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles (id) on delete cascade,
  build_id uuid references public.player_builds (id) on delete cascade,
  attribute_key text,
  current_value int,
  total_xp int default 0,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.player_builds enable row level security;
alter table public.workout_plans enable row level security;
alter table public.workout_logs enable row level security;
alter table public.attribute_progress enable row level security;

-- profiles
create policy "profiles_select_own"
on public.profiles for select
to authenticated
using (auth.uid() = id);

create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- player_builds
create policy "player_builds_select_own"
on public.player_builds for select
to authenticated
using (auth.uid() = user_id);

create policy "player_builds_insert_own"
on public.player_builds for insert
to authenticated
with check (auth.uid() = user_id);

create policy "player_builds_update_own"
on public.player_builds for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "player_builds_delete_own"
on public.player_builds for delete
to authenticated
using (auth.uid() = user_id);

-- workout_plans
create policy "workout_plans_select_own"
on public.workout_plans for select
to authenticated
using (auth.uid() = user_id);

create policy "workout_plans_insert_own"
on public.workout_plans for insert
to authenticated
with check (auth.uid() = user_id);

create policy "workout_plans_update_own"
on public.workout_plans for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "workout_plans_delete_own"
on public.workout_plans for delete
to authenticated
using (auth.uid() = user_id);

-- workout_logs
create policy "workout_logs_select_own"
on public.workout_logs for select
to authenticated
using (auth.uid() = user_id);

create policy "workout_logs_insert_own"
on public.workout_logs for insert
to authenticated
with check (auth.uid() = user_id);

create policy "workout_logs_update_own"
on public.workout_logs for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "workout_logs_delete_own"
on public.workout_logs for delete
to authenticated
using (auth.uid() = user_id);

-- attribute_progress
create policy "attribute_progress_select_own"
on public.attribute_progress for select
to authenticated
using (auth.uid() = user_id);

create policy "attribute_progress_insert_own"
on public.attribute_progress for insert
to authenticated
with check (auth.uid() = user_id);

create policy "attribute_progress_update_own"
on public.attribute_progress for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "attribute_progress_delete_own"
on public.attribute_progress for delete
to authenticated
using (auth.uid() = user_id);

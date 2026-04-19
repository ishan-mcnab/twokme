-- Post-MVP: leaderboard, friendships, custom workout log columns

create table public.leaderboard_scores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles (id) on delete cascade not null,
  username text,
  archetype text,
  position text,
  season_year int not null,
  season_month int not null,
  total_xp bigint default 0,
  longest_streak int default 0,
  current_streak int default 0,
  workouts_logged int default 0,
  score bigint default 0,
  updated_at timestamptz default now(),
  unique (user_id, season_year, season_month)
);

create table public.friendships (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles (id) on delete cascade not null,
  friend_id uuid references public.profiles (id) on delete cascade not null,
  status text default 'pending',
  created_at timestamptz default now(),
  unique (user_id, friend_id),
  constraint friendships_no_self check (user_id <> friend_id)
);

alter table public.workout_logs
  add column if not exists workout_name text;

alter table public.workout_logs
  add column if not exists is_custom boolean default false;

create index leaderboard_season_idx on public.leaderboard_scores (season_year, season_month, score desc);
create index leaderboard_user_idx on public.leaderboard_scores (user_id);
create index friendships_user_idx on public.friendships (user_id);
create index friendships_friend_idx on public.friendships (friend_id);

alter table public.leaderboard_scores enable row level security;
alter table public.friendships enable row level security;

create policy "leaderboard_scores_select_authenticated"
on public.leaderboard_scores for select
to authenticated
using (true);

create policy "leaderboard_scores_insert_own"
on public.leaderboard_scores for insert
to authenticated
with check (auth.uid() = user_id);

create policy "leaderboard_scores_update_own"
on public.leaderboard_scores for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "leaderboard_scores_delete_own"
on public.leaderboard_scores for delete
to authenticated
using (auth.uid() = user_id);

create policy "friendships_select_participants"
on public.friendships for select
to authenticated
using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "friendships_insert_requester"
on public.friendships for insert
to authenticated
with check (auth.uid() = user_id);

create policy "friendships_update_participants"
on public.friendships for update
to authenticated
using (auth.uid() = user_id or auth.uid() = friend_id)
with check (auth.uid() = user_id or auth.uid() = friend_id);

create policy "friendships_delete_participants"
on public.friendships for delete
to authenticated
using (auth.uid() = user_id or auth.uid() = friend_id);

-- Friend search: any signed-in user can read username/position for discovery.
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

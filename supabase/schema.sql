create extension if not exists "pgcrypto";

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  language text not null,
  word text not null,
  hint text not null,
  impostor_player text not null,
  player_count int not null check (player_count between 3 and 20)
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  player_name text not null,
  is_impostor boolean not null default false
);

create table if not exists public.impostor_rooms (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  join_code text not null unique,
  room_name text not null default 'Impostor Room',
  max_players int not null default 20 check (max_players between 3 and 20),
  is_public boolean not null default true,
  status text not null default 'waiting' check (status in ('waiting', 'started', 'finished')),
  phase text not null default 'lobby' check (phase in ('lobby', 'role_reveal', 'voting', 'results')),
  host_player_token text not null,
  hide_hint boolean not null default false,
  impostor_count int not null default 1 check (impostor_count between 1 and 3),
  hint_difficulty text not null default 'normal' check (hint_difficulty in ('easy', 'normal', 'hard', 'difficult')),
  language text,
  secret_word text,
  hint text,
  round_awarded boolean not null default false
);

create table if not exists public.impostor_room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.impostor_rooms(id) on delete cascade,
  created_at timestamptz not null default now(),
  player_name text not null,
  player_token text not null unique,
  is_host boolean not null default false,
  is_impostor boolean,
  has_seen_role boolean not null default false,
  ready_for_next_round boolean not null default false,
  score int not null default 0,
  vote_target_player_id uuid references public.impostor_room_players(id) on delete set null
);

alter table if exists public.impostor_room_players
  add column if not exists ready_for_next_round boolean not null default false;

alter table if exists public.impostor_rooms
  add column if not exists room_name text not null default 'Impostor Room';

alter table if exists public.impostor_rooms
  add column if not exists max_players int not null default 20;

alter table if exists public.impostor_rooms
  add column if not exists is_public boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'impostor_rooms_max_players_check'
  ) then
    alter table public.impostor_rooms
      add constraint impostor_rooms_max_players_check
      check (max_players between 3 and 20);
  end if;
end $$;

create index if not exists idx_players_game_id on public.players(game_id);
create index if not exists idx_games_created_at on public.games(created_at desc);
create index if not exists idx_impostor_rooms_join_code on public.impostor_rooms(join_code);
create index if not exists idx_impostor_room_players_room_id on public.impostor_room_players(room_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'impostor_rooms'
  ) then
    alter publication supabase_realtime add table public.impostor_rooms;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'impostor_room_players'
  ) then
    alter publication supabase_realtime add table public.impostor_room_players;
  end if;
end $$;

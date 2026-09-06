create table public.lobbies (
  id uuid primary key default gen_random_uuid(),
  code text not null unique
    check (code ~ '^[A-Z0-9]{4}$'),
  host_player_id uuid,
  state public.lobby_state not null
    default 'VIDEO_SELECTION',
  current_round_id uuid,
  selected_video jsonb,
  version bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null
    default now() + interval '8 hours'
);

create table public.players (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null
    references public.lobbies(id) on delete cascade,
  user_id uuid not null
    references auth.users(id) on delete cascade,
  nickname text not null
    check (
      char_length(nickname) between 1 and 24
    ),
  slot smallint not null
    check (slot between 1 and 4),
  connected boolean not null default true,
  microphone_state public.microphone_state not null
    default 'UNKNOWN',
  round_status public.player_round_status not null
    default 'IDLE',
  last_seen_at timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (lobby_id, slot),
  unique (lobby_id, user_id)
);

alter table public.lobbies
  add constraint lobbies_host_player_fk
  foreign key (host_player_id)
  references public.players(id)
  on delete set null
  deferrable initially deferred;

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null
    references public.lobbies(id) on delete cascade,
  sequence_number integer not null,
  video jsonb not null,
  state public.lobby_state not null
    check (state <> 'VIDEO_SELECTION'),
  scheduled_start_at timestamptz,
  recording_deadline_at timestamptz,
  review_deadline_at timestamptz,
  final_playback_at timestamptz,
  created_at timestamptz not null default now(),
  finished_at timestamptz,
  unique (lobby_id, sequence_number)
);

alter table public.lobbies
  add constraint lobbies_current_round_fk
  foreign key (current_round_id)
  references public.rounds(id)
  on delete set null
  deferrable initially deferred;

create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null
    references public.rounds(id) on delete cascade,
  player_id uuid not null
    references public.players(id) on delete cascade,
  attempt smallint not null
    check (attempt between 1 and 2),
  status public.recording_status not null
    default 'UPLOADING',
  storage_path text not null,
  mime_type text not null,
  size_bytes bigint not null default 0
    check (size_bytes >= 0),
  duration_ms integer not null default 0
    check (duration_ms >= 0),
  start_offset_ms integer not null default 0,
  end_offset_ms integer,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  unique (round_id, player_id, attempt)
);

create unique index recordings_one_validated_per_player_round
  on public.recordings(round_id, player_id)
  where status = 'VALIDATED';

create table public.played_videos (
  lobby_id uuid not null
    references public.lobbies(id) on delete cascade,
  catalog_video_id text not null,
  played_at timestamptz not null default now(),
  primary key (lobby_id, catalog_video_id)
);

create index players_lobby_active_idx
  on public.players(lobby_id, connected, last_seen_at)
  where left_at is null;

create index rounds_lobby_idx
  on public.rounds(lobby_id, sequence_number desc);

create index recordings_round_idx
  on public.recordings(round_id, player_id);

create index lobbies_expiry_idx
  on public.lobbies(expires_at);

-- TripSync database. Run once in Supabase -> SQL Editor -> New query -> Run.
-- Row Level Security is ON with no public policies: the browser can never read
-- these tables directly. Only the app's server (using the secret key) can.

create table if not exists trips (
  id text primary key,
  name text not null,
  organiser text not null,
  members text[] not null,
  date_windows jsonb not null,
  deadline timestamptz not null,
  admin_token text not null,
  status text not null default 'collecting',
  decided_option_id text,
  created_at timestamptz not null default now()
);

create table if not exists preferences (
  trip_id text not null references trips(id) on delete cascade,
  member text not null,
  edit_token text not null,
  origin_city text not null,
  origin_lat double precision,
  origin_lon double precision,
  budget_max integer not null,
  available_windows text[] not null default '{}',
  maybe_windows text[] not null default '{}',
  trip_nights integer not null,
  destination_types text[] not null default '{}',
  wont_do text[] not null default '{}',
  notes text not null default '',
  updated_at timestamptz not null default now(),
  primary key (trip_id, member)
);

create table if not exists options (
  trip_id text not null references trips(id) on delete cascade,
  id text not null,
  rank integer not null,
  destination text not null,
  region text not null default '',
  window_id text not null,
  nights integer not null,
  summary text not null default '',
  why text not null default '',
  tags text[] not null default '{}',
  estimates jsonb not null,
  fit jsonb not null,
  group_score integer not null,
  image text,
  source text not null,
  created_at timestamptz not null default now(),
  primary key (trip_id, id)
);

create table if not exists votes (
  trip_id text not null references trips(id) on delete cascade,
  member text not null,
  option_id text not null,
  vote text not null check (vote in ('in', 'cant')),
  updated_at timestamptz not null default now(),
  primary key (trip_id, member, option_id)
);

alter table trips enable row level security;
alter table preferences enable row level security;
alter table options enable row level security;
alter table votes enable row level security;

-- If you created the tables with the first version of TripSync, run this too (safe to re-run):
alter table preferences add column if not exists origin_lat double precision;
alter table preferences add column if not exists origin_lon double precision;
alter table preferences add column if not exists maybe_windows text[] not null default '{}';
alter table options add column if not exists image text;

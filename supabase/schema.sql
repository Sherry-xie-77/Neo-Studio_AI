create table if not exists sessions (
  id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists feed_videos (
  id text primary key,
  template_slug text not null,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists templates (
  slug text primary key,
  payload jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists video_comments (
  id text primary key,
  video_id text not null references feed_videos (id),
  nickname text not null,
  body text not null,
  seed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists video_likes (
  id text primary key,
  video_id text not null references feed_videos (id),
  session_id text not null references sessions (id),
  created_at timestamptz not null default now(),
  unique (video_id, session_id)
);

create table if not exists generations (
  id text primary key,
  session_id text not null references sessions (id),
  template_slug text not null references templates (slug),
  requested_model text not null,
  execution_provider text not null,
  prompt_override text not null,
  provider_job_id text,
  status text not null,
  output_url text,
  preview_url text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

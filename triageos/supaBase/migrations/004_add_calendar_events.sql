create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null default 'google_calendar',
  external_event_id text not null,
  calendar_id text not null default 'primary',
  title text not null default 'Untitled event',
  description text,
  location text,
  start_time timestamptz,
  end_time timestamptz,
  timezone text not null default 'UTC',
  attendees text[] not null default '{}',
  status text not null default 'confirmed',
  html_link text,
  source text not null default 'sync',
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists calendar_events_user_start_time_idx
  on public.calendar_events (user_id, start_time);

create index if not exists calendar_events_user_updated_at_idx
  on public.calendar_events (user_id, updated_at);

create unique index if not exists calendar_events_user_provider_external_unique
  on public.calendar_events (user_id, provider, external_event_id);

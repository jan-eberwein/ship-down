create table if not exists public.rooms (
  room_code text primary key,
  state jsonb not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists rooms_updated_at_idx on public.rooms (updated_at desc);

create table if not exists public.sync_records (
  user_id text not null,
  store_key text not null,
  record_id text not null,
  payload jsonb,
  deleted_at timestamptz,
  client_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, store_key, record_id)
);

create index if not exists sync_records_user_store_idx
  on public.sync_records (user_id, store_key);

create index if not exists sync_records_updated_idx
  on public.sync_records (updated_at desc);

alter table public.sync_records enable row level security;

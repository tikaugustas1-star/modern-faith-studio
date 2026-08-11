create extension if not exists pgcrypto;

create table if not exists public.tiktok_accounts (
  account_key text primary key,
  token_ciphertext text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.post_queue (
  id uuid primary key default gen_random_uuid(),
  account_key text not null references public.tiktok_accounts(account_key) on delete cascade,
  batch_label text not null,
  photo_images jsonb not null,
  description text not null default '',
  privacy_level text,
  scheduled_for timestamptz not null,
  status text not null default 'queued' check (status in ('queued','processing','submitted','failed')),
  publish_id text,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists post_queue_due_idx on public.post_queue(status, scheduled_for);
alter table public.tiktok_accounts enable row level security;
alter table public.post_queue enable row level security;

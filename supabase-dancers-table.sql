-- Run this once in your Supabase SQL editor (Dashboard → SQL Editor)
-- Creates the dancers table for persistent dance floor avatars

create table if not exists public.dancers (
  name        text primary key,
  color       text not null default '#F4A93C',
  avatar_emoji text,
  x           float8 not null default 50,
  y           float8 not null default 50,
  updated_at  timestamptz not null default now()
);

-- Enable Row Level Security
alter table public.dancers enable row level security;

-- Allow anyone (anon) to read and upsert their own dancer
create policy "dancers_select" on public.dancers
  for select to anon using (true);

create policy "dancers_upsert" on public.dancers
  for insert to anon with check (true);

create policy "dancers_update" on public.dancers
  for update to anon using (true) with check (true);

-- Auto-clean dancers older than 24 hours (optional, run manually or schedule)
-- delete from public.dancers where updated_at < now() - interval '24 hours';

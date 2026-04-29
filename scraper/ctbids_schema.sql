-- CTBids live auction data
-- Run this in your Supabase SQL editor before deploying the scraper

-- Drop and recreate if needed:
-- drop table if exists ctbids_live;
-- drop table if exists ctbids_live_summary;

create table if not exists ctbids_live (
  id          uuid        default gen_random_uuid() primary key,
  lot_number  text        not null,
  title       text,
  current_bid numeric(10,2) default 0,
  bid_count   integer       default 0,
  ends_at     timestamptz,
  status      text          default 'active',   -- 'active' | 'ended' | 'sold'
  auction_id  text,
  image_url   text,
  sale_url    text,
  scraped_at  timestamptz   default now(),
  created_at  timestamptz   default now()
);

-- Unique on lot_number so upserts work correctly
create unique index if not exists ctbids_live_lot_number_idx
  on ctbids_live (lot_number);

-- Optional summary table (one row per active sale)
create table if not exists ctbids_live_summary (
  id            uuid        default gen_random_uuid() primary key,
  sale_title    text,
  sale_url      text        unique,
  lot_count     integer     default 0,
  earliest_end  timestamptz,
  latest_end    timestamptz,
  status        text        default 'active',
  scraped_at    timestamptz default now()
);

-- Allow the anon/service role to read ctbids_live from the frontend
alter table ctbids_live enable row level security;

create policy "Anyone can read ctbids_live"
  on ctbids_live for select
  using (true);

-- Service role (scraper) can insert/update/delete — bypasses RLS automatically
-- so no extra policy is needed for the scraper's service key.

comment on table ctbids_live is
  'Live CTBids auction lots, scraped every 30 min by the Railway scraper service.';

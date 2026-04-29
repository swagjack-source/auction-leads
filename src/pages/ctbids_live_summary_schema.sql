-- Run in Supabase SQL Editor
-- Creates the ctbids_live_summary table for the Live Auction tab

create table if not exists ctbids_live_summary (
  id               uuid        primary key default gen_random_uuid(),
  sale_title       text,
  sale_url         text,
  lot_count        integer     default 0,
  is_active        boolean     default false,
  auction_end_date timestamptz,
  scraped_at       timestamptz default now(),
  created_at       timestamptz default now()
);

alter table ctbids_live_summary enable row level security;

drop policy if exists "Anyone can read ctbids_live_summary" on ctbids_live_summary;
create policy "Anyone can read ctbids_live_summary"
  on ctbids_live_summary for select using (true);

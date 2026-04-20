-- AuctionCRM — Past Jobs fields on deal_scores
-- Run in Supabase SQL Editor

ALTER TABLE deal_scores ADD COLUMN IF NOT EXISTS job_name TEXT;
ALTER TABLE deal_scores ADD COLUMN IF NOT EXISTS bid_tag  TEXT CHECK (bid_tag IN ('underbid', 'good_bid', 'overbid'));
ALTER TABLE past_projects ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE past_projects ADD COLUMN IF NOT EXISTS bid_tag TEXT CHECK (bid_tag IN ('underbid', 'good_bid', 'overbid'));

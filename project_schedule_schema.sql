-- ============================================================
-- AuctionCRM — Project Scheduling Fields
-- Run this in the Supabase SQL editor
-- ============================================================

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS project_start DATE,
  ADD COLUMN IF NOT EXISTS project_end   DATE,
  ADD COLUMN IF NOT EXISTS crew_size     INTEGER;

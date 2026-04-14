-- ============================================================
-- AuctionCRM — Calendar & Team Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- Team members table (must come before the leads ALTER)
CREATE TABLE IF NOT EXISTS team_members (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  name      TEXT NOT NULL,
  color     TEXT NOT NULL DEFAULT '#6366f1',
  initials  TEXT
);

ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON team_members
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON team_members
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- Add assignee + consult datetime to leads
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS consult_at  TIMESTAMPTZ;

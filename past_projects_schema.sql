-- ============================================================
-- AuctionCRM — Past Projects Table
-- Run this in the Supabase SQL editor
-- ============================================================

CREATE TABLE IF NOT EXISTS past_projects (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at          TIMESTAMPTZ DEFAULT now(),
  job_date            DATE,
  job_type            TEXT NOT NULL CHECK (job_type IN ('Clean Out', 'Auction', 'Both')),
  square_footage      INTEGER NOT NULL,
  density             TEXT NOT NULL CHECK (density IN ('Low', 'Medium', 'High')),
  zip_code            TEXT,
  item_quality        INTEGER CHECK (item_quality BETWEEN 1 AND 10),
  actual_labor_hours  INTEGER,
  actual_labor_cost   INTEGER,
  actual_bid          INTEGER,
  actual_profit       INTEGER,
  notes               TEXT
);

ALTER TABLE past_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated users" ON past_projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON past_projects
  FOR ALL TO anon USING (true) WITH CHECK (true);

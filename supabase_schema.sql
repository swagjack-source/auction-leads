-- ============================================================
-- AuctionCRM — Supabase Schema
-- Run this in the Supabase SQL editor
-- ============================================================

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  address         TEXT,
  zip_code        TEXT,
  what_they_need  TEXT,
  status          TEXT NOT NULL DEFAULT 'New Lead'
                  CHECK (status IN (
                    'New Lead','Contacted','In Talks',
                    'Consult Scheduled','Consult Completed',
                    'Project Scheduled','Backlog','Won','Lost'
                  )),
  square_footage  INTEGER,
  density         TEXT CHECK (density IN ('Low','Medium','High')),
  item_quality_score  INTEGER CHECK (item_quality_score BETWEEN 1 AND 10),
  job_type        TEXT CHECK (job_type IN ('Clean Out','Auction','Both')),
  deal_score      NUMERIC(4,2),
  notes           TEXT
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Deal Scores table (standalone calculator results)
CREATE TABLE IF NOT EXISTS deal_scores (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at            TIMESTAMPTZ DEFAULT now(),
  lead_id               UUID REFERENCES leads(id) ON DELETE SET NULL,
  square_footage        INTEGER NOT NULL,
  density               TEXT NOT NULL CHECK (density IN ('Low','Medium','High')),
  zip_code              TEXT,
  item_quality          INTEGER NOT NULL CHECK (item_quality BETWEEN 1 AND 10),
  job_type              TEXT NOT NULL CHECK (job_type IN ('Clean Out','Auction','Both')),
  estimated_labour_hours  INTEGER,
  estimated_labour_cost   INTEGER,
  overhead_cost           INTEGER,
  recommended_bid         INTEGER,
  estimated_profit        INTEGER,
  deal_score              NUMERIC(4,2)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE deal_scores ENABLE ROW LEVEL SECURITY;

-- For now: allow all operations for authenticated users
-- Replace with user-specific policies once auth is set up

CREATE POLICY "Allow all for authenticated users" ON leads
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for authenticated users" ON deal_scores
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- If you want anon access during development, add:
-- CREATE POLICY "Allow anon read" ON leads FOR SELECT TO anon USING (true);

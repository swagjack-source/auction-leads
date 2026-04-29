-- ============================================================
-- Homebase — Pending migrations
-- Run this once in the Supabase SQL editor (Dashboard → SQL Editor)
-- All statements use IF NOT EXISTS / IF NOT EXISTS so it's safe
-- to run multiple times.
-- ============================================================


-- ── 1. New columns on leads ───────────────────────────────────
--   loss_reason  → saved when a lead is marked Lost (stage transition modal)
--   zip_code     → captured in the new lead modal
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS loss_reason TEXT,
  ADD COLUMN IF NOT EXISTS zip_code    TEXT;


-- ── 2. calendar_events ───────────────────────────────────────
--   Used by:
--   • Stage transition modal (schedules consults)
--   • Calendar page quick-add event button
--   • Crew Schedule grid (shows consult pills)
CREATE TABLE IF NOT EXISTS calendar_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  title       TEXT        NOT NULL,
  event_type  TEXT        NOT NULL DEFAULT 'meeting',  -- 'consult' | 'meeting' | 'other'
  event_date  DATE        NOT NULL,
  event_time  TIME,
  address     TEXT,
  notes       TEXT,
  assigned_to UUID        REFERENCES employees(id) ON DELETE SET NULL,
  lead_id     UUID        REFERENCES leads(id)     ON DELETE CASCADE
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON calendar_events;
CREATE POLICY "Allow all for anon" ON calendar_events
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_calendar_events_date    ON calendar_events(event_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_lead_id ON calendar_events(lead_id);


-- ── 3. ctbids_live ────────────────────────────────────────────
--   Populated by the Railway scraper (scraper/index.js).
--   The Home dashboard CTBids widget reads from this table.
--   If it's empty the widget shows "no active lots".
--   If the table doesn't exist the widget shows "scraper not connected".
CREATE TABLE IF NOT EXISTS ctbids_live (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_number  TEXT          NOT NULL,
  title       TEXT,
  current_bid NUMERIC(10,2) DEFAULT 0,
  bid_count   INTEGER       DEFAULT 0,
  ends_at     TIMESTAMPTZ,
  status      TEXT          DEFAULT 'active',
  auction_id  TEXT,
  image_url   TEXT,
  sale_url    TEXT,
  scraped_at  TIMESTAMPTZ   DEFAULT now(),
  created_at  TIMESTAMPTZ   DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ctbids_live_lot_number_idx
  ON ctbids_live (lot_number);

ALTER TABLE ctbids_live ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read ctbids_live" ON ctbids_live;
CREATE POLICY "Anyone can read ctbids_live"
  ON ctbids_live FOR SELECT USING (true);

-- ============================================================
-- AuctionCRM — Contacts Directory + Meetings
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- ============================================================

-- Contacts directory (Senior Living, Partners, Vendors, etc.)
CREATE TABLE IF NOT EXISTS contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  category   TEXT NOT NULL DEFAULT 'Other',
  phone      TEXT,
  email      TEXT,
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contacts_all" ON contacts FOR ALL USING (true) WITH CHECK (true);

-- Standalone meetings (separate from lead consults)
CREATE TABLE IF NOT EXISTS meetings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  assignee_id UUID REFERENCES team_members(id) ON DELETE SET NULL,
  contact_id  UUID REFERENCES contacts(id) ON DELETE SET NULL,
  date        DATE NOT NULL,
  time        TEXT,
  purpose     TEXT,
  notes       TEXT,
  address     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- If the table already exists, add the column:
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "meetings_all" ON meetings FOR ALL USING (true) WITH CHECK (true);

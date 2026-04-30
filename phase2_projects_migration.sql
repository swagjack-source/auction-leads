-- ============================================================
-- Homebase — Phase 2 (Projects) migration
-- Run ONCE in the Supabase SQL editor.
-- All statements use IF NOT EXISTS so it's safe to re-run.
-- Requires Phase 1 migration to have been applied first.
-- ============================================================

-- ── 1. Project financials on leads (2A Financials, 2D table edits) ──
-- Actuals captured per project; pre-fill bid_amount from
-- deal_score.recommended_bid in the UI when blank.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bid_amount         NUMERIC(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deposit_received   NUMERIC(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS actual_labour_cost NUMERIC(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS actual_expenses    NUMERIC(10,2);
ALTER TABLE leads ADD COLUMN IF NOT EXISTS actual_royalties   NUMERIC(10,2);

-- ── 2. Mark-Complete retrospective fields (2C) ─────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS bid_accuracy TEXT;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_bid_accuracy_check;
ALTER TABLE leads ADD CONSTRAINT leads_bid_accuracy_check
  CHECK (bid_accuracy IS NULL OR bid_accuracy IN ('Underbid','Good Bid','Overbid'));

ALTER TABLE leads ADD COLUMN IF NOT EXISTS retro_rating INTEGER;
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_retro_rating_check;
ALTER TABLE leads ADD CONSTRAINT leads_retro_rating_check
  CHECK (retro_rating IS NULL OR retro_rating BETWEEN 1 AND 5);

-- ── 3. Photos JSONB on leads (2A Photos) ────────────────────
ALTER TABLE leads ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- ── 4. Checklist column (2A Checklist) ──────────────────────
-- Already defined in checklist_schema.sql; included here so the
-- single-file migration is self-contained.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb;

-- ── 5. project_notes (2A Updates) ───────────────────────────
CREATE TABLE IF NOT EXISTS project_notes (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMPTZ DEFAULT now(),
  project_id   UUID NOT NULL,
  project_type TEXT DEFAULT 'lead',
  author       TEXT,
  content      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_project_notes_project_id
  ON project_notes(project_id, created_at DESC);

ALTER TABLE project_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON project_notes;
CREATE POLICY "Allow all for authenticated" ON project_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all" ON project_notes;
CREATE POLICY "Allow anon all" ON project_notes
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── 6. Reload PostgREST schema cache ────────────────────────
NOTIFY pgrst, 'reload schema';

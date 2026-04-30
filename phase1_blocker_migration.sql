-- ============================================================
-- Homebase — Phase 1 blocker migration
-- Run ONCE in the Supabase SQL editor (Dashboard → SQL Editor).
-- All statements use IF NOT EXISTS / IF NOT EXISTS so it's safe
-- to run multiple times.
-- ============================================================

-- ── 1. scheduled_projects (1C) ───────────────────────────────
-- Used by ScheduleProjectModal when a Project Accepted lead is
-- moved into Project Scheduled. The page-level Schedule view
-- still reads project_start / project_end on the lead row, so
-- both sides are kept in sync.
CREATE TABLE IF NOT EXISTS scheduled_projects (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at   TIMESTAMPTZ DEFAULT now(),
  lead_id      UUID REFERENCES leads(id) ON DELETE CASCADE,
  start_date   DATE NOT NULL,
  end_date     DATE NOT NULL,
  labour_hours INTEGER,
  job_type     TEXT,
  notes        TEXT
);

ALTER TABLE scheduled_projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for authenticated" ON scheduled_projects;
CREATE POLICY "Allow all for authenticated" ON scheduled_projects
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all" ON scheduled_projects;
CREATE POLICY "Allow anon all" ON scheduled_projects
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_scheduled_projects_lead_id
  ON scheduled_projects(lead_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_projects_start_date
  ON scheduled_projects(start_date);

-- ── 2. leads.status CHECK constraint (1E) ────────────────────
-- 'Backlog' was rejected silently when a CHECK constraint left
-- it out. Re-create the constraint so every status the UI uses
-- is allowed.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_check
  CHECK (status IN (
    'New Lead','Contacted','In Talks',
    'Consult Scheduled','Consult Completed',
    'Estimate Sent','Project Accepted',
    'Project Scheduled','Backlog','Won','Lost'
  ));

-- ── 3. contacts.address (1F) ─────────────────────────────────
-- The contacts table already has an `address` column on the
-- canonical schema, but some earlier deploys are missing it.
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address TEXT;

-- Force PostgREST to refresh its cached schema so the column
-- becomes visible to the JS client without a project restart.
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- project_events migration
-- NOTE: "projects" in this app are rows in the leads table.
--       The FK is lead_id → leads(id), matching project_assignments.
-- Run in Supabase SQL Editor. Review before applying.
-- ============================================================


-- 1. Table
CREATE TABLE IF NOT EXISTS project_events (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID        NOT NULL REFERENCES leads(id)         ON DELETE CASCADE,
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type      TEXT        NOT NULL,
  event_date      TIMESTAMPTZ NOT NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 2. updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_project_events_updated_at ON project_events;
CREATE TRIGGER set_project_events_updated_at
  BEFORE UPDATE ON project_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_project_events_org_date ON project_events (organization_id, event_date);
CREATE INDEX IF NOT EXISTS idx_project_events_lead     ON project_events (lead_id);


-- 4. RLS — same pattern as every other tenant table
ALTER TABLE project_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_scoped_project_events" ON project_events;
CREATE POLICY "org_scoped_project_events"
  ON project_events FOR ALL
  USING     (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));


-- 5. Grants
REVOKE ALL ON project_events FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON project_events TO authenticated;

-- Feature 4 migration
-- Run in Supabase SQL Editor.
-- Does NOT drop job_type yet — that's a separate step after backfill verification.

-- ── 1. Sync project_types to match actual app values ──────────────────────
DELETE FROM project_types WHERE name IN ('Senior Move', 'Packing/Unpacking', 'In-Person Sale');

INSERT INTO project_types (name) VALUES
  ('Move'),
  ('In-person Estate Sale')
ON CONFLICT (name) DO NOTHING;

-- ── 2. Junction table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_project_types (
  project_id      uuid NOT NULL REFERENCES leads(id)         ON DELETE CASCADE,
  project_type_id uuid NOT NULL REFERENCES project_types(id) ON DELETE CASCADE,
  PRIMARY KEY (project_id, project_type_id)
);

CREATE INDEX IF NOT EXISTS idx_ppt_project_id ON project_project_types(project_id);

-- ── 3. RLS ────────────────────────────────────────────────────────────────
ALTER TABLE project_project_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members crud project_project_types"
ON project_project_types FOR ALL
USING (
  project_id IN (
    SELECT id FROM leads
    WHERE organization_id IN (SELECT public.user_organization_ids())
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM leads
    WHERE organization_id IN (SELECT public.user_organization_ids())
  )
);

-- ── 4. Backfill ───────────────────────────────────────────────────────────
-- Single-type leads
INSERT INTO project_project_types (project_id, project_type_id)
SELECT l.id, pt.id
FROM leads l
JOIN project_types pt ON pt.name = l.job_type
WHERE l.job_type IS NOT NULL
  AND l.job_type != 'Both'
ON CONFLICT DO NOTHING;

-- 'Both' leads → Clean Out row
INSERT INTO project_project_types (project_id, project_type_id)
SELECT l.id, pt.id
FROM leads l
JOIN project_types pt ON pt.name = 'Clean Out'
WHERE l.job_type = 'Both'
ON CONFLICT DO NOTHING;

-- 'Both' leads → Auction row
INSERT INTO project_project_types (project_id, project_type_id)
SELECT l.id, pt.id
FROM leads l
JOIN project_types pt ON pt.name = 'Auction'
WHERE l.job_type = 'Both'
ON CONFLICT DO NOTHING;

-- ── 5. Add Realtor to contacts category constraint ───────────────────────
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_type_check;
ALTER TABLE contacts DROP CONSTRAINT IF EXISTS contacts_category_check;
ALTER TABLE contacts ADD CONSTRAINT contacts_category_check
  CHECK (category IN (
    'Vendor', 'Partner', 'Senior Living', 'Referral Partner',
    'Business Connection', 'Client', 'Lead', 'Realtor'
  ));

-- ── 6. Verify backfill (check these numbers match) ───────────────────────
SELECT COUNT(DISTINCT id)         AS leads_with_job_type FROM leads WHERE job_type IS NOT NULL;
SELECT COUNT(DISTINCT project_id) AS leads_in_junction   FROM project_project_types;

-- ── Add missing columns to leads ─────────────────────────────
ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS assigned_to    UUID,
  ADD COLUMN IF NOT EXISTS consult_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS project_start  DATE,
  ADD COLUMN IF NOT EXISTS project_end    DATE,
  ADD COLUMN IF NOT EXISTS crew_size      INTEGER,
  ADD COLUMN IF NOT EXISTS lead_source    TEXT;

-- ── Employees ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS employees (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  name        TEXT NOT NULL,
  role        TEXT,
  phone       TEXT,
  email       TEXT,
  hourly_rate NUMERIC(6,2),
  active      BOOLEAN DEFAULT true
);

-- ── Project Types ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_types (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE
);

INSERT INTO project_types (name) VALUES
  ('Clean Out'),('Auction'),('Senior Move'),('Packing/Unpacking'),('In-Person Sale')
ON CONFLICT (name) DO NOTHING;

-- ── Employee Project Types (employee <-> project type) ────────
-- Note: team_members is already used for calendar crew (id, name, color, initials)
CREATE TABLE IF NOT EXISTS employee_project_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID REFERENCES employees(id) ON DELETE CASCADE,
  project_type_id UUID REFERENCES project_types(id) ON DELETE CASCADE,
  UNIQUE(employee_id, project_type_id)
);

-- ── Project Assignments (employee <-> lead) ───────────────────
CREATE TABLE IF NOT EXISTS project_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         UUID REFERENCES leads(id) ON DELETE CASCADE,
  employee_id     UUID REFERENCES employees(id) ON DELETE CASCADE,
  estimated_hours NUMERIC(5,2),
  UNIQUE(lead_id, employee_id)
);

-- ── Contacts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contacts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  name       TEXT NOT NULL,
  company    TEXT,
  email      TEXT,
  phone      TEXT,
  type       TEXT CHECK (type IN ('Vendor','Partner','Senior Living','Referral Partner','Business Connection','Client','Lead')),
  address    TEXT,
  notes      TEXT,
  tags       TEXT[]
);

-- ── Training Guides ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS training_guides (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  category   TEXT,
  created_by TEXT
);

-- ── Library Assets ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS library_assets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  name        TEXT NOT NULL,
  url         TEXT NOT NULL,
  type        TEXT CHECK (type IN ('Logo','Shirt Design','Marketing Material','Other')),
  tags        TEXT[],
  uploaded_by TEXT
);

-- ── Estimates ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS estimates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    TIMESTAMPTZ DEFAULT now(),
  lead_id       UUID REFERENCES leads(id) ON DELETE CASCADE,
  deal_score_id UUID REFERENCES deal_scores(id) ON DELETE SET NULL,
  bid_amount    NUMERIC(10,2),
  labour_hours  INTEGER,
  job_type      TEXT,
  status        TEXT DEFAULT 'Draft' CHECK (status IN ('Draft','Sent','Accepted','Declined')),
  sent_at       TIMESTAMPTZ,
  accepted_at   TIMESTAMPTZ,
  notes         TEXT
);

-- ── Training Progress (per-user module completion) ───────────────
CREATE TABLE IF NOT EXISTS training_progress (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  guide_id    UUID REFERENCES training_guides(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL,
  completed   BOOLEAN DEFAULT false,
  progress_pct INTEGER DEFAULT 0 CHECK (progress_pct >= 0 AND progress_pct <= 100),
  UNIQUE(guide_id, user_id)
);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for anon" ON employees;
DROP POLICY IF EXISTS "Allow all for anon" ON project_types;
DROP POLICY IF EXISTS "Allow all for anon" ON employee_project_types;
DROP POLICY IF EXISTS "Allow all for anon" ON project_assignments;
DROP POLICY IF EXISTS "Allow all for anon" ON contacts;
DROP POLICY IF EXISTS "Allow all for anon" ON training_guides;
DROP POLICY IF EXISTS "Allow all for anon" ON training_progress;
DROP POLICY IF EXISTS "Allow all for anon" ON library_assets;
DROP POLICY IF EXISTS "Allow all for anon" ON estimates;
DROP POLICY IF EXISTS "Allow all for anon" ON leads;
DROP POLICY IF EXISTS "Allow all for anon" ON deal_scores;

-- ──────────────────────────────────────────────────────────────────────────────
-- SECURITY NOTE: The policies below grant full access to the `anon` role.
-- This is intentional for the pre-authentication phase only.
-- Once Supabase Auth is implemented, replace these with authenticated-only
-- policies, for example:
--
--   CREATE POLICY "Authenticated read" ON leads
--     FOR SELECT TO authenticated USING (true);
--   CREATE POLICY "Authenticated write" ON leads
--     FOR ALL TO authenticated USING (true) WITH CHECK (true);
--
-- DO NOT deploy with real client/employee data until auth is in place.
-- ──────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Allow all for anon" ON employees            FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON project_types        FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON employee_project_types FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON project_assignments  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON contacts             FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON training_guides      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON training_progress    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON library_assets       FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON estimates            FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON leads                FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON deal_scores          FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── Indexes ───────────────────────────────────────────────────
-- Covering indexes for all common filter/sort columns
CREATE INDEX IF NOT EXISTS idx_leads_status        ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at    ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to   ON leads(assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_consult_at    ON leads(consult_at);
CREATE INDEX IF NOT EXISTS idx_leads_project_start ON leads(project_start);
CREATE INDEX IF NOT EXISTS idx_leads_job_type      ON leads(job_type);

CREATE INDEX IF NOT EXISTS idx_contacts_created_at ON contacts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contacts_type       ON contacts(type);

CREATE INDEX IF NOT EXISTS idx_training_guides_category   ON training_guides(category);
CREATE INDEX IF NOT EXISTS idx_training_guides_created_at ON training_guides(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_progress_user_id  ON training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_guide_id ON training_progress(guide_id);

CREATE INDEX IF NOT EXISTS idx_estimates_lead_id   ON estimates(lead_id);
CREATE INDEX IF NOT EXISTS idx_estimates_status    ON estimates(status);

CREATE INDEX IF NOT EXISTS idx_project_assignments_lead_id     ON project_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_employee_id ON project_assignments(employee_id);

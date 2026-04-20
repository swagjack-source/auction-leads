-- ============================================================
-- TENANT / ORGANIZATION ISOLATION MIGRATION
-- Run AFTER initial schema, BEFORE entering real data.
-- Apply in Supabase SQL Editor — review every section first.
-- ============================================================


-- ============================================================
-- SECTION 1: Organizations table (one row per CT franchise)
-- ============================================================
CREATE TABLE IF NOT EXISTS organizations (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL    DEFAULT now(),
  name       TEXT        NOT NULL,
  slug       TEXT        NOT NULL UNIQUE,
  owner_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION 2: Organization members junction table
-- ============================================================
CREATE TABLE IF NOT EXISTS organization_members (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id)    ON DELETE CASCADE,
  role            TEXT NOT NULL DEFAULT 'member'
                       CHECK (role IN ('owner', 'admin', 'member')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);

ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- SECTION 3: Helper — returns org IDs the current user belongs to.
-- SECURITY DEFINER so it can bypass RLS on organization_members
-- without causing recursion. search_path is pinned for safety.
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_organization_ids()
RETURNS SETOF UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT organization_id
  FROM   organization_members
  WHERE  user_id = auth.uid();
$$;


-- ============================================================
-- SECTION 4: Trigger — auto-provision an org for every new sign-up
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO organizations (name, slug, owner_id)
  VALUES (
    'My Franchise',
    'org-' || NEW.id::text,
    NEW.id
  )
  RETURNING id INTO new_org_id;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- SECTION 3.5: Normalize table grants
-- Revoke broad anon access; restrict all tenant tables to the
-- authenticated role only. RLS policies handle row-level filtering.
-- ============================================================
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'organizations', 'organization_members',
    'leads', 'team_members', 'employees', 'employee_project_types',
    'contacts', 'meetings', 'estimates', 'deal_scores',
    'past_projects', 'training_guides', 'library_assets',
    'project_assignments'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('REVOKE ALL ON %I FROM anon', tbl);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO authenticated', tbl);
  END LOOP;
END;
$$;


-- ============================================================
-- SECTION 5: RLS policies — organizations & organization_members
-- ============================================================

-- Any org member can read the org row
CREATE POLICY "orgs_select"
  ON organizations FOR SELECT
  USING (id IN (SELECT public.user_organization_ids()));

-- Only the owner can update the org row
CREATE POLICY "orgs_update"
  ON organizations FOR UPDATE
  USING  (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Members can see who else is in their org
CREATE POLICY "org_members_select"
  ON organization_members FOR SELECT
  USING (organization_id IN (SELECT public.user_organization_ids()));

-- Owners/admins can add, update, or remove members
CREATE POLICY "org_members_manage"
  ON organization_members FOR ALL
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM   organization_members om
      WHERE  om.user_id = auth.uid()
        AND  om.role IN ('owner', 'admin')
    )
  );


-- ============================================================
-- SECTION 6: Add organization_id to every tenant-scoped table
-- IF NOT EXISTS guards make re-runs safe.
-- ============================================================
ALTER TABLE leads                  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE team_members           ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE employees              ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE employee_project_types ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE contacts               ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE meetings               ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE estimates              ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE deal_scores            ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE past_projects          ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE training_guides        ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE library_assets         ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE project_assignments    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;


-- ============================================================
-- SECTION 7: Drop open policies; create org-scoped RLS policies.
-- Pattern: USING (organization_id IN (SELECT user_organization_ids()))
-- ============================================================

-- leads
DROP POLICY IF EXISTS "anon_all"                            ON leads;
DROP POLICY IF EXISTS "Enable all operations for anon users" ON leads;
DROP POLICY IF EXISTS "org_scoped_leads"                    ON leads;
CREATE POLICY "org_scoped_leads"
  ON leads FOR ALL
  USING     (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

-- team_members
DROP POLICY IF EXISTS "anon_all"                            ON team_members;
DROP POLICY IF EXISTS "Enable all operations for anon users" ON team_members;
DROP POLICY IF EXISTS "Enable all for authenticated"         ON team_members;
DROP POLICY IF EXISTS "org_scoped_team_members"             ON team_members;
CREATE POLICY "org_scoped_team_members"
  ON team_members FOR ALL
  USING     (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

-- employees
DROP POLICY IF EXISTS "anon_all"                            ON employees;
DROP POLICY IF EXISTS "Enable all operations for anon users" ON employees;
DROP POLICY IF EXISTS "org_scoped_employees"                ON employees;
CREATE POLICY "org_scoped_employees"
  ON employees FOR ALL
  USING     (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

-- employee_project_types
DROP POLICY IF EXISTS "anon_all"                              ON employee_project_types;
DROP POLICY IF EXISTS "Enable all operations for anon users"  ON employee_project_types;
DROP POLICY IF EXISTS "org_scoped_employee_project_types"     ON employee_project_types;
CREATE POLICY "org_scoped_employee_project_types"
  ON employee_project_types FOR ALL
  USING     (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

-- contacts
DROP POLICY IF EXISTS "anon_all"                            ON contacts;
DROP POLICY IF EXISTS "Enable all operations for anon users" ON contacts;
DROP POLICY IF EXISTS "org_scoped_contacts"                 ON contacts;
CREATE POLICY "org_scoped_contacts"
  ON contacts FOR ALL
  USING     (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

-- meetings
DROP POLICY IF EXISTS "anon_all"                            ON meetings;
DROP POLICY IF EXISTS "Enable all operations for anon users" ON meetings;
DROP POLICY IF EXISTS "org_scoped_meetings"                 ON meetings;
CREATE POLICY "org_scoped_meetings"
  ON meetings FOR ALL
  USING     (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

-- estimates
DROP POLICY IF EXISTS "anon_all"                            ON estimates;
DROP POLICY IF EXISTS "Enable all operations for anon users" ON estimates;
DROP POLICY IF EXISTS "org_scoped_estimates"                ON estimates;
CREATE POLICY "org_scoped_estimates"
  ON estimates FOR ALL
  USING     (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

-- deal_scores
DROP POLICY IF EXISTS "anon_all"                            ON deal_scores;
DROP POLICY IF EXISTS "Enable all operations for anon users" ON deal_scores;
DROP POLICY IF EXISTS "org_scoped_deal_scores"              ON deal_scores;
CREATE POLICY "org_scoped_deal_scores"
  ON deal_scores FOR ALL
  USING     (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

-- past_projects
DROP POLICY IF EXISTS "anon_all"                            ON past_projects;
DROP POLICY IF EXISTS "Enable all operations for anon users" ON past_projects;
DROP POLICY IF EXISTS "org_scoped_past_projects"            ON past_projects;
CREATE POLICY "org_scoped_past_projects"
  ON past_projects FOR ALL
  USING     (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

-- training_guides: NULL org_id = corporate/shared content visible to all
DROP POLICY IF EXISTS "anon_all"                            ON training_guides;
DROP POLICY IF EXISTS "Enable all operations for anon users" ON training_guides;
DROP POLICY IF EXISTS "org_scoped_training_guides"          ON training_guides;
CREATE POLICY "org_scoped_training_guides"
  ON training_guides FOR ALL
  USING (
    organization_id IS NULL
    OR organization_id IN (SELECT public.user_organization_ids())
  )
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

-- library_assets
DROP POLICY IF EXISTS "anon_all"                            ON library_assets;
DROP POLICY IF EXISTS "Enable all operations for anon users" ON library_assets;
DROP POLICY IF EXISTS "org_scoped_library_assets"           ON library_assets;
CREATE POLICY "org_scoped_library_assets"
  ON library_assets FOR ALL
  USING     (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

-- project_assignments
DROP POLICY IF EXISTS "anon_all"                            ON project_assignments;
DROP POLICY IF EXISTS "Enable all operations for anon users" ON project_assignments;
DROP POLICY IF EXISTS "org_scoped_project_assignments"      ON project_assignments;
CREATE POLICY "org_scoped_project_assignments"
  ON project_assignments FOR ALL
  USING     (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));


-- ============================================================
-- SECTION 8: Seed default organization for CT Denver SE
-- ============================================================
INSERT INTO organizations (id, name, slug)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Caring Transitions Denver Southeast',
  'ct-denver-se'
)
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- SECTION 9: Backfill existing rows to Denver SE org
-- ============================================================
UPDATE leads                  SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE team_members           SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE employees              SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE employee_project_types SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE contacts               SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE meetings               SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE estimates              SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE deal_scores            SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE past_projects          SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE library_assets         SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE project_assignments    SET organization_id = 'a0000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
-- training_guides: leave NULL (corporate/shared). Only backfill if you have
-- franchise-specific guides to assign.


-- ============================================================
-- SECTION 10: NOT NULL enforcement — SECOND PASS ONLY
-- Uncomment and run AFTER confirming the Section 9 backfill is clean.
-- ============================================================
-- ALTER TABLE leads                  ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE team_members           ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE employees              ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE employee_project_types ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE contacts               ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE meetings               ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE estimates              ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE deal_scores            ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE past_projects          ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE library_assets         ALTER COLUMN organization_id SET NOT NULL;
-- ALTER TABLE project_assignments    ALTER COLUMN organization_id SET NOT NULL;

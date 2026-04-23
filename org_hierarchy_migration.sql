-- ============================================================
-- Homebase: Org Hierarchy Migration
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Org members table: ties Supabase Auth users to an organization
CREATE TABLE IF NOT EXISTS org_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email           text NOT NULL,
  role            text NOT NULL DEFAULT 'employee',
  -- roles: 'owner' | 'admin' | 'bdr' | 'employee' | 'co_owner'
  is_admin        boolean NOT NULL DEFAULT false,
  status          text NOT NULL DEFAULT 'pending',
  -- status: 'pending' (invite sent) | 'active' (joined)
  invited_by      uuid REFERENCES auth.users(id),
  invited_at      timestamptz DEFAULT now(),
  joined_at       timestamptz,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (organization_id, email)
);

-- 2. Invites table: shareable token-based invites
CREATE TABLE IF NOT EXISTS org_invites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email           text,                          -- optional: pre-fill email
  role            text NOT NULL DEFAULT 'employee',
  is_admin        boolean NOT NULL DEFAULT false,
  token           text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by      uuid REFERENCES auth.users(id),
  expires_at      timestamptz DEFAULT now() + interval '7 days',
  accepted_at     timestamptz,
  created_at      timestamptz DEFAULT now()
);

-- 3. RLS policies for org_members
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members: org members can read their org"
  ON org_members FOR SELECT
  USING (organization_id = ANY(user_organization_ids()));

CREATE POLICY "org_members: admins can insert"
  ON org_members FOR INSERT
  WITH CHECK (organization_id = ANY(user_organization_ids()));

CREATE POLICY "org_members: admins can update"
  ON org_members FOR UPDATE
  USING (organization_id = ANY(user_organization_ids()));

CREATE POLICY "org_members: admins can delete"
  ON org_members FOR DELETE
  USING (organization_id = ANY(user_organization_ids()));

-- 4. RLS policies for org_invites
ALTER TABLE org_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_invites: org members can read"
  ON org_invites FOR SELECT
  USING (organization_id = ANY(user_organization_ids()));

CREATE POLICY "org_invites: org members can create"
  ON org_invites FOR INSERT
  WITH CHECK (organization_id = ANY(user_organization_ids()));

CREATE POLICY "org_invites: org members can delete"
  ON org_invites FOR DELETE
  USING (organization_id = ANY(user_organization_ids()));

-- 5. project_assignments table (for Crew Schedule page)
CREATE TABLE IF NOT EXISTS project_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  employee_id     uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (lead_id, employee_id)
);

ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_assignments: org members can read/write"
  ON project_assignments FOR ALL
  USING (organization_id = ANY(user_organization_ids()))
  WITH CHECK (organization_id = ANY(user_organization_ids()));

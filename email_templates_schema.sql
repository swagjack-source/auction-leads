-- ============================================================
-- EMAIL TEMPLATES TABLE
-- Depends on: tenant_schema.sql (organizations table must exist)
-- Apply AFTER tenant_schema.sql is confirmed clean.
-- ============================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  organization_id UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  category        TEXT        NOT NULL
                  CHECK (category IN ('Follow-up','Intro','Estimate','Thank You','Scheduling','Other')),
  subject         TEXT        NOT NULL,
  body            TEXT        NOT NULL,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Revoke anon access; authenticated only
REVOKE ALL ON email_templates FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON email_templates TO authenticated;

-- Drop any leftover open policy from a prior migration attempt
DROP POLICY IF EXISTS "anon_all_email_templates"      ON email_templates;
DROP POLICY IF EXISTS "org_scoped_email_templates"    ON email_templates;

-- Org members can read/write their own org's templates
CREATE POLICY "org_scoped_email_templates"
  ON email_templates FOR ALL
  USING     (organization_id IN (SELECT public.user_organization_ids()))
  WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS email_templates_set_updated_at ON email_templates;
CREATE TRIGGER email_templates_set_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- No seeds here. Add starter templates through the app UI once auth is wired.

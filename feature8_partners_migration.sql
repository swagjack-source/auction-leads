-- Feature 8: Partners table + Dawn Jones seed
-- Run in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS partners (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  contact_name    text        NOT NULL,
  business_name   text,
  phone           text,
  email           text,
  website         text,
  specialties     text[]      NOT NULL DEFAULT '{}',
  notes           text,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partners_org  ON partners(organization_id);
CREATE INDEX IF NOT EXISTS idx_partners_name ON partners(organization_id, contact_name);

ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members crud partners"
ON partners FOR ALL
USING  (organization_id IN (SELECT public.user_organization_ids()))
WITH CHECK (organization_id IN (SELECT public.user_organization_ids()));

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER partners_updated_at
  BEFORE UPDATE ON partners
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed: Dawn Jones for Caring Transitions Denver Southeast
INSERT INTO partners (organization_id, contact_name, business_name, specialties)
SELECT o.id,
  'Dawn Jones',
  'Little Sparrow Enterprises',
  ARRAY[
    'grandfather clocks', 'mantle clocks', 'clocks', 'keys',
    '1950s furniture', 'mid-century modern furniture'
  ]
FROM organizations o
WHERE o.name = 'Caring Transitions Denver Southeast'
ON CONFLICT DO NOTHING;

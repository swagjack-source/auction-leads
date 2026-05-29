-- ============================================================
-- Auto-sync Won leads to Contacts as Clients
-- Run in Supabase SQL Editor.
-- ============================================================


-- 1. Trigger function: fires when a lead transitions to Won or Project Completed
CREATE OR REPLACE FUNCTION public.sync_won_lead_to_contacts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IN ('Won', 'Project Completed')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.name IS NOT NULL
     AND NEW.organization_id IS NOT NULL
  THEN
    INSERT INTO contacts (name, phone, email, address, category, organization_id)
    SELECT
      NEW.name,
      NEW.phone,
      NEW.email,
      NEW.address,
      'Client',
      NEW.organization_id
    WHERE NOT EXISTS (
      SELECT 1 FROM contacts
      WHERE organization_id = NEW.organization_id
        AND lower(name) = lower(NEW.name)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_lead_won ON leads;
CREATE TRIGGER on_lead_won
  AFTER UPDATE OF status ON leads
  FOR EACH ROW EXECUTE FUNCTION public.sync_won_lead_to_contacts();


-- 2. Backfill: create Client contacts for all existing Won/Completed leads
--    that don't already have a matching contact in their org.
INSERT INTO contacts (name, phone, email, address, category, organization_id)
SELECT DISTINCT ON (l.organization_id, lower(l.name))
  l.name, l.phone, l.email, l.address, 'Client', l.organization_id
FROM leads l
WHERE l.status IN ('Won', 'Project Completed')
  AND l.name IS NOT NULL
  AND l.organization_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM contacts c
    WHERE c.organization_id = l.organization_id
      AND lower(c.name) = lower(l.name)
  );

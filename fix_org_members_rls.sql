-- ============================================================
-- FIX: organization_members RLS infinite recursion
-- ============================================================
-- Root cause: org_members_manage FOR ALL has a self-referential
-- subquery. FOR ALL includes SELECT, so evaluating the USING
-- clause queries organization_members again → infinite recursion
-- → Supabase returns 500.
--
-- Fix: wrap the admin check in a SECURITY DEFINER function so it
-- bypasses RLS when called from within a policy, same pattern
-- already used by user_organization_ids().
-- ============================================================


-- Step 1: SECURITY DEFINER admin check (bypasses RLS, no recursion)
CREATE OR REPLACE FUNCTION public.user_is_org_admin(org_id UUID)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM   organization_members
    WHERE  organization_id = org_id
      AND  user_id         = auth.uid()
      AND  role            IN ('owner', 'admin')
  );
$$;


-- Step 2: Replace the recursive policy
DROP POLICY IF EXISTS "org_members_manage" ON organization_members;

CREATE POLICY "org_members_manage"
  ON organization_members FOR ALL
  USING     (public.user_is_org_admin(organization_id))
  WITH CHECK (public.user_is_org_admin(organization_id));


-- Step 3: Backfill any user who signed up before the trigger was
-- installed (they have no organization_members row, so
-- user_organization_ids() returns empty → all RLS checks fail
-- → zero rows returned from every tenant table).
INSERT INTO organization_members (organization_id, user_id, role)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  u.id,
  'owner'
FROM auth.users u
WHERE u.id NOT IN (SELECT user_id FROM organization_members)
ON CONFLICT DO NOTHING;

-- ============================================================
-- Join Invite Migration
-- Run in Supabase SQL Editor before deploying the /join page.
-- ============================================================


-- 1. Read invite by token (callable by unauthenticated users)
CREATE OR REPLACE FUNCTION public.get_invite_by_token(invite_token text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'id',                i.id,
    'organization_id',   i.organization_id,
    'organization_name', o.name,
    'email',             i.email,
    'role',              i.role,
    'is_admin',          i.is_admin,
    'expires_at',        i.expires_at,
    'accepted_at',       i.accepted_at
  )
  FROM org_invites i
  JOIN organizations o ON o.id = i.organization_id
  WHERE i.token = invite_token;
$$;

GRANT EXECUTE ON FUNCTION public.get_invite_by_token(text) TO anon, authenticated;


-- 2. Accept invite (authenticated users only)
--    Validates token, inserts into organization_members, marks accepted_at.
CREATE OR REPLACE FUNCTION public.accept_invite(invite_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_invite    org_invites%ROWTYPE;
  v_user_id   uuid := auth.uid();
  v_user_email text;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT * INTO v_invite FROM org_invites WHERE token = invite_token;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'invalid_token');
  END IF;

  IF v_invite.accepted_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'already_accepted');
  END IF;

  IF v_invite.expires_at < now() THEN
    RETURN jsonb_build_object('error', 'expired');
  END IF;

  -- If invite was addressed to a specific email, enforce it
  IF v_invite.email IS NOT NULL THEN
    SELECT email INTO v_user_email FROM auth.users WHERE id = v_user_id;
    IF lower(v_user_email) != lower(v_invite.email) THEN
      RETURN jsonb_build_object('error', 'email_mismatch');
    END IF;
  END IF;

  INSERT INTO organization_members (organization_id, user_id, role)
  VALUES (v_invite.organization_id, v_user_id, 'member')
  ON CONFLICT DO NOTHING;

  UPDATE org_invites SET accepted_at = now() WHERE id = v_invite.id;

  RETURN jsonb_build_object('success', true, 'organization_id', v_invite.organization_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_invite(text) TO authenticated;


-- 3. Update handle_new_user trigger to skip org creation for invited users.
--    The /join page passes { data: { skip_org_creation: 'true' } } on signUp,
--    which lands in raw_user_meta_data. Without this, invited users get a
--    solo empty org in addition to the one they're joining.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  new_org_id UUID;
BEGIN
  IF (NEW.raw_user_meta_data->>'skip_org_creation')::boolean = true THEN
    RETURN NEW;
  END IF;

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

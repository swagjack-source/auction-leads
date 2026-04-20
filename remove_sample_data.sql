-- Remove sample/mock leads from all accounts
-- Targets only the known mock emails — real leads are untouched.

DELETE FROM leads
WHERE email IN (
  'mholloway@gmail.com',
  'dkowalski@yahoo.com',
  'pfenwick@comcast.net',
  'bob.tanner@gmail.com',
  'evelynm@hotmail.com',
  'ghutchinson@sbcglobal.net',
  'doricallahan@gmail.com',
  'frankdeluca59@gmail.com',
  'briggsestate@outlook.com',
  'salbright@gmail.com',
  'cvickers@aol.com',
  'j.ostrowski@yahoo.com',
  'treardon@gmail.com',
  'bev.sampson@gmail.com',
  'waltpemberton@gmail.com',
  'helen.kramer@comcast.net',
  'rcosta@gmail.com',
  'nancyfitz@outlook.com'
);

-- Remove seeding from the signup trigger
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

-- Clean up the seed function
DROP FUNCTION IF EXISTS public.seed_sample_leads(UUID);

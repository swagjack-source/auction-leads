-- Calendar feed RPCs — SECURITY DEFINER so Netlify functions can read
-- all data via the anon key without fighting RLS or service role grants.
-- Run in Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public.get_calendar_leads()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(l)), '[]')
    FROM (
      SELECT id, name, address, job_type,
             project_start, project_end,
             status, crew_size, deal_score, what_they_need
      FROM   leads
      WHERE  project_start IS NOT NULL
        AND  status != 'Lost'
      ORDER  BY project_start ASC
    ) l
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_calendar_project_events()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(e)), '[]')
    FROM (
      SELECT pe.id,
             pe.lead_id,
             pe.event_type,
             pe.event_date,
             pe.notes,
             l.name    AS lead_name,
             l.address AS lead_address
      FROM   project_events pe
      JOIN   leads l ON l.id = pe.lead_id
      ORDER  BY pe.event_date ASC
    ) e
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_calendar_consults()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN (
    SELECT coalesce(jsonb_agg(row_to_json(c)), '[]')
    FROM (
      SELECT l.id, l.name, l.address, l.assigned_to,
             l.consult_at, l.what_they_need, l.lead_source, l.status,
             tm.name AS assignee_name
      FROM   leads l
      LEFT   JOIN team_members tm ON tm.id = l.assigned_to
      WHERE  l.consult_at IS NOT NULL
        AND  l.status != 'Lost'
      ORDER  BY l.consult_at ASC
    ) c
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_calendar_leads()          TO anon;
GRANT EXECUTE ON FUNCTION public.get_calendar_project_events() TO anon;
GRANT EXECUTE ON FUNCTION public.get_calendar_consults()       TO anon;

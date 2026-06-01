-- Add end_date to project_events and update the calendar RPC.
-- Run in Supabase SQL Editor.

ALTER TABLE project_events ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;

-- Update RPC to return end_date
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
             pe.end_date,
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

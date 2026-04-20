-- Run this if team_members, meetings, or past_projects show permission errors
-- (these tables were created in the initial schema)

DROP POLICY IF EXISTS "Allow all for anon" ON team_members;
DROP POLICY IF EXISTS "Allow all for anon" ON meetings;
DROP POLICY IF EXISTS "Allow all for anon" ON past_projects;

CREATE POLICY "Allow all for anon" ON team_members  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON meetings      FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON past_projects FOR ALL TO anon USING (true) WITH CHECK (true);

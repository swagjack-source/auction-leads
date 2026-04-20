-- ============================================================
-- MERGE team_members ↔ employees
--
-- Strategy: add missing columns to team_members so it becomes
-- the single source of truth, then add team_member_id FK to
-- employees for backward compatibility during the transition.
-- ============================================================

-- 1. Extend team_members with employee-style fields
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS role        TEXT,
  ADD COLUMN IF NOT EXISTS phone       TEXT,
  ADD COLUMN IF NOT EXISTS email       TEXT,
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS active      BOOLEAN DEFAULT true;

-- 2. Link each employee row back to team_members
ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS team_member_id UUID REFERENCES team_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_employees_team_member_id ON employees(team_member_id);

-- 3. How to migrate existing data (run manually after verifying name matches):
--
--   UPDATE employees e
--   SET team_member_id = tm.id
--   FROM team_members tm
--   WHERE lower(trim(e.name)) = lower(trim(tm.name));
--
-- Review unmatched rows:
--   SELECT e.name AS employee_name, e.id AS employee_id
--   FROM employees e
--   WHERE e.team_member_id IS NULL;
--
-- For each unmatched employee, either:
--   a) Insert a matching team_members row and link it, or
--   b) Accept that this person isn't on the scheduling calendar yet.

-- 4. Long-term path (after data is fully migrated):
--    Merge all employees columns into team_members and drop the employees table.
--    Until then, the two tables are linked via team_member_id.
--
--    Future migration (DO NOT run until migration above is verified clean):
--    -- Copy remaining employee data into team_members
--    UPDATE team_members tm
--    SET role        = e.role,
--        phone       = e.phone,
--        email       = e.email,
--        hourly_rate = e.hourly_rate,
--        active      = e.active
--    FROM employees e
--    WHERE e.team_member_id = tm.id;
--
--    -- Migrate project_assignments to reference team_members directly
--    ALTER TABLE project_assignments
--      ADD COLUMN team_member_id UUID REFERENCES team_members(id);
--
--    UPDATE project_assignments pa
--    SET team_member_id = e.team_member_id
--    FROM employees e
--    WHERE pa.employee_id = e.id;
--
--    -- Then drop employees table once everything is migrated
--    DROP TABLE IF EXISTS employees;

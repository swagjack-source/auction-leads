-- ============================================================
-- Run this in the Supabase SQL editor
-- Allows the anon key to read/write leads and deal_scores
-- (Required because the app has no auth yet)
-- ============================================================

CREATE POLICY "Allow all for anon" ON leads
  FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow all for anon" ON deal_scores
  FOR ALL TO anon USING (true) WITH CHECK (true);

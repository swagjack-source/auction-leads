-- Add checklist column to leads table
-- Stores an array of { label: string, done: boolean } objects

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::jsonb;

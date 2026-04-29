-- Add missing columns to contacts table
-- Run in Supabase SQL Editor
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company TEXT;
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS address TEXT;

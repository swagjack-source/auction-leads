-- Add lead_source column to leads table
-- Run this in the Supabase SQL editor

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS lead_source TEXT
    CHECK (lead_source IN (
      'Google',
      'Referral',
      'Realtor',
      'Staff Referral',
      'Senior Living Community',
      'Other'
    ));

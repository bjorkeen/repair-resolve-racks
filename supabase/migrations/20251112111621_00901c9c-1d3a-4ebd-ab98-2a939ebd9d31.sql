-- Add REPAIR_CENTER role to app_role enum
ALTER TYPE app_role ADD VALUE 'REPAIR_CENTER';

-- Create repair_status enum for tracking repair progress
CREATE TYPE repair_status AS ENUM ('IN_PROGRESS', 'BLOCKED', 'DONE');

-- Add repair_status column to tickets
ALTER TABLE tickets ADD COLUMN repair_status repair_status;

-- Add user_id to repair_centers to link them with auth users
ALTER TABLE repair_centers ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- RLS policy for repair centers to view their assigned tickets
CREATE POLICY "Repair centers can view their assigned tickets"
ON tickets FOR SELECT
USING (
  repair_center_id IN (
    SELECT id FROM repair_centers WHERE user_id = auth.uid()
  )
);

-- RLS policy for repair centers to update repair status on their tickets
CREATE POLICY "Repair centers can update repair status"
ON tickets FOR UPDATE
USING (
  repair_center_id IN (
    SELECT id FROM repair_centers WHERE user_id = auth.uid()
  )
  AND status = 'IN_REPAIR'
)
WITH CHECK (
  repair_center_id IN (
    SELECT id FROM repair_centers WHERE user_id = auth.uid()
  )
);

-- Update repair_centers RLS to allow viewing own profile
CREATE POLICY "Repair centers can view their own profile"
ON repair_centers FOR SELECT
USING (user_id = auth.uid());
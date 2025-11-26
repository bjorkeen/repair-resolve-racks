-- Update RLS policy to allow repair centers to update tickets to specific statuses
DROP POLICY IF EXISTS "Repair centers can update repair status" ON tickets;

CREATE POLICY "Repair centers can update their assigned tickets"
ON tickets
FOR UPDATE
USING (
  repair_center_id IN (
    SELECT id FROM repair_centers WHERE user_id = auth.uid()
  )
  AND status IN ('IN_REPAIR', 'PRODUCT_EVALUATION', 'REPLACEMENT_INITIATED', 'REPAIR_COMPLETED')
)
WITH CHECK (
  repair_center_id IN (
    SELECT id FROM repair_centers WHERE user_id = auth.uid()
  )
  AND status IN ('IN_REPAIR', 'PRODUCT_EVALUATION', 'REPLACEMENT_INITIATED', 'REPAIR_COMPLETED')
);
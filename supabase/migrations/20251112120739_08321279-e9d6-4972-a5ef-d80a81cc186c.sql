-- Create priority enum
CREATE TYPE ticket_priority AS ENUM ('LOW', 'NORMAL', 'URGENT');

-- Add priority and SLA fields to tickets table
ALTER TABLE tickets 
ADD COLUMN IF NOT EXISTS priority ticket_priority DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS sla_hours INTEGER DEFAULT 48,
ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMP WITH TIME ZONE;

-- Add is_internal field to ticket_comments
ALTER TABLE ticket_comments 
ADD COLUMN IF NOT EXISTS is_internal BOOLEAN DEFAULT false;

-- Update RLS policy for ticket_comments to hide internal comments from customers
DROP POLICY IF EXISTS "Users can view comments on accessible tickets" ON ticket_comments;

CREATE POLICY "Users can view comments on accessible tickets"
ON ticket_comments FOR SELECT
USING (
  -- Staff/Admin can see all comments
  (has_role(auth.uid(), 'STAFF') OR has_role(auth.uid(), 'ADMIN'))
  OR
  -- Repair centers can see all comments on their tickets
  (EXISTS (
    SELECT 1 FROM tickets 
    WHERE tickets.id = ticket_id 
    AND tickets.repair_center_id IN (
      SELECT id FROM repair_centers WHERE user_id = auth.uid()
    )
  ))
  OR
  -- Customers can only see non-internal comments on their tickets
  (EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_id AND tickets.owner_id = auth.uid())
   AND is_internal = false)
);

-- Function to auto-calculate SLA due date when priority is set
CREATE OR REPLACE FUNCTION calculate_sla_due_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.priority IS NOT NULL AND NEW.sla_due_at IS NULL THEN
    NEW.sla_due_at := NEW.created_at + (NEW.sla_hours || ' hours')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to set SLA due date on ticket creation
DROP TRIGGER IF EXISTS set_sla_due_date ON tickets;
CREATE TRIGGER set_sla_due_date
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION calculate_sla_due_date();

-- Create index for priority filtering
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);
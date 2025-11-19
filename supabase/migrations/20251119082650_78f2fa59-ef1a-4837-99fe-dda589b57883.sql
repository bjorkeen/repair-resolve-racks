-- Update RLS policies to include STAFF_MANAGER role

-- Drop existing policies
DROP POLICY IF EXISTS "Users can comment on accessible tickets" ON ticket_comments;
DROP POLICY IF EXISTS "Users can view comments on accessible tickets" ON ticket_comments;

-- Recreate with STAFF_MANAGER included
CREATE POLICY "Users can comment on accessible tickets"
ON ticket_comments
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND (
    -- Customer can comment on their own tickets
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_comments.ticket_id 
      AND tickets.owner_id = auth.uid()
    )
    -- Staff roles can comment on any ticket
    OR has_role(auth.uid(), 'STAFF'::app_role)
    OR has_role(auth.uid(), 'ADMIN'::app_role)
    OR has_role(auth.uid(), 'STAFF_MANAGER'::app_role)
    -- Repair centers can comment on their assigned tickets
    OR EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_comments.ticket_id 
      AND tickets.repair_center_id IN (
        SELECT repair_centers.id 
        FROM repair_centers 
        WHERE repair_centers.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can view comments on accessible tickets"
ON ticket_comments
FOR SELECT
USING (
  -- Staff roles can view all comments
  has_role(auth.uid(), 'STAFF'::app_role)
  OR has_role(auth.uid(), 'ADMIN'::app_role)
  OR has_role(auth.uid(), 'STAFF_MANAGER'::app_role)
  -- Repair centers can view comments on their tickets
  OR EXISTS (
    SELECT 1 FROM tickets 
    WHERE tickets.id = ticket_comments.ticket_id 
    AND tickets.repair_center_id IN (
      SELECT repair_centers.id 
      FROM repair_centers 
      WHERE repair_centers.user_id = auth.uid()
    )
  )
  -- Customers can only view non-internal comments on their tickets
  OR (
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_comments.ticket_id 
      AND tickets.owner_id = auth.uid()
    )
    AND is_internal = false
  )
);

-- Create audit logging trigger for comments
CREATE OR REPLACE FUNCTION log_comment_to_events()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log comment creation to ticket_events for audit trail
  INSERT INTO ticket_events (
    ticket_id,
    by_user_id,
    type,
    note
  ) VALUES (
    NEW.ticket_id,
    NEW.user_id,
    CASE 
      WHEN NEW.is_internal THEN 'INTERNAL_NOTE_ADDED'
      ELSE 'COMMENT_ADDED'
    END,
    LEFT(NEW.comment, 200) || CASE WHEN LENGTH(NEW.comment) > 200 THEN '...' ELSE '' END
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger to log comments
DROP TRIGGER IF EXISTS log_comment_audit ON ticket_comments;
CREATE TRIGGER log_comment_audit
  AFTER INSERT ON ticket_comments
  FOR EACH ROW
  EXECUTE FUNCTION log_comment_to_events();
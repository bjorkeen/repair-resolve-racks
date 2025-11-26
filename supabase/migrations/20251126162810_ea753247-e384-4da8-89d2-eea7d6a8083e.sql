-- Update RLS policy to allow feedback for RESOLVED, REJECTED, and CLOSED tickets
DROP POLICY IF EXISTS "Customers can create feedback for their tickets" ON ticket_feedback;

CREATE POLICY "Customers can create feedback for their tickets"
ON ticket_feedback
FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (
    SELECT 1 FROM tickets 
    WHERE tickets.id = ticket_feedback.ticket_id 
      AND tickets.owner_id = auth.uid() 
      AND tickets.status IN ('RESOLVED', 'REJECTED', 'CLOSED')
  )
);
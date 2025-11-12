-- Add estimated completion date to tickets
ALTER TABLE public.tickets
ADD COLUMN estimated_completion_date timestamp with time zone;

-- Update RLS policy to allow repair centers to upload attachments
CREATE POLICY "Repair centers can upload attachments"
ON public.ticket_attachments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets
    WHERE tickets.id = ticket_attachments.ticket_id
    AND tickets.repair_center_id IN (
      SELECT id FROM repair_centers WHERE user_id = auth.uid()
    )
  )
);
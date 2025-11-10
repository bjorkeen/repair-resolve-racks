-- Add assigned_to column to tickets table
ALTER TABLE public.tickets 
ADD COLUMN assigned_to uuid REFERENCES public.profiles(user_id);

-- Create index for better query performance
CREATE INDEX idx_tickets_assigned_to ON public.tickets(assigned_to);

-- Update RLS policy to allow staff to assign themselves
CREATE POLICY "Staff can assign tickets to themselves"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  (has_role(auth.uid(), 'STAFF'::app_role) OR has_role(auth.uid(), 'ADMIN'::app_role))
  AND (assigned_to IS NULL OR assigned_to = auth.uid())
)
WITH CHECK (
  (has_role(auth.uid(), 'STAFF'::app_role) OR has_role(auth.uid(), 'ADMIN'::app_role))
);
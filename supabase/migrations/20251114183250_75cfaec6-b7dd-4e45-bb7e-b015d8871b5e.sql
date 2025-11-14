-- Update RLS policy to allow STAFF_MANAGER to view all tickets
DROP POLICY IF EXISTS "Staff and admins can view all tickets" ON public.tickets;

CREATE POLICY "Staff and admins can view all tickets"
ON public.tickets
FOR SELECT
USING (
  has_role(auth.uid(), 'STAFF'::app_role) OR 
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'STAFF_MANAGER'::app_role)
);

-- Also update the update policy for STAFF_MANAGER
DROP POLICY IF EXISTS "Staff and admins can update tickets" ON public.tickets;

CREATE POLICY "Staff and admins can update tickets"
ON public.tickets
FOR UPDATE
USING (
  has_role(auth.uid(), 'STAFF'::app_role) OR 
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'STAFF_MANAGER'::app_role)
);

-- Update the assign tickets policy
DROP POLICY IF EXISTS "Staff can assign tickets to themselves" ON public.tickets;

CREATE POLICY "Staff can assign tickets to themselves"
ON public.tickets
FOR UPDATE
USING (
  (has_role(auth.uid(), 'STAFF'::app_role) OR 
   has_role(auth.uid(), 'ADMIN'::app_role) OR 
   has_role(auth.uid(), 'STAFF_MANAGER'::app_role)) AND 
  (assigned_to IS NULL OR assigned_to = auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'STAFF'::app_role) OR 
  has_role(auth.uid(), 'ADMIN'::app_role) OR 
  has_role(auth.uid(), 'STAFF_MANAGER'::app_role)
);
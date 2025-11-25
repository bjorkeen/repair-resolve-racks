-- Allow customers to update their own tickets to SHIPPING status
CREATE POLICY "Customers can update status to SHIPPING"
ON public.tickets
FOR UPDATE
TO authenticated
USING (
  auth.uid() = owner_id 
  AND status = 'OPEN'
  AND ticket_type = 'REPAIR'
  AND warranty_eligible = true
)
WITH CHECK (
  auth.uid() = owner_id
  AND status = 'SHIPPING'
);
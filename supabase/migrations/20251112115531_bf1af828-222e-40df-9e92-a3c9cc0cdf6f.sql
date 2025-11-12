-- Add CANCELLED status to ticket_status enum
ALTER TYPE ticket_status ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Create storage bucket for ticket attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-attachments',
  'ticket-attachments',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create ticket_attachments table
CREATE TABLE IF NOT EXISTS ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on ticket_attachments
ALTER TABLE ticket_attachments ENABLE ROW LEVEL SECURITY;

-- Customers can upload attachments to their own tickets
CREATE POLICY "Customers can upload to their tickets"
ON ticket_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM tickets 
    WHERE tickets.id = ticket_id 
    AND tickets.owner_id = auth.uid()
  )
);

-- Customers can view attachments on their tickets
CREATE POLICY "Customers can view their ticket attachments"
ON ticket_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tickets 
    WHERE tickets.id = ticket_id 
    AND tickets.owner_id = auth.uid()
  )
);

-- Staff and admins can view all attachments
CREATE POLICY "Staff can view all attachments"
ON ticket_attachments FOR SELECT
USING (has_role(auth.uid(), 'STAFF') OR has_role(auth.uid(), 'ADMIN'));

-- Repair centers can view attachments for their assigned tickets
CREATE POLICY "Repair centers can view their ticket attachments"
ON ticket_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM tickets 
    WHERE tickets.id = ticket_id 
    AND tickets.repair_center_id IN (
      SELECT id FROM repair_centers WHERE user_id = auth.uid()
    )
  )
);

-- Storage policies for ticket-attachments bucket
CREATE POLICY "Users can upload attachments to their tickets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'ticket-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view attachments for accessible tickets"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'ticket-attachments' AND (
    -- Owner can view their files
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- Staff and admins can view all
    has_role(auth.uid(), 'STAFF')
    OR
    has_role(auth.uid(), 'ADMIN')
  )
);

-- Create ticket_comments table
CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS on ticket_comments
ALTER TABLE ticket_comments ENABLE ROW LEVEL SECURITY;

-- Users can create comments on accessible tickets
CREATE POLICY "Users can comment on accessible tickets"
ON ticket_comments FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND (
    -- Ticket owner
    EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_id AND tickets.owner_id = auth.uid())
    OR
    -- Staff/Admin
    has_role(auth.uid(), 'STAFF')
    OR
    has_role(auth.uid(), 'ADMIN')
    OR
    -- Repair center
    EXISTS (
      SELECT 1 FROM tickets 
      WHERE tickets.id = ticket_id 
      AND tickets.repair_center_id IN (
        SELECT id FROM repair_centers WHERE user_id = auth.uid()
      )
    )
  )
);

-- Users can view comments on accessible tickets
CREATE POLICY "Users can view comments on accessible tickets"
ON ticket_comments FOR SELECT
USING (
  -- Ticket owner
  EXISTS (SELECT 1 FROM tickets WHERE tickets.id = ticket_id AND tickets.owner_id = auth.uid())
  OR
  -- Staff/Admin
  has_role(auth.uid(), 'STAFF')
  OR
  has_role(auth.uid(), 'ADMIN')
  OR
  -- Repair center
  EXISTS (
    SELECT 1 FROM tickets 
    WHERE tickets.id = ticket_id 
    AND tickets.repair_center_id IN (
      SELECT id FROM repair_centers WHERE user_id = auth.uid()
    )
  )
);

-- Enable realtime for ticket_comments
ALTER TABLE ticket_comments REPLICA IDENTITY FULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_ticket_comments_ticket_id ON ticket_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_attachments_ticket_id ON ticket_attachments(ticket_id);
-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Staff and admins can create notifications
CREATE POLICY "Staff can create notifications"
ON notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'STAFF') OR has_role(auth.uid(), 'ADMIN'));

-- Enable realtime for tickets table
ALTER TABLE tickets REPLICA IDENTITY FULL;

-- Create function to notify staff when repair status changes to DONE
CREATE OR REPLACE FUNCTION notify_staff_on_repair_done()
RETURNS TRIGGER AS $$
DECLARE
  staff_user_id UUID;
BEGIN
  -- Only trigger when repair_status changes to DONE
  IF NEW.repair_status = 'DONE' AND (OLD.repair_status IS NULL OR OLD.repair_status != 'DONE') THEN
    -- Get all staff and admin users
    FOR staff_user_id IN 
      SELECT user_id FROM user_roles 
      WHERE role IN ('STAFF', 'ADMIN')
    LOOP
      -- Create notification for each staff member
      INSERT INTO notifications (user_id, ticket_id, title, message)
      VALUES (
        staff_user_id,
        NEW.id,
        'Repair Completed',
        'Ticket #' || NEW.ticket_number || ' repair has been completed and is ready for review.'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for repair status changes
CREATE TRIGGER notify_staff_on_repair_done_trigger
AFTER UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION notify_staff_on_repair_done();
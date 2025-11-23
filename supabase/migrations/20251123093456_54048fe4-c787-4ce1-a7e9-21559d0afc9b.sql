-- Create feedback table
CREATE TABLE IF NOT EXISTS ticket_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(ticket_id)
);

-- Enable RLS on feedback table
ALTER TABLE ticket_feedback ENABLE ROW LEVEL SECURITY;

-- RLS policies for feedback
CREATE POLICY "Customers can create feedback for their tickets"
ON ticket_feedback
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM tickets 
    WHERE tickets.id = ticket_feedback.ticket_id 
    AND tickets.owner_id = auth.uid()
    AND tickets.status IN ('CLOSED', 'REJECTED')
  )
);

CREATE POLICY "Customers can view their own feedback"
ON ticket_feedback
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Staff managers and admins can view all feedback"
ON ticket_feedback
FOR SELECT
USING (
  has_role(auth.uid(), 'STAFF_MANAGER'::app_role) 
  OR has_role(auth.uid(), 'ADMIN'::app_role)
);

-- Update ticket assignment trigger to handle capacity and auto-assignment
CREATE OR REPLACE FUNCTION assign_repair_center_to_ticket()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_repair_center_id UUID;
  v_active_count INTEGER;
BEGIN
  -- Only assign when status changes to SHIPPING and no repair center is assigned
  IF NEW.status = 'SHIPPING' AND NEW.repair_center_id IS NULL THEN
    -- Find repair centers that handle this product type
    FOR v_repair_center_id IN 
      SELECT rcp.repair_center_id
      FROM repair_center_products rcp
      WHERE rcp.product_id = NEW.product_id
      ORDER BY RANDOM()
    LOOP
      -- Check active ticket count for this repair center
      SELECT COUNT(*) INTO v_active_count
      FROM tickets
      WHERE repair_center_id = v_repair_center_id
        AND status NOT IN ('CLOSED', 'REJECTED', 'CANCELLED');
      
      -- If under capacity (5 tickets), assign to this center
      IF v_active_count < 5 THEN
        NEW.repair_center_id := v_repair_center_id;
        EXIT;
      END IF;
    END LOOP;
    
    -- If no center found (all at capacity), create an alert
    IF NEW.repair_center_id IS NULL THEN
      INSERT INTO alerts (
        type,
        severity,
        title,
        description,
        product_id,
        ticket_id
      ) VALUES (
        'REPAIR_CENTER_UNDERPERFORMANCE',
        'HIGH',
        'All Repair Centers At Capacity',
        'Unable to assign ticket #' || NEW.ticket_number || ' - all repair centers handling this product are at maximum capacity (5 active tickets)',
        NEW.product_id,
        NEW.id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create function to check repair center capacity and create alerts
CREATE OR REPLACE FUNCTION check_repair_center_capacity()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_center RECORD;
  v_active_count INTEGER;
BEGIN
  FOR v_center IN SELECT id, name FROM repair_centers
  LOOP
    SELECT COUNT(*) INTO v_active_count
    FROM tickets
    WHERE repair_center_id = v_center.id
      AND status NOT IN ('CLOSED', 'REJECTED', 'CANCELLED');
    
    -- Create alert if at capacity (5 or more tickets)
    IF v_active_count >= 5 THEN
      -- Check if alert already exists
      IF NOT EXISTS (
        SELECT 1 FROM alerts
        WHERE type = 'REPAIR_CENTER_UNDERPERFORMANCE'
          AND repair_center_id = v_center.id
          AND status = 'OPEN'
      ) THEN
        INSERT INTO alerts (
          type,
          severity,
          title,
          description,
          repair_center_id,
          metric_value,
          threshold
        ) VALUES (
          'REPAIR_CENTER_UNDERPERFORMANCE',
          'HIGH',
          'Repair Center At Maximum Capacity',
          'Repair center "' || v_center.name || '" has reached maximum capacity with ' || v_active_count || ' active tickets',
          v_center.id,
          v_active_count,
          5
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;
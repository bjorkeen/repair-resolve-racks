-- Fix the assign_repair_center_to_ticket function to resolve DISTINCT/ORDER BY conflict
CREATE OR REPLACE FUNCTION public.assign_repair_center_to_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_repair_center_id UUID;
  v_active_count INTEGER;
  v_product_type product_type;
BEGIN
  -- Only assign when ticket is created and it's a REPAIR type
  IF TG_OP = 'INSERT' AND NEW.ticket_type = 'REPAIR' AND NEW.repair_center_id IS NULL THEN
    -- Get the product type
    SELECT product_type INTO v_product_type
    FROM products
    WHERE id = NEW.product_id;
    
    -- Find repair centers that handle this product type, ordered randomly
    FOR v_repair_center_id IN 
      SELECT rcp.repair_center_id
      FROM repair_center_products rcp
      JOIN products p ON p.id = rcp.product_id
      WHERE p.product_type = v_product_type
      GROUP BY rcp.repair_center_id
      ORDER BY RANDOM()
    LOOP
      -- Check active ticket count for this repair center
      SELECT COUNT(*) INTO v_active_count
      FROM tickets
      WHERE repair_center_id = v_repair_center_id
        AND status NOT IN ('CLOSED', 'REJECTED', 'CANCELLED', 'REJECTED_OUT_OF_WARRANTY');
      
      -- If under capacity (5 tickets), assign to this center
      IF v_active_count < 5 THEN
        NEW.repair_center_id := v_repair_center_id;
        EXIT;
      END IF;
    END LOOP;
    
    -- If no center found (all at capacity), still assign to one but create an alert
    IF NEW.repair_center_id IS NULL THEN
      -- Assign to the first available repair center for this product type
      SELECT rcp.repair_center_id INTO v_repair_center_id
      FROM repair_center_products rcp
      JOIN products p ON p.id = rcp.product_id
      WHERE p.product_type = v_product_type
      GROUP BY rcp.repair_center_id
      LIMIT 1;
      
      NEW.repair_center_id := v_repair_center_id;
      
      -- Create an alert
      INSERT INTO alerts (
        type,
        severity,
        title,
        description,
        product_id,
        ticket_id,
        repair_center_id
      ) VALUES (
        'REPAIR_CENTER_UNDERPERFORMANCE',
        'HIGH',
        'Repair Center Over Capacity',
        'Repair center assigned to ticket #' || NEW.ticket_number || ' is over capacity (5+ active tickets). Consider reassigning or reviewing workload.',
        NEW.product_id,
        NEW.id,
        v_repair_center_id
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;
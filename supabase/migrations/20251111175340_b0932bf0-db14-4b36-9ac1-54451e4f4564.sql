-- Add repair_center_id to tickets table
ALTER TABLE tickets ADD COLUMN repair_center_id uuid REFERENCES repair_centers(id);

-- Create junction table for repair centers and products
CREATE TABLE repair_center_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_center_id uuid NOT NULL REFERENCES repair_centers(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(repair_center_id, product_id)
);

-- Enable RLS on repair_center_products
ALTER TABLE repair_center_products ENABLE ROW LEVEL SECURITY;

-- Anyone can view repair center product assignments
CREATE POLICY "Anyone can view repair center products"
ON repair_center_products FOR SELECT
USING (true);

-- Admins can manage repair center products
CREATE POLICY "Admins can manage repair center products"
ON repair_center_products FOR ALL
USING (has_role(auth.uid(), 'ADMIN'::app_role));

-- Create function to auto-assign repair center based on product
CREATE OR REPLACE FUNCTION assign_repair_center_to_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only assign when status changes to IN_REPAIR and no repair center is assigned
  IF NEW.status = 'IN_REPAIR' AND NEW.repair_center_id IS NULL THEN
    -- Find a repair center that handles this product
    SELECT rcp.repair_center_id INTO NEW.repair_center_id
    FROM repair_center_products rcp
    WHERE rcp.product_id = NEW.product_id
    LIMIT 1;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to auto-assign repair center
CREATE TRIGGER auto_assign_repair_center
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION assign_repair_center_to_ticket();
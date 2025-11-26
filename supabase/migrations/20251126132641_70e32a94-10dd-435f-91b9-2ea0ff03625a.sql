-- First, update the product_type enum to only have PHONE, LAPTOP, APPLIANCES
ALTER TYPE product_type RENAME TO product_type_old;
CREATE TYPE product_type AS ENUM ('PHONE', 'LAPTOP', 'APPLIANCES');

-- Update products table to use new enum
ALTER TABLE products ALTER COLUMN product_type TYPE product_type USING 
  CASE 
    WHEN product_type::text = 'PHONE' THEN 'PHONE'::product_type
    WHEN product_type::text = 'LAPTOP' THEN 'LAPTOP'::product_type
    ELSE 'APPLIANCES'::product_type
  END;

DROP TYPE product_type_old;

-- Clear ticket references to repair centers first
UPDATE tickets SET repair_center_id = NULL WHERE repair_center_id IS NOT NULL;

-- Clear existing repair center assignments
DELETE FROM repair_center_products;
DELETE FROM repair_centers;

-- Create 3 specialized repair centers with fixed IDs
INSERT INTO repair_centers (id, name, email, region, user_id) VALUES
  ('11111111-1111-1111-1111-111111111111', 'TechFix Laptop Center', 'laptop@repair.demo', 'North America', NULL),
  ('22222222-2222-2222-2222-222222222222', 'PhoneCare Repair Hub', 'phone@repair.demo', 'Europe', NULL),
  ('33333333-3333-3333-3333-333333333333', 'Appliance Masters', 'appliance@repair.demo', 'Asia Pacific', NULL);

-- Map repair centers to their specialized product types
INSERT INTO repair_center_products (repair_center_id, product_id)
SELECT '11111111-1111-1111-1111-111111111111', id FROM products WHERE product_type = 'LAPTOP';

INSERT INTO repair_center_products (repair_center_id, product_id)
SELECT '22222222-2222-2222-2222-222222222222', id FROM products WHERE product_type = 'PHONE';

INSERT INTO repair_center_products (repair_center_id, product_id)
SELECT '33333333-3333-3333-3333-333333333333', id FROM products WHERE product_type = 'APPLIANCES';
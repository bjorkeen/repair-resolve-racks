-- Add product_type enum
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_type') THEN
    CREATE TYPE product_type AS ENUM ('PHONE', 'LAPTOP', 'TABLET', 'TV');
  END IF;
END $$;

-- Add product_type column to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_type product_type;

-- Add new ticket statuses one by one
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SHIPPING' AND enumtypid = 'ticket_status'::regtype) THEN
    ALTER TYPE ticket_status ADD VALUE 'SHIPPING';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'PRODUCT_EVALUATION' AND enumtypid = 'ticket_status'::regtype) THEN
    ALTER TYPE ticket_status ADD VALUE 'PRODUCT_EVALUATION';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REPLACEMENT_INITIATED' AND enumtypid = 'ticket_status'::regtype) THEN
    ALTER TYPE ticket_status ADD VALUE 'REPLACEMENT_INITIATED';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'REPAIR_COMPLETED' AND enumtypid = 'ticket_status'::regtype) THEN
    ALTER TYPE ticket_status ADD VALUE 'REPAIR_COMPLETED';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SHIPPED_TO_CUSTOMER' AND enumtypid = 'ticket_status'::regtype) THEN
    ALTER TYPE ticket_status ADD VALUE 'SHIPPED_TO_CUSTOMER';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CLOSED' AND enumtypid = 'ticket_status'::regtype) THEN
    ALTER TYPE ticket_status ADD VALUE 'CLOSED';
  END IF;
END $$;
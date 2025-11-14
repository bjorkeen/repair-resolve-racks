-- First, add the new enum value separately
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'STAFF_MANAGER' 
    AND enumtypid = 'app_role'::regtype
  ) THEN
    ALTER TYPE app_role ADD VALUE 'STAFF_MANAGER';
  END IF;
END
$$;
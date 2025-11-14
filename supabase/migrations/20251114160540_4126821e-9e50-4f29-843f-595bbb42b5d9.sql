-- Create return_reason enum
CREATE TYPE public.return_reason AS ENUM ('WITHIN_15_DAYS', 'AFTER_15_DAYS');

-- Update ticket_type enum to include RETURN
ALTER TYPE public.ticket_type ADD VALUE IF NOT EXISTS 'RETURN';

-- Update ticket_status enum with new statuses
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'RETURN_REQUESTED';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'RETURN_APPROVED';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'RETURN_COMPLETED';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'REPLACEMENT_APPROVED';
ALTER TYPE public.ticket_status ADD VALUE IF NOT EXISTS 'REJECTED_OUT_OF_WARRANTY';

-- Add new columns to tickets table
ALTER TABLE public.tickets
ADD COLUMN return_reason return_reason,
ADD COLUMN photos JSONB,
ADD COLUMN decision_by_repair_center TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.tickets.photos IS 'Array of uploaded image URLs for faulty product evidence';
COMMENT ON COLUMN public.tickets.decision_by_repair_center IS 'Repair center decision: Repair or Replace';
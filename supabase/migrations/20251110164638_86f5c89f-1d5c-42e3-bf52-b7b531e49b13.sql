-- Create enum for ticket type
CREATE TYPE public.ticket_type AS ENUM ('REPAIR', 'RETURN');

-- Add ticket_type column to tickets table
ALTER TABLE public.tickets 
ADD COLUMN ticket_type public.ticket_type NOT NULL DEFAULT 'REPAIR';

-- Add comment for clarity
COMMENT ON COLUMN public.tickets.ticket_type IS 'Indicates whether the ticket is for a product repair or return request';
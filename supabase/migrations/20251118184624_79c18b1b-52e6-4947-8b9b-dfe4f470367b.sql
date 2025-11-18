-- Enable realtime for tickets table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;

-- Enable realtime for ticket_events table
ALTER PUBLICATION supabase_realtime ADD TABLE public.ticket_events;
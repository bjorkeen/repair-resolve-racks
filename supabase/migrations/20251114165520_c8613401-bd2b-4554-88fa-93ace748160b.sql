-- Create alert enums
CREATE TYPE alert_type AS ENUM (
  'HIGH_FAULT_RATE_PER_PRODUCT',
  'DELAYED_REPAIRS',
  'HIGH_RETURN_RATE',
  'REPAIR_CENTER_UNDERPERFORMANCE',
  'DUPLICATE_SERIAL_CLAIMS',
  'OUT_OF_WARRANTY_SPIKE'
);

CREATE TYPE alert_severity AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH'
);

CREATE TYPE alert_status AS ENUM (
  'OPEN',
  'ACKNOWLEDGED',
  'RESOLVED'
);

-- Create alerts table
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type alert_type NOT NULL,
  severity alert_severity DEFAULT 'MEDIUM' NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  product_id UUID REFERENCES products(id),
  repair_center_id UUID REFERENCES repair_centers(id),
  ticket_id UUID REFERENCES tickets(id),
  metric_value DECIMAL,
  threshold DECIMAL,
  status alert_status DEFAULT 'OPEN' NOT NULL,
  resolution_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create manager_settings table for thresholds
CREATE TABLE public.manager_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Seed default thresholds
INSERT INTO public.manager_settings (key, value) VALUES (
  'manager.config',
  '{
    "windows": {
      "faultRateDays": 30,
      "duplicateSerialDays": 7,
      "delayedRepairDays": 10,
      "outOfWarrantyDays": 7,
      "returnRateDays": 30
    },
    "thresholds": {
      "faultyRequestsPerProduct": 5,
      "repairCenterOverdueCount": 3,
      "repairCenterResolvedRatioMin": 0.7,
      "duplicateSerialCount": 2,
      "outOfWarrantySpikeCount": 10,
      "returnRatePercent": 0.10
    }
  }'::jsonb
);

-- Enable RLS
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for alerts
CREATE POLICY "Staff managers and admins can view alerts"
ON public.alerts FOR SELECT
USING (
  has_role(auth.uid(), 'STAFF_MANAGER') OR 
  has_role(auth.uid(), 'ADMIN')
);

CREATE POLICY "System can create alerts"
ON public.alerts FOR INSERT
WITH CHECK (true);

CREATE POLICY "Staff managers and admins can update alerts"
ON public.alerts FOR UPDATE
USING (
  has_role(auth.uid(), 'STAFF_MANAGER') OR 
  has_role(auth.uid(), 'ADMIN')
);

-- RLS Policies for manager_settings
CREATE POLICY "Staff managers and admins can view settings"
ON public.manager_settings FOR SELECT
USING (
  has_role(auth.uid(), 'STAFF_MANAGER') OR 
  has_role(auth.uid(), 'ADMIN')
);

CREATE POLICY "Only admins can update settings"
ON public.manager_settings FOR UPDATE
USING (has_role(auth.uid(), 'ADMIN'));

-- Trigger for updated_at on alerts
CREATE TRIGGER update_alerts_updated_at
BEFORE UPDATE ON public.alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on manager_settings
CREATE TRIGGER update_manager_settings_updated_at
BEFORE UPDATE ON public.manager_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
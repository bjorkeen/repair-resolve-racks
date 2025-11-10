-- Create user role enum
CREATE TYPE public.app_role AS ENUM ('CUSTOMER', 'STAFF', 'ADMIN');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'CUSTOMER',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create profiles table for additional user info
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  warranty_months INT NOT NULL DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create ticket status enum
CREATE TYPE public.ticket_status AS ENUM (
  'OPEN',
  'UNDER_REVIEW',
  'IN_REPAIR',
  'AWAITING_CUSTOMER',
  'RESOLVED',
  'REJECTED'
);

-- Create tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE RESTRICT NOT NULL,
  serial_number TEXT NOT NULL,
  purchase_date TIMESTAMPTZ,
  issue TEXT NOT NULL,
  status ticket_status NOT NULL DEFAULT 'OPEN',
  warranty_eligible BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create ticket events table
CREATE TABLE public.ticket_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create repair centers table
CREATE TABLE public.repair_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  region TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create warranty policies table
CREATE TABLE public.warranty_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  description TEXT NOT NULL,
  months INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warranty_policies ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Security definer function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Staff and admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'STAFF') OR public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for products (public read, staff/admin write)
CREATE POLICY "Anyone can view products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Staff can manage products"
  ON public.products FOR ALL
  USING (public.has_role(auth.uid(), 'STAFF') OR public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for tickets
CREATE POLICY "Customers can view their own tickets"
  ON public.tickets FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Staff and admins can view all tickets"
  ON public.tickets FOR SELECT
  USING (public.has_role(auth.uid(), 'STAFF') OR public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Authenticated users can create tickets"
  ON public.tickets FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Staff and admins can update tickets"
  ON public.tickets FOR UPDATE
  USING (public.has_role(auth.uid(), 'STAFF') OR public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for ticket events
CREATE POLICY "Users can view events for their tickets"
  ON public.ticket_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tickets
      WHERE tickets.id = ticket_events.ticket_id
      AND tickets.owner_id = auth.uid()
    )
  );

CREATE POLICY "Staff and admins can view all events"
  ON public.ticket_events FOR SELECT
  USING (public.has_role(auth.uid(), 'STAFF') OR public.has_role(auth.uid(), 'ADMIN'));

CREATE POLICY "Authenticated users can create events"
  ON public.ticket_events FOR INSERT
  WITH CHECK (auth.uid() = by_user_id);

-- RLS Policies for repair centers (public read)
CREATE POLICY "Anyone can view repair centers"
  ON public.repair_centers FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage repair centers"
  ON public.repair_centers FOR ALL
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- RLS Policies for warranty policies (public read)
CREATE POLICY "Anyone can view warranty policies"
  ON public.warranty_policies FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage warranty policies"
  ON public.warranty_policies FOR ALL
  USING (public.has_role(auth.uid(), 'ADMIN'));

-- Trigger to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  
  -- Insert into user_roles with default CUSTOMER role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'CUSTOMER');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at
  BEFORE UPDATE ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed data for products
INSERT INTO public.products (sku, name, warranty_months) VALUES
  ('TV-42-ULTRA', 'UltraView 42" Smart TV', 24),
  ('PHONE-A1', 'ElectroPhone A1', 12),
  ('LAPTOP-PRO', 'TechBook Pro 15"', 36),
  ('TABLET-X', 'ElectroTab X', 18);

-- Seed data for repair centers
INSERT INTO public.repair_centers (name, region, email) VALUES
  ('Electronics RC North', 'North', 'rc-north@electronics.test'),
  ('Electronics RC South', 'South', 'rc-south@electronics.test'),
  ('Electronics RC East', 'East', 'rc-east@electronics.test'),
  ('Electronics RC West', 'West', 'rc-west@electronics.test');

-- Seed data for warranty policies
INSERT INTO public.warranty_policies (description, months) VALUES
  ('Standard 24 months warranty', 24),
  ('Basic 12 months warranty', 12),
  ('Extended 36 months warranty', 36),
  ('Premium 48 months warranty', 48);
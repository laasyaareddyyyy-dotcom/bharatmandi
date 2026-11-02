-- ==============================================================================
-- BHARAT MANDI - SUPABASE POSTGRESQL SCHEMA & POLICIES
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Merchants Table
CREATE TABLE IF NOT EXISTS public.merchants (
  id TEXT PRIMARY KEY,
  merchant_id TEXT NOT NULL UNIQUE,
  owner_uid TEXT NOT NULL,
  shop_name TEXT NOT NULL,
  shop_number TEXT,
  mandi_market_name TEXT,
  owner_name TEXT,
  phone_number TEXT NOT NULL,
  default_commission_percent NUMERIC DEFAULT 5.0,
  hamali_rate_per_box NUMERIC DEFAULT 10.0,
  cash_balance NUMERIC DEFAULT 0,
  bank_balance NUMERIC DEFAULT 0,
  upi_id TEXT,
  address TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_merchants_owner_uid ON public.merchants(owner_uid);
CREATE INDEX IF NOT EXISTS idx_merchants_phone ON public.merchants(phone_number);

-- 2. Farmers Table
CREATE TABLE IF NOT EXISTS public.farmers (
  id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  village TEXT,
  primary_crops JSONB DEFAULT '[]'::jsonb,
  total_business NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  payment_preference TEXT DEFAULT 'cash',
  bank_details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_farmers_owner_uid ON public.farmers(owner_uid);
CREATE INDEX IF NOT EXISTS idx_farmers_phone ON public.farmers(phone);

-- 3. Sale Lots (Parchis / Consignment Transactions)
CREATE TABLE IF NOT EXISTS public.lots (
  id TEXT PRIMARY KEY,
  parchi_number TEXT,
  owner_uid TEXT NOT NULL,
  farmer_id TEXT,
  farmer_name TEXT NOT NULL,
  farmer_phone TEXT,
  farmer_village TEXT,
  commodity_category TEXT DEFAULT 'flowers',
  flower_variety TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT DEFAULT 'boxes',
  rate NUMERIC NOT NULL,
  gross_total NUMERIC NOT NULL,
  commission_percent NUMERIC DEFAULT 5.0,
  commission_amount NUMERIC DEFAULT 0,
  boxes_count NUMERIC DEFAULT 1,
  hamali_per_box NUMERIC DEFAULT 0,
  hamali_amount NUMERIC DEFAULT 0,
  transport_deduction NUMERIC DEFAULT 0,
  net_payable NUMERIC NOT NULL,
  farmer_net_payable NUMERIC NOT NULL,
  payment_status TEXT DEFAULT 'Unpaid',
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  date TEXT NOT NULL,
  time TEXT,
  shipment_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lots_owner_uid ON public.lots(owner_uid);
CREATE INDEX IF NOT EXISTS idx_lots_farmer_id ON public.lots(farmer_id);
CREATE INDEX IF NOT EXISTS idx_lots_parchi_number ON public.lots(parchi_number);

-- 4. Shipments Table (Consolidated Arrivals)
CREATE TABLE IF NOT EXISTS public.shipments (
  id TEXT PRIMARY KEY,
  shipment_number TEXT,
  owner_uid TEXT NOT NULL,
  farmer_id TEXT,
  farmer_name TEXT NOT NULL,
  farmer_phone TEXT,
  farmer_village TEXT,
  total_boxes NUMERIC DEFAULT 0,
  transport_expense NUMERIC DEFAULT 0,
  hamali_expense NUMERIC DEFAULT 0,
  total_quantity NUMERIC DEFAULT 0,
  gross_total NUMERIC NOT NULL,
  farmer_net_payable NUMERIC NOT NULL,
  payment_status TEXT DEFAULT 'Unpaid',
  amount_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  variety_rows JSONB DEFAULT '[]'::jsonb,
  date TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_shipments_owner_uid ON public.shipments(owner_uid);

-- 5. Payments Table (Settlements & Payout Vouchers)
CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL,
  farmer_id TEXT NOT NULL,
  farmer_name TEXT,
  amount NUMERIC NOT NULL,
  payment_mode TEXT DEFAULT 'Cash',
  reference_number TEXT,
  date TEXT NOT NULL,
  time TEXT,
  notes TEXT,
  receipt_number TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_owner_uid ON public.payments(owner_uid);
CREATE INDEX IF NOT EXISTS idx_payments_farmer_id ON public.payments(farmer_id);

-- 6. Settlements Table (15-Day Finalized Statements)
CREATE TABLE IF NOT EXISTS public.settlements (
  id TEXT PRIMARY KEY,
  owner_uid TEXT NOT NULL,
  farmer_id TEXT NOT NULL,
  farmer_name TEXT,
  period_start TEXT NOT NULL,
  period_end TEXT NOT NULL,
  total_sales NUMERIC DEFAULT 0,
  net_payable NUMERIC NOT NULL,
  total_paid NUMERIC DEFAULT 0,
  closing_balance NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_settlements_owner_uid ON public.settlements(owner_uid);

-- 7. Help Tickets Table
CREATE TABLE IF NOT EXISTS public.help_tickets (
  id TEXT PRIMARY KEY,
  author_uid TEXT NOT NULL,
  ticket_number TEXT,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT DEFAULT 'Medium',
  status TEXT DEFAULT 'Open',
  description TEXT NOT NULL,
  user_name TEXT,
  user_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_help_tickets_author_uid ON public.help_tickets(author_uid);

-- 8. Registered Accounts Table (Duplicate Mobile Validation)
CREATE TABLE IF NOT EXISTS public.accounts (
  id TEXT PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  user_uid TEXT,
  shop_or_village TEXT,
  market_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_accounts_phone ON public.accounts(phone_number);

-- 9. User Sessions Table (Single Device Multi-tenant Isolation)
CREATE TABLE IF NOT EXISTS public.user_sessions (
  phone_number TEXT PRIMARY KEY,
  current_session_id TEXT NOT NULL,
  user_agent TEXT,
  last_login_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Permissive policies for anon key / authenticated clients
CREATE POLICY "Allow all operations for anon and users on merchants" ON public.merchants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon and users on farmers" ON public.farmers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon and users on lots" ON public.lots FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon and users on shipments" ON public.shipments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon and users on payments" ON public.payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon and users on settlements" ON public.settlements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon and users on help_tickets" ON public.help_tickets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon and users on accounts" ON public.accounts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon and users on user_sessions" ON public.user_sessions FOR ALL USING (true) WITH CHECK (true);

-- Enable Supabase Realtime for user_sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;

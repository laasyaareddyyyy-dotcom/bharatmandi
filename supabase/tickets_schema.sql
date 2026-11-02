-- =========================================================================
-- Supabase SQL Schema for Support Ticket System with RLS & Realtime
-- =========================================================================

-- 1. Create tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID DEFAULT auth.uid(),
  shop_name TEXT NOT NULL DEFAULT '',
  user_name TEXT NOT NULL DEFAULT '',
  user_phone TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'General',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'normal', 'high')),
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  admin_note TEXT NOT NULL DEFAULT ''
);

-- 2. Create index on user_phone and status for fast lookups
CREATE INDEX IF NOT EXISTS idx_tickets_user_phone ON public.tickets (user_phone);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets (status);

-- 3. Create helper function to check if authenticated user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    COALESCE(auth.jwt() ->> 'phone', '') = '+919110387978' OR
    COALESCE(auth.jwt() ->> 'phone', '') = '919110387978' OR
    COALESCE(auth.jwt() ->> 'phone', '') = '9110387978'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if needed to prevent duplicates
DROP POLICY IF EXISTS "Any logged-in user can insert their own tickets" ON public.tickets;
DROP POLICY IF EXISTS "Users can read own tickets or admin can read all" ON public.tickets;
DROP POLICY IF EXISTS "Admin can update all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Admin can delete all tickets" ON public.tickets;

-- 6. Insert Policy: Logged-in users can create open tickets
CREATE POLICY "Any logged-in user can insert their own tickets"
ON public.tickets FOR INSERT
WITH CHECK (
  status = 'open'
);

-- 7. Select Policy: Logged-in users read their own tickets, admin reads all
CREATE POLICY "Users can read own tickets or admin can read all"
ON public.tickets FOR SELECT
USING (
  user_id = auth.uid() OR
  user_phone = COALESCE(auth.jwt() ->> 'phone', '') OR
  public.is_admin()
);

-- 8. Update Policy: Only admin (phone 919110387978) can update tickets
CREATE POLICY "Admin can update all tickets"
ON public.tickets FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- 9. Delete Policy: Only admin (phone 919110387978) can delete tickets
CREATE POLICY "Admin can delete all tickets"
ON public.tickets FOR DELETE
USING (public.is_admin());

-- 10. Enable Supabase Realtime publication on tickets table
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;

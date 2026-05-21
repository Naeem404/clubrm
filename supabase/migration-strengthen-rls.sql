-- =========================================================================================
-- ClubRM - Strengthen Row Level Security Policies
-- This migration strengthens RLS policies to prevent unauthorized access
-- =========================================================================================

-- DROP INSECURE DOCUMENTS POLICIES
DROP POLICY IF EXISTS "Authenticated users can insert documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON public.documents;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON public.documents;

-- DROP INSECURE ORG SETTINGS POLICIES
DROP POLICY IF EXISTS "Authenticated users can insert org settings" ON public.org_settings;
DROP POLICY IF EXISTS "Authenticated users can update org settings" ON public.org_settings;

-- =========================================================================================
-- CREATE SECURE JWT-CLAIM RLS POLICIES FOR DOCUMENTS
-- =========================================================================================

-- Only President and VP roles can insert documents
CREATE POLICY "Executives can insert documents" ON public.documents 
FOR INSERT WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('President', 'Administrator', 'VP Internal', 'VP Finance', 'VP Events', 'VP External', 'Marketing')
);

-- Users can view documents
CREATE POLICY "Authenticated users can view documents" ON public.documents 
FOR SELECT USING (auth.role() = 'authenticated');

-- Only President and Administrator can update documents
CREATE POLICY "Executives can update documents" ON public.documents 
FOR UPDATE USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('President', 'Administrator')
);

-- Only President and Administrator can delete documents
CREATE POLICY "Executives can delete documents" ON public.documents 
FOR DELETE USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('President', 'Administrator')
);

-- =========================================================================================
-- CREATE SECURE JWT-CLAIM RLS POLICIES FOR ORG SETTINGS
-- =========================================================================================

-- Only President and Administrator can insert org settings
CREATE POLICY "Executives can insert org settings" ON public.org_settings 
FOR INSERT WITH CHECK (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('President', 'Administrator')
);

-- Authenticated users can view org settings
CREATE POLICY "Authenticated users can view org settings" ON public.org_settings 
FOR SELECT USING (auth.role() = 'authenticated');

-- Only President and Administrator can update org settings
CREATE POLICY "Executives can update org settings" ON public.org_settings 
FOR UPDATE USING (
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('President', 'Administrator')
);

-- =========================================================================================
-- ADD MULTI-TENANCY FILTERING FOR TABLES WITH organization_id
-- =========================================================================================

-- EXPENSES - Add organization_id filtering to existing policies
ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_organization_id_check;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS organization_id uuid;

-- Enable RLS on expenses if not already enabled
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Create policy to filter by organization_id
CREATE POLICY "Users can view own organization expenses" ON public.expenses
FOR SELECT USING (
  organization_id IS NULL OR 
  organization_id = (auth.jwt() ->> 'organization_id')::uuid OR
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('President', 'Administrator')
);

-- TASKS - Add organization_id filtering
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_organization_id_check;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization tasks" ON public.tasks
FOR SELECT USING (
  organization_id IS NULL OR 
  organization_id = (auth.jwt() ->> 'organization_id')::uuid OR
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('President', 'Administrator')
);

-- EVENTS - Add organization_id filtering
ALTER TABLE public.events DROP CONSTRAINT IF EXISTS events_organization_id_check;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization events" ON public.events
FOR SELECT USING (
  organization_id IS NULL OR 
  organization_id = (auth.jwt() ->> 'organization_id')::uuid OR
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('President', 'Administrator')
);

-- MEMBERS - Add organization_id filtering
ALTER TABLE public.members DROP CONSTRAINT IF EXISTS members_organization_id_check;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization members" ON public.members
FOR SELECT USING (
  organization_id IS NULL OR 
  organization_id = (auth.jwt() ->> 'organization_id')::uuid OR
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('President', 'Administrator')
);

-- SPONSORS - Add organization_id filtering
ALTER TABLE public.sponsors DROP CONSTRAINT IF EXISTS sponsors_organization_id_check;
ALTER TABLE public.sponsors ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization sponsors" ON public.sponsors
FOR SELECT USING (
  organization_id IS NULL OR 
  organization_id = (auth.jwt() ->> 'organization_id')::uuid OR
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('President', 'Administrator')
);

-- CAMPAIGNS - Add organization_id filtering
ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_organization_id_check;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS organization_id uuid;

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own organization campaigns" ON public.campaigns
FOR SELECT USING (
  organization_id IS NULL OR 
  organization_id = (auth.jwt() ->> 'organization_id')::uuid OR
  (auth.jwt() -> 'app_metadata' ->> 'role') IN ('President', 'Administrator')
);

-- =========================================================================================
-- End Strengthen RLS Migration
-- =========================================================================================

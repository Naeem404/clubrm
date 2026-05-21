-- =========================================================================================
-- ClubRM - Implementation of Strong Row-Level Security via JWT Claims
-- Rationale (Cognitive Mapping): 
-- Trust cannot exist on the client (frontend JS). To prevent malicious PostgREST calls,
-- we enforce a cryptographic pledge directly in PostgreSQL. Any change to 'role' in 
-- public.profiles now updates auth.users.raw_app_meta_data and binds to the JWT.
-- =========================================================================================

-- 1. Create a secure function to sync public.profiles role into auth.users app_metadata
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_jwt()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE auth.users
    SET raw_app_meta_data = 
        jsonb_set(
            COALESCE(raw_app_meta_data, '{}'::jsonb),
            '{role}',
            to_jsonb(NEW.role)
        )
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Bind the trigger to update whenever public.profiles.role changes
DROP TRIGGER IF EXISTS on_profile_role_change ON public.profiles;
CREATE TRIGGER on_profile_role_change
AFTER UPDATE OF role ON public.profiles
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION public.sync_profile_role_to_jwt();

-- 3. Also run sync during initial INSERT to ensure parity
DROP TRIGGER IF EXISTS on_profile_insert_sync_role ON public.profiles;
CREATE TRIGGER on_profile_insert_sync_role
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_role_to_jwt();


-- =========================================================================================
-- DROP INSECURE FINANCE POLICIES
-- =========================================================================================
DROP POLICY IF EXISTS "Authenticated users can insert expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can update expenses" ON public.expenses;
DROP POLICY IF EXISTS "Authenticated users can delete expenses" ON public.expenses;

DROP POLICY IF EXISTS "Authenticated users can insert income" ON public.income;
DROP POLICY IF EXISTS "Authenticated users can update income" ON public.income;
DROP POLICY IF EXISTS "Authenticated users can delete income" ON public.income;

DROP POLICY IF EXISTS "Authenticated users can insert reimbursements" ON public.reimbursements;
DROP POLICY IF EXISTS "Authenticated users can update reimbursements" ON public.reimbursements;
DROP POLICY IF EXISTS "Authenticated users can delete reimbursements" ON public.reimbursements;

DROP POLICY IF EXISTS "Authenticated users can insert budgets" ON public.budgets;
DROP POLICY IF EXISTS "Authenticated users can update budgets" ON public.budgets;
DROP POLICY IF EXISTS "Authenticated users can delete budgets" ON public.budgets;

-- =========================================================================================
-- CREATE SECURE JWT-CLAIM RLS POLICIES FOR FINANCE (President Only)
-- =========================================================================================

-- EXPENSES
CREATE POLICY "President can insert expenses" ON public.expenses 
FOR INSERT WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'President');

CREATE POLICY "President can update expenses" ON public.expenses 
FOR UPDATE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'President');

CREATE POLICY "President can delete expenses" ON public.expenses 
FOR DELETE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'President');

-- INCOME
CREATE POLICY "President can insert income" ON public.income 
FOR INSERT WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'President');

CREATE POLICY "President can update income" ON public.income 
FOR UPDATE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'President');

CREATE POLICY "President can delete income" ON public.income 
FOR DELETE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'President');

-- REIMBURSEMENTS
CREATE POLICY "President can insert reimbursements" ON public.reimbursements 
FOR INSERT WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'President');

CREATE POLICY "President can update reimbursements" ON public.reimbursements 
FOR UPDATE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'President');

CREATE POLICY "President can delete reimbursements" ON public.reimbursements 
FOR DELETE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'President');

-- BUDGETS
CREATE POLICY "President can insert budgets" ON public.budgets 
FOR INSERT WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'President');

CREATE POLICY "President can update budgets" ON public.budgets 
FOR UPDATE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'President');

CREATE POLICY "President can delete budgets" ON public.budgets 
FOR DELETE USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'President');

-- =========================================================================================
-- End RLS Migration
-- =========================================================================================

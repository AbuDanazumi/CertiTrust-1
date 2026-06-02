-- 1. Add organization to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'organization';

-- 2. Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  phone text,
  address text,
  notification_email text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 3. Add organization_id to profiles + verification_events
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS organization_id uuid;
ALTER TABLE public.verification_events ADD COLUMN IF NOT EXISTS organization_id uuid;

-- 4. Helper: lookup user's organization
CREATE OR REPLACE FUNCTION public.user_organization_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT organization_id FROM public.profiles WHERE user_id = _user_id LIMIT 1
$$;

-- 5. RLS: organizations
CREATE POLICY "Org members can view their own organization"
ON public.organizations FOR SELECT TO authenticated
USING (id = public.user_organization_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Org members can update their own organization"
ON public.organizations FOR UPDATE TO authenticated
USING (id = public.user_organization_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (id = public.user_organization_id(auth.uid()) OR public.has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Anyone authenticated can create an organization"
ON public.organizations FOR INSERT TO authenticated
WITH CHECK (true);

-- 6. RLS: organization view of verification_events
CREATE POLICY "Org members can view their verification events"
ON public.verification_events FOR SELECT TO authenticated
USING (organization_id = public.user_organization_id(auth.uid()));

-- 7. updated_at trigger on organizations
CREATE TRIGGER set_organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Bootstrap function for new org signups
CREATE OR REPLACE FUNCTION public.bootstrap_demo_org_access(_org_name text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_org uuid;
  v_email text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT organization_id INTO v_org FROM public.profiles WHERE user_id = v_user;
  IF v_org IS NOT NULL THEN
    RETURN v_org;
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE user_id = v_user;

  INSERT INTO public.organizations (name, email)
  VALUES (COALESCE(NULLIF(_org_name, ''), 'My Organization'), v_email)
  RETURNING id INTO v_org;

  UPDATE public.profiles SET organization_id = v_org WHERE user_id = v_user;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user, 'organization'::app_role)
  ON CONFLICT DO NOTHING;

  RETURN v_org;
END;
$$;
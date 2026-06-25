-- 1. Ensure exactly one role per auth user by adding unique constraint on user_roles.user_id
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_role_institution_id_key;
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);

-- 2. Redefine security functions using LANGUAGE plpgsql with SECURITY DEFINER to prevent inlining and recursion.
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.has_institution_role(_user_id UUID, _institution_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
      AND (institution_id = _institution_id OR institution_id IS NULL)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.user_institution_id(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT institution_id INTO v_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1;
  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.user_organization_id(_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  SELECT organization_id INTO v_id
  FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1;
  RETURN v_id;
END;
$$;

-- 3. Create modular, idempotent onboarding sub-functions.

-- A. Create profile helper
CREATE OR REPLACE FUNCTION public.create_profile(
  v_user_id UUID,
  v_display_name TEXT,
  v_email TEXT,
  v_account_type TEXT,
  v_org_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id,
    display_name,
    email,
    account_type,
    organization_name
  )
  VALUES (
    v_user_id,
    v_display_name,
    v_email,
    v_account_type,
    v_org_name
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    display_name = COALESCE(v_display_name, public.profiles.display_name),
    email = COALESCE(v_email, public.profiles.email),
    account_type = COALESCE(v_account_type, public.profiles.account_type),
    organization_name = COALESCE(v_org_name, public.profiles.organization_name);
END;
$$;

-- B. Create tenant helper
CREATE OR REPLACE FUNCTION public.create_institution_or_organization(
  v_user_id UUID,
  v_account_type TEXT,
  v_payload JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_name TEXT;
  v_email TEXT;
  v_code TEXT;
BEGIN
  IF v_account_type = 'institution' THEN
    v_name := COALESCE(NULLIF(trim(v_payload ->> 'institution_name'), ''), 'My Institution');
    v_email := COALESCE(NULLIF(trim(v_payload ->> 'email'), ''), (SELECT email FROM auth.users WHERE id = v_user_id));
    v_code := 'INST-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    -- Check if institution already exists for this email
    SELECT id INTO v_tenant_id FROM public.institutions WHERE email = v_email LIMIT 1;
    
    IF v_tenant_id IS NULL THEN
      INSERT INTO public.institutions (
        name, code, email, phone, website_url, country, institution_type,
        address, city, state_province, logo_url, status, is_active, verification_enabled
      )
      VALUES (
        v_name,
        v_code,
        v_email,
        NULLIF(trim(v_payload ->> 'phone'), ''),
        NULLIF(trim(v_payload ->> 'website'), ''),
        COALESCE(NULLIF(trim(v_payload ->> 'country'), ''), 'US'),
        NULLIF(trim(v_payload ->> 'institution_type'), ''),
        COALESCE(NULLIF(trim(v_payload ->> 'address'), ''), 'Onboarding Address'),
        COALESCE(NULLIF(trim(v_payload ->> 'city'), ''), 'Onboarding City'),
        NULLIF(trim(v_payload ->> 'state_province'), ''),
        NULLIF(trim(v_payload ->> 'logo_url'), ''),
        'pending'::public.org_status,
        false,
        false
      )
      RETURNING id INTO v_tenant_id;
    ELSE
      -- Update existing institution
      UPDATE public.institutions
      SET
        name = COALESCE(NULLIF(trim(v_payload ->> 'institution_name'), ''), name),
        phone = COALESCE(NULLIF(trim(v_payload ->> 'phone'), ''), phone),
        website_url = COALESCE(NULLIF(trim(v_payload ->> 'website'), ''), website_url),
        country = COALESCE(NULLIF(trim(v_payload ->> 'country'), ''), country),
        institution_type = COALESCE(NULLIF(trim(v_payload ->> 'institution_type'), ''), institution_type),
        address = COALESCE(NULLIF(trim(v_payload ->> 'address'), ''), address),
        city = COALESCE(NULLIF(trim(v_payload ->> 'city'), ''), city),
        state_province = COALESCE(NULLIF(trim(v_payload ->> 'state_province'), ''), state_province),
        logo_url = COALESCE(NULLIF(trim(v_payload ->> 'logo_url'), ''), logo_url)
      WHERE id = v_tenant_id;
    END IF;

  ELSIF v_account_type = 'organization' THEN
    v_name := COALESCE(NULLIF(trim(v_payload ->> 'organization_name'), ''), 'My Organization');
    v_email := COALESCE(NULLIF(trim(v_payload ->> 'email'), ''), (SELECT email FROM auth.users WHERE id = v_user_id));

    -- Check if organization already exists for this email
    SELECT id INTO v_tenant_id FROM public.organizations WHERE email = v_email LIMIT 1;

    IF v_tenant_id IS NULL THEN
      INSERT INTO public.organizations (
        name, email, phone, website, country, industry, org_type,
        contact_person_name, contact_person_role, logo_url, status, is_active
      )
      VALUES (
        v_name,
        v_email,
        NULLIF(trim(v_payload ->> 'phone'), ''),
        NULLIF(trim(v_payload ->> 'website'), ''),
        COALESCE(NULLIF(trim(v_payload ->> 'country'), ''), 'US'),
        COALESCE(NULLIF(trim(v_payload ->> 'industry'), ''), 'Other'),
        'Company',
        NULLIF(trim(v_payload ->> 'contact_person_name'), ''),
        NULLIF(trim(v_payload ->> 'contact_person_role'), ''),
        NULLIF(trim(v_payload ->> 'logo_url'), ''),
        'pending'::public.org_status,
        false
      )
      RETURNING id INTO v_tenant_id;
    ELSE
      -- Update existing organization
      UPDATE public.organizations
      SET
        name = COALESCE(NULLIF(trim(v_payload ->> 'organization_name'), ''), name),
        phone = COALESCE(NULLIF(trim(v_payload ->> 'phone'), ''), phone),
        website = COALESCE(NULLIF(trim(v_payload ->> 'website'), ''), website),
        country = COALESCE(NULLIF(trim(v_payload ->> 'country'), ''), country),
        industry = COALESCE(NULLIF(trim(v_payload ->> 'industry'), ''), industry),
        contact_person_name = COALESCE(NULLIF(trim(v_payload ->> 'contact_person_name'), ''), contact_person_name),
        contact_person_role = COALESCE(NULLIF(trim(v_payload ->> 'contact_person_role'), ''), contact_person_role),
        logo_url = COALESCE(NULLIF(trim(v_payload ->> 'logo_url'), ''), logo_url)
      WHERE id = v_tenant_id;
    END IF;
  END IF;

  RETURN v_tenant_id;
END;
$$;

-- C. Assign role helper
CREATE OR REPLACE FUNCTION public.assign_role(
  v_user_id UUID,
  v_role public.app_role,
  v_tenant_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF v_role = 'staff'::app_role THEN
    INSERT INTO public.user_roles (user_id, role, institution_id)
    VALUES (v_user_id, v_role, v_tenant_id)
    ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role, institution_id = EXCLUDED.institution_id;
  ELSE
    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, v_role)
    ON CONFLICT (user_id) DO UPDATE
    SET role = EXCLUDED.role, institution_id = NULL;
  END IF;
END;
$$;

-- D. Complete onboarding wrapper
CREATE OR REPLACE FUNCTION public.complete_onboarding(
  v_user_id UUID,
  v_account_type TEXT,
  v_payload JSONB
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
  v_role public.app_role;
BEGIN
  -- Create/update institution or organization
  v_tenant_id := public.create_institution_or_organization(v_user_id, v_account_type, v_payload);

  -- Link tenant ID to profile and update basic profile info
  IF v_account_type = 'institution' THEN
    UPDATE public.profiles
    SET institution_id = v_tenant_id,
        display_name = COALESCE(NULLIF(trim(v_payload ->> 'contact_name'), ''), display_name),
        account_type = 'institution'
    WHERE user_id = v_user_id;
    
    v_role := 'staff'::app_role;
  ELSIF v_account_type = 'organization' THEN
    UPDATE public.profiles
    SET organization_id = v_tenant_id,
        organization_name = COALESCE(NULLIF(trim(v_payload ->> 'organization_name'), ''), organization_name),
        display_name = COALESCE(NULLIF(trim(v_payload ->> 'contact_person_name'), ''), display_name),
        account_type = 'organization'
    WHERE user_id = v_user_id;

    v_role := 'organization'::app_role;
  END IF;

  -- Assign/update role
  PERFORM public.assign_role(v_user_id, v_role, v_tenant_id);
END;
$$;

-- E. Modularized handle_new_user trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account_type text;
  v_display_name text;
  v_org_name text;
  v_payload jsonb;
BEGIN
  -- Extract basic metadata
  v_account_type := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'account_type', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'intended_role', ''),
    'institution'
  );
  v_display_name := COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.raw_user_meta_data ->> 'full_name');
  v_org_name := NEW.raw_user_meta_data ->> 'organization_name';
  v_payload := NEW.raw_user_meta_data -> 'onboarding_payload';

  -- Create profile first
  PERFORM public.create_profile(NEW.id, v_display_name, NEW.email, v_account_type, v_org_name);

  -- Process onboarding payload if present
  IF v_payload IS NOT NULL AND v_payload <> 'null'::jsonb THEN
    PERFORM public.complete_onboarding(NEW.id, v_account_type, v_payload);
  END IF;

  RETURN NEW;
END;
$$;

-- F. Redefining onboarding RPC endpoints to reuse the clean, transaction-safe complete_onboarding helper.
CREATE OR REPLACE FUNCTION public.register_institution_onboarding(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_inst_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM set_config('app.allow_tenant_profile_write', 'true', true);
  PERFORM set_config('app.allow_institution_admin_write', 'true', true);

  -- Execute complete onboarding transaction
  PERFORM public.complete_onboarding(v_user, 'institution', _payload);

  SELECT institution_id INTO v_inst_id FROM public.profiles WHERE user_id = v_user;
  RETURN v_inst_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_organization_onboarding(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_org_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM set_config('app.allow_tenant_profile_write', 'true', true);

  -- Execute complete onboarding transaction
  PERFORM public.complete_onboarding(v_user, 'organization', _payload);

  SELECT organization_id INTO v_org_id FROM public.profiles WHERE user_id = v_user;
  RETURN v_org_id;
END;
$$;

-- 4. public.check_onboarding_status() helper to support public duplicate registration audit/recovery
CREATE OR REPLACE FUNCTION public.check_onboarding_status(_email text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_profile_exists boolean;
  v_role_exists boolean;
  v_tenant_exists boolean;
  v_account_type text;
BEGIN
  -- Check user in auth.users
  SELECT id INTO v_user_id FROM auth.users WHERE email = _email LIMIT 1;
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('exists', false);
  END IF;

  -- Check profile
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = v_user_id) INTO v_profile_exists;
  
  -- Check role
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = v_user_id) INTO v_role_exists;
  
  -- Check tenant based on account_type
  SELECT account_type INTO v_account_type FROM public.profiles WHERE user_id = v_user_id;
  
  IF v_account_type = 'institution' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles p 
      JOIN public.institutions i ON p.institution_id = i.id 
      WHERE p.user_id = v_user_id
    ) INTO v_tenant_exists;
  ELSIF v_account_type = 'organization' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.profiles p 
      JOIN public.organizations o ON p.organization_id = o.id 
      WHERE p.user_id = v_user_id
    ) INTO v_tenant_exists;
  ELSE
    v_tenant_exists := false;
  END IF;

  RETURN jsonb_build_object(
    'exists', true,
    'profile_exists', v_profile_exists,
    'role_exists', v_role_exists,
    'tenant_exists', COALESCE(v_tenant_exists, false),
    'account_type', v_account_type,
    'incomplete', NOT (COALESCE(v_profile_exists, false) AND COALESCE(v_role_exists, false) AND COALESCE(v_tenant_exists, false))
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_onboarding_status(text) TO anon;
GRANT EXECUTE ON FUNCTION public.check_onboarding_status(text) TO authenticated;

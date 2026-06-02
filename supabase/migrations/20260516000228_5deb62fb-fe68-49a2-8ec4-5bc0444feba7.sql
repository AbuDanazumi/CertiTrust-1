
CREATE OR REPLACE FUNCTION public.bootstrap_demo_staff_access()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_inst uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT id INTO v_inst FROM public.institutions WHERE is_active = true ORDER BY created_at LIMIT 1;
  IF v_inst IS NULL THEN
    RAISE EXCEPTION 'No institution available';
  END IF;

  UPDATE public.profiles SET institution_id = v_inst WHERE user_id = v_user AND institution_id IS NULL;

  INSERT INTO public.user_roles (user_id, role, institution_id)
  VALUES (v_user, 'staff'::app_role, v_inst)
  ON CONFLICT DO NOTHING;

  RETURN v_inst;
END;
$$;

GRANT EXECUTE ON FUNCTION public.bootstrap_demo_staff_access() TO authenticated;

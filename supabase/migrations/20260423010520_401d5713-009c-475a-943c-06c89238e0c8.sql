DROP POLICY IF EXISTS "Anyone can create verification events" ON public.verification_events;

CREATE POLICY "Anyone can create constrained verification events"
ON public.verification_events
FOR INSERT
WITH CHECK (
  result IN ('authentic', 'invalid', 'revoked', 'suspended', 'tampered')
  AND char_length(search_method) BETWEEN 1 AND 64
  AND (certificate_identifier IS NULL OR char_length(certificate_identifier) <= 128)
  AND (verifier_name IS NULL OR char_length(verifier_name) <= 120)
  AND (verifier_email IS NULL OR char_length(verifier_email) <= 255)
  AND (organization IS NULL OR char_length(organization) <= 180)
);
-- STAGING ONLY: operator-approved 90-day non-converted B2B lead retention.
-- Requires 20261016_private_intake.sql to have run first in disposable PG17.
-- No scheduled production purge, no live Supabase mutation.
BEGIN;

-- Only legal obligations or an active dispute may justify an explicit,
-- expiring exception. No applicant can set these values via accept_inquiry.
ALTER TABLE kaftan_intake.partner_inquiries
  ADD COLUMN IF NOT EXISTS retention_hold_until timestamptz,
  ADD COLUMN IF NOT EXISTS retention_hold_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'partner_inquiries_retention_hold_pair'
      AND conrelid = 'kaftan_intake.partner_inquiries'::regclass
  ) THEN
    ALTER TABLE kaftan_intake.partner_inquiries
      ADD CONSTRAINT partner_inquiries_retention_hold_pair CHECK (
        (retention_hold_until IS NULL AND retention_hold_reason IS NULL)
        OR (retention_hold_until IS NOT NULL
            AND retention_hold_reason IS NOT NULL
            AND retention_hold_reason IN ('legal_obligation','active_dispute')
            AND isfinite(retention_hold_until)
            AND retention_hold_until > created_at)
      );
  END IF;
END $$;

-- Aggregated audit, intentionally without a lead ID, name, email, token,
-- idempotency key, or other applicant-identifying information.
CREATE TABLE IF NOT EXISTS kaftan_intake.retention_purge_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  policy_days integer NOT NULL DEFAULT 90 CHECK (policy_days = 90),
  deleted_count integer NOT NULL CHECK (deleted_count BETWEEN 0 AND 100)
);
ALTER TABLE kaftan_intake.retention_purge_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON kaftan_intake.retention_purge_runs FROM PUBLIC, anon, authenticated;

CREATE INDEX IF NOT EXISTS partner_inquiries_unsigned_retention_due
  ON kaftan_intake.partner_inquiries (created_at, id)
  WHERE status IN ('new','contacted','qualified','rejected');

-- The safe default is preview. Execution must be deliberately requested
-- by an authenticated server-only job using service_role. Status and time
-- predicates are rechecked during the DELETE. SKIP LOCKED prevents deleting
-- a row undergoing concurrent sales/partner status review.
CREATE OR REPLACE FUNCTION kaftan_intake.purge_expired_inquiries(
  p_batch_limit integer,
  p_execute boolean DEFAULT false
)
RETURNS TABLE(eligible_count integer, deleted_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  v_cutoff timestamptz := transaction_timestamp() - interval '90 days';
  v_now timestamptz := transaction_timestamp();
  v_eligible integer := 0;
  v_deleted integer := 0;
BEGIN
  IF p_batch_limit IS NULL OR p_batch_limit NOT BETWEEN 1 AND 100
     OR p_execute IS NULL THEN
    RAISE EXCEPTION 'invalid_retention_request' USING ERRCODE = '22023';
  END IF;

  IF NOT p_execute THEN
    SELECT count(*)::integer INTO v_eligible FROM (
      SELECT id FROM kaftan_intake.partner_inquiries
      WHERE created_at <= v_cutoff
        AND status IN ('new','contacted','qualified','rejected')
        AND (retention_hold_until IS NULL OR retention_hold_until <= v_now)
      ORDER BY created_at, id
      LIMIT p_batch_limit
    ) candidates;
    RETURN QUERY SELECT v_eligible, 0;
    RETURN;
  END IF;

  WITH candidates AS (
    SELECT p.id
    FROM kaftan_intake.partner_inquiries p
    WHERE p.created_at <= v_cutoff
      AND p.status IN ('new','contacted','qualified','rejected')
      AND (p.retention_hold_until IS NULL OR p.retention_hold_until <= v_now)
    ORDER BY p.created_at, p.id
    FOR UPDATE SKIP LOCKED
    LIMIT p_batch_limit
  ), removed AS (
    DELETE FROM kaftan_intake.partner_inquiries AS p
    USING candidates AS c
    WHERE p.id = c.id
      AND p.created_at <= v_cutoff
      AND p.status IN ('new','contacted','qualified','rejected')
      AND (p.retention_hold_until IS NULL OR p.retention_hold_until <= v_now)
    RETURNING p.id
  )
  SELECT count(*)::integer INTO v_deleted FROM removed;

  INSERT INTO kaftan_intake.retention_purge_runs (deleted_count)
  VALUES (v_deleted);
  -- The ON DELETE CASCADE FK removes associated notification-outbox PII
  -- references in the same transaction. No operational partner/financial
  -- table, signed enquiry, or private Storage object is targeted.
  RETURN QUERY SELECT v_deleted, v_deleted;
END;
$$;

-- PostgreSQL gives functions PUBLIC EXECUTE by default; explicitly close.
REVOKE ALL ON FUNCTION kaftan_intake.purge_expired_inquiries(integer,boolean)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION kaftan_intake.purge_expired_inquiries(integer,boolean)
  TO service_role;

COMMIT;

-- Stage-only until #48 security, privacy and gateway checks are approved.
-- PostgreSQL 17 / Supabase roles. Additive, private; no production deployment here.
BEGIN;
CREATE SCHEMA IF NOT EXISTS kaftan_intake;
REVOKE ALL ON SCHEMA kaftan_intake FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA kaftan_intake TO service_role;

CREATE TABLE IF NOT EXISTS kaftan_intake.partner_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key uuid NOT NULL UNIQUE,
  payload_hash text NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
  company text NOT NULL CHECK (length(btrim(company)) BETWEEN 1 AND 160),
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 254),
  phone text NOT NULL CHECK (length(phone) <= 40),
  category text NOT NULL CHECK (category IN ('hotel_concierge','guide','apartment','travel_agency','other')),
  message text NOT NULL CHECK (length(btrim(message)) BETWEEN 1 AND 3000),
  language text NOT NULL CHECK (language IN ('hu','en')),
  privacy_notice_version text NOT NULL CHECK (length(btrim(privacy_notice_version)) BETWEEN 1 AND 48),
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','signed','rejected')),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS kaftan_intake.client_rate_limits (
  client_key text PRIMARY KEY CHECK (client_key ~ '^[0-9a-f]{64}$'),
  window_started timestamptz NOT NULL DEFAULT clock_timestamp(),
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts BETWEEN 1 AND 5),
  last_attempt timestamptz NOT NULL DEFAULT clock_timestamp()
);

CREATE TABLE IF NOT EXISTS kaftan_intake.notification_outbox (
  inquiry_id uuid PRIMARY KEY
    REFERENCES kaftan_intake.partner_inquiries(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'pending'
    CHECK (state IN ('pending','sending','sent','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);

ALTER TABLE kaftan_intake.partner_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaftan_intake.client_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaftan_intake.notification_outbox ENABLE ROW LEVEL SECURITY;
-- No public policies: application tables are private by design.
REVOKE ALL ON ALL TABLES IN SCHEMA kaftan_intake FROM PUBLIC, anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA kaftan_intake FROM PUBLIC, anon, authenticated;

-- The caller is a server-side adapter with verified ingress evidence.
-- Rate limits are an atomic first-party database operation, not a client counter.
CREATE OR REPLACE FUNCTION kaftan_intake.take_rate_slot(p_client_key text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  v_allowed boolean;
  v_now timestamptz := clock_timestamp();
BEGIN
  IF p_client_key IS NULL OR p_client_key !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'invalid_client_key' USING ERRCODE = '22023';
  END IF;
  INSERT INTO kaftan_intake.client_rate_limits AS existing
    (client_key,window_started,attempts,last_attempt)
  VALUES (p_client_key,v_now,1,v_now)
  ON CONFLICT (client_key) DO UPDATE
    SET window_started = CASE
      WHEN existing.window_started <= v_now - interval '15 minutes'
      THEN v_now ELSE existing.window_started END,
      attempts = CASE
      WHEN existing.window_started <= v_now - interval '15 minutes'
      THEN 1 ELSE existing.attempts + 1 END,
      last_attempt = v_now
  WHERE existing.window_started <= v_now - interval '15 minutes'
     OR existing.attempts < 5
  RETURNING true INTO v_allowed;
  RETURN coalesce(v_allowed,false);
END;
$$;

-- A successful result means both the private inquiry and its notification
-- outbox marker have committed. The mail service must separately deliver it.
-- A retry with the same UUID but different content fails instead of returning
-- someone else's receipt. The DB computes the content digest itself.
CREATE OR REPLACE FUNCTION kaftan_intake.accept_inquiry(
  p_idempotency_key uuid,
  p_name text,
  p_company text,
  p_email text,
  p_phone text,
  p_category text,
  p_message text,
  p_language text,
  p_notice_version text
)
RETURNS TABLE(committed boolean,outcome text,receipt uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  v_id uuid;
  v_original_hash text;
  v_hash text;
BEGIN
  IF p_idempotency_key IS NULL
    OR p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 120
    OR p_company IS NULL OR length(btrim(p_company)) NOT BETWEEN 1 AND 160
    OR p_email IS NULL OR length(p_email) NOT BETWEEN 3 AND 254
    OR p_phone IS NULL OR length(p_phone) > 40
    OR p_category IS NULL OR p_category NOT IN ('hotel_concierge','guide','apartment','travel_agency','other')
    OR p_message IS NULL OR length(btrim(p_message)) NOT BETWEEN 1 AND 3000
    OR p_language IS NULL OR p_language NOT IN ('hu','en')
    OR p_notice_version IS NULL OR length(btrim(p_notice_version)) NOT BETWEEN 1 AND 48
  THEN
    RAISE EXCEPTION 'invalid_inquiry' USING ERRCODE = '22023';
  END IF;

  v_hash := encode(sha256(convert_to(jsonb_build_object(
    'name',p_name,'company',p_company,'email',p_email,'phone',p_phone,
    'category',p_category,'message',p_message,'language',p_language,
    'notice',p_notice_version
  )::text,'UTF8')),'hex');

  INSERT INTO kaftan_intake.partner_inquiries
    (idempotency_key,payload_hash,name,company,email,phone,category,message,language,privacy_notice_version)
  VALUES
    (p_idempotency_key,v_hash,p_name,p_company,p_email,p_phone,p_category,p_message,p_language,p_notice_version)
  ON CONFLICT (idempotency_key) DO NOTHING
  RETURNING id INTO v_id;
  IF v_id IS NOT NULL THEN
    INSERT INTO kaftan_intake.notification_outbox (inquiry_id) VALUES (v_id);
    RETURN QUERY SELECT true,'created'::text,v_id;
    RETURN;
  END IF;

  SELECT id,payload_hash INTO v_id,v_original_hash
    FROM kaftan_intake.partner_inquiries
    WHERE idempotency_key = p_idempotency_key;
  IF v_id IS NULL OR v_original_hash IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'idempotency_conflict' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY SELECT true,'duplicate'::text,v_id;
END;
$$;

-- PostgreSQL functions normally default to PUBLIC EXECUTE: remove it.
REVOKE ALL ON FUNCTION kaftan_intake.take_rate_slot(text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION kaftan_intake.accept_inquiry(uuid,text,text,text,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION kaftan_intake.take_rate_slot(text) TO service_role;
GRANT EXECUTE ON FUNCTION kaftan_intake.accept_inquiry(uuid,text,text,text,text,text,text,text,text) TO service_role;

-- The notification worker can claim bounded batches without a public SELECT
-- grant on private inquiries. No email provider is called in this migration.
ALTER TABLE kaftan_intake.notification_outbox
  ADD COLUMN IF NOT EXISTS lease_token uuid,
  ADD COLUMN IF NOT EXISTS lease_expires_at timestamptz;

CREATE OR REPLACE FUNCTION kaftan_intake.claim_notifications(p_limit integer)
RETURNS TABLE (
  inquiry_id uuid, lease_token uuid, recipient_name text, company text,
  recipient_email text, phone text, category text, message text, language text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
BEGIN
  IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 10 THEN
    RAISE EXCEPTION 'invalid_batch_limit' USING ERRCODE = '22023';
  END IF;
  RETURN QUERY
  WITH ready AS (
    SELECT o.inquiry_id
    FROM kaftan_intake.notification_outbox o
    WHERE o.attempts < 8 AND (
      (o.state IN ('pending','failed') AND o.next_attempt_at <= clock_timestamp())
      OR (o.state = 'sending' AND o.lease_expires_at <= clock_timestamp())
    )
    ORDER BY o.next_attempt_at, o.created_at
    FOR UPDATE SKIP LOCKED
    LIMIT p_limit
  ), claim AS (
    UPDATE kaftan_intake.notification_outbox AS o
      SET state = 'sending',
          attempts = o.attempts + 1,
          lease_token = gen_random_uuid(),
          lease_expires_at = clock_timestamp() + interval '3 minutes'
    FROM ready
    WHERE o.inquiry_id = ready.inquiry_id
    RETURNING o.inquiry_id, o.lease_token
  )
  SELECT c.inquiry_id, c.lease_token, p.name, p.company, p.email,
         p.phone, p.category, p.message, p.language
  FROM claim c
  JOIN kaftan_intake.partner_inquiries p ON p.id = c.inquiry_id;
END;
$$;

-- A lease-holder acknowledges provider delivery or schedules a retry.
-- An expired/replaced lease cannot mark a notification sent.
CREATE OR REPLACE FUNCTION kaftan_intake.finish_notification(
  p_inquiry_id uuid, p_lease_token uuid, p_delivered boolean,
  p_retry_after_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog
AS $$
DECLARE
  v_acked boolean;
BEGIN
  IF p_inquiry_id IS NULL OR p_lease_token IS NULL OR p_delivered IS NULL
      OR p_retry_after_seconds IS NULL
      OR p_retry_after_seconds NOT BETWEEN 30 AND 86400 THEN
    RAISE EXCEPTION 'invalid_acknowledgement' USING ERRCODE = '22023';
  END IF;
  UPDATE kaftan_intake.notification_outbox AS o
    SET state = CASE WHEN p_delivered THEN 'sent' ELSE 'failed' END,
        next_attempt_at = CASE WHEN p_delivered THEN clock_timestamp()
          ELSE clock_timestamp() + make_interval(secs => p_retry_after_seconds) END,
        lease_token = NULL,
        lease_expires_at = NULL
  WHERE o.inquiry_id = p_inquiry_id
    AND o.lease_token = p_lease_token
    AND o.state = 'sending'
    AND o.lease_expires_at > clock_timestamp()
  RETURNING true INTO v_acked;
  RETURN coalesce(v_acked,false);
END;
$$;

REVOKE ALL ON FUNCTION kaftan_intake.claim_notifications(integer)
  FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION kaftan_intake.finish_notification(uuid,uuid,boolean,integer)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION kaftan_intake.claim_notifications(integer) TO service_role;
GRANT EXECUTE ON FUNCTION kaftan_intake.finish_notification(uuid,uuid,boolean,integer) TO service_role;

COMMIT;

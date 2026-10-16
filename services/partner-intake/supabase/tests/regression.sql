\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE
  name text;
  rows integer;
  created record;
  retried record;
  key text := repeat('a',64);
  idem uuid := 'a0123456-1111-4111-8111-000000000001';
BEGIN
  SELECT count(*) INTO rows
    FROM information_schema.tables
    WHERE table_schema='kaftan_intake'
    AND table_name IN ('partner_inquiries','client_rate_limits','notification_outbox');
  IF rows <> 3 THEN RAISE EXCEPTION 'Missing private tables'; END IF;
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='kaftan_intake' AND c.relkind='r' AND NOT c.relrowsecurity
  ) THEN RAISE EXCEPTION 'Private table lacks RLS'; END IF;
  IF has_schema_privilege('anon','kaftan_intake','USAGE')
    OR has_schema_privilege('authenticated','kaftan_intake','USAGE')
    OR has_table_privilege('anon','kaftan_intake.partner_inquiries','SELECT')
    OR has_table_privilege('authenticated','kaftan_intake.partner_inquiries','INSERT')
  THEN RAISE EXCEPTION 'Public roles gained table access'; END IF;

  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
    WHERE n.nspname='kaftan_intake'
      AND (has_function_privilege('anon',p.oid,'EXECUTE')
        OR has_function_privilege('authenticated',p.oid,'EXECUTE'))
  ) THEN RAISE EXCEPTION 'Public roles gained private RPC access'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
    WHERE n.nspname='kaftan_intake' AND p.proname='accept_inquiry'
      AND has_function_privilege('service_role',p.oid,'EXECUTE')
  ) THEN RAISE EXCEPTION 'Service role cannot call authorized RPC'; END IF;

  FOR rows IN 1..5 LOOP
    IF NOT kaftan_intake.take_rate_slot(key) THEN RAISE EXCEPTION 'Quota slot % rejected',rows; END IF;
  END LOOP;
  IF kaftan_intake.take_rate_slot(key) THEN RAISE EXCEPTION 'Quota overrun accepted'; END IF;

  UPDATE kaftan_intake.client_rate_limits
    SET window_started=clock_timestamp()-interval '16 minutes'
    WHERE client_key=key;
  IF NOT kaftan_intake.take_rate_slot(key) THEN RAISE EXCEPTION 'Expired quota did not reset'; END IF;
  BEGIN
    PERFORM kaftan_intake.take_rate_slot('1.2.3.4');
    RAISE EXCEPTION 'Invalid raw IP accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;

  SELECT * INTO created FROM kaftan_intake.accept_inquiry(
    idem,'Synthetic Person','Synthetic Hotel','synthetic@example.com','',
    'hotel_concierge','Please contact me','hu','staging-only');
  IF NOT created.committed OR created.outcome <> 'created' OR created.receipt IS NULL
  THEN RAISE EXCEPTION 'Initial record not committed'; END IF;

  SELECT * INTO retried FROM kaftan_intake.accept_inquiry(
    idem,'Synthetic Person','Synthetic Hotel','synthetic@example.com','',
    'hotel_concierge','Please contact me','hu','staging-only');
  IF NOT retried.committed OR retried.outcome <> 'duplicate' OR retried.receipt <> created.receipt
  THEN RAISE EXCEPTION 'Duplicate receipt differs'; END IF;

  BEGIN
    PERFORM kaftan_intake.accept_inquiry(
      idem,'Synthetic Person','Synthetic Hotel','different@example.com','',
      'hotel_concierge','Please contact me','hu','staging-only');
    RAISE EXCEPTION 'Mismatched idempotency replay accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
  SELECT count(*) INTO rows FROM kaftan_intake.partner_inquiries;
  IF rows <> 1 THEN RAISE EXCEPTION 'Duplicate lead inserted'; END IF;
  SELECT count(*) INTO rows FROM kaftan_intake.notification_outbox
    WHERE inquiry_id=created.receipt AND state='pending';
  IF rows <> 1 THEN RAISE EXCEPTION 'Missing or repeated durable outbox entry'; END IF;

  BEGIN
    PERFORM kaftan_intake.accept_inquiry(
      gen_random_uuid(),'Unsafe','Synthetic','bad@example.com','',
      'invalid_category','text','hu','staging-only');
    RAISE EXCEPTION 'Invalid category accepted';
  EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
END $$;
ROLLBACK;
SELECT 'PASS: private table isolation, atomic quota, idempotent receipt, outbox transaction' AS staging_result;

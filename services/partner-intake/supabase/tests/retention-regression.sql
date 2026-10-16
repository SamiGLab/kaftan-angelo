\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE
  v_status text;
  v_id uuid;
  v_dry record;
  v_result record;
  v_rows integer;
  v_audit integer;
  v_old timestamptz := transaction_timestamp() - interval '91 days';
  v_recent timestamptz := transaction_timestamp() - interval '89 days';
  v_statuses text[] := ARRAY['new','contacted','qualified','rejected'];
  v_signed uuid := 'a0123456-1111-4111-8111-000000000091';
  v_held uuid := 'a0123456-1111-4111-8111-000000000092';
  v_recent_id uuid := 'a0123456-1111-4111-8111-000000000093';
BEGIN
  -- Four stale, unsigned leads; one stale signed lead; one stale legal hold;
  -- one recent lead. All identities below are synthetic CI-only fixtures.
  FOREACH v_status IN ARRAY v_statuses LOOP
    v_id := gen_random_uuid();
    INSERT INTO kaftan_intake.partner_inquiries(
      id,idempotency_key,payload_hash,name,company,email,phone,category,
      message,language,privacy_notice_version,status,created_at
    ) VALUES (
      v_id,gen_random_uuid(),repeat('a',64),'Synthetic Retention',
      'Synthetic Hotel','synthetic@example.com','','hotel_concierge',
      'test-only','hu','synthetic-notice',v_status,v_old
    );
    INSERT INTO kaftan_intake.notification_outbox(inquiry_id) VALUES (v_id);
  END LOOP;
  INSERT INTO kaftan_intake.partner_inquiries(
    id,idempotency_key,payload_hash,name,company,email,phone,category,
    message,language,privacy_notice_version,status,created_at
  ) VALUES
    (v_signed,gen_random_uuid(),repeat('b',64),'Signed Synthetic','Signed Business',
     'signed@example.com','','hotel_concierge','test-only','en','synthetic-notice','signed',v_old),
    (v_held,gen_random_uuid(),repeat('c',64),'Held Synthetic','Held Business',
     'held@example.com','','guide','test-only','en','synthetic-notice','rejected',v_old),
    (v_recent_id,gen_random_uuid(),repeat('d',64),'Recent Synthetic','New Business',
     'recent@example.com','','guide','test-only','en','synthetic-notice','new',v_recent);
  UPDATE kaftan_intake.partner_inquiries
    SET retention_hold_until = transaction_timestamp() + interval '30 days',
        retention_hold_reason = 'active_dispute'
    WHERE id = v_held;
  INSERT INTO kaftan_intake.notification_outbox(inquiry_id)
    VALUES (v_signed),(v_held),(v_recent_id);

  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname='kaftan_intake'
      AND c.relname='retention_purge_runs' AND c.relrowsecurity
  ) THEN RAISE EXCEPTION 'Retention audit must have private RLS'; END IF;
  IF has_schema_privilege('anon','kaftan_intake','USAGE')
      OR has_table_privilege('anon','kaftan_intake.retention_purge_runs','SELECT')
      OR has_table_privilege('authenticated','kaftan_intake.retention_purge_runs','SELECT')
      OR has_function_privilege('anon','kaftan_intake.purge_expired_inquiries(integer,boolean)','EXECUTE')
      OR has_function_privilege('authenticated','kaftan_intake.purge_expired_inquiries(integer,boolean)','EXECUTE')
  THEN RAISE EXCEPTION 'Retention data or RPC exposed to public roles'; END IF;
  IF NOT has_function_privilege('service_role','kaftan_intake.purge_expired_inquiries(integer,boolean)','EXECUTE')
  THEN RAISE EXCEPTION 'Service role missing retention RPC permission'; END IF;

  -- Explicit false and default must both be dry-run, without mutating rows.
  SELECT * INTO v_dry FROM kaftan_intake.purge_expired_inquiries(100);
  IF v_dry.eligible_count <> 4 OR v_dry.deleted_count <> 0
  THEN RAISE EXCEPTION 'Default preview is not fail-closed'; END IF;
  SELECT count(*) INTO v_rows FROM kaftan_intake.partner_inquiries;
  IF v_rows <> 7 THEN RAISE EXCEPTION 'Preview deleted real rows'; END IF;
  SELECT count(*) INTO v_audit FROM kaftan_intake.retention_purge_runs;
  IF v_audit <> 0 THEN RAISE EXCEPTION 'Preview wrote audit rows'; END IF;

  -- Strict batch bound prevents a large accidental deletion.
  SELECT * INTO v_result FROM kaftan_intake.purge_expired_inquiries(2,true);
  IF v_result.deleted_count <> 2 THEN RAISE EXCEPTION 'Two-row batch failed'; END IF;
  SELECT * INTO v_dry FROM kaftan_intake.purge_expired_inquiries(100,false);
  IF v_dry.eligible_count <> 2 THEN RAISE EXCEPTION 'Preview remaining mismatch'; END IF;
  SELECT * INTO v_result FROM kaftan_intake.purge_expired_inquiries(100,true);
  IF v_result.deleted_count <> 2 THEN RAISE EXCEPTION 'Remaining stale leads not purged'; END IF;
  SELECT count(*) INTO v_rows FROM kaftan_intake.partner_inquiries;
  IF v_rows <> 3 THEN RAISE EXCEPTION 'Wrong rows removed by 90-day policy'; END IF;
  SELECT count(*) INTO v_rows FROM kaftan_intake.notification_outbox;
  IF v_rows <> 3 THEN RAISE EXCEPTION 'Child outbox rows not cascade-deleted'; END IF;
  IF NOT EXISTS (SELECT 1 FROM kaftan_intake.partner_inquiries WHERE id=v_signed AND status='signed')
    OR NOT EXISTS (SELECT 1 FROM kaftan_intake.partner_inquiries WHERE id=v_held AND status='rejected')
    OR NOT EXISTS (SELECT 1 FROM kaftan_intake.partner_inquiries WHERE id=v_recent_id)
  THEN RAISE EXCEPTION 'Signed, held or recent lead was deleted'; END IF;

  -- While the hold is current, it is excluded; after expiry, eligible.
  UPDATE kaftan_intake.partner_inquiries
    SET retention_hold_until=transaction_timestamp()-interval '1 second'
    WHERE id=v_held;
  SELECT * INTO v_dry FROM kaftan_intake.purge_expired_inquiries(100);
  IF v_dry.eligible_count <> 1 THEN RAISE EXCEPTION 'Expired hold not eligible'; END IF;
  SELECT * INTO v_result FROM kaftan_intake.purge_expired_inquiries(100,true);
  IF v_result.deleted_count <> 1 THEN RAISE EXCEPTION 'Expired hold not removed'; END IF;
  SELECT count(*) INTO v_rows FROM kaftan_intake.partner_inquiries;
  IF v_rows <> 2 THEN RAISE EXCEPTION 'Signed/new lead missing'; END IF;
  SELECT count(*) INTO v_audit FROM kaftan_intake.retention_purge_runs;
  IF v_audit <> 3 THEN RAISE EXCEPTION 'Expected three aggregate execution entries'; END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='kaftan_intake' AND table_name='retention_purge_runs'
      AND column_name IN ('email','name','inquiry_id','idempotency_key','payload_hash','message')
  ) THEN RAISE EXCEPTION 'Retention audit leaks applicant identifiers'; END IF;

  FOR v_rows IN 1..4 LOOP
    BEGIN
      CASE v_rows
        WHEN 1 THEN PERFORM kaftan_intake.purge_expired_inquiries(0,false);
        WHEN 2 THEN PERFORM kaftan_intake.purge_expired_inquiries(101,false);
        WHEN 3 THEN PERFORM kaftan_intake.purge_expired_inquiries(NULL,false);
        WHEN 4 THEN PERFORM kaftan_intake.purge_expired_inquiries(10,NULL);
      END CASE;
      RAISE EXCEPTION 'Invalid retention request accepted';
    EXCEPTION WHEN SQLSTATE '22023' THEN NULL;
    END;
  END LOOP;

  -- A legal exception must have both a reason and a finite expiration.
  BEGIN
    UPDATE kaftan_intake.partner_inquiries
      SET retention_hold_until=transaction_timestamp()+interval '1 day',
          retention_hold_reason=NULL WHERE id=v_recent_id;
    RAISE EXCEPTION 'Expiry without reason was allowed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE kaftan_intake.partner_inquiries
      SET retention_hold_until='infinity'::timestamptz,
          retention_hold_reason='active_dispute' WHERE id=v_recent_id;
    RAISE EXCEPTION 'Infinite preservation was allowed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    UPDATE kaftan_intake.partner_inquiries SET retention_hold_reason='active_dispute'
      WHERE id=v_recent_id;
    RAISE EXCEPTION 'Reason without expiry was allowed';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

END $$;
ROLLBACK;
SELECT 'PASS: 90-day preview, bounded deletion, signed/recent/hold exclusions, outbox cascade, grants and aggregate audit' AS retention_result;

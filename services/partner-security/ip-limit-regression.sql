BEGIN;
DO $$
DECLARE i integer;
BEGIN
 PERFORM set_config('request.method','POST',true);
 PERFORM set_config('request.headers','{"cf-connecting-ip":"192.0.2.77","x-forwarded-for":"198.51.100.1"}',true);
 FOR i IN 1..30 LOOP
  IF kaftan_private.limit_portal_ip()<>0 THEN RAISE EXCEPTION 'IP allowance rejected early'; END IF;
 END LOOP;
 IF kaftan_private.limit_portal_ip()<=0 THEN RAISE EXCEPTION '31st request not limited'; END IF;
 PERFORM set_config('request.headers','{"cf-connecting-ip":"192.0.2.77","x-forwarded-for":"198.51.100.2"}',true);
 IF kaftan_private.limit_portal_ip()<=0 THEN RAISE EXCEPTION 'Forged forwarded header bypass'; END IF;
 PERFORM set_config('request.headers','{"cf-connecting-ip":"192.0.2.78"}',true);
 IF kaftan_private.limit_portal_ip()<>0 THEN RAISE EXCEPTION 'Other IP incorrectly limited'; END IF;
 UPDATE kaftan_private.portal_ip_limits SET window_start=clock_timestamp()-interval '16 minutes';
 PERFORM set_config('request.headers','{"cf-connecting-ip":"192.0.2.77"}',true);
 IF kaftan_private.limit_portal_ip()<>0 THEN RAISE EXCEPTION 'Expired IP window not reset'; END IF;
 PERFORM set_config('request.headers','{"cf-connecting-ip":"2001:db8:77::1"}',true);
 FOR i IN 1..30 LOOP PERFORM kaftan_private.limit_portal_ip(); END LOOP;
 PERFORM set_config('request.headers','{"cf-connecting-ip":"2001:db8:77::99"}',true);
 IF kaftan_private.limit_portal_ip()<=0 THEN RAISE EXCEPTION 'IPv6 subnet rotation bypass'; END IF;
 PERFORM set_config('request.headers','{"x-forwarded-for":"192.0.2.79"}',true);
 IF kaftan_private.limit_portal_ip()<=0 THEN RAISE EXCEPTION 'Missing trusted header accepted'; END IF;
 IF has_table_privilege('anon','kaftan_private.portal_ip_limits','SELECT') OR has_function_privilege('anon','kaftan_private.partner_dashboard(text,text)','EXECUTE') THEN RAISE EXCEPTION 'Private limiter/helper exposed'; END IF;
END;
$$;
ROLLBACK;
SELECT 'PASS: IP quota, forged forwarding headers, independent addresses, expiry, IPv6 subnet and private grants. All test changes rolled back.' AS result;

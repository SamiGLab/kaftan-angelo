BEGIN;
DO $test$
DECLARE
 a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
 ca text:='AUDIT'||upper(replace(a::text,'-','')); cb text:='AUDIT'||upper(replace(b::text,'-',''));
 pa text:=encode(extensions.gen_random_bytes(16),'hex'); pb text:=encode(extensions.gen_random_bytes(16),'hex');
 r jsonb; i integer; unknown_code text:='UNKNOWN'||upper(left(replace(gen_random_uuid()::text,'-',''),20));
BEGIN
 INSERT INTO public.partners(id,code,pin,name,partner_type) VALUES(a,ca,pa,'Temporary security A','Hotel Concierge'),(b,cb,pb,'Temporary security B','Hotel Concierge');
 INSERT INTO public.partner_transactions(partner_id,tx_date,item_description,sale_amount_huf,commission_huf,status) VALUES(a,current_date-20,'AUDIT_A',1001,101,'Kifizetve'),(b,current_date-20,'AUDIT_B',2002,202,'Kifizetve');
 r:=public.get_partner_portal(ca,pa)::jsonb;
 IF r->>'success'<>'true' OR r->>'code'<>ca OR jsonb_array_length(r->'txs')<>1 OR r->'txs'->0->>'item'<>'AUDIT_A' OR (r->>'sales')::numeric<>1001 THEN RAISE EXCEPTION 'A data isolation failed'; END IF;
 IF r ?| array['pin','p_pin','pin_hash','pin_cipher'] THEN RAISE EXCEPTION 'Credentials exposed'; END IF;
 r:=public.get_partner_portal(cb,pb)::jsonb;
 IF r->>'success'<>'true' OR jsonb_array_length(r->'txs')<>1 OR r->'txs'->0->>'item'<>'AUDIT_B' THEN RAISE EXCEPTION 'B data isolation failed'; END IF;
 r:=public.get_partner_portal(ca,pb)::jsonb;
 IF r->>'success'<>'false' OR r ? 'txs' THEN RAISE EXCEPTION 'Cross-account PIN accepted'; END IF;
 FOR i IN 1..4 LOOP PERFORM public.get_partner_portal(ca,'invalid-test-pin'); END LOOP;
 IF public.get_partner_portal(ca,pa)::jsonb->>'success'<>'false' THEN RAISE EXCEPTION 'Five-attempt limit failed'; END IF;
 IF public.get_partner_portal(cb,pb)::jsonb->>'success'<>'true' THEN RAISE EXCEPTION 'Other account incorrectly locked'; END IF;
 UPDATE kaftan_private.portal_attempts SET window_start=clock_timestamp()-interval '16 minutes' WHERE code=ca;
 IF public.get_partner_portal(ca,pa)::jsonb->>'success'<>'true' THEN RAISE EXCEPTION 'Window expiry failed'; END IF;
 PERFORM public.get_partner_portal(unknown_code,'invalid-test-pin');
 IF EXISTS(SELECT 1 FROM kaftan_private.portal_attempts WHERE code=unknown_code) THEN RAISE EXCEPTION 'Unknown code created attempt row'; END IF;
 IF EXISTS(SELECT 1 FROM public.partners WHERE id in(a,b) AND pin<>'') THEN RAISE EXCEPTION 'Plaintext PIN persisted'; END IF;
 IF NOT EXISTS(SELECT 1 FROM kaftan_private.partner_credentials WHERE partner_id=a AND pin_hash=extensions.crypt(pa,pin_hash) AND pin_cipher IS NOT NULL) THEN RAISE EXCEPTION 'PIN trigger failed'; END IF;
 IF has_function_privilege('anon','public.admin_get_partner_pins()','EXECUTE') OR has_function_privilege('authenticated','public.admin_get_partner_pins()','EXECUTE') THEN RAISE EXCEPTION 'Admin PIN permissions exposed'; END IF;
 IF NOT has_function_privilege('service_role','public.admin_get_partner_pins()','EXECUTE') THEN RAISE EXCEPTION 'Owner PIN access broken'; END IF;
 IF has_table_privilege('anon','public.partners','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') OR has_table_privilege('authenticated','public.partner_transactions','SELECT,INSERT,UPDATE,DELETE,TRUNCATE') THEN RAISE EXCEPTION 'Direct table permissions remain'; END IF;
END;
$test$;
ROLLBACK;
SELECT 'PASS: two-account isolation, cross-PIN rejection, five-attempt lock, independent accounts, 15-minute expiry, PIN hashing, admin permission separation, unknown-code rejection. All synthetic records rolled back.' AS result;


BEGIN;
DO $$
DECLARE a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); ca text:='AUDIT'||upper(replace(a::text,'-','')); cb text:='AUDIT'||upper(replace(b::text,'-','')); pin_a text:=encode(extensions.gen_random_bytes(16),'hex'); pin_b text:=encode(extensions.gen_random_bytes(16),'hex'); r jsonb; token text; i integer;
BEGIN
 INSERT INTO public.partners(id,code,pin,name,partner_type,contract_url) VALUES(a,ca,pin_a,'Temporary contract A','Hotel Concierge',ca||'_sozlesme.pdf'),(b,cb,pin_b,'Temporary contract B','Hotel Concierge',cb||'_sozlesme.pdf');
 r:=public.get_partner_portal(ca,pin_a)::jsonb; token:=r->>'session_token';
 IF token !~ '^[0-9a-f]{64}$' OR r->>'has_contract'<>'true' OR r ? 'contract_url' THEN RAISE EXCEPTION 'Unsafe/missing session response'; END IF;
 IF EXISTS(SELECT 1 FROM kaftan_private.partner_sessions WHERE token_hash=token) THEN RAISE EXCEPTION 'Plaintext session stored'; END IF;
 r:=public.get_partner_contract(token);
 IF r->>'path'<>ca||'_sozlesme.pdf' THEN RAISE EXCEPTION 'Wrong contract owner'; END IF;
 IF (public.get_partner_contract(repeat('0',64))->>'success')::boolean THEN RAISE EXCEPTION 'Invalid token accepted'; END IF;
 FOR i IN 1..9 LOOP PERFORM public.get_partner_contract(token); END LOOP;
 IF public.get_partner_contract(token)->>'limited'<>'true' THEN RAISE EXCEPTION 'Download limit bypass'; END IF;
 UPDATE kaftan_private.partner_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE partner_id=a;
 IF (public.get_partner_contract(token)->>'success')::boolean THEN RAISE EXCEPTION 'Expired token accepted'; END IF;
 r:=public.get_partner_portal(ca,pin_a)::jsonb; token:=r->>'session_token';
 PERFORM public.revoke_partner_session(token);
 IF (public.get_partner_contract(token)->>'success')::boolean THEN RAISE EXCEPTION 'Logout token accepted'; END IF;
 r:=public.get_partner_portal(ca,pin_a)::jsonb; token:=r->>'session_token';
 UPDATE public.partners SET pin=encode(extensions.gen_random_bytes(16),'hex') WHERE id=a;
 IF (public.get_partner_contract(token)->>'success')::boolean THEN RAISE EXCEPTION 'PIN change did not revoke session'; END IF;
 r:=public.get_partner_portal(cb,pin_b)::jsonb; token:=r->>'session_token';
 UPDATE public.partners SET contract_url=ca||'_sozlesme.pdf' WHERE id=b;
 IF public.get_partner_contract(token)->>'missing'<>'true' THEN RAISE EXCEPTION 'Other account file assigned'; END IF;
 IF has_function_privilege('anon','public.get_partner_contract(text)','EXECUTE') OR has_function_privilege('authenticated','public.revoke_partner_session(text)','EXECUTE') THEN RAISE EXCEPTION 'Backend-only RPC exposed'; END IF;
END;
$$;
ROLLBACK;
SELECT 'PASS: hashed sessions, owner-only paths, unknown/expired tokens, download quota, logout and PIN revocation, backend grants. All synthetic records rolled back.' AS result;

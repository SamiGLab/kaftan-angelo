BEGIN;
DO $$
DECLARE test_id uuid:=gen_random_uuid(); code text:='AUDIT'||upper(replace(test_id::text,'-','')); pin text:=encode(extensions.gen_random_bytes(16),'hex'); tx uuid; events jsonb; raw text;
BEGIN
 PERFORM set_config('request.jwt.claims','{"role":"service_role"}',true);
 PERFORM set_config('request.headers','{"x-kaftan-actor":"Audit test user","x-kaftan-device":"test-device"}',true);
 INSERT INTO public.partners(id,code,pin,name,partner_type) VALUES(test_id,code,pin,'Temporary audit','Hotel Concierge');
 UPDATE public.partners SET pin=encode(extensions.gen_random_bytes(16),'hex'),iban='PRIVATE_BANK_TEST',phone='PRIVATE_PHONE_TEST' WHERE partners.id=test_id;
 INSERT INTO public.partner_transactions(partner_id,tx_date,item_description,sale_amount_huf,commission_huf,status) VALUES(test_id,current_date,'AUDIT',1000,100,'Függőben') RETURNING partner_transactions.id INTO tx;
 UPDATE public.partner_transactions SET status='Kifizetve' WHERE partner_transactions.id=tx;
 DELETE FROM public.partner_transactions WHERE partner_transactions.id=tx;
 DELETE FROM public.partners WHERE partners.id=test_id;
 events:=public.admin_get_partner_events(test_id,NULL); raw:=events::text;
 IF jsonb_array_length(events)<7 OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(events) e WHERE e->>'action'='pin_changed') OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(events) e WHERE e->>'action'='partner_deleted') THEN RAISE EXCEPTION 'Required audit events missing'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(events) e WHERE e->>'actor'<>'Audit test user' OR e->>'actor_source'<>'admin_client_label') THEN RAISE EXCEPTION 'Audit actor metadata missing'; END IF;
 IF position(pin IN raw)>0 OR position('PRIVATE_BANK_TEST' IN raw)>0 OR position('PRIVATE_PHONE_TEST' IN raw)>0 OR raw~'(pin_hash|pin_cipher|session_token)' THEN RAISE EXCEPTION 'Secret/private values in audit log'; END IF;
 IF has_table_privilege('service_role','kaftan_private.partner_admin_events','UPDATE') OR has_function_privilege('anon','public.admin_get_partner_events(uuid,bigint)','EXECUTE') THEN RAISE EXCEPTION 'Audit history grants unsafe'; END IF;
END;
$$;
ROLLBACK;
SELECT 'PASS: create/PIN/contact/payment/delete history, actor labeling, secrets excluded, append-only grants. All synthetic records rolled back.' AS result;

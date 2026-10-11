BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS kaftan_private.partner_admin_events(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 partner_id uuid,partner_code text,action text NOT NULL,actor text NOT NULL,actor_source text NOT NULL,device text,
 details jsonb NOT NULL DEFAULT '{}'::jsonb);
CREATE INDEX IF NOT EXISTS partner_admin_events_partner ON kaftan_private.partner_admin_events(partner_id,id DESC);
ALTER TABLE kaftan_private.partner_admin_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON kaftan_private.partner_admin_events FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON SEQUENCE kaftan_private.partner_admin_events_id_seq FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION kaftan_private.write_partner_event(partner uuid,code text,event text,metadata jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE claims jsonb:=coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb;
 headers jsonb:=coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
 actor text; source text; device text;
BEGIN
 IF nullif(claims->>'sub','') IS NOT NULL THEN actor:=claims->>'sub'; source:='authenticated_identity';
 ELSIF claims->>'role'='service_role' THEN
  actor:=coalesce(nullif(left(headers->>'x-kaftan-actor',120),''),'Shared administrator');
  source:=CASE WHEN nullif(headers->>'x-kaftan-actor','') IS NULL THEN 'shared_service_key' ELSE 'admin_client_label' END;
 ELSE actor:='Database administrator'; source:='database'; END IF;
 device:=left(headers->>'x-kaftan-device',80);
 INSERT INTO kaftan_private.partner_admin_events(partner_id,partner_code,action,actor,actor_source,device,details) VALUES(partner,code,event,actor,source,device,coalesce(metadata,'{}'));
END;
$$;
REVOKE ALL ON FUNCTION kaftan_private.write_partner_event(uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION kaftan_private.audit_partner_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE before_row jsonb; after_row jsonb; partner uuid; code text; event text; fields text[]:='{}'; field text; metadata jsonb:='{}';
BEGIN
 IF TG_OP<>'INSERT' THEN before_row:=to_jsonb(OLD); END IF;
 IF TG_OP<>'DELETE' THEN after_row:=to_jsonb(NEW); END IF;
 IF TG_TABLE_NAME='partner_credentials' THEN
  IF TG_OP='UPDATE' AND NEW.pin_hash IS NOT DISTINCT FROM OLD.pin_hash THEN RETURN NEW; END IF;
  partner:=NEW.partner_id; SELECT p.code INTO code FROM public.partners p WHERE p.id=partner;
  event:=CASE WHEN TG_OP='INSERT' THEN 'pin_initialized' ELSE 'pin_changed' END;
 ELSIF TG_TABLE_NAME='partners' THEN
  partner:=coalesce(NEW.id,OLD.id); code:=coalesce(NEW.code,OLD.code);
  event:=CASE TG_OP WHEN 'INSERT' THEN 'partner_created' WHEN 'DELETE' THEN 'partner_deleted' ELSE 'partner_updated' END;
  IF TG_OP='UPDATE' THEN
   FOREACH field IN ARRAY ARRAY['code','name','partner_type','contact_person','phone','iban','contract_url'] LOOP
    IF before_row->field IS DISTINCT FROM after_row->field THEN fields:=array_append(fields,field); END IF;
   END LOOP;
   IF before_row->'materials'->>'status' IS DISTINCT FROM after_row->'materials'->>'status' THEN fields:=array_append(fields,'sharing_status'); END IF;
   IF cardinality(fields)=0 THEN RETURN NEW; END IF;
   metadata:=jsonb_build_object('changed_fields',fields);
  END IF;
 ELSE
  partner:=coalesce(NEW.partner_id,OLD.partner_id); SELECT p.code INTO code FROM public.partners p WHERE p.id=partner;
  event:=CASE TG_OP WHEN 'INSERT' THEN 'transaction_created' WHEN 'DELETE' THEN 'transaction_deleted' ELSE 'transaction_updated' END;
  IF TG_OP='UPDATE' THEN
   FOREACH field IN ARRAY ARRAY['partner_id','tx_date','item_description','sale_amount_huf','commission_huf','status'] LOOP
    IF before_row->field IS DISTINCT FROM after_row->field THEN fields:=array_append(fields,field); END IF;
   END LOOP;
   IF cardinality(fields)=0 THEN RETURN NEW; END IF;
  END IF;
  metadata:=jsonb_build_object('transaction_id',coalesce(after_row->>'id',before_row->>'id'),'changed_fields',fields,
   'previous_status',before_row->>'status','status',after_row->>'status','sale_amount_huf',coalesce(after_row->'sale_amount_huf',before_row->'sale_amount_huf'),'commission_huf',coalesce(after_row->'commission_huf',before_row->'commission_huf'));
 END IF;
 -- Never serialize PINs, hashes, ciphertext, tokens or full contact/bank details.
 PERFORM kaftan_private.write_partner_event(partner,code,event,metadata);
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION kaftan_private.audit_partner_change() FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS kaftan_partner_audit ON public.partners;
CREATE TRIGGER kaftan_partner_audit AFTER INSERT OR UPDATE OR DELETE ON public.partners FOR EACH ROW EXECUTE FUNCTION kaftan_private.audit_partner_change();
DROP TRIGGER IF EXISTS kaftan_transaction_audit ON public.partner_transactions;
CREATE TRIGGER kaftan_transaction_audit AFTER INSERT OR UPDATE OR DELETE ON public.partner_transactions FOR EACH ROW EXECUTE FUNCTION kaftan_private.audit_partner_change();
DROP TRIGGER IF EXISTS kaftan_pin_audit ON kaftan_private.partner_credentials;
CREATE TRIGGER kaftan_pin_audit AFTER INSERT OR UPDATE ON kaftan_private.partner_credentials FOR EACH ROW EXECUTE FUNCTION kaftan_private.audit_partner_change();

CREATE OR REPLACE FUNCTION public.admin_get_partner_events(p_partner_id uuid DEFAULT NULL,p_before_id bigint DEFAULT NULL) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(events) ORDER BY events.id DESC),'[]'::jsonb) FROM
 (SELECT id,created_at,partner_id,partner_code,action,actor,actor_source,device,details FROM kaftan_private.partner_admin_events
 WHERE (p_partner_id IS NULL OR partner_id=p_partner_id) AND (p_before_id IS NULL OR id<p_before_id) ORDER BY id DESC LIMIT 100) events;
$$;
REVOKE ALL ON FUNCTION public.admin_get_partner_events(uuid,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_get_partner_events(uuid,bigint) TO service_role;
COMMIT;
SELECT 'Append-only partner admin history installed; server-only paginated read' AS result;

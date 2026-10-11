BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS kaftan_private.partner_sessions(
 token_hash text PRIMARY KEY,partner_id uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL,download_window timestamptz NOT NULL DEFAULT clock_timestamp(),downloads integer NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS partner_sessions_partner ON kaftan_private.partner_sessions(partner_id);
CREATE INDEX IF NOT EXISTS partner_sessions_expiry ON kaftan_private.partner_sessions(expires_at);
ALTER TABLE kaftan_private.partner_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON kaftan_private.partner_sessions FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION kaftan_private.revoke_partner_sessions() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.pin_hash IS DISTINCT FROM OLD.pin_hash THEN DELETE FROM kaftan_private.partner_sessions WHERE partner_id=NEW.partner_id; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION kaftan_private.revoke_partner_sessions() FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS kaftan_revoke_sessions ON kaftan_private.partner_credentials;
CREATE TRIGGER kaftan_revoke_sessions AFTER UPDATE OF pin_hash ON kaftan_private.partner_credentials FOR EACH ROW EXECUTE FUNCTION kaftan_private.revoke_partner_sessions();

CREATE OR REPLACE FUNCTION public.get_partner_portal(p_code text,p_pin text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE wait_seconds integer; result jsonb; partner uuid; file_name text; token text;
BEGIN
 wait_seconds:=kaftan_private.limit_portal_ip();
 IF wait_seconds>0 THEN
  PERFORM set_config('response.status','429',true);
  PERFORM set_config('response.headers',json_build_array(json_build_object('Retry-After',wait_seconds::text))::text,true);
  RETURN json_build_object('success',false,'message','Please try again later.','retry_after',wait_seconds);
 END IF;
 result:=kaftan_private.partner_dashboard(p_code,p_pin)::jsonb;
 IF coalesce((result->>'success')::boolean,false) THEN
  SELECT id,contract_url INTO STRICT partner,file_name FROM public.partners WHERE upper(code)=upper(btrim(p_code));
  -- Serialize with PIN changes: issue only after checking the current hash again under a row lock.
  PERFORM 1 FROM kaftan_private.partner_credentials WHERE partner_id=partner AND pin_hash=extensions.crypt(p_pin,pin_hash) FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success',false,'message','Please sign in again.'); END IF;
  token:=encode(extensions.gen_random_bytes(32),'hex');
  DELETE FROM kaftan_private.partner_sessions WHERE token_hash IN (SELECT token_hash FROM kaftan_private.partner_sessions WHERE expires_at<=clock_timestamp() LIMIT 100);
  INSERT INTO kaftan_private.partner_sessions(token_hash,partner_id,expires_at) VALUES(encode(extensions.digest(token,'sha256'),'hex'),partner,clock_timestamp()+interval '30 minutes');
  result:=(result-'contract_url')||jsonb_build_object('session_token',token,'has_contract',coalesce(file_name,'')<>'');
 END IF;
 RETURN result::json;
END;
$$;
REVOKE ALL ON FUNCTION public.get_partner_portal(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_partner_portal(text,text) TO anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_partner_contract(p_token text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE session_row kaftan_private.partner_sessions%ROWTYPE; p public.partners%ROWTYPE; digest text;
BEGIN
 IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN RETURN jsonb_build_object('success',false); END IF;
 digest:=encode(extensions.digest(p_token,'sha256'),'hex');
 SELECT * INTO session_row FROM kaftan_private.partner_sessions WHERE token_hash=digest AND expires_at>clock_timestamp() FOR UPDATE;
 IF NOT FOUND THEN RETURN jsonb_build_object('success',false); END IF;
 IF session_row.download_window<=clock_timestamp()-interval '5 minutes' THEN session_row.downloads:=0; session_row.download_window:=clock_timestamp(); END IF;
 IF session_row.downloads>=10 THEN RETURN jsonb_build_object('success',false,'limited',true); END IF;
 UPDATE kaftan_private.partner_sessions SET downloads=session_row.downloads+1,download_window=session_row.download_window WHERE token_hash=digest;
 SELECT * INTO STRICT p FROM public.partners WHERE id=session_row.partner_id;
 -- The caller cannot choose another partner or another Storage object.
 IF p.contract_url IS NULL OR p.contract_url<>p.code||'_sozlesme.'||lower(split_part(p.contract_url,'.',2))
    OR lower(split_part(p.contract_url,'.',2)) NOT IN ('pdf','jpg','jpeg','png') OR p.contract_url~'[/\\]' THEN RETURN jsonb_build_object('success',false,'missing',true); END IF;
 RETURN jsonb_build_object('success',true,'path',p.contract_url);
END;
$$;
REVOKE ALL ON FUNCTION public.get_partner_contract(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_partner_contract(text) TO service_role;

CREATE OR REPLACE FUNCTION public.revoke_partner_session(p_token text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF p_token~'^[0-9a-f]{64}$' THEN DELETE FROM kaftan_private.partner_sessions WHERE token_hash=encode(extensions.digest(p_token,'sha256'),'hex'); END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.revoke_partner_session(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_partner_session(text) TO service_role;
COMMIT;
SELECT '30-minute hashed sessions and owner-only contract lookup installed' AS result;

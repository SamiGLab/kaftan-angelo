BEGIN;
SET LOCAL lock_timeout='5s';
CREATE TABLE IF NOT EXISTS kaftan_private.portal_ip_key(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),secret bytea NOT NULL);
INSERT INTO kaftan_private.portal_ip_key VALUES(true,extensions.gen_random_bytes(32)) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS kaftan_private.portal_ip_limits(ip_hash text PRIMARY KEY,window_start timestamptz NOT NULL,calls integer NOT NULL CHECK(calls>=0));
CREATE INDEX IF NOT EXISTS portal_ip_limits_expiry ON kaftan_private.portal_ip_limits(window_start);
ALTER TABLE kaftan_private.portal_ip_key ENABLE ROW LEVEL SECURITY;
ALTER TABLE kaftan_private.portal_ip_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON kaftan_private.portal_ip_key,kaftan_private.portal_ip_limits FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION kaftan_private.limit_portal_ip() RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE h jsonb; ip inet; k bytea; digest text; n integer; started timestamptz; now_at timestamptz:=clock_timestamp();
BEGIN
 -- Administrative SQL tests are not internet requests. HTTP clients must use POST.
 IF nullif(current_setting('request.method',true),'') IS NULL THEN RETURN 0; END IF;
 IF current_setting('request.method',true)<>'POST' THEN RETURN 900; END IF;
 h:=coalesce(nullif(current_setting('request.headers',true),''),'{}')::jsonb;
 -- Supabase's Cloudflare ingress overwrites this header. Do not use user-supplied X-Forwarded-For.
 IF nullif(h->>'cf-connecting-ip','') IS NULL THEN RETURN 900; END IF;
 BEGIN ip:=(h->>'cf-connecting-ip')::inet; EXCEPTION WHEN invalid_text_representation THEN RETURN 900; END;
 -- Group IPv6 addresses by /64 to avoid bypass by rotating addresses in the same subnet.
 IF family(ip)=6 THEN ip:=network(set_masklen(ip,64)); END IF;
 SELECT secret INTO STRICT k FROM kaftan_private.portal_ip_key WHERE singleton;
 digest:=encode(extensions.hmac(convert_to(ip::text,'UTF8'),k,'sha256'),'hex');
 DELETE FROM kaftan_private.portal_ip_limits WHERE window_start<now_at-interval '24 hours' AND ip_hash IN (SELECT ip_hash FROM kaftan_private.portal_ip_limits WHERE window_start<now_at-interval '24 hours' ORDER BY window_start LIMIT 100);
 INSERT INTO kaftan_private.portal_ip_limits(ip_hash,window_start,calls) VALUES(digest,now_at,1)
 ON CONFLICT(ip_hash) DO UPDATE SET
 calls=CASE WHEN portal_ip_limits.window_start<=now_at-interval '15 minutes' THEN 1 ELSE least(portal_ip_limits.calls+1,31) END,
 window_start=CASE WHEN portal_ip_limits.window_start<=now_at-interval '15 minutes' THEN now_at ELSE portal_ip_limits.window_start END
 RETURNING calls,window_start INTO n,started;
 IF n>30 THEN RETURN greatest(1,ceil(extract(epoch FROM started+interval '15 minutes'-now_at))::integer); END IF;
 RETURN 0;
END;
$$;
REVOKE ALL ON FUNCTION kaftan_private.limit_portal_ip() FROM PUBLIC,anon,authenticated,service_role;

-- Keep the existing PIN/hash/account-lock logic as an unexposed helper.
DO $$
DECLARE definition text;
BEGIN
 IF to_regprocedure('kaftan_private.partner_dashboard(text,text)') IS NULL THEN
  definition:=pg_get_functiondef('public.get_partner_portal(text,text)'::regprocedure);
  definition:=replace(definition,'public.get_partner_portal','kaftan_private.partner_dashboard');
  EXECUTE definition;
 END IF;
END;
$$;
REVOKE ALL ON FUNCTION kaftan_private.partner_dashboard(text,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.get_partner_portal(p_code text,p_pin text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE wait_seconds integer;
BEGIN
 wait_seconds:=kaftan_private.limit_portal_ip();
 IF wait_seconds>0 THEN
  PERFORM set_config('response.status','429',true);
  PERFORM set_config('response.headers',json_build_array(json_build_object('Retry-After',wait_seconds::text))::text,true);
  RETURN json_build_object('success',false,'message','Please try again later.','retry_after',wait_seconds);
 END IF;
 RETURN kaftan_private.partner_dashboard(p_code,p_pin);
END;
$$;
REVOKE ALL ON FUNCTION public.get_partner_portal(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_partner_portal(text,text) TO anon,authenticated,service_role;
COMMIT;
SELECT 'IP limiter installed; existing account/PIN checks preserved' AS result;

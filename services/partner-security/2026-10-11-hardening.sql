BEGIN;
SET LOCAL lock_timeout='5s';
REVOKE ALL ON public.partners,public.partner_transactions FROM PUBLIC,anon,authenticated;
CREATE UNIQUE INDEX IF NOT EXISTS kaftan_partners_code_upper_unique ON public.partners(upper(code));
CREATE OR REPLACE FUNCTION public.get_partner_portal(p_code text,p_pin text) RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $fn$
DECLARE
 v_partner record; v_partner_id uuid; v_stats record; v_txs json; v_failed integer; v_start timestamptz;
 v_code text:=upper(btrim(coalesce(p_code,'')));
 v_today date:=(clock_timestamp() AT TIME ZONE 'Europe/Budapest')::date;
 v_now timestamptz:=clock_timestamp();
BEGIN
 IF length(v_code)<3 OR length(v_code)>40 OR p_pin IS NULL OR octet_length(p_pin)>72 THEN
  RETURN json_build_object('success',false,'message','Érvénytelen kód vagy PIN kód');
 END IF;
 SELECT id INTO v_partner_id FROM public.partners WHERE upper(code)=v_code;
 IF NOT FOUND THEN RETURN json_build_object('success',false,'message','Érvénytelen kód vagy PIN kód'); END IF;
 INSERT INTO kaftan_private.portal_attempts(code) VALUES(v_code) ON CONFLICT DO NOTHING;
 SELECT failed,window_start INTO v_failed,v_start FROM kaftan_private.portal_attempts WHERE code=v_code FOR UPDATE;
 IF v_start<v_now-interval '15 minutes' THEN
  UPDATE kaftan_private.portal_attempts SET failed=0,window_start=v_now WHERE code=v_code;
  v_failed:=0;
 END IF;
 IF v_failed>=5 THEN RETURN json_build_object('success',false,'message','Érvénytelen kód vagy PIN kód'); END IF;
 SELECT p.* INTO v_partner FROM public.partners p JOIN kaftan_private.partner_credentials c ON c.partner_id=p.id WHERE p.id=v_partner_id AND c.pin_hash=extensions.crypt(p_pin,c.pin_hash);
 IF NOT FOUND THEN
  UPDATE kaftan_private.portal_attempts SET failed=failed+1 WHERE code=v_code;
  RETURN json_build_object('success',false,'message','Érvénytelen kód vagy PIN kód');
 END IF;
 UPDATE kaftan_private.portal_attempts SET failed=0 WHERE code=v_code;
 SELECT count(*) FILTER(WHERE sale_amount_huf>0) AS guests,coalesce(sum(sale_amount_huf),0) AS total_sales,
 coalesce(sum(CASE WHEN status='Kifizetve' THEN commission_huf ELSE 0 END),0) AS paid_comm,
 coalesce(sum(CASE WHEN status<>'Kifizetve' AND sale_amount_huf>0 AND tx_date<=v_today-14 THEN commission_huf ELSE 0 END),0) AS cleared_comm,
 coalesce(sum(CASE WHEN status<>'Kifizetve' AND sale_amount_huf>0 AND tx_date>v_today-14 THEN commission_huf ELSE 0 END),0) AS holding_comm,
 coalesce(sum(CASE WHEN status<>'Kifizetve' AND sale_amount_huf>0 THEN commission_huf ELSE 0 END),0) AS unpaid_comm
 INTO v_stats FROM public.partner_transactions WHERE partner_id=v_partner.id;
 SELECT json_agg(json_build_object('date',to_char(tx_date,'YYYY.MM.DD'),'item',item_description,'amount',sale_amount_huf,'comm',commission_huf,'status',CASE WHEN status='Kifizetve' THEN 'Kifizetve' WHEN sale_amount_huf<=0 AND commission_huf=0 THEN 'Visszatérítve' WHEN tx_date<=v_today-14 THEN 'Kifizethető' ELSE 'Függőben (14 napos garancia)' END) ORDER BY tx_date DESC)
 INTO v_txs FROM public.partner_transactions WHERE partner_id=v_partner.id;
 RETURN json_build_object('success',true,'code',v_partner.code,'name',v_partner.name,'type',v_partner.partner_type,'contact_person',v_partner.contact_person,'phone',v_partner.phone,'iban',v_partner.iban,'contract_url',v_partner.contract_url,'materials',v_partner.materials,'guests',v_stats.guests,'sales',v_stats.total_sales,'cleared',v_stats.cleared_comm,'holding',v_stats.holding_comm,'unpaid',v_stats.unpaid_comm,'paid',v_stats.paid_comm,'txs',coalesce(v_txs,'[]'::json));
END;
$fn$;
REVOKE ALL ON FUNCTION public.get_partner_portal(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_partner_portal(text,text) TO anon,authenticated,service_role;

COMMIT;
SELECT 'partner table grants restricted; unknown-code attempt growth prevented' AS result;

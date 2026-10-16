"""Synthetic CI recovery across two loopback-only PostgreSQL instances."""
import hashlib
import json
import os
import re
from pathlib import Path
import subprocess
import tempfile
from bundle import seal, restore, digest


def run(args, env):
    subprocess.run(args, check=True, env=env, stdout=subprocess.DEVNULL,
                   stderr=subprocess.DEVNULL, timeout=120)


def main():
    # Not an export/restore adapter for production; no caller-supplied host or database.
    if os.environ.get('RECOVERY_REHEARSAL') != 'synthetic-local-only':
        raise SystemExit('Synthetic local opt-in required')
    env = {k: v for k, v in os.environ.items()
           if not k.startswith('PG')}
    env['PGPASSWORD'] = 'ci-only-password'
    source_id = os.environ.get('RECOVERY_SOURCE_CONTAINER', '')
    target_id = os.environ.get('RECOVERY_TARGET_CONTAINER', '')
    if (not re.fullmatch('[a-f0-9]{12,64}', source_id)
            or not re.fullmatch('[a-f0-9]{12,64}', target_id) or source_id == target_id):
        raise SystemExit('Two distinct disposable CI containers required')
    env['DOCKER_HOST'] = 'unix:///var/run/docker.sock'
    env.pop('DOCKER_CONTEXT', None)
    source = ['docker', 'exec', '-e', 'PGPASSWORD=ci-only-password', source_id]
    target = ['docker', 'exec', '-i', '-e', 'PGPASSWORD=ci-only-password', target_id]
    source_psql = [*source, 'psql', '-X', '-v', 'ON_ERROR_STOP=1',
                   '--username=postgres', '--dbname=kaftan_intake_test']
    target_psql = [*target, 'psql', '-X', '-v', 'ON_ERROR_STOP=1',
                   '--username=postgres', '--dbname=kaftan_recovery_test']
    age = os.environ.get('AGE_BIN', 'age')
    keygen = os.environ.get('AGE_KEYGEN_BIN', 'age-keygen')
    with tempfile.TemporaryDirectory(prefix='synthetic-recovery-') as tmp:
        root = Path(tmp)
        payload = root / 'payload'
        (payload / 'database').mkdir(parents=True)
        (payload / 'storage/objects').mkdir(parents=True)
        fixture = """
        INSERT INTO kaftan_intake.partner_inquiries
          (idempotency_key,payload_hash,name,company,email,phone,category,message,
           language,privacy_notice_version,status,created_at)
        SELECT gen_random_uuid(),repeat('a',64),'Synthetic Recovery','Fixture Hotel',
          'synthetic@example.com','','hotel_concierge','synthetic only','en',
          'synthetic-notice',s,clock_timestamp()-interval '91 days'
        FROM unnest(ARRAY['new','signed']) s;
        INSERT INTO kaftan_intake.notification_outbox(inquiry_id)
          SELECT id FROM kaftan_intake.partner_inquiries;
        """
        run([*source_psql, '-c', fixture], env)
        roles = Path('services/partner-intake/supabase/tests/roles.sql').read_bytes()
        (payload / 'database/roles.sql').write_bytes(roles)
        for mode in ('schema', 'data'):
            with (payload / f'database/{mode}.sql').open('wb') as dump:
                subprocess.run([*source, 'pg_dump', '--username=postgres',
                                '--dbname=kaftan_intake_test', '--schema=kaftan_intake',
                                '--no-owner', '--schema-only' if mode == 'schema' else '--data-only'],
                               stdout=dump, stderr=subprocess.DEVNULL, env=env,
                               check=True, timeout=120)
        data = b'SYNTHETIC PRIVATE STORAGE OBJECT\x00\xff'
        (payload / 'storage/objects/fixture.bin').write_bytes(data)
        inventory = {'schema': 1, 'objects': [{
            'bucket': 'partner-contracts', 'object_key': 'synthetic-only.pdf',
            'payload': 'storage/objects/fixture.bin', 'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest()}]}
        (payload / 'storage/manifest.json').write_text(json.dumps(inventory))
        identity = root / 'identity.txt'
        run([keygen, '-o', str(identity)], env)
        public = subprocess.run([keygen, '-y', str(identity)], check=True,
                                env=env, capture_output=True, text=True).stdout
        recipient = root / 'recipient.txt'; recipient.write_text(public)
        result = seal(payload, root / 'backup.age', recipient, age, 'synthetic')
        recovered = root / 'recovered'
        restore(root / 'backup.age', recovered, identity, age, result['encrypted_sha256'])
        for name in ('roles.sql', 'schema.sql', 'data.sql'):
            with (recovered / 'database' / name).open('rb') as sql:
                subprocess.run(target_psql, stdin=sql, env=env, check=True,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=120)
        verification = """
        DO $$ BEGIN
          IF (SELECT count(*) FROM kaftan_intake.partner_inquiries)<>2
            OR (SELECT count(*) FROM kaftan_intake.partner_inquiries WHERE status='signed')<>1
            THEN RAISE EXCEPTION 'Recovered record counts differ'; END IF;
          IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
              WHERE n.nspname='kaftan_intake' AND c.relkind='r' AND c.relrowsecurity)<>4
            OR has_table_privilege('anon','kaftan_intake.partner_inquiries','SELECT')
            OR has_function_privilege('anon','kaftan_intake.purge_expired_inquiries(integer,boolean)','EXECUTE')
            OR NOT has_function_privilege('service_role','kaftan_intake.purge_expired_inquiries(integer,boolean)','EXECUTE')
            THEN RAISE EXCEPTION 'Recovered privacy grants differ'; END IF;
          IF (SELECT eligible_count FROM kaftan_intake.purge_expired_inquiries(100,false))<>1
            THEN RAISE EXCEPTION 'Restored expiry not recognized'; END IF;
          PERFORM kaftan_intake.purge_expired_inquiries(1,true);
          IF (SELECT count(*) FROM kaftan_intake.partner_inquiries)<>1
            OR (SELECT count(*) FROM kaftan_intake.partner_inquiries WHERE status='signed')<>1
            OR (SELECT count(*) FROM kaftan_intake.notification_outbox)<>1
            THEN RAISE EXCEPTION 'Expired inquiry replay or signed loss'; END IF;
        END $$;
        """
        run([*target_psql, '-c', verification], env)
        if digest(recovered / 'storage/objects/fixture.bin') != hashlib.sha256(data).hexdigest():
            raise RuntimeError('Synthetic Storage checksum mismatch')
    print(json.dumps({'synthetic': True, 'separate_postgres_instances': True,
                      'encrypted_round_trip': True, 'rls_grants_verified': True,
                      'signed_preserved_expired_removed': True,
                      'storage_fixture_bytes_verified': True,
                      'live_supabase_storage_or_production_backup': False}))


if __name__ == '__main__':
    main()

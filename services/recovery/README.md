# Encrypted recovery envelope — no production exporter

This package seals an **already exported** database/Storage snapshot with pinned `age` 1.3.2 and verifies recovery offline. It does not connect to production, fetch credentials, upload to Drive, change a database or schedule backup/deletion. Owner selected a private Google Drive destination on 17 October 2026; only ciphertext may leave the trusted environment. The private recovery identity must be held separately, with an independent recovery copy. A key that exists only on the source computer is not disaster recovery.

## Input contract

Use a private staging directory on an encrypted device, outside this repository. It must contain nonempty `database/roles.sql`, `database/schema.sql`, `database/data.sql`, and `storage/manifest.json`. The SQL must come from an authorized, consistent export, not hand-reconstructed application rows. Separately export all required bucket bytes and relevant bucket/policy/platform configuration. API secrets, Vault roots and recovery identities need a distinct custody procedure; do not assume dumps restore them. Production baseline reconciliation in #60 remains necessary.

Store each object under an opaque ASCII payload path such as `storage/objects/<uuid>.bin`. The encrypted Storage manifest is `{schema:1,objects:[{bucket,object_key,payload,bytes,sha256}]}`; bucket is `partner-contracts` or `partner-materials`, `object_key` preserves the original private key, and every object payload must be accounted for with an exact byte size/SHA-256. Real names/paths stay **inside** the encrypted envelope. Optional platform metadata belongs in `configuration/`. The envelope includes its own complete file/hash manifest. At most 4096 entries / 512 MiB uncompressed are accepted; exceeding a limit fails and needs an explicitly reviewed change.

## Offline commands

`python services/recovery/bundle.py --age /verified/path/age seal PRIVATE_EXPORT_DIR PRIVATE_OUTPUT.age --recipient-file PUBLIC_RECIPIENT.txt --scope production`

For synthetic rehearsals choose `--scope synthetic`; it is never inferred to be a real production backup. Keep the returned ciphertext SHA-256 in an independently trusted private recovery ledger. A public recipient encrypts but cannot decrypt. No recipient/identity/credentials are bundled in the repository.

`python services/recovery/bundle.py --age /verified/path/age restore DOWNLOADED.age NEW_PRIVATE_DIR --identity PRIVATE_IDENTITY.txt --expected-sha256 TRUSTED_CIPHERTEXT_SHA256`

The expected hash must come from the trusted ledger, not be recomputed from an untrusted download as an approval shortcut. Age provides encryption/integrity, **not sender identity**; anyone knowing a public recipient can construct a different encrypted file. SHA-256 pinning to a trusted record addresses substitution. The tool refuses an existing target/backup, checks ciphertext before decryption, verifies every inner file before extraction, rejects traversal/case collisions/symlinks/hard-linked inputs, and never executes recovered SQL. Caller must keep plaintext export, temporary and recovery directories private; Windows ACLs are not configured by this portable tool. Temporary cleanup is not a claim of forensic secure erase.

## Verification and boundaries

`python -m unittest discover -s services/recovery -p test_bundle.py -v` uses fake SQL/bytes and temporary test identities. It covers binary integrity, missing components, inventory mismatch, overwritten destinations, private identity exclusion, unsafe paths, wrong keys and ciphertext tampering.

Both PR/Pages `intake-db` jobs download the official Linux age archive and verify pinned SHA-256 before use. They also run `rehearse.py` against **two separate disposable PostgreSQL 17 containers**. Native pg_dump/psql inside those containers avoid client/server version mismatch. The source has two fake 91-day enquiries (unsigned/signed) and fake outbox entries. After SQL export → encrypted envelope → verified extraction → fresh roles/schema/data restore, the second database must preserve counts/RLS/grants, recognize expiry, remove only the expired unsigned enquiry and its outbox marker, and preserve the signed record. Binary synthetic contract bytes must match. No production host, cloud credential, email delivery or cloud upload is used by CI.

This demonstrates the mechanism, not an actual Supabase project/Storage restore, production baseline completeness, processor approval, independent key custody, daily schedule, failed-run alert or expiry of Drive versions/trash. Drive round trips and real production recovery must be recorded separately. No automatic backup pruning or real enquiry deletion is enabled. Continue #60 and #48 until those acceptance criteria are met.

Sources: [age official release](https://github.com/FiloSottile/age/releases/tag/v1.3.2), [Supabase supported backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore), [Storage backup boundary](https://supabase.com/docs/guides/platform/backups). Native tools/credentials needed for a real export must be configured through an authorized secure channel; never paste database passwords or server secrets in a chat, PR, Actions log or browser bundle.

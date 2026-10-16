import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile
import unittest
import zipfile
from bundle import BackupError, seal, restore, verify_zip, digest, safe_name, MANIFEST


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / 'source'
        (self.source / 'database').mkdir(parents=True)
        for name in ('roles.sql', 'schema.sql', 'data.sql'):
            (self.source / 'database' / name).write_text('-- synthetic fixture only\n')
        (self.source / 'storage/objects').mkdir(parents=True)
        data = bytes(range(256))
        (self.source / 'storage/objects/fixture.bin').write_bytes(data)
        self.inventory = {'schema': 1, 'objects': [{
            'bucket': 'partner-contracts', 'object_key': 'synthetic-only.pdf',
            'payload': 'storage/objects/fixture.bin', 'bytes': len(data),
            'sha256': hashlib.sha256(data).hexdigest()}]}
        self.write_inventory()
        self.age = os.environ.get('AGE_BIN', 'age')
        keygen = os.environ.get('AGE_KEYGEN_BIN', 'age-keygen')
        self.identity = self.root / 'identity.txt'
        subprocess.run([keygen, '-o', str(self.identity)], check=True,
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        public = subprocess.run([keygen, '-y', str(self.identity)], check=True,
                                capture_output=True, text=True).stdout
        self.recipient = self.root / 'recipient.txt'
        self.recipient.write_text(public)
        self.output = self.root / 'backup.age'

    def write_inventory(self):
        (self.source / 'storage/manifest.json').write_text(json.dumps(self.inventory))

    def encrypt(self):
        return seal(self.source, self.output, self.recipient, self.age, 'synthetic')

    def test_round_trip_includes_binary_storage_and_sql(self):
        result = self.encrypt()
        self.assertEqual(result['scope'], 'synthetic')
        target = self.root / 'restored'
        restored = restore(self.output, target, self.identity, self.age, result['encrypted_sha256'])
        self.assertFalse(restored['database_executed'])
        self.assertEqual(restored['verified_files'], 5)
        for p in self.source.rglob('*'):
            if p.is_file():
                self.assertEqual(p.read_bytes(), (target / p.relative_to(self.source)).read_bytes())

    def test_wrong_key_and_changed_ciphertext_fail_before_restore(self):
        result = self.encrypt()
        other = self.root / 'not-an-identity.txt'
        other.write_text('invalid identity')
        target = self.root / 'refused'
        with self.assertRaises(BackupError):
            restore(self.output, target, other, self.age, result['encrypted_sha256'])
        self.assertFalse(target.exists())
        content = bytearray(self.output.read_bytes()); content[-10] ^= 1
        self.output.write_bytes(content)
        with self.assertRaisesRegex(BackupError, 'untrusted_ciphertext'):
            restore(self.output, target, self.identity, self.age, result['encrypted_sha256'])
        # Even if a caller supplies the changed digest, authenticated decryption refuses it.
        with self.assertRaisesRegex(BackupError, 'encryption_tool_failed'):
            restore(self.output, target, self.identity, self.age, digest(self.output))
        self.assertFalse(target.exists())

    def test_no_overwrite_or_unpinned_restore(self):
        result = self.encrypt()
        with self.assertRaises(BackupError):
            self.encrypt()
        with self.assertRaises(BackupError):
            restore(self.output, self.source, self.identity, self.age, result['encrypted_sha256'])
        with self.assertRaises(BackupError):
            restore(self.output, self.root / 'new', self.identity, self.age, '')

    def test_missing_sql_and_storage_mismatch_refused(self):
        (self.source / 'database/roles.sql').unlink()
        with self.assertRaisesRegex(BackupError, 'incomplete_backup'):
            self.encrypt()
        (self.source / 'database/roles.sql').write_text('-- fixture')
        self.inventory['objects'][0]['sha256'] = '0' * 64
        self.write_inventory()
        with self.assertRaisesRegex(BackupError, 'storage_inventory_mismatch'):
            self.encrypt()
        self.assertFalse(self.output.exists())

    def test_private_identity_never_becomes_payload(self):
        (self.source / 'database/roles.sql').write_text('AGE-SECRET-KEY-' + 'FIXTURE')
        with self.assertRaisesRegex(BackupError, 'identity_in_payload'):
            self.encrypt()

    def test_paths_and_linked_inputs_refused(self):
        for name in ('../escape', '/absolute', 'a/../b', 'a\\b', 'a//b', 'CON.txt', 'a/COM1', 'a/.'):
            with self.subTest(name=name), self.assertRaises(BackupError):
                safe_name(name)
        try:
            os.link(self.source / 'database/data.sql', self.source / 'database/link.sql')
        except OSError:
            self.skipTest('hard links unavailable')
        with self.assertRaisesRegex(BackupError, 'unexpected_source'):
            self.encrypt()

    def test_unsafe_zip_is_never_extracted(self):
        malicious = self.root / 'malicious.zip'
        with zipfile.ZipFile(malicious, 'w') as z:
            z.writestr('../escape', 'untrusted')
            z.writestr(MANIFEST, '{}')
        with self.assertRaises(BackupError):
            verify_zip(malicious)


if __name__ == '__main__':
    unittest.main()

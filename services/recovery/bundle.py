"""Offline backup envelope. Never connects to a database, Drive or Storage."""
import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import stat
import subprocess
import tempfile
import zipfile

PROJECT = 'bezlzeojivucnqkfjpwo'
LIMIT = 512 * 1024 * 1024
FILE_LIMIT = 4096
REQUIRED = {'database/roles.sql', 'database/schema.sql', 'database/data.sql', 'storage/manifest.json'}
MANIFEST = 'recovery-manifest.json'


class BackupError(Exception):
    pass


def digest(file):
    h = hashlib.sha256()
    with open(file, 'rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def safe_name(name):
    p = PurePosixPath(name)
    if (not re.fullmatch(r'[A-Za-z0-9_./-]+', name) or p.is_absolute()
            or '..' in p.parts or '.' in p.parts or p.as_posix() != name
            or any(part.endswith(('.', ' ')) or part.split('.')[0].upper() in
                   {'CON', 'PRN', 'AUX', 'NUL', *(f'COM{i}' for i in range(1, 10)),
                    *(f'LPT{i}' for i in range(1, 10))} for part in p.parts)):
        raise BackupError('unsafe_archive_path')
    return p


def age_run(executable, args):
    try:
        result = subprocess.run([str(executable), *map(str, args)],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                timeout=120, check=False)
    except (OSError, subprocess.TimeoutExpired):
        raise BackupError('encryption_tool_failed') from None
    if result.returncode != 0:
        raise BackupError('encryption_tool_failed')


def verify_zip(file):
    with zipfile.ZipFile(file) as z:
        entries = z.infolist()
        if not 1 < len(entries) <= FILE_LIMIT or sum(e.file_size for e in entries) > LIMIT:
            raise BackupError('archive_limits')
        names = set()
        for entry in entries:
            safe_name(entry.filename)
            if (entry.filename.casefold() in names or entry.is_dir()
                    or stat.S_ISLNK(entry.external_attr >> 16)
                    or entry.flag_bits & 1):
                raise BackupError('invalid_archive_entry')
            names.add(entry.filename.casefold())
        if MANIFEST not in z.namelist() or z.getinfo(MANIFEST).file_size > 1024 * 1024:
            raise BackupError('missing_manifest')
        manifest = json.loads(z.read(MANIFEST))
        if (manifest.get('schema') != 1 or manifest.get('project') != PROJECT
                or manifest.get('scope') not in ('synthetic', 'production')
                or not isinstance(manifest.get('files'), dict)):
            raise BackupError('invalid_manifest')
        files = manifest['files']
        if not REQUIRED <= set(files) or set(z.namelist()) != set(files) | {MANIFEST}:
            raise BackupError('incomplete_backup')
        for name, expected in files.items():
            if (not isinstance(expected, dict) or type(expected.get('bytes')) is not int
                    or not isinstance(expected.get('sha256'), str)
                    or not re.fullmatch('[a-f0-9]{64}', expected['sha256'])):
                raise BackupError('invalid_manifest')
            info = z.getinfo(name)
            if info.file_size != expected['bytes']:
                raise BackupError('integrity_mismatch')
            h = hashlib.sha256()
            with z.open(name) as stream:
                for block in iter(lambda: stream.read(1024 * 1024), b''):
                    h.update(block)
            if h.hexdigest() != expected['sha256']:
                raise BackupError('integrity_mismatch')
        for name in REQUIRED:
            if not files[name]['bytes']:
                raise BackupError('empty_required_component')
        if z.getinfo('storage/manifest.json').file_size > 1024 * 1024:
            raise BackupError('invalid_storage_manifest')
        storage = json.loads(z.read('storage/manifest.json'))
        if storage.get('schema') != 1 or not isinstance(storage.get('objects'), list):
            raise BackupError('invalid_storage_manifest')
        paths = set()
        for obj in storage['objects']:
            name = obj.get('payload')
            if (not isinstance(name, str) or not name.startswith('storage/objects/')
                    or name in paths or obj.get('bucket') not in ('partner-contracts', 'partner-materials')
                    or not isinstance(obj.get('object_key'), str) or not obj['object_key']
                    or name not in files or obj.get('sha256') != files[name]['sha256']
                    or obj.get('bytes') != files[name]['bytes']):
                raise BackupError('storage_inventory_mismatch')
            paths.add(name)
        if paths != {name for name in files if name.startswith('storage/objects/')}:
            raise BackupError('storage_inventory_mismatch')
        return manifest


def seal(source, output, recipient_file, age, scope):
    source, output = Path(source).resolve(), Path(output).absolute()
    if scope not in ('synthetic', 'production') or output.suffix != '.age' or output.exists():
        raise BackupError('invalid_output_or_scope')
    # A private key is never a backup payload. Public recipients may be stored separately.
    recipient = Path(recipient_file).read_text(encoding='utf-8').strip()
    if not re.fullmatch(r'age1[0-9a-z]{58}', recipient):
        raise BackupError('invalid_recipient')
    if output.resolve().is_relative_to(source):
        raise BackupError('output_inside_payload')
    files = {}
    total = 0
    for p in source.rglob('*'):
        if p.is_symlink() or (hasattr(p, 'is_junction') and p.is_junction()):
            raise BackupError('linked_source')
        if p.is_dir():
            continue
        name = p.relative_to(source).as_posix()
        safe_name(name)
        if (not p.is_file() or p.stat().st_nlink != 1 or name == MANIFEST
                or name.split('/')[0] not in ('database', 'storage', 'configuration')):
            raise BackupError('unexpected_source')
        size = p.stat().st_size
        total += size
        if total > LIMIT or len(files) >= FILE_LIMIT - 1:
            raise BackupError('archive_limits')
        with p.open('rb') as stream:
            for block in iter(lambda: stream.read(1024 * 1024), b''):
                if b'AGE-SECRET-KEY-' in block:
                    raise BackupError('identity_in_payload')
        files[name] = {'bytes': size, 'sha256': digest(p)}
    manifest = {'schema': 1, 'project': PROJECT, 'scope': scope, 'files': files}
    # Caller must keep output.parent private: plaintext temporary ZIP inherits its ACL.
    with tempfile.TemporaryDirectory(prefix='seal-', dir=output.parent) as temp:
        archive = Path(temp) / 'payload.zip'
        with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as z:
            for name in sorted(files):
                z.write(source / name, name)
            z.writestr(MANIFEST, json.dumps(manifest, sort_keys=True))
        verify_zip(archive)
        encrypted = Path(temp) / 'sealed.age'
        age_run(age, ['-r', recipient, '-o', encrypted, archive])
        # Exclusive create prevents replacing an existing recovery point.
        try:
            with encrypted.open('rb') as src, output.open('xb') as dst:
                shutil.copyfileobj(src, dst)
        except FileExistsError:
            raise BackupError('output_exists') from None
    return {'schema': 1, 'project': PROJECT, 'scope': scope,
            'file_count': len(files), 'encrypted_sha256': digest(output)}


def restore(archive, output, identity, age, expected_sha256):
    archive, output = Path(archive), Path(output).absolute()
    if (archive.stat().st_size > LIMIT + 16 * 1024 * 1024
            or not re.fullmatch('[a-f0-9]{64}', expected_sha256)
            or digest(archive) != expected_sha256):
        raise BackupError('untrusted_ciphertext')
    if output.exists():
        raise BackupError('restore_destination_exists')
    with tempfile.TemporaryDirectory(prefix='restore-', dir=output.parent) as temp:
        plain = Path(temp) / 'payload.zip'
        age_run(age, ['-d', '-i', identity, '-o', plain, archive])
        manifest = verify_zip(plain)
        stage = Path(temp) / 'verified'
        stage.mkdir(mode=0o700)
        with zipfile.ZipFile(plain) as z:
            for name in manifest['files']:
                target = stage.joinpath(*safe_name(name).parts)
                target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                with z.open(name) as src, target.open('xb') as dst:
                    shutil.copyfileobj(src, dst)
        stage.rename(output)
    return {'schema': 1, 'project': PROJECT, 'scope': manifest['scope'],
            'verified_files': len(manifest['files']), 'database_executed': False}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--age', default=os.environ.get('AGE_BIN', 'age'))
    sub = parser.add_subparsers(dest='command', required=True)
    p = sub.add_parser('seal')
    p.add_argument('source'); p.add_argument('output'); p.add_argument('--recipient-file', required=True)
    p.add_argument('--scope', choices=['synthetic', 'production'], required=True)
    p = sub.add_parser('restore')
    p.add_argument('archive'); p.add_argument('output'); p.add_argument('--identity', required=True)
    p.add_argument('--expected-sha256', required=True)
    a = parser.parse_args()
    try:
        if a.command == 'seal':
            result = seal(a.source, a.output, a.recipient_file, a.age, a.scope)
        else:
            result = restore(a.archive, a.output, a.identity, a.age, a.expected_sha256)
        print(json.dumps(result))
    except (BackupError, OSError, ValueError, KeyError, TypeError, zipfile.BadZipFile):
        parser.exit(1, 'Backup operation refused; no successful recovery claimed.\n')


if __name__ == '__main__':
    main()

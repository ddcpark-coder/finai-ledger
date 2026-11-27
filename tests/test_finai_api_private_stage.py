import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import stat
import tarfile
import tempfile
import unittest
from unittest import mock
import zipfile


SCRIPT = Path(__file__).resolve().parents[1] / 'ops' / 'finai-api-private-stage.py'
SPEC = importlib.util.spec_from_file_location('finai_private_stage', SCRIPT)
stage = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(stage)
COMMIT = 'a' * 40


def synthetic_bundle(marker_commit=COMMIT):
    marker = json.dumps({'application': 'finai-ledger-api', 'commit': marker_commit}).encode()
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode='w:gz') as archive:
        member = tarfile.TarInfo('public/finai-api-build.json')
        member.size = len(marker)
        archive.addfile(member, io.BytesIO(marker))
    release = buffer.getvalue()
    release_sha = hashlib.sha256(release).hexdigest()
    manifest = json.dumps({'application': 'finai-laravel-private', 'commit': COMMIT,
                           'archive_sha256': release_sha}).encode()
    manifest_sha = hashlib.sha256(manifest).hexdigest()
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w') as outer:
        outer.writestr('finai-laravel-private.tar.gz', release)
        outer.writestr('finai-laravel-manifest.json', manifest)
        outer.writestr('finai-laravel-private.sha256',
                       release_sha + '  finai-laravel-private.tar.gz\n')
    data = buffer.getvalue()
    return data, hashlib.sha256(data).hexdigest(), release_sha, manifest_sha, release, manifest


class PrivateStageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        self.root.chmod(0o700)
        self.addCleanup(self.temp.cleanup)

    def test_verified_bundle_stages_exact_private_files(self):
        data, outer, inner, manifest_hash, release, manifest = synthetic_bundle()
        files = stage.verified_bundle(data, COMMIT, outer, inner, manifest_hash)
        self.assertEqual(files, (release, manifest))
        (self.root / 'existing').write_text('preserved')
        names = stage.stage_verified(self.root, os.getuid(), COMMIT, *files)
        self.assertEqual((self.root / names[0]).read_bytes(), release)
        self.assertEqual((self.root / names[1]).read_bytes(), manifest)
        self.assertEqual((self.root / 'existing').read_text(), 'preserved')
        self.assertEqual(stat.S_IMODE((self.root / names[0]).stat().st_mode), 0o600)
        self.assertFalse(list(self.root.glob('.finai-stage-*')))

    def test_wrong_digest_and_marker_are_denied(self):
        data, outer, inner, manifest_hash, _, _ = synthetic_bundle()
        with self.assertRaises(stage.Denied):
            stage.verified_bundle(data, COMMIT, '0' * 64, inner, manifest_hash)
        data, outer, inner, manifest_hash, _, _ = synthetic_bundle(marker_commit='b' * 40)
        with self.assertRaises(stage.Denied):
            stage.verified_bundle(data, COMMIT, outer, inner, manifest_hash)
        self.assertEqual(list(self.root.iterdir()), [])

    def test_existing_file_or_link_is_never_overwritten(self):
        data, outer, inner, manifest_hash, _, _ = synthetic_bundle()
        files = stage.verified_bundle(data, COMMIT, outer, inner, manifest_hash)
        target = self.root / ('finai-api-' + COMMIT[:12] + '-package.tar.gz')
        target.write_bytes(b'original')
        with self.assertRaises(stage.Denied):
            stage.stage_verified(self.root, os.getuid(), COMMIT, *files)
        self.assertEqual(target.read_bytes(), b'original')
        target.unlink()
        target.symlink_to(self.root / 'missing')
        with self.assertRaises(stage.Denied):
            stage.stage_verified(self.root, os.getuid(), COMMIT, *files)
        self.assertTrue(target.is_symlink())

    def test_partial_commit_is_rolled_back_without_touching_existing_files(self):
        data, outer, inner, manifest_hash, _, _ = synthetic_bundle()
        files = stage.verified_bundle(data, COMMIT, outer, inner, manifest_hash)
        existing = self.root / 'unrelated'
        existing.write_text('preserved')
        original_link = os.link
        calls = []

        def fail_second_link(*args, **kwargs):
            calls.append(1)
            if len(calls) == 2:
                raise OSError('synthetic failure')
            return original_link(*args, **kwargs)

        with mock.patch.object(stage.os, 'link', side_effect=fail_second_link):
            with self.assertRaises(OSError):
                stage.stage_verified(self.root, os.getuid(), COMMIT, *files)
        self.assertEqual([p.name for p in self.root.iterdir()], ['unrelated'])
        self.assertEqual(existing.read_text(), 'preserved')

    def test_non_private_and_linked_destinations_are_denied(self):
        self.root.chmod(0o755)
        with self.assertRaises(stage.Denied):
            stage.open_private_directory(self.root, os.getuid())
        self.root.chmod(0o700)
        link = self.root.parent / (self.root.name + '-link')
        link.symlink_to(self.root, target_is_directory=True)
        self.addCleanup(link.unlink)
        with self.assertRaises(stage.Denied):
            stage.open_private_directory(link, os.getuid())

    def test_non_platform_download_sources_are_denied(self):
        for url in ('http://sdmntprtest.oaiusercontent.com/x',
                    'https://example.com/x',
                    'https://sdmntprtest.oaiusercontent.com.example.com/x'):
            with self.subTest(url=url), self.assertRaises(stage.Denied):
                stage.download_private_artifact(url)


if __name__ == '__main__':
    unittest.main()

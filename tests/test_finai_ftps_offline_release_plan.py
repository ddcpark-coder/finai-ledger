#!/usr/bin/env python3
"""Synthetic offline-only tests for FinAI release staging planner."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "ops" / "finai-ftps-offline-release-plan.py"
spec = importlib.util.spec_from_file_location("finai_ftp_plan", SCRIPT)
plan = importlib.util.module_from_spec(spec)
spec.loader.exec_module(plan)

MAIN = b"<!DOCTYPE html><html>" + b"FinAI" * 50 + b"</html>"
ASSET = b"console.log('synthetic FinAI');"
FILES = {"index.html": MAIN, "_next/static/finai.js": ASSET}


def generate(root: Path, *, files=None, tar_members=None, manifest_override=None):
    files = FILES if files is None else files
    archive = root / "archive.tar.gz"
    manifest = root / "manifest.json"
    with tarfile.open(archive, mode="w:gz") as tar:
        # GNU tar -C out . includes this legal root directory entry.
        root_member = tarfile.TarInfo(".")
        root_member.type = tarfile.DIRTYPE
        tar.addfile(root_member)
        for name, data, kind in (tar_members or [(name, content, "file") for name, content in files.items()]):
            member = tarfile.TarInfo("./" + name)
            if kind == "symlink":
                member.type = tarfile.SYMTYPE
                member.linkname = "../../other-project"
                member.size = 0
                tar.addfile(member)
            else:
                member.size = len(data)
                tar.addfile(member, io.BytesIO(data))
    rows = [
        {"path": name, "size": len(value), "sha256": hashlib.sha256(value).hexdigest()}
        for name, value in sorted(files.items())
    ]
    content = {
        "format": "finai-static-manifest-v1",
        "file_count": len(rows),
        "total_bytes": sum(row["size"] for row in rows),
        "files": rows,
    }
    if manifest_override is not None:
        manifest_override(content)
    manifest.write_text(json.dumps(content), encoding="utf-8")
    return archive, manifest


class StagingPlanTests(unittest.TestCase):
    def test_valid_archive_produces_full_scoped_plan(self):
        with tempfile.TemporaryDirectory() as td:
            archive, manifest = generate(Path(td))
            result = plan.make_plan(archive, manifest)
            self.assertEqual(result["format"], "finai-offline-staging-plan-v1")
            self.assertEqual(result["host_writes"], "DISABLED")
            self.assertEqual(result["transport"], "NOT_CONFIGURED")
            self.assertEqual(result["release_sha256"], plan.sha_file(archive))
            self.assertEqual(result["file_count"], len(FILES))
            self.assertEqual({f["path"] for f in result["files"]}, set(FILES))
            self.assertTrue(all(
                f["relative_stage_path"].startswith(
                    "releases/" + result["release_sha256"] + "/"
                ) for f in result["files"]
            ))

    def test_payload_tampering_denied(self):
        with tempfile.TemporaryDirectory() as td:
            archive, manifest = generate(
                Path(td),
                tar_members=[
                    ("index.html", MAIN, "file"),
                    ("_next/static/finai.js", ASSET + b"x", "file")
                ],
            )
            with self.assertRaises(plan.InvalidPlan):
                plan.make_plan(archive, manifest)

    def test_symlink_path_escape_and_unknown_file_denied(self):
        for extra in [
            ("_next/static/other.js", b"", "symlink"),
            ("../external-file", b"escape", "file"),
            (".htaccess", b"config", "file"),
            ("another.js", b"unlisted", "file"),
        ]:
            with self.subTest(extra=extra[0]), tempfile.TemporaryDirectory() as td:
                extra_members = [(name, data, "file") for name, data in FILES.items()]
                archive, manifest = generate(Path(td), tar_members=extra_members + [extra])
                with self.assertRaises(plan.InvalidPlan):
                    plan.make_plan(archive, manifest)

    def test_duplicate_and_case_collisions_denied(self):
        for extra in [("index.html", MAIN, "file"), ("INDEX.HTML", MAIN, "file")]:
            with self.subTest(extra=extra[0]), tempfile.TemporaryDirectory() as td:
                members = [(name, data, "file") for name, data in FILES.items()]
                archive, manifest = generate(Path(td), tar_members=members + [extra])
                with self.assertRaises(plan.InvalidPlan):
                    plan.make_plan(archive, manifest)

    def test_manifest_mismatches_denied(self):
        for change in [
            lambda x: x.update(file_count=10),
            lambda x: x.update(total_bytes=10),
            lambda x: x["files"][0].update(sha256="f" * 64),
            lambda x: x["files"][0].update(path=".."),
        ]:
            with tempfile.TemporaryDirectory() as td:
                archive, manifest = generate(Path(td), manifest_override=change)
                with self.assertRaises(plan.InvalidPlan):
                    plan.make_plan(archive, manifest)

    def test_output_is_local_and_never_overwrites(self):
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            archive, manifest = generate(root)
            output = root / "plan.json"
            cmd = [sys.executable, "-B", str(SCRIPT), "--archive", str(archive),
                   "--manifest", str(manifest), "--output", str(output)]
            first = subprocess.run(cmd, capture_output=True, text=True)
            self.assertEqual(first.returncode, 0, first.stderr)
            self.assertIn("FINAI_REMOTE_WRITE=DISABLED", first.stdout)
            self.assertEqual(json.loads(output.read_text())["host_writes"], "DISABLED")
            second = subprocess.run(cmd, capture_output=True, text=True)
            self.assertEqual(second.returncode, 64)


if __name__ == "__main__":
    unittest.main()

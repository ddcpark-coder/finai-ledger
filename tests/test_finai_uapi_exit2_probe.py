#!/usr/bin/env python3
import importlib.util
from pathlib import Path
from unittest import TestCase, main, mock

path = Path(__file__).resolve().parents[1] / "ops" / "finai-uapi-exit2-probe.py"
spec = importlib.util.spec_from_file_location("finai_uapi_exit2_probe", path)
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)


class ProbeTests(TestCase):
    def test_classify_does_not_expose_private_text(self):
        self.assertEqual(mod.classify(b"Permission denied for secret@mail.example"), "permission_denied")
        self.assertEqual(mod.classify(b"Fatal: must be root to use --user"), "privilege_or_root")
        self.assertEqual(mod.classify(b"Unknown option --output"), "cli_usage")
        self.assertEqual(mod.classify(b"secrettextunique"), "unclassified")

    def test_runner_does_not_print_response(self):
        resp = mock.Mock(returncode=2, stdout=b"private_account_token=DO-NOT-PRINT",
                         stderr=b"secretpassword=DO-NOT-PRINT")
        import io
        from contextlib import redirect_stdout
        buf = io.StringIO()
        with mock.patch.object(mod.subprocess, "run", return_value=resp) as p:
            with redirect_stdout(buf):
                mod.run("test", (mod.UAPI, "--output=json", "DomainInfo", "list_domains"))
        self.assertNotIn("DO-NOT-PRINT", buf.getvalue())
        self.assertIn("exit=2", buf.getvalue())
        self.assertIs(p.call_args.kwargs["shell"], False)

    def test_scope_constants(self):
        self.assertEqual(mod.USER, "laskot48")
        self.assertEqual(mod.ZONE, "e-integrator.si")
        self.assertEqual(mod.UAPI, "/usr/local/cpanel/bin/uapi")


if __name__ == "__main__":
    main()

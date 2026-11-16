using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace EIntegrator.Desktop;

/// <summary>
/// Test-only installed EXE entrypoint. First install seeds an encrypted SQLite3MC
/// ledger in disposable GitHub runner storage, then an identical Inno Setup
/// reinstall MUST preserve the same ledger, company and portable recovery.
/// Never accepts an arbitrary filesystem path and never runs outside CI.
/// </summary>
internal static class OfflineInstallerUpgradeQa
{
    private const string Admin = "qa.installer";
    private const string Password = "SYNTHETIC-QA-UPGRADE-PASSPHRASE-NOT-REAL-2026";
    private const string RecoveryPhrase = "SYNTHETIC-QA-PORTABLE-RECOVERY-NOT-REAL-2026";

    private static string RequireIsolatedRoot()
    {
        if (Environment.GetEnvironmentVariable("GITHUB_ACTIONS") != "true" ||
            Environment.GetEnvironmentVariable("CI") != "true")
            throw new UnauthorizedAccessException("Only isolated GitHub QA runner may seed upgrade fixture");
        var runnerTemp = Environment.GetEnvironmentVariable("RUNNER_TEMP");
        if (string.IsNullOrWhiteSpace(runnerTemp) ||
            !Directory.Exists(runnerTemp) ||
            new DirectoryInfo(runnerTemp).Attributes.HasFlag(FileAttributes.ReparsePoint))
            throw new IOException("Isolated runner temporary storage unavailable");
        return Path.Combine(Path.GetFullPath(runnerTemp), "finai-synthetic-installer-upgrade-v1");
    }

    public static bool Seed()
    {
        var root = RequireIsolatedRoot();
        if (Directory.Exists(root) || File.Exists(root))
            throw new IOException("Never replace an existing isolated test fixture");
        Directory.CreateDirectory(root);
        var original = Path.Combine(root, "encrypted-vault");
        var backup = Path.Combine(root, "recovery.finai");
        using (var ledger = EncryptedLedgerStore.CreateNew(original, Admin, Password))
        {
            var admin = ledger.Authenticate(Admin, Password);
            if (admin is null) return false;
            var company = ledger.CreateCompany(admin, "SYNTHETIC-UPGRADE-COMPANY-A");
            var other = ledger.CreateCompany(admin, "SYNTHETIC-UPGRADE-COMPANY-B");
            var id = ledger.SaveSyntheticOrderDraft(admin, company,
                Guid.Parse("0165a476-1da8-480b-8958-2126b0dd1a16").ToString("D"),
                "SYN-UPGRADE-001", 4, 12345);
            if (ledger.ListSyntheticOrderDrafts(admin, other).Count != 0 ||
                !ledger.VerifyRecoveryIntegrity() || !ledger.VerifyAudit(admin, company))
                return false;
            PortableEncryptedLedgerBackup.Export(ledger, backup, RecoveryPhrase);
            // Only IDs and checksums of strictly synthetic data, never raw keys.
            var digest = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(backup)));
            File.WriteAllLines(Path.Combine(root, "expected.txt"), [company, other, id, digest],
                Encoding.ASCII);
        }
        return File.Exists(Path.Combine(original, "secure-ledger.db")) &&
            File.Exists(backup);
    }

    public static bool VerifyAfterReinstall()
    {
        var root = RequireIsolatedRoot();
        var original = Path.Combine(root, "encrypted-vault");
        var backup = Path.Combine(root, "recovery.finai");
        var expectedPath = Path.Combine(root, "expected.txt");
        if (!File.Exists(expectedPath) || !File.Exists(backup))
            return false;
        var expected = File.ReadAllLines(expectedPath, Encoding.ASCII);
        if (expected.Length != 4 || expected.Any(string.IsNullOrWhiteSpace))
            return false;
        var digest = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(backup)));
        if (!CryptographicOperations.FixedTimeEquals(
            Convert.FromHexString(digest), Convert.FromHexString(expected[3])))
            return false;

        using (var ledger = EncryptedLedgerStore.OpenExisting(original))
        {
            var admin = ledger.Authenticate(Admin, Password);
            if (admin is null || !ledger.VerifyRecoveryIntegrity() ||
                !ledger.VerifyAudit(admin, expected[0]) ||
                ledger.ListSyntheticCompanies(admin).Count != 2 ||
                ledger.ListSyntheticOrderDrafts(admin, expected[1]).Count != 0)
                return false;
            var rows = ledger.ListSyntheticOrderDrafts(admin, expected[0]);
            if (rows.Count != 1 || rows[0].DraftId != expected[2] ||
                rows[0].Sku != "SYN-UPGRADE-001" ||
                rows[0].Quantity != 4 || rows[0].TotalCents != 49380)
                return false;
        }

        // Portable recovery must remain usable after setup reinstall, with
        // zero overwrites of existing encrypted databases or other profiles.
        var restored = Path.Combine(root, "restored-vault");
        PortableEncryptedLedgerBackup.RestoreIntoNewDirectory(backup, restored, RecoveryPhrase);
        using var opened = EncryptedLedgerStore.OpenExisting(restored);
        var recoveredAdmin = opened.Authenticate(Admin, Password);
        if (recoveredAdmin is null || !opened.VerifyRecoveryIntegrity()) return false;
        var recovered = opened.ListSyntheticOrderDrafts(recoveredAdmin, expected[0]);
        return recovered.Count == 1 && recovered[0].DraftId == expected[2];
    }
}

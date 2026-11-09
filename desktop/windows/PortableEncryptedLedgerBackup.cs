using System;
using System.Buffers.Binary;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace EIntegrator.Desktop;

/// <summary>
/// OFFLINE-02D — authenticated, portable backup of the COMPLETE encrypted
/// SQLite3MC ledger and its raw key, with DPAPI re-wrapping on restore.
/// Internal QA only until independent review and cross-Windows-user tests.
/// Not available to JavaScript or the desktop UI.
/// </summary>
internal static class PortableEncryptedLedgerBackup
{
    private static readonly byte[] Magic = "FNAILED2"u8.ToArray();
    private const byte Version = 1;
    private const int Rounds = 600_000;
    private const int SaltLength = 16;
    private const int NonceLength = 12;
    private const int TagLength = 16;
    private const int KeyLength = 32;
    private const int HeaderLength = 53;
    private const int PayloadPrefixLength = 40;
    private const int MaxDatabaseBytes = 64 * 1024 * 1024;
    private const int MaxPayloadLength = MaxDatabaseBytes + PayloadPrefixLength;
    private const int MaxFileLength = HeaderLength + TagLength + MaxPayloadLength;

    private static void CheckPhrase(string passphrase)
    {
        if (string.IsNullOrWhiteSpace(passphrase) ||
            passphrase.Length is < 16 or > 1024)
            throw new ArgumentException("A 16–1024 character recovery passphrase is required");
    }

    public static void Export(EncryptedLedgerStore source, string destinationPath,
                              string passphrase)
    {
        ArgumentNullException.ThrowIfNull(source);
        CheckPhrase(passphrase);
        var output = Path.GetFullPath(destinationPath);
        var parent = Path.GetDirectoryName(output);
        if (string.IsNullOrEmpty(parent) || !Directory.Exists(parent) ||
            File.Exists(output) || Directory.Exists(output))
            throw new IOException("A new backup destination directory/file is required");

        var (cipherDatabase, rawKey) = source.CaptureCipherSnapshot(MaxDatabaseBytes);
        var payload = new byte[PayloadPrefixLength + cipherDatabase.Length];
        var salt = RandomNumberGenerator.GetBytes(SaltLength);
        var nonce = RandomNumberGenerator.GetBytes(NonceLength);
        byte[]? derived = null;
        string? temporary = null;
        try
        {
            // Binary plaintext payload is encrypted before writing anything:
            // schema=1 (4 B), 32-byte database key, DB length (4 B), DB bytes.
            BinaryPrimitives.WriteInt32LittleEndian(payload.AsSpan(0, 4), 1);
            rawKey.CopyTo(payload, 4);
            BinaryPrimitives.WriteInt32LittleEndian(payload.AsSpan(36, 4),
                cipherDatabase.Length);
            cipherDatabase.CopyTo(payload, PayloadPrefixLength);

            var packet = new byte[HeaderLength + TagLength + payload.Length];
            Magic.CopyTo(packet, 0);
            packet[8] = Version;
            BinaryPrimitives.WriteInt32LittleEndian(packet.AsSpan(9, 4), Rounds);
            salt.CopyTo(packet, 13);
            nonce.CopyTo(packet, 29);
            BinaryPrimitives.WriteInt32LittleEndian(packet.AsSpan(41, 4), payload.Length);
            BinaryPrimitives.WriteInt64LittleEndian(packet.AsSpan(45, 8),
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());

            derived = Rfc2898DeriveBytes.Pbkdf2(passphrase, salt, Rounds,
                HashAlgorithmName.SHA256, KeyLength);
            using (var aes = new AesGcm(derived, TagLength))
            {
                aes.Encrypt(nonce, payload,
                    packet.AsSpan(HeaderLength + TagLength, payload.Length),
                    packet.AsSpan(HeaderLength, TagLength),
                    packet.AsSpan(0, HeaderLength));
            }
            // Never write unencrypted key, SQL pages or recovery phrase to disk.
            temporary = Path.Combine(parent, ".finai-ledger-" +
                Guid.NewGuid().ToString("N") + ".tmp");
            using (var writer = new FileStream(temporary,
                new FileStreamOptions
                {
                    Mode = FileMode.CreateNew,
                    Access = FileAccess.Write,
                    Share = FileShare.None,
                    Options = FileOptions.WriteThrough
                }))
            {
                writer.Write(packet);
                writer.Flush(flushToDisk: true);
            }
            File.Move(temporary, output, overwrite: false);
            temporary = null;
        }
        finally
        {
            if (temporary is not null && File.Exists(temporary))
                File.Delete(temporary);
            CryptographicOperations.ZeroMemory(rawKey);
            CryptographicOperations.ZeroMemory(payload);
            CryptographicOperations.ZeroMemory(cipherDatabase);
            if (derived is not null) CryptographicOperations.ZeroMemory(derived);
        }
    }

    /// <summary>
    /// Completely verifies the backup before staging either member of the new
    /// DB/key pair. Stages within the SAME parent filesystem as the target and
    /// atomically renames the entire directory after key rewrap and integrity
    /// checks. Never alters an existing target directory.
    /// </summary>
    public static void RestoreIntoNewDirectory(string backupPath, string newDirectory,
                                                string passphrase)
    {
        CheckPhrase(passphrase);
        var source = new FileInfo(backupPath);
        if (!source.Exists || source.Length < HeaderLength + TagLength + PayloadPrefixLength ||
            source.Length > MaxFileLength)
            throw new InvalidDataException("Invalid or oversized ledger backup");
        var packet = File.ReadAllBytes(source.FullName);
        if (!packet.AsSpan(0, 8).SequenceEqual(Magic) || packet[8] != Version ||
            BinaryPrimitives.ReadInt32LittleEndian(packet.AsSpan(9, 4)) != Rounds)
            throw new InvalidDataException("Unsupported encrypted ledger backup header");
        var length = BinaryPrimitives.ReadInt32LittleEndian(packet.AsSpan(41, 4));
        if (length < PayloadPrefixLength + 4096 || length > MaxPayloadLength ||
            packet.Length != HeaderLength + TagLength + length)
            throw new InvalidDataException("Invalid encrypted ledger backup length");
        var target = Path.GetFullPath(newDirectory);
        var parent = Path.GetDirectoryName(target);
        if (string.IsNullOrEmpty(parent) || !Directory.Exists(parent) ||
            Directory.Exists(target) || File.Exists(target))
            throw new IOException("Restore requires a nonexisting target directory");

        var salt = packet.AsSpan(13, SaltLength).ToArray();
        var nonce = packet.AsSpan(29, NonceLength).ToArray();
        var key = Rfc2898DeriveBytes.Pbkdf2(passphrase, salt, Rounds,
            HashAlgorithmName.SHA256, KeyLength);
        var plaintext = new byte[length];
        string? staging = null;
        try
        {
            using (var aes = new AesGcm(key, TagLength))
            {
                aes.Decrypt(nonce,
                    packet.AsSpan(HeaderLength + TagLength, length),
                    packet.AsSpan(HeaderLength, TagLength), plaintext,
                    packet.AsSpan(0, HeaderLength));
            }

            if (BinaryPrimitives.ReadInt32LittleEndian(plaintext.AsSpan(0, 4)) != 1)
                throw new InvalidDataException("Unsupported recovery schema");
            var dbLength = BinaryPrimitives.ReadInt32LittleEndian(plaintext.AsSpan(36, 4));
            if (dbLength < 4096 || dbLength > MaxDatabaseBytes ||
                dbLength + PayloadPrefixLength != plaintext.Length)
                throw new InvalidDataException("Invalid recovered SQLite length");

            staging = Path.Combine(parent,
                ".finai-ledger-restore-" + Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(staging);
            var rawKey = plaintext.AsSpan(4, KeyLength).ToArray();
            try
            {
                var cipherBytes = plaintext.AsSpan(PayloadPrefixLength, dbLength).ToArray();
                try
                {
                    EncryptedLedgerStore.StageRecoveredCipher(staging, cipherBytes, rawKey);
                }
                finally { CryptographicOperations.ZeroMemory(cipherBytes); }
            }
            finally { CryptographicOperations.ZeroMemory(rawKey); }

            // Reject even a concurrently appearing destination, never merge/overwrite.
            Directory.Move(staging, target);
            staging = null;
        }
        finally
        {
            if (staging is not null && Directory.Exists(staging))
                Directory.Delete(staging, recursive: true);
            CryptographicOperations.ZeroMemory(key);
            CryptographicOperations.ZeroMemory(plaintext);
        }
    }

    private static bool MustReject(Action action)
    {
        try { action(); return false; }
        catch (CryptographicException) { return true; }
        catch (InvalidDataException) { return true; }
        catch (InvalidOperationException) { return true; }
        catch (IOException) { return true; }
    }

    /// <summary>Synthetic, real SQLite3MC / DPAPI recovery test, no remote calls.</summary>
    public static bool SelfTest()
    {
        var root = Path.Combine(Path.GetTempPath(),
            "finai-ledger-recovery-qa-" + Guid.NewGuid().ToString("N"));
        const string passphrase = "synthetic-ledger-recovery-phrase-2026-not-real";
        const string wrongPhrase = "synthetic-incorrect-ledger-recovery-phrase";
        const string adminPhrase = "synthetic-local-account-password-for-qa";
        const string marker = "TEST_LEDGER_RESTORED_OFFLINE_2026";
        try
        {
            Directory.CreateDirectory(root);
            var home = Path.Combine(root, "original");
            string companyId, journalId;
            using (var ledger = EncryptedLedgerStore.CreateNew(home, "qa.admin", adminPhrase))
            {
                var admin = ledger.Authenticate("qa.admin", adminPhrase)
                    ?? throw new InvalidDataException("Admin authentication failed");
                companyId = ledger.CreateCompany(admin, "Sintetično podjetje");
                ledger.RegisterAccount(admin, companyId, "1200");
                ledger.RegisterAccount(admin, companyId, "2600");
                journalId = ledger.Post(admin, companyId, Guid.NewGuid().ToString("D"),
                    marker,
                    [new EncryptedLedgerStore.Line("1200", 12345, 0),
                     new EncryptedLedgerStore.Line("2600", 0, 12345)]);
                if (!ledger.VerifyRecoveryIntegrity()) return false;
                var backup = Path.Combine(root, "synthetic-ledger.finai");
                Export(ledger, backup, passphrase);
                if (Encoding.UTF8.GetString(File.ReadAllBytes(backup))
                    .Contains(marker, StringComparison.Ordinal)) return false;
                if (!MustReject(() => Export(ledger, backup, passphrase))) return false;
            }

            var backupPath = Path.Combine(root, "synthetic-ledger.finai");
            var recovered = Path.Combine(root, "recovered");
            RestoreIntoNewDirectory(backupPath, recovered, passphrase);
            using (var ledger = EncryptedLedgerStore.OpenExisting(recovered))
            {
                var admin = ledger.Authenticate("qa.admin", adminPhrase);
                if (admin is null || ledger.Lines(admin, companyId, journalId).Count != 2 ||
                    !ledger.VerifyRecoveryIntegrity()) return false;
                admin.Revoke();
                if (!MustReject(() => ledger.Lines(admin, companyId, journalId))) return false;
            }
            // Wrong password and tampered/truncated headers cannot create a target.
            var wrong = Path.Combine(root, "wrong");
            if (!MustReject(() => RestoreIntoNewDirectory(backupPath, wrong, wrongPhrase)) ||
                Directory.Exists(wrong)) return false;

            var corrupted = Path.Combine(root, "corrupted.finai");
            var bytes = File.ReadAllBytes(backupPath);
            bytes[13] ^= 0x80;
            File.WriteAllBytes(corrupted, bytes);
            var target = Path.Combine(root, "tampered-target");
            if (!MustReject(() => RestoreIntoNewDirectory(corrupted, target, passphrase)) ||
                Directory.Exists(target)) return false;

            bytes = File.ReadAllBytes(backupPath);
            bytes[^1] ^= 0x01;
            File.WriteAllBytes(corrupted, bytes);
            if (!MustReject(() => RestoreIntoNewDirectory(corrupted, target, passphrase)) ||
                Directory.Exists(target)) return false;

            File.WriteAllBytes(corrupted, bytes[..^1]);
            if (!MustReject(() => RestoreIntoNewDirectory(corrupted, target, passphrase)) ||
                Directory.Exists(target)) return false;

            if (!MustReject(() => RestoreIntoNewDirectory(backupPath, recovered, passphrase)))
                return false;
            // Backups MUST NOT contain raw DPAPI key as a standalone sidecar.
            return File.Exists(Path.Combine(recovered, "secure-ledger.key")) &&
                   File.Exists(Path.Combine(recovered, "secure-ledger.db"));
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, recursive: true);
        }
    }
}

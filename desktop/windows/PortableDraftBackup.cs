using System;
using System.Buffers.Binary;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace EIntegrator.Desktop;

/// <summary>
/// OFFLINE-02B: portable, authenticated backup of synthetic LOCAL DRAFTS only.
/// No API to import posted journals, user accounts or financial documents.
/// DPAPI protects rows at rest; PBKDF2/AES-GCM protects transfer between Windows
/// profiles. Real accounting data remains disallowed until full DB encryption.
/// </summary>
internal static class PortableDraftBackup
{
    private static readonly byte[] Magic = "FNAIBK02"u8.ToArray();
    private const byte Version = 1;
    private const int Iterations = 600_000;
    private const int SaltBytes = 16;
    private const int NonceBytes = 12;
    private const int TagBytes = 16;
    private const int KeyBytes = 32;
    private const int MaxPayloadBytes = 8 * 1024 * 1024;
    private const int HeaderBytes = 8 + 1 + 4 + SaltBytes + NonceBytes + 4;
    private const int MaxFileBytes = HeaderBytes + TagBytes + MaxPayloadBytes;

    private sealed record Contents(int Schema, string CreatedUtc, List<LocalDraftStore.Draft> Drafts);

    internal static void ValidateDraft(LocalDraftStore.Draft? draft)
    {
        if (draft is null || draft.Id is null ||
            !Guid.TryParseExact(draft.Id, "D", out var uuid) ||
            uuid.ToString("D") != draft.Id ||
            draft.Title is null || draft.Title.Length is < 1 or > 120 ||
            string.IsNullOrWhiteSpace(draft.Title) ||
            draft.Note is null || draft.Note.Length > 4000 ||
            draft.UpdatedAt is null ||
            !DateTimeOffset.TryParseExact(draft.UpdatedAt, "O",
                CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out _) ||
            draft.Title.Any(char.IsControl) || draft.Note.Contains('\0'))
        {
            throw new InvalidDataException("Invalid draft backup record");
        }
    }

    private static void ValidatePassphrase(string passphrase)
    {
        if (string.IsNullOrWhiteSpace(passphrase) ||
            passphrase.Length < 16 || passphrase.Length > 1024)
            throw new ArgumentException("Recovery passphrase must contain 16-1024 characters");
    }

    /// <summary>
    /// Create a new encrypted backup without overwriting any existing file.
    /// Only the final authenticated binary container may reach the disk.
    /// File move is atomic within the same directory; partial temp is deleted.
    /// </summary>
    public static void Export(LocalDraftStore source, string path, string passphrase)
    {
        ArgumentNullException.ThrowIfNull(source);
        ValidatePassphrase(passphrase);
        var drafts = source.SnapshotForPortableBackup();
        foreach (var draft in drafts) ValidateDraft(draft);
        var plaintext = JsonSerializer.SerializeToUtf8Bytes(
            new Contents(1, DateTimeOffset.UtcNow.ToString("O"), drafts));
        try
        {
            if (plaintext.Length > MaxPayloadBytes)
                throw new InvalidDataException("Backup exceeds limit");

            var packet = new byte[HeaderBytes + TagBytes + plaintext.Length];
            Magic.CopyTo(packet, 0);
            packet[Magic.Length] = Version;
            BinaryPrimitives.WriteInt32LittleEndian(packet.AsSpan(9, 4), Iterations);
            RandomNumberGenerator.Fill(packet.AsSpan(13, SaltBytes));
            RandomNumberGenerator.Fill(packet.AsSpan(29, NonceBytes));
            BinaryPrimitives.WriteInt32LittleEndian(packet.AsSpan(41, 4), plaintext.Length);
            var salt = packet.AsSpan(13, SaltBytes).ToArray();
            var nonce = packet.AsSpan(29, NonceBytes);
            var key = Rfc2898DeriveBytes.Pbkdf2(
                passphrase, salt, Iterations, HashAlgorithmName.SHA256, KeyBytes);
            try
            {
                using var aes = new AesGcm(key, TagBytes);
                aes.Encrypt(
                    nonce, plaintext,
                    packet.AsSpan(HeaderBytes + TagBytes),
                    packet.AsSpan(HeaderBytes, TagBytes),
                    packet.AsSpan(0, HeaderBytes));
            }
            finally
            {
                CryptographicOperations.ZeroMemory(key);
            }

            var destination = Path.GetFullPath(path);
            var parent = Path.GetDirectoryName(destination);
            if (string.IsNullOrWhiteSpace(parent) || !Directory.Exists(parent))
                throw new DirectoryNotFoundException("Backup target directory does not exist");
            if (File.Exists(destination) || Directory.Exists(destination))
                throw new IOException("Backup destination exists: refusing overwrite");

            var temporary = Path.Combine(parent, ".finai-backup-" + Guid.NewGuid().ToString("N") + ".tmp");
            try
            {
                using (var stream = new FileStream(temporary, new FileStreamOptions
                {
                    Mode = FileMode.CreateNew,
                    Access = FileAccess.Write,
                    Share = FileShare.None,
                    Options = FileOptions.WriteThrough
                }))
                {
                    stream.Write(packet);
                    stream.Flush(flushToDisk: true);
                }
                // Never replace an earlier backup, even after concurrent changes.
                File.Move(temporary, destination, overwrite: false);
            }
            finally
            {
                if (File.Exists(temporary)) File.Delete(temporary);
            }
        }
        finally
        {
            CryptographicOperations.ZeroMemory(plaintext);
        }
    }

    /// <summary>
    /// Authenticates the whole backup before any SQLite write. Imports only
    /// into an EMPTY destination, in one transaction; no silent merging.
    /// A tampered file, wrong passphrase, duplicate ID or invalid version
    /// leaves the existing destination unchanged.
    /// </summary>
    public static void ImportIntoEmpty(LocalDraftStore destination, string path, string passphrase)
    {
        ArgumentNullException.ThrowIfNull(destination);
        ValidatePassphrase(passphrase);
        var source = new FileInfo(path);
        if (!source.Exists || source.Length < HeaderBytes + TagBytes ||
            source.Length > MaxFileBytes)
            throw new InvalidDataException("Invalid or oversized backup");
        var packet = File.ReadAllBytes(source.FullName);
        if (!packet.AsSpan(0, 8).SequenceEqual(Magic) || packet[8] != Version ||
            BinaryPrimitives.ReadInt32LittleEndian(packet.AsSpan(9, 4)) != Iterations)
            throw new InvalidDataException("Unsupported backup format");

        var length = BinaryPrimitives.ReadInt32LittleEndian(packet.AsSpan(41, 4));
        if (length < 1 || length > MaxPayloadBytes ||
            packet.Length != HeaderBytes + TagBytes + length)
            throw new InvalidDataException("Invalid backup length");

        var salt = packet.AsSpan(13, SaltBytes).ToArray();
        var nonce = packet.AsSpan(29, NonceBytes);
        var key = Rfc2898DeriveBytes.Pbkdf2(
            passphrase, salt, Iterations, HashAlgorithmName.SHA256, KeyBytes);
        var plaintext = new byte[length];
        try
        {
            using (var aes = new AesGcm(key, TagBytes))
            {
                // Authenticated associated data protects all unencrypted header bytes.
                aes.Decrypt(nonce,
                    packet.AsSpan(HeaderBytes + TagBytes, length),
                    packet.AsSpan(HeaderBytes, TagBytes),
                    plaintext, packet.AsSpan(0, HeaderBytes));
            }

            var contents = JsonSerializer.Deserialize<Contents>(plaintext);
            if (contents is null || contents.Schema != 1 ||
                contents.Drafts is null || contents.Drafts.Count > 1000 ||
                !DateTimeOffset.TryParseExact(contents.CreatedUtc, "O",
                    CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out _))
                throw new InvalidDataException("Unsupported backup payload");

            var seen = new HashSet<string>(StringComparer.Ordinal);
            foreach (var draft in contents.Drafts)
            {
                ValidateDraft(draft);
                if (!seen.Add(draft.Id))
                    throw new InvalidDataException("Duplicate draft in backup");
            }
            destination.RestoreIntoEmptyStore(contents.Drafts);
        }
        finally
        {
            CryptographicOperations.ZeroMemory(key);
            CryptographicOperations.ZeroMemory(plaintext);
        }
    }

    public static bool SelfTest()
    {
        var root = Path.Combine(Path.GetTempPath(),
            "finai-portable-backup-test-" + Guid.NewGuid().ToString("N"));
        const string testPassphrase = "synthetic-offline-test-passphrase-2026-only";
        const string marker = "PRIVATE_DRAFT_BACKUP_TEST_MARKER_2026";
        try
        {
            Directory.CreateDirectory(root);
            var source = new LocalDraftStore(Path.Combine(root, "source"));
            var original = source.Save("Samo test", marker);
            source.Save("Še en osnutek", "Brez internetne povezave");
            for (int i = 0; i < 101; i++)
                source.Save("Sintetični osnutek " + i, "Brez osebnih ali finančnih podatkov");
            var backup = Path.Combine(root, "backup.finai");
            Export(source, backup, testPassphrase);

            var disk = File.ReadAllBytes(backup);
            if (Encoding.UTF8.GetString(disk).Contains(marker, StringComparison.Ordinal))
                return false;
            if (disk.AsSpan().StartsWith("SQLite format 3"u8))
                return false;

            var restored = new LocalDraftStore(Path.Combine(root, "restored"));
            ImportIntoEmpty(restored, backup, testPassphrase);
            var afterRestart = new LocalDraftStore(Path.Combine(root, "restored"));
            if (afterRestart.List().Count != 100 ||
                afterRestart.SnapshotForPortableBackup().Count != 103 ||
                !afterRestart.SnapshotForPortableBackup().Any(d => d.Id == original.Id && d.Note == marker))
                return false;

            // Do not overwrite a populated destination or an earlier backup.
            if (!ExpectFailure(() => ImportIntoEmpty(restored, backup, testPassphrase)))
                return false;
            if (!ExpectFailure(() => Export(source, backup, testPassphrase)))
                return false;

            var wrong = new LocalDraftStore(Path.Combine(root, "wrong"));
            if (!ExpectFailure(() => ImportIntoEmpty(wrong, backup,
                "synthetic-incorrect-long-passphrase")))
                return false;
            if (wrong.List().Count != 0) return false;

            // Header and ciphertext authentication must both be effective.
            var tampered = Path.Combine(root, "tampered.finai");
            disk[13] ^= 0x10; // salt in authenticated header
            File.WriteAllBytes(tampered, disk);
            var rejected = new LocalDraftStore(Path.Combine(root, "rejected"));
            if (!ExpectFailure(() => ImportIntoEmpty(rejected, tampered, testPassphrase)))
                return false;
            if (rejected.List().Count != 0) return false;

            disk = File.ReadAllBytes(backup);
            disk[^1] ^= 0x20;
            File.WriteAllBytes(tampered, disk);
            if (!ExpectFailure(() => ImportIntoEmpty(rejected, tampered, testPassphrase)))
                return false;

            // Truncated backup never imports partial rows.
            File.WriteAllBytes(tampered, disk.AsSpan(0, disk.Length - 1).ToArray());
            if (!ExpectFailure(() => ImportIntoEmpty(rejected, tampered, testPassphrase)))
                return false;

            return rejected.List().Count == 0;
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, recursive: true);
        }
    }

    private static bool ExpectFailure(Action action)
    {
        try { action(); return false; }
        catch (CryptographicException) { return true; }
        catch (InvalidDataException) { return true; }
        catch (InvalidOperationException) { return true; }
        catch (IOException) { return true; }
    }
}

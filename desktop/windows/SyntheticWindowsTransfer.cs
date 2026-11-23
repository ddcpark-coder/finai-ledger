using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace EIntegrator.Desktop;

/// <summary>
/// NEXT31: a MANUAL, fixed-synthetic AES-GCM transfer file compatible with the
/// test-only Laravel receipt envelope. Never a network client or a server ACK.
/// The cached packet is DPAPI protected so retries use the same exact ciphertext.
/// </summary>
internal sealed class SyntheticWindowsTransfer
{
    private const string Format = "finai-windows-synthetic-outbox-v1";
    private const string EvidenceFormat = "finai-windows-synthetic-outbox-evidence-v1";
    private const int Rounds = 250_000;
    private static readonly byte[] Entropy =
        Encoding.UTF8.GetBytes("finai.synthetic.windows.transfer.cache.v1");
    private readonly SyntheticOfflineSyncOutbox outbox;
    private readonly string cachePath;

    internal SyntheticWindowsTransfer(string? root = null)
    {
        root ??= Path.Combine(Environment.GetFolderPath(
            Environment.SpecialFolder.LocalApplicationData), "e-integrator", "Desktop");
        if (Directory.Exists(root) &&
            new DirectoryInfo(root).Attributes.HasFlag(FileAttributes.ReparsePoint))
            throw new IOException("Linked transfer root not supported");
        Directory.CreateDirectory(root);
        cachePath = Path.Combine(root, "synthetic-windows-transfer-cache.db");
        if (File.Exists(cachePath) &&
            new FileInfo(cachePath).Attributes.HasFlag(FileAttributes.ReparsePoint))
            throw new IOException("Linked transfer cache not supported");
        outbox = new SyntheticOfflineSyncOutbox(root);
        using var db = Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS synthetic_transfers(
                event_id TEXT PRIMARY KEY NOT NULL,
                company_id TEXT NOT NULL,
                protected_packet BLOB NOT NULL
            );
            """;
        cmd.ExecuteNonQuery();
    }

    private SqliteConnection Open()
    {
        var db = new SqliteConnection(new SqliteConnectionStringBuilder
        {
            DataSource = cachePath, Mode = SqliteOpenMode.ReadWriteCreate,
            Pooling = false
        }.ToString());
        db.Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = "PRAGMA busy_timeout=3000;";
        cmd.ExecuteNonQuery();
        return db;
    }

    private static byte[] Key(string passphrase, byte[] salt)
    {
        if (string.IsNullOrWhiteSpace(passphrase) || passphrase.Length is < 16 or > 128)
            throw new ArgumentException("A test-only transfer phrase (16–128 chars) is required");
        return Rfc2898DeriveBytes.Pbkdf2(passphrase, salt, Rounds,
            HashAlgorithmName.SHA256, 32);
    }

    private static byte[] AAD(SyntheticOfflineSyncOutbox.Snapshot item) =>
        Encoding.UTF8.GetBytes(Format + "|" + item.CompanyId + "|" + item.DocumentId);

    private static byte[] Evidence(SyntheticOfflineSyncOutbox.Snapshot item) =>
        Encoding.UTF8.GetBytes(JsonSerializer.Serialize(new
        {
            format = EvidenceFormat,
            companyId = int.Parse(item.CompanyId),
            documentId = item.DocumentId, eventId = item.EventId,
            expectedVersion = item.ExpectedVersion, demoOnly = true
        }));

    private static string Encrypt(SyntheticOfflineSyncOutbox.Snapshot item, string phrase)
    {
        var salt = RandomNumberGenerator.GetBytes(16);
        var iv = RandomNumberGenerator.GetBytes(12);
        var key = Key(phrase, salt);
        var plaintext = Evidence(item);
        try
        {
            var cipher = new byte[plaintext.Length];
            var tag = new byte[16];
            using (var aes = new AesGcm(key, 16))
                aes.Encrypt(iv, plaintext, cipher, tag, AAD(item));
            var cipherTag = new byte[cipher.Length + tag.Length];
            Buffer.BlockCopy(cipher, 0, cipherTag, 0, cipher.Length);
            Buffer.BlockCopy(tag, 0, cipherTag, cipher.Length, tag.Length);
            try
            {
                return JsonSerializer.Serialize(new
                {
                    client_event_id = item.EventId,
                    expected_version = item.ExpectedVersion,
                    envelope = new
                    {
                        format = Format, companyId = int.Parse(item.CompanyId),
                        documentId = item.DocumentId, version = 1, iterations = Rounds,
                        salt = Convert.ToBase64String(salt),
                        iv = Convert.ToBase64String(iv),
                        ciphertext = Convert.ToBase64String(cipherTag)
                    }
                });
            }
            finally
            {
                CryptographicOperations.ZeroMemory(cipherTag);
                CryptographicOperations.ZeroMemory(cipher);
                CryptographicOperations.ZeroMemory(tag);
            }
        }
        finally
        {
            CryptographicOperations.ZeroMemory(key);
            CryptographicOperations.ZeroMemory(plaintext);
        }
    }

    private static void Verify(string packet, SyntheticOfflineSyncOutbox.Snapshot item,
        string passphrase)
    {
        if (packet.Length is < 100 or > 3000)
            throw new InvalidDataException("Oversized synthetic transfer");
        using var doc = JsonDocument.Parse(packet);
        var root = doc.RootElement;
        if (root.ValueKind != JsonValueKind.Object ||
            root.EnumerateObject().Count() != 3 ||
            root.GetProperty("client_event_id").GetString() != item.EventId ||
            root.GetProperty("expected_version").GetInt32() != item.ExpectedVersion)
            throw new InvalidDataException("Synthetic transfer metadata mismatch");
        var envelope = root.GetProperty("envelope");
        if (envelope.ValueKind != JsonValueKind.Object ||
            envelope.EnumerateObject().Count() != 8 ||
            envelope.GetProperty("format").GetString() != Format ||
            envelope.GetProperty("companyId").GetInt32() != int.Parse(item.CompanyId) ||
            envelope.GetProperty("documentId").GetString() != item.DocumentId ||
            envelope.GetProperty("version").GetInt32() != 1 ||
            envelope.GetProperty("iterations").GetInt32() != Rounds)
            throw new InvalidDataException("Synthetic envelope metadata mismatch");
        var salt = Convert.FromBase64String(envelope.GetProperty("salt").GetString() ?? "");
        var iv = Convert.FromBase64String(envelope.GetProperty("iv").GetString() ?? "");
        var joined = Convert.FromBase64String(
            envelope.GetProperty("ciphertext").GetString() ?? "");
        if (salt.Length != 16 || iv.Length != 12 ||
            joined.Length is < 32 or > 2000)
            throw new InvalidDataException("Malformed AES-GCM synthetic envelope");
        var key = Key(passphrase, salt);
        var plaintext = new byte[joined.Length - 16];
        var expected = Evidence(item);
        try
        {
            using (var aes = new AesGcm(key, 16))
                aes.Decrypt(iv, joined.AsSpan(0, plaintext.Length),
                    joined.AsSpan(plaintext.Length, 16), plaintext, AAD(item));
            if (!CryptographicOperations.FixedTimeEquals(plaintext, expected))
                throw new InvalidDataException("Synthetic encrypted event has changed");
        }
        finally
        {
            CryptographicOperations.ZeroMemory(key);
            CryptographicOperations.ZeroMemory(plaintext);
            CryptographicOperations.ZeroMemory(expected);
            CryptographicOperations.ZeroMemory(joined);
        }
    }

    public SyntheticOfflineSyncOutbox.Snapshot Queue(string companyId, int expectedVersion) =>
        outbox.Enqueue(companyId, Guid.NewGuid().ToString("D"), expectedVersion);

    public string Export(string companyId, string eventId, string phrase)
    {
        if (string.IsNullOrWhiteSpace(phrase) || phrase.Length is < 16 or > 128)
            throw new ArgumentException("A strong synthetic transfer phrase is required");
        var item = outbox.List(companyId).SingleOrDefault(x => x.EventId == eventId)
            ?? throw new InvalidDataException("No synthetic event in selected company");
        if (item.State != "pending_local" || item.ObservedVersion is not null)
            throw new InvalidDataException("Only pending synthetic events can export");
        using var db = Open();
        using var tx = db.BeginTransaction();
        byte[]? stored;
        using (var select = db.CreateCommand())
        {
            select.Transaction = tx;
            select.CommandText = """
                SELECT protected_packet FROM synthetic_transfers
                WHERE event_id=$event AND company_id=$company;
                """;
            select.Parameters.AddWithValue("$event", item.EventId);
            select.Parameters.AddWithValue("$company", companyId);
            stored = select.ExecuteScalar() as byte[];
        }
        if (stored is not null)
        {
            var plaintext = ProtectedData.Unprotect(stored, Entropy,
                DataProtectionScope.CurrentUser);
            try
            {
                var packet = Encoding.UTF8.GetString(plaintext);
                Verify(packet, item, phrase);
                tx.Commit();
                return packet;
            }
            finally { CryptographicOperations.ZeroMemory(plaintext); }
        }
        var encryptedPacket = Encrypt(item, phrase);
        Verify(encryptedPacket, item, phrase);
        var raw = Encoding.UTF8.GetBytes(encryptedPacket);
        byte[] protectedPacket;
        try
        {
            protectedPacket = ProtectedData.Protect(raw, Entropy, DataProtectionScope.CurrentUser);
        }
        finally { CryptographicOperations.ZeroMemory(raw); }
        try
        {
            using var insert = db.CreateCommand();
            insert.Transaction = tx;
            insert.CommandText = """
                INSERT INTO synthetic_transfers(event_id,company_id,protected_packet)
                VALUES($event,$company,$packet);
                """;
            insert.Parameters.AddWithValue("$event", item.EventId);
            insert.Parameters.AddWithValue("$company", companyId);
            insert.Parameters.AddWithValue("$packet", protectedPacket);
            insert.ExecuteNonQuery();
            tx.Commit();
        }
        finally { CryptographicOperations.ZeroMemory(protectedPacket); }
        return encryptedPacket;
    }

    private static bool Rejected(Action action)
    {
        try { action(); return false; }
        catch (ArgumentException) { return true; }
        catch (InvalidDataException) { return true; }
        catch (CryptographicException) { return true; }
    }

    public static bool SelfTest()
    {
        var directory = Path.Combine(Path.GetTempPath(), "finai-next31-" +
            Guid.NewGuid().ToString("N"));
        const string phrase = "NEXT31-test-only-strong-passphrase";
        try
        {
            var transfer = new SyntheticWindowsTransfer(directory);
            var a = transfer.Queue("1", 2);
            var b = transfer.Queue("2", 5);
            var first = transfer.Export("1", a.EventId, phrase);
            using (var doc = JsonDocument.Parse(first))
            {
                var env = doc.RootElement.GetProperty("envelope");
                if (env.GetProperty("format").GetString() != Format ||
                    env.GetProperty("companyId").GetInt32() != 1 ||
                    env.GetProperty("documentId").GetString() != a.DocumentId ||
                    doc.RootElement.GetProperty("client_event_id").GetString() != a.EventId ||
                    doc.RootElement.GetProperty("expected_version").GetInt32() != 2)
                    return false;
            }
            transfer = new SyntheticWindowsTransfer(directory);
            if (transfer.Export("1", a.EventId, phrase) != first ||
                !Rejected(() => transfer.Export("1", a.EventId,
                    "wrong-NEXT31-passphrase-2026")) ||
                !Rejected(() => transfer.Export("2", a.EventId, phrase)) ||
                !Rejected(() => transfer.Export("3", b.EventId, phrase)))
                return false;
            var raw = Encoding.Latin1.GetString(File.ReadAllBytes(
                Path.Combine(directory, "synthetic-windows-transfer-cache.db")));
            if (raw.Contains(a.DocumentId, StringComparison.Ordinal) ||
                raw.Contains(Format, StringComparison.Ordinal) ||
                raw.Contains(first, StringComparison.Ordinal))
                return false;
            using var db = transfer.Open();
            using var command = db.CreateCommand();
            command.CommandText = """
                UPDATE synthetic_transfers SET protected_packet=$bad
                WHERE event_id=$id;
                """;
            command.Parameters.AddWithValue("$bad", new byte[] {1,2,3,4});
            command.Parameters.AddWithValue("$id", a.EventId);
            command.ExecuteNonQuery();
            return Rejected(() => transfer.Export("1", a.EventId, phrase));
        }
        finally
        {
            if (Directory.Exists(directory)) Directory.Delete(directory, recursive: true);
        }
    }
}

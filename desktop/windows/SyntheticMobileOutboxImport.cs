using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace EIntegrator.Desktop;

/// <summary>
/// Import of password-encrypted, FIXED SYNTHETIC field queue envelopes only.
/// Manual file transfer; DPAPI CurrentUser-at-rest; no decryption, no network,
/// no authentication/signature claims and no accounting side effects.
/// </summary>
internal sealed class SyntheticMobileOutboxImport
{
    private const int MaxFileBytes = 260_000;
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("finai.synthetic.mobile.outbox.import.v1");
    private readonly string filePath;
    internal sealed record Summary(string CompanyId, string DocumentId, string EventId,
        string State, string CreatedAt);

    private static string DocumentFor(string companyId) => companyId switch
    {
        "1" => "SYNTH-DOB-2026-0048",
        "2" => "SYNTH-DOB-2026-B001",
        "3" => "SYNTH-DOB-2026-C001",
        _ => throw new ArgumentException("Unknown synthetic company.")
    };

    public SyntheticMobileOutboxImport(string? root = null)
    {
        root ??= Path.Combine(Environment.GetFolderPath(
            Environment.SpecialFolder.LocalApplicationData), "e-integrator", "Desktop");
        Directory.CreateDirectory(root);
        filePath = Path.Combine(root, "synthetic-mobile-import.db");
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS encrypted_mobile_imports(
              company_id TEXT PRIMARY KEY NOT NULL,
              event_id TEXT NOT NULL,
              payload_sha256 TEXT NOT NULL,
              protected_payload BLOB NOT NULL
            );
            """;
        cmd.ExecuteNonQuery();
    }

    private SqliteConnection Open()
    {
        var conn = new SqliteConnection(new SqliteConnectionStringBuilder
        {
            DataSource = filePath, Mode = SqliteOpenMode.ReadWriteCreate, Pooling = false
        }.ToString());
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "PRAGMA busy_timeout=3000;";
        cmd.ExecuteNonQuery();
        return conn;
    }

    private static int NonNegative(JsonElement element)
    {
        if (element.ValueKind != JsonValueKind.Number ||
            !element.TryGetInt32(out var result) || result < 0)
            throw new InvalidDataException("Invalid synthetic event version.");
        return result;
    }

    private static void CheckB64(string value, int size)
    {
        byte[] bytes;
        try { bytes = Convert.FromBase64String(value); }
        catch (FormatException) { throw new InvalidDataException("Invalid encrypted field."); }
        if (bytes.Length != size)
            throw new InvalidDataException("Invalid encrypted field length.");
    }

    private static Summary Parse(ReadOnlyMemory<byte> raw, string selectedCompany)
    {
        if (raw.Length is < 100 or > MaxFileBytes)
            throw new InvalidDataException("Invalid synthetic queue file size.");
        var expectedDocument = DocumentFor(selectedCompany);
        using var json = JsonDocument.Parse(raw, new JsonDocumentOptions
        {
            AllowTrailingCommas = false, CommentHandling = JsonCommentHandling.Disallow,
            MaxDepth = 8
        });
        var root = json.RootElement;
        if (root.ValueKind != JsonValueKind.Object || root.EnumerateObject().Count() != 9)
            throw new InvalidDataException("Invalid queue structure.");
        var company = root.GetProperty("companyId").GetInt32().ToString();
        var document = root.GetProperty("documentId").GetString() ?? "";
        var id = root.GetProperty("id").GetString() ?? "";
        var eventId = root.GetProperty("clientEventId").GetString() ?? "";
        var state = root.GetProperty("state").GetString() ?? "";
        var created = root.GetProperty("createdAt").GetString() ?? "";
        if (company != selectedCompany || document != expectedDocument ||
            id != selectedCompany + ":" + expectedDocument ||
            !Guid.TryParseExact(eventId, "D", out _) ||
            state is not ("queued" or "conflict" or "acknowledged") ||
            !DateTimeOffset.TryParse(created, out _))
            throw new InvalidDataException("Foreign or invalid synthetic queue.");
        _ = NonNegative(root.GetProperty("expectedVersion"));
        var serverVersion = root.GetProperty("serverVersion");
        if (serverVersion.ValueKind != JsonValueKind.Null)
            _ = NonNegative(serverVersion);
        var envelope = root.GetProperty("envelope");
        if (envelope.ValueKind != JsonValueKind.Object || envelope.EnumerateObject().Count() != 8 ||
            envelope.GetProperty("format").GetString() != "finai-mobile-synthetic-vault-v1" ||
            envelope.GetProperty("companyId").GetInt32() != int.Parse(selectedCompany) ||
            envelope.GetProperty("documentId").GetString() != expectedDocument ||
            envelope.GetProperty("version").GetInt32() != 1 ||
            envelope.GetProperty("iterations").GetInt32() != 250000)
            throw new InvalidDataException("Not a synthetic encrypted envelope.");
        CheckB64(envelope.GetProperty("salt").GetString() ?? "", 16);
        CheckB64(envelope.GetProperty("iv").GetString() ?? "", 12);
        var ciphertext = envelope.GetProperty("ciphertext").GetString() ?? "";
        if (ciphertext.Length is < 24 or > 220_000)
            throw new InvalidDataException("Invalid synthetic ciphertext length.");
        try
        {
            var encrypted = Convert.FromBase64String(ciphertext);
            if (encrypted.Length < 16) throw new InvalidDataException("Invalid ciphertext.");
            CryptographicOperations.ZeroMemory(encrypted);
        }
        catch (FormatException)
        {
            throw new InvalidDataException("Invalid synthetic ciphertext.");
        }
        return new Summary(company, document, eventId, state, created);
    }

    public Summary ImportFile(string fullPath, string selectedCompany)
    {
        _ = DocumentFor(selectedCompany);
        var size = new FileInfo(fullPath).Length;
        if (size is < 100 or > MaxFileBytes)
            throw new InvalidDataException("Invalid synthetic import file size.");
        var raw = File.ReadAllBytes(fullPath);
        try { return ImportBytes(raw, selectedCompany); }
        finally { CryptographicOperations.ZeroMemory(raw); }
    }

    internal Summary ImportBytes(byte[] raw, string companyId)
    {
        var summary = Parse(raw, companyId);
        var hash = Convert.ToHexString(SHA256.HashData(raw)).ToLowerInvariant();
        using var conn = Open();
        using var tx = conn.BeginTransaction();
        using (var find = conn.CreateCommand())
        {
            find.Transaction = tx;
            find.CommandText = "SELECT event_id,payload_sha256 FROM encrypted_mobile_imports WHERE company_id=$company;";
            find.Parameters.AddWithValue("$company", companyId);
            using var reader = find.ExecuteReader();
            if (reader.Read())
            {
                var same = reader.GetString(0) == summary.EventId &&
                    reader.GetString(1) == hash;
                if (!same)
                    throw new InvalidDataException("Existing synthetic import cannot be silently overwritten.");
                tx.Commit();
                return summary; // idempotent exact same file
            }
        }
        var protectedPayload = ProtectedData.Protect(raw, Entropy, DataProtectionScope.CurrentUser);
        try
        {
            using var insert = conn.CreateCommand();
            insert.Transaction = tx;
            insert.CommandText = """
                INSERT INTO encrypted_mobile_imports(company_id,event_id,payload_sha256,protected_payload)
                VALUES($company,$event,$hash,$payload);
                """;
            insert.Parameters.AddWithValue("$company", companyId);
            insert.Parameters.AddWithValue("$event", summary.EventId);
            insert.Parameters.AddWithValue("$hash", hash);
            insert.Parameters.AddWithValue("$payload", protectedPayload);
            insert.ExecuteNonQuery();
            tx.Commit();
            return summary;
        }
        finally { CryptographicOperations.ZeroMemory(protectedPayload); }
    }

    public Summary? Read(string companyId)
    {
        _ = DocumentFor(companyId);
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT event_id,payload_sha256,protected_payload
            FROM encrypted_mobile_imports WHERE company_id=$company;
            """;
        cmd.Parameters.AddWithValue("$company", companyId);
        using var reader = cmd.ExecuteReader();
        if (!reader.Read()) return null;
        var eventId = reader.GetString(0);
        var hash = reader.GetString(1);
        var protectedPayload = (byte[])reader.GetValue(2);
        var raw = ProtectedData.Unprotect(protectedPayload, Entropy, DataProtectionScope.CurrentUser);
        try
        {
            if (Convert.ToHexString(SHA256.HashData(raw)).ToLowerInvariant() != hash)
                throw new InvalidDataException("Imported encrypted payload was changed.");
            var parsed = Parse(raw, companyId);
            if (parsed.EventId != eventId)
                throw new InvalidDataException("Imported event metadata mismatch.");
            return parsed;
        }
        finally { CryptographicOperations.ZeroMemory(raw); }
    }

    public bool Remove(string companyId, string eventId)
    {
        _ = DocumentFor(companyId);
        if (!Guid.TryParseExact(eventId, "D", out _))
            throw new InvalidDataException("Invalid synthetic event.");
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            DELETE FROM encrypted_mobile_imports
            WHERE company_id=$company AND event_id=$event;
            """;
        cmd.Parameters.AddWithValue("$company", companyId);
        cmd.Parameters.AddWithValue("$event", eventId);
        return cmd.ExecuteNonQuery() == 1;
    }

    public static bool SelfTest()
    {
        var root = Path.Combine(Path.GetTempPath(), "finai-mobile-import-" +
            Guid.NewGuid().ToString("N"));
        try
        {
            var vault = new SyntheticMobileOutboxImport(root);
            var eventId = Guid.NewGuid().ToString("D");
            var json = JsonSerializer.Serialize(new
            {
                id = "1:SYNTH-DOB-2026-0048", companyId = 1,
                documentId = "SYNTH-DOB-2026-0048", state = "queued",
                createdAt = "2026-11-13T09:00:00Z", clientEventId = eventId,
                expectedVersion = 0, serverVersion = (int?)null,
                envelope = new
                {
                    format = "finai-mobile-synthetic-vault-v1", companyId = 1,
                    documentId = "SYNTH-DOB-2026-0048", version = 1, iterations = 250000,
                    salt = "AQIDBAUGBwgJCgsMDQ4PEA==",
                    iv = "AQIDBAUGBwgJCgsM",
                    ciphertext = Convert.ToBase64String(Encoding.ASCII.GetBytes(
                        "FIXED_SYNTHETIC_ENCRYPTED_BYTES_NOT_REAL"))
                }
            });
            var payload = Encoding.UTF8.GetBytes(json);
            if (vault.ImportBytes(payload, "1").EventId != eventId) return false;
            vault = new SyntheticMobileOutboxImport(root);
            if (vault.Read("1")?.EventId != eventId || vault.Read("2") is not null)
                return false;
            if (vault.ImportBytes(payload, "1").EventId != eventId) return false;
            try { _ = vault.ImportBytes(payload, "2"); return false; }
            catch (InvalidDataException) { /* foreign company denied */ }
            var changed = Encoding.UTF8.GetBytes(json.Replace("queued", "conflict"));
            try { _ = vault.ImportBytes(changed, "1"); return false; }
            catch (InvalidDataException) { /* no overwrite */ }
            var db = File.ReadAllBytes(Path.Combine(root, "synthetic-mobile-import.db"));
            var dbText = Encoding.Latin1.GetString(db);
            if (dbText.Contains("FIXED_SYNTHETIC_ENCRYPTED_BYTES_NOT_REAL",
                StringComparison.Ordinal) || dbText.Contains("SYNTH-DOB-2026-0048",
                StringComparison.Ordinal)) return false;
            return !vault.Remove("2", eventId) && vault.Remove("1", eventId) &&
                vault.Read("1") is null;
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, recursive: true);
        }
    }
}

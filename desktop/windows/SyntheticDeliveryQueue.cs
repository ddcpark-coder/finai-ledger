using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace EIntegrator.Desktop;

/// <summary>
/// TEST-ONLY encrypted, company-scoped queue for fixed synthetic delivery notes.
/// No real data, network upload, sync, credentials or approval endpoint.
/// SQLite row payloads are protected using Windows DPAPI CurrentUser.
/// </summary>
internal sealed class SyntheticDeliveryQueue
{
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("finai.synthetic.delivery.queue.v1");
    private readonly string filePath;
    internal sealed record Entry(string Id, string CompanyId, string DocumentId, string CreatedUtc,
        string Status);

    private static readonly IReadOnlyDictionary<string, string> Examples =
        new Dictionary<string, string>(StringComparer.Ordinal)
        {
            ["1"] = "SYNTH-DOB-2026-0048",
            ["2"] = "SYNTH-DOB-2026-B001",
            ["3"] = "SYNTH-DOB-2026-C001"
        };

    private static string DocumentFor(string companyId)
    {
        if (!Examples.TryGetValue(companyId, out var documentId))
            throw new ArgumentException("Unknown synthetic company.");
        return documentId;
    }

    public SyntheticDeliveryQueue(string? root = null)
    {
        root ??= Path.Combine(Environment.GetFolderPath(
            Environment.SpecialFolder.LocalApplicationData), "e-integrator", "Desktop");
        Directory.CreateDirectory(root);
        filePath = Path.Combine(root, "synthetic-delivery-queue.db");
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS synthetic_delivery_queue(
                id TEXT PRIMARY KEY NOT NULL,
                company_id TEXT NOT NULL,
                encrypted_payload BLOB NOT NULL,
                created_utc TEXT NOT NULL,
                UNIQUE(company_id)
            );
            """;
        cmd.ExecuteNonQuery();
    }

    private SqliteConnection Open()
    {
        var cs = new SqliteConnectionStringBuilder
        {
            DataSource = filePath,
            Mode = SqliteOpenMode.ReadWriteCreate,
            Pooling = false
        };
        var conn = new SqliteConnection(cs.ToString());
        conn.Open();
        using var pragma = conn.CreateCommand();
        pragma.CommandText = "PRAGMA busy_timeout=3000;";
        pragma.ExecuteNonQuery();
        return conn;
    }

    private static byte[] Seal(Entry item) =>
        ProtectedData.Protect(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(item)), Entropy,
            DataProtectionScope.CurrentUser);

    private static Entry OpenPayload(byte[] bytes)
    {
        var clear = ProtectedData.Unprotect(bytes, Entropy, DataProtectionScope.CurrentUser);
        try
        {
            return JsonSerializer.Deserialize<Entry>(clear)
                ?? throw new InvalidDataException("Invalid encrypted queue entry.");
        }
        finally
        {
            CryptographicOperations.ZeroMemory(clear);
        }
    }

    public Entry Enqueue(string companyId)
    {
        var document = DocumentFor(companyId);
        using var conn = Open();
        using var transaction = conn.BeginTransaction();
        using var existing = conn.CreateCommand();
        existing.Transaction = transaction;
        existing.CommandText = """
            SELECT id, company_id, encrypted_payload, created_utc
            FROM synthetic_delivery_queue WHERE company_id=$company;
            """;
        existing.Parameters.AddWithValue("$company", companyId);
        Entry? previous = null;
        using (var reader = existing.ExecuteReader())
        {
            if (reader.Read()) previous = Restore(reader);
        }
        if (previous is not null)
        {
            transaction.Commit();
            return previous; // idempotent: no duplicate and no implicit overwrite
        }

        var item = new Entry(Guid.NewGuid().ToString("D"), companyId, document,
            DateTimeOffset.UtcNow.ToString("O"), "pending_local");
        using var insert = conn.CreateCommand();
        insert.Transaction = transaction;
        insert.CommandText = """
            INSERT INTO synthetic_delivery_queue(id,company_id,encrypted_payload,created_utc)
            VALUES($id,$company,$payload,$date);
            """;
        insert.Parameters.AddWithValue("$id", item.Id);
        insert.Parameters.AddWithValue("$company", companyId);
        insert.Parameters.AddWithValue("$payload", Seal(item));
        insert.Parameters.AddWithValue("$date", item.CreatedUtc);
        insert.ExecuteNonQuery();
        transaction.Commit();
        return item;
    }

    private static Entry Restore(SqliteDataReader reader)
    {
        var storedId = reader.GetString(0);
        var companyId = reader.GetString(1);
        var payload = OpenPayload((byte[])reader.GetValue(2));
        if (payload.Id != storedId || payload.CompanyId != companyId
            || payload.DocumentId != DocumentFor(companyId)
            || payload.CreatedUtc != reader.GetString(3) || payload.Status != "pending_local")
            throw new InvalidDataException("Synthetic queue row integrity mismatch.");
        return payload;
    }

    public IReadOnlyList<Entry> List(string companyId)
    {
        DocumentFor(companyId);
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            SELECT id,company_id,encrypted_payload,created_utc FROM synthetic_delivery_queue
            WHERE company_id=$company ORDER BY created_utc DESC LIMIT 5;
            """;
        cmd.Parameters.AddWithValue("$company", companyId);
        using var reader = cmd.ExecuteReader();
        var result = new List<Entry>();
        while (reader.Read()) result.Add(Restore(reader));
        return result;
    }

    public bool Remove(string companyId, string id)
    {
        DocumentFor(companyId);
        if (!Guid.TryParseExact(id, "D", out var safeId))
            throw new ArgumentException("Malformed synthetic queue ID.");
        using var conn = Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = """
            DELETE FROM synthetic_delivery_queue WHERE company_id=$company AND id=$id;
            """;
        cmd.Parameters.AddWithValue("$company", companyId);
        cmd.Parameters.AddWithValue("$id", safeId.ToString("D"));
        return cmd.ExecuteNonQuery() == 1;
    }

    public static bool SelfTest()
    {
        var root = Path.Combine(Path.GetTempPath(), "finai-queue-test-"
            + Guid.NewGuid().ToString("N"));
        try
        {
            var q = new SyntheticDeliveryQueue(root);
            var first = q.Enqueue("1");
            var other = q.Enqueue("2");
            if (first.Id == other.Id || q.Enqueue("1").Id != first.Id) return false;
            q = new SyntheticDeliveryQueue(root); // real reopen, no network
            if (q.List("1").Count != 1 || q.List("2").Count != 1
                || q.List("3").Count != 0 || q.List("1")[0] != first) return false;
            if (q.Remove("2", first.Id) || q.List("1").Count != 1) return false;

            var databaseBytes = File.ReadAllBytes(Path.Combine(root,
                "synthetic-delivery-queue.db"));
            var databaseText = Encoding.Latin1.GetString(databaseBytes);
            if (databaseText.Contains(first.DocumentId, StringComparison.Ordinal)
                || databaseText.Contains(other.DocumentId, StringComparison.Ordinal))
                return false;

            using (var conn = q.Open())
            using (var tamper = conn.CreateCommand())
            {
                tamper.CommandText = """
                    UPDATE synthetic_delivery_queue SET encrypted_payload=$bad WHERE id=$id;
                    """;
                tamper.Parameters.AddWithValue("$bad", new byte[] {1, 2, 3, 4});
                tamper.Parameters.AddWithValue("$id", first.Id);
                tamper.ExecuteNonQuery();
            }
            try { _ = q.List("1"); return false; }
            catch (CryptographicException) { /* DPAPI refuses tampered payload */ }
            return q.Remove("2", other.Id) && q.List("2").Count == 0;
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, recursive: true);
        }
    }
}

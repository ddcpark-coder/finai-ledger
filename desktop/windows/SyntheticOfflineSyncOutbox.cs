using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace EIntegrator.Desktop;

/// <summary>
/// NEXT28: local DPAPI-protected, FIXED-SYNTHETIC outbox for future sync QA.
/// Never transmits data, creates accounting postings or claims a server ACK.
/// </summary>
internal sealed class SyntheticOfflineSyncOutbox
{
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("finai.synthetic.offline.outbox.v1");
    private readonly string databasePath;
    internal sealed record Snapshot(string CompanyId, string EventId, string DocumentId,
        int ExpectedVersion, int? ObservedVersion, string State, string CreatedUtc);

    private static string DocumentFor(string companyId) => companyId switch
    {
        "1" => "SYNTH-DOB-2026-0048",
        "2" => "SYNTH-DOB-2026-B001",
        "3" => "SYNTH-DOB-2026-C001",
        _ => throw new ArgumentException("Only synthetic companies are supported")
    };

    public SyntheticOfflineSyncOutbox(string? directory = null)
    {
        directory ??= Path.Combine(Environment.GetFolderPath(
            Environment.SpecialFolder.LocalApplicationData), "e-integrator", "Desktop");
        if (Directory.Exists(directory) &&
            new DirectoryInfo(directory).Attributes.HasFlag(FileAttributes.ReparsePoint))
            throw new IOException("Linked outbox root is forbidden");
        Directory.CreateDirectory(directory);
        databasePath = Path.Combine(directory, "synthetic-offline-outbox.db");
        if (File.Exists(databasePath) &&
            new FileInfo(databasePath).Attributes.HasFlag(FileAttributes.ReparsePoint))
            throw new IOException("Linked outbox database is forbidden");
        using var db = Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS synthetic_offline_outbox(
                event_id TEXT PRIMARY KEY NOT NULL,
                company_id TEXT NOT NULL,
                encrypted_entry BLOB NOT NULL
            );
            """;
        cmd.ExecuteNonQuery();
    }

    private SqliteConnection Open()
    {
        var db = new SqliteConnection(new SqliteConnectionStringBuilder
        {
            DataSource = databasePath, Mode = SqliteOpenMode.ReadWriteCreate, Pooling = false
        }.ToString());
        db.Open();
        using var pragma = db.CreateCommand();
        pragma.CommandText = "PRAGMA busy_timeout=3000;";
        pragma.ExecuteNonQuery();
        return db;
    }

    private static string EventId(string value)
    {
        if (!Guid.TryParseExact(value, "D", out var id))
            throw new ArgumentException("Invalid synthetic event id");
        return id.ToString("D");
    }

    private static byte[] Protect(Snapshot item) =>
        ProtectedData.Protect(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(item)),
            Entropy, DataProtectionScope.CurrentUser);

    private static Snapshot Decode(byte[] bytes, string companyId, string eventId)
    {
        var clear = ProtectedData.Unprotect(bytes, Entropy, DataProtectionScope.CurrentUser);
        try
        {
            var item = JsonSerializer.Deserialize<Snapshot>(clear)
                ?? throw new InvalidDataException("Synthetic entry is missing");
            if (item.CompanyId != companyId || item.EventId != eventId ||
                item.DocumentId != DocumentFor(companyId) ||
                item.ExpectedVersion is < 0 or > 100 ||
                item.ObservedVersion is < 0 or > 100 ||
                item.State is not ("pending_local" or "manual_review" or "conflict_manual_review") ||
                (item.State == "pending_local") != (item.ObservedVersion is null) ||
                !DateTimeOffset.TryParse(item.CreatedUtc, out _))
                throw new InvalidDataException("Encrypted entry and index differ");
            if (item.ObservedVersion is not null &&
                ((item.State == "manual_review") !=
                 (item.ObservedVersion == item.ExpectedVersion)))
                throw new InvalidDataException("Synthetic version comparison is inconsistent");
            return item;
        }
        finally { CryptographicOperations.ZeroMemory(clear); }
    }

    private static Snapshot Read(SqliteDataReader reader) =>
        Decode((byte[])reader.GetValue(2), reader.GetString(1), reader.GetString(0));

    public Snapshot Enqueue(string companyId, string eventId, int expectedVersion)
    {
        var document = DocumentFor(companyId);
        eventId = EventId(eventId);
        if (expectedVersion is < 0 or > 100)
            throw new ArgumentOutOfRangeException(nameof(expectedVersion));
        using var db = Open();
        using var tx = db.BeginTransaction();
        Snapshot? prior = null;
        using (var cmd = db.CreateCommand())
        {
            cmd.Transaction = tx;
            cmd.CommandText = """
                SELECT event_id,company_id,encrypted_entry
                FROM synthetic_offline_outbox WHERE event_id=$event;
                """;
            cmd.Parameters.AddWithValue("$event", eventId);
            using var reader = cmd.ExecuteReader();
            if (reader.Read()) prior = Read(reader);
        }
        if (prior is not null)
        {
            if (prior.CompanyId != companyId || prior.ExpectedVersion != expectedVersion)
                throw new InvalidDataException("Event replay differs from original");
            tx.Commit();
            return prior; // exact replay is idempotent, never overwritten
        }
        var item = new Snapshot(companyId, eventId, document, expectedVersion, null,
            "pending_local", DateTimeOffset.UtcNow.ToString("O"));
        var encrypted = Protect(item);
        try
        {
            using var insert = db.CreateCommand();
            insert.Transaction = tx;
            insert.CommandText = """
                INSERT INTO synthetic_offline_outbox(event_id,company_id,encrypted_entry)
                VALUES($id,$company,$blob);
                """;
            insert.Parameters.AddWithValue("$id", eventId);
            insert.Parameters.AddWithValue("$company", companyId);
            insert.Parameters.AddWithValue("$blob", encrypted);
            insert.ExecuteNonQuery();
            tx.Commit();
        }
        finally { CryptographicOperations.ZeroMemory(encrypted); }
        return item;
    }

    /// <summary>
    /// Local MANUALLY SUPPLIED synthetic version, not a remote observation.
    /// Results mean "needs manual review", never "synchronized" or "ACKed".
    /// A conflict cannot be silently reinterpreted or auto-retried.
    /// </summary>
    public Snapshot CompareLocalVersion(string companyId, string eventId, int simulatedVersion)
    {
        _ = DocumentFor(companyId);
        eventId = EventId(eventId);
        if (simulatedVersion is < 0 or > 100)
            throw new ArgumentOutOfRangeException(nameof(simulatedVersion));
        using var db = Open();
        using var tx = db.BeginTransaction();
        Snapshot original;
        using (var query = db.CreateCommand())
        {
            query.Transaction = tx;
            query.CommandText = """
                SELECT event_id,company_id,encrypted_entry
                FROM synthetic_offline_outbox WHERE event_id=$id AND company_id=$company;
                """;
            query.Parameters.AddWithValue("$id", eventId);
            query.Parameters.AddWithValue("$company", companyId);
            using var reader = query.ExecuteReader();
            if (!reader.Read())
                throw new InvalidDataException("No event belongs to this company");
            original = Read(reader);
        }
        if (original.ObservedVersion is not null)
        {
            if (original.ObservedVersion != simulatedVersion)
                throw new InvalidDataException("Different version requires explicit manual resolution");
            tx.Commit();
            return original;
        }
        var changed = original with {
            ObservedVersion = simulatedVersion,
            State = simulatedVersion == original.ExpectedVersion
                ? "manual_review" : "conflict_manual_review"
        };
        var encrypted = Protect(changed);
        try
        {
            using var update = db.CreateCommand();
            update.Transaction = tx;
            update.CommandText = """
                UPDATE synthetic_offline_outbox SET encrypted_entry=$blob
                WHERE event_id=$id AND company_id=$company;
                """;
            update.Parameters.AddWithValue("$blob", encrypted);
            update.Parameters.AddWithValue("$id", eventId);
            update.Parameters.AddWithValue("$company", companyId);
            if (update.ExecuteNonQuery() != 1)
                throw new IOException("Synthetic outbox changed concurrently");
            tx.Commit();
        }
        finally { CryptographicOperations.ZeroMemory(encrypted); }
        return changed;
    }

    public IReadOnlyList<Snapshot> List(string companyId)
    {
        _ = DocumentFor(companyId);
        using var db = Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT event_id,company_id,encrypted_entry
            FROM synthetic_offline_outbox WHERE company_id=$company
            ORDER BY event_id LIMIT 100;
            """;
        cmd.Parameters.AddWithValue("$company", companyId);
        using var reader = cmd.ExecuteReader();
        var items = new List<Snapshot>();
        while (reader.Read()) items.Add(Read(reader));
        return items.AsReadOnly();
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
        var root = Path.Combine(Path.GetTempPath(), "finai-synthetic-outbox-" + Guid.NewGuid().ToString("N"));
        try
        {
            var queue = new SyntheticOfflineSyncOutbox(root);
            var a = Guid.NewGuid().ToString("D");
            var b = Guid.NewGuid().ToString("D");
            var first = queue.Enqueue("1", a, 2);
            var second = queue.Enqueue("2", b, 3);
            if (first.State != "pending_local" ||
                queue.Enqueue("1", a, 2) != first ||
                !Rejected(() => queue.Enqueue("1", a, 3)) ||
                !Rejected(() => queue.Enqueue("2", a, 2)) ||
                !Rejected(() => queue.List("9")))
                return false;
            if (queue.CompareLocalVersion("1", a, 2).State != "manual_review" ||
                queue.CompareLocalVersion("2", b, 8).State != "conflict_manual_review" ||
                !Rejected(() => queue.CompareLocalVersion("1", a, 4)) ||
                !Rejected(() => queue.CompareLocalVersion("1", b, 3)))
                return false;
            queue = new SyntheticOfflineSyncOutbox(root);
            if (queue.List("1").Count != 1 || queue.List("2").Count != 1 ||
                queue.List("3").Count != 0 ||
                queue.List("1")[0].ObservedVersion != 2 ||
                queue.List("2")[0].ObservedVersion != 8)
                return false;
            var raw = Encoding.Latin1.GetString(File.ReadAllBytes(
                Path.Combine(root, "synthetic-offline-outbox.db")));
            if (raw.Contains(first.DocumentId, StringComparison.Ordinal) ||
                raw.Contains(second.DocumentId, StringComparison.Ordinal) ||
                raw.Contains("conflict_manual_review", StringComparison.Ordinal))
                return false;
            using (var db = queue.Open())
            using (var cmd = db.CreateCommand())
            {
                cmd.CommandText = """
                    UPDATE synthetic_offline_outbox SET encrypted_entry=$bad WHERE event_id=$id;
                    """;
                cmd.Parameters.AddWithValue("$bad", new byte[] {1,2,3,4});
                cmd.Parameters.AddWithValue("$id", a);
                cmd.ExecuteNonQuery();
            }
            return Rejected(() => queue.List("1")) && queue.List("2").Count == 1;
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, recursive: true);
        }
    }
}

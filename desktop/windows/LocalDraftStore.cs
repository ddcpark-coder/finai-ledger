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
/// A small encrypted-at-rest OFFLINE DRAFT store, not the accounting ledger.
/// Real accounting entries require a separately audited schema and posting engine.
/// </summary>
internal sealed class LocalDraftStore
{
    private static readonly byte[] Entropy = Encoding.UTF8.GetBytes("e-integrator.offline.drafts.v1");
    private readonly string databasePath;

    internal sealed record Draft(string Id, string Title, string Note, string UpdatedAt);

    public LocalDraftStore(string? baseDirectory = null)
    {
        var root = baseDirectory ?? Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "e-integrator", "Desktop");
        Directory.CreateDirectory(root);
        databasePath = Path.Combine(root, "drafts.db");
        using var db = Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS offline_drafts (
                id TEXT PRIMARY KEY NOT NULL,
                encrypted_payload BLOB NOT NULL,
                updated_at TEXT NOT NULL
            );
            """;
        cmd.ExecuteNonQuery();
    }

    private SqliteConnection Open()
    {
        var builder = new SqliteConnectionStringBuilder
        {
            DataSource = databasePath,
            Mode = SqliteOpenMode.ReadWriteCreate,
            Pooling = false
        };
        var conn = new SqliteConnection(builder.ToString());
        conn.Open();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = "PRAGMA busy_timeout=3000;";
        cmd.ExecuteNonQuery();
        return conn;
    }

    private static byte[] Protect(string text) =>
        ProtectedData.Protect(Encoding.UTF8.GetBytes(text), Entropy, DataProtectionScope.CurrentUser);

    private static string Unprotect(byte[] data) =>
        Encoding.UTF8.GetString(ProtectedData.Unprotect(data, Entropy, DataProtectionScope.CurrentUser));

    public List<Draft> List()
    {
        using var db = Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT id, encrypted_payload, updated_at FROM offline_drafts ORDER BY updated_at DESC LIMIT 100;";
        using var reader = cmd.ExecuteReader();
        var result = new List<Draft>();
        while (reader.Read())
        {
            var id = reader.GetString(0);
            var payload = Unprotect((byte[])reader.GetValue(1));
            var data = JsonSerializer.Deserialize<Draft>(payload)
                       ?? throw new InvalidDataException("Invalid local draft");
            result.Add(data with { Id = id, UpdatedAt = reader.GetString(2) });
        }
        return result;
    }

    // OFFLINE-02B: backup and restore are deliberately not exposed to web content.
    // A single SQLite SELECT provides a consistent committed snapshot of ALL rows,
    // not the first 100 visible in the demo UI. Exceeding the cap fails closed.
    internal List<Draft> SnapshotForPortableBackup()
    {
        using var db = Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT id, encrypted_payload, updated_at
            FROM offline_drafts ORDER BY id LIMIT 1001;
            """;
        using var reader = cmd.ExecuteReader();
        var result = new List<Draft>();
        while (reader.Read())
        {
            if (result.Count >= 1000)
                throw new InvalidDataException("Draft backup limit exceeded");
            var id = reader.GetString(0);
            var json = Unprotect((byte[])reader.GetValue(1));
            var stored = JsonSerializer.Deserialize<Draft>(json)
                         ?? throw new InvalidDataException("Corrupt local draft");
            if (stored.Id != id || stored.UpdatedAt != reader.GetString(2))
                throw new InvalidDataException("Local draft row integrity mismatch");
            var draft = stored;
            PortableDraftBackup.ValidateDraft(draft);
            result.Add(draft);
        }
        return result;
    }

    /// <summary>
    /// Atomic fail-closed restore: no replacement or merging into an existing
    /// nonempty database. The caller MUST authenticate and validate the full
    /// portable backup before invoking this method.
    /// </summary>
    internal void RestoreIntoEmptyStore(IReadOnlyList<Draft> drafts)
    {
        if (drafts.Count > 1000)
            throw new InvalidDataException("Draft restore limit exceeded");
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var draft in drafts)
        {
            PortableDraftBackup.ValidateDraft(draft);
            if (!seen.Add(draft.Id))
                throw new InvalidDataException("Duplicate draft identifier");
        }

        using var db = Open();
        using var tx = db.BeginTransaction();
        using (var existing = db.CreateCommand())
        {
            existing.Transaction = tx;
            existing.CommandText = "SELECT EXISTS(SELECT 1 FROM offline_drafts LIMIT 1);";
            if (Convert.ToInt64(existing.ExecuteScalar()) != 0)
                throw new InvalidOperationException("Restore requires an empty destination");
        }
        foreach (var draft in drafts)
        {
            using var cmd = db.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = """
                INSERT INTO offline_drafts(id,encrypted_payload,updated_at)
                VALUES($id,$payload,$updated);
                """;
            cmd.Parameters.AddWithValue("$id", draft.Id);
            cmd.Parameters.AddWithValue("$payload", Protect(JsonSerializer.Serialize(draft)));
            cmd.Parameters.AddWithValue("$updated", draft.UpdatedAt);
            if (cmd.ExecuteNonQuery() != 1)
                throw new IOException("Local draft restore failed");
        }
        tx.Commit();
    }

    public Draft Save(string title, string note)
    {
        title = title.Trim();
        note = note.Trim();
        if (title.Length < 1 || title.Length > 120 || note.Length > 4000)
            throw new ArgumentException("Draft title/note length invalid");
        var draft = new Draft(Guid.NewGuid().ToString("D"), title, note,
            DateTimeOffset.UtcNow.ToString("O"));
        var encrypted = Protect(JsonSerializer.Serialize(draft));
        using var db = Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = "INSERT INTO offline_drafts (id, encrypted_payload, updated_at) VALUES ($id, $payload, $updated);";
        cmd.Parameters.AddWithValue("$id", draft.Id);
        cmd.Parameters.AddWithValue("$payload", encrypted);
        cmd.Parameters.AddWithValue("$updated", draft.UpdatedAt);
        if (cmd.ExecuteNonQuery() != 1)
            throw new IOException("Draft could not be stored");
        return draft;
    }

    public bool Delete(string id)
    {
        if (!Guid.TryParseExact(id, "D", out var parsed))
            throw new ArgumentException("Invalid draft identifier");
        using var db = Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = "DELETE FROM offline_drafts WHERE id = $id;";
        cmd.Parameters.AddWithValue("$id", parsed.ToString("D"));
        return cmd.ExecuteNonQuery() == 1;
    }

    public static bool SelfTest()
    {
        var root = Path.Combine(Path.GetTempPath(), "finai-offline-selftest-" + Guid.NewGuid().ToString("N"));
        try
        {
            const string marker = "OFFLINE_PRIVATE_MARKER_TEST_2026";
            var store = new LocalDraftStore(root);
            var draft = store.Save("Testni osnutek", marker);
            var reopened = new LocalDraftStore(root);
            if (reopened.List().Count != 1 || reopened.List()[0].Note != marker)
                return false;
            var disk = File.ReadAllBytes(Path.Combine(root, "drafts.db"));
            if (Encoding.UTF8.GetString(disk).Contains(marker, StringComparison.Ordinal))
                return false; // plaintext must not appear in the database
            if (!reopened.Delete(draft.Id) || reopened.List().Count != 0)
                return false;
            return true;
        }
        finally
        {
            if (Directory.Exists(root))
                Directory.Delete(root, recursive: true);
        }
    }
}

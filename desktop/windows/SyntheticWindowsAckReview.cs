using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Data.Sqlite;

namespace EIntegrator.Desktop;

/// <summary>
/// NEXT32: OFFLINE verification of a manually saved, signed local/test Laravel
/// receipt. Authenticates a pre-trusted RSA public-key fingerprint, exact
/// synthetic event identity and ciphertext hash. No HTTP or posting. A verified
/// ACK is stored separately under DPAPI and does NOT change the pending outbox.
/// </summary>
internal sealed class SyntheticWindowsAckReview
{
    private const string Format = "finai-windows-synthetic-ack-v1";
    private static readonly byte[] Entropy =
        Encoding.UTF8.GetBytes("finai.synthetic.signed.ack.local.v1");
    private readonly SyntheticWindowsTransfer transfer;
    private readonly SyntheticOfflineSyncOutbox outbox;
    private readonly string path;

    internal sealed record Review(string EventId, string CompanyId,
        int Version, string State);

    internal SyntheticWindowsAckReview(string? root = null)
    {
        root ??= Path.Combine(Environment.GetFolderPath(
            Environment.SpecialFolder.LocalApplicationData), "e-integrator", "Desktop");
        if (Directory.Exists(root) &&
            new DirectoryInfo(root).Attributes.HasFlag(FileAttributes.ReparsePoint))
            throw new IOException("Linked synthetic review folder forbidden");
        Directory.CreateDirectory(root);
        path = Path.Combine(root, "synthetic-signed-ack-review.db");
        if (File.Exists(path) &&
            new FileInfo(path).Attributes.HasFlag(FileAttributes.ReparsePoint))
            throw new IOException("Linked synthetic review file forbidden");
        transfer = new SyntheticWindowsTransfer(root);
        outbox = new SyntheticOfflineSyncOutbox(root);
        using var db = Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS signed_synthetic_ack(
                event_id TEXT PRIMARY KEY NOT NULL,
                company_id TEXT NOT NULL,
                protected_review BLOB NOT NULL
            );
            """;
        cmd.ExecuteNonQuery();
    }

    private SqliteConnection Open()
    {
        var db = new SqliteConnection(new SqliteConnectionStringBuilder
        {
            DataSource = path, Mode = SqliteOpenMode.ReadWriteCreate, Pooling = false
        }.ToString());
        db.Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = "PRAGMA busy_timeout=3000;";
        cmd.ExecuteNonQuery();
        return db;
    }

    private static string RequireFingerprint(string value)
    {
        if (value is null || !Regex.IsMatch(value,
            "^[a-f0-9]{64}$", RegexOptions.CultureInvariant))
            throw new ArgumentException("Out-of-band fingerprint is required");
        return value;
    }

    private static string Canonical(JsonElement ack)
    {
        return string.Join("\n", new[]
        {
            Format,
            ack.GetProperty("companyId").GetInt32().ToString(
                System.Globalization.CultureInfo.InvariantCulture),
            ack.GetProperty("documentId").GetString() ?? "",
            ack.GetProperty("clientEventId").GetString() ?? "",
            ack.GetProperty("expectedVersion").GetInt32().ToString(
                System.Globalization.CultureInfo.InvariantCulture),
            ack.GetProperty("version").GetInt32().ToString(
                System.Globalization.CultureInfo.InvariantCulture),
            ack.GetProperty("ciphertextSha256").GetString() ?? "",
            ack.GetProperty("serverUserId").GetInt32().ToString(
                System.Globalization.CultureInfo.InvariantCulture),
            "true", "false", "false",
            ack.GetProperty("keyFingerprint").GetString() ?? ""
        }) + "\n";
    }

    private static JsonElement SignedAck(string responseJson)
    {
        if (responseJson is null || responseJson.Length is < 100 or > 16000)
            throw new InvalidDataException("Invalid synthetic ACK response size");
        using var parsed = JsonDocument.Parse(responseJson,
            new JsonDocumentOptions { CommentHandling = JsonCommentHandling.Disallow,
                AllowTrailingCommas = false, MaxDepth = 6 });
        var root = parsed.RootElement;
        if (root.ValueKind != JsonValueKind.Object ||
            root.EnumerateObject().Count() != 1)
            throw new InvalidDataException("Only a signed Laravel response is accepted");
        var data = root.GetProperty("data");
        if (data.ValueKind != JsonValueKind.Object ||
            data.GetProperty("demo_only").GetBoolean() != true ||
            data.GetProperty("real_sync_enabled").GetBoolean() != false ||
            data.GetProperty("business_document_created").GetBoolean() != false ||
            data.GetProperty("encrypted_demo_envelope_stored").GetBoolean() != true)
            throw new InvalidDataException("Response is not a synthetic receipt");
        var ack = data.GetProperty("signed_windows_ack");
        if (ack.ValueKind != JsonValueKind.Object ||
            ack.EnumerateObject().Count() != 13 ||
            ack.GetProperty("format").GetString() != Format ||
            ack.GetProperty("demoOnly").GetBoolean() != true ||
            ack.GetProperty("businessDocumentCreated").GetBoolean() != false ||
            ack.GetProperty("realSyncEnabled").GetBoolean() != false)
            throw new InvalidDataException("Missing protected synthetic ACK fields");
        return ack.Clone();
    }

    public Review VerifyAndStore(string companyId, string eventId,
        string passphrase, string responseJson, string trustedPublicPem,
        string outOfBandFingerprint)
    {
        var expectedFingerprint = RequireFingerprint(outOfBandFingerprint);
        if (!Guid.TryParseExact(eventId, "D", out var guid))
            throw new ArgumentException("Malformed synthetic event identifier");
        eventId = guid.ToString("D");
        var item = outbox.List(companyId).SingleOrDefault(x => x.EventId == eventId)
            ?? throw new InvalidDataException("No matching pending event");
        if (item.State != "pending_local" || item.ObservedVersion is not null)
            throw new InvalidDataException("Conflicted event cannot be acknowledged");

        // A cached export MUST exist and decrypt using the ORIGINAL local phrase.
        // This also binds the ACK to the exact original GCM ciphertext.
        var exported = transfer.Export(companyId, eventId, passphrase);
        using var local = JsonDocument.Parse(exported);
        var cipherB64 = local.RootElement.GetProperty("envelope")
            .GetProperty("ciphertext").GetString() ?? "";
        var cipher = Convert.FromBase64String(cipherB64);
        var digest = Convert.ToHexString(SHA256.HashData(cipher)).ToLowerInvariant();
        CryptographicOperations.ZeroMemory(cipher);

        if (string.IsNullOrWhiteSpace(trustedPublicPem) ||
            trustedPublicPem.Length > 8000 ||
            !trustedPublicPem.StartsWith("-----BEGIN PUBLIC KEY-----",
                StringComparison.Ordinal))
            throw new InvalidDataException("Out-of-band RSA public PEM is required");
        using var rsa = RSA.Create();
        rsa.ImportFromPem(trustedPublicPem);
        if (rsa.KeySize < 2048)
            throw new InvalidDataException("Synthetic public key too small");
        var actualFingerprint = Convert.ToHexString(
            SHA256.HashData(rsa.ExportSubjectPublicKeyInfo())).ToLowerInvariant();
        if (!CryptographicOperations.FixedTimeEquals(
            Encoding.ASCII.GetBytes(expectedFingerprint),
            Encoding.ASCII.GetBytes(actualFingerprint)))
            throw new CryptographicException("Untrusted synthetic signing key");

        var ack = SignedAck(responseJson);
        var keyFingerprint = ack.GetProperty("keyFingerprint").GetString() ?? "";
        var hash = ack.GetProperty("ciphertextSha256").GetString() ?? "";
        if (ack.GetProperty("companyId").GetInt32().ToString() != item.CompanyId ||
            ack.GetProperty("documentId").GetString() != item.DocumentId ||
            ack.GetProperty("clientEventId").GetString() != item.EventId ||
            ack.GetProperty("expectedVersion").GetInt32() != item.ExpectedVersion ||
            ack.GetProperty("version").GetInt32() != item.ExpectedVersion + 1 ||
            ack.GetProperty("serverUserId").GetInt32() < 1 ||
            !Regex.IsMatch(hash, "^[0-9a-f]{64}$") ||
            !CryptographicOperations.FixedTimeEquals(
                Encoding.ASCII.GetBytes(digest), Encoding.ASCII.GetBytes(hash)) ||
            keyFingerprint != expectedFingerprint)
            throw new InvalidDataException("ACK is not for this encrypted local event");
        var signature = Convert.FromBase64String(
            ack.GetProperty("signature").GetString() ?? "");
        if (signature.Length != rsa.KeySize / 8 ||
            !rsa.VerifyData(Encoding.UTF8.GetBytes(Canonical(ack)), signature,
                HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1))
            throw new CryptographicException("Invalid synthetic server signature");

        // Keep a private, append-only verification record separate from outbox.
        // NEVER change outbox to 'synced' or authorize accounting side effects.
        var normalized = JsonSerializer.Serialize(ack);
        using var db = Open();
        using var tx = db.BeginTransaction();
        byte[]? previous;
        using (var lookup = db.CreateCommand())
        {
            lookup.Transaction = tx;
            lookup.CommandText = """
                SELECT protected_review FROM signed_synthetic_ack
                WHERE event_id=$id AND company_id=$company;
                """;
            lookup.Parameters.AddWithValue("$id", eventId);
            lookup.Parameters.AddWithValue("$company", companyId);
            previous = lookup.ExecuteScalar() as byte[];
        }
        if (previous is not null)
        {
            var previousRaw = ProtectedData.Unprotect(previous, Entropy,
                DataProtectionScope.CurrentUser);
            try
            {
                if (Encoding.UTF8.GetString(previousRaw) != normalized)
                    throw new InvalidDataException("Different ACK for previously reviewed event");
            }
            finally { CryptographicOperations.ZeroMemory(previousRaw); }
        }
        else
        {
            var raw = Encoding.UTF8.GetBytes(normalized);
            byte[] sealedAck;
            try
            {
                sealedAck = ProtectedData.Protect(raw, Entropy,
                    DataProtectionScope.CurrentUser);
            }
            finally { CryptographicOperations.ZeroMemory(raw); }
            try
            {
                using var insert = db.CreateCommand();
                insert.Transaction = tx;
                insert.CommandText = """
                    INSERT INTO signed_synthetic_ack(event_id,company_id,protected_review)
                    VALUES($id,$company,$receipt);
                    """;
                insert.Parameters.AddWithValue("$id", eventId);
                insert.Parameters.AddWithValue("$company", companyId);
                insert.Parameters.AddWithValue("$receipt", sealedAck);
                insert.ExecuteNonQuery();
            }
            finally { CryptographicOperations.ZeroMemory(sealedAck); }
        }
        tx.Commit();
        return new Review(eventId, companyId, item.ExpectedVersion + 1,
            "signature_verified_locally_only");
    }

    private static bool Denied(Action action)
    {
        try { action(); return false; }
        catch (ArgumentException) { return true; }
        catch (InvalidDataException) { return true; }
        catch (CryptographicException) { return true; }
    }

    public static bool SelfTest()
    {
        var root = Path.Combine(Path.GetTempPath(),
            "finai-next32-signed-ack-" + Guid.NewGuid().ToString("N"));
        const string phrase = "NEXT32-qa-only-unique-strong-passphrase";
        try
        {
            var transfer = new SyntheticWindowsTransfer(root);
            var original = transfer.Queue("1", 0);
            var other = transfer.Queue("2", 0);
            var packet = transfer.Export("1", original.EventId, phrase);
            transfer.Export("2", other.EventId, phrase);
            using var parsed = JsonDocument.Parse(packet);
            var localCipher = Convert.FromBase64String(parsed.RootElement
                .GetProperty("envelope").GetProperty("ciphertext").GetString() ?? "");
            var hash = Convert.ToHexString(SHA256.HashData(localCipher)).ToLowerInvariant();
            using var rsa = RSA.Create(2048);
            var pem = rsa.ExportSubjectPublicKeyInfoPem();
            var fingerprint = Convert.ToHexString(SHA256.HashData(
                rsa.ExportSubjectPublicKeyInfo())).ToLowerInvariant();
            var draftAck = new
            {
                format = Format, companyId = 1,
                documentId = original.DocumentId,
                clientEventId = original.EventId, expectedVersion = 0,
                version = 1, ciphertextSha256 = hash, serverUserId = 15,
                demoOnly = true, businessDocumentCreated = false,
                realSyncEnabled = false, keyFingerprint = fingerprint
            };
            var jsonAck = JsonSerializer.Serialize(draftAck);
            using var signable = JsonDocument.Parse(jsonAck);
            var signature = Convert.ToBase64String(rsa.SignData(
                Encoding.UTF8.GetBytes(Canonical(signable.RootElement)),
                HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1));
            var ack = JsonSerializer.Serialize(new {
                data = new {
                    demo_only = true, real_sync_enabled = false,
                    business_document_created = false,
                    encrypted_demo_envelope_stored = true,
                    signed_windows_ack = new {
                        draftAck.format, draftAck.companyId, draftAck.documentId,
                        draftAck.clientEventId, draftAck.expectedVersion,
                        draftAck.version, draftAck.ciphertextSha256,
                        draftAck.serverUserId, draftAck.demoOnly,
                        draftAck.businessDocumentCreated, draftAck.realSyncEnabled,
                        draftAck.keyFingerprint, signature
                    }
                }
            });
            var review = new SyntheticWindowsAckReview(root);
            if (review.VerifyAndStore("1", original.EventId, phrase, ack, pem,
                fingerprint).State != "signature_verified_locally_only" ||
                review.VerifyAndStore("1", original.EventId, phrase, ack, pem,
                fingerprint).Version != 1)
                return false;

            using var evil = RSA.Create(2048);
            var evilPem = evil.ExportSubjectPublicKeyInfoPem();
            var evilFingerprint = Convert.ToHexString(SHA256.HashData(
                evil.ExportSubjectPublicKeyInfo())).ToLowerInvariant();
            var tampered = ack.Replace("\"version\":1", "\"version\":2",
                StringComparison.Ordinal);
            if (!Denied(() => review.VerifyAndStore("1", original.EventId, phrase,
                    ack, pem, evilFingerprint)) ||
                !Denied(() => review.VerifyAndStore("1", original.EventId, phrase,
                    ack, evilPem, fingerprint)) ||
                !Denied(() => review.VerifyAndStore("1", original.EventId, phrase,
                    tampered, pem, fingerprint)) ||
                !Denied(() => review.VerifyAndStore("2", other.EventId, phrase,
                    ack, pem, fingerprint)) ||
                !Denied(() => review.VerifyAndStore("1", original.EventId,
                    "wrong-NEXT32-passphrase", ack, pem, fingerprint)))
                return false;
            var bytes = Encoding.Latin1.GetString(File.ReadAllBytes(Path.Combine(
                root, "synthetic-signed-ack-review.db")));
            if (bytes.Contains(original.DocumentId, StringComparison.Ordinal) ||
                bytes.Contains(signature, StringComparison.Ordinal) ||
                bytes.Contains(hash, StringComparison.Ordinal))
                return false;
            if (new SyntheticOfflineSyncOutbox(root).List("1")[0].State != "pending_local")
                return false;
            using (var db = review.Open())
            using (var cmd = db.CreateCommand())
            {
                cmd.CommandText = """
                    UPDATE signed_synthetic_ack SET protected_review=$bad
                    WHERE event_id=$id;
                    """;
                cmd.Parameters.AddWithValue("$bad", new byte[] {1, 2, 3});
                cmd.Parameters.AddWithValue("$id", original.EventId);
                cmd.ExecuteNonQuery();
            }
            return Denied(() => review.VerifyAndStore("1", original.EventId, phrase,
                ack, pem, fingerprint));
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, recursive: true);
        }
    }
}

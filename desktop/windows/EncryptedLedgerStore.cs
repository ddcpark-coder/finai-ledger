using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Microsoft.Data.Sqlite;

namespace EIntegrator.Desktop;

/// <summary>
/// OFFLINE-02C encrypted test-only ledger, physically separate from legacy
/// plaintext journal sandbox and DPAPI draft database. No UI or network API.
/// Every SQL connection requires a locally DPAPI-protected random database key.
/// Uses SQLite3 Multiple Ciphers, never stock unencrypted SQLite.
/// </summary>
internal sealed class EncryptedLedgerStore : IDisposable
{
    internal sealed record Line(string Account, long DebitCents, long CreditCents);

    internal sealed class Session
    {
        internal EncryptedLedgerStore Owner { get; }
        internal string UserId { get; }
        internal Session(EncryptedLedgerStore owner, string userId)
        {
            Owner = owner;
            UserId = userId;
        }
    }

    private static readonly byte[] Entropy =
        "e-integrator.offline.ledger.key.v1"u8.ToArray();
    private const int PasswordRounds = 600_000;
    private const int MaxEntries = 100;
    private readonly string databasePath;
    private readonly FileStream exclusiveLock;
    private byte[] databaseKey;
    private bool disposed;

    private EncryptedLedgerStore(string directory)
    {
        var root = Path.GetFullPath(directory);
        databasePath = Path.Combine(root, "secure-ledger.db");
        var keyPath = Path.Combine(root, "secure-ledger.key");
        if (!File.Exists(databasePath) || !File.Exists(keyPath))
            throw new InvalidOperationException("Encrypted database/key pair is missing: fail closed");

        // One local process at a time until multi-process migration safety is audited.
        exclusiveLock = new FileStream(Path.Combine(root, "secure-ledger.lock"),
            FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.None);
        try
        {
            var wrapped = File.ReadAllBytes(keyPath);
            databaseKey = ProtectedData.Unprotect(wrapped, Entropy,
                DataProtectionScope.CurrentUser);
            if (databaseKey.Length != 32)
                throw new CryptographicException("Invalid protected database key length");
            using var db = OpenDb();
            using var cmd = db.CreateCommand();
            cmd.CommandText = "SELECT value FROM ledger_meta WHERE name='schema_version';";
            if ((string?)cmd.ExecuteScalar() != "1")
                throw new InvalidDataException("Unsupported encrypted ledger schema");
            if (!VerifyEncryptedFileHeader())
                throw new InvalidDataException("Plaintext database is forbidden");
        }
        catch
        {
            CryptographicOperations.ZeroMemory(databaseKey ?? Array.Empty<byte>());
            exclusiveLock.Dispose();
            throw;
        }
    }

    /// <summary>
    /// Create only in a new, empty private directory. Never migrate/open the
    /// unencrypted journal-sandbox.db or legacy draft database implicitly.
    /// Key material is never persisted in plaintext or supplied by JavaScript.
    /// </summary>
    public static EncryptedLedgerStore CreateNew(string directory,
                                                 string adminLogin, string adminPassphrase)
    {
        ValidatePassword(adminPassphrase);
        var login = NormalizeLogin(adminLogin);
        var root = Path.GetFullPath(directory);
        if (Directory.Exists(root) && Directory.EnumerateFileSystemEntries(root).Any())
            throw new IOException("Encrypted ledger requires an empty directory");
        Directory.CreateDirectory(root);
        var dbPath = Path.Combine(root, "secure-ledger.db");
        var keyPath = Path.Combine(root, "secure-ledger.key");
        var key = RandomNumberGenerator.GetBytes(32);
        try
        {
            var wrapped = ProtectedData.Protect(key, Entropy, DataProtectionScope.CurrentUser);
            using (var writer = new FileStream(keyPath, FileMode.CreateNew,
                FileAccess.Write, FileShare.None, 4096, FileOptions.WriteThrough))
            {
                writer.Write(wrapped);
                writer.Flush(flushToDisk: true);
            }

            // Initialize before reopening through the strict version gate.
            SQLitePCL.Batteries_V2.Init();
            using (var db = OpenDbAt(dbPath, key))
            using (var cmd = db.CreateCommand())
            {
                cmd.CommandText = """
                    CREATE TABLE ledger_meta(name TEXT NOT NULL PRIMARY KEY,value TEXT NOT NULL);
                    INSERT INTO ledger_meta(name,value) VALUES('schema_version','1');
                    CREATE TABLE local_users (
                      user_id TEXT PRIMARY KEY NOT NULL,
                      login TEXT NOT NULL UNIQUE,
                      salt BLOB NOT NULL,
                      password_hash BLOB NOT NULL
                    );
                    CREATE TABLE companies (
                      company_id TEXT PRIMARY KEY NOT NULL,
                      label TEXT NOT NULL
                    );
                    CREATE TABLE memberships (
                      user_id TEXT NOT NULL,
                      company_id TEXT NOT NULL,
                      role TEXT NOT NULL CHECK(role IN ('admin','accountant','viewer')),
                      PRIMARY KEY(user_id,company_id),
                      FOREIGN KEY(user_id) REFERENCES local_users(user_id) ON DELETE RESTRICT,
                      FOREIGN KEY(company_id) REFERENCES companies(company_id) ON DELETE RESTRICT
                    );
                    CREATE TABLE accounts (
                      company_id TEXT NOT NULL,
                      code TEXT NOT NULL,
                      PRIMARY KEY(company_id,code),
                      FOREIGN KEY(company_id) REFERENCES companies(company_id) ON DELETE RESTRICT
                    );
                    CREATE TABLE journals (
                      journal_id TEXT NOT NULL PRIMARY KEY,
                      company_id TEXT NOT NULL,
                      actor_user_id TEXT NOT NULL,
                      idempotency_key TEXT NOT NULL,
                      memo TEXT NOT NULL,
                      created_utc TEXT NOT NULL,
                      sealed INTEGER NOT NULL DEFAULT 0 CHECK(sealed IN (0,1)),
                      UNIQUE(company_id,journal_id),
                      UNIQUE(company_id,idempotency_key),
                      FOREIGN KEY(company_id) REFERENCES companies(company_id) ON DELETE RESTRICT,
                      FOREIGN KEY(actor_user_id,company_id)
                        REFERENCES memberships(user_id,company_id) ON DELETE RESTRICT
                    );
                    CREATE TABLE journal_lines (
                      company_id TEXT NOT NULL,
                      journal_id TEXT NOT NULL,
                      line_no INTEGER NOT NULL,
                      account_code TEXT NOT NULL,
                      debit_cents INTEGER NOT NULL,
                      credit_cents INTEGER NOT NULL,
                      PRIMARY KEY(journal_id,line_no),
                      FOREIGN KEY(company_id,journal_id) REFERENCES journals(company_id,journal_id)
                        ON DELETE RESTRICT,
                      FOREIGN KEY(company_id,account_code) REFERENCES accounts(company_id,code)
                        ON DELETE RESTRICT,
                      CHECK(
                        (debit_cents>0 AND credit_cents=0)
                        OR (credit_cents>0 AND debit_cents=0)
                      )
                    );
                    CREATE TABLE audit_events (
                      event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                      company_id TEXT NOT NULL,
                      actor_user_id TEXT NOT NULL,
                      action TEXT NOT NULL,
                      subject_id TEXT NOT NULL,
                      created_utc TEXT NOT NULL,
                      prev_mac TEXT NOT NULL,
                      chain_mac TEXT NOT NULL,
                      FOREIGN KEY(company_id) REFERENCES companies(company_id) ON DELETE RESTRICT
                    );
                    CREATE TRIGGER journals_no_delete BEFORE DELETE ON journals
                      BEGIN SELECT RAISE(ABORT,'sealed records cannot be deleted'); END;
                    CREATE TRIGGER journals_no_update BEFORE UPDATE ON journals
                    WHEN NOT (OLD.sealed=0 AND NEW.sealed=1
                      AND OLD.journal_id=NEW.journal_id
                      AND OLD.company_id=NEW.company_id
                      AND OLD.actor_user_id=NEW.actor_user_id
                      AND OLD.idempotency_key=NEW.idempotency_key
                      AND OLD.memo=NEW.memo AND OLD.created_utc=NEW.created_utc)
                      BEGIN SELECT RAISE(ABORT,'sealed records cannot be updated'); END;
                    CREATE TRIGGER lines_no_update BEFORE UPDATE ON journal_lines
                      BEGIN SELECT RAISE(ABORT,'posted lines cannot be updated'); END;
                    CREATE TRIGGER lines_no_delete BEFORE DELETE ON journal_lines
                      BEGIN SELECT RAISE(ABORT,'posted lines cannot be deleted'); END;
                    CREATE TRIGGER lines_no_append AFTER INSERT ON journal_lines
                    WHEN (SELECT sealed FROM journals WHERE journal_id=NEW.journal_id)<>0
                      BEGIN SELECT RAISE(ABORT,'cannot append a sealed journal'); END;
                    CREATE TRIGGER audit_no_update BEFORE UPDATE ON audit_events
                      BEGIN SELECT RAISE(ABORT,'audit is append only'); END;
                    CREATE TRIGGER audit_no_delete BEFORE DELETE ON audit_events
                      BEGIN SELECT RAISE(ABORT,'audit is append only'); END;
                    """;
                cmd.ExecuteNonQuery();
                var userId = Guid.NewGuid().ToString("D");
                var salt = RandomNumberGenerator.GetBytes(16);
                var hash = HashPassword(adminPassphrase, salt);
                try
                {
                    using var add = db.CreateCommand();
                    add.CommandText = """
                        INSERT INTO local_users(user_id,login,salt,password_hash)
                        VALUES($id,$login,$salt,$hash);
                        """;
                    add.Parameters.AddWithValue("$id", userId);
                    add.Parameters.AddWithValue("$login", login);
                    add.Parameters.AddWithValue("$salt", salt);
                    add.Parameters.AddWithValue("$hash", hash);
                    add.ExecuteNonQuery();
                }
                finally
                {
                    CryptographicOperations.ZeroMemory(hash);
                }
            }
        }
        finally
        {
            CryptographicOperations.ZeroMemory(key);
        }
        return new EncryptedLedgerStore(root);
    }

    public static EncryptedLedgerStore OpenExisting(string directory) =>
        new(directory);

    private SqliteConnection OpenDb()
    {
        if (disposed) throw new ObjectDisposedException(nameof(EncryptedLedgerStore));
        return OpenDbAt(databasePath, databaseKey);
    }

    private static SqliteConnection OpenDbAt(string path, byte[] key)
    {
        SQLitePCL.Batteries_V2.Init();
        var options = new SqliteConnectionStringBuilder
        {
            DataSource = path,
            Password = Convert.ToHexString(key),
            Mode = SqliteOpenMode.ReadWriteCreate,
            Pooling = false
        };
        var db = new SqliteConnection(options.ToString());
        db.Open();
        try
        {
            using var pragma = db.CreateCommand();
            // DELETE journal avoids persistent WAL copies; the cipher protects
            // database rollback journals too. No mmap or plaintext temp DB.
            pragma.CommandText = """
                PRAGMA journal_mode=DELETE;
                PRAGMA foreign_keys=ON;
                PRAGMA secure_delete=ON;
                PRAGMA trusted_schema=OFF;
                PRAGMA temp_store=MEMORY;
                PRAGMA mmap_size=0;
                PRAGMA encrypt_temp_db=ON;
                """;
            pragma.ExecuteNonQuery();
            using var version = db.CreateCommand();
            version.CommandText = "SELECT sqlite3mc_version();";
            if (version.ExecuteScalar() is not string cipherVersion ||
                string.IsNullOrWhiteSpace(cipherVersion))
                throw new InvalidOperationException("Expected SQLite3MC encryption provider");
            return db;
        }
        catch
        {
            db.Dispose();
            throw;
        }
    }

    private bool VerifyEncryptedFileHeader()
    {
        using var file = new FileStream(databasePath, FileMode.Open, FileAccess.Read,
            FileShare.ReadWrite);
        var header = new byte[16];
        if (file.Read(header) != header.Length) return false;
        return !header.AsSpan().SequenceEqual("SQLite format 3\0"u8);
    }

    private static string NormalizeLogin(string login)
    {
        if (string.IsNullOrWhiteSpace(login)) throw new ArgumentException("Login required");
        var canonical = login.Trim().ToLowerInvariant();
        if (canonical.Length is < 3 or > 60 ||
            !canonical.All(ch => char.IsAsciiLetterLower(ch) || char.IsDigit(ch) ||
                                 ch is '.' or '-' or '_'))
            throw new ArgumentException("Invalid local login");
        return canonical;
    }

    private static void ValidatePassword(string password)
    {
        if (password is null || password.Length < 16 || password.Length > 1024 ||
            string.IsNullOrWhiteSpace(password))
            throw new ArgumentException("Local passphrase must contain 16-1024 characters");
    }

    private static string ValidateUuid(string id)
    {
        if (!Guid.TryParseExact(id, "D", out var guid))
            throw new ArgumentException("Expected UUID identifier");
        return guid.ToString("D");
    }

    private static byte[] HashPassword(string passphrase, byte[] salt) =>
        Rfc2898DeriveBytes.Pbkdf2(passphrase, salt, PasswordRounds,
            HashAlgorithmName.SHA256, 32);

    public Session? Authenticate(string login, string password)
    {
        var canonical = NormalizeLogin(login);
        if (password is null) throw new ArgumentException("Password required");
        using var db = OpenDb();
        using var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT user_id,salt,password_hash FROM local_users WHERE login=$login;";
        cmd.Parameters.AddWithValue("$login", canonical);
        using var reader = cmd.ExecuteReader();
        if (!reader.Read()) return null;
        var userId = reader.GetString(0);
        var salt = (byte[])reader[1];
        var expected = (byte[])reader[2];
        var actual = HashPassword(password, salt);
        try
        {
            return CryptographicOperations.FixedTimeEquals(actual, expected)
                ? new Session(this, userId) : null;
        }
        finally
        {
            CryptographicOperations.ZeroMemory(actual);
        }
    }

    private string RequireRole(SqliteConnection db, Session session, string companyId,
                               bool write)
    {
        companyId = ValidateUuid(companyId);
        if (disposed || !ReferenceEquals(session.Owner, this))
            throw new UnauthorizedAccessException("Invalid local session");
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT role FROM memberships
            WHERE company_id=$company AND user_id=$user;
            """;
        cmd.Parameters.AddWithValue("$company", companyId);
        cmd.Parameters.AddWithValue("$user", session.UserId);
        var role = cmd.ExecuteScalar() as string;
        if (role is null || (write && role == "viewer"))
            throw new UnauthorizedAccessException("Company access denied");
        return role;
    }

    public string CreateCompany(Session admin, string label)
    {
        if (string.IsNullOrWhiteSpace(label) || label.Length > 100)
            throw new ArgumentException("Invalid synthetic company");
        if (disposed || !ReferenceEquals(admin.Owner, this))
            throw new UnauthorizedAccessException("Invalid local session");
        var companyId = Guid.NewGuid().ToString("D");
        using var db = OpenDb();
        using var tx = db.BeginTransaction();
        using (var cmd = db.CreateCommand())
        {
            cmd.Transaction = tx;
            cmd.CommandText = "INSERT INTO companies(company_id,label) VALUES($id,$label);";
            cmd.Parameters.AddWithValue("$id", companyId);
            cmd.Parameters.AddWithValue("$label", label);
            cmd.ExecuteNonQuery();
        }
        using (var cmd = db.CreateCommand())
        {
            cmd.Transaction = tx;
            cmd.CommandText = """
                INSERT INTO memberships(user_id,company_id,role)
                VALUES($user,$company,'admin');
                """;
            cmd.Parameters.AddWithValue("$user", admin.UserId);
            cmd.Parameters.AddWithValue("$company", companyId);
            cmd.ExecuteNonQuery();
        }
        tx.Commit();
        return companyId;
    }

    public string AddUser(Session admin, string companyId, string login,
                          string passphrase, string role)
    {
        ValidatePassword(passphrase);
        var normalized = NormalizeLogin(login);
        if (role is not ("admin" or "accountant" or "viewer"))
            throw new ArgumentException("Unsupported user role");
        using var db = OpenDb();
        if (RequireRole(db, admin, companyId, write: true) != "admin")
            throw new UnauthorizedAccessException("Only local company admin can invite users");
        var userId = Guid.NewGuid().ToString("D");
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = HashPassword(passphrase, salt);
        try
        {
            using var tx = db.BeginTransaction();
            using (var add = db.CreateCommand())
            {
                add.Transaction = tx;
                add.CommandText = """
                    INSERT INTO local_users(user_id,login,salt,password_hash)
                    VALUES($user,$login,$salt,$hash);
                    """;
                add.Parameters.AddWithValue("$user", userId);
                add.Parameters.AddWithValue("$login", normalized);
                add.Parameters.AddWithValue("$salt", salt);
                add.Parameters.AddWithValue("$hash", hash);
                add.ExecuteNonQuery();
            }
            using (var grant = db.CreateCommand())
            {
                grant.Transaction = tx;
                grant.CommandText = """
                    INSERT INTO memberships(user_id,company_id,role)
                    VALUES($user,$company,$role);
                    """;
                grant.Parameters.AddWithValue("$user", userId);
                grant.Parameters.AddWithValue("$company", ValidateUuid(companyId));
                grant.Parameters.AddWithValue("$role", role);
                grant.ExecuteNonQuery();
            }
            tx.Commit();
            return userId;
        }
        finally
        {
            CryptographicOperations.ZeroMemory(hash);
        }
    }

    public void RegisterAccount(Session session, string companyId, string code)
    {
        if (code is null || code.Length is < 4 or > 6 || !code.All(char.IsDigit))
            throw new ArgumentException("Invalid test account number");
        using var db = OpenDb();
        RequireRole(db, session, companyId, write: true);
        using var cmd = db.CreateCommand();
        cmd.CommandText = "INSERT INTO accounts(company_id,code) VALUES($company,$code);";
        cmd.Parameters.AddWithValue("$company", ValidateUuid(companyId));
        cmd.Parameters.AddWithValue("$code", code);
        cmd.ExecuteNonQuery();
    }

    private static void CheckLines(IReadOnlyList<Line> lines)
    {
        if (lines is null || lines.Count is < 2 or > MaxEntries)
            throw new ArgumentException("2-100 journal lines are required");
        long debits = 0, credits = 0;
        checked
        {
            foreach (var line in lines)
            {
                if (line.Account is null || line.Account.Length is < 4 or > 6 ||
                    !line.Account.All(char.IsDigit) ||
                    !((line.DebitCents > 0 && line.CreditCents == 0) ||
                      (line.CreditCents > 0 && line.DebitCents == 0)))
                    throw new ArgumentException("Invalid positive one-sided journal line");
                debits += line.DebitCents;
                credits += line.CreditCents;
            }
        }
        if (debits == 0 || debits != credits)
            throw new ArgumentException("Unbalanced double-entry journal");
    }

    public string Post(Session session, string companyId, string idempotencyKey,
                       string memo, IReadOnlyList<Line> lines)
    {
        companyId = ValidateUuid(companyId);
        idempotencyKey = ValidateUuid(idempotencyKey);
        if (string.IsNullOrWhiteSpace(memo) || memo.Length > 160)
            throw new ArgumentException("Invalid synthetic journal description");
        CheckLines(lines);
        using var db = OpenDb();
        RequireRole(db, session, companyId, write: true);
        var journalId = Guid.NewGuid().ToString("D");
        var created = DateTimeOffset.UtcNow.ToString("O", CultureInfo.InvariantCulture);
        using var tx = db.BeginTransaction();
        using (var cmd = db.CreateCommand())
        {
            cmd.Transaction = tx;
            cmd.CommandText = """
                INSERT INTO journals(journal_id,company_id,actor_user_id,idempotency_key,
                                     memo,created_utc,sealed)
                VALUES($id,$company,$user,$key,$memo,$date,0);
                """;
            cmd.Parameters.AddWithValue("$id", journalId);
            cmd.Parameters.AddWithValue("$company", companyId);
            cmd.Parameters.AddWithValue("$user", session.UserId);
            cmd.Parameters.AddWithValue("$key", idempotencyKey);
            cmd.Parameters.AddWithValue("$memo", memo);
            cmd.Parameters.AddWithValue("$date", created);
            cmd.ExecuteNonQuery();
        }
        for (var i = 0; i < lines.Count; i++)
        {
            var line = lines[i];
            using var cmd = db.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = """
                INSERT INTO journal_lines(company_id,journal_id,line_no,account_code,
                                          debit_cents,credit_cents)
                VALUES($company,$journal,$number,$account,$debit,$credit);
                """;
            cmd.Parameters.AddWithValue("$company", companyId);
            cmd.Parameters.AddWithValue("$journal", journalId);
            cmd.Parameters.AddWithValue("$number", i + 1);
            cmd.Parameters.AddWithValue("$account", line.Account);
            cmd.Parameters.AddWithValue("$debit", line.DebitCents);
            cmd.Parameters.AddWithValue("$credit", line.CreditCents);
            cmd.ExecuteNonQuery();
        }
        using (var seal = db.CreateCommand())
        {
            seal.Transaction = tx;
            seal.CommandText = """
                UPDATE journals SET sealed=1
                WHERE journal_id=$id AND company_id=$company AND sealed=0;
                """;
            seal.Parameters.AddWithValue("$id", journalId);
            seal.Parameters.AddWithValue("$company", companyId);
            if (seal.ExecuteNonQuery() != 1)
                throw new InvalidDataException("Could not seal journal");
        }
        AppendAudit(db, tx, companyId, session.UserId, "journal.post", journalId, created);
        tx.Commit();
        return journalId;
    }

    private void AppendAudit(SqliteConnection db, SqliteTransaction tx, string companyId,
                             string actor, string action, string subject, string created)
    {
        string previous;
        using (var select = db.CreateCommand())
        {
            select.Transaction = tx;
            select.CommandText = """
                SELECT chain_mac FROM audit_events WHERE company_id=$company
                ORDER BY event_id DESC LIMIT 1;
                """;
            select.Parameters.AddWithValue("$company", companyId);
            previous = (string?)select.ExecuteScalar() ?? new string('0', 64);
        }
        var mac = ComputeMac(companyId, actor, action, subject, created, previous);
        using var cmd = db.CreateCommand();
        cmd.Transaction = tx;
        cmd.CommandText = """
            INSERT INTO audit_events(company_id,actor_user_id,action,subject_id,
                                     created_utc,prev_mac,chain_mac)
            VALUES($company,$actor,$action,$subject,$created,$prev,$mac);
            """;
        cmd.Parameters.AddWithValue("$company", companyId);
        cmd.Parameters.AddWithValue("$actor", actor);
        cmd.Parameters.AddWithValue("$action", action);
        cmd.Parameters.AddWithValue("$subject", subject);
        cmd.Parameters.AddWithValue("$created", created);
        cmd.Parameters.AddWithValue("$prev", previous);
        cmd.Parameters.AddWithValue("$mac", mac);
        cmd.ExecuteNonQuery();
    }

    private string ComputeMac(string company, string actor, string action,
                              string subject, string created, string prev)
    {
        // Domain-separated keyed integrity chain, not a remote immutable audit anchor.
        var key = HMACSHA256.HashData(databaseKey,
            "finai.offline.audit.hmac.v1"u8.ToArray());
        try
        {
            var message = Encoding.UTF8.GetBytes(
                string.Join("|", company, actor, action, subject, created, prev));
            return Convert.ToHexString(HMACSHA256.HashData(key, message));
        }
        finally { CryptographicOperations.ZeroMemory(key); }
    }

    public bool VerifyAudit(Session session, string companyId)
    {
        companyId = ValidateUuid(companyId);
        using var db = OpenDb();
        RequireRole(db, session, companyId, write: false);
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT actor_user_id,action,subject_id,created_utc,prev_mac,chain_mac
            FROM audit_events WHERE company_id=$company ORDER BY event_id;
            """;
        cmd.Parameters.AddWithValue("$company", companyId);
        using var reader = cmd.ExecuteReader();
        var prior = new string('0', 64);
        while (reader.Read())
        {
            var mac = reader.GetString(5);
            var actual = ComputeMac(companyId, reader.GetString(0), reader.GetString(1),
                reader.GetString(2), reader.GetString(3), prior);
            if (reader.GetString(4) != prior ||
                !CryptographicOperations.FixedTimeEquals(
                    Convert.FromHexString(mac), Convert.FromHexString(actual)))
                return false;
            prior = mac;
        }
        return true;
    }

    public IReadOnlyList<Line> Lines(Session session, string companyId, string journalId)
    {
        companyId = ValidateUuid(companyId);
        journalId = ValidateUuid(journalId);
        using var db = OpenDb();
        RequireRole(db, session, companyId, write: false);
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT account_code,debit_cents,credit_cents FROM journal_lines
            WHERE company_id=$company AND journal_id=$journal ORDER BY line_no;
            """;
        cmd.Parameters.AddWithValue("$company", companyId);
        cmd.Parameters.AddWithValue("$journal", journalId);
        var result = new List<Line>();
        using var reader = cmd.ExecuteReader();
        while (reader.Read())
            result.Add(new Line(reader.GetString(0), reader.GetInt64(1), reader.GetInt64(2)));
        return result;
    }

    public void Dispose()
    {
        if (disposed) return;
        disposed = true;
        CryptographicOperations.ZeroMemory(databaseKey);
        exclusiveLock.Dispose();
    }

    private static bool Rejected(Action action)
    {
        try { action(); return false; }
        catch (ArgumentException) { return true; }
        catch (InvalidDataException) { return true; }
        catch (InvalidOperationException) { return true; }
        catch (UnauthorizedAccessException) { return true; }
        catch (SqliteException) { return true; }
        catch (CryptographicException) { return true; }
    }

    public static bool SelfTest()
    {
        var root = Path.Combine(Path.GetTempPath(),
            "finai-encrypted-ledger-qa-" + Guid.NewGuid().ToString("N"));
        const string adminPassword = "QA-only-strong-admin-passphrase-2026";
        const string staffPassword = "QA-only-strong-staff-passphrase-2026";
        const string viewerPassword = "QA-only-strong-viewer-passphrase-2026";
        const string marker = "TEST_CIPHER_TEXT_MUST_NEVER_BE_VISIBLE_2026";
        try
        {
            using (var store = CreateNew(root, "qa.admin", adminPassword))
            {
                var admin = store.Authenticate("qa.admin", adminPassword);
                if (admin is null ||
                    store.Authenticate("qa.admin", "synthetic-incorrect-password") is not null)
                    return false;
                var a = store.CreateCompany(admin, "Sintetično podjetje A");
                var b = store.CreateCompany(admin, "Sintetično podjetje B");
                store.RegisterAccount(admin, a, "1200");
                store.RegisterAccount(admin, a, "2600");
                store.RegisterAccount(admin, b, "1200");
                store.RegisterAccount(admin, b, "4300");
                store.AddUser(admin, a, "qa.staff", staffPassword, "accountant");
                store.AddUser(admin, a, "qa.viewer", viewerPassword, "viewer");
                var staff = store.Authenticate("qa.staff", staffPassword);
                var viewer = store.Authenticate("qa.viewer", viewerPassword);
                if (staff is null || viewer is null) return false;
                var journal = store.Post(staff, a, Guid.NewGuid().ToString("D"),
                    marker, [new Line("1200", 12345, 0), new Line("2600", 0, 12345)]);
                if (store.Lines(viewer, a, journal).Count != 2 ||
                    !Rejected(() => store.Post(viewer, a, Guid.NewGuid().ToString("D"),
                        "Viewer must not post",
                        [new Line("1200", 100, 0), new Line("2600", 0, 100)])))
                    return false;
                if (!Rejected(() => store.Lines(staff, b, journal)) ||
                    !Rejected(() => store.RegisterAccount(staff, b, "4300")) ||
                    !Rejected(() => store.Post(staff, a, Guid.NewGuid().ToString("D"),
                        "Wrong tenant account",
                        [new Line("1200", 100, 0), new Line("4300", 0, 100)])) ||
                    !Rejected(() => store.Post(staff, a, Guid.NewGuid().ToString("D"),
                        "Unbalanced",
                        [new Line("1200", 100, 0), new Line("2600", 0, 99)])))
                    return false;
                var duplicateKey = Guid.NewGuid().ToString("D");
                store.Post(staff, a, duplicateKey, "Idempotent first",
                    [new Line("1200", 100, 0), new Line("2600", 0, 100)]);
                if (!Rejected(() => store.Post(staff, a, duplicateKey, "Duplicate",
                    [new Line("1200", 100, 0), new Line("2600", 0, 100)])))
                    return false;
                if (!store.VerifyAudit(admin, a) || !store.VerifyAudit(admin, b))
                    return false;
            }

            var database = Path.Combine(root, "secure-ledger.db");
            var keyFile = Path.Combine(root, "secure-ledger.key");
            var bytes = File.ReadAllBytes(database);
            if (Encoding.UTF8.GetString(bytes).Contains(marker, StringComparison.Ordinal) ||
                bytes.AsSpan(0, 16).SequenceEqual("SQLite format 3\0"u8) ||
                File.ReadAllBytes(keyFile).AsSpan().IndexOf(
                    Encoding.UTF8.GetBytes("QA-only-strong-admin-passphrase-2026")) >= 0)
                return false;

            using (var reopened = OpenExisting(root))
            {
                var admin = reopened.Authenticate("qa.admin", adminPassword);
                if (admin is null || !reopened.VerifyAudit(admin,
                    ReadCompanyIdForTest(reopened, "Sintetično podjetje A")))
                    return false;
            }

            // A valid but unrelated DPAPI key must NOT transparently open an
            // existing encrypted database (and no plaintext fallback is allowed).
            var savedKey = File.ReadAllBytes(keyFile);
            var incorrect = RandomNumberGenerator.GetBytes(32);
            var wrappedWrong = ProtectedData.Protect(incorrect, Entropy,
                DataProtectionScope.CurrentUser);
            File.WriteAllBytes(keyFile, wrappedWrong);
            if (!Rejected(() => { using var _ = OpenExisting(root); }))
                return false;
            File.WriteAllBytes(keyFile, savedKey);
            using var final = OpenExisting(root);
            return final.Authenticate("qa.admin", adminPassword) is not null;
        }
        finally
        {
            if (Directory.Exists(root)) Directory.Delete(root, recursive: true);
        }
    }

    private static string ReadCompanyIdForTest(EncryptedLedgerStore store, string label)
    {
        using var db = store.OpenDb();
        using var cmd = db.CreateCommand();
        cmd.CommandText = "SELECT company_id FROM companies WHERE label=$label;";
        cmd.Parameters.AddWithValue("$label", label);
        return (string?)cmd.ExecuteScalar() ?? throw new InvalidDataException("Missing test company");
    }
}

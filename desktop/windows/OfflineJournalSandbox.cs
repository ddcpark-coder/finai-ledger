using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Microsoft.Data.Sqlite;

namespace EIntegrator.Desktop;

/// <summary>
/// OFFLINE-02 test-only journal sandbox. No user-facing posting API,
/// no production accounting use, no real personal or financial data.
/// Uses fixed EUR minor units (cents) for invariant tests; not a VAT/tax engine.
/// </summary>
internal sealed class OfflineJournalSandbox
{
    internal sealed record Line(string AccountCode, long DebitCents, long CreditCents);
    internal sealed record Journal(string Id, string CompanyId, string IdempotencyKey,
                                   string Memo, string? ReversalOf, string CreatedAt);

    private readonly string databasePath;

    public OfflineJournalSandbox(string baseDirectory)
    {
        Directory.CreateDirectory(baseDirectory);
        databasePath = Path.Combine(baseDirectory, "journal-sandbox.db");
        using var db = Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            CREATE TABLE IF NOT EXISTS companies(
              id TEXT NOT NULL PRIMARY KEY,
              label TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS ledger_accounts(
              company_id TEXT NOT NULL,
              code TEXT NOT NULL,
              PRIMARY KEY (company_id,code),
              FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT
            );
            CREATE TABLE IF NOT EXISTS journals(
              id TEXT NOT NULL PRIMARY KEY,
              company_id TEXT NOT NULL,
              idempotency_key TEXT NOT NULL,
              memo TEXT NOT NULL,
              reversal_of TEXT,
              created_at TEXT NOT NULL,
              sealed INTEGER NOT NULL DEFAULT 0 CHECK(sealed IN (0,1)),
              UNIQUE(company_id,id),
              UNIQUE(company_id,idempotency_key),
              FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
              FOREIGN KEY (company_id,reversal_of) REFERENCES journals(company_id,id) ON DELETE RESTRICT
            );
            CREATE UNIQUE INDEX IF NOT EXISTS uq_journal_reversal
              ON journals(company_id,reversal_of)
              WHERE reversal_of IS NOT NULL;
            CREATE TABLE IF NOT EXISTS journal_lines(
              journal_id TEXT NOT NULL,
              company_id TEXT NOT NULL,
              line_number INTEGER NOT NULL,
              account_code TEXT NOT NULL,
              debit_cents INTEGER NOT NULL,
              credit_cents INTEGER NOT NULL,
              PRIMARY KEY(journal_id,line_number),
              FOREIGN KEY(company_id,journal_id) REFERENCES journals(company_id,id) ON DELETE RESTRICT,
              FOREIGN KEY(company_id,account_code) REFERENCES ledger_accounts(company_id,code) ON DELETE RESTRICT,
              CHECK (
                (debit_cents > 0 AND credit_cents = 0)
                 OR
                (credit_cents > 0 AND debit_cents = 0)
              )
            );
            CREATE TRIGGER IF NOT EXISTS journal_no_update
              BEFORE UPDATE ON journals
              WHEN NOT (OLD.sealed=0 AND NEW.sealed=1
                AND OLD.id=NEW.id AND OLD.company_id=NEW.company_id
                AND OLD.idempotency_key=NEW.idempotency_key AND OLD.memo=NEW.memo
                AND OLD.created_at=NEW.created_at
                AND OLD.reversal_of IS NEW.reversal_of)
              BEGIN SELECT RAISE(ABORT,'posted journals are immutable'); END;
            CREATE TRIGGER IF NOT EXISTS lines_no_insert_after_seal
              BEFORE INSERT ON journal_lines
              WHEN (SELECT sealed FROM journals WHERE id=NEW.journal_id) != 0
              BEGIN SELECT RAISE(ABORT,'posted journal cannot receive new lines'); END;
            CREATE TRIGGER IF NOT EXISTS journal_no_delete
              BEFORE DELETE ON journals BEGIN SELECT RAISE(ABORT,'posted journals are immutable'); END;
            CREATE TRIGGER IF NOT EXISTS lines_no_update
              BEFORE UPDATE ON journal_lines BEGIN SELECT RAISE(ABORT,'posted lines are immutable'); END;
            CREATE TRIGGER IF NOT EXISTS lines_no_delete
              BEFORE DELETE ON journal_lines BEGIN SELECT RAISE(ABORT,'posted lines are immutable'); END;
            """;
        cmd.ExecuteNonQuery();
    }

    private SqliteConnection Open()
    {
        var cs = new SqliteConnectionStringBuilder
        {
            DataSource = databasePath,
            Mode = SqliteOpenMode.ReadWriteCreate,
            Pooling = false
        };
        var db = new SqliteConnection(cs.ToString());
        db.Open();
        using var pragma = db.CreateCommand();
        pragma.CommandText = "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=3000;";
        pragma.ExecuteNonQuery();
        return db;
    }

    private static string Id(string value)
    {
        if (!Guid.TryParseExact(value, "D", out var guid))
            throw new ArgumentException("Company/journal identifier must be UUID");
        return guid.ToString("D");
    }

    private static bool SafeAccount(string value) =>
        Regex.IsMatch(value, @"^[0-9]{4,6}$", RegexOptions.CultureInvariant);

    private static void Validate(IReadOnlyList<Line> lines)
    {
        if (lines.Count < 2 || lines.Count > 100)
            throw new ArgumentException("Journal requires 2–100 lines");
        long debit = 0, credit = 0;
        checked
        {
            foreach (var line in lines)
            {
                if (!SafeAccount(line.AccountCode) ||
                    (line.DebitCents <= 0 && line.CreditCents <= 0) ||
                    (line.DebitCents > 0 && line.CreditCents > 0) ||
                    line.DebitCents < 0 || line.CreditCents < 0)
                    throw new ArgumentException("Invalid account/side/amount");
                debit += line.DebitCents;
                credit += line.CreditCents;
            }
        }
        if (debit != credit || debit == 0)
            throw new ArgumentException("Journal is not balanced");
    }

    public void RegisterCompany(string companyId, string label)
    {
        companyId = Id(companyId);
        if (string.IsNullOrWhiteSpace(label) || label.Length > 100)
            throw new ArgumentException("Invalid synthetic company label");
        using var db = Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = "INSERT INTO companies (id,label) VALUES ($id,$label);";
        cmd.Parameters.AddWithValue("$id", companyId);
        cmd.Parameters.AddWithValue("$label", label);
        cmd.ExecuteNonQuery();
    }

    public void RegisterAccount(string companyId, string code)
    {
        companyId = Id(companyId);
        if (!SafeAccount(code))
            throw new ArgumentException("Invalid account number");
        using var db = Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = "INSERT INTO ledger_accounts(company_id,code) VALUES($company,$code);";
        cmd.Parameters.AddWithValue("$company", companyId);
        cmd.Parameters.AddWithValue("$code", code);
        cmd.ExecuteNonQuery();
    }

    public string Post(string companyId, string idempotencyKey, string memo,
                       IReadOnlyList<Line> lines, string? reversalOf = null)
    {
        companyId = Id(companyId);
        if (!Guid.TryParseExact(idempotencyKey, "D", out var validKey))
            throw new ArgumentException("Idempotency key must be UUID");
        if (string.IsNullOrWhiteSpace(memo) || memo.Length > 180)
            throw new ArgumentException("Invalid journal description");
        if (reversalOf is not null) reversalOf = Id(reversalOf);
        Validate(lines);

        var entryId = Guid.NewGuid().ToString("D");
        using var db = Open();
        using var tx = db.BeginTransaction();
        using (var entry = db.CreateCommand())
        {
            entry.Transaction = tx;
            entry.CommandText = """
                INSERT INTO journals(id,company_id,idempotency_key,memo,reversal_of,created_at)
                VALUES ($id,$company,$key,$memo,$reversal,$created);
                """;
            entry.Parameters.AddWithValue("$id", entryId);
            entry.Parameters.AddWithValue("$company", companyId);
            entry.Parameters.AddWithValue("$key", validKey.ToString("D"));
            entry.Parameters.AddWithValue("$memo", memo);
            entry.Parameters.AddWithValue("$reversal", (object?)reversalOf ?? DBNull.Value);
            entry.Parameters.AddWithValue("$created", DateTimeOffset.UtcNow.ToString("O"));
            entry.ExecuteNonQuery();
        }
        for (var i = 0; i < lines.Count; i++)
        {
            var line = lines[i];
            using var cmd = db.CreateCommand();
            cmd.Transaction = tx;
            cmd.CommandText = """
                INSERT INTO journal_lines
                  (journal_id,company_id,line_number,account_code,debit_cents,credit_cents)
                VALUES ($id,$company,$number,$code,$debit,$credit);
                """;
            cmd.Parameters.AddWithValue("$id", entryId);
            cmd.Parameters.AddWithValue("$company", companyId);
            cmd.Parameters.AddWithValue("$number", i + 1);
            cmd.Parameters.AddWithValue("$code", line.AccountCode);
            cmd.Parameters.AddWithValue("$debit", line.DebitCents);
            cmd.Parameters.AddWithValue("$credit", line.CreditCents);
            cmd.ExecuteNonQuery();
        }
        using (var seal = db.CreateCommand())
        {
            seal.Transaction = tx;
            seal.CommandText = "UPDATE journals SET sealed=1 WHERE id=$id AND company_id=$company AND sealed=0;";
            seal.Parameters.AddWithValue("$id", entryId);
            seal.Parameters.AddWithValue("$company", companyId);
            if (seal.ExecuteNonQuery() != 1)
                throw new IOException("Journal could not be sealed");
        }
        tx.Commit(); // No partial, unbalanced, or unsealed posted journal may persist.
        return entryId;
    }

    public IReadOnlyList<Line> Lines(string companyId, string journalId)
    {
        companyId = Id(companyId);
        journalId = Id(journalId);
        using var db = Open();
        using var cmd = db.CreateCommand();
        cmd.CommandText = """
            SELECT account_code,debit_cents,credit_cents
            FROM journal_lines WHERE company_id=$company AND journal_id=$journal
            ORDER BY line_number;
            """;
        cmd.Parameters.AddWithValue("$company", companyId);
        cmd.Parameters.AddWithValue("$journal", journalId);
        using var reader = cmd.ExecuteReader();
        var list = new List<Line>();
        while (reader.Read())
            list.Add(new Line(reader.GetString(0), reader.GetInt64(1), reader.GetInt64(2)));
        return list;
    }

    public string Reverse(string companyId, string journalId, string idempotencyKey)
    {
        var original = Lines(companyId, journalId);
        if (original.Count == 0)
            throw new ArgumentException("Original entry not found for company");
        return Post(companyId, idempotencyKey, "Storno testnega zapisa", original
            .Select(line => new Line(line.AccountCode, line.CreditCents, line.DebitCents))
            .ToArray(), Id(journalId));
    }

    public static bool SelfTest()
    {
        var temp = Path.Combine(Path.GetTempPath(), "finai-journal-sandbox-" + Guid.NewGuid().ToString("N"));
        try
        {
            var a = Guid.NewGuid().ToString("D");
            var b = Guid.NewGuid().ToString("D");
            var store = new OfflineJournalSandbox(temp);
            store.RegisterCompany(a, "Sintetično A");
            store.RegisterCompany(b, "Sintetično B");
            store.RegisterAccount(a, "1200");
            store.RegisterAccount(a, "2600");
            store.RegisterAccount(b, "1200");
            store.RegisterAccount(b, "4300");
            var key = Guid.NewGuid().ToString("D");
            var entry = store.Post(a, key, "Preizkus 123,45 EUR", [
                new Line("1200", 12345, 0),
                new Line("2600", 0, 12345)
            ]);
            if (store.Lines(a, entry).Count != 2 || store.Lines(b, entry).Count != 0)
                return false;
            var rejectedUnbalanced = false;
            try
            {
                store.Post(a, Guid.NewGuid().ToString("D"), "Neuravnoteženo", [
                    new Line("1200", 12345, 0), new Line("2600", 0, 12344)]);
            }
            catch (ArgumentException) { rejectedUnbalanced = true; }
            if (!rejectedUnbalanced) return false;

            var rejectedCrossCompany = false;
            try
            {
                store.Post(a, Guid.NewGuid().ToString("D"), "Tuji konto", [
                    new Line("1200", 100, 0), new Line("4300", 0, 100)]);
            }
            catch (SqliteException) { rejectedCrossCompany = true; }
            if (!rejectedCrossCompany) return false;

            var rejectedDuplicate = false;
            try
            {
                store.Post(a, key, "Ponovitev", [
                    new Line("1200", 100, 0), new Line("2600", 0, 100)]);
            }
            catch (SqliteException) { rejectedDuplicate = true; }
            if (!rejectedDuplicate) return false;

            var reversal = store.Reverse(a, entry, Guid.NewGuid().ToString("D"));
            var reverseLines = store.Lines(a, reversal);
            if (reverseLines.Count != 2 || reverseLines[0].CreditCents != 12345 ||
                reverseLines[1].DebitCents != 12345)
                return false;

            // Ensure data is durable after reopening. This is still a test-only
            // unencrypted sandbox, never a production accounting store.
            var reopened = new OfflineJournalSandbox(temp);
            if (reopened.Lines(a, entry).Count != 2 || reopened.Lines(a, reversal).Count != 2)
                return false;
            using var db = new SqliteConnection(new SqliteConnectionStringBuilder
            {
                DataSource = Path.Combine(temp, "journal-sandbox.db"),
                Pooling = false
            }.ToString());
            db.Open();
            using var modify = db.CreateCommand();
            modify.CommandText = "UPDATE journals SET memo='TAMPER' WHERE id=$id;";
            modify.Parameters.AddWithValue("$id", entry);
            try { modify.ExecuteNonQuery(); return false; }
            catch (SqliteException) { /* Immutable trigger must reject. */ }
            using var append = db.CreateCommand();
            append.CommandText = "INSERT INTO journal_lines (journal_id,company_id,line_number,account_code,debit_cents,credit_cents) VALUES ($id,$company,99,'1200',1,0);";
            append.Parameters.AddWithValue("$id", entry);
            append.Parameters.AddWithValue("$company", a);
            try { append.ExecuteNonQuery(); return false; }
            catch (SqliteException) { /* Sealed journal must reject late lines. */ }
            return true;
        }
        finally
        {
            if (Directory.Exists(temp)) Directory.Delete(temp, recursive: true);
        }
    }
}

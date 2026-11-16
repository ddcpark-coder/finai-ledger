using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Data.Sqlite;

namespace EIntegrator.Desktop;

/// <summary>
/// NEXT13B: optional append-only synthetic order plans inside the EXISTING
/// SQLite3MC encrypted ledger. Native-only; no WebView or network bridge.
/// Older schema-v1 databases are never silently rewritten on open.
/// </summary>
internal sealed partial class EncryptedLedgerStore
{
    internal sealed record SyntheticOrderDraft(
        string DraftId, string CompanyId, string Sku, int Quantity,
        long UnitPriceCents, long TotalCents, string CreatedUtc);

    private static readonly Regex SyntheticSkuPattern = new(
        @"^SYN-[A-Z0-9-]{3,35}$", RegexOptions.CultureInvariant);

    private static bool HasOrderDraftTable(SqliteConnection db)
    {
        using var check = db.CreateCommand();
        check.CommandText = """
            SELECT COUNT(*) FROM sqlite_master
            WHERE type='table' AND name='synthetic_order_drafts';
            """;
        return Convert.ToInt64(check.ExecuteScalar(), CultureInfo.InvariantCulture) == 1;
    }

    private static void PrepareOrderDraftTable(SqliteConnection db, SqliteTransaction tx)
    {
        using var command = db.CreateCommand();
        command.Transaction = tx;
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS synthetic_order_drafts (
              draft_id TEXT NOT NULL PRIMARY KEY,
              company_id TEXT NOT NULL,
              actor_user_id TEXT NOT NULL,
              idempotency_key TEXT NOT NULL,
              sku TEXT NOT NULL,
              quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 200),
              unit_price_cents INTEGER NOT NULL CHECK(unit_price_cents BETWEEN 1 AND 10000000),
              total_cents INTEGER NOT NULL CHECK(total_cents > 0 AND total_cents <= 2000000000),
              created_utc TEXT NOT NULL,
              record_mac TEXT NOT NULL,
              UNIQUE(company_id,idempotency_key),
              FOREIGN KEY(actor_user_id,company_id)
                REFERENCES memberships(user_id,company_id) ON DELETE RESTRICT,
              FOREIGN KEY(company_id) REFERENCES companies(company_id) ON DELETE RESTRICT
            );
            CREATE INDEX IF NOT EXISTS synthetic_order_drafts_company
              ON synthetic_order_drafts(company_id,created_utc);
            CREATE TRIGGER IF NOT EXISTS synthetic_order_drafts_no_update
              BEFORE UPDATE ON synthetic_order_drafts
              BEGIN SELECT RAISE(ABORT,'Synthetic order plan is immutable'); END;
            CREATE TRIGGER IF NOT EXISTS synthetic_order_drafts_no_delete
              BEFORE DELETE ON synthetic_order_drafts
              BEGIN SELECT RAISE(ABORT,'Synthetic order plan is immutable'); END;
            """;
        command.ExecuteNonQuery();
    }

    private string ComputeOrderMac(string draftId, string company, string actor,
        string idempotencyKey, string sku, int quantity, long unitPrice,
        long total, string created)
    {
        // Distinct domain key, derived from the never-persisted raw ledger key.
        var domainKey = HMACSHA256.HashData(databaseKey,
            "finai.offline.synthetic.order.draft.mac.v1"u8.ToArray());
        try
        {
            var msg = Encoding.UTF8.GetBytes(string.Join("|",
                draftId,company,actor,idempotencyKey,sku,
                quantity.ToString(CultureInfo.InvariantCulture),
                unitPrice.ToString(CultureInfo.InvariantCulture),
                total.ToString(CultureInfo.InvariantCulture),created));
            try { return Convert.ToHexString(HMACSHA256.HashData(domainKey, msg)); }
            finally { CryptographicOperations.ZeroMemory(msg); }
        }
        finally { CryptographicOperations.ZeroMemory(domainKey); }
    }

    private SyntheticOrderDraft VerifiedDraft(SqliteDataReader reader, string? company = null)
    {
        var id=reader.GetString(0);
        var tenant=reader.GetString(1);
        var actor=reader.GetString(2);
        var key=reader.GetString(3);
        var sku=reader.GetString(4);
        var count=reader.GetInt32(5);
        var price=reader.GetInt64(6);
        var total=reader.GetInt64(7);
        var created=reader.GetString(8);
        var mac=reader.GetString(9);
        if ((company is not null && tenant != company) ||
            !Guid.TryParseExact(id,"D",out _) ||
            !Guid.TryParseExact(tenant,"D",out _) ||
            !Guid.TryParseExact(actor,"D",out _) ||
            !Guid.TryParseExact(key,"D",out _) ||
            !SyntheticSkuPattern.IsMatch(sku) ||
            count is <1 or >200 || price is <1 or >10000000 ||
            total != count*price || mac.Length != 64 ||
            !DateTimeOffset.TryParse(created,CultureInfo.InvariantCulture,
                DateTimeStyles.RoundtripKind,out _))
            throw new InvalidDataException("Invalid encrypted synthetic order row");
        var expected=ComputeOrderMac(id,tenant,actor,key,sku,count,price,total,created);
        try
        {
            if(!CryptographicOperations.FixedTimeEquals(
                Convert.FromHexString(mac),Convert.FromHexString(expected)))
                throw new InvalidDataException("Encrypted synthetic order integrity failure");
        }
        catch(FormatException)
        {
            throw new InvalidDataException("Invalid synthetic order MAC");
        }
        return new SyntheticOrderDraft(id,tenant,sku,count,price,total,created);
    }

    /// <summary>
    /// Explicit native save; not a journal posting, reservation, invoice or sync.
    /// On older encrypted stores, this creates ONLY an optional new table and its
    /// integrity triggers inside the same SQLite transaction as the first draft.
    /// </summary>
    public string SaveSyntheticOrderDraft(Session session, string companyId,
        string idempotencyKey, string sku, int quantity, long unitPriceCents)
    {
        companyId=ValidateUuid(companyId);
        idempotencyKey=ValidateUuid(idempotencyKey);
        if(sku is null || !SyntheticSkuPattern.IsMatch(sku) ||
            quantity is <1 or >200 || unitPriceCents is <1 or >10000000)
            throw new ArgumentException("Only synthetic SKU, quantity and integer cents are allowed");
        var total=checked(quantity*unitPriceCents);
        if(total>2000000000)
            throw new ArgumentOutOfRangeException(nameof(unitPriceCents));
        using var db=OpenDb();
        RequireRole(db,session,companyId,write:true);
        using var tx=db.BeginTransaction();
        PrepareOrderDraftTable(db,tx);
        using(var replay=db.CreateCommand())
        {
            replay.Transaction=tx;
            replay.CommandText="""
                SELECT draft_id,company_id,actor_user_id,idempotency_key,sku,
                  quantity,unit_price_cents,total_cents,created_utc,record_mac
                FROM synthetic_order_drafts
                WHERE company_id=$company AND idempotency_key=$key;
                """;
            replay.Parameters.AddWithValue("$company",companyId);
            replay.Parameters.AddWithValue("$key",idempotencyKey);
            using var reader=replay.ExecuteReader();
            if(reader.Read())
            {
                var saved=VerifiedDraft(reader,companyId);
                if(reader.GetString(2)!=session.UserId ||
                    saved.Sku!=sku || saved.Quantity!=quantity ||
                    saved.UnitPriceCents!=unitPriceCents)
                    throw new InvalidOperationException("Conflicting synthetic draft replay");
                tx.Commit();
                return saved.DraftId;
            }
        }
        using(var quota=db.CreateCommand())
        {
            quota.Transaction=tx;
            quota.CommandText="SELECT COUNT(*) FROM synthetic_order_drafts WHERE company_id=$company;";
            quota.Parameters.AddWithValue("$company",companyId);
            if(Convert.ToInt64(quota.ExecuteScalar(),CultureInfo.InvariantCulture)>=100)
                throw new InvalidOperationException("Synthetic order draft capacity reached");
        }
        var draftId=Guid.NewGuid().ToString("D");
        var created=DateTimeOffset.UtcNow.ToString("O",CultureInfo.InvariantCulture);
        var mac=ComputeOrderMac(draftId,companyId,session.UserId,idempotencyKey,
            sku,quantity,unitPriceCents,total,created);
        using(var save=db.CreateCommand())
        {
            save.Transaction=tx;
            save.CommandText="""
                INSERT INTO synthetic_order_drafts(
                  draft_id,company_id,actor_user_id,idempotency_key,sku,quantity,
                  unit_price_cents,total_cents,created_utc,record_mac)
                VALUES($id,$company,$actor,$key,$sku,$quantity,$price,$total,$created,$mac);
                """;
            save.Parameters.AddWithValue("$id",draftId);
            save.Parameters.AddWithValue("$company",companyId);
            save.Parameters.AddWithValue("$actor",session.UserId);
            save.Parameters.AddWithValue("$key",idempotencyKey);
            save.Parameters.AddWithValue("$sku",sku);
            save.Parameters.AddWithValue("$quantity",quantity);
            save.Parameters.AddWithValue("$price",unitPriceCents);
            save.Parameters.AddWithValue("$total",total);
            save.Parameters.AddWithValue("$created",created);
            save.Parameters.AddWithValue("$mac",mac);
            save.ExecuteNonQuery();
        }
        AppendAudit(db,tx,companyId,session.UserId,
            "synthetic.order_draft.saved",draftId,created);
        tx.Commit();
        return draftId;
    }

    public IReadOnlyList<SyntheticOrderDraft> ListSyntheticOrderDrafts(
        Session session,string companyId)
    {
        companyId=ValidateUuid(companyId);
        using var db=OpenDb();
        RequireRole(db,session,companyId,write:false);
        var result=new List<SyntheticOrderDraft>();
        if(!HasOrderDraftTable(db))return result;
        using var cmd=db.CreateCommand();
        cmd.CommandText="""
            SELECT draft_id,company_id,actor_user_id,idempotency_key,sku,
              quantity,unit_price_cents,total_cents,created_utc,record_mac
            FROM synthetic_order_drafts
            WHERE company_id=$company ORDER BY created_utc,draft_id LIMIT 101;
            """;
        cmd.Parameters.AddWithValue("$company",companyId);
        using var reader=cmd.ExecuteReader();
        while(reader.Read())result.Add(VerifiedDraft(reader,companyId));
        if(result.Count>100)
            throw new InvalidDataException("Unexpected synthetic draft count");
        return result;
    }

    private void VerifySyntheticOrderDraftIntegrity(SqliteConnection db)
    {
        if(!HasOrderDraftTable(db))return; // Old v1 ledger opens unchanged.
        using var cmd=db.CreateCommand();
        cmd.CommandText="""
            SELECT draft_id,company_id,actor_user_id,idempotency_key,sku,
              quantity,unit_price_cents,total_cents,created_utc,record_mac
            FROM synthetic_order_drafts ORDER BY company_id,draft_id;
            """;
        using var reader=cmd.ExecuteReader();
        while(reader.Read())_ = VerifiedDraft(reader);
    }

    public static bool SyntheticOrderDraftSelfTest()
    {
        var root=Path.Combine(Path.GetTempPath(),
            "finai-next13b-drafts-"+Guid.NewGuid().ToString("N"));
        const string adminPassword="SYNTHETIC-QA-LOCAL-NOT-REAL-2026";
        const string viewerPassword="SYNTHETIC-QA-VIEWER-NOT-REAL-2026";
        const string backupPassword="SYNTHETIC-QA-RECOVERY-NOT-REAL-2026";
        string companyA, companyB, draftId;
        try
        {
            Directory.CreateDirectory(root);
            var home=Path.Combine(root,"home");
            var backup=Path.Combine(root,"encrypted-drafts.finai");
            using(var store=CreateNew(home,"qa.order.admin",adminPassword))
            {
                var admin=store.Authenticate("qa.order.admin",adminPassword)
                    ?? throw new InvalidDataException("Synthetic local login failed");
                companyA=store.CreateCompany(admin,"Demo company A");
                companyB=store.CreateCompany(admin,"Demo company B");
                store.AddUser(admin,companyA,"qa.order.viewer",viewerPassword,"viewer");
                var viewer=store.Authenticate("qa.order.viewer",viewerPassword)
                    ?? throw new InvalidDataException("Synthetic viewer login failed");
                var key=Guid.NewGuid().ToString("D");
                if(store.ListSyntheticOrderDrafts(admin,companyA).Count!=0)
                    return false; // Opening older schema v1 never creates table.
                draftId=store.SaveSyntheticOrderDraft(admin,companyA,key,"SYN-TAB-10070",3,12500);
                if(store.SaveSyntheticOrderDraft(admin,companyA,key,"SYN-TAB-10070",3,12500)!=draftId ||
                    !Rejected(()=>store.SaveSyntheticOrderDraft(admin,companyA,key,
                        "SYN-TAB-10070",4,12500)) ||
                    !Rejected(()=>store.SaveSyntheticOrderDraft(viewer,companyA,
                        Guid.NewGuid().ToString("D"),"SYN-TAB-10070",1,1200)) ||
                    !Rejected(()=>store.ListSyntheticOrderDrafts(viewer,companyB)) ||
                    !Rejected(()=>store.SaveSyntheticOrderDraft(admin,companyA,
                        Guid.NewGuid().ToString("D"),"REAL-PRIVATE-ORDER",1,100)) ||
                    store.ListSyntheticOrderDrafts(admin,companyA).Count!=1 ||
                    store.ListSyntheticOrderDrafts(admin,companyB).Count!=0 ||
                    !store.VerifyAudit(admin,companyA) ||
                    !store.VerifyRecoveryIntegrity())return false;
                var record=store.ListSyntheticOrderDrafts(viewer,companyA)[0];
                if(record.DraftId!=draftId || record.TotalCents!=37500)
                    return false;
                PortableEncryptedLedgerBackup.Export(store,backup,backupPassword);
            }
            // Neither encrypted database nor portable encrypted archive leaks demo SKU.
            if(Encoding.UTF8.GetString(File.ReadAllBytes(Path.Combine(home,"secure-ledger.db")))
                .Contains("SYN-TAB-10070",StringComparison.Ordinal) ||
               Encoding.UTF8.GetString(File.ReadAllBytes(backup))
                .Contains("SYN-TAB-10070",StringComparison.Ordinal))return false;
            var restored=Path.Combine(root,"restored");
            PortableEncryptedLedgerBackup.RestoreIntoNewDirectory(backup,restored,backupPassword);
            using(var ledger=OpenExisting(restored))
            {
                var admin=ledger.Authenticate("qa.order.admin",adminPassword);
                if(admin is null||!ledger.VerifyRecoveryIntegrity())return false;
                var records=ledger.ListSyntheticOrderDrafts(admin,companyA);
                if(records.Count!=1 || records[0].DraftId!=draftId ||
                    records[0].TotalCents!=37500 ||
                    ledger.ListSyntheticOrderDrafts(admin,companyB).Count!=0)
                    return false;
                admin.Revoke();
                if(!Rejected(()=>ledger.ListSyntheticOrderDrafts(admin,companyA)))
                    return false;
            }
            return true;
        }
        finally
        {
            if(Directory.Exists(root))Directory.Delete(root,recursive:true);
        }
    }
}

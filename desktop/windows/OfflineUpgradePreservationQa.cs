using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;

namespace EIntegrator.Desktop;

/// <summary>
/// NEXT13F synthetic-only installer regression: a Windows application update
/// replaces ONLY program binaries, never encrypted LocalAppData vaults.
/// This is NOT a live installer / clean Windows machine execution test.
/// </summary>
internal static class OfflineUpgradePreservationQa
{
    public static bool SelfTest()
    {
        var root=Path.Combine(Path.GetTempPath(),"finai-upgrade-qa-"+Guid.NewGuid().ToString("N"));
        const string password="SYNTHETIC-ONLY-LOCAL-UPGRADE-TEST-2026";
        const string phrase="SYNTHETIC-ONLY-RECOVERY-UPGRADE-2026";
        try
        {
            Directory.CreateDirectory(root);
            var installed=Path.Combine(root,"Programs","FinAI");
            var data=Path.Combine(root,"LocalApplicationData","e-integrator","Desktop","SyntheticOrderVault-v1");
            Directory.CreateDirectory(installed);
            Directory.CreateDirectory(Path.GetDirectoryName(data)!);
            File.WriteAllText(Path.Combine(installed,"App-Binary.txt"),"build-v1");
            string companyId, draft;
            using(var db=EncryptedLedgerStore.CreateNew(data,"qa.upgrade",password))
            {
                var session=db.Authenticate("qa.upgrade",password);
                if(session is null)return false;
                companyId=db.CreateCompany(session,"SYNTHETIC-UPGRADE-A");
                draft=db.SaveSyntheticOrderDraft(session,companyId,
                    Guid.NewGuid().ToString("D"),"SYN-PRINT-0001",2,12500);
                if(!db.VerifyRecoveryIntegrity())return false;
            }
            var file=Path.Combine(data,"secure-ledger.db");
            var key=Path.Combine(data,"secure-ledger.key");
            var beforeDb=SHA256.HashData(File.ReadAllBytes(file));
            var beforeKey=SHA256.HashData(File.ReadAllBytes(key));
            // Model an installer replacing program assets, with the user data
            // located in a different tree. No copy, delete, or move of vault.
            File.WriteAllText(Path.Combine(installed,"App-Binary.txt"),"build-v2");
            File.WriteAllText(Path.Combine(installed,"Next-Asset.txt"),"new synthetic asset");
            if(!CryptographicOperations.FixedTimeEquals(beforeDb,SHA256.HashData(File.ReadAllBytes(file))) ||
               !CryptographicOperations.FixedTimeEquals(beforeKey,SHA256.HashData(File.ReadAllBytes(key))))
                return false;
            using(var reopened=EncryptedLedgerStore.OpenExisting(data))
            {
                var session=reopened.Authenticate("qa.upgrade",password);
                if(session is null || reopened.ListSyntheticOrderDrafts(session,companyId)
                    .SingleOrDefault()?.DraftId!=draft || !reopened.VerifyRecoveryIntegrity())
                    return false;
                var backup=Path.Combine(root,"upgrade-recovery.finai");
                PortableEncryptedLedgerBackup.Export(reopened,backup,phrase);
            }
            var recovered=Path.Combine(root,"Recovered");
            PortableEncryptedLedgerBackup.RestoreIntoNewDirectory(
                Path.Combine(root,"upgrade-recovery.finai"),recovered,phrase);
            using(var restored=EncryptedLedgerStore.OpenExisting(recovered))
            {
                var session=restored.Authenticate("qa.upgrade",password);
                if(session is null || restored.ListSyntheticOrderDrafts(session,companyId)
                    .SingleOrDefault()?.DraftId!=draft || !restored.VerifyRecoveryIntegrity())
                    return false;
            }
            // Existing restore destinations are always rejected, never merged.
            try
            {
                PortableEncryptedLedgerBackup.RestoreIntoNewDirectory(
                    Path.Combine(root,"upgrade-recovery.finai"),data,phrase);
                return false;
            }
            catch(IOException) {}
            return true;
        }
        finally
        {
            if(Directory.Exists(root))Directory.Delete(root,recursive:true);
        }
    }
}

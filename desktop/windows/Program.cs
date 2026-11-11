using System;
using System.Windows.Forms;

namespace EIntegrator.Desktop;

internal static class Program
{
    [STAThread]
    private static int Main(string[] args)
    {
        if (args.Length == 1 && args[0] == "--self-test")
        {
            try
            {
                return LocalDraftStore.SelfTest() ? 0 : 1;
            }
            catch (Exception)
            {
                return 2; // No private local-path or encrypted-content disclosure.
            }
        }

        if (args.Length == 1 && args[0] == "--ledger-self-test")
        {
            try
            {
                return OfflineJournalSandbox.SelfTest() ? 0 : 3;
            }
            catch (Exception)
            {
                return 4; // No account/transaction details in diagnostic output.
            }
        }

        if (args.Length == 1 && args[0] == "--backup-self-test")
        {
            try
            {
                return PortableDraftBackup.SelfTest() ? 0 : 5;
            }
            catch (Exception)
            {
                return 6; // Avoid disclosing private local-path or backup contents.
            }
        }

        if (args.Length == 1 && args[0] == "--encrypted-ledger-self-test")
        {
            try
            {
                return EncryptedLedgerStore.SelfTest() ? 0 : 7;
            }
            catch (Exception)
            {
                return 8; // No private key material or local paths in output.
            }
        }

        if (args.Length == 1 && args[0] == "--ledger-recovery-self-test")
        {
            try
            {
                return PortableEncryptedLedgerBackup.SelfTest() ? 0 : 9;
            }
            catch (Exception)
            {
                return 10; // No plaintext, key material or paths in test output.
            }
        }

        if (args.Length == 1 && args[0] == "--delivery-queue-self-test")
        {
            try { return SyntheticDeliveryQueue.SelfTest() ? 0 : 11; }
            catch (Exception) { return 12; } // Never expose encrypted payloads.
        }

        ApplicationConfiguration.Initialize();
        Application.Run(new MainWindow());
        return 0;
    }
}

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

        ApplicationConfiguration.Initialize();
        Application.Run(new MainWindow());
        return 0;
    }
}

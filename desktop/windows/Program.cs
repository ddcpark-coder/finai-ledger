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

        ApplicationConfiguration.Initialize();
        Application.Run(new MainWindow());
        return 0;
    }
}

using System;
using System.Drawing;
using System.IO;
using System.Text;
using System.Windows.Forms;

namespace EIntegrator.Desktop;

/// <summary>
/// Fixed synthetic-only manual transfer UI. No HTTP, login token, key, real
/// company document or private Windows vault contents leave this dialog.
/// </summary>
internal sealed class SyntheticWindowsTransferDialog : Form
{
    private readonly SyntheticWindowsTransfer transfer = new();
    private readonly ComboBox company = new()
    {
        DropDownStyle = ComboBoxStyle.DropDownList, Width = 240,
        AccessibleName = "Izmišljeno testno podjetje"
    };
    private readonly NumericUpDown expectedVersion = new()
    {
        Minimum = 0, Maximum = 100, Width = 100, Value = 0,
        AccessibleName = "Pričakovana sintetična različica"
    };
    private readonly TextBox eventId = new()
    {
        Width = 325, AccessibleName = "UUID lokalnega testnega dogodka"
    };
    private readonly Label result = new()
    {
        AutoSize = false, Dock = DockStyle.Fill, ForeColor = Color.FromArgb(136, 231, 205),
        Text = "Ni ustvarjenega testnega dogodka. Ni mrežne povezave."
    };

    public SyntheticWindowsTransferDialog()
    {
        Text = "FinAI — ročni prenos šifriranega demo dogodka";
        Size = new Size(780, 370);
        MinimumSize = new Size(700, 340);
        StartPosition = FormStartPosition.CenterParent;
        BackColor = Color.FromArgb(9, 26, 40);
        ForeColor = Color.White;
        Font = new Font("Segoe UI", 10f);
        company.Items.AddRange(["1 — Sintetično podjetje A",
            "2 — Sintetično podjetje B", "3 — Sintetično podjetje C"]);
        company.SelectedIndex = 0;

        var panel = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown,
            WrapContents = false, AutoScroll = true, Padding = new Padding(18)
        };
        panel.Controls.Add(new Label
        {
            AutoSize = true, ForeColor = Color.White,
            Text = "TESTNI PRENOS — brez samodejnega pošiljanja ali knjiženja"
        });
        panel.Controls.Add(new Label
        {
            Width = 690, Height = 48, ForeColor = Color.FromArgb(188, 211, 224),
            Text = "Ustvari izmišljen dogodek za izbrano podjetje. Izvoz ustvari AES-GCM " +
                   "paket za lokalni testni Laravel API; fraza ostane samo na tej napravi."
        });
        var options = new FlowLayoutPanel { AutoSize = true, WrapContents = false };
        options.Controls.Add(company);
        options.Controls.Add(expectedVersion);
        panel.Controls.Add(options);
        panel.Controls.Add(eventId);
        var actions = new FlowLayoutPanel { AutoSize = true, WrapContents = false };
        var prepare = new Button
        {
            Text = "Ustvari testni dogodek", AutoSize = true, Height = 38
        };
        var export = new Button
        {
            Text = "Izvozi šifrirani JSON", AutoSize = true, Height = 38
        };
        actions.Controls.Add(prepare);
        actions.Controls.Add(export);
        panel.Controls.Add(actions);
        panel.Controls.Add(result);
        Controls.Add(panel);

        prepare.Click += (_, _) => Guard(() =>
        {
            var item = transfer.Queue(SelectedCompany(), decimal.ToInt32(expectedVersion.Value));
            eventId.Text = item.EventId;
            result.Text = "Sintetični dogodek ustvarjen samo lokalno. Za izvoz uporabi močno frazo.";
        });
        export.Click += (_, _) => Guard(() =>
        {
            var id = eventId.Text.Trim();
            if (!Guid.TryParseExact(id, "D", out _))
                throw new ArgumentException("Enter existing synthetic event ID");
            using var phrase = new RecoveryPhraseDialog(confirm: true);
            if (phrase.ShowDialog(this) != DialogResult.OK) return;
            var packet = transfer.Export(SelectedCompany(), id, phrase.Passphrase);
            var directory = SafeExportDirectory();
            var target = Path.Combine(directory, "finai-synthetic-win-" +
                SelectedCompany() + "-" + id + ".json");
            var bytes = Encoding.UTF8.GetBytes(packet);
            if (File.Exists(target))
            {
                if (!File.ReadAllBytes(target).AsSpan().SequenceEqual(bytes))
                    throw new IOException("Existing test export differs");
            }
            else
            {
                using var file = new FileStream(target, FileMode.CreateNew, FileAccess.Write,
                    FileShare.None, 4096, FileOptions.WriteThrough);
                file.Write(bytes);
                file.Flush(flushToDisk: true);
            }
            result.Text = "Šifrirani testni paket je pripravljen v mapi FinAI: " +
                          target + ". Ročni prenos; nič ni poslano.";
        });
    }

    private string SelectedCompany() => (company.SelectedIndex + 1).ToString();

    private static string SafeExportDirectory()
    {
        var home = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        if (string.IsNullOrWhiteSpace(home) ||
            !Directory.Exists(home) ||
            new DirectoryInfo(home).Attributes.HasFlag(FileAttributes.ReparsePoint))
            throw new IOException("Unsafe local application root");
        foreach (var part in new[] { "e-integrator", "Desktop", "SyntheticWindowsExports-v1" })
        {
            home = Path.Combine(home, part);
            if (File.Exists(home)) throw new IOException("Export path collision");
            if (Directory.Exists(home) &&
                new DirectoryInfo(home).Attributes.HasFlag(FileAttributes.ReparsePoint))
                throw new IOException("Linked export path forbidden");
            Directory.CreateDirectory(home);
        }
        return home;
    }

    private void Guard(Action action)
    {
        try { action(); }
        catch (Exception)
        {
            // Never show user-entered phrase, encrypted packet, or local SQL details.
            result.Text = "Testni izvoz ni uspel. Preveri podjetje, UUID, frazo ali lokalne pravice.";
        }
    }
}

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
    private readonly TextBox trustedFingerprint = new()
    {
        Width = 555, MaxLength = 64,
        AccessibleName = "Neodvisno preverjen SHA256 prstni odtis RSA ključa"
    };
    private readonly SyntheticWindowsAckReview ackReviewer = new();
    private readonly Label result = new()
    {
        AutoSize = false, Dock = DockStyle.Fill, ForeColor = Color.FromArgb(136, 231, 205),
        Text = "Ni ustvarjenega testnega dogodka. Ni mrežne povezave."
    };

    public SyntheticWindowsTransferDialog()
    {
        Text = "FinAI — ročni prenos šifriranega demo dogodka";
        Size = new Size(810, 570);
        MinimumSize = new Size(750, 500);
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
        panel.Controls.Add(new Label
        {
            Width = 700, Height = 38,
            Text = "Zaupanja vreden javni ključ preveri po LOČENEM kanalu; " +
                   "SHA256 prstnega odtisa NE prepisuj iz istega ACK odgovora."
        });
        panel.Controls.Add(trustedFingerprint);
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
        var importAck = new Button
        {
            Text = "Preveri podpisano testno potrdilo", AutoSize = true, Height = 38
        };
        actions.Controls.Add(importAck);
        panel.Controls.Add(actions);
        panel.Controls.Add(result);
        Controls.Add(panel);

        prepare.Click += (_, _) => Guard(() =>
        {
            var item = transfer.Queue(SelectedCompany(), decimal.ToInt32(expectedVersion.Value));
            eventId.Text = item.EventId;
            result.Text = "Sintetični dogodek ustvarjen samo lokalno. Za izvoz uporabi močno frazo.";
        });
        importAck.Click += (_, _) => Guard(() =>
        {
            if (!Guid.TryParseExact(eventId.Text.Trim(), "D", out var safeId))
                throw new ArgumentException("Invalid synthetic event UUID");
            if (trustedFingerprint.Text.Trim().Length != 64)
                throw new ArgumentException("Independent fingerprint required");
            using var receiptPicker = new OpenFileDialog
            {
                Title = "Izberi celotni JSON odgovor lokalnega testnega Laravel API-ja",
                Filter = "JSON (*.json)|*.json", Multiselect = false,
                CheckFileExists = true
            };
            if (receiptPicker.ShowDialog(this) != DialogResult.OK) return;
            if (new FileInfo(receiptPicker.FileName).Length > 16000)
                throw new InvalidDataException("Oversized synthetic ACK");
            using var keyPicker = new OpenFileDialog
            {
                Title = "Izberi posebej pridobljeni javni RSA ključ (.pem)",
                Filter = "Javni RSA PEM (*.pem)|*.pem", Multiselect = false,
                CheckFileExists = true
            };
            if (keyPicker.ShowDialog(this) != DialogResult.OK) return;
            if (new FileInfo(keyPicker.FileName).Length > 8000)
                throw new InvalidDataException("Oversized public key file");
            using var phrase = new RecoveryPhraseDialog(confirm: false);
            if (phrase.ShowDialog(this) != DialogResult.OK) return;
            var checkedAck = ackReviewer.VerifyAndStore(
                SelectedCompany(), safeId.ToString("D"), phrase.Passphrase,
                File.ReadAllText(receiptPicker.FileName),
                File.ReadAllText(keyPicker.FileName),
                trustedFingerprint.Text.Trim().ToLowerInvariant());
            result.Text = "Podpis testnega potrdila preverjen za dogodek " +
                checkedAck.EventId + ", različica " + checkedAck.Version +
                ". Samo lokalno preverjanje, BREZ KNJIŽENJA ali avtomatske sinhronizacije.";
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

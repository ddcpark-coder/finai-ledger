using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Text.Json;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace EIntegrator.Desktop;

/// <summary>
/// Offline Windows host. The bundled Next.js static assets are mapped to an
/// internal virtual origin; there is no network dependency for startup.
/// Finance postings and tenant sync are explicitly NOT implemented here.
/// </summary>
internal sealed class MainWindow : Form
{
    private const string LocalHost = "finai-desktop.invalid";
    private const string LocalStart = "https://finai-desktop.invalid/offline/";
    private const string Protocol = "finai.offline.v1";

    private readonly WebView2 browser = new() { Dock = DockStyle.Fill };
    private readonly LocalDraftStore drafts = new();
    private readonly SyntheticDeliveryQueue deliveryQueue = new();
    private double displayZoom = 1.0;
    private readonly Button zoomReset = new()
    {
        Text = "100 %", Dock = DockStyle.Fill, FlatStyle = FlatStyle.Flat,
        BackColor = Color.FromArgb(29, 55, 72), ForeColor = Color.White,
        AccessibleName = "Ponastavi povečavo na 100 odstotkov"
    };
    private readonly Label status = new()
    {
        Dock = DockStyle.Fill,
        AutoEllipsis = true,
        ForeColor = Color.FromArgb(169, 194, 208),
        TextAlign = ContentAlignment.MiddleLeft,
        Text = "Priprava lokalne aplikacije …"
    };

    public MainWindow()
    {
        Text = "e-integrator — lokalna izdaja";
        Width = 1360;
        Height = 860;
        MinimumSize = new Size(960, 640);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(7, 17, 29);
        ForeColor = Color.White;

        var top = new TableLayoutPanel { Dock = DockStyle.Fill, RowCount = 1, ColumnCount = 8, Padding = new Padding(16, 8, 16, 8), BackColor = Color.FromArgb(12, 30, 45) };
        top.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 210f));
        top.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100f));
        top.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 135f));
        top.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 135f));
        top.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 95f));
        top.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 72f));
        top.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 72f));
        top.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 78f));
        var brand = new Label { Dock = DockStyle.Fill, Text = "e-integrator  /  FinAI", TextAlign = ContentAlignment.MiddleLeft,
            Font = new Font("Segoe UI", 12f, FontStyle.Bold), ForeColor = Color.FromArgb(122, 236, 216) };
        var refresh = new Button { Text = "Osveži", Dock = DockStyle.Fill, FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(29, 55, 72), ForeColor = Color.White };
        refresh.Click += (_, _) => browser.CoreWebView2?.Navigate(LocalStart);
        var export = new Button
        {
            Text = "Shrani kopijo", Dock = DockStyle.Fill, FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(29, 55, 72), ForeColor = Color.White
        };
        var restore = new Button
        {
            Text = "Obnovi kopijo", Dock = DockStyle.Fill, FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(29, 55, 72), ForeColor = Color.White
        };
        export.Click += (_, _) => ExportDrafts();
        restore.Click += (_, _) => RestoreDrafts();
        var zoomOut = new Button
        {
            Text = "−", Dock = DockStyle.Fill, FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(29, 55, 72), ForeColor = Color.White,
            AccessibleName = "Zmanjšaj velikost prikaza"
        };
        var zoomIn = new Button
        {
            Text = "+", Dock = DockStyle.Fill, FlatStyle = FlatStyle.Flat,
            BackColor = Color.FromArgb(29, 55, 72), ForeColor = Color.White,
            AccessibleName = "Povečaj velikost prikaza"
        };
        zoomOut.Click += (_, _) => SetDisplayZoom(displayZoom - 0.1);
        zoomIn.Click += (_, _) => SetDisplayZoom(displayZoom + 0.1);
        zoomReset.Click += (_, _) => SetDisplayZoom(1.0);
        top.Controls.Add(brand, 0, 0);
        top.Controls.Add(status, 1, 0);
        top.Controls.Add(export, 2, 0);
        top.Controls.Add(restore, 3, 0);
        top.Controls.Add(refresh, 4, 0);
        top.Controls.Add(zoomOut, 5, 0);
        top.Controls.Add(zoomReset, 6, 0);
        top.Controls.Add(zoomIn, 7, 0);

        var layout = new TableLayoutPanel { Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 2 };
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 60f));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100f));
        layout.Controls.Add(top, 0, 0);
        layout.Controls.Add(browser, 0, 1);
        Controls.Add(layout);
        Shown += async (_, _) => await InitializeAsync();
    }

    private void SetDisplayZoom(double requested)
    {
        // Native viewing preference only: never modifies accounting values,
        // OS display settings, stored data or any other project.
        displayZoom = Math.Round(Math.Clamp(requested, 0.8, 1.6), 1);
        zoomReset.Text = $"{(int)Math.Round(displayZoom * 100)} %";
        if (browser.CoreWebView2 is not null)
            browser.ZoomFactor = displayZoom;
    }

    // Native-only operations: the passphrase and filesystem picker are never
    // available to WebView2 scripts or through the narrow draft message bridge.
    // This remains a synthetic-draft QA feature, NOT a general database backup.
    private void ExportDrafts()
    {
        using var picker = new SaveFileDialog
        {
            Title = "Shrani šifrirano kopijo testnih osnutkov",
            Filter = "FinAI šifrirana kopija (*.finai)|*.finai",
            DefaultExt = "finai",
            AddExtension = true,
            OverwritePrompt = false,
            CheckPathExists = true,
            FileName = "FinAI-osnutki-" + DateTime.Now.ToString("yyyyMMdd-HHmm") + ".finai"
        };
        if (picker.ShowDialog(this) != DialogResult.OK) return;
        using var phrase = new RecoveryPhraseDialog(confirm: true);
        if (phrase.ShowDialog(this) != DialogResult.OK) return;
        try
        {
            PortableDraftBackup.Export(drafts, picker.FileName, phrase.Passphrase);
            status.Text = "Šifrirana testna kopija je shranjena lokalno.";
            MessageBox.Show(this,
                "Kopija testnih osnutkov je ustvarjena. Frazo shrani ločeno, brez nje kopije ni mogoče obnoviti. " +
                "Pravih računovodskih podatkov v tej različici še ne uporabljaj.",
                "Kopija ustvarjena", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception)
        {
            MessageBox.Show(this,
                "Kopije ni bilo mogoče varno ustvariti. Obstoječa datoteka ni bila prepisana.",
                "Izvoz ni uspel", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private void RestoreDrafts()
    {
        try
        {
            if (drafts.List().Count != 0)
            {
                MessageBox.Show(this,
                    "Obnova je dovoljena samo v popolnoma prazno lokalno zbirko. " +
                    "Obstoječih osnutkov ne bomo prepisali ali združevali.",
                    "Zaščita obstoječih osnutkov", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }
        }
        catch (Exception)
        {
            MessageBox.Show(this, "Stanja lokalne zbirke ni bilo mogoče preveriti.",
                "Obnova ni na voljo", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }
        using var picker = new OpenFileDialog
        {
            Title = "Izberi šifrirano kopijo testnih osnutkov",
            Filter = "FinAI šifrirana kopija (*.finai)|*.finai",
            CheckFileExists = true,
            Multiselect = false
        };
        if (picker.ShowDialog(this) != DialogResult.OK) return;
        using var phrase = new RecoveryPhraseDialog(confirm: false);
        if (phrase.ShowDialog(this) != DialogResult.OK) return;
        try
        {
            PortableDraftBackup.ImportIntoEmpty(drafts, picker.FileName, phrase.Passphrase);
            status.Text = "Testni osnutki so bili obnovljeni iz lokalne kopije.";
            browser.CoreWebView2?.Navigate(LocalStart);
            MessageBox.Show(this,
                "Lokalna obnovitev je uspela. Šifriranje je prilagojeno trenutnemu uporabniku Windows.",
                "Obnova zaključena", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
        catch (Exception)
        {
            MessageBox.Show(this,
                "Obnova ni uspela. Kopija je morda poškodovana, geslo napačno ali zbirka ni prazna. " +
                "Obstoječi zapisi niso bili prepisani.",
                "Obnova zavrnjena", MessageBoxButtons.OK, MessageBoxIcon.Warning);
        }
    }

    private static bool IsLocalOrigin(string? value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && uri.Scheme == Uri.UriSchemeHttps
            && uri.Host.Equals(LocalHost, StringComparison.OrdinalIgnoreCase)
            && uri.Port == 443
            && uri.UserInfo.Length == 0;
    }

    private static void OpenExternal(string? value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
            return;
        if (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeMailto)
            return;
        try
        {
            Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
        }
        catch (Exception)
        {
            // Never fall back to unsafe in-WebView navigation.
        }
    }

    private async System.Threading.Tasks.Task InitializeAsync()
    {
        var wwwroot = Path.Combine(AppContext.BaseDirectory, "wwwroot");
        if (!File.Exists(Path.Combine(wwwroot, "offline", "index.html")))
        {
            status.Text = "Manjkajo lokalne datoteke aplikacije (wwwroot/offline/index.html).";
            return;
        }
        try
        {
            var userData = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "e-integrator", "Desktop", "WebView2");
            Directory.CreateDirectory(userData);
            var environment = await CoreWebView2Environment.CreateAsync(userDataFolder: userData);
            await browser.EnsureCoreWebView2Async(environment);
            SetDisplayZoom(displayZoom);

            var core = browser.CoreWebView2;
            core.SetVirtualHostNameToFolderMapping(LocalHost, wwwroot,
                CoreWebView2HostResourceAccessKind.DenyCors);
            core.Settings.AreHostObjectsAllowed = false;
            core.Settings.IsWebMessageEnabled = true;
            core.Settings.AreDevToolsEnabled = false;
            browser.NavigationStarting += (_, args) =>
            {
                if (IsLocalOrigin(args.Uri))
                    return;
                args.Cancel = true;
                OpenExternal(args.Uri);
            };
            core.NewWindowRequested += (_, args) =>
            {
                args.Handled = true;
                if (IsLocalOrigin(args.Uri))
                    core.Navigate(args.Uri);
                else
                    OpenExternal(args.Uri);
            };
            core.WebMessageReceived += OnWebMessage;
            browser.NavigationCompleted += (_, args) =>
            {
                status.Text = args.IsSuccess
                    ? "Lokalni način · deluje brez interneta · demo osnutki"
                    : "Lokalni vmesnik se ni uspel prikazati.";
            };
            core.Navigate(LocalStart);
        }
        catch (Exception)
        {
            status.Text = "Lokalni WebView2 ni dosegljiv. Preverite Microsoft Edge WebView2 Runtime.";
        }
    }

    private void Respond(string id, object payload)
    {
        if (browser.CoreWebView2 is null)
            return;
        browser.CoreWebView2.PostWebMessageAsJson(
            JsonSerializer.Serialize(new { protocol = Protocol, requestId = id, payload }));
    }

    private void OnWebMessage(object? sender, CoreWebView2WebMessageReceivedEventArgs args)
    {
        // Only our bundled code, under the internal virtual host, may talk to SQLite.
        if (!IsLocalOrigin(args.Source))
            return;
        if (args.WebMessageAsJson.Length > 12_000)
            return;
        try
        {
            using var document = JsonDocument.Parse(args.WebMessageAsJson);
            var root = document.RootElement;
            if (!root.TryGetProperty("protocol", out var p) || p.GetString() != Protocol)
                return;
            if (!root.TryGetProperty("requestId", out var idElement))
                return;
            var id = idElement.GetString();
            if (id is null || id.Length is < 1 or > 64 || !System.Text.RegularExpressions.Regex.IsMatch(id, @"^[A-Za-z0-9_-]+$"))
                return;
            if (!root.TryGetProperty("type", out var typeElement))
                return;
            var type = typeElement.GetString();
            switch (type)
            {
                case "draft.list":
                    Respond(id, new { ok = true, drafts = drafts.List() });
                    break;
                case "draft.create":
                    var title = root.GetProperty("title").GetString() ?? "";
                    var note = root.GetProperty("note").GetString() ?? "";
                    var saved = drafts.Save(title, note);
                    Respond(id, new { ok = true, draft = saved });
                    break;
                case "draft.delete":
                    var key = root.GetProperty("id").GetString() ?? "";
                    Respond(id, new { ok = true, deleted = drafts.Delete(key) });
                    break;
                case "queue.list":
                    var listCompany = root.GetProperty("companyId").GetString() ?? "";
                    Respond(id, new { ok = true, entries = deliveryQueue.List(listCompany) });
                    break;
                case "queue.create":
                    var newCompany = root.GetProperty("companyId").GetString() ?? "";
                    Respond(id, new { ok = true, entry = deliveryQueue.Enqueue(newCompany) });
                    break;
                case "queue.delete":
                    var deleteCompany = root.GetProperty("companyId").GetString() ?? "";
                    var deleteId = root.GetProperty("id").GetString() ?? "";
                    Respond(id, new { ok = true, deleted = deliveryQueue.Remove(deleteCompany, deleteId) });
                    break;
                case "offline.status":
                    Respond(id, new { ok = true, local = true, database = "sqlite-dpapi", sync = "disabled" });
                    break;
                default:
                    Respond(id, new { ok = false, error = "Nepodprta operacija." });
                    break;
            }
        }
        catch (Exception)
        {
            // Never echo the incoming payload or private draft contents on failure.
            status.Text = "Operacija nad lokalnim osnutkom ni uspela.";
        }
    }
}

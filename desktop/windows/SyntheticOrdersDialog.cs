using System;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Windows.Forms;

namespace EIntegrator.Desktop;

/// <summary>
/// NEXT13C: native WinForms QA-only interface. Sensitive local passphrases,
/// SQLite3MC keys, tenant membership and recovery never enter WebView2 messages.
/// No real order data, accounting posting, background sync or remote network.
/// </summary>
internal sealed class SyntheticOrdersDialog : Form
{
    private static readonly Color Surface = Color.FromArgb(13, 32, 46);
    private static readonly Color TextInk = Color.FromArgb(232, 244, 246);
    private static readonly Color Accent = Color.FromArgb(126, 222, 205);

    private readonly TextBox login = new()
    {
        Width = 155, Text = "qa.admin", AccessibleName = "Lokalna testna prijava"
    };
    private readonly TextBox phrase = new()
    {
        Width = 245, UseSystemPasswordChar = true,
        AccessibleName = "Lokalna geselna fraza"
    };
    private readonly ComboBox companies = new()
    {
        Width = 230, DropDownStyle = ComboBoxStyle.DropDownList,
        DisplayMember = "Label", AccessibleName = "Sintetično podjetje"
    };
    private readonly ComboBox skus = new()
    {
        Width = 210, DropDownStyle = ComboBoxStyle.DropDownList,
        AccessibleName = "Sintetični SKU"
    };
    private readonly NumericUpDown units = new()
    {
        Minimum = 1, Maximum = 200, Value = 3,
        Width = 80, AccessibleName = "Sintetična količina"
    };
    private readonly NumericUpDown priceCents = new()
    {
        Minimum = 1, Maximum = 10_000_000, Value = 12_500,
        DecimalPlaces = 0, ThousandsSeparator = true,
        Width = 115, AccessibleName = "Cena na kos v centih"
    };
    private readonly ListBox orders = new()
    {
        Dock = DockStyle.Fill, IntegralHeight = false,
        AccessibleName = "Šifrirani sintetični osnutki naročil"
    };
    private readonly Label message = new()
    {
        Dock = DockStyle.Fill, TextAlign = ContentAlignment.MiddleLeft,
        ForeColor = Accent, AutoEllipsis = true,
        Text = "Samo sintetični podatki. Brez interneta in brez knjiženja."
    };

    private readonly Button initialize = ActionButton("Ustvari testni trezor");
    private readonly Button unlock = ActionButton("Prijava");
    private readonly Button lockButton = ActionButton("Odjava");
    private readonly Button restore = ActionButton("Obnovi kopijo");
    private readonly Button export = ActionButton("Izvozi šifrirano kopijo");
    private readonly Button save = ActionButton("Shrani demo osnutek");
    private readonly Button prepareAccounts = ActionButton("Pripravi demo konta");
    private readonly Button reviewJournal = ActionButton("Preveri demo temeljnico");
    private readonly Button manualTransfer = ActionButton("Izvozi demo dogodek");
    private readonly NumericUpDown journalCents = new()
    {
        Minimum = 1, Maximum = 1_000_000, Value = 12_345,
        DecimalPlaces = 0, ThousandsSeparator = true, Width = 135,
        AccessibleName = "Znesek sintetične temeljnice v centih"
    };

    private EncryptedLedgerStore? ledger;
    private EncryptedLedgerStore.Session? session;

    public SyntheticOrdersDialog()
    {
        Text = "FinAI — šifrirani sintetični osnutki in predpregled (lokalni QA)";
        MinimumSize = new Size(920, 610);
        Size = new Size(1090, 730);
        StartPosition = FormStartPosition.CenterParent;
        BackColor = Color.FromArgb(8, 23, 36);
        ForeColor = TextInk;
        Font = new Font("Segoe UI", 10);

        skus.Items.AddRange(["SYN-TAB-10070", "SYN-PRINT-0001", "SYN-ROLL-0002"]);
        skus.SelectedIndex = 0;

        var page = new TableLayoutPanel
        {
            Dock = DockStyle.Fill, ColumnCount = 1, RowCount = 6,
            Padding = new Padding(20), BackColor = BackColor
        };
        page.RowStyles.Add(new RowStyle(SizeType.Absolute, 66));
        page.RowStyles.Add(new RowStyle(SizeType.Absolute, 95));
        page.RowStyles.Add(new RowStyle(SizeType.Absolute, 88));
        page.RowStyles.Add(new RowStyle(SizeType.Absolute, 84));
        page.RowStyles.Add(new RowStyle(SizeType.Percent, 100));
        page.RowStyles.Add(new RowStyle(SizeType.Absolute, 46));

        var heading = new Label
        {
            Dock = DockStyle.Fill, AutoSize = false,
            Font = new Font("Segoe UI", 15, FontStyle.Bold),
            ForeColor = Accent, TextAlign = ContentAlignment.MiddleLeft,
            Text = "Šifrirani poslovni osnutki  ·  BREZ POVEZAVE"
        };

        var loginBar = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill, WrapContents = true, AutoScroll = true,
            FlowDirection = FlowDirection.LeftToRight, BackColor = Surface,
            Padding = new Padding(10, 8, 10, 8)
        };
        loginBar.Controls.Add(Labeled("Lokalni uporabnik", login));
        loginBar.Controls.Add(Labeled("Geselna fraza (16+)", phrase));
        loginBar.Controls.Add(initialize);
        loginBar.Controls.Add(unlock);
        loginBar.Controls.Add(lockButton);
        loginBar.Controls.Add(restore);

        var draftBar = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill, WrapContents = true, AutoScroll = true,
            FlowDirection = FlowDirection.LeftToRight, BackColor = Surface,
            Padding = new Padding(10, 8, 10, 8)
        };
        draftBar.Controls.Add(Labeled("Podjetje", companies));
        draftBar.Controls.Add(Labeled("Izmišljeni artikel", skus));
        draftBar.Controls.Add(Labeled("Količina", units));
        draftBar.Controls.Add(Labeled("Cena v centih", priceCents));
        draftBar.Controls.Add(save);
        draftBar.Controls.Add(export);

        var journalBar = new FlowLayoutPanel
        {
            Dock = DockStyle.Fill, WrapContents = true, AutoScroll = true,
            FlowDirection = FlowDirection.LeftToRight, BackColor = Surface,
            Padding = new Padding(10, 8, 10, 8)
        };
        journalBar.Controls.Add(Labeled("Znesek demo temeljnice v centih", journalCents));
        journalBar.Controls.Add(prepareAccounts);
        journalBar.Controls.Add(reviewJournal);
        journalBar.Controls.Add(manualTransfer);

        var listing = new GroupBox
        {
            Text = "Lokalni šifrirani osnutki (samo pregled, brez knjiženja)",
            Dock = DockStyle.Fill, ForeColor = TextInk,
            BackColor = Surface, Padding = new Padding(12)
        };
        orders.BackColor = Color.FromArgb(18, 43, 59);
        orders.ForeColor = TextInk;
        orders.Font = new Font("Consolas", 11);
        listing.Controls.Add(orders);

        page.Controls.Add(heading, 0, 0);
        page.Controls.Add(loginBar, 0, 1);
        page.Controls.Add(draftBar, 0, 2);
        page.Controls.Add(journalBar, 0, 3);
        page.Controls.Add(listing, 0, 4);
        page.Controls.Add(message, 0, 5);
        Controls.Add(page);

        initialize.Click += (_, _) => Guard(CreateVault, "Testnega trezorja ni mogoče ustvariti.");
        unlock.Click += (_, _) => Guard(OpenVault, "Prijava oziroma odpiranje ni uspelo.");
        lockButton.Click += (_, _) => Logout();
        restore.Click += (_, _) => Guard(RestoreBackup, "Šifrirane kopije ni mogoče obnoviti.");
        save.Click += (_, _) => Guard(SaveDraft, "Osnutek ni bil shranjen.");
        export.Click += (_, _) => Guard(ExportBackup, "Izvoz šifrirane kopije ni uspel.");
        prepareAccounts.Click += (_, _) => Guard(PreparePreviewAccounts,
            "Sintetičnih kontov ni mogoče pripraviti.");
        reviewJournal.Click += (_, _) => Guard(ReviewJournal,
            "Sintetične temeljnice ni mogoče varno preveriti.");
        manualTransfer.Click += (_, _) => Guard(() =>
        {
            _ = ActiveCompany(); // Current native login is required.
            using var dialog = new SyntheticWindowsTransferDialog();
            dialog.ShowDialog(this);
        }, "Sintetičnega prenosa ni mogoče odpreti.");
        companies.SelectedIndexChanged += (_, _) =>
        {
            if (session is not null) Guard(RefreshOrders, "Pregleda osnutkov ni mogoče osvežiti.");
        };
        FormClosed += (_, _) => Logout();
        UpdateControls();
    }

    private static Button ActionButton(string title) => new()
    {
        Text = title, Height = 44, AutoSize = true,
        AutoSizeMode = AutoSizeMode.GrowAndShrink,
        BackColor = Color.FromArgb(31, 70, 87), ForeColor = Color.White,
        FlatStyle = FlatStyle.Flat, Margin = new Padding(8, 11, 8, 0)
    };

    private static Control Labeled(string caption, Control input)
    {
        var column = new FlowLayoutPanel
        {
            FlowDirection = FlowDirection.TopDown, WrapContents = false,
            AutoSize = true, Margin = new Padding(8, 0, 8, 0)
        };
        column.Controls.Add(new Label
        {
            Text = caption, AutoSize = true,
            Font = new Font("Segoe UI", 8.5f),
            ForeColor = TextInk
        });
        input.Margin = new Padding(1);
        input.Height = 28;
        column.Controls.Add(input);
        return column;
    }

    private static string CheckedVaultPath()
    {
        var local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        if (string.IsNullOrWhiteSpace(local) || !Directory.Exists(local))
            throw new IOException("No private user-local application directory");
        var baseInfo = new DirectoryInfo(local);
        if (baseInfo.Attributes.HasFlag(FileAttributes.ReparsePoint))
            throw new IOException("Linked local app-data root is not allowed");
        var current = local;
        foreach (var part in new[] { "e-integrator", "Desktop", "SyntheticOrderVault-v1" })
        {
            current = Path.Combine(current, part);
            if (File.Exists(current))
                throw new IOException("Vault path component is not a directory");
            if (Directory.Exists(current) &&
                new DirectoryInfo(current).Attributes.HasFlag(FileAttributes.ReparsePoint))
                throw new IOException("Symlinked or junction vault path is not allowed");
        }
        return current;
    }

    private static void EnsureVaultParent(string vault)
    {
        var parent = Path.GetDirectoryName(vault)
            ?? throw new IOException("Missing local vault parent");
        Directory.CreateDirectory(parent);
        // Re-check just before writing: refuse junctions and symlinks.
        _ = CheckedVaultPath();
    }

    private void UpdateControls()
    {
        var active = session is not null && session.IsActive && ledger is not null;
        initialize.Enabled = !active;
        unlock.Enabled = !active;
        restore.Enabled = !active;
        lockButton.Enabled = active;
        export.Enabled = active;
        companies.Enabled = active;
        skus.Enabled = active;
        units.Enabled = active;
        priceCents.Enabled = active;
        save.Enabled = active && companies.SelectedItem is EncryptedLedgerStore.SyntheticCompany;
        prepareAccounts.Enabled = save.Enabled;
        reviewJournal.Enabled = save.Enabled;
        manualTransfer.Enabled = save.Enabled;
        journalCents.Enabled = save.Enabled;
        login.Enabled = !active;
        phrase.Enabled = !active;
    }

    private void Guard(Action action, string publicError)
    {
        try
        {
            action();
        }
        catch (Exception)
        {
            // No original exception, file path, credentials, key or SQL in UI logs.
            message.Text = publicError + " Obstoječi podatki niso bili prepisani.";
        }
        finally
        {
            phrase.Clear();
            UpdateControls();
        }
    }

    private void Attach(EncryptedLedgerStore opened, EncryptedLedgerStore.Session authenticated)
    {
        session?.Revoke();
        ledger?.Dispose();
        ledger = opened;
        session = authenticated;
        companies.Items.Clear();
        foreach (var company in opened.ListSyntheticCompanies(authenticated))
            companies.Items.Add(company);
        if (companies.Items.Count > 0) companies.SelectedIndex = 0;
        RefreshOrders();
        message.Text = "Prijava uspešna. Samo lokalna sintetična podjetja in šifrirani osnutki.";
    }

    private void CreateVault()
    {
        if (ledger is not null) throw new InvalidOperationException("Vault already open");
        var path = CheckedVaultPath();
        if (Directory.Exists(path) || File.Exists(path))
            throw new IOException("Never replace an existing local vault");
        EnsureVaultParent(path);
        var entered = phrase.Text;
        if (entered.Length < 16 || entered.Length > 1024)
            throw new ArgumentException("Local passphrase length");
        var created = EncryptedLedgerStore.CreateNew(path, login.Text, entered);
        try
        {
            var authenticated = created.Authenticate(login.Text, entered)
                ?? throw new UnauthorizedAccessException("Local synthetic login failed");
            created.CreateCompany(authenticated, "SYNTH-PODJETJE-A");
            created.CreateCompany(authenticated, "SYNTH-PODJETJE-B");
            Attach(created, authenticated);
        }
        catch
        {
            created.Dispose();
            throw;
        }
    }

    private void OpenVault()
    {
        if (ledger is not null) throw new InvalidOperationException("Vault already open");
        var path = CheckedVaultPath();
        if (!Directory.Exists(path))
            throw new IOException("No existing synthetic vault");
        var opened = EncryptedLedgerStore.OpenExisting(path);
        try
        {
            var authenticated = opened.Authenticate(login.Text, phrase.Text);
            if (authenticated is null)
                throw new UnauthorizedAccessException("Local authentication rejected");
            Attach(opened, authenticated);
        }
        catch
        {
            opened.Dispose();
            throw;
        }
    }

    private void Logout()
    {
        session?.Revoke();
        session = null;
        ledger?.Dispose();
        ledger = null;
        companies.Items.Clear();
        orders.Items.Clear();
        phrase.Clear();
        message.Text = "Lokalna seja zaključena; demo predpregled je počiščen.";
        UpdateControls();
    }

    private (EncryptedLedgerStore Store, EncryptedLedgerStore.Session Session,
        string CompanyId) ActiveCompany()
    {
        if (ledger is null || session is null || !session.IsActive ||
            companies.SelectedItem is not EncryptedLedgerStore.SyntheticCompany selected)
            throw new UnauthorizedAccessException("No valid synthetic local company session");
        return (ledger, session, selected.CompanyId);
    }

    private void RefreshOrders()
    {
        if (ledger is null || session is null) return;
        var (store, localSession, company) = ActiveCompany();
        orders.Items.Clear();
        var rows = store.ListSyntheticOrderDrafts(localSession, company);
        foreach (var draft in rows)
        {
            var euros = (draft.TotalCents / 100m).ToString("N2",
                CultureInfo.GetCultureInfo("sl-SI"));
            orders.Items.Add($"{draft.CreatedUtc}    {draft.Sku,-18} " +
                $"{draft.Quantity,4} kos  {euros,14} EUR");
        }
        if (rows.Count == 0) orders.Items.Add("Ni shranjenih sintetičnih osnutkov.");
    }

    private void SaveDraft()
    {
        var (store, localSession, company) = ActiveCompany();
        if (skus.SelectedItem is not string sku || !sku.StartsWith("SYN-", StringComparison.Ordinal))
            throw new InvalidOperationException("Only synthetic SKU are allowed");
        store.SaveSyntheticOrderDraft(localSession, company,
            Guid.NewGuid().ToString("D"), sku, decimal.ToInt32(units.Value),
            decimal.ToInt64(priceCents.Value));
        RefreshOrders();
        message.Text = "Sintetični osnutek shranjen v šifrirani zbirki. Ni knjižen ali poslan.";
    }

    private void PreparePreviewAccounts()
    {
        var (store, localSession, companyId) = ActiveCompany();
        store.EnsureSyntheticPreviewAccounts(localSession, companyId);
        message.Text = "Pripravljena sta fiksna izmišljena konta 1200 in 2600. Brez knjiženja.";
    }

    private void ReviewJournal()
    {
        var (store, localSession, companyId) = ActiveCompany();
        var cents = decimal.ToInt64(journalCents.Value);
        var result = store.Preview(localSession, companyId, [
            new EncryptedLedgerStore.Line("1200", cents, 0),
            new EncryptedLedgerStore.Line("2600", 0, cents)
        ]);
        if (result.PostingAllowed || result.DebitCents != result.CreditCents)
            throw new InvalidDataException("Synthetic preview must never post");
        var euros = (result.DebitCents / 100m).ToString("N2",
            CultureInfo.GetCultureInfo("sl-SI"));
        message.Text = $"Preverjeno {result.LineCount} demo postavki: breme = dobro = {euros} EUR. NI KNJIŽENO.";
    }

    private void ExportBackup()
    {
        var (store, _, _) = ActiveCompany();
        using var picker = new SaveFileDialog
        {
            Title = "Nova šifrirana kopija izmišljenih naročil in testne zbirke",
            Filter = "FinAI šifrirana kopija (*.finai)|*.finai",
            DefaultExt = "finai", AddExtension = true,
            OverwritePrompt = false, CheckPathExists = true,
            FileName = "FinAI-sinteticni-trezor-" + DateTime.Now.ToString("yyyyMMdd-HHmm") + ".finai"
        };
        if (picker.ShowDialog(this) != DialogResult.OK) return;
        // Strong native-only recovery phrase; never delivered to WebView2.
        using var recovery = new RecoveryPhraseDialog(confirm: true);
        if (recovery.ShowDialog(this) != DialogResult.OK) return;
        PortableEncryptedLedgerBackup.Export(store, picker.FileName, recovery.Passphrase);
        message.Text = "Šifrirana prenosna kopija ustvarjena. Obnovitveno frazo hrani ločeno.";
    }

    private void RestoreBackup()
    {
        if (ledger is not null) throw new InvalidOperationException("Logout before restore");
        var path = CheckedVaultPath();
        if (Directory.Exists(path) || File.Exists(path))
            throw new IOException("Never overwrite an existing encrypted vault");
        using var picker = new OpenFileDialog
        {
            Title = "Obnovi samo v še neobstoječ lokalni testni trezor",
            Filter = "FinAI šifrirana kopija (*.finai)|*.finai",
            CheckFileExists = true, Multiselect = false
        };
        if (picker.ShowDialog(this) != DialogResult.OK) return;
        using var recovery = new RecoveryPhraseDialog(confirm: false);
        if (recovery.ShowDialog(this) != DialogResult.OK) return;
        EnsureVaultParent(path);
        PortableEncryptedLedgerBackup.RestoreIntoNewDirectory(
            picker.FileName, path, recovery.Passphrase);
        message.Text = "Preverjena šifrirana kopija obnovljena v nov lokalni trezor. Prijavi se.";
    }
}

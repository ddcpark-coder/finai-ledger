using System;
using System.Drawing;
using System.Windows.Forms;

namespace EIntegrator.Desktop;

/// <summary>
/// Native passphrase prompt. Secret is never sent to WebView2/JavaScript or disk.
/// Internal QA only: runtime string memory is not securely cleared by .NET.
/// </summary>
internal sealed class RecoveryPhraseDialog : Form
{
    private readonly TextBox phrase = new()
    {
        Dock = DockStyle.Fill,
        UseSystemPasswordChar = true,
        MaxLength = 1024,
        Font = new Font("Segoe UI", 11f)
    };
    private readonly TextBox confirmation = new()
    {
        Dock = DockStyle.Fill,
        UseSystemPasswordChar = true,
        MaxLength = 1024,
        Font = new Font("Segoe UI", 11f)
    };
    private readonly bool confirm;
    public string Passphrase { get; private set; } = "";

    public RecoveryPhraseDialog(bool confirm)
    {
        this.confirm = confirm;
        Text = confirm ? "Geslo za šifrirano kopijo" : "Geslo za obnovitev";
        Width = 510;
        Height = confirm ? 318 : 250;
        StartPosition = FormStartPosition.CenterParent;
        MaximizeBox = false;
        MinimizeBox = false;
        FormBorderStyle = FormBorderStyle.FixedDialog;
        ShowInTaskbar = false;

        var grid = new TableLayoutPanel
        {
            Dock = DockStyle.Fill, ColumnCount = 1, RowCount = confirm ? 6 : 4,
            Padding = new Padding(17), AutoSize = false
        };
        grid.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100f));
        grid.Controls.Add(new Label
        {
            Text = "Samo testni osnutki. Uporabi močno, unikatno frazo (najmanj 16 znakov). " +
                   "Če jo izgubiš, kopije ni mogoče obnoviti.",
            Dock = DockStyle.Fill, AutoSize = false
        }, 0, 0);
        grid.Controls.Add(phrase, 0, 1);
        var row = 2;
        if (confirm)
        {
            grid.Controls.Add(new Label
            {
                Text = "Ponovno vnesi enako frazo:", Dock = DockStyle.Fill
            }, 0, row++);
            grid.Controls.Add(confirmation, 0, row++);
        }
        var warning = new Label
        {
            Text = "Geslo se ne hrani v aplikaciji in se ne pošlje na strežnik.",
            Dock = DockStyle.Fill, ForeColor = Color.DarkSlateGray,
        };
        grid.Controls.Add(warning, 0, row++);

        var buttons = new FlowLayoutPanel { Dock = DockStyle.Fill, FlowDirection = FlowDirection.RightToLeft };
        var accept = new Button { Text = "Nadaljuj", Width = 110, DialogResult = DialogResult.None };
        var cancel = new Button { Text = "Prekliči", Width = 95, DialogResult = DialogResult.Cancel };
        buttons.Controls.Add(accept);
        buttons.Controls.Add(cancel);
        grid.Controls.Add(buttons, 0, row);
        Controls.Add(grid);
        CancelButton = cancel;
        accept.Click += (_, _) =>
        {
            var value = phrase.Text;
            if (value.Length < 16 || value.Length > 1024 ||
                string.IsNullOrWhiteSpace(value) ||
                (this.confirm && value != confirmation.Text))
            {
                MessageBox.Show(this, "Fraza mora imeti najmanj 16 znakov in se ujemati.",
                    "Preveri geslo", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }
            Passphrase = value;
            DialogResult = DialogResult.OK;
            Close();
        };
    }
}

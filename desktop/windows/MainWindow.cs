using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Threading.Tasks;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace EIntegrator.Desktop;

/// <summary>
/// Dedicated Windows shell for the Hiper M-hosted FinAI web application.
/// This is not a separate accounting engine: all business state and auth
/// remain on the user's Hiper M Laravel application.
/// </summary>
internal sealed class MainWindow : Form
{
    private const string AppUrl = "https://app.e-integrator.si/";
    private const string TrustedHost = "app.e-integrator.si";

    private readonly WebView2 browser = new() { Dock = DockStyle.Fill };
    private readonly Label connectionStatus = new()
    {
        Dock = DockStyle.Fill,
        AutoEllipsis = true,
        TextAlign = ContentAlignment.MiddleLeft,
        ForeColor = Color.FromArgb(179, 199, 216),
        Text = "Priprava varne povezave s Hiper M …"
    };
    private readonly Button reloadButton = new()
    {
        Dock = DockStyle.Fill,
        Text = "Osveži",
        FlatStyle = FlatStyle.Flat,
        ForeColor = Color.FromArgb(220, 242, 246),
        BackColor = Color.FromArgb(27, 55, 75)
    };

    public MainWindow()
    {
        Text = "e-integrator — FinAI";
        Width = 1360;
        Height = 870;
        MinimumSize = new Size(980, 640);
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(9, 21, 35);
        ForeColor = Color.White;

        var title = new Label
        {
            Dock = DockStyle.Fill,
            Text = "e-integrator  /  FinAI",
            TextAlign = ContentAlignment.MiddleLeft,
            ForeColor = Color.FromArgb(118, 231, 212),
            Font = new Font("Segoe UI", 12f, FontStyle.Bold)
        };

        var header = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            BackColor = Color.FromArgb(12, 29, 46),
            ColumnCount = 3,
            RowCount = 1,
            Padding = new Padding(18, 8, 14, 8)
        };
        header.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 255f));
        header.ColumnStyles.Add(new ColumnStyle(SizeType.Percent, 100f));
        header.ColumnStyles.Add(new ColumnStyle(SizeType.Absolute, 100f));
        header.Controls.Add(title, 0, 0);
        header.Controls.Add(connectionStatus, 1, 0);
        header.Controls.Add(reloadButton, 2, 0);

        var layout = new TableLayoutPanel
        {
            Dock = DockStyle.Fill,
            ColumnCount = 1,
            RowCount = 2
        };
        layout.RowStyles.Add(new RowStyle(SizeType.Absolute, 61f));
        layout.RowStyles.Add(new RowStyle(SizeType.Percent, 100f));
        layout.Controls.Add(header, 0, 0);
        layout.Controls.Add(browser, 0, 1);
        Controls.Add(layout);

        reloadButton.Click += (_, _) => Retry();
        Shown += async (_, _) => await InitializeAsync();
    }

    private async Task InitializeAsync()
    {
        try
        {
            // Normal per-user browser profile; credentials are never hardcoded.
            var dataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "e-integrator", "Desktop", "WebView2");
            Directory.CreateDirectory(dataFolder);
            var environment = await CoreWebView2Environment.CreateAsync(
                userDataFolder: dataFolder);
            await browser.EnsureCoreWebView2Async(environment);

            // No privileged native bridge is exposed to website JavaScript.
            browser.CoreWebView2.Settings.AreHostObjectsAllowed = false;
            browser.CoreWebView2.Settings.IsWebMessageEnabled = false;

            browser.NavigationStarting += OnNavigationStarting;
            browser.NavigationCompleted += OnNavigationCompleted;
            browser.CoreWebView2.NewWindowRequested += OnNewWindowRequested;

            connectionStatus.Text = "Vzpostavljanje zaščitene povezave …";
            browser.CoreWebView2.Navigate(AppUrl);
        }
        catch (Exception)
        {
            // Avoid exposing local paths or environment details in the interface.
            connectionStatus.Text = "WebView2 ni na voljo. Preverite namestitev Microsoft Edge WebView2 Runtime.";
        }
    }

    private static bool IsTrustedAppUrl(string? value)
    {
        return Uri.TryCreate(value, UriKind.Absolute, out var uri)
            && uri.Scheme == Uri.UriSchemeHttps
            && uri.Host.Equals(TrustedHost, StringComparison.OrdinalIgnoreCase)
            && uri.Port == 443
            && uri.UserInfo.Length == 0;
    }

    private static void OpenExternal(string? value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri))
            return;
        // Never invoke local files or arbitrary custom protocols from web content.
        if (uri.Scheme != Uri.UriSchemeHttps && uri.Scheme != Uri.UriSchemeMailto)
            return;
        try
        {
            Process.Start(new ProcessStartInfo(uri.AbsoluteUri) { UseShellExecute = true });
        }
        catch (Exception)
        {
            // Browser navigation remains blocked if the external app is unavailable.
        }
    }

    private void OnNavigationStarting(
        object? sender, CoreWebView2NavigationStartingEventArgs args)
    {
        if (IsTrustedAppUrl(args.Uri))
        {
            connectionStatus.Text = "Nalagam e-integrator s strežnika Hiper M …";
            return;
        }
        args.Cancel = true;
        OpenExternal(args.Uri);
    }

    private void OnNewWindowRequested(
        object? sender, CoreWebView2NewWindowRequestedEventArgs args)
    {
        args.Handled = true; // No unguarded popup webviews.
        if (IsTrustedAppUrl(args.Uri))
            browser.CoreWebView2.Navigate(args.Uri);
        else
            OpenExternal(args.Uri);
    }

    private void OnNavigationCompleted(
        object? sender, CoreWebView2NavigationCompletedEventArgs args)
    {
        connectionStatus.Text = args.IsSuccess
            ? "Povezano s Hiper M · varna povezava HTTPS"
            : "Aplikacija trenutno ni dosegljiva · preverite povezavo ali DNS in poskusite znova.";
    }

    private void Retry()
    {
        if (browser.CoreWebView2 is null)
        {
            _ = InitializeAsync();
            return;
        }
        browser.CoreWebView2.Navigate(AppUrl);
    }
}

using OrtakAlanYetkiKontrol.Services;
using OrtakAlanYetkiKontrol.Models;
using System.Text;
using System.Text.Json;
using iTextSharp.text; 
using iTextSharp.text.pdf; 
using PdfFont = iTextSharp.text.Font; 
using WinFont = System.Drawing.Font;
using Microsoft.Web.WebView2.WinForms;
using Microsoft.Web.WebView2.Core;

namespace OrtakAlanYetkiKontrol;

public partial class Form1 : Form
{
    private WebView2 _webView = null!;
    private YetkiServisi _yetkiServisi = null!;
    private List<YetkiRaporu> _tumVeriler = new();
    
    // Sabit Komutlar
    private const string CMD_SCAN_FOLDER = "scanFolder"; 
    private const string CMD_EXPORT_PDF = "exportPdf";
    private const string CMD_EXPORT_EXCEL = "exportExcel";

    public Form1()
    {
        _yetkiServisi = new YetkiServisi();
        InitializeComponent();
        this.Text = "Ern Enerji | Yetki Analiz Sistemi";
        this.WindowState = FormWindowState.Maximized; // Tam ekran başlat
        InitializeWebView2();
    }

    private async void InitializeWebView2()
    {
        try
        {
            _webView = new WebView2 { Dock = DockStyle.Fill };
            this.Controls.Add(_webView);

            // OPTİMİZASYON: WebView2 Kullanıcı Veri Klasörü Ayarı
            var userDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ErnEnerji_WebView2");
            var env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
            await _webView.EnsureCoreWebView2Async(env);

            // DİKKAT: 'dist' klasörünü C# projenin 'bin/Debug' klasörü altındaki 'WebUI' klasörüne koymalısın
            string distPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "WebUI");
            
            // Eğer geliştirme aşamasındaysan (VS Code'daki dist yolu):
            if (!Directory.Exists(distPath)) {
                 distPath = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "..", "..", "..", "Frontend", "dist"));
            }

            if (Directory.Exists(distPath))
            {
                _webView.CoreWebView2.SetVirtualHostNameToFolderMapping("ern.local", distPath, CoreWebView2HostResourceAccessKind.Allow);
            }

            _webView.CoreWebView2.WebMessageReceived += CoreWebView2_WebMessageReceived;
            _webView.Source = new Uri("https://ern.local/index.html");
        }
        catch (Exception ex)
        {
            MessageBox.Show($"Başlatma Hatası: {ex.Message}");
        }
    }

    private async void CoreWebView2_WebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            // React'tan gelen veriyi JSON zırhıyla güvenli okuyoruz
            string rawMessage = e.WebMessageAsJson;
            
            if (!string.IsNullOrEmpty(rawMessage) && (rawMessage.Contains("scanFolder") || rawMessage.Contains("open_folder_picker")))
            {
                using (var fbd = new FolderBrowserDialog())
                {
                    fbd.Description = "Lütfen Taramak İstediğiniz Ana Klasörü Seçin";
                    fbd.UseDescriptionForTitle = true;
                    fbd.ShowNewFolderButton = false;

                    // 'this' eklendi: Pencere uygulamanın tam üstünde açılsın
                    if (fbd.ShowDialog(this) == DialogResult.OK)
                    {
                        await RunOptimizedScan(fbd.SelectedPath);
                    }
                }
            }
        }
        catch (Exception ex)
        {
            SendMessageToFrontend("error", ex.Message);
        }
    }

    // 95.000 DOSYA İÇİN ÖZEL OPTİMİZASYON METODU
    private async Task RunOptimizedScan(string folderPath)
    {
        SendMessageToFrontend("status", "🔄 Tarama Başladı. Dosyalar işleniyor...");

        try
        {
            // OPTİMİZASYON: UI (Ekran) donmaması için Task.Run ile arka planda tara
            _tumVeriler = await Task.Run(() => _yetkiServisi.TekilYetkiGetir(folderPath));

            // Verileri React'ın anlayacağı şık formata çevir
            var results = new
            {
                totalFiles = _tumVeriler.Count,
                criticalFound = _tumVeriler.Count(x => x.KullaniciAdi.Contains("Everyone") && x.YetkiTuru.Contains("Full")),
                scanDate = DateTime.Now.ToString("dd.MM.yyyy HH:mm"),
                details = _tumVeriler.Take(500).Select(x => new { // Performans için ilk 500'ü hemen göster
                    path = x.KlasorYolu,
                    user = x.KullaniciAdi,
                    perm = x.YetkiTuru,
                    isInherited = x.MirasMi
                })
            };

            // React'ın beklediği scanComplete nesnesi olarak fırlat
            string jsonResponse = JsonSerializer.Serialize(results);
            SendMessageToFrontend("scanComplete", jsonResponse);
            SendMessageToFrontend("success", "✅ Tarama Tamamlandı!");
        }
        catch (Exception ex)
        {
            SendMessageToFrontend("error", "Tarama yarıda kesildi: " + ex.Message);
        }
    }

    // =======================================================================
    // DÜZELTİLEN VE JAVASCRIPT'İ ÇÖKMELERDEN KORUYAN ZIRHLI METOT
    // =======================================================================
    private void SendMessageToFrontend(string type, string message)
    {
        try 
        {
            // Ters bölü (\) gibi karakterlerin JavaScript'i bozmasını önlemek için
            // veriyi güvenli bir C# objesi olarak paketleyip JSON'a çeviriyoruz.
            var payload = new { type = type, data = message };
            string safeJson = JsonSerializer.Serialize(payload);
            
            // JavaScript kodunu CustomEvent ile tetikliyoruz
            string script = $"window.dispatchEvent(new CustomEvent('backendMessage', {{ detail: {safeJson} }}));";
            _webView.CoreWebView2.ExecuteScriptAsync(script);
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine("Frontend'e mesaj gönderilemedi: " + ex.Message);
        }
    }
}
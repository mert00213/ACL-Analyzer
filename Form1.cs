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
    private const string CMD_EXIT_APP = "exitApp";

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
            
            if (!string.IsNullOrEmpty(rawMessage))
            {
                if (rawMessage.Contains("scanFolder") || rawMessage.Contains("open_folder_picker"))
                {
                    using (var fbd = new FolderBrowserDialog())
                    {
                        fbd.Description = "Lütfen Taramak İstediğiniz Ana Klasörü Seçin";
                        fbd.UseDescriptionForTitle = true;
                        fbd.ShowNewFolderButton = false;

                        if (fbd.ShowDialog(this) == DialogResult.OK)
                        {
                            await RunOptimizedScan(fbd.SelectedPath);
                        }
                    }
                }
                else if (rawMessage.Contains(CMD_EXPORT_PDF))
                {
                    ExportToPdf();
                }
                else if (rawMessage.Contains(CMD_EXPORT_EXCEL))
                {
                    ExportToExcel();
                }
                else if (rawMessage.Contains(CMD_EXIT_APP))
                {
                    Application.Exit();
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

    private async void ExportToPdf()
    {
        if (_tumVeriler == null || !_tumVeriler.Any()) {
            SendMessageToFrontend("error", "Dışa aktarılacak yetki verisi bulunamadı. Lütfen önce bir klasör taratın.");
            return;
        }

        using (var sfd = new SaveFileDialog() { Filter = "PDF Dosyası|*.pdf", FileName = "Ern_Yetki_Analiz_" + DateTime.Now.ToString("yyyyMMdd_HHmm") + ".pdf" })
        {
            if (sfd.ShowDialog(this) == DialogResult.OK)
            {
                SendMessageToFrontend("status", "PDF oluşturuluyor, lütfen bekleyin...");
                try {
                    string filePath = sfd.FileName;
                    await Task.Run(() => {
                        using (FileStream stream = new FileStream(filePath, FileMode.Create))
                        {
                            Document pdfDoc = new Document(PageSize.A4.Rotate(), 20f, 20f, 30f, 30f);
                            PdfWriter.GetInstance(pdfDoc, stream);
                            pdfDoc.Open();

                            string ttf = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.Fonts), "arial.ttf");
                            BaseFont bf = BaseFont.CreateFont(ttf, BaseFont.IDENTITY_H, BaseFont.NOT_EMBEDDED);
                            PdfFont fontTitle = new PdfFont(bf, 16, PdfFont.BOLD, new BaseColor(0, 88, 78)); 
                            PdfFont fontHeader = new PdfFont(bf, 10, PdfFont.BOLD, BaseColor.WHITE);
                            PdfFont fontNormal = new PdfFont(bf, 9, PdfFont.NORMAL, BaseColor.DARK_GRAY);
                            PdfFont fontDanger = new PdfFont(bf, 9, PdfFont.BOLD, BaseColor.RED);

                            Paragraph title = new Paragraph("ERN HOLDİNG - ORTAK ALAN YETKİ KONTROL RAPORU", fontTitle);
                            title.Alignment = Element.ALIGN_CENTER;
                            title.SpacingAfter = 20f;
                            pdfDoc.Add(title);

                            PdfPTable table = new PdfPTable(4);
                            table.WidthPercentage = 100;
                            table.SetWidths(new float[] { 4f, 2f, 2f, 1f });

                            string[] headers = { "Dosya/Klasör Yolu", "Kullanıcı/Grup", "Yetki Türü", "Miras" };
                            foreach (var hdr in headers) {
                                PdfPCell cell = new PdfPCell(new Phrase(hdr, fontHeader));
                                cell.BackgroundColor = new BaseColor(0, 88, 78);
                                cell.Padding = 8f;
                                cell.HorizontalAlignment = Element.ALIGN_CENTER;
                                table.AddCell(cell);
                            }

                            // Performans için PDF'e ilk 5000 satırı aktar
                            foreach(var item in _tumVeriler.Take(5000)) {
                                bool isRisky = item.KullaniciAdi.Contains("Everyone") || item.YetkiTuru.Contains("Full");
                                
                                PdfPCell c1 = new PdfPCell(new Phrase(item.KlasorYolu, fontNormal));
                                PdfPCell c2 = new PdfPCell(new Phrase(item.KullaniciAdi, isRisky ? fontDanger : fontNormal));
                                PdfPCell c3 = new PdfPCell(new Phrase(item.YetkiTuru, isRisky ? fontDanger : fontNormal));
                                PdfPCell c4 = new PdfPCell(new Phrase(item.MirasMi, fontNormal));

                                BaseColor rowBg = isRisky ? new BaseColor(255, 235, 238) : BaseColor.WHITE;
                                c1.BackgroundColor = rowBg; c2.BackgroundColor = rowBg; c3.BackgroundColor = rowBg; c4.BackgroundColor = rowBg;
                                c1.Padding = 6f; c2.Padding = 6f; c3.Padding = 6f; c4.Padding = 6f;

                                table.AddCell(c1); table.AddCell(c2); table.AddCell(c3); table.AddCell(c4);
                            }

                            pdfDoc.Add(table);
                            pdfDoc.Close();
                        }
                    });
                    
                    SendMessageToFrontend("success", "PDF başarıyla kaydedildi.");
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo { FileName = filePath, UseShellExecute = true });
                }
                catch (Exception ex) {
                    SendMessageToFrontend("error", "PDF oluşturulurken hata: " + ex.Message);
                }
            }
        }
    }

    private async void ExportToExcel()
    {
        if (_tumVeriler == null || !_tumVeriler.Any()) {
            SendMessageToFrontend("error", "Dışa aktarılacak veri bulunamadı.");
            return;
        }

        using (var sfd = new SaveFileDialog() { Filter = "Excel Dosyası (CSV)|*.csv", FileName = "Ern_Yetki_Analiz_" + DateTime.Now.ToString("yyyyMMdd_HHmm") + ".csv" })
        {
            if (sfd.ShowDialog(this) == DialogResult.OK)
            {
                SendMessageToFrontend("status", "Excel aktarılıyor, lütfen bekleyin...");
                try {
                    string filePath = sfd.FileName;
                    await Task.Run(() => {
                        StringBuilder sb = new StringBuilder();
                        sb.AppendLine("Dosya/Klasör Yolu;Kullanıcı/Grup;Yetki Türü;Miras");
                        foreach (var item in _tumVeriler)
                        {
                            string path = $"\"{item.KlasorYolu.Replace("\"", "\"\"")}\"";
                            string user = $"\"{item.KullaniciAdi.Replace("\"", "\"\"")}\"";
                            string perm = $"\"{item.YetkiTuru.Replace("\"", "\"\"")}\"";
                            string inherited = $"\"{item.MirasMi.Replace("\"", "\"\"")}\"";
                            sb.AppendLine($"{path};{user};{perm};{inherited}");
                        }
                        File.WriteAllText(filePath, sb.ToString(), new UTF8Encoding(true)); // BOM ile Türkçe karakter destekli
                    });
                    SendMessageToFrontend("success", "Excel dizine başarıyla kaydedildi.");
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo { FileName = filePath, UseShellExecute = true });
                }
                catch (Exception ex) {
                    SendMessageToFrontend("error", "Excel oluşturulurken hata: " + ex.Message);
                }
            }
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
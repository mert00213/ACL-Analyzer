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
    private const string CMD_ADD_PERMISSION = "addPermission";
    private const string CMD_EDIT_PERMISSION = "editPermission";
    private const string CMD_REMOVE_PERMISSION = "removePermission";

    public Form1()
    {
        Encoding.RegisterProvider(CodePagesEncodingProvider.Instance);
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
            string rawMessage = e.WebMessageAsJson;
            
            if (string.IsNullOrEmpty(rawMessage))
                return;

            // JSON'ı güvenli şekilde parse et — React'ten gelen { command, data } yapısını oku
            using var doc = JsonDocument.Parse(rawMessage);
            var root = doc.RootElement;

            string command = root.TryGetProperty("command", out var cmdProp)
                ? cmdProp.GetString() ?? ""
                : "";

            switch (command)
            {
                case CMD_SCAN_FOLDER:
                case "open_folder_picker":
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
                    break;

                case CMD_ADD_PERMISSION:
                    HandleAddPermission(root);
                    break;

                case CMD_EDIT_PERMISSION:
                    HandleEditPermission(root);
                    break;

                case CMD_REMOVE_PERMISSION:
                    HandleRemovePermission(root);
                    break;

                case CMD_EXPORT_PDF:
                    ExportToPdf();
                    break;

                case CMD_EXPORT_EXCEL:
                    ExportToExcel();
                    break;

                case CMD_EXIT_APP:
                    Application.Exit();
                    break;
            }
        }
        catch (Exception ex)
        {
            SendMessageToFrontend("error", $"Komut işlenirken hata: {ex.Message}");
        }
    }

    // =======================================================================
    // YETKİ EKLEME — addPermission
    // React'ten: { command: "addPermission", data: { path, user, perm } }
    // =======================================================================
    private void HandleAddPermission(JsonElement root)
    {
        try
        {
            if (!root.TryGetProperty("data", out var data))
            {
                SendMessageToFrontend("error", "Yetki ekle: 'data' alanı eksik.");
                return;
            }

            string path = data.GetProperty("path").GetString() ?? "";
            string user = data.GetProperty("user").GetString() ?? "";
            string perm = data.GetProperty("perm").GetString() ?? "ReadAndExecute";

            if (string.IsNullOrWhiteSpace(path) || string.IsNullOrWhiteSpace(user))
            {
                SendMessageToFrontend("error", "Yetki ekle: Klasör yolu veya kullanıcı adı boş olamaz.");
                return;
            }

            _yetkiServisi.YetkiEkle(path, user, perm, "Allow");
            SendMessageToFrontend("success", $"✅ '{user}' kullanıcısına '{perm}' yetkisi başarıyla eklendi.");
        }
        catch (System.Security.Principal.IdentityNotMappedException ex)
        {
            SendMessageToFrontend("error", $"Kullanıcı bulunamadı: '{ex.Message}'. Lütfen geçerli bir kullanıcı adı girin (Örn: DOMAIN\\Kullanici).");
        }
        catch (System.Security.AccessControl.PrivilegeNotHeldException)
        {
            SendMessageToFrontend("error", "Yetki Hatası: Bu işlem için gerekli Windows ayrıcalığına sahip değilsiniz. Uygulamayı Yönetici olarak çalıştırın.");
        }
        catch (UnauthorizedAccessException)
        {
            SendMessageToFrontend("error", "Erişim Reddedildi: Bu klasördeki yetkileri değiştirmek için Yönetici (Administrator) olarak çalıştırmanız gerekiyor.");
        }
        catch (ArgumentException ex)
        {
            SendMessageToFrontend("error", $"Geçersiz parametre: {ex.Message}");
        }
        catch (Exception ex)
        {
            SendMessageToFrontend("error", $"Yetki eklenirken beklenmeyen hata: {ex.GetType().Name} — {ex.Message}");
        }
    }

    // =======================================================================
    // YETKİ DÜZENLEME — editPermission
    // React'ten: { command: "editPermission", data: { path, oldUser, newUser, perm } }
    // Strateji: Eski kullanıcının tüm kurallarını sil → Yeni kullanıcıyla yeni kural ekle
    // =======================================================================
    private void HandleEditPermission(JsonElement root)
    {
        try
        {
            if (!root.TryGetProperty("data", out var data))
            {
                SendMessageToFrontend("error", "Yetki düzenle: 'data' alanı eksik.");
                return;
            }

            string path = data.GetProperty("path").GetString() ?? "";
            string oldUser = data.GetProperty("oldUser").GetString() ?? "";
            string newUser = data.GetProperty("newUser").GetString() ?? "";
            string perm = data.GetProperty("perm").GetString() ?? "ReadAndExecute";

            if (string.IsNullOrWhiteSpace(path) || string.IsNullOrWhiteSpace(oldUser) || string.IsNullOrWhiteSpace(newUser))
            {
                SendMessageToFrontend("error", "Yetki düzenle: Klasör yolu, eski kullanıcı veya yeni kullanıcı adı boş olamaz.");
                return;
            }

            // 1. Eski kullanıcının bu path üzerindeki tüm kurallarını kaldır
            _yetkiServisi.KullanicininTumYetkileriniSil(path, oldUser);

            // 2. Yeni kullanıcıyla yeni yetki ekle
            _yetkiServisi.YetkiEkle(path, newUser, perm, "Allow");

            SendMessageToFrontend("success", $"✅ '{oldUser}' → '{newUser}' olarak güncellendi. Yeni yetki: {perm}");
        }
        catch (System.Security.Principal.IdentityNotMappedException ex)
        {
            SendMessageToFrontend("error", $"Kullanıcı bulunamadı: '{ex.Message}'. Lütfen geçerli bir kullanıcı adı girin.");
        }
        catch (System.Security.AccessControl.PrivilegeNotHeldException)
        {
            SendMessageToFrontend("error", "Yetki Hatası: Bu işlem için gerekli Windows ayrıcalığına sahip değilsiniz. Uygulamayı Yönetici olarak çalıştırın.");
        }
        catch (UnauthorizedAccessException)
        {
            SendMessageToFrontend("error", "Erişim Reddedildi: Bu klasördeki yetkileri değiştirmek için Yönetici (Administrator) olarak çalıştırmanız gerekiyor.");
        }
        catch (ArgumentException ex)
        {
            SendMessageToFrontend("error", $"Geçersiz parametre: {ex.Message}");
        }
        catch (Exception ex)
        {
            SendMessageToFrontend("error", $"Yetki düzenlenirken beklenmeyen hata: {ex.GetType().Name} — {ex.Message}");
        }
    }

    // =======================================================================
    // YETKİ SİLME — removePermission
    // React'ten: { command: "removePermission", data: { path, user } }
    // Kullanıcının o path üzerindeki TÜM yetkilerini siler
    // =======================================================================
    private void HandleRemovePermission(JsonElement root)
    {
        try
        {
            if (!root.TryGetProperty("data", out var data))
            {
                SendMessageToFrontend("error", "Yetki sil: 'data' alanı eksik.");
                return;
            }

            string path = data.GetProperty("path").GetString() ?? "";
            string user = data.GetProperty("user").GetString() ?? "";

            if (string.IsNullOrWhiteSpace(path) || string.IsNullOrWhiteSpace(user))
            {
                SendMessageToFrontend("error", "Yetki sil: Klasör yolu veya kullanıcı adı boş olamaz.");
                return;
            }

            _yetkiServisi.KullanicininTumYetkileriniSil(path, user);
            SendMessageToFrontend("success", $"✅ '{user}' kullanıcısının tüm yetkileri başarıyla silindi.");
        }
        catch (System.Security.AccessControl.PrivilegeNotHeldException)
        {
            SendMessageToFrontend("error", "Yetki Hatası: Bu işlem için gerekli Windows ayrıcalığına sahip değilsiniz. Uygulamayı Yönetici olarak çalıştırın.");
        }
        catch (UnauthorizedAccessException)
        {
            SendMessageToFrontend("error", "Erişim Reddedildi: Bu klasördeki yetkileri değiştirmek için Yönetici (Administrator) olarak çalıştırmanız gerekiyor.");
        }
        catch (InvalidOperationException ex)
        {
            SendMessageToFrontend("error", $"İşlem başarısız: {ex.Message}");
        }
        catch (Exception ex)
        {
            SendMessageToFrontend("error", $"Yetki silinirken beklenmeyen hata: {ex.GetType().Name} — {ex.Message}");
        }
    }

    // =======================================================================
    // CANLI AKIŞ (LIVE STREAMING) MİMARİSİ
    // Eski sistem: Tüm veriyi tara → devasa JSON yap → tek seferde gönder (ÖLÜ ZAMAN!)
    // Yeni sistem: 500'erli paketler halinde canlı canlı React'e akıt (SIFIR BEKLEMESİ!)
    // =======================================================================
    private const int CHUNK_SIZE = 500; // Her paketteki satır sayısı

    private async Task RunOptimizedScan(string folderPath)
    {
        SendMessageToFrontend("status", "🔄 Tarama Başladı. Canlı akış modunda veriler yükleniyor...");

        try
        {
            _tumVeriler = new List<YetkiRaporu>();
            var chunkBuffer = new List<object>(CHUNK_SIZE);

            await Task.Run(() =>
            {
                // Rekürsif tarama — her yetki satırı bulunduğunda buffer'a ekle
                _yetkiServisi.TekilYetkiGetirStreaming(folderPath, (yetkiRaporu) =>
                {
                    // Kalıcı listeye ekle (PDF/Excel export için lazım)
                    _tumVeriler.Add(yetkiRaporu);

                    // Buffer'a React formatında ekle
                    chunkBuffer.Add(new
                    {
                        path = yetkiRaporu.KlasorYolu,
                        user = yetkiRaporu.KullaniciAdi,
                        perm = yetkiRaporu.YetkiTuru,
                        isInherited = yetkiRaporu.MirasMi
                    });

                    // Buffer doldu mu? → 500'lük paketi React'e fırlat!
                    if (chunkBuffer.Count >= CHUNK_SIZE)
                    {
                        var chunkData = new { items = chunkBuffer.ToArray() };
                        string json = JsonSerializer.Serialize(chunkData);
                        
                        // UI thread üzerinden WebView2'ye gönder
                        _webView.Invoke(() => SendMessageToFrontend("scanChunk", json));
                        
                        chunkBuffer.Clear();
                    }
                });
            });

            // Son kalan verileri gönder (500'den az kalmış olabilir)
            if (chunkBuffer.Count > 0)
            {
                var lastChunk = new { items = chunkBuffer.ToArray() };
                string lastJson = JsonSerializer.Serialize(lastChunk);
                SendMessageToFrontend("scanChunk", lastJson);
                chunkBuffer.Clear();
            }

            // Tarama bitti sinyali — React Worker son sıralama + state kilidi açar
            SendMessageToFrontend("scanComplete", JsonSerializer.Serialize(new
            {
                totalFiles = _tumVeriler.Count,
                criticalFound = _tumVeriler.Count(x => x.KullaniciAdi.Contains("Everyone") && x.YetkiTuru.Contains("Full")),
                scanDate = DateTime.Now.ToString("dd.MM.yyyy HH:mm")
            }));
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
                    MessageBox.Show("PDF oluşturulurken bir hata oluştu:\n\n" + ex.Message, "PDF Hatası", MessageBoxButtons.OK, MessageBoxIcon.Error);
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
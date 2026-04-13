using OrtakAlanYetkiKontrol.Services;
using OrtakAlanYetkiKontrol.Models;
using System.Text;
using iTextSharp.text; 
using iTextSharp.text.pdf; 
using PdfFont = iTextSharp.text.Font; 
using WinFont = System.Drawing.Font;

namespace OrtakAlanYetkiKontrol;

public partial class Form1 : Form
{
    private DataGridView _grid = null!;
    private YetkiServisi _yetkiServisi;
    private Label _lblDurum = null!;
    private Label _lblKritikSayi = null!, _lblUyariSayi = null!, _lblToplamSayi = null!;
    private List<YetkiRaporu> _tumVeriler = new();
    
    // Filtreleme için yardımcı değişkenler
    private int _aktifFiltreModu = 0; // 0: Tümü, 1: Kritik, 2: Manuel
    private TextBox _txtAra = null!;
    private List<Button> _filtreButonlari = new();

    public Form1()
    {
        _yetkiServisi = new YetkiServisi();
        InitializeCustomComponents();
    }

    private void InitializeCustomComponents()
    {
        this.Text = "Ern Holding | ACL Analyzer & Security Auditor";
        this.Size = new Size(1300, 850);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.BackColor = Color.FromArgb(245, 246, 250);
        this.Font = new WinFont("Segoe UI", 9);

        Panel pnlHeader = new Panel { Dock = DockStyle.Top, Height = 165, BackColor = Color.White };
        Panel pnlAltCizgi = new Panel { Dock = DockStyle.Bottom, Height = 1, BackColor = Color.FromArgb(220, 221, 225) };
        pnlHeader.Controls.Add(pnlAltCizgi);

        // --- Ana İşlem Butonları ---
        Button btnKlasorSec = CreateActionButton("📁 Derin Analiz Başlat", 25, Color.FromArgb(52, 152, 219));
        btnKlasorSec.Click += BtnKlasorSec_Click;

        Button btnExcel = CreateActionButton("💾 Excel (Ham Veri)", 225, Color.FromArgb(46, 204, 113));
        btnExcel.Click += BtnExcel_Click;

        Button btnPDF = CreateActionButton("📄 Özet Rapor (PDF)", 395, Color.FromArgb(231, 76, 60));
        btnPDF.Click += BtnPDF_Click;

        // --- MODERN SEGMENTED FİLTRE BUTONLARI ---
        Label lblFiltreBaslik = new Label { Text = "Görünüm Modu:", Left = 650, Top = 12, AutoSize = true, ForeColor = Color.Gray, Font = new WinFont("Segoe UI", 8, FontStyle.Bold) };
        
        Button btnTumu = CreateFilterButton("TÜMÜ", 650, 0, Color.FromArgb(44, 62, 80));
        Button btnKritik = CreateFilterButton("KRİTİK", 735, 1, Color.FromArgb(192, 57, 43));
        Button btnManuel = CreateFilterButton("MANUEL", 820, 2, Color.FromArgb(211, 158, 0));

        _filtreButonlari.AddRange(new[] { btnTumu, btnKritik, btnManuel });
        SetFilterButtonStyle(0); // Başlangıçta "Tümü" seçili

        // --- Arama Kutusu ---
        Label lblAra = new Label { Text = "Hızlı Arama (Kullanıcı/Dosya):", Left = 920, Top = 12, AutoSize = true, ForeColor = Color.Gray, Font = new WinFont("Segoe UI", 8, FontStyle.Bold) };
        _txtAra = new TextBox { Left = 920, Top = 30, Width = 320, Height = 35, Font = new WinFont("Segoe UI", 12), BorderStyle = BorderStyle.FixedSingle };
        _txtAra.TextChanged += (s, e) => UygulaFiltreVeArama();

        // --- Sayaçlar ---
        _lblKritikSayi = CreateStatLabel("Kritik Risk: 0", 25, 85, Color.FromArgb(231, 76, 60));
        _lblUyariSayi = CreateStatLabel("Uyarı: 0", 230, 85, Color.FromArgb(241, 196, 15));
        _lblToplamSayi = CreateStatLabel("Toplam Kayıt: 0", 435, 85, Color.FromArgb(44, 62, 80));

        _lblDurum = new Label { Text = "Sistem hazır. 95K+ veri motoru aktif.", Left = 25, Top = 135, AutoSize = true, ForeColor = Color.Gray };

        pnlHeader.Controls.AddRange(new Control[] { btnKlasorSec, btnExcel, btnPDF, lblFiltreBaslik, btnTumu, btnKritik, btnManuel, lblAra, _txtAra, _lblKritikSayi, _lblUyariSayi, _lblToplamSayi, _lblDurum });

        _grid = new DataGridView { 
            Dock = DockStyle.Fill, AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            BackgroundColor = Color.White, BorderStyle = BorderStyle.None,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect, RowHeadersVisible = false,
            RowTemplate = { Height = 40 }, ReadOnly = true
        };
        _grid.ColumnHeadersDefaultCellStyle.BackColor = Color.FromArgb(44, 62, 80);
        _grid.ColumnHeadersDefaultCellStyle.ForeColor = Color.White;
        _grid.EnableHeadersVisualStyles = false;
        _grid.ColumnHeadersHeight = 45;
        _grid.DataBindingComplete += (s, e) => Renklendir();

        this.Controls.Add(_grid);
        this.Controls.Add(pnlHeader);
    }

    // --- YARDIMCI UI METOTLARI ---
    private Button CreateActionButton(string text, int x, Color color) => new Button {
        Text = text, Left = x, Top = 25, Width = 190, Height = 45,
        BackColor = color, ForeColor = Color.White, FlatStyle = FlatStyle.Flat,
        Cursor = Cursors.Hand, Font = new WinFont("Segoe UI", 9, FontStyle.Bold)
    };

    private Button CreateFilterButton(string text, int x, int mode, Color color) {
        Button btn = new Button {
            Text = text, Left = x, Top = 30, Width = 80, Height = 35,
            FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand,
            Font = new WinFont("Segoe UI", 7, FontStyle.Bold), Tag = mode
        };
        btn.Click += (s, e) => {
            _aktifFiltreModu = (int)btn.Tag!;
            SetFilterButtonStyle(_aktifFiltreModu);
            UygulaFiltreVeArama();
        };
        return btn;
    }

    private void SetFilterButtonStyle(int selectedMode) {
        foreach (var btn in _filtreButonlari) {
            int btnMode = (int)btn.Tag!;
            if (btnMode == selectedMode) {
                btn.BackColor = Color.FromArgb(44, 62, 80);
                btn.ForeColor = Color.White;
                btn.FlatAppearance.BorderSize = 2;
            } else {
                btn.BackColor = Color.FromArgb(236, 240, 241);
                btn.ForeColor = Color.Gray;
                btn.FlatAppearance.BorderSize = 0;
            }
        }
    }

    private Label CreateStatLabel(string t, int x, int y, Color c) => new Label { 
        Text = t, Left = x, Top = y, Width = 190, Height = 40, 
        BackColor = c, ForeColor = Color.White, TextAlign = ContentAlignment.MiddleCenter, 
        Font = new WinFont("Segoe UI", 10, FontStyle.Bold) 
    };

    // --- MANTIK METOTLARI ---
    private void UygulaFiltreVeArama() {
        string arama = _txtAra.Text.ToLower();
        var sonuc = _tumVeriler.AsEnumerable();

        if (!string.IsNullOrEmpty(arama))
            sonuc = sonuc.Where(x => x.KullaniciAdi.ToLower().Contains(arama) || x.KlasorYolu.ToLower().Contains(arama));

        if (_aktifFiltreModu == 1) // Kritik
            sonuc = sonuc.Where(x => (x.KullaniciAdi.Contains("Everyone") || x.KullaniciAdi.Contains("Users")) && x.YetkiTuru.Contains("FullControl"));
        else if (_aktifFiltreModu == 2) // Manuel
            sonuc = sonuc.Where(x => x.MirasMi == "Hayır");

        _grid.DataSource = sonuc.ToList();
    }

    private async void BtnKlasorSec_Click(object? sender, EventArgs e) {
        using var fbd = new FolderBrowserDialog();
        if (fbd.ShowDialog() == DialogResult.OK) {
            _lblDurum.Text = "⏳ 95.000+ kayıt analiz ediliyor...";
            _tumVeriler = await Task.Run(() => _yetkiServisi.YetkileriGetir(fbd.SelectedPath));
            UygulaFiltreVeArama();
            _lblDurum.Text = $"📍 Analiz Tamamlandı: {fbd.SelectedPath}";
        }
    }

    private void Renklendir() {
        int k = 0, u = 0;
        foreach (DataGridViewRow row in _grid.Rows) {
            if (row.DataBoundItem is YetkiRaporu r) {
                if ((r.KullaniciAdi.Contains("Everyone") || r.KullaniciAdi.Contains("Users")) && r.YetkiTuru.Contains("FullControl")) {
                    row.DefaultCellStyle.BackColor = Color.FromArgb(231, 76, 60);
                    row.DefaultCellStyle.ForeColor = Color.White;
                    k++;
                } else if (r.MirasMi == "Hayır") {
                    row.DefaultCellStyle.BackColor = Color.FromArgb(255, 234, 167);
                    u++;
                }
            }
        }
        _lblKritikSayi.Text = $"Kritik Risk: {k}";
        _lblUyariSayi.Text = $"Uyarı: {u}";
        _lblToplamSayi.Text = $"Toplam Kayıt: {_grid.Rows.Count}";
    }

    // --- PDF VE EXCEL METOTLARI (Aynı Bırakıldı) ---
    private void BtnPDF_Click(object? sender, EventArgs e) {
        if (_tumVeriler.Count == 0) return;
        using var sfd = new SaveFileDialog { Filter = "PDF|*.pdf", FileName = "ACL_Ozet.pdf" };
        if (sfd.ShowDialog() == DialogResult.OK) {
            try {
                Document doc = new Document(PageSize.A4);
                PdfWriter.GetInstance(doc, new FileStream(sfd.FileName, FileMode.Create));
                doc.Open();
                PdfFont tFont = FontFactory.GetFont("Arial", 16, PdfFont.BOLD);
                doc.Add(new Paragraph("ERN HOLDING ACL RAPORU", tFont));
                doc.Add(new Paragraph($"Kayıt: {_tumVeriler.Count} | Kritik: {_lblKritikSayi.Text}"));
                
                PdfPTable table = new PdfPTable(3) { WidthPercentage = 100 };
                var risks = _tumVeriler.Where(x => (x.KullaniciAdi.Contains("Everyone") || x.KullaniciAdi.Contains("Users")) && x.YetkiTuru.Contains("FullControl")).Take(50);
                foreach (var r in risks) {
                    table.AddCell(new Phrase(r.KlasorYolu, FontFactory.GetFont("Arial", 8)));
                    table.AddCell(new Phrase(r.KullaniciAdi, FontFactory.GetFont("Arial", 8)));
                    table.AddCell(new Phrase(r.YetkiTuru, FontFactory.GetFont("Arial", 8)));
                }
                doc.Add(table);
                doc.Close();
                MessageBox.Show("PDF Hazır!");
            } catch (Exception ex) { MessageBox.Show(ex.Message); }
        }
    }

    private void BtnExcel_Click(object? sender, EventArgs e) {
        if (_tumVeriler.Count == 0) return;
        using var sfd = new SaveFileDialog { Filter = "CSV|*.csv", FileName = "ACL_Detay.csv" };
        if (sfd.ShowDialog() == DialogResult.OK) {
            var csv = new StringBuilder();
            csv.AppendLine("Konum;Kullanici;Yetki;Izin;Miras");
            foreach (var item in _tumVeriler) csv.AppendLine($"{item.KlasorYolu};{item.KullaniciAdi};{item.YetkiTuru};{item.IzinDurumu};{item.MirasMi}");
            File.WriteAllText(sfd.FileName, csv.ToString(), Encoding.UTF8);
            MessageBox.Show("Excel Hazır!");
        }
    }
}
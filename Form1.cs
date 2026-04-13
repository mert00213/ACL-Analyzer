using OrtakAlanYetkiKontrol.Services;
using OrtakAlanYetkiKontrol.Models;
using System.Text;

namespace OrtakAlanYetkiKontrol;

public partial class Form1 : Form
{
    private DataGridView _grid = null!;
    private YetkiServisi _yetkiServisi;
    private Label _lblDurum = null!;
    
    // Sayaçlar için yeni Label tanımları
    private Label _lblKritikSayi = null!;
    private Label _lblUyariSayi = null!;
    private Label _lblToplamSayi = null!;
    
    private List<YetkiRaporu> _tumVeriler = new();

    public Form1()
    {
        _yetkiServisi = new YetkiServisi();
        InitializeCustomComponents();
    }

    private void InitializeCustomComponents()
    {
        // --- Form Ayarları ---
        this.Text = "Ern Holding | ACL Analyzer & Security Auditor";
        this.Size = new Size(1250, 800);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.BackColor = Color.FromArgb(245, 246, 250); 
        this.Font = new Font("Segoe UI", 9);

        // --- Üst Panel (Genişletildi: Height 160) ---
        Panel pnlHeader = new Panel { 
            Dock = DockStyle.Top, 
            Height = 160, 
            BackColor = Color.White 
        };

        // Alt ayırıcı çizgi
        Panel pnlAltCizgi = new Panel { Dock = DockStyle.Bottom, Height = 1, BackColor = Color.FromArgb(220, 221, 225) };
        pnlHeader.Controls.Add(pnlAltCizgi);

        // 📁 Analiz Butonu
        Button btnKlasorSec = new Button { 
            Text = "📁 Klasörü Analiz Et", 
            Left = 25, Top = 20, Width = 190, Height = 45,
            BackColor = Color.FromArgb(52, 152, 219), ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand,
            Font = new Font("Segoe UI", 10, FontStyle.Bold)
        };
        btnKlasorSec.FlatAppearance.BorderSize = 0;
        btnKlasorSec.Click += BtnKlasorSec_Click;

        // 💾 Excel Butonu
        Button btnExcel = new Button { 
            Text = "💾 Raporu İndir (CSV)", 
            Left = 225, Top = 20, Width = 190, Height = 45,
            BackColor = Color.FromArgb(46, 204, 113), ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand,
            Font = new Font("Segoe UI", 10, FontStyle.Bold)
        };
        btnExcel.FlatAppearance.BorderSize = 0;
        btnExcel.Click += BtnExcel_Click;

        // 🔍 Arama Kutusu
        Label lblAra = new Label { Text = "Hızlı Filtreleme", Left = 920, Top = 15, AutoSize = true, ForeColor = Color.Gray };
        TextBox txtAra = new TextBox { 
            Left = 920, Top = 35, Width = 280, 
            Font = new Font("Segoe UI", 12),
            BorderStyle = BorderStyle.FixedSingle 
        };
        txtAra.TextChanged += (s, e) => {
            string aramaMetni = txtAra.Text.ToLower();
            var filtrelenmis = _tumVeriler.Where(x => 
                x.KullaniciAdi.ToLower().Contains(aramaMetni) || 
                x.YetkiTuru.ToLower().Contains(aramaMetni)
            ).ToList();
            _grid.DataSource = filtrelenmis;
            Renklendir();
        };

        // --- İSTATİSTİK KARTLARI ---
        _lblKritikSayi = CreateStatLabel("Kritik Risk: 0", 25, 80, Color.FromArgb(231, 76, 60));
        _lblUyariSayi = CreateStatLabel("Uyarı: 0", 230, 80, Color.FromArgb(241, 196, 15)); // Sarı (Amber)
        _lblToplamSayi = CreateStatLabel("Toplam Kayıt: 0", 435, 80, Color.FromArgb(44, 62, 80)); // Koyu Lacivert

        _lblDurum = new Label { 
            Text = "Sistem hazır. Lütfen bir hedef klasör seçin...", 
            Left = 25, Top = 130, AutoSize = true, 
            ForeColor = Color.FromArgb(127, 140, 141),
            Font = new Font("Segoe UI", 9, FontStyle.Italic)
        };

        pnlHeader.Controls.AddRange(new Control[] { btnKlasorSec, btnExcel, lblAra, txtAra, _lblKritikSayi, _lblUyariSayi, _lblToplamSayi, _lblDurum });

        // --- DataGridView ---
        _grid = new DataGridView { 
            Dock = DockStyle.Fill, 
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            BackgroundColor = Color.White,
            BorderStyle = BorderStyle.None,
            CellBorderStyle = DataGridViewCellBorderStyle.SingleHorizontal,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            RowHeadersVisible = false,
            RowTemplate = { Height = 40 },
            ReadOnly = true,
            EditMode = DataGridViewEditMode.EditProgrammatically
        };
        _grid.ColumnHeadersDefaultCellStyle.BackColor = Color.FromArgb(44, 62, 80);
        _grid.ColumnHeadersDefaultCellStyle.ForeColor = Color.White;
        _grid.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 10, FontStyle.Bold);
        _grid.EnableHeadersVisualStyles = false;
        _grid.ColumnHeadersHeight = 45;

        _grid.DataBindingComplete += (s, e) => Renklendir();

        this.Controls.Add(_grid);
        this.Controls.Add(pnlHeader);
    }

    // Sayaç kutucuklarını oluşturan yardımcı metot
    private Label CreateStatLabel(string text, int x, int y, Color color)
    {
        return new Label {
            Text = text,
            Left = x, Top = y,
            Width = 190, Height = 40,
            BackColor = color, ForeColor = Color.White,
            TextAlign = ContentAlignment.MiddleCenter,
            Font = new Font("Segoe UI", 10, FontStyle.Bold)
        };
    }

    private void BtnKlasorSec_Click(object? sender, EventArgs e)
    {
        using var fbd = new FolderBrowserDialog();
        if (fbd.ShowDialog() == DialogResult.OK)
        {
            _lblDurum.Text = $"📍 Analiz Edilen: {fbd.SelectedPath}";
            _tumVeriler = _yetkiServisi.YetkileriGetir(fbd.SelectedPath);
            _grid.DataSource = null;
            _grid.DataSource = _tumVeriler;
        }
    }

    private void Renklendir()
    {
        int kritikCount = 0;
        int uyariCount = 0;

        foreach (DataGridViewRow row in _grid.Rows)
        {
            if (row.DataBoundItem is YetkiRaporu rapor)
            {
                if ((rapor.KullaniciAdi.Contains("Everyone") || rapor.KullaniciAdi.Contains("Users")) && rapor.YetkiTuru.Contains("FullControl"))
                {
                    row.DefaultCellStyle.BackColor = Color.FromArgb(231, 76, 60);
                    row.DefaultCellStyle.ForeColor = Color.White;
                    row.DefaultCellStyle.SelectionBackColor = Color.FromArgb(192, 57, 43);
                    kritikCount++;
                }
                else if (rapor.MirasMi == "Hayır")
                {
                    row.DefaultCellStyle.BackColor = Color.FromArgb(255, 234, 167);
                    row.DefaultCellStyle.ForeColor = Color.Black;
                    row.DefaultCellStyle.SelectionBackColor = Color.FromArgb(253, 203, 110);
                    uyariCount++;
                }
                else
                {
                    row.DefaultCellStyle.BackColor = Color.White;
                    row.DefaultCellStyle.SelectionBackColor = Color.FromArgb(52, 152, 219);
                }
            }
        }

        // Sayaçları güncelle
        _lblKritikSayi.Text = $"Kritik Risk: {kritikCount}";
        _lblUyariSayi.Text = $"Uyarı: {uyariCount}";
        _lblToplamSayi.Text = $"Toplam Kayıt: {_grid.Rows.Count}";
    }

    private void BtnExcel_Click(object? sender, EventArgs e)
    {
        if (_tumVeriler.Count == 0) return;
        using var sfd = new SaveFileDialog { Filter = "CSV Dosyası (*.csv)|*.csv", FileName = $"ACL_Rapor_{DateTime.Now:yyyyMMdd_HHmm}.csv" };
        if (sfd.ShowDialog() == DialogResult.OK)
        {
            var csv = new StringBuilder();
            csv.AppendLine("Klasor Yolu;Kullanici Adi;Yetki Turu;Izin Durumu;Miras Mi");
            foreach (var item in _tumVeriler)
                csv.AppendLine($"{item.KlasorYolu};{item.KullaniciAdi};{item.YetkiTuru};{item.IzinDurumu};{item.MirasMi}");
            File.WriteAllText(sfd.FileName, csv.ToString(), Encoding.UTF8);
            MessageBox.Show("Rapor kaydedildi!", "Başarılı");
        }
    }
}
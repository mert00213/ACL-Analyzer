using OrtakAlanYetkiKontrol.Services;
using OrtakAlanYetkiKontrol.Models;
using System.Text; // CSV (Excel) kaydı için gerekli

namespace OrtakAlanYetkiKontrol;

public partial class Form1 : Form
{
    private DataGridView _grid;
    private YetkiServisi _yetkiServisi;
    private Label _lblDurum;
    private List<YetkiRaporu> _tumVeriler = new(); // Filtreleme için tüm verileri burada tutacağız

    public Form1()
    {
        _yetkiServisi = new YetkiServisi();
        InitializeCustomComponents();
    }

    private void InitializeCustomComponents()
    {
        this.Text = "Ern Holding - Ortak Alan Yetki Analizörü";
        this.Size = new Size(1100, 700);
        this.StartPosition = FormStartPosition.CenterScreen;

        // Üst Panel
        Panel pnlUst = new Panel { Dock = DockStyle.Top, Height = 100, BackColor = Color.FromArgb(240, 240, 240) };

        // 1. Klasör Seçme Butonu
        Button btnKlasorSec = new Button { 
            Text = "📁 Klasör Tara", 
            Left = 20, Top = 20, Width = 150, Height = 45,
            BackColor = Color.FromArgb(0, 122, 204), ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat, Font = new Font("Segoe UI", 10, FontStyle.Bold)
        };
        btnKlasorSec.Click += BtnKlasorSec_Click;

        // 2. Excel (CSV) Butonu
        Button btnExcel = new Button { 
            Text = "📊 Excel'e Aktar (CSV)", 
            Left = 180, Top = 20, Width = 180, Height = 45,
            BackColor = Color.FromArgb(33, 115, 70), ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat, Font = new Font("Segoe UI", 10, FontStyle.Bold)
        };
        btnExcel.Click += BtnExcel_Click;

        // 3. Arama Kutusu (Filtreleme)
        Label lblAra = new Label { Text = "🔍 Kullanıcı Ara:", Left = 700, Top = 35, AutoSize = true };
        TextBox txtAra = new TextBox { Left = 800, Top = 32, Width = 250, Font = new Font("Segoe UI", 11) };
        txtAra.TextChanged += (s, e) => {
            string aramaMetni = txtAra.Text.ToLower();
            var filtrelenmis = _tumVeriler.Where(x => 
                x.KullaniciAdi.ToLower().Contains(aramaMetni) || 
                x.YetkiTuru.ToLower().Contains(aramaMetni)
            ).ToList();
            _grid.DataSource = filtrelenmis;
        };

        _lblDurum = new Label { 
            Text = "Lütfen bir klasör seçin...", 
            Left = 20, Top = 75, AutoSize = true, 
            Font = new Font("Segoe UI", 9, FontStyle.Italic) 
        };

        pnlUst.Controls.Add(btnKlasorSec);
        pnlUst.Controls.Add(btnExcel);
        pnlUst.Controls.Add(lblAra);
        pnlUst.Controls.Add(txtAra);
        pnlUst.Controls.Add(_lblDurum);

        // Tablo
        _grid = new DataGridView { 
            Dock = DockStyle.Fill, 
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            BackgroundColor = Color.White,
            ReadOnly = true,
            AllowUserToAddRows = false,
            RowHeadersVisible = false,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect
        };

        this.Controls.Add(_grid);
        this.Controls.Add(pnlUst);
    }

    private void BtnKlasorSec_Click(object? sender, EventArgs e)
    {
        using var fbd = new FolderBrowserDialog();
        if (fbd.ShowDialog() == DialogResult.OK)
        {
            _lblDurum.Text = $"Taranan Yol: {fbd.SelectedPath}";
            _tumVeriler = _yetkiServisi.YetkileriGetir(fbd.SelectedPath);
            _grid.DataSource = _tumVeriler;
        }
    }

    // --- Excel (CSV) Aktarma Metodu ---
    private void BtnExcel_Click(object? sender, EventArgs e)
    {
        if (_tumVeriler.Count == 0) {
            MessageBox.Show("Önce bir tarama yapmalısınız!", "Uyarı", MessageBoxButtons.OK, MessageBoxIcon.Warning);
            return;
        }

        using var sfd = new SaveFileDialog();
        sfd.Filter = "CSV Dosyası (*.csv)|*.csv";
        sfd.FileName = "Yetki_Raporu_" + DateTime.Now.ToString("yyyyMMdd_HHmm") + ".csv";

        if (sfd.ShowDialog() == DialogResult.OK)
        {
            var csv = new StringBuilder();
            // Başlık satırı (Excel'in düzgün okuması için en başa bir kod ekliyoruz)
            csv.AppendLine("Klasor Yolu;Kullanici Adi;Yetki Turu;Izin Durumu;Miras Mi");

            foreach (var item in _tumVeriler)
            {
                csv.AppendLine($"{item.KlasorYolu};{item.KullaniciAdi};{item.YetkiTuru};{item.IzinDurumu};{item.MirasMi}");
            }

            File.WriteAllText(sfd.FileName, csv.ToString(), Encoding.UTF8);
            MessageBox.Show("Rapor başarıyla kaydedildi!", "Başarılı", MessageBoxButtons.OK, MessageBoxIcon.Information);
        }
    }
}
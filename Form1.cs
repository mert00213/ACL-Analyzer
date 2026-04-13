using OrtakAlanYetkiKontrol.Services;
using OrtakAlanYetkiKontrol.Models;
using System.Text;

namespace OrtakAlanYetkiKontrol;

public partial class Form1 : Form
{
    private DataGridView _grid = null!;
    private YetkiServisi _yetkiServisi;
    private Label _lblDurum = null!;
    private List<YetkiRaporu> _tumVeriler = new();

    public Form1()
    {
        _yetkiServisi = new YetkiServisi();
        InitializeCustomComponents();
    }

    private void InitializeCustomComponents()
    {
        this.Text = "Ern Holding | ACL Analyzer & Security Auditor";
        this.Size = new Size(1200, 750);
        this.StartPosition = FormStartPosition.CenterScreen;
        this.BackColor = Color.FromArgb(245, 246, 250); 
        this.Font = new Font("Segoe UI", 9);

        Panel pnlHeader = new Panel { 
            Dock = DockStyle.Top, 
            Height = 110, 
            BackColor = Color.White,
            BorderStyle = BorderStyle.None 
        };

        Panel pnlAltCizgi = new Panel { Dock = DockStyle.Bottom, Height = 1, BackColor = Color.FromArgb(220, 221, 225) };
        pnlHeader.Controls.Add(pnlAltCizgi);

        Button btnKlasorSec = new Button { 
            Text = "📁 Klasörü Analiz Et", 
            Left = 25, Top = 20, Width = 190, Height = 45,
            BackColor = Color.FromArgb(52, 152, 219), ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand,
            Font = new Font("Segoe UI", 10, FontStyle.Bold)
        };
        btnKlasorSec.FlatAppearance.BorderSize = 0;
        btnKlasorSec.Click += BtnKlasorSec_Click;

        Button btnExcel = new Button { 
            Text = "💾 Raporu İndir (CSV)", 
            Left = 225, Top = 20, Width = 190, Height = 45,
            BackColor = Color.FromArgb(46, 204, 113), ForeColor = Color.White,
            FlatStyle = FlatStyle.Flat, Cursor = Cursors.Hand,
            Font = new Font("Segoe UI", 10, FontStyle.Bold)
        };
        btnExcel.FlatAppearance.BorderSize = 0;
        btnExcel.Click += BtnExcel_Click;

        Label lblAra = new Label { Text = "Hızlı Filtreleme", Left = 860, Top = 15, AutoSize = true, ForeColor = Color.Gray };
        TextBox txtAra = new TextBox { 
            Left = 860, Top = 35, Width = 280, 
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

        _lblDurum = new Label { 
            Text = "Sistem hazır. Lütfen bir hedef klasör seçin...", 
            Left = 25, Top = 75, AutoSize = true, 
            ForeColor = Color.FromArgb(127, 140, 141),
            Font = new Font("Segoe UI", 9, FontStyle.Italic)
        };

        pnlHeader.Controls.Add(btnKlasorSec);
        pnlHeader.Controls.Add(btnExcel);
        pnlHeader.Controls.Add(lblAra);
        pnlHeader.Controls.Add(txtAra);
        pnlHeader.Controls.Add(_lblDurum);

        _grid = new DataGridView { 
            Dock = DockStyle.Fill, 
            AutoSizeColumnsMode = DataGridViewAutoSizeColumnsMode.Fill,
            BackgroundColor = Color.White,
            BorderStyle = BorderStyle.None,
            CellBorderStyle = DataGridViewCellBorderStyle.SingleHorizontal,
            ColumnHeadersBorderStyle = DataGridViewHeaderBorderStyle.None,
            EnableHeadersVisualStyles = false,
            SelectionMode = DataGridViewSelectionMode.FullRowSelect,
            RowHeadersVisible = false,
            RowTemplate = { Height = 40 },
            GridColor = Color.FromArgb(236, 240, 241),
            // --- KRİTİK AYARLAR BURADA ---
            ReadOnly = true, // Düzenlemeyi kapatır
            AllowUserToResizeRows = false,
            EditMode = DataGridViewEditMode.EditProgrammatically // Çift tıklama ile yazı yazmayı engeller
        };

        _grid.ColumnHeadersDefaultCellStyle.BackColor = Color.FromArgb(44, 62, 80);
        _grid.ColumnHeadersDefaultCellStyle.ForeColor = Color.White;
        _grid.ColumnHeadersDefaultCellStyle.Font = new Font("Segoe UI", 10, FontStyle.Bold);
        _grid.ColumnHeadersHeight = 45;

        _grid.DataBindingComplete += (s, e) => Renklendir();

        this.Controls.Add(_grid);
        this.Controls.Add(pnlHeader);
    }

    private void BtnKlasorSec_Click(object? sender, EventArgs e)
    {
        using var fbd = new FolderBrowserDialog();
        if (fbd.ShowDialog() == DialogResult.OK)
        {
            _lblDurum.Text = $"📍 Analiz Edilen Konum: {fbd.SelectedPath}";
            _lblDurum.ForeColor = Color.FromArgb(44, 62, 80);
            _tumVeriler = _yetkiServisi.YetkileriGetir(fbd.SelectedPath);
            _grid.DataSource = null;
            _grid.DataSource = _tumVeriler;
        }
    }

    private void Renklendir()
    {
        foreach (DataGridViewRow row in _grid.Rows)
        {
            if (row.DataBoundItem is YetkiRaporu rapor)
            {
                if ((rapor.KullaniciAdi.Contains("Everyone") || rapor.KullaniciAdi.Contains("Users")) 
                    && rapor.YetkiTuru.Contains("FullControl"))
                {
                    row.DefaultCellStyle.BackColor = Color.FromArgb(231, 76, 60);
                    row.DefaultCellStyle.ForeColor = Color.White;
                    row.DefaultCellStyle.SelectionBackColor = Color.FromArgb(192, 57, 43);
                    row.DefaultCellStyle.SelectionForeColor = Color.White;
                }
                else if (rapor.MirasMi == "Hayır")
                {
                    row.DefaultCellStyle.BackColor = Color.FromArgb(255, 234, 167);
                    row.DefaultCellStyle.ForeColor = Color.Black;
                    row.DefaultCellStyle.SelectionBackColor = Color.FromArgb(253, 203, 110);
                    row.DefaultCellStyle.SelectionForeColor = Color.Black;
                }
                else
                {
                    row.DefaultCellStyle.BackColor = Color.White;
                    row.DefaultCellStyle.SelectionBackColor = Color.FromArgb(52, 152, 219);
                    row.DefaultCellStyle.SelectionForeColor = Color.White;
                }
            }
        }
    }

    private void BtnExcel_Click(object? sender, EventArgs e)
    {
        if (_tumVeriler.Count == 0) return;

        using var sfd = new SaveFileDialog { 
            Filter = "CSV Dosyası (*.csv)|*.csv", 
            FileName = $"ACL_Rapor_{DateTime.Now:yyyyMMdd_HHmm}.csv" 
        };

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
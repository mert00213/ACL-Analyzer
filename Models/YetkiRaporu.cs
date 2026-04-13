namespace OrtakAlanYetkiKontrol.Models;

public class YetkiRaporu
{
    public string KlasorYolu { get; set; } = string.Empty;
    public string KullaniciAdi { get; set; } = string.Empty;
    public string YetkiTuru { get; set; } = string.Empty; // FullControl, Read, Write vb.
    public string IzinDurumu { get; set; } = string.Empty; // Allow veya Deny
    public string MirasMi { get; set; } = string.Empty; // Üst klasörden mi geliyor?
}
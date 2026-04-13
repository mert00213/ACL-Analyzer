using System.Security.AccessControl;
using System.Security.Principal;
using OrtakAlanYetkiKontrol.Models;

namespace OrtakAlanYetkiKontrol.Services;

public class YetkiServisi
{
    public List<YetkiRaporu> YetkileriGetir(string anaYol)
    {
        var yetkiListesi = new List<YetkiRaporu>();
        DerinlemesineTara(anaYol, yetkiListesi);
        return yetkiListesi;
    }

    private void DerinlemesineTara(string mevcutYol, List<YetkiRaporu> liste)
    {
        try
        {
            // 1. Mevcut KLASÖRÜN yetkilerini tara
            DiziniVeyaDosyayiTara(mevcutYol, liste, true);

            // 2. Klasör içindeki DOSYALARI tara
            try
            {
                string[] dosyalar = Directory.GetFiles(mevcutYol);
                foreach (string dosyaYolu in dosyalar)
                {
                    DiziniVeyaDosyayiTara(dosyaYolu, liste, false);
                }
            }
            catch (UnauthorizedAccessException) { } // Dosya okuma izni yoksa geç

            // 3. ALT KLASÖRLERİ bul ve içeri gir (Recursive)
            string[] altKlasorler = Directory.GetDirectories(mevcutYol);
            foreach (string altYol in altKlasorler)
            {
                DerinlemesineTara(altYol, liste);
            }
        }
        catch (UnauthorizedAccessException) { } // Klasör listeleme izni yoksa geç
        catch (Exception) { }
    }

    private void DiziniVeyaDosyayiTara(string yol, List<YetkiRaporu> liste, bool klasorMu)
    {
        try
        {
            FileSystemSecurity security;
            if (klasorMu)
                security = new DirectoryInfo(yol).GetAccessControl();
            else
                security = new FileInfo(yol).GetAccessControl();

            var rules = security.GetAccessRules(true, true, typeof(NTAccount));

            foreach (FileSystemAccessRule rule in rules)
            {
                liste.Add(new YetkiRaporu
                {
                    // Dosyaları ayırt etmek için başına [F] (File) koyuyoruz
                    KlasorYolu = klasorMu ? yol : "[DOSYA] " + Path.GetFileName(yol),
                    KullaniciAdi = rule.IdentityReference.Value,
                    YetkiTuru = rule.FileSystemRights.ToString(),
                    IzinDurumu = rule.AccessControlType.ToString(),
                    MirasMi = rule.IsInherited ? "Evet" : "Hayır"
                });
            }
        }
        catch { }
    }
}
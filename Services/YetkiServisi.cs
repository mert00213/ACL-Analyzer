using System.Security.AccessControl;
using System.Security.Principal;
using System.IO;
using OrtakAlanYetkiKontrol.Models;

namespace OrtakAlanYetkiKontrol.Services;

public class YetkiServisi
{
    // --- 1. OKUMA İŞLEMLERİ (Mevcut Sistem) ---

    // Eski sistem: Tüm alt klasörleri tarar
    public List<YetkiRaporu> YetkileriGetir(string anaYol)
    {
        var yetkiListesi = new List<YetkiRaporu>();
        DerinlemesineTara(anaYol, yetkiListesi);
        return yetkiListesi;
    }

    // Yeni Sistem: Sadece tıklanan klasörün yetkisini anında getirir
    public List<YetkiRaporu> TekilYetkiGetir(string yol)
    {
        var liste = new List<YetkiRaporu>();
        bool klasorMu = Directory.Exists(yol);
        DiziniVeyaDosyayiTara(yol, liste, klasorMu);
        return liste;
    }

    private void DerinlemesineTara(string mevcutYol, List<YetkiRaporu> liste)
    {
        try
        {
            DiziniVeyaDosyayiTara(mevcutYol, liste, true);

            try
            {
                string[] dosyalar = Directory.GetFiles(mevcutYol);
                foreach (string dosyaYolu in dosyalar)
                {
                    DiziniVeyaDosyayiTara(dosyaYolu, liste, false);
                }
            }
            catch (UnauthorizedAccessException) { } 

            string[] altKlasorler = Directory.GetDirectories(mevcutYol);
            foreach (string altYol in altKlasorler)
            {
                DerinlemesineTara(altYol, liste);
            }
        }
        catch (UnauthorizedAccessException) { } 
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

    // --- 2. YAZMA VE SİLME İŞLEMLERİ (Yeni Özellikler) ---

    /// <summary>
    /// Belirtilen klasöre veya dosyaya yeni bir yetki kuralı ekler.
    /// </summary>
    public void YetkiEkle(string yol, string kullanici, string yetkiTuruStr, string izinDurumuStr)
    {
        // String olarak gelen verileri Windows Enum yapılarına çevir
        FileSystemRights yetki = Enum.Parse<FileSystemRights>(yetkiTuruStr);
        AccessControlType tip = Enum.Parse<AccessControlType>(izinDurumuStr);

        bool klasorMu = Directory.Exists(yol);
        if (klasorMu)
        {
            var dInfo = new DirectoryInfo(yol);
            var security = dInfo.GetAccessControl();
            // Klasörler için miras (Inheritance) kurallarını belirliyoruz ki alt dosyalara da geçsin
            var rule = new FileSystemAccessRule(kullanici, yetki, InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, tip);
            security.AddAccessRule(rule);
            dInfo.SetAccessControl(security);
        }
        else if (File.Exists(yol))
        {
            var fInfo = new FileInfo(yol);
            var security = fInfo.GetAccessControl();
            var rule = new FileSystemAccessRule(kullanici, yetki, tip);
            security.AddAccessRule(rule);
            fInfo.SetAccessControl(security);
        }
    }

    /// <summary>
    /// Belirtilen klasörden veya dosyadan mevcut bir yetkiyi siler.
    /// Not: Sadece manuel eklenen (Miras alınmayan) yetkiler silinebilir.
    /// </summary>
    public void YetkiSil(string yol, string kullanici, string yetkiTuruStr, string izinDurumuStr)
    {
        // Tablodan gelen string verileri Enum'a çevir
        FileSystemRights yetki = Enum.Parse<FileSystemRights>(yetkiTuruStr);
        AccessControlType tip = Enum.Parse<AccessControlType>(izinDurumuStr);

        bool klasorMu = Directory.Exists(yol);
        if (klasorMu)
        {
            var dInfo = new DirectoryInfo(yol);
            var security = dInfo.GetAccessControl();
            // Silerken de aynı miras parametrelerini vermek zorundayız ki doğru kuralı bulup silsin
            var rule = new FileSystemAccessRule(kullanici, yetki, InheritanceFlags.ContainerInherit | InheritanceFlags.ObjectInherit, PropagationFlags.None, tip);
            security.RemoveAccessRule(rule);
            dInfo.SetAccessControl(security);
        }
        else if (File.Exists(yol))
        {
            var fInfo = new FileInfo(yol);
            var security = fInfo.GetAccessControl();
            var rule = new FileSystemAccessRule(kullanici, yetki, tip);
            security.RemoveAccessRule(rule);
            fInfo.SetAccessControl(security);
        }
    }
}
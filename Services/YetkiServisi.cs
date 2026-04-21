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

    // Yeni Sistem: Tıklanan klasörün ve alt klasörlerinin yetkisini güvenle getirir
    public List<YetkiRaporu> TekilYetkiGetir(string yol)
    {
        var liste = new List<YetkiRaporu>();
        bool klasorMu = Directory.Exists(yol);
        
        // 1. Ana klasörün kendisini (veya tekil dosyayı) okur
        DiziniVeyaDosyayiTara(yol, liste, klasorMu);

        // 2. Alt klasörleri güvenli bir şekilde tarar
        if (klasorMu)
        {
            GuvenliAltKlasorTara(yol, liste);
        }

        return liste;
    }

    // =======================================================================
    // CANLI AKIŞ (STREAMING) VERSİYONU
    // Her yetki satırı bulunduğunda callback tetiklenir → Form1 buffer'a ekler
    // Buffer 500'e ulaşınca chunk olarak React'e fırlatılır
    // =======================================================================
    public void TekilYetkiGetirStreaming(string yol, Action<YetkiRaporu> onItemFound)
    {
        bool klasorMu = Directory.Exists(yol);

        // 1. Ana klasörün kendisini tara, bulunan her yetki için callback tetikle
        StreamDiziniVeyaDosyayiTara(yol, onItemFound, klasorMu);

        // 2. Alt klasörleri rekürsif olarak güvenle akıt
        if (klasorMu)
        {
            GuvenliAltKlasorTaraStreaming(yol, onItemFound);
        }
    }

    /// <summary>
    /// Alt klasörleri rekürsif tarar. Her yetki satırı bulunduğunda callback tetiklenir.
    /// Erişim izni olmayan klasörler sessizce atlanır.
    /// </summary>
    private void GuvenliAltKlasorTaraStreaming(string mevcutYol, Action<YetkiRaporu> onItemFound)
    {
        try
        {
            string[] altKlasorler = Directory.GetDirectories(mevcutYol);

            foreach (string altYol in altKlasorler)
            {
                StreamDiziniVeyaDosyayiTara(altYol, onItemFound, true);
                GuvenliAltKlasorTaraStreaming(altYol, onItemFound);
            }
        }
        catch (UnauthorizedAccessException) { }
        catch (Exception) { }
    }

    /// <summary>
    /// Tek bir dizin veya dosyanın yetkilerini okur ve her biri için callback tetikler.
    /// </summary>
    private void StreamDiziniVeyaDosyayiTara(string yol, Action<YetkiRaporu> onItemFound, bool klasorMu)
    {
        try
        {
            System.Security.AccessControl.FileSystemSecurity security;
            if (klasorMu)
                security = new DirectoryInfo(yol).GetAccessControl();
            else
                security = new FileInfo(yol).GetAccessControl();

            var rules = security.GetAccessRules(true, true, typeof(System.Security.Principal.NTAccount));

            foreach (System.Security.AccessControl.FileSystemAccessRule rule in rules)
            {
                onItemFound(new YetkiRaporu
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

    /// <summary>
    /// SearchOption.AllDirectories kullanımı erişim olmayan klasörlerde (UnauthorizedAccessException) 
    /// tüm taramayı durduracağı için, bu işlemi manuel recursive ve try-catch bloklarıyla yapıyoruz.
    /// Böylece ulaşılamayan bir klasör olduğunda sadece o klasör atlanır, tarama devam eder.
    /// </summary>
    private void GuvenliAltKlasorTara(string mevcutYol, List<YetkiRaporu> liste)
    {
        try
        {
            // Sadece bu seviyedeki klasörleri alır
            string[] altKlasorler = Directory.GetDirectories(mevcutYol);
            
            foreach (string altYol in altKlasorler)
            {
                // Alt klasörün yetkisini oku
                DiziniVeyaDosyayiTara(altYol, liste, true);
                
                // İçeriye doğru rekürsif olarak devam et
                GuvenliAltKlasorTara(altYol, liste);
            }
        }
        catch (UnauthorizedAccessException) 
        { 
            // Erişim izni olmayan klasörü atla, sistemi çökertme
        }
        catch (Exception) 
        { 
            // Diğer disk okuma hatalarını atla
        }
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
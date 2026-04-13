using System.Security.AccessControl;
using System.Security.Principal;
using OrtakAlanYetkiKontrol.Models;

namespace OrtakAlanYetkiKontrol.Services;

public class YetkiServisi
{
    public List<YetkiRaporu> YetkileriGetir(string yol)
    {
        var yetkiListesi = new List<YetkiRaporu>();

        try
        {
            DirectoryInfo dInfo = new DirectoryInfo(yol);
            // Klasörün güvenlik bilgilerini oku
            DirectorySecurity dSecurity = dInfo.GetAccessControl();
            
            // Erişim kurallarını (ACL) listele
            AuthorizationRuleCollection rules = dSecurity.GetAccessRules(true, true, typeof(NTAccount));

            foreach (FileSystemAccessRule rule in rules)
            {
                yetkiListesi.Add(new YetkiRaporu
                {
                    KlasorYolu = yol,
                    KullaniciAdi = rule.IdentityReference.Value,
                    YetkiTuru = rule.FileSystemRights.ToString(),
                    IzinDurumu = rule.AccessControlType.ToString(),
                    MirasMi = rule.IsInherited ? "Evet" : "Hayır"
                });
            }
        }
        catch (Exception ex)
        {
            // Erişim engellendiğinde veya hata oluştuğunda listeye hata notu ekle
            yetkiListesi.Add(new YetkiRaporu 
            { 
                KullaniciAdi = "HATA / ERİŞİM YOK", 
                YetkiTuru = ex.Message 
            });
        }

        return yetkiListesi;
    }
}
# 🛡️ Ortak Alan Yetki Analizörü (ACL Reporter)

Sistem yöneticileri ve IT departmanları için geliştirilmiş, Windows ortak ağ sürücülerindeki klasör izinlerini (Access Control List) analiz eden ve raporlayan hafif (standalone) bir masaüstü aracıdır.

## 🚀 Özellikler
- **Gerçek Zamanlı Analiz:** Seçilen klasörün tüm NTFS izinlerini saniyeler içinde listeler.
- **Miras Denetimi:** Yetkinin doğrudan mı yoksa üst klasörden miras yoluyla mı geldiğini gösterir.
- **Anlık Filtreleme:** Kullanıcı adı veya yetki türüne göre hızlı arama.
- **Excel Raporlama:** Çekilen yetki listesini CSV formatında dışa aktararak kurumsal raporlama sağlar.

## 🛠️ Teknolojiler
- **Runtime:** .NET 8.0 (Core)
- **UI:** Windows Forms
- **Library:** System.IO.FileSystem.AccessControl
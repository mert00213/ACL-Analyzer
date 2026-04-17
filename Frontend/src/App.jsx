import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ProjectCard from './components/ProjectCard'
import WeeklySummary from './components/WeeklySummary'
import './App.css'

function App() {
  // C# tarafındandan gelen verileri tutacak state
  const [scanData, setScanData] = useState({
    totalFiles: 0,
    criticalFound: 0,
    scanDate: '-',
    details: [] // TABLO İÇİN GEREKEN VERİ BURADA!
  });

  useEffect(() => {
    const handleBackendMessage = (event) => {
      const { type, data } = event.detail;

      if (type === 'scanComplete') {
        const parsedData = JSON.parse(data);
        setScanData(parsedData);
        console.log("Tarama Başarıyla Tamamlandı:", parsedData);
        console.log("Gelen Veri Detayı (Details):", parsedData.details);
        console.log("Detay Sayısı:", parsedData.details?.length || 0);
      } else if (type === 'error') {
        alert("Bir Hata Oluştu: " + data);
      } else if (type === 'status') {
        console.log("Sistem Durumu:", data);
      }
    };

    window.addEventListener('backendMessage', handleBackendMessage);
    return () => window.removeEventListener('backendMessage', handleBackendMessage);
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-auto">
        <Header />

        <div className="p-8 flex-1 overflow-auto">
          {/* ÜST KISIM: 3 ADET ÖZET KARTI */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <ProjectCard
              title="Taranan Klasörler"
              badge="AKTİF"
              badgeColor="green"
              progress={scanData.totalFiles > 0 ? 100 : 0}
              stats={[
                { label: 'Toplam Nesne', value: scanData.totalFiles.toLocaleString() },
                { label: 'Son Tarama', value: scanData.scanDate },
              ]}
              statusColor="green"
            />
            <ProjectCard
              title="Riskli Yetkiler"
              badge={scanData.criticalFound > 0 ? "RİSKLİ" : "TEMİZ"}
              badgeColor={scanData.criticalFound > 0 ? "red" : "gray"}
              progress={scanData.criticalFound > 0 ? 100 : 0}
              stats={[
                { label: 'Kritik Sorunlar', value: scanData.criticalFound },
              ]}
              blocked={scanData.criticalFound > 0}
              statusColor={scanData.criticalFound > 0 ? "red" : "blue"}
            />
            <WeeklySummary data={scanData} />
          </div>

          {/* ALT KISIM: YETKİ DETAYLARI TABLOSU */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[450px]">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800">Yetki Detayları Listesi</h2>
              <span className="text-sm font-semibold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                Gösterilen Kayıt: {scanData.details ? scanData.details.length : 0}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-800 text-white sticky top-0 z-10">
                  <tr>
                    <th className="p-4 font-semibold">Dosya / Klasör Adı</th>
                    <th className="p-4 font-semibold">Kullanıcı / Grup</th>
                    <th className="p-4 font-semibold">Yetki Seviyesi</th>
                    <th className="p-4 font-semibold text-center">Miras</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {scanData.details && scanData.details.length > 0 ? (
                    scanData.details.map((item, index) => {
                      // Riskli durum kontrolü (Everyone varsa veya Full yetkiyse kırmızı yap)
                      const userStr = item.user || '';
                      const permStr = item.perm || '';
                      const isRisky = userStr.includes('Everyone') || permStr.includes('Full');
                      return (
                        <tr key={index} className={`hover:bg-slate-50 transition-colors ${isRisky ? 'bg-red-50/50' : ''}`}>
                          <td className="p-4 text-slate-600 font-medium truncate max-w-[300px]" title={item.path}>
                            📄 {item.path ? item.path.split('\\').pop() : 'N/A'}
                          </td>
                          <td className="p-4 flex items-center gap-2 font-semibold">
                            {isRisky ? '⚠️' : '👤'} 
                            <span className={isRisky ? 'text-red-700' : 'text-slate-700'}>{userStr || '-'}</span>
                          </td>
                          <td className={`p-4 font-bold ${isRisky ? 'text-red-600' : 'text-emerald-600'}`}>
                            {permStr || '-'}
                          </td>
                          <td className="p-4 text-center text-slate-500">
                            {item.isInherited === "Evet" || item.isInherited === true ? "🔄" : "-"}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="4" className="p-12 text-center text-slate-400 font-medium text-base">
                        Taranan dosyalara ait yetki detayları burada listelenecektir.<br/>
                        <span className="text-sm font-normal mt-2 block">Lütfen sol menüden "Klasör Tara" butonuna tıklayarak bir dizin seçin.</span>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

export default App
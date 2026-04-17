import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import ProjectCard from './components/ProjectCard'
import WeeklySummary from './components/WeeklySummary'
import './App.css'

function App() {
  // C# tarafındandan gelen verileri tutacak "hafıza" (state) alanları
  const [scanData, setScanData] = useState({
    totalFiles: 0,
    criticalFound: 0,
    scanDate: '-',
    details: []
  });

  useEffect(() => {
    // C# Backend'den gelen verileri yakalayan fonksiyon
    const handleBackendMessage = (event) => {
      const { type, data } = event.detail;

      if (type === 'scanComplete') {
        const parsedData = JSON.parse(data);
        setScanData(parsedData);
        console.log("Tarama Başarıyla Tamamlandı:", parsedData);
      } else if (type === 'error') {
        alert("Bir Hata Oluştu: " + data);
      } else if (type === 'status') {
        console.log("Sistem Durumu:", data);
      }
    };

    // Dinleyiciyi başlat
    window.addEventListener('backendMessage', handleBackendMessage);
    
    // Sayfa kapandığında dinleyiciyi temizle (Performans için önemli)
    return () => window.removeEventListener('backendMessage', handleBackendMessage);
  }, []);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar - İçinde 'Klasör Tara' butonu olan parça */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Header */}
        <Header />

        {/* Content Area */}
        <div className="p-8 flex-1 overflow-auto">
          {/* Üst Sıra - Özet Kartları */}
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
            {/* Sağ üstteki yeşil özet kartı */}
            <WeeklySummary data={scanData} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
import { useEffect, useState, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import './App.css'

function App() {
  // C# tarafındandan gelen verileri tutacak state
  const [scanData, setScanData] = useState({
    totalFiles: 0,
    criticalFound: 0,
    scanDate: '-',
    details: [] // TABLO İÇİN GEREKEN VERİ BURADA!
  });

  const [showSubfolders, setShowSubfolders] = useState(true);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);

  // Ortak kök dizini bulmak için yardımcı fonksiyon
  const getCommonPath = (details) => {
      if (!details || details.length === 0) return '';
      const paths = details.map(d => d.path);
      const splitPaths = paths.map(p => p.split('\\').filter(Boolean));
      if (splitPaths.length === 0) return '';
      let common = [];
      let minLen = Math.min(...splitPaths.map(p => p.length));
      for (let i = 0; i < minLen; i++) {
          const val = splitPaths[0][i];
          if (splitPaths.every(p => p[i] === val)) {
              common.push(val);
          } else {
              break;
          }
      }
      return common.length > 0 ? common.join('\\') + '\\' : '';
  };

  const commonPath = useMemo(() => getCommonPath(scanData.details), [scanData.details]);

  // Klasörleri gruplamak ve ağaç yapısını oluşturmak için Data manipülasyonu
  const groupedData = useMemo(() => {
    if (!scanData.details) return [];
    
    const map = new Map();
    scanData.details.forEach(item => {
      if (!map.has(item.path)) {
        map.set(item.path, { path: item.path, permissions: [] });
      }
      map.get(item.path).permissions.push({ user: item.user, perm: item.perm, isInherited: item.isInherited });
    });
    
    let result = Array.from(map.values());
    result.sort((a, b) => a.path.localeCompare(b.path));
    return result;
  }, [scanData.details]);

  const baseDepth = useMemo(() => {
    if (groupedData.length === 0) return 0;
    return Math.min(...groupedData.map(r => r.path.split('\\').filter(Boolean).length));
  }, [groupedData]);

  // Alt klasörlerin görünüp görünmeyeceğini belirleyen filtreleme
  const visibleData = useMemo(() => {
    if (showSubfolders) return groupedData;
    return groupedData.filter(r => r.path.split('\\').filter(Boolean).length === baseDepth);
  }, [groupedData, showSubfolders, baseDepth]);

  const handleScanFolder = () => {
    if (window.chrome && window.chrome.webview) {
        window.chrome.webview.postMessage({ command: "scanFolder", data: { path: "C:\\"} });
    } else {
        alert("Bu özellik yalnızca uygulamanın (WebView2) içindeyken çalışır.");
    }
  };

  useEffect(() => {
    const handleBackendMessage = (event) => {
      const { type, data } = event.detail;

      if (type === 'scanComplete') {
        try {
          const parsedData = JSON.parse(data);
          setScanData(parsedData);
          console.log("Tarama Başarıyla Tamamlandı:", parsedData);
          console.log("Gelen Veri Detayı (Details):", parsedData.details);
          console.log("Detay Sayısı:", parsedData.details?.length || 0);
        } catch (error) {
          console.error("Gelen veri parse edilemedi:", error);
          alert("Veri işlenirken bir hata oluştu. Lütfen logları kontrol edin.");
        }
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
      <Sidebar onLogout={() => setIsExitModalOpen(true)} />

      <div className="flex-1 flex flex-col overflow-auto">
        <Header />

        <div className="p-8 flex-1 overflow-auto">
          {/* YETKİ DETAYLARI LİSTESİ (AĞAÇ GÖRÜNÜMÜ) - TAM EKRAN */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 h-full min-h-0">
            {/* Araç Çubuğu */}
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              {/* Sol Taraf: Yol Gösterge ve Seç Butonu */}
              <div className="flex items-center gap-4">
                 <div className="relative w-96 shadow-sm rounded-md">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">📂</span>
                    <input 
                      type="text" 
                      readOnly 
                      value={commonPath} 
                      placeholder="C:\OrtakAlan\USG" 
                      className="pl-10 pr-4 py-2 w-full border border-slate-300 rounded-md bg-white text-slate-700 font-medium focus:outline-none"
                    />
                 </div>
                 <button 
                   onClick={handleScanFolder}
                   className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-md shadow transition-colors"
                 >
                   Seç
                 </button>
                 
                 {/* Dışa Aktar Butonları */}
                 <div className="flex items-center gap-2 ml-2 border-l border-slate-300 pl-4">
                   <button 
                     onClick={() => window.chrome?.webview?.postMessage({ command: 'exportPdf' })}
                     className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors flex items-center gap-2"
                     title="PDF Olarak Çıktı Al"
                   >
                     📄 PDF
                   </button>
                   <button 
                     onClick={() => window.chrome?.webview?.postMessage({ command: 'exportExcel' })}
                     className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors flex items-center gap-2"
                     title="Excel (CSV) Olarak Çıktı Al"
                   >
                     📊 Excel
                   </button>
                 </div>
              </div>
              
              {/* Sağ Taraf: Alt Klasör Toggle ve Bilgi Etiketi */}
              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => setShowSubfolders(!showSubfolders)}
                   className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-md shadow-sm transition-colors text-sm"
                   title="Alt klasörleri gizle / göster"
                 >
                   {showSubfolders ? (
                     <><span>📂</span> Alt Klasörleri Gizle</>
                   ) : (
                     <><span>📁</span> Alt Klasörleri Göster</>
                   )}
                 </button>
                 <span className="text-sm font-semibold bg-slate-200 text-slate-800 px-4 py-2 rounded-md border border-slate-300 flex items-center shadow-sm">
                   Girdi: {visibleData.length} Dizin
                 </span>
              </div>
            </div>
            
            {/* Ara Başlıklar (Header) */}
            <div className="flex bg-slate-800 text-white sticky top-0 z-10 border-b border-slate-600">
               <div className="w-1/2 p-3 pl-6 font-semibold uppercase text-xs tracking-widest">Klasör Yapısı</div>
               <div className="w-1/2 p-3 pl-6 font-semibold uppercase text-xs tracking-widest border-l border-slate-600">İzinli Kullanıcı Kısmı (R/W)</div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white p-0">
               <div className="divide-y divide-slate-100">
                  {visibleData && visibleData.length > 0 ? (
                    visibleData.map((folder, index) => {
                      const parts = folder.path.split('\\').filter(Boolean);
                      const name = parts[parts.length - 1];
                      const depth = parts.length;
                      const indent = baseDepth > 0 ? Math.max(0, depth - baseDepth) : 0;
                      
                      return (
                        <div key={index} className="flex hover:bg-slate-50 transition-colors">
                           {/* Sol Sütun: Ağaç Yapısı */}
                           <div className="w-1/2 p-4 text-slate-700 border-r border-slate-100 flex flex-col justify-center" title={folder.path}>
                              <div style={{ marginLeft: `${indent * 28}px` }} className="flex items-center gap-2">
                                  {indent === 0 ? (
                                    <span className="text-emerald-500 drop-shadow flex-shrink-0">▶</span>
                                  ) : (
                                    <span className="text-slate-300 flex-shrink-0 font-bold ml-1">└─▶</span>
                                  )}
                                  <span className={`truncate ${indent === 0 ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                                    📂 {name || folder.path}
                                  </span>
                              </div>
                           </div>
                           
                           {/* Sağ Sütun: Kullanıcılar */}
                           <div className="w-1/2 p-3 flex flex-col gap-2">
                              {folder.permissions.map((p, i) => {
                                  const isRisky = (p.user || '').includes('Everyone') || (p.perm || '').includes('Full');
                                  return (
                                    <div key={i} className={`flex items-center justify-between px-4 py-2 rounded-lg border shadow-sm ${isRisky ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                                        <div className="flex items-center gap-2">
                                            <span>{isRisky ? '⚠️' : '👤'}</span>
                                            <span className={`font-semibold ${isRisky ? 'text-red-700' : 'text-slate-700'}`}>{p.user || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className={`text-xs font-bold px-2 py-1 rounded bg-opacity-10 ${isRisky ? 'text-red-600 bg-red-600' : 'text-emerald-700 bg-emerald-700'}`}>
                                                {p.perm || '-'}
                                            </span>
                                            <div className="w-6 text-center text-slate-400 text-lg" title="Miras Alınmış Yetki">
                                                {(p.isInherited === "Evet" || p.isInherited === true) ? "🔄" : "-"}
                                            </div>
                                        </div>
                                    </div>
                                  );
                              })}
                           </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-16 text-center">
                      <div className="text-5xl opacity-20 mb-4">📂</div>
                      <p className="text-slate-500 font-medium">Listelenecek yetki klasörü bulunamadı.</p>
                      <p className="text-sm text-slate-400 mt-1">Lütfen "Seç" butonunu kullanarak tarama başlatın.</p>
                    </div>
                  )}
               </div>
            </div>
          </div>

        </div>
      </div>

      {/* Corporate Exit Approval Modal */}
      {isExitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden transform transition-all">
            {/* Header */}
            <div className="bg-[#00584E] px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Uygulamadan Çıkılsın mı?
              </h3>
            </div>
            
            {/* Body */}
            <div className="px-6 py-6 bg-slate-50">
              <p className="text-slate-600 font-medium text-[15px] leading-relaxed">
                Yapılmamış işlemleriniz kaybolabilir. Çıkmak istediğinize emin misiniz?
              </p>
            </div>
            
            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setIsExitModalOpen(false)}
                className="px-5 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold transition-colors border border-slate-200 shadow-sm"
              >
                Vazgeç
              </button>
              <button
                onClick={() => {
                  setIsExitModalOpen(false);
                  if (window.chrome && window.chrome.webview) {
                    window.chrome.webview.postMessage({ command: "exitApp" });
                  } else {
                    window.close();
                  }
                }}
                className="px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors shadow-sm shadow-red-500/30 flex items-center gap-2"
              >
                Evet, Çık
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
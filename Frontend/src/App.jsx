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
    details: []
  });

  const [showSubfolders, setShowSubfolders] = useState(true);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Permission CRUD States
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [activeFolder, setActiveFolder] = useState('');
  const [permissionForm, setPermissionForm] = useState({ oldUser: '', user: '', perm: 'ReadAndExecute' });

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
      window.chrome.webview.postMessage({ command: "scanFolder", data: { path: "C:\\" } });
    } else {
      alert("Bu özellik yalnızca uygulamanın (WebView2) içindeyken çalışır.");
    }
  };

  const handleClear = () => {
    setScanData({
      totalFiles: 0,
      criticalFound: 0,
      scanDate: '-',
      details: []
    });
    setSearchTerm('');
    setIsExitModalOpen(false);
    setIsPermissionModalOpen(false);
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

  // Ekrana basılan veriden hemen önce arama filtresi uygulaması (Klasör bazında)
  const filteredData = visibleData.filter(folder => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();

    return folder.path.toLowerCase().includes(term) ||
      folder.permissions.some(p =>
        (p.user && p.user.toLowerCase().includes(term)) ||
        (p.perm && p.perm.toLowerCase().includes(term))
      );
  });

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      <Sidebar onLogout={() => setIsExitModalOpen(true)} />

      <div className="flex-1 flex flex-col overflow-auto">
        <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

        <div className="p-8 flex-1 overflow-auto">
          {/* YETKİ DETAYLARI LİSTESİ (AĞAÇ GÖRÜNÜMÜ) - TAM EKRAN */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 h-full min-h-0">
            {/* Araç Çubuğu */}
            <div className="p-5 border-b border-slate-200 flex flex-col gap-4 bg-slate-50">
              {/* Üst Satır: Yol Gösterge ve Seç Butonu */}
              <div className="flex items-center gap-3">
                <div className="relative flex-1 shadow-sm rounded-md">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">📂</span>
                  <input
                    type="text"
                    readOnly
                    value={commonPath}
                    placeholder="C:\OrtakAlan\USG"
                    className="pl-10 pr-4 h-10 w-full border border-slate-300 rounded-md bg-white text-slate-700 font-medium focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleScanFolder}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-10 px-6 rounded-md shadow transition-colors flex items-center justify-center"
                >
                  Seç
                </button>
                <button
                  onClick={handleClear}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300 font-bold h-10 px-4 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
                  title="Ekranı Temizle"
                >
                  <span className="text-lg">🧹</span> Temizle
                </button>
              </div>

              {/* Alt Satır: Aksiyon ve Bilgi Butonları (PDF, Excel, Alt Klasör, Girdi) */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => window.chrome?.webview?.postMessage({ command: 'exportPdf' })}
                  className="bg-red-500 hover:bg-red-600 text-white font-semibold h-10 px-4 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
                  title="PDF Olarak Çıktı Al"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => window.chrome?.webview?.postMessage({ command: 'exportExcel' })}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold h-10 px-4 rounded-md shadow-sm transition-colors flex items-center justify-center gap-2"
                  title="Excel (CSV) Olarak Çıktı Al"
                >
                  📊 Excel
                </button>

                <div className="h-6 w-[1px] bg-slate-300 mx-1 hidden sm:block"></div> {/* Ayırıcı Çizgi */}

                <button
                  onClick={() => setShowSubfolders(!showSubfolders)}
                  className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-10 px-4 rounded-md shadow-sm transition-colors text-sm"
                  title="Alt klasörleri gizle / göster"
                >
                  {showSubfolders ? (
                    <><span>📂</span> Alt Klasörleri Gizle</>
                  ) : (
                    <><span>📁</span> Alt Klasörleri Göster</>
                  )}
                </button>
                <span className="text-sm font-semibold bg-slate-200 text-slate-800 px-4 h-10 rounded-md border border-slate-300 flex items-center justify-center shadow-sm whitespace-nowrap">
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
                  filteredData.length > 0 ? (
                    filteredData.map((folder, index) => {
                      const parts = folder.path.split('\\').filter(Boolean);
                      const name = parts[parts.length - 1];
                      const depth = parts.length;
                      const indent = baseDepth > 0 ? Math.max(0, depth - baseDepth) : 0;

                      return (
                        <div key={index} className="flex hover:bg-slate-50 transition-colors">
                          {/* Sol Sütun: Ağaç Yapısı ve Ekle Butonu */}
                          <div className="w-1/2 p-4 text-slate-700 border-r border-slate-100 flex flex-col justify-center" title={folder.path}>
                            <div style={{ marginLeft: `${indent * 28}px` }} className="flex items-center justify-between gap-2 overflow-hidden pr-2">
                              <div className="flex items-center gap-2 truncate">
                                {indent === 0 ? (
                                  <span className="text-emerald-500 drop-shadow flex-shrink-0">▶</span>
                                ) : (
                                  <span className="text-slate-300 flex-shrink-0 font-bold ml-1">└─▶</span>
                                )}
                                <span className={`truncate ${indent === 0 ? 'font-bold text-slate-800' : 'font-medium text-slate-600'}`}>
                                  📂 {name || folder.path}
                                </span>
                              </div>
                              <button
                                onClick={() => {
                                  setActiveFolder(folder.path);
                                  setModalMode('add');
                                  setPermissionForm({ oldUser: '', user: '', perm: 'ReadAndExecute' });
                                  setIsPermissionModalOpen(true);
                                }}
                                className="bg-emerald-50 text-emerald-600 hover:bg-emerald-500 hover:text-white p-1.5 rounded flex-shrink-0 transition-colors shadow-sm focus:outline-none border border-emerald-100 hover:border-emerald-500"
                                title="Yeni Yetki Ekle"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Sağ Sütun: Kullanıcılar */}
                          <div className="w-1/2 p-3 flex flex-col gap-2">
                            {/* İŞTE SİHİR BURADA: Kullanıcıları da ekrana basmadan önce arama kelimesine göre filtreleniyor */}
                            {folder.permissions
                              .filter(p => {
                                if (!searchTerm) return true;
                                const term = searchTerm.toLowerCase();
                                // Eğer klasör adını aradıysa herkesi göster, yoksa sadece aranan kişiyi göster
                                if (folder.path.toLowerCase().includes(term)) return true;
                                return (p.user && p.user.toLowerCase().includes(term)) ||
                                  (p.perm && p.perm.toLowerCase().includes(term));
                              })
                              .map((p, i) => {
                                const isRisky = (p.user || '').includes('Everyone') || (p.perm || '').includes('Full');
                                return (
                                  <div key={i} className={`group flex items-center justify-between px-4 py-2 rounded-lg border shadow-sm transition-all hover:shadow-md ${isRisky ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center gap-2 truncate min-w-0 pr-2">
                                      <span>{isRisky ? '⚠️' : '👤'}</span>
                                      <span className={`font-semibold truncate ${isRisky ? 'text-red-700' : 'text-slate-700'}`}>{p.user || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                      <span className={`flex items-center justify-center text-[10px] font-semibold uppercase text-white px-2 py-1 rounded min-w-[80px] ${isRisky ? 'bg-red-600' : 'bg-emerald-600'}`}>
                                        {p.perm || '-'}
                                      </span>
                                      <div className="w-6 text-center text-slate-400 text-lg" title="Miras Alınmış Yetki">
                                        {(p.isInherited === "Evet" || p.isInherited === true) ? "🔄" : "-"}
                                      </div>
                                      
                                      {/* Düzenle / Sil Butonları (Hover ile görünür) */}
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                          onClick={() => {
                                            setActiveFolder(folder.path);
                                            setModalMode('edit');
                                            setPermissionForm({ oldUser: p.user, user: p.user, perm: p.perm });
                                            setIsPermissionModalOpen(true);
                                          }}
                                          className="p-1.5 text-blue-500 hover:bg-blue-100 rounded-md transition-colors" title="Yetkiyi Düzenle">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                          </svg>
                                        </button>
                                        <button 
                                          onClick={() => {
                                            if(window.confirm(`${p.user} kullanıcısının ${p.perm} yetkisini silmek istediğinize emin misiniz?`)) {
                                              if (window.chrome && window.chrome.webview) {
                                                window.chrome.webview.postMessage({ command: 'removePermission', data: { path: folder.path, user: p.user } });
                                              }
                                            }
                                          }}
                                          className="p-1.5 text-red-500 hover:bg-red-100 rounded-md transition-colors" title="Yetkiyi Sil">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                          </svg>
                                        </button>
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
                      <div className="text-5xl opacity-20 mb-4">🔍</div>
                      <p className="text-slate-600 font-semibold text-lg">Sonuç bulunamadı</p>
                      <p className="text-sm text-slate-400 mt-1">Arama kriterlerinize uygun "\b{searchTerm}\b" kaydı eşleşmedi.</p>
                    </div>
                  )
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
      
      {/* Permission Add/Edit Modal */}
      {isPermissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden transform transition-all">
            {/* Header */}
            <div className={`px-6 py-4 flex items-center justify-between ${modalMode === 'add' ? 'bg-[#00584E]' : 'bg-slate-800'}`}>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {modalMode === 'add' ? (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Yeni Yetki Ekle
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Yetkiyi Düzenle
                  </>
                )}
              </h3>
              <button 
                onClick={() => setIsPermissionModalOpen(false)}
                className="text-white/70 hover:text-white transition-colors focus:outline-none"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-6 bg-slate-50 flex flex-col gap-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Klasör Yolu</label>
                <div className="bg-slate-100 border border-slate-200 rounded-md px-3 py-2 text-slate-500 text-sm break-all font-mono">
                  {activeFolder}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Kullanıcı Adı / Grup</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input 
                    type="text" 
                    autoFocus
                    placeholder="Örn: ERN\Mert" 
                    value={permissionForm.user}
                    onChange={(e) => setPermissionForm({ ...permissionForm, user: e.target.value })}
                    className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Yetki Seviyesi</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <select 
                    value={permissionForm.perm}
                    onChange={(e) => setPermissionForm({ ...permissionForm, perm: e.target.value })}
                    className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 appearance-none font-medium cursor-pointer"
                  >
                    <option value="FullControl">FullControl (Tam Yetki)</option>
                    <option value="Modify">Modify (Değiştirme)</option>
                    <option value="ReadAndExecute">ReadAndExecute (Okuma ve Çalıştırma)</option>
                    <option value="Write">Write (Yazma)</option>
                    <option value="Read">Read (Okuma Yalnızca)</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-white border-t border-slate-100 flex justify-end gap-3 rounded-b-xl">
              <button
                onClick={() => setIsPermissionModalOpen(false)}
                className="px-5 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold transition-colors border border-slate-200 shadow-sm"
              >
                İptal
              </button>
              <button
                disabled={!permissionForm.user.trim()}
                onClick={() => {
                  if (window.chrome && window.chrome.webview) {
                    if (modalMode === 'add') {
                      window.chrome.webview.postMessage({ 
                        command: 'addPermission', 
                        data: { path: activeFolder, user: permissionForm.user.trim(), perm: permissionForm.perm } 
                      });
                    } else {
                      window.chrome.webview.postMessage({ 
                        command: 'editPermission', 
                        data: { path: activeFolder, oldUser: permissionForm.oldUser, newUser: permissionForm.user.trim(), perm: permissionForm.perm } 
                      });
                    }
                  }
                  setIsPermissionModalOpen(false);
                }}
                className={`px-5 py-2.5 rounded-lg text-white font-semibold transition-colors shadow-sm flex items-center gap-2 ${
                  !permissionForm.user.trim() 
                    ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                    : modalMode === 'add' 
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30' 
                      : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/30'
                }`}
              >
                {modalMode === 'add' ? 'Yetkiyi Ekle' : 'Değişiklikleri Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
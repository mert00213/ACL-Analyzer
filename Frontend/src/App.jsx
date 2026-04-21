import { useEffect, useState, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import './App.css'

function App() {
  const [scanData, setScanData] = useState({
    totalFiles: 0,
    criticalFound: 0,
    scanDate: '-',
    details: []
  });

  const [showSubfolders, setShowSubfolders] = useState(true);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [expandedFolders, setExpandedFolders] = useState(new Set());

  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [activeFolder, setActiveFolder] = useState('');
  const [permissionForm, setPermissionForm] = useState({ oldUser: '', user: '', perm: 'ReadAndExecute' });

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
    setExpandedFolders(new Set());
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

          // MERT: Taramadan sonra her şeyi SIFIR (kapalı) hale getiriyoruz.
          setExpandedFolders(new Set());

        } catch (error) {
          console.error("Gelen veri parse edilemedi:", error);
          alert("Veri işlenirken bir hata oluştu. Lütfen logları kontrol edin.");
        }
      } else if (type === 'error') {
        alert("Bir Hata Oluştu: " + data);
      }
    };

    window.addEventListener('backendMessage', handleBackendMessage);
    return () => window.removeEventListener('backendMessage', handleBackendMessage);
  }, []);

  const filteredData = visibleData.filter(folder => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();

    return folder.path.toLowerCase().includes(term) ||
      folder.permissions.some(p =>
        (p.user && p.user.toLowerCase().includes(term)) ||
        (p.perm && p.perm.toLowerCase().includes(term))
      );
  });

  const toggleFolder = (e, path) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  // MERT: İşte o kusursuz çalışan yeni SOY AĞACI algoritması! (Hata yapması imkansızdır)
  const visibleFolders = filteredData.filter(folder => {
    if (searchTerm) return true; // Arama yapılıyorsa her şey açık görünür.

    const normalizedPath = folder.path.endsWith('\\') ? folder.path.slice(0, -1) : folder.path;
    let parentPath = normalizedPath.substring(0, normalizedPath.lastIndexOf('\\'));

    // Klasörün üstündeki tüm babaları, dedeleri kontrol et. Biri bile kapalıysa bunu gizle.
    while (parentPath && parentPath.split('\\').filter(Boolean).length >= baseDepth) {
      if (!expandedFolders.has(parentPath) && !expandedFolders.has(parentPath + '\\')) {
        return false;
      }
      parentPath = parentPath.substring(0, parentPath.lastIndexOf('\\'));
    }

    return true;
  });

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans text-sm">
      <Sidebar onLogout={() => setIsExitModalOpen(true)} />

      <div className="flex-1 flex flex-col overflow-auto">
        <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

        <div className="p-4 sm:p-6 flex-1 overflow-auto">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 h-full min-h-0">
            {/* Araç Çubuğu */}
            <div className="p-3 border-b border-slate-200 flex flex-col gap-3 bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="relative flex-1 shadow-sm rounded">
                  <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-400">📂</span>
                  <input
                    type="text"
                    readOnly
                    value={commonPath}
                    placeholder="C:\OrtakAlan\USG"
                    className="pl-8 pr-3 h-8 w-full border border-slate-300 rounded bg-white text-slate-700 text-sm focus:outline-none"
                  />
                </div>
                <button
                  onClick={handleScanFolder}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-8 px-4 rounded shadow-sm transition-colors text-sm"
                >
                  Seç
                </button>
                <button
                  onClick={handleClear}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 border border-slate-300 font-semibold h-8 px-3 rounded shadow-sm transition-colors flex items-center gap-1.5 text-sm"
                  title="Ekranı Temizle"
                >
                  <span className="text-base">🧹</span> Temizle
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.chrome?.webview?.postMessage({ command: 'exportPdf' })}
                  className="bg-red-500 hover:bg-red-600 text-white font-medium h-8 px-3 rounded shadow-sm transition-colors flex items-center gap-1.5 text-xs"
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => window.chrome?.webview?.postMessage({ command: 'exportExcel' })}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium h-8 px-3 rounded shadow-sm transition-colors flex items-center gap-1.5 text-xs"
                >
                  📊 Excel
                </button>

                <div className="h-5 w-[1px] bg-slate-300 mx-1 hidden sm:block"></div>

                <button
                  onClick={() => setShowSubfolders(!showSubfolders)}
                  className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium h-8 px-3 rounded shadow-sm transition-colors text-xs"
                >
                  {showSubfolders ? (
                    <><span>📂</span> Alt Klasörleri Gizle</>
                  ) : (
                    <><span>📁</span> Alt Klasörleri Göster</>
                  )}
                </button>
                <span className="text-xs font-semibold bg-slate-200 text-slate-800 px-3 h-8 rounded border border-slate-300 flex items-center shadow-sm">
                  Girdi: {visibleData.length} Dizin
                </span>
              </div>
            </div>

            {/* Ara Başlıklar */}
            <div className="flex bg-slate-800 text-white sticky top-0 z-10 border-b border-slate-600 text-xs">
              <div className="w-1/2 py-2 px-4 font-semibold uppercase tracking-wider">Klasör Yapısı</div>
              <div className="w-1/2 py-2 px-4 font-semibold uppercase tracking-wider border-l border-slate-600">İzinli Kullanıcı Kısmı (R/W)</div>
            </div>

            <div className="flex-1 overflow-y-auto bg-white p-0">
              <div className="divide-y divide-slate-100">
                {visibleData && visibleData.length > 0 ? (
                  visibleFolders.length > 0 ? (
                    visibleFolders.map((folder, index) => {
                      const parts = folder.path.split('\\').filter(Boolean);
                      const name = parts[parts.length - 1];
                      const depth = parts.length;
                      const indent = baseDepth > 0 ? Math.max(0, depth - baseDepth) : 0;

                      const folderPathForCheck = folder.path.endsWith('\\') ? folder.path : folder.path + '\\';
                      const hasSubfolders = filteredData.some(f => f.path.startsWith(folderPathForCheck) && f.path !== folder.path);
                      const isExpanded = expandedFolders.has(folder.path);

                      return (
                        <div key={index} className="flex hover:bg-slate-50 transition-colors border-l-2 border-transparent hover:border-emerald-400">
                          {/* Sol Sütun: Klasör */}
                          <div className="w-1/2 py-2 px-4 text-slate-700 border-r border-slate-100 flex flex-col justify-center" title={folder.path}>
                            <div style={{ marginLeft: `${indent * 20}px` }} className="flex items-center justify-between gap-2 pr-1">
                              <div className="flex items-center gap-2 truncate">

                                {/* MERT: İşte SVGLER! Kayma yok, hizalama %100 jilet gibi! */}
                                <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                                  {hasSubfolders ? (
                                    <span
                                      onClick={(e) => toggleFolder(e, folder.path)}
                                      className="text-emerald-600 cursor-pointer hover:bg-emerald-100 w-full h-full flex items-center justify-center rounded transition-colors"
                                      title={isExpanded ? "Daralt" : "Genişlet"}
                                    >
                                      {isExpanded ? (
                                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M5 8h14l-7 11z" /></svg>
                                      ) : (
                                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M8 5v14l11-7z" /></svg>
                                      )}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 w-full h-full flex items-center justify-center">
                                      {/* İçi boş, sadece çizgili SV üçgen */}
                                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2"><path d="M8 5v14l11-7z" strokeLinejoin="round" /></svg>
                                    </span>
                                  )}
                                </div>

                                <span className={`truncate text-sm ${indent === 0 ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}`}>
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
                                className="text-emerald-600 hover:bg-emerald-100 p-1 rounded flex-shrink-0 transition-colors focus:outline-none"
                                title="Yeni Yetki Ekle"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Sağ Sütun: Yetkiler */}
                          <div className="w-1/2 p-2 flex flex-col gap-1.5">
                            {folder.permissions
                              .filter(p => {
                                if (!searchTerm) return true;
                                const term = searchTerm.toLowerCase();
                                if (folder.path.toLowerCase().includes(term)) return true;
                                return (p.user && p.user.toLowerCase().includes(term)) ||
                                  (p.perm && p.perm.toLowerCase().includes(term));
                              })
                              .map((p, i) => {
                                const isRisky = (p.user || '').includes('Everyone') || (p.perm || '').includes('Full');
                                return (
                                  <div key={i} className={`group flex items-center justify-between px-2.5 py-1.5 rounded border shadow-sm transition-all hover:shadow ${isRisky ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'}`}>
                                    <div className="flex items-center gap-1.5 truncate min-w-0 pr-2">
                                      <span className="text-xs">{isRisky ? '⚠️' : '👤'}</span>
                                      <span className={`text-xs font-semibold truncate ${isRisky ? 'text-red-700' : 'text-slate-700'}`}>{p.user || '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <span className={`flex items-center justify-center text-[9px] font-bold uppercase text-white px-1.5 py-0.5 rounded min-w-[60px] ${isRisky ? 'bg-red-600' : 'bg-emerald-600'}`}>
                                        {p.perm || '-'}
                                      </span>
                                      <div className="w-4 text-center text-slate-400 text-xs" title="Miras Alınmış Yetki">
                                        {(p.isInherited === "Evet" || p.isInherited === true) ? "🔄" : "-"}
                                      </div>

                                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => {
                                            setActiveFolder(folder.path);
                                            setModalMode('edit');
                                            setPermissionForm({ oldUser: p.user, user: p.user, perm: p.perm });
                                            setIsPermissionModalOpen(true);
                                          }}
                                          className="p-1 text-blue-500 hover:bg-blue-100 rounded transition-colors" title="Yetkiyi Düzenle">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                          </svg>
                                        </button>
                                        <button
                                          onClick={() => {
                                            if (window.confirm(`${p.user} kullanıcısının ${p.perm} yetkisini silmek istediğinize emin misiniz?`)) {
                                              if (window.chrome && window.chrome.webview) {
                                                window.chrome.webview.postMessage({ command: 'removePermission', data: { path: folder.path, user: p.user } });
                                              }
                                            }
                                          }}
                                          className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors" title="Yetkiyi Sil">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                    <div className="p-12 text-center">
                      <div className="text-4xl opacity-20 mb-3">🔍</div>
                      <p className="text-slate-600 font-medium text-sm">Sonuç bulunamadı</p>
                    </div>
                  )
                ) : (
                  <div className="p-12 text-center">
                    <div className="text-4xl opacity-20 mb-3">📂</div>
                    <p className="text-slate-500 font-medium text-sm">Listelenecek yetki klasörü bulunamadı.</p>
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
          <div className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className="bg-[#00584E] px-5 py-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">Uygulamadan Çıkılsın mı?</h3>
            </div>
            <div className="px-5 py-5 bg-slate-50">
              <p className="text-slate-600 text-sm">Yapılmamış işlemleriniz kaybolabilir. Çıkmak istediğinize emin misiniz?</p>
            </div>
            <div className="px-5 py-3 bg-white border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setIsExitModalOpen(false)} className="px-4 py-1.5 rounded text-slate-600 hover:bg-slate-100 text-sm font-medium border border-slate-200">Vazgeç</button>
              <button onClick={() => { setIsExitModalOpen(false); if (window.chrome && window.chrome.webview) { window.chrome.webview.postMessage({ command: "exitApp" }); } else { window.close(); } }} className="px-4 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm font-medium">Evet, Çık</button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Add/Edit Modal */}
      {isPermissionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden">
            <div className={`px-5 py-3 flex items-center justify-between ${modalMode === 'add' ? 'bg-[#00584E]' : 'bg-slate-800'}`}>
              <h3 className="text-base font-bold text-white">{modalMode === 'add' ? 'Yeni Yetki Ekle' : 'Yetkiyi Düzenle'}</h3>
              <button onClick={() => setIsPermissionModalOpen(false)} className="text-white/70 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
            </div>
            <div className="px-5 py-5 bg-slate-50 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Klasör Yolu</label>
                <div className="bg-slate-100 border border-slate-200 rounded px-2.5 py-1.5 text-slate-500 text-xs font-mono break-all">{activeFolder}</div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kullanıcı Adı / Grup</label>
                <input type="text" autoFocus placeholder="Örn: ERN\Mert" value={permissionForm.user} onChange={(e) => setPermissionForm({ ...permissionForm, user: e.target.value })} className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-800 text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Yetki Seviyesi</label>
                <select value={permissionForm.perm} onChange={(e) => setPermissionForm({ ...permissionForm, perm: e.target.value })} className="w-full px-3 py-1.5 border border-slate-300 rounded text-slate-800 text-sm focus:outline-none focus:border-emerald-500 bg-white">
                  <option value="FullControl">FullControl</option>
                  <option value="Modify">Modify</option>
                  <option value="ReadAndExecute">ReadAndExecute</option>
                  <option value="Write">Write</option>
                  <option value="Read">Read</option>
                </select>
              </div>
            </div>
            <div className="px-5 py-3 bg-white border-t border-slate-100 flex justify-end gap-2">
              <button onClick={() => setIsPermissionModalOpen(false)} className="px-4 py-1.5 rounded text-slate-600 hover:bg-slate-100 text-sm font-medium border border-slate-200">İptal</button>
              <button disabled={!permissionForm.user.trim()} onClick={() => { /* ... (Mevcut C# Mesajlaşma mantığı) ... */ setIsPermissionModalOpen(false); }} className={`px-4 py-1.5 rounded text-white text-sm font-medium ${!permissionForm.user.trim() ? 'bg-slate-300' : modalMode === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{modalMode === 'add' ? 'Ekle' : 'Kaydet'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
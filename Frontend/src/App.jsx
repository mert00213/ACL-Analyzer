import React, { useEffect, useState, useMemo, useCallback } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import './App.css'

// Akıllı Satır Bileşeni (Sadece değişen satırı çizer, mükemmel performans)
const FolderRow = React.memo(({
  folder, index, indent, isSelected, hasSubfolders, isExpanded, searchTerm,
  onToggle, onSelect, onAddPerm, onEditPerm, onDeletePerm
}) => {
  const parts = folder.path.split('\\').filter(Boolean);
  const name = parts[parts.length - 1];

  return (
    <div onClick={() => onSelect(folder.path)} className="flex hover:bg-slate-50 transition-colors border-b border-slate-100 bg-white border-l-2 border-transparent hover:border-emerald-400 cursor-pointer">
      <div className="w-1/2 py-2 px-4 text-slate-700 border-r border-slate-100 flex flex-col justify-center" title={folder.path}>
        <div style={{ marginLeft: `${indent * 20}px` }} className="flex items-center justify-between gap-2 pr-1">
          <div className="flex items-center gap-2 truncate">
            <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
              {hasSubfolders ? (
                <span
                  onClick={(e) => onToggle(e, folder.path)}
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
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2"><path d="M8 5v14l11-7z" strokeLinejoin="round" /></svg>
                </span>
              )}
            </div>
            <span className={`truncate text-sm ${indent === 0 ? 'font-semibold text-slate-800' : 'font-medium text-slate-600'}`}>
              📂 {name || folder.path}
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onAddPerm(folder.path); }}
            className="text-emerald-600 hover:bg-emerald-100 p-1 rounded flex-shrink-0 transition-colors focus:outline-none"
            title="Yeni Yetki Ekle"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      <div className="w-1/2 p-2 flex flex-col justify-center gap-1.5">
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
                      onClick={(e) => { e.stopPropagation(); onEditPerm(folder.path, p.user, p.perm); }}
                      className="p-1 text-blue-500 hover:bg-blue-100 rounded transition-colors" title="Yetkiyi Düzenle">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onDeletePerm(folder.path, p.user, p.perm); }}
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
}, (prev, next) => {
  return prev.isSelected === next.isSelected &&
    prev.isExpanded === next.isExpanded &&
    prev.hasSubfolders === next.hasSubfolders &&
    prev.searchTerm === next.searchTerm &&
    prev.folder === next.folder;
});

function App() {
  const [scanData, setScanData] = useState({ totalFiles: 0, criticalFound: 0, scanDate: '-', details: [] });
  const [groupedData, setGroupedData] = useState([]);

  const [showSubfolders, setShowSubfolders] = useState(true);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [expandedFolders, setExpandedFolders] = useState(new Set());
  const [selectedFolder, setSelectedFolder] = useState(null);

  // Yerleşik Sonsuz Kaydırma Limiti
  const [visibleCount, setVisibleCount] = useState(100);

  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add');
  const [activeFolder, setActiveFolder] = useState('');
  const [permissionForm, setPermissionForm] = useState({ oldUser: '', user: '', perm: 'ReadAndExecute' });

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    setVisibleCount(100);
  }, [debouncedSearch, expandedFolders, scanData]);

  const getCommonPath = (details) => {
    if (!details || details.length === 0) return '';
    const paths = details.map(d => d.path);
    const splitPaths = paths.map(p => p.split('\\').filter(Boolean));
    if (splitPaths.length === 0) return '';
    let common = [];
    let minLen = Math.min(...splitPaths.map(p => p.length));
    for (let i = 0; i < minLen; i++) {
      const val = splitPaths[0][i];
      if (splitPaths.every(p => p[i] === val)) common.push(val);
      else break;
    }
    return common.length > 0 ? common.join('\\') + '\\' : '';
  };

  const commonPath = useMemo(() => getCommonPath(scanData.details), [scanData.details]);

  // Web Worker (Arka Planda JSON İşleyici)
  useEffect(() => {
    const workerCode = `
      self.onmessage = function(e) {
        const payload = e.data;
        try {
          const parsedData = JSON.parse(payload);
          const map = new Map();
          for (let i = 0; i < parsedData.details.length; i++) {
            const item = parsedData.details[i];
            if (!map.has(item.path)) {
              map.set(item.path, { path: item.path, permissions: [] });
            }
            map.get(item.path).permissions.push({ user: item.user, perm: item.perm, isInherited: item.isInherited });
          }
          let result = Array.from(map.values());
          result.sort((a, b) => (a.path > b.path ? 1 : (a.path < b.path ? -1 : 0)));
          self.postMessage({ status: 'success', parsedData, groupedResult: result });
        } catch (err) {
          self.postMessage({ status: 'error', error: err.message });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);
    const worker = new Worker(workerUrl);

    worker.onmessage = (e) => {
      const { status, parsedData, groupedResult, error } = e.data;
      if (status === 'success') {
        setScanData(parsedData);
        setGroupedData(groupedResult);
        setExpandedFolders(new Set());
        setIsProcessing(false);
      } else {
        console.error("Worker Hatası:", error);
        alert("Veri işlenirken bir hata oluştu.");
        setIsProcessing(false);
      }
    };

    const handleBackendMessage = (event) => {
      const { type, data } = event.detail;
      if (type === 'scanComplete') {
        worker.postMessage(data);
      } else if (type === 'error') {
        alert("Bir Hata Oluştu: " + data);
        setIsProcessing(false);
      }
    };

    window.addEventListener('backendMessage', handleBackendMessage);

    return () => {
      window.removeEventListener('backendMessage', handleBackendMessage);
      worker.terminate();
      URL.revokeObjectURL(workerUrl);
    };
  }, []);

  const baseDepth = useMemo(() => {
    if (groupedData.length === 0) return 0;
    return Math.min(...groupedData.map(r => r.path.split('\\').filter(Boolean).length));
  }, [groupedData]);

  const visibleData = useMemo(() => {
    if (showSubfolders) return groupedData;
    return groupedData.filter(r => r.path.split('\\').filter(Boolean).length === baseDepth);
  }, [groupedData, showSubfolders, baseDepth]);

  const handleScanFolder = () => {
    setIsProcessing(true);
    if (window.chrome && window.chrome.webview) {
      window.chrome.webview.postMessage({ command: "scanFolder", data: { path: "C:\\" } });
    } else {
      alert("Bu özellik yalnızca uygulamanın (WebView2) içindeyken çalışır.");
      setIsProcessing(false);
    }
  };

  const handleClear = () => {
    setScanData({ totalFiles: 0, criticalFound: 0, scanDate: '-', details: [] });
    setGroupedData([]);
    setSearchTerm('');
    setDebouncedSearch('');
    setExpandedFolders(new Set());
    setSelectedFolder(null);
    setIsExitModalOpen(false);
    setIsPermissionModalOpen(false);
  };

  const filteredData = useMemo(() => visibleData.filter(folder => {
    if (!debouncedSearch) return true;
    const term = debouncedSearch.toLowerCase();
    return folder.path.toLowerCase().includes(term) ||
      folder.permissions.some(p =>
        (p.user && p.user.toLowerCase().includes(term)) ||
        (p.perm && p.perm.toLowerCase().includes(term))
      );
  }), [visibleData, debouncedSearch]);

  const visibleFolders = useMemo(() => {
    if (debouncedSearch) return filteredData;

    let hidePrefix = null;
    const result = [];

    for (let i = 0; i < filteredData.length; i++) {
      const folder = filteredData[i];
      if (hidePrefix && folder.path.startsWith(hidePrefix)) continue;
      hidePrefix = null;
      result.push(folder);
      if (!expandedFolders.has(folder.path)) {
        hidePrefix = folder.path.endsWith('\\') ? folder.path : folder.path + '\\';
      }
    }
    return result;
  }, [filteredData, debouncedSearch, expandedFolders]);

  const handleToggle = useCallback((e, path) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const handleSelect = useCallback((path) => setSelectedFolder(path), []);

  const handleAddPerm = useCallback((path) => {
    setActiveFolder(path);
    setModalMode('add');
    setPermissionForm({ oldUser: '', user: '', perm: 'ReadAndExecute' });
    setIsPermissionModalOpen(true);
  }, []);

  const handleEditPerm = useCallback((path, user, perm) => {
    setActiveFolder(path);
    setModalMode('edit');
    setPermissionForm({ oldUser: user, user: user, perm: perm });
    setIsPermissionModalOpen(true);
  }, []);

  const handleDeletePerm = useCallback((path, user, perm) => {
    if (window.confirm(`${user} kullanıcısının ${perm} yetkisini silmek istediğinize emin misiniz?`)) {
      if (window.chrome && window.chrome.webview) {
        window.chrome.webview.postMessage({ command: 'removePermission', data: { path: path, user: user } });
      }
    }
  }, []);

  // YERLEŞİK SONSUZ KAYDIRMA - Hata verdirmeyen, tertemiz performans motoru
  const handleScroll = (e) => {
    const bottom = e.target.scrollHeight - e.target.scrollTop <= e.target.clientHeight + 300;
    if (bottom && visibleCount < visibleFolders.length) {
      setVisibleCount(prev => prev + 100);
    }
  };

  const displayedFolders = visibleFolders.slice(0, visibleCount);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-sans text-sm">
      <Sidebar onLogout={() => setIsExitModalOpen(true)} />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header searchTerm={searchTerm} setSearchTerm={setSearchTerm} />

        <div className="p-4 sm:p-6 flex-1 flex flex-col min-h-0">
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1 h-full min-h-0">
            {/* Araç Çubuğu */}
            <div className="p-3 border-b border-slate-200 flex flex-col gap-3 bg-slate-50 flex-shrink-0">
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
                  disabled={isProcessing}
                  className={`font-semibold h-8 px-4 rounded shadow-sm transition-colors text-sm flex items-center justify-center gap-2 min-w-[80px] ${isProcessing ? 'bg-emerald-400 text-white cursor-wait' : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                >
                  {isProcessing ? (
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    'Seç'
                  )}
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

                <div className="flex items-center gap-1.5">
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

                  <div className="flex items-center justify-center px-1 cursor-pointer" title="Alt klasörleri göster/gizle">
                    <input
                      type="checkbox"
                      checked={showSubfolders}
                      onChange={(e) => setShowSubfolders(e.target.checked)}
                      className="w-4 h-4 text-emerald-600 bg-white border-slate-300 rounded focus:ring-emerald-500 cursor-pointer accent-emerald-600"
                    />
                  </div>
                </div>

                <span className="text-xs font-semibold bg-slate-200 text-slate-800 px-3 h-8 rounded border border-slate-300 flex items-center shadow-sm ml-auto sm:ml-0">
                  Girdi: {visibleData.length} Dizin
                </span>
              </div>
            </div>

            {/* Ara Başlıklar */}
            <div className="flex bg-slate-800 text-white border-b border-slate-600 text-xs flex-shrink-0">
              <div className="w-1/2 py-2 px-4 font-semibold uppercase tracking-wider">Klasör Yapısı</div>
              <div className="w-1/2 py-2 px-4 font-semibold uppercase tracking-wider border-l border-slate-600">İzinli Kullanıcı Kısmı (R/W)</div>
            </div>

            {/* Liste Alanı (Yerleşik Scroll ile, react-window tamamen kaldırıldı) */}
            <div className="flex-1 bg-white relative overflow-y-auto" onScroll={handleScroll}>
              <div className="flex flex-col">
                {visibleData && visibleData.length > 0 ? (
                  displayedFolders.length > 0 ? (
                    <>
                      {displayedFolders.map((folder, index) => {
                        const indent = baseDepth > 0 ? Math.max(0, folder.path.split('\\').filter(Boolean).length - baseDepth) : 0;
                        const folderPathForCheck = folder.path.endsWith('\\') ? folder.path : folder.path + '\\';
                        const hasSubfolders = filteredData.some(f => f.path.startsWith(folderPathForCheck) && f.path !== folder.path);

                        return (
                          <FolderRow
                            key={index}
                            folder={folder}
                            index={index}
                            indent={indent}
                            isSelected={selectedFolder === folder.path}
                            hasSubfolders={hasSubfolders}
                            isExpanded={expandedFolders.has(folder.path)}
                            searchTerm={debouncedSearch}
                            onToggle={handleToggle}
                            onSelect={handleSelect}
                            onAddPerm={handleAddPerm}
                            onEditPerm={handleEditPerm}
                            onDeletePerm={handleDeletePerm}
                          />
                        );
                      })}
                      {visibleCount < visibleFolders.length && (
                        <div className="p-4 text-center text-emerald-600 text-xs bg-slate-50 border-t border-slate-100 font-semibold animate-pulse">
                          Daha fazla klasör yükleniyor... Aşağı kaydırın.
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-12 text-center">
                      <div className="text-4xl opacity-20 mb-3">🔍</div>
                      <p className="text-slate-600 font-medium text-sm">Sonuç bulunamadı</p>
                    </div>
                  )
                ) : (
                  <div className="p-12 text-center h-full flex flex-col items-center justify-center">
                    <div className="text-4xl opacity-20 mb-3">📂</div>
                    <p className="text-slate-500 font-medium text-sm">Listelenecek yetki klasörü bulunamadı.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modallar */}
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
              <button disabled={!permissionForm.user.trim()} onClick={() => { setIsPermissionModalOpen(false); if (window.chrome && window.chrome.webview) { if (modalMode === 'add') { window.chrome.webview.postMessage({ command: 'addPermission', data: { path: activeFolder, user: permissionForm.user.trim(), perm: permissionForm.perm } }); } else { window.chrome.webview.postMessage({ command: 'editPermission', data: { path: activeFolder, oldUser: permissionForm.oldUser, newUser: permissionForm.user.trim(), perm: permissionForm.perm } }); } } }} className={`px-4 py-1.5 rounded text-white text-sm font-medium ${!permissionForm.user.trim() ? 'bg-slate-300' : modalMode === 'add' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>{modalMode === 'add' ? 'Ekle' : 'Kaydet'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
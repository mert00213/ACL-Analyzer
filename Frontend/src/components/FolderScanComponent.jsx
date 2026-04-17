/**
 * FolderScanComponent.jsx
 * Klasör Tarama ve Backend İletişim Örneği
 */

import React, { useState } from 'react';
import { BackendService } from '../services/BackendService';

export default function FolderScanComponent() {
  const [scanResults, setScanResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Klasör Tarama Butonu
  const handleScanFolder = async () => {
    setLoading(true);
    setMessage("📁 Klasör seçimi için C# diyalog açılıyor...");

    BackendService.scanFolder(
      "C:\\example\\path",  // Gerçek uygulamada, kullanıcı seçer
      (results) => {
        setScanResults(results);
        setLoading(false);
        setMessage(
          `✅ Tarama tamamlandı! Toplam: ${results.totalCount}, Kritik: ${results.criticalCount}`
        );
      }
    );
  };

  // PDF Export
  const handleExportPdf = () => {
    setMessage("📄 PDF oluşturuluyor...");
    BackendService.exportPdf();
  };

  // Excel Export
  const handleExportExcel = () => {
    setMessage("📊 Excel oluşturuluyor...");
    BackendService.exportExcel();
  };

  // Backend mesajlarını dinle
  React.useEffect(() => {
    BackendService.onBackendMessage((detail) => {
      if (detail.type === 'success') {
        setMessage(`✅ ${detail.message}`);
      } else if (detail.type === 'error') {
        setMessage(`❌ ${detail.message}`);
      } else if (detail.type === 'status') {
        setMessage(`ℹ️ ${detail.message}`);
      }
    });
  }, []);

  return (
    <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-lg shadow-2xl">
      <h2 className="text-2xl font-bold text-white mb-4">🔐 ACL Permissions Scanner</h2>

      {/* Durum Mesajı */}
      <div className="mb-4 p-3 bg-slate-700 rounded text-white min-h-10">
        {message || "Hazır..."}
      </div>

      {/* Butonlar */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={handleScanFolder}
          disabled={loading}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg disabled:opacity-50"
        >
          📁 Klasör Tara
        </button>

        <button
          onClick={handleExportPdf}
          disabled={!scanResults}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg disabled:opacity-50"
        >
          📄 PDF İndir
        </button>

        <button
          onClick={handleExportExcel}
          disabled={!scanResults}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg disabled:opacity-50"
        >
          📊 Excel İndir
        </button>
      </div>

      {/* Sonuçlar */}
      {scanResults && (
        <div className="bg-slate-700 rounded-lg p-4 text-white">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-600 p-3 rounded">
              <p className="text-sm opacity-75">Toplam İnceleme</p>
              <p className="text-2xl font-bold">{scanResults.totalCount}</p>
            </div>
            <div className="bg-red-600 p-3 rounded">
              <p className="text-sm opacity-75">Kritik Risk</p>
              <p className="text-2xl font-bold">{scanResults.criticalCount}</p>
            </div>
            <div className="bg-yellow-600 p-3 rounded">
              <p className="text-sm opacity-75">Manuel Yetki</p>
              <p className="text-2xl font-bold">{scanResults.manualCount}</p>
            </div>
          </div>

          {/* Detay Tablosu */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left">Konum</th>
                  <th className="px-3 py-2 text-left">Kullanıcı</th>
                  <th className="px-3 py-2 text-left">Yetki</th>
                  <th className="px-3 py-2 text-left">Risk</th>
                </tr>
              </thead>
              <tbody>
                {scanResults.data?.slice(0, 10).map((item, idx) => (
                  <tr
                    key={idx}
                    className={
                      item.isCritical
                        ? "bg-red-900 hover:bg-red-800"
                        : "bg-slate-600 hover:bg-slate-500"
                    }
                  >
                    <td className="px-3 py-2 truncate">{item.path}</td>
                    <td className="px-3 py-2">{item.user}</td>
                    <td className="px-3 py-2">{item.permission}</td>
                    <td className="px-3 py-2">
                      {item.isCritical ? "⚠️ Kritik" : "✅ Normal"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {scanResults.data?.length > 10 && (
              <p className="text-center py-2 text-yellow-400">
                ... ve {scanResults.data.length - 10} daha
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

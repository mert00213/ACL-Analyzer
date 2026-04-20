import React from 'react';

export default function Sidebar({ onLogout }) {
  const handleScanFolder = () => {
    console.log('🔴 Butona tıklandı!');
    
    if (window.chrome && window.chrome.webview) {
      console.log('✅ WebView2 ortamı bulundu, mesaj gönderiliyor...');
      
      const message = {
        command: "scanFolder",
        data: { path: "C:\\" }
      };
      
      console.log('📤 Gönderilen mesaj:', JSON.stringify(message));
      
      try {
        window.chrome.webview.postMessage(message);
        console.log('✅ Mesaj başarıyla gönderildi!');
      } catch (error) {
        console.error('❌ Mesaj gönderme hatası:', error);
      }
    } else {
      console.error('❌ WebView2 ortamı bulunamadı! window.chrome.webview undefined');
      console.warn('💡 Bu uygulama WebView2 ortamında çalışmalıdır.');
    }
  };

  return (
    <div className="w-56 bg-[#00584E] text-white flex flex-col h-screen p-6">
      {/* Logo Section */}
      <div className="mb-8">
        <div className="bg-white p-2 rounded-lg inline-block mb-3 shadow-sm">
          <img src="/ern_holding.png" alt="Ern Holding Logo" className="w-24 h-auto" />
        </div>
        <div>
          <h1 className="text-lg font-bold leading-tight">Klasör Yetki Kontrol Sistemi</h1>
        </div>
      </div>

      {/* Klasör Seç Butonu */}
      <button
        onClick={handleScanFolder}
        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg mb-6 active:scale-95 active:shadow-inner"
      >
        📁 Klasör Seç
      </button>

      {/* Spacer */}
      <div className="flex-1"></div>

      {/* Footer / Çıkış */}
      <div className="mt-auto">
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold transition-colors duration-200 shadow-md hover:shadow-lg active:scale-95 active:shadow-inner"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Çıkış Yap
        </button>
        <div className="text-center mt-3 text-slate-500 text-[10px] font-medium tracking-wider">
          v1.0.1
        </div>
      </div>
    </div>
  );
}

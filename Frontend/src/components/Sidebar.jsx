import React from 'react';

export default function Sidebar() {
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
          <h1 className="text-xl font-bold">Ern Holding</h1>
          <p className="text-sm text-teal-50 opacity-75 mt-1">Ern Enerji</p>
        </div>
      </div>

      {/* Klasör Tara Butonu */}
      <button
        onClick={handleScanFolder}
        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg mb-6 active:scale-95 active:shadow-inner"
      >
        📁 Klasör Tara
      </button>

      {/* Spacer */}
      <div className="flex-1"></div>
    </div>
  );
}

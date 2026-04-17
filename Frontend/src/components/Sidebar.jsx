import React from 'react';

export default function Sidebar() {
  return (
    <div className="w-56 bg-[#00584E] text-white flex flex-col h-screen p-6">
      {/* Logo Section */}
      <div className="mb-8">
        <div className="bg-white p-2 rounded-lg inline-block mb-3 shadow-sm">
          <img src="/ern_holding.png" alt="Ern Enerji Logo" className="w-24 h-auto" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Ern Enerji</h1>
          <p className="text-sm text-teal-50 opacity-75 mt-1">Sistem Güvenliği</p>
        </div>
      </div>

     // Sidebar.jsx içindeki buton kısmı
<button 
  onClick={() => {
    if (window.chrome && window.chrome.webview) {
      window.chrome.webview.postMessage("scanFolder");
    }
  }}
  className="bg-red-500 text-white ..." // mevcut sınıfların kalsın
>
  Klasör Tara
</button>
      {/* Spacer */}
      <div className="flex-1"></div>
    </div>
  );
}

import React from 'react';

export default function Sidebar() {
  const handleScanFolder = () => {
    if (window.chrome && window.chrome.webview) {
      window.chrome.webview.postMessage({
        command: "scanFolder",
        data: { path: "C:\\" }
      });
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
        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg mb-6"
      >
        📁 Klasör Tara
      </button>

      {/* Spacer */}
      <div className="flex-1"></div>
    </div>
  );
}

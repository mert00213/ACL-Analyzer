import React from 'react';
import {
  LayoutList,
  FolderOpen,
  Users,
  FileText,
  Settings,
  HelpCircle,
  Plus,
} from 'lucide-react';

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
      {/* Main Navigation */}
      <nav className="space-y-2 flex-1">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-teal-700 cursor-pointer transition">
          <LayoutList size={20} />
          <span>Tasks</span>
        </div>
        
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-teal-600 text-white cursor-pointer transition">
          <FolderOpen size={20} />
          <span>Projects</span>
        </div>
        
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-teal-700 cursor-pointer transition">
          <Users size={20} />
          <span>Team</span>
        </div>
        
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-teal-700 cursor-pointer transition">
          <FileText size={20} />
          <span>Reports</span>
        </div>
      </nav>

      {/* Bottom Navigation */}
      <nav className="space-y-2 border-t border-teal-600 pt-6">
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-teal-700 cursor-pointer transition">
          <Settings size={20} />
          <span>Settings</span>
        </div>
        
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-teal-700 cursor-pointer transition">
          <HelpCircle size={20} />
          <span>Support</span>
        </div>
      </nav>
    </div>
  );
}

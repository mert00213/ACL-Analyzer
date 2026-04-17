import React from 'react';
import { Search } from 'lucide-react';

export default function Header() {
  return (
    <div className="bg-white border-b border-slate-200 px-8 py-6 flex items-center justify-between">
      <h1 className="text-2xl font-bold text-teal-900">Ortak Alan Yetki Analizi</h1>
      
      <div className="flex items-center gap-6">
        {/* Search Bar */}
        <div className="flex items-center bg-slate-100 rounded-lg px-4 py-2 w-64">
          <Search size={18} className="text-slate-400" />
          <input
            type="text"
            placeholder="Arama yap..."
            className="bg-transparent ml-2 outline-none w-full text-slate-700 placeholder-slate-500"
          />
        </div>
      </div>
    </div>
  );
}

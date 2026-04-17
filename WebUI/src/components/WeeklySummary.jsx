import React from 'react';

export default function WeeklySummary() {
  return (
    <div className="bg-[#00584E] text-white rounded-2xl p-8 shadow-md">
      <h3 className="text-lg font-semibold mb-3">Sistem Özeti</h3>
      <p className="text-teal-50 text-sm mb-8">Sistem taraması başarılı.</p>
      
      <div className="space-y-8">
        <div>
          <p className="text-teal-100 text-sm mb-1">Güvenli Yetkiler</p>
          <p className="text-5xl font-bold">245</p>
        </div>
        
        <div>
          <p className="text-teal-100 text-sm mb-1">Riskli Yetkiler</p>
          <p className="text-5xl font-bold">12</p>
        </div>
      </div>
    </div>
  );
}

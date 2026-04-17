import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function Deadlines() {
  const deadlines = [
    {
      date: 'NİS 20',
      title: 'Muhasebe Klasörü Denetimi',
      time: '14:00 Saati',
      isHighPriority: false,
    },
    {
      date: 'NİS 22',
      title: 'Yönetim Kurulu Raporlaması',
      time: '',
      isHighPriority: true,
    },
    {
      date: 'NİS 25',
      title: 'Sistem Güvenliği Güncellemesi',
      icon: '🔒',
      isHighPriority: false,
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800 mb-6">Yaklaşan Görevler</h3>

      <div className="space-y-4">
        {deadlines.map((deadline, idx) => (
          <div key={idx} className="flex gap-4 pb-4 border-b border-slate-200 last:border-0 last:pb-0">
            {/* Date Block */}
            <div className="bg-slate-100 rounded-lg p-3 text-center min-w-fit flex-shrink-0">
              <p className="text-xs font-semibold text-slate-500">
                {deadline.date.split(' ')[0]}
              </p>
              <p className="text-xl font-bold text-slate-800">
                {deadline.date.split(' ')[1]}
              </p>
            </div>

            {/* Content */}
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">{deadline.title}</p>
              {deadline.isHighPriority ? (
                <div className="flex items-center gap-1 mt-1">
                  <AlertTriangle size={14} className="text-red-500" />
                  <span className="text-xs font-semibold text-red-500">Yüksek Öncelik</span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-1">{deadline.time}</p>
              )}
            </div>

            {/* Icon if present */}
            {deadline.icon && (
              <div className="text-xl">{deadline.icon}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

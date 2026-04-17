import React from 'react';
import { FileText, MessageCircle, CheckCircle } from 'lucide-react';

export default function RecentActivity() {
  const activities = [
    {
      icon: FileText,
      title: 'Ahmet kullanıcısının yetkisi silindi',
      project: 'Sistem Yöneticisi',
      time: '2 saat önce',
      avatars: ['A', 'B'],
    },
    {
      icon: MessageCircle,
      title: 'İK klasörü erişim raporu oluşturuldu',
      project: 'İK Bölümü',
      time: '5 saat önce',
      avatars: ['C'],
    },
    {
      icon: CheckCircle,
      title: 'Maliye dairesi klasörü taraması tamamlandı',
      project: 'Sistem Taraması',
      time: 'Dün',
      avatars: ['D', 'E', 'F'],
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">Son Aktiviteler</h3>
        <a href="#" className="text-sm text-slate-500 hover:text-slate-700">Tümünü Gör</a>
      </div>

      <div className="space-y-4">
        {activities.map((activity, idx) => {
          const Icon = activity.icon;
          return (
            <div key={idx} className="flex gap-4 items-start pb-4 border-b border-slate-200 last:border-0 last:pb-0">
              {/* Icon Box */}
              <div className="h-10 w-10 bg-slate-200 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icon size={18} className="text-slate-600" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{activity.title}</p>
                <p className="text-xs text-slate-500 mt-1">{activity.project} • {activity.time}</p>
              </div>

              {/* Avatars */}
              <div className="flex -space-x-3 ml-4">
                {activity.avatars.map((avatar, i) => (
                  <div
                    key={i}
                    className="h-6 w-6 rounded-full bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-xs font-semibold text-white border-2 border-white"
                  >
                    {avatar}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React from 'react';
import { AlertCircle } from 'lucide-react';

export default function ProjectCard({ title, badge, badgeColor, progress, stats, blocked, statusColor }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
          badgeColor === 'green' 
            ? 'bg-emerald-100 text-emerald-700' 
            : 'bg-slate-200 text-slate-700'
        }`}>
          {badge}
        </span>
      </div>

      {/* Progress Circle */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative h-40 w-40 flex items-center justify-center">
          <svg className="transform -rotate-90" width="160" height="160">
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="#e2e8f0"
              strokeWidth="8"
              fill="none"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke={statusColor === 'green' ? '#10b981' : '#ef4444'}
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${progress * 4.4} 440`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute text-3xl font-bold text-slate-800">{progress}%</span>
        </div>
      </div>

      {/* Stats */}
      <div className="space-y-2">
        {stats.map((stat, idx) => (
          <div key={idx} className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{stat.label}</span>
            <span className="text-slate-800 font-semibold">{stat.value}</span>
          </div>
        ))}
        {blocked && (
          <div className="flex items-center gap-2 text-red-600 text-sm mt-3 pt-3 border-t border-slate-200">
            <AlertCircle size={16} />
            <span className="font-semibold">Blocked</span>
          </div>
        )}
      </div>
    </div>
  );
}

import { ReactNode } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  trend?: number;
  trendLabel?: string;
  accent?: string;
  className?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  accent = '#C41E3A',
  className = '',
}: StatCardProps) {
  const isPositiveTrend = trend !== undefined && trend >= 0;

  return (
    <div className={`bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {icon && (
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: `${accent}15` }}
          >
            <span style={{ color: accent }}>{icon}</span>
          </div>
        )}
      </div>
      <div className="mb-1">
        <span className="text-3xl font-bold text-gray-900">{value}</span>
      </div>
      {subtitle && <p className="text-xs text-gray-400 mb-2">{subtitle}</p>}
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${isPositiveTrend ? 'text-green-600' : 'text-red-600'}`}>
          {isPositiveTrend ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
          <span>{Math.abs(trend)}% {trendLabel || ''}</span>
        </div>
      )}
    </div>
  );
}

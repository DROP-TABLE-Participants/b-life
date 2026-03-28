type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

const riskConfig: Record<RiskLevel, { label: string; bg: string; text: string; border: string }> = {
  low: { label: 'Low Risk', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  medium: { label: 'Medium Risk', bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  high: { label: 'High Risk', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  critical: { label: 'Critical', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

interface RiskBadgeProps {
  level: RiskLevel | string;
  score?: number;
  className?: string;
}

export default function RiskBadge({ level, score, className = '' }: RiskBadgeProps) {
  const config = riskConfig[level as RiskLevel] || riskConfig.medium;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          level === 'critical'
            ? 'bg-red-500 animate-pulse'
            : level === 'high'
            ? 'bg-orange-500'
            : level === 'medium'
            ? 'bg-yellow-500'
            : 'bg-green-500'
        }`}
      />
      {config.label}
      {score !== undefined && <span className="opacity-70">({Math.round(score)}%)</span>}
    </span>
  );
}

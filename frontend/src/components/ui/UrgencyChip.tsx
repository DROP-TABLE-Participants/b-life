type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

const urgencyConfig: Record<UrgencyLevel, { label: string; classes: string }> = {
  low: { label: 'Low', classes: 'bg-green-100 text-green-800' },
  medium: { label: 'Medium', classes: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', classes: 'bg-orange-100 text-orange-800' },
  critical: { label: 'Critical', classes: 'bg-red-100 text-red-800' },
};

interface UrgencyChipProps {
  level: UrgencyLevel | string;
  className?: string;
}

export default function UrgencyChip({ level, className = '' }: UrgencyChipProps) {
  const config = urgencyConfig[level as UrgencyLevel] || urgencyConfig.medium;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.classes} ${className}`}>
      {config.label}
    </span>
  );
}

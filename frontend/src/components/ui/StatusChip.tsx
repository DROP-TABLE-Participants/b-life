type StatusValue = 'draft' | 'active' | 'completed' | 'cancelled' | 'booked' | 'confirmed';

const statusConfig: Record<StatusValue, { label: string; classes: string }> = {
  draft: { label: 'Draft', classes: 'bg-gray-100 text-gray-700' },
  active: { label: 'Active', classes: 'bg-green-100 text-green-700' },
  completed: { label: 'Completed', classes: 'bg-blue-100 text-blue-700' },
  cancelled: { label: 'Cancelled', classes: 'bg-red-100 text-red-700' },
  booked: { label: 'Booked', classes: 'bg-purple-100 text-purple-700' },
  confirmed: { label: 'Confirmed', classes: 'bg-teal-100 text-teal-700' },
};

interface StatusChipProps {
  status: StatusValue | string;
  className?: string;
}

export default function StatusChip({ status, className = '' }: StatusChipProps) {
  const config = statusConfig[status as StatusValue] || { label: status, classes: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${config.classes} ${className}`}>
      {config.label}
    </span>
  );
}

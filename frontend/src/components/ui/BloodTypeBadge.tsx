const bloodTypeColors: Record<string, string> = {
  'A+': 'bg-red-100 text-red-700 border-red-200',
  'A-': 'bg-red-50 text-red-600 border-red-100',
  'B+': 'bg-orange-100 text-orange-700 border-orange-200',
  'B-': 'bg-orange-50 text-orange-600 border-orange-100',
  'AB+': 'bg-purple-100 text-purple-700 border-purple-200',
  'AB-': 'bg-purple-50 text-purple-600 border-purple-100',
  'O+': 'bg-blue-100 text-blue-700 border-blue-200',
  'O-': 'bg-blue-50 text-blue-600 border-blue-100',
};

interface BloodTypeBadgeProps {
  bloodType: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function BloodTypeBadge({ bloodType, size = 'md', className = '' }: BloodTypeBadgeProps) {
  const colors = bloodTypeColors[bloodType] || 'bg-gray-100 text-gray-700 border-gray-200';
  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5 font-bold',
  };
  return (
    <span className={`inline-flex items-center border rounded-lg font-semibold ${colors} ${sizeClasses[size]} ${className}`}>
      {bloodType}
    </span>
  );
}

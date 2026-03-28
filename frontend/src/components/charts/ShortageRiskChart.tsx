'use client';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

interface ShortageRiskChartProps {
  data: Array<{ blood_type: string; risk_score: number; risk_level: string }>;
}

const riskColors: Record<string, string> = {
  critical: '#C41E3A',
  high: '#ea580c',
  medium: '#d97706',
  low: '#16a34a',
};

export default function ShortageRiskChart({ data }: ShortageRiskChartProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Blood Type Risk Levels</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="blood_type" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
          <Tooltip
            formatter={(value) => [`${Math.round(Number(value))}%`, "Risk Score"]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
          <Bar dataKey="risk_score" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={riskColors[entry.risk_level] || '#6b7280'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        {Object.entries(riskColors).map(([level, color]) => (
          <div key={level} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: color }} />
            <span className="text-xs text-gray-500 capitalize">{level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

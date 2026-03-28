'use client';
import {
  FunnelChart,
  Funnel,
  LabelList,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { CampaignAnalytics } from '@/types';

interface CampaignFunnelChartProps {
  analytics: CampaignAnalytics;
}

export default function CampaignFunnelChart({ analytics }: CampaignFunnelChartProps) {
  const data = [
    { name: 'Targeted', value: analytics.donors_targeted, fill: '#0F172A' },
    { name: 'Notified', value: analytics.donors_notified, fill: '#C41E3A' },
    { name: 'Booked', value: analytics.appointments_booked, fill: '#ea580c' },
    { name: 'Completed', value: analytics.appointments_completed, fill: '#16a34a' },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Campaign Funnel</h3>
      <ResponsiveContainer width="100%" height={260}>
        <FunnelChart>
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
          <Funnel dataKey="value" data={data} isAnimationActive>
            <LabelList position="right" fill="#374151" stroke="none" dataKey="name" style={{ fontSize: 12 }} />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-3 mt-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
            <div className="w-3 h-3 rounded-sm" style={{ background: item.fill }} />
            <div>
              <p className="text-xs text-gray-500">{item.name}</p>
              <p className="text-sm font-semibold text-gray-900">{item.value.toLocaleString()}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

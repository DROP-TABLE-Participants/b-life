'use client';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface ForecastDataPoint {
  date: string;
  risk_score: number;
  predicted_shortage_days?: number;
}

interface ForecastChartProps {
  data: ForecastDataPoint[];
  title?: string;
}

export default function ForecastChart({ data, title = 'Risk Forecast (30 days)' }: ForecastChartProps) {
  const formatted = data.map((d) => ({
    ...d,
    displayDate: (() => {
      try {
        return format(parseISO(d.date), 'MMM d');
      } catch {
        return d.date;
      }
    })(),
  }));

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={formatted} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
          <defs>
            <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#C41E3A" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#C41E3A" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="displayDate" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
          <Tooltip
            formatter={(value) => [`${Math.round(Number(value))}%`, "Risk Score"]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
          <ReferenceLine y={70} stroke="#C41E3A" strokeDasharray="4 4" label={{ value: 'High Risk', fill: '#C41E3A', fontSize: 10 }} />
          <ReferenceLine y={40} stroke="#d97706" strokeDasharray="4 4" label={{ value: 'Medium', fill: '#d97706', fontSize: 10 }} />
          <Area
            type="monotone"
            dataKey="risk_score"
            stroke="#C41E3A"
            strokeWidth={2}
            fill="url(#riskGradient)"
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import type { CampaignAnalytics } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BarChart3, TrendingDown, Users, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

const MOCK_ANALYTICS: CampaignAnalytics = {
  campaign_id: 1,
  donors_targeted: 1240,
  donors_notified: 1087,
  appointments_booked: 387,
  appointments_completed: 312,
  risk_before: 79,
  risk_after: 38,
  bookings_by_day: Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400000).toISOString().split('T')[0],
    count: Math.floor(Math.random() * 40) + 10,
  })),
  blood_type_impact: [
    { blood_type: 'O-', risk_before: 89, risk_after: 42 },
    { blood_type: 'AB-', risk_before: 85, risk_after: 40 },
    { blood_type: 'B-', risk_before: 72, risk_after: 35 },
    { blood_type: 'A-', risk_before: 68, risk_after: 31 },
    { blood_type: 'O+', risk_before: 45, risk_after: 22 },
  ],
};

const MOCK_SHORTAGE_IMPACT = [
  { blood_type: 'O-', risk_before: 89, risk_after: 42 },
  { blood_type: 'AB-', risk_before: 85, risk_after: 40 },
  { blood_type: 'B-', risk_before: 72, risk_after: 35 },
  { blood_type: 'A-', risk_before: 68, risk_after: 31 },
  { blood_type: 'O+', risk_before: 45, risk_after: 22 },
  { blood_type: 'A+', risk_before: 38, risk_after: 18 },
  { blood_type: 'B+', risk_before: 22, risk_after: 10 },
  { blood_type: 'AB+', risk_before: 15, risk_after: 8 },
];

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<CampaignAnalytics>(MOCK_ANALYTICS);
  const [shortageImpact, setShortageImpact] = useState(MOCK_SHORTAGE_IMPACT);

  useEffect(() => {
    Promise.all([
      api.getCampaignAnalytics(1).catch(() => MOCK_ANALYTICS),
      api.getShortageImpact().catch(() => MOCK_SHORTAGE_IMPACT),
    ]).then(([a, si]) => {
      setAnalytics(a);
      setShortageImpact(si.length > 0 ? si : MOCK_SHORTAGE_IMPACT);
    });
  }, []);

  const conversionRate = analytics.donors_targeted > 0
    ? ((analytics.appointments_completed / analytics.donors_targeted) * 100).toFixed(1)
    : '0';

  const bookingRate = analytics.donors_notified > 0
    ? ((analytics.appointments_booked / analytics.donors_notified) * 100).toFixed(1)
    : '0';

  return (
    <DashboardLayout title="Analytics" subtitle="Platform-wide performance metrics">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {[
          {
            label: 'Total Donors Targeted',
            value: analytics.donors_targeted.toLocaleString(),
            icon: <Users className="w-5 h-5" />,
            color: '#0F172A',
          },
          {
            label: 'Appointments Completed',
            value: analytics.appointments_completed.toLocaleString(),
            icon: <CheckCircle className="w-5 h-5" />,
            color: '#16a34a',
          },
          {
            label: 'Conversion Rate',
            value: `${conversionRate}%`,
            icon: <BarChart3 className="w-5 h-5" />,
            color: '#C41E3A',
          },
          {
            label: 'Risk Reduction',
            value: `${Math.round(analytics.risk_before - analytics.risk_after)}%`,
            icon: <TrendingDown className="w-5 h-5" />,
            color: '#2563eb',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-medium text-gray-500">{kpi.label}</p>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${kpi.color}15` }}>
                <span style={{ color: kpi.color }}>{kpi.icon}</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Bookings by day */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Appointment Bookings</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics.bookings_by_day} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(v) => {
                  try { return format(new Date(v), 'MMM d'); } catch { return v; }
                }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
                labelFormatter={(v) => {
                  try { return format(new Date(v as string), 'MMMM d, yyyy'); } catch { return v as string; }
                }}
              />
              <Bar dataKey="count" fill="#C41E3A" radius={[4, 4, 0, 0]} name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Campaign funnel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Donor Funnel Performance</h3>
          <div className="space-y-3 mt-4">
            {[
              { label: 'Donors Targeted', value: analytics.donors_targeted, pct: 100, color: '#0F172A' },
              { label: 'Notifications Sent', value: analytics.donors_notified, pct: Math.round((analytics.donors_notified / analytics.donors_targeted) * 100), color: '#C41E3A' },
              { label: 'Appointments Booked', value: analytics.appointments_booked, pct: Math.round((analytics.appointments_booked / analytics.donors_targeted) * 100), color: '#ea580c' },
              { label: 'Completed Donations', value: analytics.appointments_completed, pct: Math.round((analytics.appointments_completed / analytics.donors_targeted) * 100), color: '#16a34a' },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1 text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-semibold text-gray-900">{item.value.toLocaleString()} <span className="text-gray-400 font-normal text-xs">({item.pct}%)</span></span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${item.pct}%`, background: item.color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Booking Rate: <strong className="text-gray-700">{bookingRate}%</strong> · Completion Rate: <strong className="text-gray-700">{conversionRate}%</strong>
          </div>
        </div>
      </div>

      {/* Blood type impact */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Shortage Risk Impact by Blood Type</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={shortageImpact} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="blood_type" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(value) => [`${Math.round(Number(value))}%`]}
            />
            <Legend />
            <Bar dataKey="risk_before" name="Before Campaign" fill="#fca5a5" radius={[4, 4, 0, 0]} />
            <Bar dataKey="risk_after" name="After Campaign" fill="#C41E3A" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </DashboardLayout>
  );
}

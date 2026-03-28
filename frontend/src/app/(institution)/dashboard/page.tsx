'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatCard from '@/components/ui/StatCard';
import RiskBadge from '@/components/ui/RiskBadge';
import ShortageRiskChart from '@/components/charts/ShortageRiskChart';
import StatusChip from '@/components/ui/StatusChip';
import UrgencyChip from '@/components/ui/UrgencyChip';
import BloodTypeBadge from '@/components/ui/BloodTypeBadge';
import { api } from '@/lib/api';
import type { DashboardOverview } from '@/types';
import { Megaphone, Users, AlertTriangle, TrendingUp, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

const MOCK_OVERVIEW: DashboardOverview = {
  active_campaigns: 4,
  donors_targeted_today: 312,
  avg_shortage_risk: 62,
  critical_alerts: 2,
  blood_type_risks: [
    { blood_type: 'O-', risk_level: 'critical', risk_score: 89, available_units: 12 },
    { blood_type: 'AB-', risk_level: 'critical', risk_score: 85, available_units: 8 },
    { blood_type: 'B-', risk_level: 'high', risk_score: 72, available_units: 24 },
    { blood_type: 'A-', risk_level: 'high', risk_score: 68, available_units: 31 },
    { blood_type: 'O+', risk_level: 'medium', risk_score: 45, available_units: 87 },
    { blood_type: 'A+', risk_level: 'medium', risk_score: 38, available_units: 110 },
    { blood_type: 'B+', risk_level: 'low', risk_score: 22, available_units: 145 },
    { blood_type: 'AB+', risk_level: 'low', risk_score: 15, available_units: 203 },
  ],
  recent_campaigns: [
    {
      id: 1,
      title: 'Emergency O- Drive - Central Hospital',
      blood_type: 'O-',
      urgency_level: 'critical',
      status: 'active',
      city: 'Casablanca',
      target_radius_km: 25,
      blood_center_id: 1,
      institution_id: 1,
      description: 'Critical shortage emergency campaign',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 2,
      title: 'AB- Awareness Campaign',
      blood_type: 'AB-',
      urgency_level: 'high',
      status: 'active',
      city: 'Rabat',
      target_radius_km: 30,
      blood_center_id: 2,
      institution_id: 1,
      description: 'AB- blood type awareness',
      created_at: new Date(Date.now() - 86400000).toISOString(),
      updated_at: new Date(Date.now() - 86400000).toISOString(),
    },
  ],
  high_risk_forecasts: [
    {
      city: 'Casablanca',
      blood_type: 'O-',
      risk_score: 89,
      risk_level: 'critical',
      predicted_shortage_days: 3,
      current_stock_units: 12,
      daily_demand_units: 4,
      confidence_score: 0.91,
      contributing_factors: ['High demand', 'Low stock', 'Seasonal pattern'],
      recommended_action: 'Launch emergency campaign immediately',
      forecast_date: new Date().toISOString(),
    },
    {
      city: 'Rabat',
      blood_type: 'AB-',
      risk_score: 85,
      risk_level: 'critical',
      predicted_shortage_days: 5,
      current_stock_units: 8,
      daily_demand_units: 2,
      confidence_score: 0.88,
      contributing_factors: ['Rare blood type', 'Low donor pool'],
      recommended_action: 'Activate targeted donor campaign',
      forecast_date: new Date().toISOString(),
    },
  ],
};

export default function DashboardPage() {
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await api.getDashboardOverview();
      setOverview(data);
    } catch {
      setOverview(MOCK_OVERVIEW);
    } finally {
      setLoading(false);
      setLastUpdated(new Date());
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const data = overview || MOCK_OVERVIEW;

  return (
    <DashboardLayout
      title="Operations Dashboard"
      subtitle={`Last updated: ${format(lastUpdated, 'PPp')}`}
    >
      {/* Refresh button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Active Campaigns"
          value={data.active_campaigns}
          icon={<Megaphone className="w-5 h-5" />}
          subtitle="Currently running"
        />
        <StatCard
          title="Donors Targeted Today"
          value={data.donors_targeted_today.toLocaleString()}
          icon={<Users className="w-5 h-5" />}
          subtitle="Notifications sent"
        />
        <StatCard
          title="Avg Shortage Risk"
          value={`${Math.round(data.avg_shortage_risk)}%`}
          icon={<TrendingUp className="w-5 h-5" />}
          subtitle="Across all blood types"
          accent={data.avg_shortage_risk > 70 ? '#C41E3A' : data.avg_shortage_risk > 40 ? '#d97706' : '#16a34a'}
        />
        <StatCard
          title="Critical Alerts"
          value={data.critical_alerts}
          icon={<AlertTriangle className="w-5 h-5" />}
          subtitle="Require immediate action"
          accent="#C41E3A"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        {/* Risk chart */}
        <div className="xl:col-span-2">
          <ShortageRiskChart data={data.blood_type_risks} />
        </div>

        {/* Blood type risk table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Stock Levels by Blood Type</h3>
          <div className="space-y-2.5">
            {data.blood_type_risks.map((item) => (
              <div key={item.blood_type} className="flex items-center gap-3">
                <BloodTypeBadge bloodType={item.blood_type} size="sm" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-500">{item.available_units} units</span>
                    <span className="text-xs font-semibold text-gray-700">{Math.round(item.risk_score)}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${item.risk_score}%`,
                        background: item.risk_level === 'critical' ? '#C41E3A' : item.risk_level === 'high' ? '#ea580c' : item.risk_level === 'medium' ? '#d97706' : '#16a34a',
                      }}
                    />
                  </div>
                </div>
                <RiskBadge level={item.risk_level} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent campaigns + High risk forecasts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent campaigns */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Recent Campaigns</h3>
            <a href="/campaigns" className="text-xs text-[#C41E3A] hover:underline font-medium">View all →</a>
          </div>
          {data.recent_campaigns.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No active campaigns</p>
          ) : (
            <div className="space-y-3">
              {data.recent_campaigns.map((c) => (
                <div key={c.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition">
                  <BloodTypeBadge bloodType={c.blood_type} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.title}</p>
                    <p className="text-xs text-gray-400">{c.city} · {format(new Date(c.created_at), 'MMM d')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusChip status={c.status} />
                    <UrgencyChip level={c.urgency_level} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* High risk forecasts */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">High Risk Forecasts</h3>
            <a href="/forecast" className="text-xs text-[#C41E3A] hover:underline font-medium">View all →</a>
          </div>
          {data.high_risk_forecasts.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">No high risk forecasts</p>
          ) : (
            <div className="space-y-3">
              {data.high_risk_forecasts.map((f, i) => (
                <div key={i} className="p-3 rounded-lg border border-red-100 bg-red-50">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <BloodTypeBadge bloodType={f.blood_type} size="sm" />
                      <span className="text-sm font-semibold text-gray-900">{f.city}</span>
                    </div>
                    <RiskBadge level={f.risk_level} score={f.risk_score} />
                  </div>
                  <p className="text-xs text-gray-600 mb-1">
                    Shortage in <strong className="text-red-700">{f.predicted_shortage_days} days</strong> · {f.current_stock_units} units remaining
                  </p>
                  <p className="text-xs text-gray-500 italic">{f.recommended_action}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

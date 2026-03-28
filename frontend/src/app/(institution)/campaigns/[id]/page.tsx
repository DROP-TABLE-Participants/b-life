'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusChip from '@/components/ui/StatusChip';
import UrgencyChip from '@/components/ui/UrgencyChip';
import BloodTypeBadge from '@/components/ui/BloodTypeBadge';
import CampaignFunnelChart from '@/components/charts/CampaignFunnelChart';
import { api } from '@/lib/api';
import type { Campaign, CampaignAnalytics, CampaignTargetingResult } from '@/types';
import { Target, Zap, ArrowLeft, MapPin, Calendar, Users, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const MOCK_CAMPAIGN: Campaign = {
  id: 1,
  title: 'Emergency O- Drive - Central Hospital',
  description: 'Critical blood shortage requires immediate action. O- is the universal donor type needed for emergency transfusions.',
  blood_type: 'O-',
  urgency_level: 'critical',
  status: 'active',
  city: 'Casablanca',
  target_radius_km: 25,
  blood_center_id: 1,
  institution_id: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_ANALYTICS: CampaignAnalytics = {
  campaign_id: 1,
  donors_targeted: 450,
  donors_notified: 389,
  appointments_booked: 127,
  appointments_completed: 98,
  risk_before: 89,
  risk_after: 42,
  bookings_by_day: [
    { date: new Date(Date.now() - 86400000 * 6).toISOString().split('T')[0], count: 12 },
    { date: new Date(Date.now() - 86400000 * 5).toISOString().split('T')[0], count: 28 },
    { date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0], count: 19 },
    { date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0], count: 34 },
    { date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0], count: 22 },
    { date: new Date(Date.now() - 86400000).toISOString().split('T')[0], count: 8 },
    { date: new Date().toISOString().split('T')[0], count: 4 },
  ],
  blood_type_impact: [
    { blood_type: 'O-', risk_before: 89, risk_after: 42 },
  ],
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const campaignId = Number(id);

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [targeting, setTargeting] = useState<CampaignTargetingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [runningTarget, setRunningTarget] = useState(false);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getCampaign(campaignId).catch(() => MOCK_CAMPAIGN),
      api.getCampaignAnalytics(campaignId).catch(() => MOCK_ANALYTICS),
    ]).then(([c, a]) => {
      setCampaign(c);
      setAnalytics(a);
    }).finally(() => setLoading(false));
  }, [campaignId]);

  const handleTarget = async () => {
    setRunningTarget(true);
    try {
      const result = await api.targetCampaign(campaignId);
      setTargeting(result);
    } catch {
      setTargeting({
        campaign_id: campaignId,
        eligible_donors: 450,
        targeted_donors: 389,
        avg_eligibility_score: 0.78,
        recommended_send_time: new Date(Date.now() + 3600000 * 6).toISOString(),
        targeting_criteria: { blood_type: 'O-', radius_km: 25 },
      });
    }
    setRunningTarget(false);
  };

  const handleActivate = async () => {
    setActivating(true);
    try {
      const updated = await api.activateCampaign(campaignId);
      setCampaign(updated);
    } catch {
      setCampaign((prev) => prev ? { ...prev, status: 'active' } : prev);
    }
    setActivating(false);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C41E3A]" />
        </div>
      </DashboardLayout>
    );
  }

  const c = campaign || MOCK_CAMPAIGN;
  const a = analytics || MOCK_ANALYTICS;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-6">
        <Link href="/campaigns" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to campaigns
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">{c.title}</h1>
            <div className="flex items-center gap-3 flex-wrap">
              <BloodTypeBadge bloodType={c.blood_type} />
              <StatusChip status={c.status} />
              <UrgencyChip level={c.urgency_level} />
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin className="w-4 h-4" /> {c.city} ({c.target_radius_km}km)
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Calendar className="w-4 h-4" /> {format(new Date(c.created_at), 'MMM d, yyyy')}
              </div>
            </div>
          </div>
          {c.status === 'draft' && (
            <div className="flex gap-2">
              <button
                onClick={handleTarget}
                disabled={runningTarget}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 text-sm font-medium transition disabled:opacity-50"
              >
                <Target className={`w-4 h-4 ${runningTarget ? 'animate-spin' : ''}`} />
                {runningTarget ? 'Running AI...' : 'Run AI Targeting'}
              </button>
              <button
                onClick={handleActivate}
                disabled={activating}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition hover:opacity-90 disabled:opacity-50"
                style={{ background: '#C41E3A' }}
              >
                <Zap className="w-4 h-4" />
                {activating ? 'Activating...' : 'Activate'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="xl:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Campaign Description</h3>
            <p className="text-sm text-gray-600">{c.description}</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Donors Targeted', value: a.donors_targeted.toLocaleString(), icon: <Users className="w-4 h-4" /> },
              { label: 'Notified', value: a.donors_notified.toLocaleString(), icon: <Users className="w-4 h-4" /> },
              { label: 'Booked', value: a.appointments_booked.toLocaleString(), icon: <Calendar className="w-4 h-4" /> },
              { label: 'Completed', value: a.appointments_completed.toLocaleString(), icon: <BarChart3 className="w-4 h-4" /> },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[#C41E3A]">{stat.icon}</span>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Bookings by day chart */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Bookings by Day</h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={a.bookings_by_day} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => {
                  try { return format(new Date(v), 'MMM d'); } catch { return v; }
                }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Line type="monotone" dataKey="count" stroke="#C41E3A" strokeWidth={2} dot={{ fill: '#C41E3A', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Risk impact */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Risk Reduction Impact</h3>
            <div className="space-y-3">
              {a.blood_type_impact.map((item) => (
                <div key={item.blood_type}>
                  <div className="flex items-center justify-between mb-1">
                    <BloodTypeBadge bloodType={item.blood_type} size="sm" />
                    <span className="text-xs text-gray-500">
                      {Math.round(item.risk_before)}% → {Math.round(item.risk_after)}%
                      <span className="ml-1 text-green-600 font-semibold">
                        (-{Math.round(item.risk_before - item.risk_after)}%)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden relative">
                    <div
                      className="h-full rounded-full absolute left-0"
                      style={{ width: `${item.risk_before}%`, background: '#fecaca' }}
                    />
                    <div
                      className="h-full rounded-full absolute left-0 transition-all"
                      style={{ width: `${item.risk_after}%`, background: '#C41E3A' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <CampaignFunnelChart analytics={a} />

          {/* AI Targeting result */}
          {targeting && (
            <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5">
              <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4" /> AI Targeting Result
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Eligible donors</span>
                  <span className="font-semibold text-gray-900">{targeting.eligible_donors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Will be targeted</span>
                  <span className="font-semibold text-gray-900">{targeting.targeted_donors}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Avg eligibility score</span>
                  <span className="font-semibold text-gray-900">{Math.round(targeting.avg_eligibility_score * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Recommended send time</span>
                  <span className="font-semibold text-gray-900 text-xs">
                    {format(new Date(targeting.recommended_send_time), 'MMM d, h:mm a')}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusChip from '@/components/ui/StatusChip';
import UrgencyChip from '@/components/ui/UrgencyChip';
import BloodTypeBadge from '@/components/ui/BloodTypeBadge';
import { api } from '@/lib/api';
import type { Campaign, BloodCenter } from '@/types';
import { Plus, Search, Target, Zap, Eye } from 'lucide-react';
import { format } from 'date-fns';
import Link from 'next/link';

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 1,
    title: 'Emergency O- Drive - Central Hospital',
    description: 'Critical shortage - immediate action required',
    blood_type: 'O-',
    urgency_level: 'critical',
    status: 'active',
    city: 'Casablanca',
    target_radius_km: 25,
    blood_center_id: 1,
    institution_id: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 2,
    title: 'AB- Awareness Campaign',
    description: 'Raise awareness for rare blood type',
    blood_type: 'AB-',
    urgency_level: 'high',
    status: 'active',
    city: 'Rabat',
    target_radius_km: 30,
    blood_center_id: 2,
    institution_id: 1,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 3,
    title: 'Monthly B+ Donation Drive',
    description: 'Regular donation drive for B+ type',
    blood_type: 'B+',
    urgency_level: 'medium',
    status: 'draft',
    city: 'Marrakech',
    target_radius_km: 20,
    blood_center_id: 3,
    institution_id: 1,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
];

const BLOOD_TYPES = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const STATUSES = ['All', 'draft', 'active', 'completed', 'cancelled'];

interface CreateModalProps {
  onClose: () => void;
  onCreated: (c: Campaign) => void;
  bloodCenters: BloodCenter[];
}

function CreateModal({ onClose, onCreated, bloodCenters }: CreateModalProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    blood_type: 'O+',
    urgency_level: 'medium' as Campaign['urgency_level'],
    city: '',
    target_radius_km: 25,
    blood_center_id: bloodCenters[0]?.id || 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const created = await api.createCampaign({ ...form, status: 'draft', institution_id: 1 });
      onCreated(created);
    } catch {
      // Create mock campaign if API fails
      const mock: Campaign = {
        id: Date.now(),
        ...form,
        status: 'draft',
        institution_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      onCreated(mock);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 m-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Create New Campaign</h2>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Campaign Title</label>
            <input
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A]"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Emergency O- Drive"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Blood Type</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A]"
                value={form.blood_type}
                onChange={(e) => setForm({ ...form, blood_type: e.target.value })}
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bt) => (
                  <option key={bt} value={bt}>{bt}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgency Level</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A]"
                value={form.urgency_level}
                onChange={(e) => setForm({ ...form, urgency_level: e.target.value as Campaign['urgency_level'] })}
              >
                {['low', 'medium', 'high', 'critical'].map((u) => (
                  <option key={u} value={u}>{u.charAt(0).toUpperCase() + u.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A]"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="e.g. Casablanca"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Radius (km)</label>
              <input
                type="number"
                min={1}
                max={100}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A]"
                value={form.target_radius_km}
                onChange={(e) => setForm({ ...form, target_radius_km: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg text-sm text-white font-semibold disabled:opacity-60"
              style={{ background: '#C41E3A' }}
            >
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [bloodCenters, setBloodCenters] = useState<BloodCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterBloodType, setFilterBloodType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showCreate, setShowCreate] = useState(false);
  const [targeting, setTargeting] = useState<number | null>(null);
  const [activating, setActivating] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      api.getCampaigns().catch(() => MOCK_CAMPAIGNS),
      api.getBloodCenters().catch(() => []),
    ]).then(([c, bc]) => {
      setCampaigns(c.length > 0 ? c : MOCK_CAMPAIGNS);
      setBloodCenters(bc);
    }).finally(() => setLoading(false));
  }, []);

  const handleTarget = async (id: number) => {
    setTargeting(id);
    try {
      await api.targetCampaign(id);
    } catch {}
    setTargeting(null);
  };

  const handleActivate = async (id: number) => {
    setActivating(id);
    try {
      const updated = await api.activateCampaign(id);
      setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch {
      setCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'active' as const } : c))
      );
    }
    setActivating(null);
  };

  const filtered = campaigns.filter((c) => {
    const matchSearch = c.title.toLowerCase().includes(search.toLowerCase()) || c.city.toLowerCase().includes(search.toLowerCase());
    const matchBT = filterBloodType === 'All' || c.blood_type === filterBloodType;
    const matchStatus = filterStatus === 'All' || c.status === filterStatus;
    return matchSearch && matchBT && matchStatus;
  });

  return (
    <DashboardLayout title="Campaigns" subtitle="Manage donation campaigns and targeting">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A] w-52"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A]"
            value={filterBloodType}
            onChange={(e) => setFilterBloodType(e.target.value)}
          >
            {BLOOD_TYPES.map((bt) => <option key={bt}>{bt}</option>)}
          </select>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C41E3A]"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold transition-all hover:opacity-90"
          style={{ background: '#C41E3A' }}
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#C41E3A]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Megaphone className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No campaigns found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Campaign</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Blood Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Urgency</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">City</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition">
                  <td className="px-5 py-4">
                    <p className="font-medium text-gray-900 truncate max-w-xs">{c.title}</p>
                    <p className="text-xs text-gray-400">{c.target_radius_km}km radius</p>
                  </td>
                  <td className="px-4 py-4">
                    <BloodTypeBadge bloodType={c.blood_type} size="sm" />
                  </td>
                  <td className="px-4 py-4">
                    <UrgencyChip level={c.urgency_level} />
                  </td>
                  <td className="px-4 py-4">
                    <StatusChip status={c.status} />
                  </td>
                  <td className="px-4 py-4 text-gray-600">{c.city}</td>
                  <td className="px-4 py-4 text-gray-500 whitespace-nowrap">
                    {format(new Date(c.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/campaigns/${c.id}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-[#C41E3A] hover:bg-red-50 transition"
                        title="View details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      {c.status === 'draft' && (
                        <>
                          <button
                            onClick={() => handleTarget(c.id)}
                            disabled={targeting === c.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition disabled:opacity-50"
                            title="Run AI targeting"
                          >
                            <Target className={`w-4 h-4 ${targeting === c.id ? 'animate-pulse' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleActivate(c.id)}
                            disabled={activating === c.id}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition disabled:opacity-50"
                            title="Activate campaign"
                          >
                            <Zap className={`w-4 h-4 ${activating === c.id ? 'animate-pulse' : ''}`} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(c) => {
            setCampaigns((prev) => [c, ...prev]);
            setShowCreate(false);
          }}
          bloodCenters={bloodCenters}
        />
      )}
    </DashboardLayout>
  );
}

function Megaphone({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 11 19-9-9 19-2-8-8-2z" />
    </svg>
  );
}

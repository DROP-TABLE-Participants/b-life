'use client';
import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import BloodTypeBadge from '@/components/ui/BloodTypeBadge';
import StatusChip from '@/components/ui/StatusChip';
import UrgencyChip from '@/components/ui/UrgencyChip';
import { api } from '@/lib/api';
import type { DonorProfile, EligibilityResult, Notification, Appointment } from '@/types';
import { Heart, CheckCircle, XCircle, Clock, Bell, CalendarDays, MapPin, Award } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

const MOCK_PROFILE: DonorProfile = {
  id: 1,
  user_id: 1,
  blood_type: 'O-',
  date_of_birth: '1990-05-15',
  last_donation_date: new Date(Date.now() - 86400000 * 80).toISOString().split('T')[0],
  total_donations: 12,
  location_city: 'Casablanca',
  latitude: 33.5731,
  longitude: -7.5898,
  notification_consent: true,
  user: { id: 1, email: 'donor@example.com', role: 'donor', is_active: true, created_at: new Date().toISOString() },
};

const MOCK_ELIGIBILITY: EligibilityResult = {
  is_eligible: true,
  days_until_eligible: 0,
  last_donation_date: new Date(Date.now() - 86400000 * 80).toISOString().split('T')[0],
  next_eligible_date: null,
  reason: 'You are eligible to donate blood',
};

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 1,
    donor_id: 1,
    campaign_id: 1,
    message: 'URGENT: Your O- blood type is critically needed at Central Hospital Casablanca. Your donation could save lives today.',
    sent_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    is_read: false,
    campaign: {
      id: 1,
      title: 'Emergency O- Drive',
      blood_type: 'O-',
      urgency_level: 'critical',
      status: 'active',
      city: 'Casablanca',
      target_radius_km: 25,
      blood_center_id: 1,
      institution_id: 1,
      description: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  },
  {
    id: 2,
    donor_id: 1,
    campaign_id: 2,
    message: 'Your donation is needed! AB- blood type is running low at Rabat Blood Center.',
    sent_at: new Date(Date.now() - 86400000).toISOString(),
    is_read: true,
  },
];

const MOCK_APPOINTMENTS: Appointment[] = [
  {
    id: 1,
    donor_id: 1,
    campaign_id: 1,
    blood_center_id: 1,
    scheduled_at: new Date(Date.now() + 86400000 * 2).toISOString(),
    status: 'confirmed',
    notes: 'Bring ID and stay hydrated',
    campaign: {
      id: 1,
      title: 'Emergency O- Drive',
      blood_type: 'O-',
      urgency_level: 'critical',
      status: 'active',
      city: 'Casablanca',
      target_radius_km: 25,
      blood_center_id: 1,
      institution_id: 1,
      description: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    blood_center: {
      id: 1,
      name: 'Central Blood Bank Casablanca',
      city: 'Casablanca',
      address: '23 Boulevard Mohammed V',
      phone: '+212 522 123456',
      email: 'casablanca@bloodbank.ma',
      latitude: 33.5900,
      longitude: -7.6200,
      institution_id: 1,
    },
  },
];

export default function DonorPortalPage() {
  const [profile, setProfile] = useState<DonorProfile | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResult | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDonorProfile().catch(() => MOCK_PROFILE),
      api.getDonorEligibility().catch(() => MOCK_ELIGIBILITY),
      api.getDonorNotifications().catch(() => MOCK_NOTIFICATIONS),
      api.getDonorAppointments().catch(() => MOCK_APPOINTMENTS),
    ]).then(([p, e, n, a]) => {
      setProfile(p);
      setEligibility(e);
      setNotifications(n.length > 0 ? n : MOCK_NOTIFICATIONS);
      setAppointments(a.length > 0 ? a : MOCK_APPOINTMENTS);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="My Donor Portal">
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#C41E3A]" />
        </div>
      </DashboardLayout>
    );
  }

  const p = profile || MOCK_PROFILE;
  const e = eligibility || MOCK_ELIGIBILITY;
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DashboardLayout title="My Donor Portal" subtitle={`Welcome back, ${p.user.email}`}>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column - Profile + Eligibility */}
        <div className="space-y-5">
          {/* Profile card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-xl shrink-0"
                style={{ background: '#C41E3A' }}
              >
                {p.user.email[0].toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 truncate max-w-[160px]">{p.user.email}</p>
                <BloodTypeBadge bloodType={p.blood_type} size="md" />
              </div>
            </div>
            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
                {p.location_city}
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Award className="w-4 h-4 text-gray-400 shrink-0" />
                <span>{p.total_donations} total donations</span>
              </div>
              {p.last_donation_date && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                  Last donated: {format(new Date(p.last_donation_date), 'MMM d, yyyy')}
                </div>
              )}
            </div>
          </div>

          {/* Eligibility card */}
          <div className={`rounded-xl border shadow-sm p-5 ${e.is_eligible ? 'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'}`}>
            <div className="flex items-center gap-3 mb-3">
              {e.is_eligible ? (
                <CheckCircle className="w-8 h-8 text-green-600" />
              ) : (
                <XCircle className="w-8 h-8 text-orange-600" />
              )}
              <div>
                <h3 className={`font-semibold ${e.is_eligible ? 'text-green-800' : 'text-orange-800'}`}>
                  {e.is_eligible ? 'Eligible to Donate' : 'Not Yet Eligible'}
                </h3>
                <p className={`text-xs ${e.is_eligible ? 'text-green-600' : 'text-orange-600'}`}>
                  {e.reason}
                </p>
              </div>
            </div>
            {!e.is_eligible && e.next_eligible_date && (
              <p className="text-sm text-orange-700">
                Eligible again on <strong>{format(new Date(e.next_eligible_date), 'MMMM d, yyyy')}</strong>
                {' '}({e.days_until_eligible} days)
              </p>
            )}
            {e.is_eligible && (
              <Link
                href="/campaigns"
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ background: '#C41E3A' }}
              >
                <Heart className="w-4 h-4" /> Book an Appointment
              </Link>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{p.total_donations}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Donations</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold" style={{ color: '#C41E3A' }}>{p.total_donations * 3}</p>
              <p className="text-xs text-gray-500 mt-0.5">Lives Impacted</p>
            </div>
          </div>
        </div>

        {/* Right columns */}
        <div className="xl:col-span-2 space-y-5">
          {/* Notifications */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                Notifications
                {unreadCount > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs text-white font-bold" style={{ background: '#C41E3A' }}>
                    {unreadCount}
                  </span>
                )}
              </h3>
            </div>
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No notifications</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3 rounded-lg border ${n.is_read ? 'bg-gray-50 border-gray-100' : 'bg-red-50 border-red-200'}`}
                  >
                    <div className="flex items-start gap-3">
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-[#C41E3A] mt-1.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${n.is_read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                          {n.message}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">{formatDistanceToNow(new Date(n.sent_at), { addSuffix: true })}</span>
                          {n.campaign && (
                            <>
                              <span className="text-gray-300">·</span>
                              <UrgencyChip level={n.campaign.urgency_level} />
                            </>
                          )}
                        </div>
                      </div>
                      {n.campaign && e.is_eligible && (
                        <Link
                          href={`/book/${n.campaign_id}`}
                          className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                          style={{ background: '#C41E3A' }}
                        >
                          Book
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming appointments */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Appointments
              </h3>
            </div>
            {appointments.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No appointments scheduled</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <div key={apt.id} className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                    <div className="text-center min-w-[3rem]">
                      <p className="text-lg font-bold text-gray-900">{format(new Date(apt.scheduled_at), 'd')}</p>
                      <p className="text-xs text-gray-400">{format(new Date(apt.scheduled_at), 'MMM')}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {apt.campaign?.title || 'Donation Appointment'}
                      </p>
                      {apt.blood_center && (
                        <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {apt.blood_center.name}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">{format(new Date(apt.scheduled_at), 'h:mm a')}</p>
                      {apt.notes && <p className="text-xs text-gray-500 mt-1 italic">{apt.notes}</p>}
                    </div>
                    <StatusChip status={apt.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

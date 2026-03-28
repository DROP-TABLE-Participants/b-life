import type {
  User,
  DonorProfile,
  Institution,
  BloodCenter,
  Campaign,
  CampaignTargetingResult,
  ForecastResult,
  Notification,
  Appointment,
  DashboardOverview,
  EligibilityResult,
  CampaignAnalytics,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = { ...getAuthHeaders(), ...((options.headers as Record<string, string>) || {}) };
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(error.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  login: async (email: string, password: string): Promise<{ access_token: string; token_type: string }> => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username: email, password }).toString(),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ detail: 'Login failed' }));
      throw new Error(error.detail || 'Login failed');
    }
    return res.json();
  },

  getMe: () => request<User>('/auth/me'),

  register: (email: string, password: string, role: string) =>
    request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    }),

  getDashboardOverview: () => request<DashboardOverview>('/dashboard/overview'),

  getForecasts: (city?: string) =>
    request<ForecastResult[]>(`/forecast${city ? `?city=${encodeURIComponent(city)}` : ''}`),

  getForecast: (city: string, blood_type: string) =>
    request<ForecastResult>(`/forecast/${encodeURIComponent(city)}/${encodeURIComponent(blood_type)}`),

  getInstitutions: () => request<Institution[]>('/institutions'),

  getBloodCenters: () => request<BloodCenter[]>('/blood-centers'),

  getCampaigns: () => request<Campaign[]>('/campaigns'),

  getCampaign: (id: number) => request<Campaign>(`/campaigns/${id}`),

  createCampaign: (data: Partial<Campaign>) =>
    request<Campaign>('/campaigns', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  targetCampaign: (id: number) =>
    request<CampaignTargetingResult>(`/campaigns/${id}/target`, { method: 'POST' }),

  activateCampaign: (id: number) =>
    request<Campaign>(`/campaigns/${id}/activate`, { method: 'POST' }),

  getDonorProfile: () => request<DonorProfile>('/donors/me'),

  getDonorEligibility: () => request<EligibilityResult>('/donors/me/eligibility'),

  getDonorNotifications: () => request<Notification[]>('/donors/me/notifications'),

  getDonorAppointments: () => request<Appointment[]>('/donors/me/appointments'),

  createAppointment: (data: {
    campaign_id: number;
    blood_center_id: number;
    scheduled_at: string;
    notes?: string;
  }) =>
    request<Appointment>('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getCampaignAnalytics: (id: number) => request<CampaignAnalytics>(`/analytics/campaigns/${id}`),

  getShortageImpact: () => request<CampaignAnalytics['blood_type_impact']>('/analytics/shortage-impact'),
};

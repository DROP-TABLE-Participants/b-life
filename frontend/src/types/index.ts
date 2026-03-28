export interface User {
  id: number;
  email: string;
  role: 'institution_admin' | 'campaign_operator' | 'donor' | 'admin';
  is_active: boolean;
  created_at: string;
}

export interface DonorProfile {
  id: number;
  user_id: number;
  blood_type: string;
  date_of_birth: string;
  last_donation_date: string | null;
  total_donations: number;
  location_city: string;
  latitude: number | null;
  longitude: number | null;
  notification_consent: boolean;
  user: User;
}

export interface Institution {
  id: number;
  name: string;
  type: string;
  city: string;
  address: string;
  contact_email: string;
  latitude: number | null;
  longitude: number | null;
}

export interface BloodCenter {
  id: number;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  latitude: number | null;
  longitude: number | null;
  institution_id: number;
}

export interface Campaign {
  id: number;
  title: string;
  description: string;
  blood_type: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  city: string;
  target_radius_km: number;
  blood_center_id: number;
  institution_id: number;
  created_at: string;
  updated_at: string;
  blood_center?: BloodCenter;
}

export interface CampaignTargetingResult {
  campaign_id: number;
  eligible_donors: number;
  targeted_donors: number;
  avg_eligibility_score: number;
  recommended_send_time: string;
  targeting_criteria: Record<string, unknown>;
}

export interface ForecastResult {
  city: string;
  blood_type: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  predicted_shortage_days: number;
  current_stock_units: number;
  daily_demand_units: number;
  confidence_score: number;
  contributing_factors: string[];
  recommended_action: string;
  forecast_date: string;
}

export interface Notification {
  id: number;
  donor_id: number;
  campaign_id: number;
  message: string;
  sent_at: string;
  is_read: boolean;
  campaign?: Campaign;
}

export interface Appointment {
  id: number;
  donor_id: number;
  campaign_id: number;
  blood_center_id: number;
  scheduled_at: string;
  status: 'booked' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
  campaign?: Campaign;
  blood_center?: BloodCenter;
}

export interface DashboardOverview {
  active_campaigns: number;
  donors_targeted_today: number;
  avg_shortage_risk: number;
  critical_alerts: number;
  blood_type_risks: Array<{
    blood_type: string;
    risk_level: string;
    risk_score: number;
    available_units: number;
  }>;
  recent_campaigns: Campaign[];
  high_risk_forecasts: ForecastResult[];
}

export interface EligibilityResult {
  is_eligible: boolean;
  days_until_eligible: number;
  last_donation_date: string | null;
  next_eligible_date: string | null;
  reason: string;
}

export interface CampaignAnalytics {
  campaign_id: number;
  donors_targeted: number;
  donors_notified: number;
  appointments_booked: number;
  appointments_completed: number;
  risk_before: number;
  risk_after: number;
  bookings_by_day: Array<{ date: string; count: number }>;
  blood_type_impact: Array<{
    blood_type: string;
    risk_before: number;
    risk_after: number;
  }>;
}

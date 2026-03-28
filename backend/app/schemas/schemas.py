from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


# ─── Auth ────────────────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: str = "donor"
    full_name: str | None = None


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: int


class UserOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    email: str
    role: str
    created_at: datetime


# ─── Donor Profile ───────────────────────────────────────────────────────────

class DonorProfileOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    user_id: int
    full_name: str
    blood_type: str
    city: str
    latitude: float | None
    longitude: float | None
    last_donation_at: datetime | None
    eligible_from: datetime | None
    response_score: float
    total_donations: int


class DonorEligibilityOut(BaseModel):
    is_eligible: bool
    eligible_from: datetime | None
    days_until_eligible: int | None
    last_donation_at: datetime | None
    message: str


# ─── Institution ─────────────────────────────────────────────────────────────

class InstitutionOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    name: str
    type: str
    city: str
    verified: bool
    created_at: datetime


# ─── Blood Center ─────────────────────────────────────────────────────────────

class BloodCenterOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    institution_id: int
    name: str
    address: str | None
    city: str
    latitude: float | None
    longitude: float | None
    opening_hours: str | None


# ─── Campaign ────────────────────────────────────────────────────────────────

class CampaignCreateRequest(BaseModel):
    blood_type_needed: str
    urgency_level: str
    city: str
    target_radius_km: float = 50.0
    blood_center_id: int | None = None

    @field_validator("urgency_level")
    @classmethod
    def validate_urgency(cls, v: str) -> str:
        allowed = {"low", "medium", "high", "critical"}
        if v not in allowed:
            raise ValueError(f"urgency_level must be one of {allowed}")
        return v


class CampaignOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    created_by_institution_id: int
    blood_type_needed: str
    urgency_level: str
    city: str
    target_radius_km: float
    blood_center_id: int | None
    status: str
    created_at: datetime


class CampaignTargetingResultOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    campaign_id: int
    target_donor_count: int
    recommended_send_time: str | None
    average_score: float
    notes: str | None


# ─── Notification ─────────────────────────────────────────────────────────────

class NotificationOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    campaign_id: int
    donor_id: int
    sent_at: datetime | None
    opened_at: datetime | None
    status: str


# ─── Appointment ─────────────────────────────────────────────────────────────

class AppointmentCreateRequest(BaseModel):
    blood_center_id: int
    appointment_time: datetime
    campaign_id: int | None = None


class AppointmentOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    donor_id: int
    campaign_id: int | None
    blood_center_id: int
    appointment_time: datetime
    status: str


# ─── Forecast ────────────────────────────────────────────────────────────────

class ForecastResultOut(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    city: str
    blood_type: str
    predicted_shortage_risk: float
    predicted_units_needed: int
    confidence_score: float
    factors_json: str | None
    generated_at: datetime
    risk_level: str = ""

    @field_validator("risk_level", mode="before")
    @classmethod
    def derive_risk_level(cls, v: str, info: object) -> str:
        # Computed in the router from predicted_shortage_risk; accept any passed value.
        return v


# ─── Dashboard ────────────────────────────────────────────────────────────────

class TopRiskItem(BaseModel):
    city: str
    blood_type: str
    risk: float
    risk_level: str


class DashboardOverviewOut(BaseModel):
    total_active_campaigns: int
    donors_targeted_today: int
    avg_shortage_risk: float
    top_risk_items: list[TopRiskItem]
    recent_campaigns: list[CampaignOut]


# ─── Analytics ────────────────────────────────────────────────────────────────

class CampaignAnalyticsOut(BaseModel):
    campaign_id: int
    status: str
    notifications_sent: int
    notifications_opened: int
    appointments_booked: int
    appointments_completed: int
    open_rate: float
    conversion_rate: float


class ShortageImpactOut(BaseModel):
    city: str
    blood_type: str
    risk_before: float
    risk_after: float
    risk_delta: float
    donations_received: int

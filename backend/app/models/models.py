import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserRole(str, enum.Enum):
    donor = "donor"
    institution_admin = "institution_admin"
    campaign_operator = "campaign_operator"


class UrgencyLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class CampaignStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    completed = "completed"


class InstitutionType(str, enum.Enum):
    hospital = "hospital"
    blood_center = "blood_center"
    municipality = "municipality"


class NotificationStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    opened = "opened"
    clicked = "clicked"


class AppointmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    completed = "completed"
    cancelled = "cancelled"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.donor, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    donor_profile: Mapped["DonorProfile"] = relationship("DonorProfile", back_populates="user", uselist=False)


class DonorProfile(Base):
    __tablename__ = "donor_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    blood_type: Mapped[str] = mapped_column(String(10), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=True)
    last_donation_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    eligible_from: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    response_score: Mapped[float] = mapped_column(Float, default=0.5)
    total_donations: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped["User"] = relationship("User", back_populates="donor_profile")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="donor")
    appointments: Mapped[list["Appointment"]] = relationship("Appointment", back_populates="donor")
    donation_history: Mapped[list["DonationHistory"]] = relationship("DonationHistory", back_populates="donor")


class Institution(Base):
    __tablename__ = "institutions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[InstitutionType] = mapped_column(Enum(InstitutionType), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    blood_centers: Mapped[list["BloodCenter"]] = relationship("BloodCenter", back_populates="institution")
    campaigns: Mapped[list["Campaign"]] = relationship("Campaign", back_populates="institution")


class BloodCenter(Base):
    __tablename__ = "blood_centers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    institution_id: Mapped[int] = mapped_column(Integer, ForeignKey("institutions.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(String(500), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=True)
    longitude: Mapped[float] = mapped_column(Float, nullable=True)
    opening_hours: Mapped[str] = mapped_column(String(255), nullable=True)

    institution: Mapped["Institution"] = relationship("Institution", back_populates="blood_centers")
    inventory_snapshots: Mapped[list["InventorySnapshot"]] = relationship(
        "InventorySnapshot", back_populates="blood_center"
    )
    appointments: Mapped[list["Appointment"]] = relationship("Appointment", back_populates="blood_center")
    donation_history: Mapped[list["DonationHistory"]] = relationship("DonationHistory", back_populates="blood_center")


class InventorySnapshot(Base):
    __tablename__ = "inventory_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    blood_center_id: Mapped[int] = mapped_column(Integer, ForeignKey("blood_centers.id"), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    blood_type: Mapped[str] = mapped_column(String(10), nullable=False)
    available_units: Mapped[int] = mapped_column(Integer, nullable=False)
    expected_demand_units: Mapped[int] = mapped_column(Integer, nullable=False)
    snapshot_date: Mapped[datetime] = mapped_column(DateTime, nullable=False)

    blood_center: Mapped["BloodCenter"] = relationship("BloodCenter", back_populates="inventory_snapshots")


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created_by_institution_id: Mapped[int] = mapped_column(Integer, ForeignKey("institutions.id"), nullable=False)
    blood_type_needed: Mapped[str] = mapped_column(String(10), nullable=False)
    urgency_level: Mapped[UrgencyLevel] = mapped_column(Enum(UrgencyLevel), nullable=False)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    target_radius_km: Mapped[float] = mapped_column(Float, default=50.0)
    blood_center_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("blood_centers.id"), nullable=True)
    status: Mapped[CampaignStatus] = mapped_column(Enum(CampaignStatus), default=CampaignStatus.draft)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    institution: Mapped["Institution"] = relationship("Institution", back_populates="campaigns")
    blood_center: Mapped["BloodCenter"] = relationship("BloodCenter")
    targeting_result: Mapped["CampaignTargetingResult"] = relationship(
        "CampaignTargetingResult", back_populates="campaign", uselist=False
    )
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="campaign")
    appointments: Mapped[list["Appointment"]] = relationship("Appointment", back_populates="campaign")


class CampaignTargetingResult(Base):
    __tablename__ = "campaign_targeting_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    campaign_id: Mapped[int] = mapped_column(Integer, ForeignKey("campaigns.id"), unique=True, nullable=False)
    target_donor_count: Mapped[int] = mapped_column(Integer, nullable=False)
    recommended_send_time: Mapped[str] = mapped_column(String(50), nullable=True)
    average_score: Mapped[float] = mapped_column(Float, nullable=False)
    notes: Mapped[str] = mapped_column(Text, nullable=True)

    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="targeting_result")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    campaign_id: Mapped[int] = mapped_column(Integer, ForeignKey("campaigns.id"), nullable=False)
    donor_id: Mapped[int] = mapped_column(Integer, ForeignKey("donor_profiles.id"), nullable=False)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    opened_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[NotificationStatus] = mapped_column(Enum(NotificationStatus), default=NotificationStatus.pending)

    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="notifications")
    donor: Mapped["DonorProfile"] = relationship("DonorProfile", back_populates="notifications")


class Appointment(Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    donor_id: Mapped[int] = mapped_column(Integer, ForeignKey("donor_profiles.id"), nullable=False)
    campaign_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("campaigns.id"), nullable=True)
    blood_center_id: Mapped[int] = mapped_column(Integer, ForeignKey("blood_centers.id"), nullable=False)
    appointment_time: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    status: Mapped[AppointmentStatus] = mapped_column(Enum(AppointmentStatus), default=AppointmentStatus.scheduled)

    donor: Mapped["DonorProfile"] = relationship("DonorProfile", back_populates="appointments")
    campaign: Mapped["Campaign"] = relationship("Campaign", back_populates="appointments")
    blood_center: Mapped["BloodCenter"] = relationship("BloodCenter", back_populates="appointments")


class DonationHistory(Base):
    __tablename__ = "donation_history"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    donor_id: Mapped[int] = mapped_column(Integer, ForeignKey("donor_profiles.id"), nullable=False)
    blood_center_id: Mapped[int] = mapped_column(Integer, ForeignKey("blood_centers.id"), nullable=False)
    donated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    blood_type: Mapped[str] = mapped_column(String(10), nullable=False)

    donor: Mapped["DonorProfile"] = relationship("DonorProfile", back_populates="donation_history")
    blood_center: Mapped["BloodCenter"] = relationship("BloodCenter", back_populates="donation_history")


class ForecastResult(Base):
    __tablename__ = "forecast_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    blood_type: Mapped[str] = mapped_column(String(10), nullable=False)
    predicted_shortage_risk: Mapped[float] = mapped_column(Float, nullable=False)
    predicted_units_needed: Mapped[int] = mapped_column(Integer, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    factors_json: Mapped[str] = mapped_column(Text, nullable=True)
    generated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

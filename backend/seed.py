"""
Seed script – creates all tables and inserts realistic demo data.
Run from the backend/ directory:
    python seed.py
"""
import asyncio
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth.service import hash_password
from app.config import settings
from app.database import Base
from app.intelligence.forecasting import compute_forecast
from app.models.models import (
    Appointment,
    AppointmentStatus,
    BloodCenter,
    Campaign,
    CampaignStatus,
    CampaignTargetingResult,
    DonationHistory,
    DonorProfile,
    ForecastResult,
    Institution,
    InstitutionType,
    InventorySnapshot,
    Notification,
    NotificationStatus,
    UrgencyLevel,
    User,
    UserRole,
)

# ──────────────────────────────────────────────────────────────────────────────
# Engine
# ──────────────────────────────────────────────────────────────────────────────

engine = create_async_engine(settings.database_url, echo=False)
SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

now = datetime.now(timezone.utc)


def dt(days_offset: int = 0, hours: int = 0) -> datetime:
    return now + timedelta(days=days_offset, hours=hours)


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

async def create_tables() -> None:
    from app.models import models  # noqa: F401 – registers metadata

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


# ──────────────────────────────────────────────────────────────────────────────
# Seed
# ──────────────────────────────────────────────────────────────────────────────

async def seed() -> None:
    await create_tables()

    async with SessionLocal() as db:
        # ── Institutions ──────────────────────────────────────────────────────
        sofia_bc_inst = Institution(
            name="Sofia Blood Center",
            type=InstitutionType.blood_center,
            city="Sofia",
            verified=True,
            created_at=dt(-60),
        )
        plovdiv_inst = Institution(
            name="Plovdiv Regional Hospital",
            type=InstitutionType.hospital,
            city="Plovdiv",
            verified=True,
            created_at=dt(-60),
        )
        varna_inst = Institution(
            name="Varna Municipal Health",
            type=InstitutionType.municipality,
            city="Varna",
            verified=True,
            created_at=dt(-60),
        )
        db.add_all([sofia_bc_inst, plovdiv_inst, varna_inst])
        await db.flush()

        # ── Blood Centers ─────────────────────────────────────────────────────
        sofia_center_1 = BloodCenter(
            institution_id=sofia_bc_inst.id,
            name="Sofia Blood Center – Main",
            address="1 Georgi Sofiyski Blvd, Sofia",
            city="Sofia",
            latitude=42.6977,
            longitude=23.3219,
            opening_hours="Mon-Fri 08:00-17:00",
        )
        sofia_center_2 = BloodCenter(
            institution_id=sofia_bc_inst.id,
            name="Sofia Blood Center – Mladost",
            address="12 Aleksandar Malinov Blvd, Sofia",
            city="Sofia",
            latitude=42.6510,
            longitude=23.3790,
            opening_hours="Mon-Sat 09:00-16:00",
        )
        plovdiv_center = BloodCenter(
            institution_id=plovdiv_inst.id,
            name="Plovdiv Regional Blood Center",
            address="15 Vasil Aprilov Blvd, Plovdiv",
            city="Plovdiv",
            latitude=42.1354,
            longitude=24.7453,
            opening_hours="Mon-Fri 07:30-16:00",
        )
        varna_center = BloodCenter(
            institution_id=varna_inst.id,
            name="Varna Municipal Blood Bank",
            address="3 Marin Drinov St, Varna",
            city="Varna",
            latitude=43.2141,
            longitude=27.9147,
            opening_hours="Mon-Fri 08:00-15:00",
        )
        db.add_all([sofia_center_1, sofia_center_2, plovdiv_center, varna_center])
        await db.flush()

        # ── Inventory Snapshots ───────────────────────────────────────────────
        inventory_data = [
            # Sofia – critical O- shortage
            dict(blood_center_id=sofia_center_1.id, city="Sofia", blood_type="O-",  available=3,  demand=25, days=-1),
            dict(blood_center_id=sofia_center_1.id, city="Sofia", blood_type="O+",  available=18, demand=30, days=-1),
            dict(blood_center_id=sofia_center_1.id, city="Sofia", blood_type="A+",  available=22, demand=25, days=-1),
            dict(blood_center_id=sofia_center_1.id, city="Sofia", blood_type="A-",  available=8,  demand=12, days=-1),
            dict(blood_center_id=sofia_center_1.id, city="Sofia", blood_type="B+",  available=14, demand=15, days=-1),
            dict(blood_center_id=sofia_center_1.id, city="Sofia", blood_type="B-",  available=2,  demand=8,  days=-1),
            dict(blood_center_id=sofia_center_1.id, city="Sofia", blood_type="AB+", available=10, demand=10, days=-1),
            dict(blood_center_id=sofia_center_1.id, city="Sofia", blood_type="AB-", available=4,  demand=6,  days=-1),
            # Plovdiv
            dict(blood_center_id=plovdiv_center.id, city="Plovdiv", blood_type="O-",  available=8,  demand=15, days=-1),
            dict(blood_center_id=plovdiv_center.id, city="Plovdiv", blood_type="O+",  available=20, demand=20, days=-1),
            dict(blood_center_id=plovdiv_center.id, city="Plovdiv", blood_type="A+",  available=18, demand=18, days=-1),
            dict(blood_center_id=plovdiv_center.id, city="Plovdiv", blood_type="A-",  available=5,  demand=10, days=-1),
            dict(blood_center_id=plovdiv_center.id, city="Plovdiv", blood_type="B+",  available=12, demand=12, days=-1),
            # Varna
            dict(blood_center_id=varna_center.id,   city="Varna",   blood_type="O-",  available=6,  demand=10, days=-1),
            dict(blood_center_id=varna_center.id,   city="Varna",   blood_type="O+",  available=15, demand=18, days=-1),
            dict(blood_center_id=varna_center.id,   city="Varna",   blood_type="A+",  available=12, demand=14, days=-1),
        ]
        for inv in inventory_data:
            db.add(InventorySnapshot(
                blood_center_id=inv["blood_center_id"],
                city=inv["city"],
                blood_type=inv["blood_type"],
                available_units=inv["available"],
                expected_demand_units=inv["demand"],
                snapshot_date=dt(inv["days"]),
            ))
        await db.flush()

        # ── Demo Users ────────────────────────────────────────────────────────
        admin_user = User(
            email="admin@sofiabc.bg",
            hashed_password=hash_password("admin123"),
            role=UserRole.institution_admin,
            created_at=dt(-90),
        )
        operator_user = User(
            email="operator@sofiabc.bg",
            hashed_password=hash_password("operator123"),
            role=UserRole.campaign_operator,
            created_at=dt(-60),
        )
        db.add_all([admin_user, operator_user])
        await db.flush()

        # ── Donors ────────────────────────────────────────────────────────────
        donor_specs = [
            # (email, full_name, blood_type, city, lat, lon, last_donation_days_ago, response_score, total)
            ("donor1@example.com",   "Ivan Petrov",       "O-",  "Sofia",   42.6977, 23.3219, 70,  0.90, 12),
            ("donor2@example.com",   "Maria Ivanova",     "O-",  "Sofia",   42.7050, 23.3350, 20,  0.80, 8),
            ("donor3@example.com",   "Georgi Dimitrov",   "O+",  "Sofia",   42.6800, 23.3100, 80,  0.75, 6),
            ("donor4@example.com",   "Elena Todorova",    "A+",  "Sofia",   42.6600, 23.3800, 60,  0.70, 4),
            ("donor5@example.com",   "Petar Stoyanov",    "A-",  "Sofia",   42.7100, 23.2900, 90,  0.85, 9),
            ("donor6@example.com",   "Nadya Koleva",      "B+",  "Sofia",   42.6750, 23.3600, 30,  0.60, 3),
            ("donor7@example.com",   "Hristo Angelov",    "O-",  "Sofia",   42.6900, 23.3400, 100, 0.92, 15),
            ("donor8@example.com",   "Silviya Marinova",  "AB+", "Sofia",   42.6550, 23.3700, 56,  0.65, 5),
            ("donor9@example.com",   "Teodor Nikolov",    "O+",  "Plovdiv", 42.1354, 24.7453, 70,  0.78, 7),
            ("donor10@example.com",  "Vanya Petrova",     "A+",  "Plovdiv", 42.1400, 24.7500, 40,  0.72, 5),
            ("donor11@example.com",  "Stefan Georgiev",   "B-",  "Plovdiv", 42.1200, 24.7300, 85,  0.88, 11),
            ("donor12@example.com",  "Rositsa Hristova",  "O-",  "Plovdiv", 42.1500, 24.7600, 60,  0.82, 8),
            ("donor13@example.com",  "Mihail Vasilev",    "A-",  "Plovdiv", 42.1300, 24.7400, 30,  0.55, 2),
            ("donor14@example.com",  "Kristina Borisova", "O+",  "Varna",   43.2141, 27.9147, 90,  0.80, 10),
            ("donor15@example.com",  "Dimitar Iliev",     "B+",  "Varna",   43.2200, 27.9200, 50,  0.68, 4),
            ("donor16@example.com",  "Aleksandra Popova", "AB-", "Varna",   43.2050, 27.9050, 70,  0.75, 6),
            ("donor17@example.com",  "Nikolay Todorov",   "O-",  "Sofia",   42.7000, 23.3300, 200, 0.95, 20),
            ("donor18@example.com",  "Galina Stoyanova",  "O+",  "Sofia",   42.6850, 23.3450, 65,  0.70, 5),
            ("donor19@example.com",  "Plamen Petkov",     "A+",  "Plovdiv", 42.1450, 24.7550, 56,  0.60, 3),
            ("donor20@example.com",  "Denitsa Valkova",   "B-",  "Varna",   43.2100, 27.9100, 80,  0.85, 9),
        ]

        donor_users: list[User] = []
        donor_profiles: list[DonorProfile] = []

        for spec in donor_specs:
            email, name, bt, city, lat, lon, last_days, rs, total = spec
            u = User(
                email=email,
                hashed_password=hash_password("donor123"),
                role=UserRole.donor,
                created_at=dt(-last_days - 10),
            )
            db.add(u)
            donor_users.append(u)

        await db.flush()

        for i, spec in enumerate(donor_specs):
            email, name, bt, city, lat, lon, last_days, rs, total = spec
            last_donated = dt(-last_days)
            eligible_from = last_donated + timedelta(days=56)
            dp = DonorProfile(
                user_id=donor_users[i].id,
                full_name=name,
                blood_type=bt,
                city=city,
                latitude=lat,
                longitude=lon,
                last_donation_at=last_donated,
                eligible_from=eligible_from,
                response_score=rs,
                total_donations=total,
            )
            db.add(dp)
            donor_profiles.append(dp)

        await db.flush()

        # ── Donation History ──────────────────────────────────────────────────
        for i, spec in enumerate(donor_specs):
            _, _, bt, city, *_ = spec
            # Map city to center
            center_id = {
                "Sofia": sofia_center_1.id,
                "Plovdiv": plovdiv_center.id,
                "Varna": varna_center.id,
            }[city]
            dp = donor_profiles[i]
            db.add(DonationHistory(
                donor_id=dp.id,
                blood_center_id=center_id,
                donated_at=dp.last_donation_at,
                blood_type=bt,
            ))
        await db.flush()

        # ── Campaigns ─────────────────────────────────────────────────────────
        sofia_campaign = Campaign(
            created_by_institution_id=sofia_bc_inst.id,
            blood_type_needed="O-",
            urgency_level=UrgencyLevel.critical,
            city="Sofia",
            target_radius_km=30.0,
            blood_center_id=sofia_center_1.id,
            status=CampaignStatus.active,
            created_at=dt(-3),
        )
        plovdiv_campaign = Campaign(
            created_by_institution_id=plovdiv_inst.id,
            blood_type_needed="A+",
            urgency_level=UrgencyLevel.medium,
            city="Plovdiv",
            target_radius_km=40.0,
            blood_center_id=plovdiv_center.id,
            status=CampaignStatus.draft,
            created_at=dt(-1),
        )
        db.add_all([sofia_campaign, plovdiv_campaign])
        await db.flush()

        # ── Campaign Targeting Results ────────────────────────────────────────
        sofia_targeting = CampaignTargetingResult(
            campaign_id=sofia_campaign.id,
            target_donor_count=8,
            recommended_send_time="09:00",
            average_score=72.5,
            notes="8 O- donors in Sofia radius. Critical shortage scenario.",
        )
        db.add(sofia_targeting)
        await db.flush()

        # ── Notifications ─────────────────────────────────────────────────────
        # Sofia campaign: send notifications to O- Sofia donors
        sofia_o_neg_donors = [dp for dp in donor_profiles if dp.blood_type == "O-" and dp.city == "Sofia"]
        notif_statuses = [
            NotificationStatus.opened,
            NotificationStatus.clicked,
            NotificationStatus.sent,
            NotificationStatus.opened,
        ]
        for idx, dp in enumerate(sofia_o_neg_donors[:4]):
            ns = notif_statuses[idx % len(notif_statuses)]
            opened_at = dt(-2, 1) if ns in (NotificationStatus.opened, NotificationStatus.clicked) else None
            db.add(Notification(
                campaign_id=sofia_campaign.id,
                donor_id=dp.id,
                sent_at=dt(-2),
                opened_at=opened_at,
                status=ns,
            ))

        # Plovdiv: 2 pending notifications
        plovdiv_a_pos = [dp for dp in donor_profiles if dp.blood_type == "A+" and dp.city == "Plovdiv"]
        for dp in plovdiv_a_pos[:2]:
            db.add(Notification(
                campaign_id=plovdiv_campaign.id,
                donor_id=dp.id,
                sent_at=None,
                status=NotificationStatus.pending,
            ))
        await db.flush()

        # ── Appointments ──────────────────────────────────────────────────────
        appt_data = [
            # (donor_index, center, campaign, time_offset_days, status)
            (0,  sofia_center_1,  sofia_campaign,   1, AppointmentStatus.scheduled),
            (6,  sofia_center_1,  sofia_campaign,   1, AppointmentStatus.scheduled),
            (16, sofia_center_1,  sofia_campaign,   2, AppointmentStatus.scheduled),
            (2,  sofia_center_1,  sofia_campaign,  -1, AppointmentStatus.completed),
            (4,  sofia_center_1,  None,             -3, AppointmentStatus.completed),
            (8,  plovdiv_center,  plovdiv_campaign,  2, AppointmentStatus.scheduled),
            (9,  plovdiv_center,  plovdiv_campaign,  3, AppointmentStatus.scheduled),
            (13, varna_center,    None,             -2, AppointmentStatus.completed),
        ]
        for donor_idx, center, campaign, day_offset, appt_status in appt_data:
            db.add(Appointment(
                donor_id=donor_profiles[donor_idx].id,
                campaign_id=campaign.id if campaign else None,
                blood_center_id=center.id,
                appointment_time=dt(day_offset, 10),
                status=appt_status,
            ))
        await db.flush()

        # ── Forecast Results ──────────────────────────────────────────────────
        forecast_specs = [
            # city, blood_type, available, demand, days_since_surge, response_rate
            ("Sofia",   "O-",  3,  25, 45, 0.30),
            ("Sofia",   "O+",  18, 30, 30, 0.45),
            ("Sofia",   "A+",  22, 25, 20, 0.50),
            ("Sofia",   "A-",  8,  12, 35, 0.35),
            ("Sofia",   "B+",  14, 15, 25, 0.40),
            ("Sofia",   "B-",  2,  8,  50, 0.25),
            ("Sofia",   "AB+", 10, 10, 20, 0.55),
            ("Sofia",   "AB-", 4,  6,  40, 0.30),
            ("Plovdiv", "O-",  8,  15, 30, 0.35),
            ("Plovdiv", "O+",  20, 20, 20, 0.50),
            ("Plovdiv", "A+",  18, 18, 15, 0.55),
            ("Plovdiv", "A-",  5,  10, 40, 0.30),
            ("Plovdiv", "B+",  12, 12, 25, 0.45),
            ("Varna",   "O-",  6,  10, 35, 0.35),
            ("Varna",   "O+",  15, 18, 25, 0.40),
            ("Varna",   "A+",  12, 14, 20, 0.50),
        ]
        for city, bt, avail, demand, surge_days, resp_rate in forecast_specs:
            fc = compute_forecast(
                city=city,
                blood_type=bt,
                available_units=avail,
                expected_demand_units=demand,
                days_since_last_surge=surge_days,
                recent_campaign_response_rate=resp_rate,
            )
            db.add(ForecastResult(
                city=fc["city"],
                blood_type=fc["blood_type"],
                predicted_shortage_risk=fc["predicted_shortage_risk"],
                predicted_units_needed=fc["predicted_units_needed"],
                confidence_score=fc["confidence_score"],
                factors_json=fc["factors_json"],
                generated_at=dt(0),
            ))

        await db.commit()
        print("✅  Seed data inserted successfully.")
        print()
        print("Demo accounts:")
        print("  admin@sofiabc.bg     / admin123     (institution_admin)")
        print("  operator@sofiabc.bg  / operator123  (campaign_operator)")
        print("  donor1@example.com   / donor123     (donor, O-, Sofia)")
        print()
        print("Start server:  cd backend && uvicorn app.main:app --reload")


if __name__ == "__main__":
    asyncio.run(seed())

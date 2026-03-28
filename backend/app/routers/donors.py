from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.models import Appointment, DonorProfile, Notification, User, UserRole
from app.schemas.schemas import AppointmentOut, DonorEligibilityOut, DonorProfileOut, NotificationOut

router = APIRouter(prefix="/donors", tags=["donors"])

DONATION_INTERVAL_DAYS = 56  # ~8 weeks minimum between donations


async def _get_donor_profile(user: User, db: AsyncSession) -> DonorProfile:
    if user.role != UserRole.donor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only donors can access this resource")
    result = await db.execute(select(DonorProfile).where(DonorProfile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donor profile not found")
    return profile


@router.get("/me", response_model=DonorProfileOut)
async def donor_me(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DonorProfileOut:
    profile = await _get_donor_profile(current_user, db)
    return DonorProfileOut.model_validate(profile)


@router.get("/me/eligibility", response_model=DonorEligibilityOut)
async def donor_eligibility(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DonorEligibilityOut:
    profile = await _get_donor_profile(current_user, db)
    now = datetime.now(timezone.utc)

    if profile.last_donation_at is None:
        return DonorEligibilityOut(
            is_eligible=True,
            eligible_from=None,
            days_until_eligible=None,
            last_donation_at=None,
            message="You have never donated. You are eligible to donate now!",
        )

    last = profile.last_donation_at
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)

    eligible_from = profile.eligible_from
    if eligible_from and eligible_from.tzinfo is None:
        eligible_from = eligible_from.replace(tzinfo=timezone.utc)

    if eligible_from and now < eligible_from:
        days_left = (eligible_from - now).days + 1
        return DonorEligibilityOut(
            is_eligible=False,
            eligible_from=eligible_from,
            days_until_eligible=days_left,
            last_donation_at=profile.last_donation_at,
            message=f"You can donate again in {days_left} day(s).",
        )

    return DonorEligibilityOut(
        is_eligible=True,
        eligible_from=eligible_from,
        days_until_eligible=0,
        last_donation_at=profile.last_donation_at,
        message="You are eligible to donate!",
    )


@router.get("/me/notifications", response_model=list[NotificationOut])
async def donor_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[NotificationOut]:
    profile = await _get_donor_profile(current_user, db)
    result = await db.execute(
        select(Notification)
        .where(Notification.donor_id == profile.id)
        .order_by(Notification.sent_at.desc())
    )
    return [NotificationOut.model_validate(n) for n in result.scalars().all()]


@router.get("/me/appointments", response_model=list[AppointmentOut])
async def donor_appointments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AppointmentOut]:
    profile = await _get_donor_profile(current_user, db)
    result = await db.execute(
        select(Appointment)
        .where(Appointment.donor_id == profile.id)
        .order_by(Appointment.appointment_time.desc())
    )
    return [AppointmentOut.model_validate(a) for a in result.scalars().all()]

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.models import (
    Appointment,
    AppointmentStatus,
    Campaign,
    DonationHistory,
    ForecastResult,
    Notification,
    NotificationStatus,
    User,
)
from app.schemas.schemas import CampaignAnalyticsOut, ShortageImpactOut

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/campaigns/{campaign_id}", response_model=CampaignAnalyticsOut)
async def campaign_analytics(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CampaignAnalyticsOut:
    camp_q = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = camp_q.scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    sent_q = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(Notification.campaign_id == campaign_id)
        .where(Notification.status != NotificationStatus.pending)
    )
    sent: int = sent_q.scalar_one()

    opened_q = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(Notification.campaign_id == campaign_id)
        .where(Notification.status.in_([NotificationStatus.opened, NotificationStatus.clicked]))
    )
    opened: int = opened_q.scalar_one()

    booked_q = await db.execute(
        select(func.count())
        .select_from(Appointment)
        .where(Appointment.campaign_id == campaign_id)
    )
    booked: int = booked_q.scalar_one()

    completed_q = await db.execute(
        select(func.count())
        .select_from(Appointment)
        .where(Appointment.campaign_id == campaign_id)
        .where(Appointment.status == AppointmentStatus.completed)
    )
    completed: int = completed_q.scalar_one()

    open_rate = round(opened / sent, 4) if sent > 0 else 0.0
    conversion_rate = round(booked / sent, 4) if sent > 0 else 0.0

    return CampaignAnalyticsOut(
        campaign_id=campaign_id,
        status=campaign.status.value,
        notifications_sent=sent,
        notifications_opened=opened,
        appointments_booked=booked,
        appointments_completed=completed,
        open_rate=open_rate,
        conversion_rate=conversion_rate,
    )


@router.get("/shortage-impact", response_model=list[ShortageImpactOut])
async def shortage_impact(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ShortageImpactOut]:
    """
    For each city+blood_type with a forecast, compute a simulated 'after' risk
    based on completed donations received via the platform.
    """
    forecast_q = await db.execute(select(ForecastResult).order_by(ForecastResult.predicted_shortage_risk.desc()))
    forecasts = forecast_q.scalars().all()

    results = []
    for f in forecasts:
        # Count completed donations for this city/blood_type
        donations_q = await db.execute(
            select(func.count())
            .select_from(DonationHistory)
            .where(DonationHistory.blood_type == f.blood_type)
        )
        donations: int = donations_q.scalar_one()

        # Each completed donation reduces risk by ~2 % (simplified model)
        risk_reduction = min(donations * 0.02, f.predicted_shortage_risk * 0.8)
        risk_after = round(max(0.0, f.predicted_shortage_risk - risk_reduction), 4)

        results.append(
            ShortageImpactOut(
                city=f.city,
                blood_type=f.blood_type,
                risk_before=f.predicted_shortage_risk,
                risk_after=risk_after,
                risk_delta=round(f.predicted_shortage_risk - risk_after, 4),
                donations_received=donations,
            )
        )

    return results

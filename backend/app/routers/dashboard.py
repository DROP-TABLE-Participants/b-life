from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.intelligence.forecasting import risk_level_from_score
from app.models.models import Campaign, CampaignStatus, ForecastResult, Notification, NotificationStatus
from app.schemas.schemas import CampaignOut, DashboardOverviewOut, TopRiskItem
from app.models.models import User

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverviewOut)
async def overview(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DashboardOverviewOut:
    # Active campaigns count
    active_q = await db.execute(
        select(func.count()).select_from(Campaign).where(Campaign.status == CampaignStatus.active)
    )
    total_active_campaigns: int = active_q.scalar_one()

    # Donors targeted today via notifications
    from datetime import date, datetime, timezone
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    notif_q = await db.execute(
        select(func.count())
        .select_from(Notification)
        .where(Notification.status != NotificationStatus.pending)
        .where(Notification.sent_at >= today_start)
    )
    donors_targeted_today: int = notif_q.scalar_one()

    # Average shortage risk from latest forecast results
    risk_q = await db.execute(select(func.avg(ForecastResult.predicted_shortage_risk)))
    avg_risk: float = risk_q.scalar_one() or 0.0

    # Top-5 risk items
    top_q = await db.execute(
        select(ForecastResult)
        .order_by(ForecastResult.predicted_shortage_risk.desc())
        .limit(5)
    )
    top_forecasts = top_q.scalars().all()
    top_risk_items = [
        TopRiskItem(
            city=f.city,
            blood_type=f.blood_type,
            risk=f.predicted_shortage_risk,
            risk_level=risk_level_from_score(f.predicted_shortage_risk),
        )
        for f in top_forecasts
    ]

    # Recent campaigns (last 5)
    recent_q = await db.execute(
        select(Campaign).order_by(Campaign.created_at.desc()).limit(5)
    )
    recent = recent_q.scalars().all()
    recent_campaigns = [CampaignOut.model_validate(c) for c in recent]

    return DashboardOverviewOut(
        total_active_campaigns=total_active_campaigns,
        donors_targeted_today=donors_targeted_today,
        avg_shortage_risk=round(avg_risk, 4),
        top_risk_items=top_risk_items,
        recent_campaigns=recent_campaigns,
    )

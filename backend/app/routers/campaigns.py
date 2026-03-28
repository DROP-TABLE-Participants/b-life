from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.auth.dependencies import get_current_user, require_roles
from app.database import get_db
from app.intelligence.scoring import rank_donors
from app.models.models import (
    BloodCenter,
    Campaign,
    CampaignStatus,
    CampaignTargetingResult,
    DonorProfile,
    Institution,
    Notification,
    NotificationStatus,
    User,
    UserRole,
)
from app.schemas.schemas import (
    CampaignCreateRequest,
    CampaignOut,
    CampaignTargetingResultOut,
)

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

_PRIVILEGED = (UserRole.institution_admin.value, UserRole.campaign_operator.value)


async def _get_institution_for_user(user: User, db: AsyncSession) -> Institution:
    """Return the first institution linked to a privileged user (simplified for MVP)."""
    result = await db.execute(select(Institution).where(Institution.verified == True).limit(1))  # noqa: E712
    inst = result.scalar_one_or_none()
    if inst is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No verified institution found")
    return inst


@router.post("", response_model=CampaignOut, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    body: CampaignCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*_PRIVILEGED)),
) -> CampaignOut:
    institution = await _get_institution_for_user(current_user, db)
    campaign = Campaign(
        created_by_institution_id=institution.id,
        blood_type_needed=body.blood_type_needed,
        urgency_level=body.urgency_level,
        city=body.city,
        target_radius_km=body.target_radius_km,
        blood_center_id=body.blood_center_id,
        status=CampaignStatus.draft,
    )
    db.add(campaign)
    await db.commit()
    await db.refresh(campaign)
    return CampaignOut.model_validate(campaign)


@router.get("", response_model=list[CampaignOut])
async def list_campaigns(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[CampaignOut]:
    result = await db.execute(select(Campaign).order_by(Campaign.created_at.desc()))
    return [CampaignOut.model_validate(c) for c in result.scalars().all()]


@router.get("/{campaign_id}", response_model=CampaignOut)
async def get_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> CampaignOut:
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    return CampaignOut.model_validate(campaign)


@router.post("/{campaign_id}/target", response_model=CampaignTargetingResultOut)
async def target_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*_PRIVILEGED)),
) -> CampaignTargetingResultOut:
    camp_result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = camp_result.scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")

    # Fetch blood center coordinates
    center_lat: float | None = None
    center_lon: float | None = None
    if campaign.blood_center_id:
        bc_result = await db.execute(select(BloodCenter).where(BloodCenter.id == campaign.blood_center_id))
        bc = bc_result.scalar_one_or_none()
        if bc:
            center_lat = bc.latitude
            center_lon = bc.longitude

    # Fetch all donors
    donors_result = await db.execute(select(DonorProfile))
    donors = donors_result.scalars().all()

    now = datetime.now(timezone.utc)
    donors_data = []
    for d in donors:
        if d.eligible_from:
            ef = d.eligible_from if d.eligible_from.tzinfo else d.eligible_from.replace(tzinfo=timezone.utc)
            is_eligible = ef <= now
        else:
            is_eligible = d.last_donation_at is None  # never donated → eligible
        donors_data.append(
            {
                "donor_id": d.id,
                "blood_type": d.blood_type,
                "is_eligible": is_eligible,
                "lat": d.latitude,
                "lon": d.longitude,
                "response_score": d.response_score,
            }
        )

    ranked = rank_donors(
        donors_data,
        {
            "blood_type": campaign.blood_type_needed,
            "center_lat": center_lat,
            "center_lon": center_lon,
            "radius_km": campaign.target_radius_km,
        },
    )

    # Only keep donors with score > 0
    qualified = [d for d in ranked if d["score"] > 0]
    avg_score = round(sum(d["score"] for d in qualified) / len(qualified), 2) if qualified else 0.0

    # Remove old targeting result if any
    old_q = await db.execute(
        select(CampaignTargetingResult).where(CampaignTargetingResult.campaign_id == campaign_id)
    )
    old = old_q.scalar_one_or_none()
    if old:
        await db.delete(old)
        await db.flush()  # ensure DELETE is sent before INSERT on unique column

    targeting = CampaignTargetingResult(
        campaign_id=campaign_id,
        target_donor_count=len(qualified),
        recommended_send_time="09:00",
        average_score=avg_score,
        notes=f"Top {min(len(qualified), 20)} donors selected. Campaign city: {campaign.city}.",
    )
    db.add(targeting)
    await db.commit()
    await db.refresh(targeting)
    return CampaignTargetingResultOut.model_validate(targeting)


@router.post("/{campaign_id}/activate", response_model=CampaignOut)
async def activate_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_roles(*_PRIVILEGED)),
) -> CampaignOut:
    camp_result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = camp_result.scalar_one_or_none()
    if campaign is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found")
    if campaign.status == CampaignStatus.completed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Campaign already completed")

    # Fetch targeting result to know which donors to notify
    tgt_result = await db.execute(
        select(CampaignTargetingResult).where(CampaignTargetingResult.campaign_id == campaign_id)
    )
    targeting = tgt_result.scalar_one_or_none()

    now = datetime.now(timezone.utc)

    if targeting:
        # Fetch all eligible donors (re-score to get ranked list)
        donors_result = await db.execute(select(DonorProfile))
        donors = donors_result.scalars().all()

        # Build notifications for top N donors
        top_n = min(targeting.target_donor_count, len(donors))
        donors_data = []
        for d in donors:
            if d.last_donation_at and d.eligible_from:
                ef = d.eligible_from if d.eligible_from.tzinfo else d.eligible_from.replace(tzinfo=timezone.utc)
                is_eligible = ef <= now
            else:
                is_eligible = True
            donors_data.append(
                {
                    "donor_id": d.id,
                    "blood_type": d.blood_type,
                    "is_eligible": is_eligible,
                    "lat": d.latitude,
                    "lon": d.longitude,
                    "response_score": d.response_score,
                }
            )

        bc_result = await db.execute(select(BloodCenter).where(BloodCenter.id == campaign.blood_center_id)) if campaign.blood_center_id else None
        bc = None
        if bc_result:
            bc = bc_result.scalar_one_or_none()

        ranked = rank_donors(
            donors_data,
            {
                "blood_type": campaign.blood_type_needed,
                "center_lat": bc.latitude if bc else None,
                "center_lon": bc.longitude if bc else None,
                "radius_km": campaign.target_radius_km,
            },
        )[:top_n]

        for donor_data in ranked:
            notif = Notification(
                campaign_id=campaign_id,
                donor_id=donor_data["donor_id"],
                sent_at=now,
                status=NotificationStatus.sent,
            )
            db.add(notif)

    campaign.status = CampaignStatus.active
    await db.commit()
    await db.refresh(campaign)
    return CampaignOut.model_validate(campaign)

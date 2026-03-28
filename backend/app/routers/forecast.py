from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.intelligence.forecasting import risk_level_from_score
from app.models.models import ForecastResult, User
from app.schemas.schemas import ForecastResultOut

router = APIRouter(prefix="/forecast", tags=["forecast"])


def _to_out(f: ForecastResult) -> ForecastResultOut:
    out = ForecastResultOut.model_validate(f)
    out.risk_level = risk_level_from_score(f.predicted_shortage_risk)
    return out


@router.get("", response_model=list[ForecastResultOut])
async def list_forecasts(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ForecastResultOut]:
    result = await db.execute(
        select(ForecastResult).order_by(ForecastResult.predicted_shortage_risk.desc())
    )
    return [_to_out(f) for f in result.scalars().all()]


@router.get("/{city}/{blood_type}", response_model=ForecastResultOut)
async def get_forecast(
    city: str,
    blood_type: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ForecastResultOut:
    # Normalise blood_type URL encoding (e.g. O%2B → O+)
    blood_type = blood_type.replace("%2B", "+").replace("%2b", "+")
    result = await db.execute(
        select(ForecastResult)
        .where(ForecastResult.city == city)
        .where(ForecastResult.blood_type == blood_type)
        .order_by(ForecastResult.generated_at.desc())
        .limit(1)
    )
    forecast = result.scalar_one_or_none()
    if forecast is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Forecast not found")
    return _to_out(forecast)

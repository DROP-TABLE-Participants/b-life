from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.models import BloodCenter, Institution, User
from app.schemas.schemas import BloodCenterOut, InstitutionOut

router = APIRouter(tags=["institutions"])


@router.get("/institutions", response_model=list[InstitutionOut])
async def list_institutions(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[InstitutionOut]:
    result = await db.execute(select(Institution).where(Institution.verified.is_(True)).order_by(Institution.name))
    return [InstitutionOut.model_validate(i) for i in result.scalars().all()]


@router.get("/blood-centers", response_model=list[BloodCenterOut])
async def list_blood_centers(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[BloodCenterOut]:
    result = await db.execute(select(BloodCenter).order_by(BloodCenter.city, BloodCenter.name))
    return [BloodCenterOut.model_validate(bc) for bc in result.scalars().all()]

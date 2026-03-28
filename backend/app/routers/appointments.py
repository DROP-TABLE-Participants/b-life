from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.models import Appointment, AppointmentStatus, BloodCenter, DonorProfile, User, UserRole
from app.schemas.schemas import AppointmentCreateRequest, AppointmentOut

router = APIRouter(prefix="/appointments", tags=["appointments"])


@router.post("", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    body: AppointmentCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AppointmentOut:
    if current_user.role != UserRole.donor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only donors can book appointments")

    donor_result = await db.execute(select(DonorProfile).where(DonorProfile.user_id == current_user.id))
    donor = donor_result.scalar_one_or_none()
    if donor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Donor profile not found")

    bc_result = await db.execute(select(BloodCenter).where(BloodCenter.id == body.blood_center_id))
    if bc_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Blood center not found")

    appointment = Appointment(
        donor_id=donor.id,
        campaign_id=body.campaign_id,
        blood_center_id=body.blood_center_id,
        appointment_time=body.appointment_time,
        status=AppointmentStatus.scheduled,
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)
    return AppointmentOut.model_validate(appointment)


@router.get("", response_model=list[AppointmentOut])
async def list_appointments(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AppointmentOut]:
    if current_user.role == UserRole.donor:
        donor_result = await db.execute(select(DonorProfile).where(DonorProfile.user_id == current_user.id))
        donor = donor_result.scalar_one_or_none()
        if donor is None:
            return []
        result = await db.execute(
            select(Appointment)
            .where(Appointment.donor_id == donor.id)
            .order_by(Appointment.appointment_time.desc())
        )
    else:
        result = await db.execute(select(Appointment).order_by(Appointment.appointment_time.desc()))

    return [AppointmentOut.model_validate(a) for a in result.scalars().all()]

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.auth.dependencies import get_current_user
from app.auth.service import create_access_token, hash_password, verify_password
from app.database import get_db
from app.models.models import DonorProfile, User, UserRole
from app.schemas.schemas import TokenResponse, UserLoginRequest, UserOut, UserRegisterRequest

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(body: UserRegisterRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    try:
        role = UserRole(body.role)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid role: {body.role}")

    user = User(email=body.email, hashed_password=hash_password(body.password), role=role)
    db.add(user)
    await db.flush()  # get user.id before commit

    if role == UserRole.donor:
        profile = DonorProfile(
            user_id=user.id,
            full_name=body.full_name or body.email.split("@")[0],
            blood_type="O+",
            city="Unknown",
            response_score=0.5,
            total_donations=0,
        )
        db.add(profile)

    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(access_token=token, role=user.role.value, user_id=user.id)


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLoginRequest, db: AsyncSession = Depends(get_db)) -> TokenResponse:
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return TokenResponse(access_token=token, role=user.role.value, user_id=user.id)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)) -> UserOut:
    return UserOut.model_validate(current_user)

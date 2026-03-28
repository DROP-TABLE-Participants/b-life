from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_all_tables


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    await create_all_tables()
    yield


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ──────────────────────────────────────────────────────────────────
from app.auth.router import router as auth_router  # noqa: E402
from app.routers.analytics import router as analytics_router  # noqa: E402
from app.routers.appointments import router as appointments_router  # noqa: E402
from app.routers.campaigns import router as campaigns_router  # noqa: E402
from app.routers.dashboard import router as dashboard_router  # noqa: E402
from app.routers.donors import router as donors_router  # noqa: E402
from app.routers.forecast import router as forecast_router  # noqa: E402
from app.routers.institutions import router as institutions_router  # noqa: E402

API_PREFIX = "/api/v1"

app.include_router(auth_router, prefix=API_PREFIX)
app.include_router(dashboard_router, prefix=API_PREFIX)
app.include_router(forecast_router, prefix=API_PREFIX)
app.include_router(institutions_router, prefix=API_PREFIX)
app.include_router(campaigns_router, prefix=API_PREFIX)
app.include_router(donors_router, prefix=API_PREFIX)
app.include_router(appointments_router, prefix=API_PREFIX)
app.include_router(analytics_router, prefix=API_PREFIX)


@app.get("/", tags=["health"])
async def health() -> dict:
    return {"status": "ok", "name": settings.app_name, "version": settings.app_version}

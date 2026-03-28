# B-Live Architecture Overview

## System Design

B-Live follows a clean separation between the **Operational Layer** (data, auth, CRUD) and the **Intelligence Layer** (forecasting, scoring, recommendations).

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  Next.js 14 · TypeScript · Tailwind CSS · Recharts           │
│                                                              │
│  Institution Portal          Donor Portal                    │
│  ├─ Dashboard                ├─ My Profile                   │
│  ├─ Forecast Intelligence    ├─ Eligibility Status           │
│  ├─ Campaign Management      ├─ Active Campaigns             │
│  └─ Analytics                └─ Appointment Booking          │
└──────────────────────┬──────────────────────────────────────┘
                       │ REST API (JSON/JWT)
┌──────────────────────▼──────────────────────────────────────┐
│                        BACKEND                               │
│  FastAPI · Python 3.11 · SQLAlchemy · Pydantic               │
│                                                              │
│  ┌─────────────────────┐  ┌──────────────────────────────┐   │
│  │  OPERATIONAL LAYER  │  │    INTELLIGENCE LAYER        │   │
│  │                     │  │                              │   │
│  │  Auth / JWT         │  │  Shortage Forecasting        │   │
│  │  User Management    │  │  - Supply/demand ratio       │   │
│  │  Donor Profiles     │  │  - Seasonal risk factors     │   │
│  │  Institutions       │  │  - Rarity weighting          │   │
│  │  Blood Centers      │  │                              │   │
│  │  Inventory Snapshots│  │  Donor Scoring               │   │
│  │  Campaigns          │  │  - Blood type match          │   │
│  │  Notifications      │  │  - Eligibility status        │   │
│  │  Appointments       │  │  - Geographic proximity      │   │
│  │  Donation History   │  │  - Response history          │   │
│  └─────────────────────┘  └──────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                       DATABASE                               │
│  SQLite (development) / PostgreSQL (production)              │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Campaign Activation Flow

```
Institution Admin
     │
     ▼
Create Campaign (blood_type, urgency, city, radius, center)
     │
     ▼
POST /campaigns/{id}/target
     │
     ├─ Query eligible donors in radius
     ├─ Run donor scoring algorithm
     ├─ Rank by score
     └─ Create CampaignTargetingResult
          │
          ▼
POST /campaigns/{id}/activate
     │
     ├─ Create Notification records for top N donors
     ├─ Update campaign status → "active"
     └─ Trigger forecast re-evaluation
          │
          ▼
Donor receives notification
     │
     ▼
POST /appointments (donor books slot)
     │
     ├─ Creates Appointment record
     ├─ Updates donor's eligible_from
     └─ Updates projected shortage risk
```

### Shortage Forecasting Flow

```
Inventory Snapshots + Historical Data
     │
     ▼
Forecasting Engine
     │
     ├─ Compute supply pressure (available/expected ratio)
     ├─ Apply seasonal risk multiplier
     ├─ Factor in blood type rarity
     ├─ Consider recent campaign response rates
     └─ Weight and normalize → risk score 0.0–1.0
          │
          ▼
ForecastResult
     │
     ├─ predicted_shortage_risk: 0.87
     ├─ risk_level: "critical"
     ├─ predicted_units_needed: 45
     ├─ confidence_score: 0.82
     └─ factors_json: ["low_stock", "high_demand", "rare_type"]
```

## Role-Based Access Control

| Endpoint Category | donor | campaign_operator | institution_admin |
|------------------|-------|-------------------|-------------------|
| GET /auth/me | ✓ | ✓ | ✓ |
| GET /dashboard/overview | — | ✓ | ✓ |
| GET /forecast | ✓ | ✓ | ✓ |
| POST /campaigns | — | ✓ | ✓ |
| POST /campaigns/{id}/activate | — | ✓ | ✓ |
| GET /donors/me | ✓ | — | — |
| POST /appointments | ✓ | — | — |
| GET /analytics | — | ✓ | ✓ |

## Database Schema

### Core Relationships

```
User (1) ──── (1) DonorProfile
User (1) ──── (n) Appointment
User (1) ──── (n) Notification

Institution (1) ──── (n) BloodCenter
Institution (1) ──── (n) Campaign

BloodCenter (1) ──── (n) InventorySnapshot
BloodCenter (1) ──── (n) Appointment
BloodCenter (1) ──── (n) DonationHistory

Campaign (1) ──── (1) CampaignTargetingResult
Campaign (1) ──── (n) Notification
Campaign (1) ──── (n) Appointment
```

## Intelligence Layer Details

### Donor Scoring Formula

```python
score = 0.0

# 1. Blood type compatibility (40 points max)
if donor.blood_type == campaign.blood_type_needed:
    score += 40
elif is_compatible(donor.blood_type, campaign.blood_type_needed):
    score += 20

# 2. Eligibility (25 points)
if donor.eligible_from <= today:
    score += 25
elif days_until_eligible <= 7:
    score += 10

# 3. Distance score (20 points)
dist_km = haversine(donor.lat, donor.lon, center.lat, center.lon)
score += max(0, 20 - (dist_km / max_radius_km) * 20)

# 4. Response history (15 points)
score += donor.response_score * 15  # response_score is 0.0–1.0
```

### Shortage Risk Formula

```python
# Supply pressure (0–1, higher = more risky)
supply_ratio = available_units / max(expected_demand_units, 1)
supply_pressure = max(0, 1 - supply_ratio)  # 0 = plentiful, 1 = none

# Weighted risk
risk = (
    supply_pressure          * 0.40 +
    demand_factor            * 0.20 +  # recent demand growth
    seasonal_risk            * 0.15 +  # holidays, events
    rarity_factor            * 0.15 +  # O- rarer than A+
    turnout_decline_factor   * 0.10    # falling donation rates
)
```

## Environment Configuration

### Backend (.env)
```
DATABASE_URL=sqlite+aiosqlite:///./blive.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
APP_NAME=B-Live
APP_VERSION=1.0.0
```

### Frontend (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

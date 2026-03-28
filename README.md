# B-Live — AI-Powered Blood Shortage Prevention Platform

> **"A child does not die because there are no donors. A child dies because the right donor was not activated in time."**

B-Live is a verified institution-led blood shortage prevention platform with a predictive intelligence layer. It helps blood centers, hospitals, and municipalities predict shortages before they happen, identify the best eligible donors to activate, and launch targeted campaigns through an official, trusted flow.

---

## 🩸 What B-Live Is

B-Live is **NOT** a public donor matching app. It is an operational platform for verified institutions with:

- **Shortage Forecasting** — AI-driven risk scoring per blood type and city
- **Donor Scoring & Prioritization** — Surface the right donors at the right time
- **Verified Institution Campaigns** — Only certified institutions can create campaigns
- **Donor Appointment Booking** — Official, trusted flow from alert to arm
- **Outcome Analytics** — See the before/after impact of every campaign

---

## 🏗️ Architecture

```
b-live/
├── backend/          # FastAPI + SQLAlchemy + SQLite (swap for PostgreSQL in prod)
│   ├── app/
│   │   ├── auth/          # JWT authentication
│   │   ├── models/        # SQLAlchemy domain models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── routers/       # API route handlers
│   │   ├── intelligence/  # Forecasting & donor scoring engines
│   │   ├── main.py
│   │   ├── config.py
│   │   └── database.py
│   ├── seed.py            # Demo data seeder
│   └── requirements.txt
├── frontend/         # Next.js 14 App Router + TypeScript + Tailwind CSS
│   ├── src/
│   │   ├── app/          # Pages (auth, institution, donor routes)
│   │   ├── components/   # Reusable UI components & charts
│   │   ├── contexts/     # Auth context
│   │   ├── lib/          # API client
│   │   └── types/        # TypeScript type definitions
│   └── package.json
├── docs/             # Architecture and demo documentation
├── scripts/          # Utility scripts
└── docker-compose.yml
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Python 3.11+
- Node.js 20+
- npm or yarn

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed demo data (creates SQLite DB + all tables + demo accounts)
python seed.py

# Start the API server
uvicorn app.main:app --reload
# API available at http://localhost:8000
# Docs available at http://localhost:8000/docs
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server (uses http://localhost:8000 as API by default)
npm run dev
# App available at http://localhost:3000
```

### Docker Compose (Full Stack)

```bash
docker-compose up --build
# Backend: http://localhost:8000
# Frontend: http://localhost:3000
```

---

## 🔑 Demo Accounts

| Role | Email | Password | Access |
|------|-------|----------|--------|
| Institution Admin | admin@sofiabc.bg | admin123 | Full dashboard, campaigns, analytics |
| Campaign Operator | operator@sofiabc.bg | operator123 | Campaigns, targeting |
| Donor (O-) | donor1@example.com | donor123 | Donor portal, booking |

---

## 📱 Key Screens

### Institution Dashboard
- Real-time shortage overview across all blood types
- Forecast for next 24–72 hours with confidence scores
- Donor activation stats and campaign performance
- Before/after campaign impact metrics

### Campaign Management
- Create targeted campaigns (blood type, urgency, region, radius)
- AI-powered donor segment recommendations
- One-click campaign activation
- Live response tracking

### Donor Portal
- Personal eligibility countdown
- Verified active campaigns near you
- Appointment booking with time slots
- Donation impact stats

### Forecast Intelligence
- Blood type risk scores by city
- Top contributing factors (supply/demand ratio, seasonal risk, etc.)
- Recommended actions per forecast

### Analytics
- Campaign funnel: Targeted → Notified → Opened → Booked → Donated
- Shortage risk reduction projections
- Historical campaign effectiveness

---

## 🧠 Intelligence Layer

### Shortage Forecasting Algorithm

The forecasting engine computes a risk score (0–1) for each city + blood type combination:

```
Risk = (
  supply_pressure * 0.40 +     # available / expected ratio
  demand_growth * 0.20 +       # recent demand trend
  seasonal_factor * 0.15 +     # holiday/seasonal risk
  rarity_factor * 0.15 +       # O-neg > O+ > A+ etc.
  recent_turnout_factor * 0.10 # campaign response rate
)
```

Output: `predicted_shortage_risk` (0–1), risk level, top contributing factors, confidence score.

### Donor Scoring Algorithm

Each donor is scored 0–100 for a given campaign:

```
Score = (
  blood_type_match * 40 +    # Exact match = 40, compatible = 20
  eligibility * 25 +          # 56 days since last donation
  distance_score * 20 +       # Haversine distance to center
  response_history * 15       # Historical response rate
)
```

Donors are ranked and the top N (configurable by campaign) are selected for notification.

---

## 🔒 Security

- JWT Bearer token authentication (HS256)
- Role-based access control (donor / institution_admin / campaign_operator)
- Only verified institutions can create/activate campaigns
- Donor data scoped to authenticated user only
- Input validation via Pydantic
- CORS configured (restrict origins in production)

---

## 📡 API Reference

Base URL: `http://localhost:8000/api/v1`

Interactive docs: `http://localhost:8000/docs`

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/register | Register new user |
| POST | /auth/login | Login → JWT token |
| GET | /auth/me | Current user info |

### Dashboard & Forecast
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /dashboard/overview | KPIs, risk summary, recent campaigns |
| GET | /forecast | All forecasts |
| GET | /forecast/{city}/{blood_type} | Specific forecast |

### Campaigns
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /campaigns | Create campaign (institution only) |
| GET | /campaigns | List campaigns |
| GET | /campaigns/{id} | Campaign detail |
| POST | /campaigns/{id}/target | Run donor targeting |
| POST | /campaigns/{id}/activate | Activate + notify donors |

### Donors & Appointments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /donors/me | Donor profile |
| GET | /donors/me/eligibility | Eligibility status |
| GET | /donors/me/notifications | Notifications |
| GET | /donors/me/appointments | My appointments |
| POST | /appointments | Book appointment |
| GET | /appointments | List appointments |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /analytics/campaigns/{id} | Campaign stats |
| GET | /analytics/shortage-impact | Before/after risk comparison |

---

## 🎯 Demo Scenario

**Sofia O-Negative Shortage Crisis:**

1. Login as `admin@sofiabc.bg`
2. **Dashboard** shows O- blood type at **CRITICAL** risk in Sofia
3. **Forecast** page shows 87% shortage probability, 48h window
4. Navigate to **Campaigns** → Create campaign for O-negative, Sofia, Critical urgency
5. Click **Run Targeting** — system identifies eligible O-negative donors near Sofia
6. Click **Activate Campaign** — notifications sent, risk projection updated
7. Login as `donor1@example.com` → **Portal** shows urgent campaign
8. Book appointment at Sofia Blood Center for tomorrow 10:00
9. Return to institution dashboard — projected shortage risk drops from 87% → 52%
10. **Analytics** shows campaign funnel and impact

---

## 📁 Domain Models

| Model | Description |
|-------|-------------|
| User | Auth identity with role |
| DonorProfile | Donor details, blood type, location, eligibility |
| Institution | Verified hospital/blood center/municipality |
| BloodCenter | Collection point with coordinates and hours |
| InventorySnapshot | Blood stock levels per center/date |
| Campaign | Targeted donation drive by institution |
| CampaignTargetingResult | AI-selected donor segment for a campaign |
| Notification | Donor notification from campaign |
| Appointment | Booked donation slot |
| DonationHistory | Past donations record |
| ForecastResult | AI shortage prediction per city/blood type |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts |
| Backend | FastAPI, Python 3.11, SQLAlchemy |
| Database | SQLite (dev) / PostgreSQL (production) |
| Auth | JWT (python-jose + passlib) |
| Charts | Recharts |
| Deployment | Docker + docker-compose |

---

## 🚀 Production Deployment

For production, swap SQLite for PostgreSQL:

```bash
# In backend/.env
DATABASE_URL=postgresql+asyncpg://user:password@host/blivedb
SECRET_KEY=your-production-secret-key-here
```

Update `requirements.txt` to add `asyncpg` and remove `aiosqlite`.

---

*B-Live — DROP-TABLE Hackathon 2026*

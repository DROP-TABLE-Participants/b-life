# B-Live Hackathon Demo Script

## Setup (5 minutes before demo)

1. Start backend: `cd backend && python seed.py && uvicorn app.main:app --reload`
2. Start frontend: `cd frontend && npm run dev`
3. Open browser to http://localhost:3000
4. Have two browser tabs ready: one for institution admin, one for donor view

---

## Demo Flow (10–12 minutes)

### Act 1: The Problem (1 min)

> "Right now, hospitals in Sofia have less than 24 hours of O-negative blood left. 
> O-negative is the universal donor type — it's what goes into emergency surgeries, 
> trauma cases, and newborns. When it runs out, doctors are forced to choose.
> B-Live exists so they never have to."

### Act 2: Institution Dashboard (2 min)

Login as `admin@sofiabc.bg` / `admin123`

Point out:
- **CRITICAL alert** for O-negative in Sofia at 87% shortage risk
- Dashboard shows 4 KPIs at a glance: active campaigns, donors targeted, risk level, critical alerts
- The Blood Type Risk chart — visually show O-neg is red/critical vs A+ which is green/low

> "This is the view a blood center director sees every morning. The system has already 
> computed the shortage risk overnight using our forecasting engine."

### Act 3: Forecast Intelligence (2 min)

Navigate to `/forecast`

Select Sofia + O-Negative:
- Show the risk score: **87%**
- Show contributing factors: "Low stock (2 units vs 28 expected)", "High demand period", "Rare blood type"
- Show confidence score: 82%
- Show recommended action: "Launch critical campaign immediately"

> "This isn't just a stock counter. Our intelligence engine factors in historical demand 
> patterns, seasonal effects, and blood type rarity. O-negative is 7% of the population 
> but 100% of emergency cases."

### Act 4: Campaign Creation & Activation (3 min)

Navigate to `/campaigns`

Create new campaign:
- Blood type: **O-**
- Urgency: **Critical**
- City: **Sofia**
- Radius: **25 km**
- Center: **Sofia Central Blood Center**
- Submit

Campaign created → Click on it → Click **"Run Targeting"**

> "The system scores every eligible O-negative donor in the Sofia region using our 
> donor prioritization algorithm. It considers blood type match, eligibility status, 
> distance to the center, and historical response rate."

Show targeting result:
- "23 eligible donors identified"
- "Average donor score: 74/100"
- "Recommended send time: Today 14:00"

Click **"Activate Campaign"**

> "Campaign activated. 23 donors just received a notification. The platform is now 
> tracking responses in real time."

### Act 5: Donor Experience (2 min)

Open new tab / incognito → Login as `donor1@example.com` / `donor123`

Show donor portal:
- **Eligible now** badge (green)
- Blood type: **O-** badge
- Active campaign notification visible
- "Sofia Central Blood Center — CRITICAL shortage"

Click "Book Appointment":
- Select time slot: Tomorrow 10:00
- Confirm booking
- Show success state with "Your donation helps prevent a critical shortage"

> "The donor sees only verified, institutional campaigns. No random requests from 
> strangers. This is a trusted, official flow — like booking a medical appointment."

### Act 6: Impact Analytics (1 min)

Return to institution tab → Navigate to `/analytics`

Show:
- Campaign funnel: 23 targeted → 23 notified → 8 opened → 5 booked
- **Before campaign risk: 87%**
- **After campaign risk: 52%** ← projected with current bookings
- "If all 23 donors respond, projected risk drops to 31%"

> "From forecast to campaign to donor response — in one hour, projected shortage risk 
> dropped 35 points. One more day of bookings and we've averted the crisis."

### Act 7: The Ask (1 min)

> "B-Live is not a donor matching app. It's an operational platform for blood centers 
> and hospitals to predict shortages before they become crises, activate the right donors 
> at the right time, and measure impact in real time.
>
> The infrastructure is built. The intelligence layer is working. 
> What we're looking for is pilot partnerships with blood centers to run this for real.
>
> Because the right donor, activated in time, saves a life."

---

## Key Metrics to Highlight

- **87% → 52%** shortage risk reduction after single campaign activation
- **23 donors** targeted with precision scoring in under 1 second
- **3 roles** — institution admin, campaign operator, donor — all separate secure flows
- **11 domain models** with real business logic, not toy data
- **Full-stack MVP** running locally in under 5 minutes

---

## Technical Differentiators

1. **Shortage Forecasting Engine** — weighted multi-factor risk scoring, not just inventory count
2. **Donor Prioritization Algorithm** — blood type + eligibility + distance + response history
3. **Verified Institution Flow** — no public requests, only certified institution campaigns
4. **Impact Simulation** — shows projected risk before AND after campaign response
5. **Role-based security** — JWT auth with three distinct access levels

---

## Q&A Prep

**Q: Is the forecasting AI/ML?**
A: The MVP uses a rule-based weighted scoring engine. The architecture is designed for drop-in ML replacement — the forecasting module accepts the same input/output contract whether powered by rules or a trained model.

**Q: How does it integrate with existing hospital systems?**
A: For the MVP, institutions manually update inventory. The integration layer would connect to HIS/LIS via HL7 FHIR — the data model is designed to receive those feeds.

**Q: What about GDPR / donor data?**
A: Donor data is scoped strictly to the authenticated user. Institution staff only see aggregate targeting counts, not individual donor details. Full compliance would add consent management and data retention policies.

**Q: Why SQLite and not a real database?**
A: SQLite for hackathon zero-setup. The SQLAlchemy abstraction means a single config change deploys to PostgreSQL in production.

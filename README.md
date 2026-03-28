# B.Life

B.Life is a frontend-first blood supply chain command center MVP for hospitals and a regional control tower.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Zustand state management
- Framer Motion + React Three Fiber for cinematic visuals
- localStorage persistence with deterministic seeding

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Demo flow

1. On first load, app seeds a realistic network state in localStorage.
2. Choose **Hospital Login** and select a hospital, or enter **Control Tower Login**.
3. Observe live shipment progress, shortage/surplus forecasts, and transfer recommendations.
4. Trigger recommendation approvals/dispatch and mark shipments received.
5. Use **Reset Demo Data** to re-seed scenarios.

## Core folders

- `app/` routes (`/`, `/hospital/[hospitalId]`, `/control-tower`)
- `types/domain.ts` typed domain model
- `lib/storage.ts` localStorage abstraction
- `lib/seed.ts` seeded simulation world
- `lib/forecasting.ts` weighted risk engine
- `lib/redistribution.ts` autonomous recommendation engine
- `store/useAppStore.ts` local persisted app state/actions

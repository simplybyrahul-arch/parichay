# ShotcutCrew

ShotcutCrew is an AI-enabled creative production marketplace built with Next.js App Router and Supabase.

It supports:
- Role-based auth (Client vs Creator)
- Creator subtype flow (Studio Owner vs Freelancer)
- Booking flows (Quick Booking, Build Your Crew, Equipment Booking)
- Script upload and no-key local AI-style requirement analysis
- Client and creator dashboards
- Escrow flow via Razorpay APIs

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (auth + database)
- SWR (data fetching)
- Framer Motion (UI animation)
- Razorpay (escrow funding integration)

## Project Structure

- `src/app/*`: Routes, layouts, pages, and API handlers
- `src/components/*`: Shared UI components
- `src/utils/supabase/*`: Client/server Supabase helpers
- `supabase/*.sql`: Database migration scripts
- `docs/*`: Product, API, and implementation documentation

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Configure environment variables in `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
```

3. Run dev server:

```bash
npm run dev
```

4. Production build check:

```bash
npm run build
```

## Booking Modes

### Quick Booking

Flow order:
1. Event Type
2. Photographer/Videographer Count
3. Date
4. Budget (slider + fixed budget option)

### Build Your Crew

Custom role-based crew builder with per-day pricing and duration multiplier.

### Equipment Booking

Standalone equipment rental path for users who only need gear.

### Script Analysis

`/api/ai/analyze` uses a local keyword/rule engine (no external AI API key required) to infer:
- Recommended roles
- Suggested equipment
- Production requirements
- Estimated duration

## Creator Profile Validation Rules

Validated in creator dashboard save flow:
- `studio_owner`: location required + portfolio URL required
- `freelancer`: portfolio URL required

## Branding

Branding has been updated from older naming to **ShotcutCrew** across metadata, pages, labels, and logos.

## Important Notes

- If you see hydration mismatch warnings showing `fdprocessedid`, that is usually extension-injected DOM mutation. Targeted suppression is implemented in dashboard controls.
- Next.js warns that `middleware.ts` convention is deprecated in favor of `proxy` for newer versions.

## Documentation Index

- `docs/FEATURES.md`
- `docs/API.md`
- `docs/DEPLOYMENT.md`


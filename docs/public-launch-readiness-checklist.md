# ShotcutCrew Public Launch Readiness Checklist

Last updated: May 2026

## Public Copy Verification

- Homepage copy avoids unsupported claims about blockchain, Hyperledger, DID, smart contracts, on-chain records, immutable ledgers, legal escrow, auto-assignment, and guaranteed real-time pricing.
- Quick Booking copy says clients review matching providers and choose before confirmation.
- Custom Project / Builder copy positions the flow as an RFQ-style requirement builder, not an instant fixed-price calculator.
- AI Script Analysis copy says recommendations are planning guidance and provider confirmation is still required.
- Equipment Rental copy says availability and quotes are confirmed by vendors.

## Legal And Payment Wording

- Public pages should use "payment tracking", "manual verification", "provider confirmation", "quotes", and "admin-reviewed workflows".
- Avoid legal escrow language unless a lawyer-approved escrow/payment product is actually live.
- Avoid smart-contract, blockchain, immutable ledger, and automated settlement claims.
- Legal routes to smoke test:
  - `/terms`
  - `/privacy`
  - `/refund-policy`
  - `/creator-agreement`
  - `/equipment-rental-terms`
  - `/community-guidelines`
  - `/ai-disclaimer`

## Migrations To Confirm Before Production

- Confirm all Supabase migrations used by the current branch have been applied in order.
- At minimum, verify migrations through `supabase/033_script_analysis_daily_ai_credit.sql` if the live branch includes the AI daily-credit limit.
- Confirm vendor, finance, legal consent, portfolio, booking status, and script-analysis migrations match the deployed code before enabling public signup and bookings.

## Vercel And GitHub Checks

- Vercel may fail a GitHub check if the commit author email is not linked to a GitHub account.
- Before production deployment, make sure local Git user email matches a verified email on the GitHub account connected to Vercel.
- Use the intended Vercel project only: `simplybyrahul-arch-parichay-v6xd`.

## Manual Smoke Test Routes

- `/`
- `/book`
- `/signup`
- `/equipment`
- `/terms`
- `/privacy`
- `/refund-policy`
- `/creator-agreement`
- `/equipment-rental-terms`
- `/ai-disclaimer`

## Pre-Launch Manual Checks

- New client signup works and creates the expected profile.
- New creator signup works and lands on the correct dashboard after login.
- New equipment vendor signup works and lands on `/vendor-dashboard`.
- Quick Booking can reach review/matching without broken navigation.
- Equipment request flow does not expose creator-only matching copy.
- AI Script Analysis handles provider failure and daily limits without showing a hard error for fallback suggestions.
- Footer links open real pages and no `/blog` or `/careers` links are exposed unless those pages are ready.

## Deployment Note

This checklist is local review guidance only. Do not deploy, push, or change production Supabase directly from this cleanup step.

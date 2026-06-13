# PROJECT_STATE — Customer Loyalty CRM Program

## Current project

Customer Loyalty / CRM web app for LINE LIFF pilot. Current pilot shop: `im-sticker`.

## Current stack

- Next.js 16.2.7
- React 19
- Neon Database
- LINE LIFF foundation
- Local browser cache with API sync to Neon

## Latest completed phase in this package

Phase 6C.5 — Pilot Checklist with Database

## New in Phase 6C.5

- Added `ShopOnboardingChecklist` type
- Added `shop_onboarding_checklists` Neon table
- Added migration file `neon/migrations/002_phase_6c5_pilot_checklist.sql`
- Added `onboardingChecklists` entity to local cache + Neon sync
- Added Pilot Checklist card in Merchant Settings
- Added auto checklist from existing shop/reward/transaction/coupon data
- Added manual checklist persisted to Neon
- Updated README and docs

## Important routes

- Merchant dashboard: `/merchant/{shopSlug}`
- Customer app: `/customer/{shopSlug}`
- Admin: `/admin`

## Next recommended phases

1. Phase 6D — Point Rules Schema and UI
2. Phase 6E — Membership Tiers table and tier calculation from DB
3. Phase 6F — Point Expiry foundation
4. Phase 6G — Real image storage

## Deployment rule

For DB phases, run SQL migration in Neon first, then deploy code.

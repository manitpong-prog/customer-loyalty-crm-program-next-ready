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


## Phase 7H3 — Stable Rollback + LIFF Tab Fix

- ใช้ไฟล์ backup ที่ Customer route และแท็บยังเสถียรเป็นฐาน
- ถอยการ refactor CustomerDashboard/App/LineLoginPanel จาก 7G/7H ที่ทำให้ `/customer/{slug}` และ `?tab=...` พัง
- เพิ่มเฉพาะ LIFF deep-link parser ที่ปลอดภัย: decode `liff.state` หลายชั้น, เก็บ `tab`/coupon code ของระบบ, แยก LINE OAuth `code` ออกจาก coupon `code`
- ปรับ `/api/db/snapshot` และ LINE APIs ให้ไม่เรียก `ensureCrmSchema()` ทุก request เว้นแต่ตั้ง `ENABLE_RUNTIME_SCHEMA_CHECK=true`
- ไม่ต้องรัน SQL ใหม่ และ Production ไม่ควรตั้ง `ENABLE_RUNTIME_SCHEMA_CHECK=true`

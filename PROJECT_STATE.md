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

Phase 6D — Point Rules Schema and UI

## New in Phase 6D

- Added point rule fields to `Shop`
- Added `src/lib/pointRules.ts` as the central helper for earning-point calculation
- Added Neon migration `neon/migrations/003_phase_6d_point_rules.sql`
- Added point rule columns to `shops`
- Updated Neon snapshot/sync mapping for new shop fields
- Added “ตั้งค่ากฎการสะสมแต้ม” card in Merchant Settings
- Point-link generation now uses per-link expiry minutes in the “รับแต้ม” tab, default 10 minutes
- Updated purchase/manual earning calculation to use `calculateEarnPoints()`
- Added docs in `docs/POINT_RULES_PHASE6D_TH.md`

## Important routes

- Merchant dashboard: `/merchant/{shopSlug}`
- Customer app: `/customer/{shopSlug}`
- Admin: `/admin`

## Next recommended phases

1. Phase 6E — Membership Tiers table and tier calculation from DB
2. Phase 6F — Point Expiry foundation
3. Phase 6G — Real image storage

## Deployment rule

For DB phases, run SQL migration in Neon first, then deploy code.


Phase 6D cleanup: removed duplicate-claim-per-link setting. Coupons are intentionally one-use only. If the earlier 6D migration was already run, use neon/migrations/004_phase_6d_remove_duplicate_claim_setting.sql to drop the old column.

Phase 6D small correction: point-link expiry is no longer configured in Merchant Settings. It is configured per generated point link in the “รับแต้ม” tab as minutes, default 10 minutes.


## Latest patch — Reward approval link check

- เพิ่มช่องตรวจสอบลิงก์รับรางวัลในหน้า `อนุมัติรางวัล`
- รองรับลิงก์ `/merchant/{shopSlug}?merchantTab=approvals&redeem={transactionId}` จากลูกค้า
- เปิด popup อนุมัติ/ไม่อนุมัติอัตโนมัติเมื่อเข้าจากลิงก์ถูกต้อง
- แสดง popup แจ้งลิงก์ไม่ถูกต้องเมื่อไม่พบรายการ
- ไม่ต้องรัน SQL ใหม่สำหรับ patch นี้

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

## Phase 6E — Membership Tiers with DB

- เพิ่มตาราง `membership_tiers` สำหรับระดับสมาชิกแยกตามร้าน
- ค่าเริ่มต้น: Member 0, Silver 500, Gold 1,500, Platinum 3,000, VIP 5,000 แต้มสะสมรวม
- หน้า Merchant → ตั้งค่า มีการ์ด “ตั้งค่าระดับสมาชิก” ให้แก้แต้มขั้นต่ำ/สิทธิ์/เปิดปิดระดับ
- ลูกค้าใหม่เริ่มต้นที่ `Member`
- การเพิ่มแต้มจะคำนวณ badge จาก `lifetimePoints` และ tier settings ของร้าน
- ต้องรัน `neon/migrations/005_phase_6e_membership_tiers.sql` ก่อน deploy

## Latest patch — Membership tier recalculation after point deduction

- แก้ bug หลังปรับลดแต้มแล้ว badge ระดับสมาชิกยังค้างที่ระดับเดิม เช่น lifetimePoints เหลือ 3,000 แต่ยังแสดง Platinum ทั้งที่ Platinum ถูกตั้งไว้ 3,500
- หน้า Merchant จะ normalize `customer.tier` จาก `lifetimePoints` + `membership_tiers` ล่าสุดตอนโหลดข้อมูล
- ตารางสมาชิกและ export detail แสดงระดับจากการคำนวณสด ไม่พึ่งค่า `customer.tier` ที่อาจค้างใน cache
- หน้า Customer แสดง badge/สิทธิ์จากระดับที่คำนวณสดเช่นกัน
- ไม่ต้องรัน SQL ใหม่สำหรับ patch นี้


## Phase 6F — Point Expiry Foundation

เพิ่มฐานข้อมูลวันหมดอายุของแต้มแล้ว โดยใช้ `transactions.points_expires_at` สำหรับรายการรับแต้ม (`earn`) และแสดงแต้มใกล้หมดอายุในหน้าลูกค้า/หลังบ้านร้านค้า เฟสนี้ยังไม่หักแต้มอัตโนมัติ ยังไม่ทำ FIFO และยังไม่ทำ cron job เพื่อให้ปลอดภัยกับข้อมูล Pilot ก่อน

Migration ที่ต้องรันก่อน deploy: `neon/migrations/006_phase_6f_point_expiry_foundation.sql`


## Phase 6G — Vercel Blob Image Storage

- เพิ่ม Vercel Blob สำหรับอัปโหลดโลโก้ร้าน รูปของรางวัล และรูปโปรโมชัน
- เพิ่ม `BLOB_READ_WRITE_TOKEN` ใน `.env.example`
- เพิ่ม migration `neon/migrations/007_phase_6g_vercel_blob_image_storage.sql`
- เก็บ URL/storage key ใหม่ แต่ยังคง field รูปเดิมไว้เพื่อ fallback รูปเก่าแบบ data URL
- เอกสาร: `docs/VERCEL_BLOB_IMAGE_STORAGE_PHASE6G_TH.md`

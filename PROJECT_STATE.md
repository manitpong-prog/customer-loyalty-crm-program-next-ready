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

Pilot Hardening package after Phase 6G — Vercel Blob Image Storage

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

## Next recommended work

1. Run Pilot Hardening checklist end-to-end on the live deployment
2. Fix only bugs found during real pilot testing
3. After pilot is stable, consider Point Lots/FIFO and automatic point expiry jobs

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


## Pilot Hardening — after Phase 6G

- เพิ่มเอกสาร `docs/PILOT_HARDENING_CHECKLIST_TH.md` สำหรับตรวจระบบก่อนเปิด Pilot จริง
- ยืนยันสถานะล่าสุดว่า Dashboard/Export และ Reset Tools มีอยู่แล้ว ไม่ต้องทำซ้ำเป็น phase ใหม่
- สถานะระบบหลักที่ผ่านแล้ว: Pilot Checklist, Point Rules, Reward Approval Link, Membership Tiers, Tier Downgrade Fix, Point Expiry Foundation, Vercel Blob Image Storage
- ข้อจำกัดที่ตั้งใจคงไว้: ยังไม่ทำ FIFO point lots, ยังไม่หักแต้มหมดอายุอัตโนมัติ, ยังไม่ลบไฟล์เก่าใน Blob อัตโนมัติ

## Pilot Hardening Fix: Point Claim Database Sync

เพิ่ม API `/api/db/point-claim` เพื่อให้การรับแต้มจากลิงก์บันทึกลง Neon แบบยืนยันผล ไม่ใช่ background sync เงียบ ๆ เท่านั้น แก้ปัญหาหน้าเว็บเหมือนรับแต้มสำเร็จ แต่ข้อมูลใน Neon ไม่ขึ้นทันทีหรือไม่ถูกเขียนครบในตาราง `customers`, `point_coupons`, `transactions`.

เอกสาร: `docs/POINT_CLAIM_DATABASE_SYNC_FIX_TH.md`



## Phase 7A — Online-only Point Claim and Customer Visibility

- ปรับ flow ลูกค้ารับแต้มจากลิงก์ให้เขียน Neon Database สำเร็จก่อนจึงแสดงว่าสำเร็จ
- `/api/db/point-claim` อ่านคูปองจาก Neon โดยตรง ตรวจคูปอง ใช้คูปอง เพิ่มแต้ม สร้าง transaction และ audit log จากฝั่ง server
- ฝั่งลูกค้าไม่บันทึกแต้มลง localStorage ก่อน API สำเร็จแล้ว ลดปัญหาหน้าเว็บสำเร็จแต่หลังบ้าน/Neon ไม่เห็นลูกค้าใหม่
- ยังไม่ refactor ทั้งระบบเป็น online-only ทั้งหมด รอบถัดไปควรทำ Reward Redeem/Approval และ Merchant Point Adjustment แบบ online-only ต่อ


## Phase 7B — Online-only Reward Redeem / Approval

- ลูกค้าขอแลกรางวัลผ่าน `/api/db/reward-redeem` และต้องเขียน Neon สำเร็จก่อนจึงแสดงว่าสำเร็จ
- API ตรวจ reward/customer จาก Neon, หัก `current_points`, สร้าง transaction `redeem` status `pending`, และสร้าง audit log
- ร้านอนุมัติ/ไม่อนุมัติผ่าน `/api/db/reward-approval` โดยเขียน Neon ก่อน UI สำเร็จ
- อนุมัติ: transaction เป็น `completed` และลด reward stock
- ไม่อนุมัติ: transaction เป็น `rejected` และคืนแต้มให้ลูกค้า
- ไม่ต้องรัน SQL migration ใหม่
- Phase ถัดไปที่แนะนำ: Phase 7C — Online-only Merchant Point Adjustment

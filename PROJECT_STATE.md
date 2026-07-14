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

## Phase 8A — Fruit Math Slash + Reward Ticket (2026-07-14)

- เพิ่มมินิเกมคณิตศาสตร์ 3 จำนวน ใช้ `+` และ `-`
- ค่าเริ่มต้น 10 แต้ม/รอบ, สูงสุด 10 ข้อ, ชนะเมื่อถูก 8 ข้อ, แพ้เมื่อผิด 3 ข้อ
- ความยาก 7/6/5 วินาที และ 4/6/8 ผลไม้
- ชนะได้รับ Reward Ticket 1 ใบ อายุ 30 วัน
- ร้านตั้งค่า entry points, daily play limit และเปิด/ปิดเกมได้
- ของรางวัลรองรับ `points`, `tickets`, `either`
- Migrations ที่ต้องรัน: `neon/migrations/009_fruit_math_game_reward_tickets.sql` และ `neon/migrations/010_fruit_math_timer_sync.sql`
- คู่มือ: `docs/FRUIT_MATH_SLASH_PHASE8A_TH.md`

### ลำดับถัดไปที่แนะนำ
1. ทดสอบ game/ticket flow บน Neon branch หรือ staging
2. เพิ่มการผูก API กับ LINE customer session และ Merchant authorization
3. ทำ reward redemption/approval ให้ atomic เต็มรูปแบบ
4. Phase 8B เพิ่ม swipe-to-slash, sound, fruit split effect และ game analytics


## Phase 8A.2 — Timer Synchronization Hotfix (2026-07-14)

- แก้ปัญหาหน้าจอยังแสดงเวลาเหลือ แต่ Server ตัดหมดเวลาก่อน
- สาเหตุเดิม: Neon เริ่มเวลาโจทย์ก่อน API response, animation feedback และการ render บน LINE WebView
- เพิ่มขั้นตอน activate โจทย์: Server เริ่มเวลาเมื่อ Client พร้อมแสดงโจทย์และผลไม้
- เพิ่ม `question_ready_index` เพื่อป้องกันการ activate ข้อเดิมซ้ำเพื่อยืดเวลา
- Client ใช้ `performance.now()` เพื่อให้เวลาถอยหลังไม่เพี้ยนเมื่อ `setInterval` ถูกหน่วง
- API ใหม่: `POST /api/db/games/activate`
- Migration: `neon/migrations/010_fruit_math_timer_sync.sql`

## Phase 8A.3 — Mobile Game Scroll Position Hotfix (2026-07-14)

- แก้หน้าต่าง Fruit Math Slash เปิดจากตำแหน่งกลาง/ล่างเมื่อผู้ใช้เลื่อนหน้าหลักมาก่อน
- Overlay เกมเปลี่ยนเป็น `position: fixed` และสูง `100dvh`
- หน้าต่างเกมเลื่อนไปด้านบนอัตโนมัติทุกครั้งที่เปิดหรือเปลี่ยน screen
- ล็อก background scroll และกัน overscroll ส่งต่อไปยัง Customer Dashboard
- ไม่ต้องรัน SQL ใหม่

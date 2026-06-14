# Customer Loyalty CRM Program

Next.js production baseline converted from the original AI Studio mock-up, upgraded with Neon Database Integration, and prepared for a clean pilot baseline.

## Commands

```bash
npm install
npm run dev
npm run lint
npm run build
npm run start
```

## Neon status

This version adds server-side Neon routes:

- `GET /api/db/snapshot` loads all CRM data from Neon and can seed `pilot`, `demo`, or `none` depending on `CRM_AUTO_SEED`.
- `POST /api/db/sync` persists browser-side changes back to Neon.
- `POST /api/db/reset` can clear or reseed test data only when `ALLOW_DB_RESET=true`.
- `GET /api/db/health` checks that the app can reach Neon and returns row counts.

The current UI still uses a browser local cache for responsiveness, but Neon is now the shared backend source used at startup and after each save.

## Environment variables

Create `.env.local` locally and set the same value in Vercel Project Settings > Environment Variables:

```env
DATABASE_URL="postgresql://..."
DATABASE_URL_UNPOOLED="postgresql://..."
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_DEFAULT_SHOP_ID="im_sticker"
NEXT_PUBLIC_DEFAULT_SHOP_SLUG="im-sticker"
CRM_AUTO_SEED="pilot"
ALLOW_DB_RESET="false"
NEXT_PUBLIC_MERCHANT_ACCESS_PIN="1234"
NEXT_PUBLIC_DEMO_ACCESS_PIN="demo2026"
ADMIN_EMAIL="admin@im-crm.local"
ADMIN_PASSWORD="admin1234"
ADMIN_SESSION_SECRET="change-this-to-a-long-random-string"
ADMIN_SESSION_DAYS="7"
```

If you connected Neon through the Vercel Marketplace integration, Vercel should already have `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.

## Docs

- Deployment guide: `docs/DEPLOYMENT_GUIDE_TH.md`
- Neon schema: `neon/schema.sql`
- Reset SQL: `neon/reset-demo.sql`
- Pilot seed SQL: `neon/seed-pilot-im-sticker.sql`
- Production data cleanup: `docs/PRODUCTION_DATA_CLEANUP_TH.md`

## Production UI Routes

หลังทำ Production UI Cleanup Phase 1 แล้ว route จะแยกเป็น:

- `/` หน้า Landing จริงสำหรับเลือกเข้าใช้งาน
- `/customer` หน้าลูกค้าแบบ production view
- `/merchant` หลังบ้านร้านค้า
- `/admin` ผู้ดูแลเว็บไซต์
- `/demo` หน้า prototype/demo รวมทุกบทบาทสำหรับ debug ภายใน แต่ถูกกั้นด้วย Demo PIN แล้ว

## Phase 4A Simple Access Control

รอบนี้เพิ่ม PIN gate แบบเบาสำหรับหน้าที่ไม่ควรเปิดให้ลูกค้าทั่วไปเข้าโดยตรง:

- `/merchant` ใช้ `NEXT_PUBLIC_MERCHANT_ACCESS_PIN` ค่าเริ่มต้น `1234`
- `/demo` ใช้ `NEXT_PUBLIC_DEMO_ACCESS_PIN` ค่าเริ่มต้น `demo2026`

หมายเหตุ: Merchant/demo PIN เป็น client-side guard สำหรับโปรเจกต์เรียนรู้/ทดสอบ ส่วน `/admin` ถูกย้ายไปใช้ email/password และ session ฝั่ง server ใน Phase 5E แล้ว

รายละเอียดเพิ่มเติมดู `docs/PRODUCTION_UI_CLEANUP_TH.md`


## Phase 4B: Customer Shop Route

Customer production URL now supports shop slug routing:

```text
/customer              -> redirects to /customer/im-sticker
/customer/im-sticker   -> iM Sticker customer page
```

Environment variables:

```env
NEXT_PUBLIC_DEFAULT_SHOP_ID=im_sticker
NEXT_PUBLIC_DEFAULT_SHOP_SLUG=im-sticker
```

## Phase 4C: Merchant Shop Route

เพิ่ม route หลังบ้านร้านค้าตาม slug:

```text
/merchant              -> /merchant/im-sticker
/merchant/im-sticker   -> หลังบ้านร้าน iM Sticker
```

หน้า Landing จะพาเจ้าของร้านไปที่ route ของร้าน default โดยใช้ `NEXT_PUBLIC_DEFAULT_SHOP_SLUG`

## Phase 4D: Admin Dashboard Cleanup

ปรับ `/admin` ให้เป็น Platform Admin Dashboard แบบใช้งานจริงเบื้องต้นแทนหน้า webmaster mock-up เดิม และใน Phase 5E ถูกเปลี่ยนจาก Admin PIN เป็น email/password แล้ว

สิ่งที่หน้า `/admin` แสดง:

- สถานะ Neon จาก `/api/db/health`
- snapshot ข้อมูลจาก `/api/db/snapshot`
- จำนวนร้านค้า ลูกค้า rewards banners transactions และ coupons
- ลิงก์สำหรับ LINE OA Pilot: `/customer/im-sticker`
- ลิงก์หลังบ้านร้านค้า: `/merchant/im-sticker`
- ทางลัดเปิด health/snapshot JSON และ `/demo`

รายละเอียดเพิ่มเติมดู `docs/ADMIN_DASHBOARD_PHASE4D_TH.md`



## Phase 5A - Shop-scoped Data Filtering

เพิ่มการกรองข้อมูลตามร้านสำหรับ route production:

- `/customer/im-sticker` ใช้ข้อมูลร้าน `im_sticker` เท่านั้น
- `/merchant/im-sticker` ถูกล็อกกับร้าน `im_sticker` และไม่แสดงตัวเลือกเปลี่ยนร้าน
- coupon แจกแต้มตรวจ `shopId` ก่อนรับแต้ม
- ลิงก์แจกแต้มจากหลังบ้านชี้ไป `/customer/im-sticker?code=...`
- เพิ่ม `customers.shop_ids` ใน Neon schema เพื่อเตรียมรองรับสมาชิกแยกร้าน

ดูรายละเอียด: `docs/SHOP_SCOPED_DATA_PHASE5A_TH.md`

## Phase 5B - Merchant Real CRUD

ปรับ `/merchant/im-sticker` ให้ใช้งานหน้าร้านจริงขึ้น:

- เพิ่มสมาชิกใหม่จากหลังบ้านร้านค้า
- บันทึกยอดซื้อและแจกแต้มตาม `pointsRate` ของร้าน
- บันทึก transaction ลง Neon ผ่าน sync API
- เพิ่ม/แก้ไข/ลบ/เปิด-ปิดของรางวัล
- สร้างโปรโมชั่นร้าน
- สร้างลิงก์แจกแต้มแบบใช้ครั้งเดียวโดยกดปุ่มสร้างเท่านั้น
- แก้ลิงก์คูปองให้ชี้ไป `/customer/im-sticker?code=...`

ดูรายละเอียด: `docs/MERCHANT_CRUD_PHASE5B_TH.md`


## Phase 5B.1 - Merchant UI Contrast Fix

แก้ปัญหาตัวหนังสือในหน้า `/merchant/im-sticker` สีอ่อนกลืนกับพื้นหลัง โดยเฉพาะชื่อ/เบอร์โทร/รายละเอียดลูกค้าในแท็บสมาชิก CRM และปุ่ม `เปิด` / `ปิด` ของรางวัล ให้มองเห็นชัดขึ้นบนพื้นหลัง production view

## Phase 5C - Customer Claim / Redeem Flow

เพิ่มความพร้อมฝั่งลูกค้าสำหรับ LINE OA / Rich Menu:

- รองรับ `/customer/im-sticker?tab=rewards`, `?tab=history`, `?tab=code`
- รองรับลิงก์แจกแต้ม `/customer/im-sticker?code=...`
- ซ่อน mock codes และ QR simulation ออกจากหน้า production customer
- ตรวจคูปองผิดร้าน / ใช้แล้ว / หมดอายุ
- แสดงเฉพาะของรางวัลที่เปิดใช้งานและยังมี stock
- ลูกค้าขอแลกรางวัลแล้วสร้าง transaction สถานะ pending ให้ร้านอนุมัติภายหลัง

ดูรายละเอียดเพิ่มได้ที่ `docs/CUSTOMER_FLOW_PHASE5C_TH.md`



## Phase 5D: LINE Auth Foundation

เพิ่มฐาน LINE Login / LIFF สำหรับลูกค้าและเจ้าของร้าน

- ลูกค้า login ด้วย LINE ที่ `/customer/im-sticker`
- เจ้าของร้าน login ด้วย LINE ที่ `/merchant/im-sticker`
- Admin ยังไม่ผูกกับ LINE และควรย้ายเป็น email/password ใน phase ถัดไป
- เพิ่ม API: `/api/line/auth`, `/api/line/me`, `/api/line/merchant-owner`
- เพิ่มตาราง: `line_users`, `merchant_line_users`

Environment variables ใหม่:

```env
NEXT_PUBLIC_LINE_LIFF_ID=""
LINE_CHANNEL_ID=""
MERCHANT_OWNER_LINK_CODE=""
```

อ่านรายละเอียดที่ `docs/LINE_AUTH_FOUNDATION_PHASE5D_TH.md`


## Phase 5D.1 — LIFF Login Stability Fix

แก้ปัญหา Login with LINE redirect วนและเพิ่ม recovery URL `?resetLine=1` สำหรับล้าง LINE session ชั่วคราว ดูรายละเอียดใน `docs/LIFF_LOGIN_STABILITY_FIX_PHASE5D1_TH.md`.

### Phase 5D.2 - LIFF Session Loop Fix

- แก้ปัญหา LINE Login/LIFF เด้งสลับหน้า Login กับหน้าไม่พบสมาชิก
- ป้องกันการ refresh snapshot ซ้ำเมื่อ restore LINE identity เดิมจาก localStorage
- fallback หน้าไม่พบสมาชิกยังแสดง Login with LINE ให้ใช้งานต่อได้

## Phase 5E - Admin Email Login

แยก Platform Admin ออกจาก LINE ตาม policy ใหม่:

```text
Customer = LINE Login / LIFF
Merchant Owner = LINE Login / LIFF
Platform Admin = Email + Password only
```

เพิ่ม route/API:

- `/admin/login`
- `/api/admin/login`
- `/api/admin/logout`
- `/api/admin/me`

Environment variables ใหม่:

```env
ADMIN_EMAIL="admin@im-crm.local"
ADMIN_PASSWORD="admin1234"
ADMIN_SESSION_SECRET="change-this-to-a-long-random-string"
ADMIN_SESSION_DAYS="7"
```

ดูรายละเอียดที่ `docs/ADMIN_EMAIL_LOGIN_PHASE5E_TH.md`

## Phase 6A - Rich Menu / LIFF Pilot Readiness

เพิ่มความพร้อมสำหรับนำระบบไปผูกกับ Rich Menu ของ LINE OA โดยไม่ต้องสร้างเมนูผ่านโค้ด:

- หน้า `/admin` แสดง URL สำหรับปุ่ม Rich Menu แบบคัดลอกได้
- รองรับ LIFF URL พร้อม query เช่น `https://liff.line.me/{LIFF_ID}?tab=rewards`
- หน้า customer อ่านค่า `liff.state` เพื่อเปิด tab ที่ถูกต้องเมื่อเข้าผ่าน LIFF
- มีเว็บตรงสำรองสำหรับทดสอบ เช่น `/customer/im-sticker?tab=history`

Mapping หลัก:

```text
แต้มของฉัน → ?tab=home
ของรางวัล → ?tab=rewards
รับแต้ม → ?tab=code
ประวัติ → ?tab=history
โปรไฟล์ → ?tab=profile
```


## Phase 6B — Pilot UX Cleanup

ปรับข้อความและหน้าจอหลักให้พร้อมสำหรับการทดสอบกับผู้ใช้จริงมากขึ้น ลดคำเชิงเทคนิคในหน้าลูกค้า/ร้านค้า และปรับ wording ให้เป็นภาษาไทยที่เป็นธรรมชาติมากขึ้น ดูรายละเอียดที่ `docs/PILOT_UX_CLEANUP_PHASE6B_TH.md`

## Phase 6B.1 - Customer App Detail Polish

ปรับหน้าลูกค้าให้พร้อมใช้งานผ่าน LINE OA มากขึ้น: popup ยืนยันรับแต้มจากลิงก์/QR, ปุ่มยืนยัน/ไม่รับ, ปุ่มเปิดกล้องสแกน QR, ข้อความกรอกรหัสก่อน, กล่องข้อมูลร้าน, แต้มใกล้หมดอายุใน 30 วัน, และปรับหน้าประวัติ/โปรไฟล์ให้อ่านง่ายขึ้น

## Phase 6B.2 - Merchant Navigation & Dashboard Cleanup

ปรับหน้า `/merchant/im-sticker` ให้เหมาะกับการใช้งานจริงบนมือถือมากขึ้น โดยเพิ่มหน้าแดชบอร์ด, ปุ่มเมนูแบบขยาย, แถบเมนูล่าง และหน้า setting เบื้องต้นสำหรับร้านค้า รายละเอียดอยู่ใน `docs/MERCHANT_NAV_DASHBOARD_PHASE6B2_TH.md`.

## Phase 6C.5 - Pilot Checklist with Database

เพิ่มกล่อง “Pilot Checklist ก่อนเปิดร้านจริง” ในหน้า Merchant Settings พร้อม table ใหม่ `shop_onboarding_checklists` สำหรับบันทึกสถานะที่เจ้าของร้านยืนยันเอง เช่น ตั้งค่า Rich Menu ใน LINE OA แล้ว, ทดสอบเปิดจากมือถือใน LINE แล้ว, ล้างข้อมูลทดสอบแล้ว และพร้อมเปิด Pilot แล้ว

Migration ที่ต้องรันก่อน deploy code:

```text
neon/migrations/002_phase_6c5_pilot_checklist.sql
```

รายละเอียดอยู่ใน `docs/PILOT_CHECKLIST_PHASE6C5_TH.md`.


## Phase 6D - Point Rules Schema and UI

เพิ่มการตั้งค่ากฎการสะสมแต้มแบบบันทึกลงฐานข้อมูลจริงในตาราง `shops` ได้แก่ วิธีปัดเศษแต้ม, ยอดซื้อขั้นต่ำที่จะได้แต้ม, จำนวนวันหมดอายุของลิงก์รับแต้ม, จำนวนวันหมดอายุของแต้ม และจำนวนวันแจ้งเตือนก่อนแต้มหมดอายุ

Migration ที่ต้องรันก่อน deploy code:

```text
neon/migrations/003_phase_6d_point_rules.sql
```

รายละเอียดอยู่ใน `docs/POINT_RULES_PHASE6D_TH.md`.


Phase 6D cleanup: removed duplicate-claim-per-link setting. Coupons are intentionally one-use only. If the earlier 6D migration was already run, use neon/migrations/004_phase_6d_remove_duplicate_claim_setting.sql to drop the old column.


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

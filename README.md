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
NEXT_PUBLIC_ADMIN_ACCESS_PIN="admin1234"
NEXT_PUBLIC_DEMO_ACCESS_PIN="demo2026"
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
- `/admin` ใช้ `NEXT_PUBLIC_ADMIN_ACCESS_PIN` ค่าเริ่มต้น `admin1234`
- `/demo` ใช้ `NEXT_PUBLIC_DEMO_ACCESS_PIN` ค่าเริ่มต้น `demo2026`

หมายเหตุ: PIN ชุดนี้เป็น client-side guard สำหรับโปรเจกต์เรียนรู้/ทดสอบ ไม่ใช่ระบบ auth ที่ปลอดภัยแบบ production เต็มรูปแบบ รอบถัดไปควรย้ายไปใช้ระบบ login/session ฝั่ง server

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

ปรับ `/admin` ให้เป็น Platform Admin Dashboard แบบใช้งานจริงเบื้องต้นแทนหน้า webmaster mock-up เดิม โดยยังถูกกั้นด้วย Admin PIN เหมือนเดิม

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


# Phase 7D/7E — Online-only Settings / Rewards / Banners และลดระบบ localStorage sync เก่า

## เป้าหมาย

รอบนี้เปลี่ยน flow สำคัญของหลังบ้านร้านค้าให้บันทึกลง Neon Database ก่อน แล้วค่อยแสดงว่าสำเร็จ เพื่อให้ข้อมูลลูกค้าและหลังบ้านตรงกันมากขึ้น

## สิ่งที่เปลี่ยนเป็น online-only แล้ว

- ตั้งค่าร้านค้า / กฎสะสมแต้ม / ข้อความหน้าลูกค้า / Rich Menu contact link
- ตั้งค่าระดับสมาชิก
- Pilot Checklist
- สร้างลิงก์รับแต้ม / ลบลิงก์รับแต้มที่ยังไม่ถูกใช้
- เพิ่ม / แก้ไข / เปิดปิด / ลบของรางวัล
- เพิ่ม / ลบโปรโมชันและ banner

## หลักการใหม่

1. ผู้ใช้กดบันทึก
2. หน้าเว็บเรียก API
3. API เขียน Neon Database ก่อน
4. ถ้า Database สำเร็จ ค่อย refresh local cache จาก Neon
5. ถ้า Database ล้มเหลว จะแสดง error และไม่บอกว่าสำเร็จ

## API ใหม่

- `POST /api/db/merchant-settings`
- `POST /api/db/membership-tiers`
- `POST /api/db/onboarding-checklist`
- `POST /api/db/banners`
- `POST /api/db/point-coupons`

## Database migration

รันไฟล์นี้ก่อน deploy:

```text
neon/migrations/008_phase_7d_online_only_settings_rewards_banners.sql
```

Migration นี้เพิ่ม column สำหรับ settings ที่เคยอยู่ใน local cache:

- `shops.welcome_message`
- `shops.contact_text`
- `shops.share_message_template`
- `shops.rich_menu_contact_url`

## ข้อจำกัดที่ยังตั้งใจเก็บไว้

- ยังไม่ลบ `/api/db/sync` ทิ้งทันที เพราะบางส่วนของระบบยังใช้เป็น fallback/legacy อยู่
- ยังไม่ทำ hard disable localStorage ทั้งหมด เพราะ local cache ยังใช้เพื่อ render UI หลังโหลด snapshot จาก Neon
- ข้อมูลธุรกิจหลักใน flow ที่แก้แล้วจะเขียน Neon ก่อนเป็นหลัก

## วิธีทดสอบ

1. รัน SQL migration 008
2. Deploy code
3. เข้า Merchant → ตั้งค่า แล้วแก้ชื่อร้านหรือข้อความต้อนรับ
4. Refresh หน้า และเช็กว่า settings ยังอยู่
5. เช็ก Neon table `shops` ว่า column ใหม่มีข้อมูล
6. เพิ่ม/แก้/ปิดเปิดของรางวัล แล้ว refresh หลังบ้านและหน้าลูกค้า
7. เพิ่มโปรโมชัน แล้ว refresh หน้า
8. สร้างลิงก์รับแต้ม แล้วให้ลูกค้ากดรับแต้ม ตรวจว่า coupon อยู่ใน Neon


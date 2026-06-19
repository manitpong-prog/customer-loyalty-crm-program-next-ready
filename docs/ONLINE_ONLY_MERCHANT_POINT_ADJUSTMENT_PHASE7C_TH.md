# Phase 7C — Online-only Merchant Point Adjustment

เป้าหมายของเฟสนี้คือทำให้การปรับแต้มจากหลังบ้านร้านค้าเขียนลง Neon Database ก่อนเสมอ ไม่ให้หน้า Merchant แก้ localStorage แล้วค่อย sync แบบเงียบ ๆ อีกต่อไป

## สิ่งที่เพิ่ม

- เพิ่ม API `/api/db/point-adjustment`
- เพิ่ม server helper `adjustCustomerPointsOnline()` ใน `src/lib/server/crmDb.ts`
- ปรับฟอร์ม “บันทึกยอดซื้อ / ให้แต้ม” ให้เรียก API ก่อน แล้วค่อย refresh cache จาก Neon
- ปรับ popup “แก้ไขแต้ม (+/-)” ให้เรียก API ก่อน แล้วค่อยแสดงว่าสำเร็จ
- ปุ่ม “เปิดลิงก์ทดสอบ” ในหน้า “รับแต้ม” จะไม่แก้แต้มใน localStorage เองแล้ว แต่เปิด flow ลูกค้ารับแต้มจริงผ่าน Customer dashboard / link claim

## Flow ใหม่

### บันทึกยอดซื้อหน้าร้าน

1. ร้านเลือกสมาชิกและกรอกยอดซื้อ
2. หน้า Merchant คำนวณแต้มจากกฎแต้มปัจจุบัน
3. กดบันทึกแล้วเรียก `/api/db/point-adjustment`
4. API ตรวจลูกค้าและร้านจาก Neon
5. API เพิ่ม `customers.current_points`
6. API เพิ่ม `customers.lifetime_points`
7. API คำนวณ `tier` จาก `membership_tiers`
8. API สร้าง `transactions` type `earn`
9. API ใส่ `points_expires_at` ตามกฎแต้มหมดอายุของร้าน
10. API สร้าง `audit_logs`
11. UI refresh cache จาก Neon แล้วค่อยแจ้งว่าสำเร็จ

### ปรับเพิ่ม / ลดแต้มด้วยมือ

1. ร้านกด “แก้ไขแต้ม (+/-)”
2. เลือกเพิ่มหรือลดแต้ม
3. กดตกลงแล้วเรียก `/api/db/point-adjustment`
4. ถ้าเป็นการลดแต้ม API จะตรวจจาก Neon ว่าแต้มพอจริงหรือไม่
5. API อัปเดต `current_points`, `lifetime_points`, `tier`
6. API สร้าง transaction และ audit log
7. UI refresh จาก Neon

## ข้อจำกัดที่ตั้งใจคงไว้

- ยังไม่ได้ refactor การตั้งค่าร้าน / ของรางวัล / banner ทั้งหมดเป็น online-only
- ยังมี `/api/db/sync` และ local cache อยู่เพื่อรองรับ flow เก่าที่เหลือ
- รอบนี้ไม่เพิ่ม schema และไม่ต้องรัน SQL migration ใหม่

## วิธีทดสอบ

1. เข้า Merchant → สมาชิก
2. เลือกลูกค้าแล้วกด “แก้ไขแต้ม (+/-)”
3. เพิ่มแต้ม เช่น +20
4. เปิด Neon แล้วตรวจ:

```sql
select id, name, current_points, lifetime_points, tier, updated_at
from customers
order by updated_at desc
limit 20;
```

```sql
select id, user_id, user_name, shop_id, type, points, status, description, points_expires_at, created_at
from transactions
order by created_at desc
limit 20;
```

5. ทดสอบลดแต้ม แล้วเช็กว่า `current_points` และ `lifetime_points` ลดลง พร้อมคำนวณ tier ใหม่ถูกต้อง
6. ทดสอบ “บันทึกยอดซื้อ / ให้แต้ม” จากแถวบนของหน้า สมาชิก แล้วตรวจ transaction type `earn`

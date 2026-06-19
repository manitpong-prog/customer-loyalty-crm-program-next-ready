# Phase 7A — Online-only Point Claim and Customer Visibility

เป้าหมายของรอบนี้คือทำให้ flow “ลูกค้ารับแต้มจากลิงก์” ยึด Neon Database เป็นแหล่งข้อมูลจริงก่อนเสมอ ไม่บอกว่าสำเร็จจาก localStorage ก่อนเหมือน MVP เดิม

## ปัญหาเดิม

ระบบเดิมทำงานแบบ local-first:

1. หน้าเว็บลูกค้าแก้ `localStorage` ก่อน
2. ค่อยยิง `/api/db/sync` ไป Neon แบบ background
3. ถ้า sync fail หรือ request โดนยกเลิก หน้าเว็บอาจยังดูเหมือนสำเร็จ
4. หลังบ้านร้านค้าจึงอาจไม่เห็นลูกค้าใหม่/แต้มใหม่ใน Neon

## สิ่งที่เปลี่ยนใน Phase 7A

เพิ่ม/ปรับ API:

```text
POST /api/db/point-claim
```

API นี้จะทำงานแบบ online-only:

1. รับ `couponCode`, `shopId`, และข้อมูลลูกค้า
2. อ่านคูปองจาก Neon โดยตรง
3. ตรวจว่าคูปองเป็นของร้านนี้, ยังไม่ถูกใช้, และยังไม่หมดอายุ
4. สร้าง/อัปเดต customer ใน Neon แต่ไม่เชื่อคะแนนจากฝั่ง browser
5. mark `point_coupons.is_used = true`
6. เพิ่ม `customers.current_points`
7. เพิ่ม `customers.lifetime_points`
8. คำนวณ tier จาก `membership_tiers` ล่าสุดของร้าน
9. สร้าง `transactions` type `earn`
10. ใส่ `points_expires_at`
11. สร้าง `audit_logs`
12. ส่ง customer/coupon/transaction ที่ยืนยันจาก Neon กลับไปให้หน้าเว็บ

ถ้า Neon เขียนไม่สำเร็จ หน้าเว็บจะแจ้ง error และจะไม่แสดงว่ารับแต้มสำเร็จ

## สิ่งที่ยังไม่เปลี่ยนในรอบนี้

รอบนี้แก้เฉพาะ flow รับแต้มจากลิงก์ก่อน ยังไม่ refactor ทั้งระบบเป็น online-only ทั้งหมด เช่น:

- แลกรางวัล
- อนุมัติรางวัล
- ปรับเพิ่ม/ลดแต้มหลังบ้าน
- ตั้งค่าร้านค้า
- เพิ่ม/แก้ reward/banner

ควรทำเป็น Phase 7B, 7C, 7D ต่อไป เพื่อไม่ให้รื้อระบบใหญ่เกินในครั้งเดียว

## วิธีทดสอบ

1. Merchant สร้างลิงก์รับแต้มใหม่
2. เปิดลิงก์ในหน้าลูกค้า
3. กดยืนยันรับแต้ม
4. หน้าเว็บควรขึ้นข้อความสำเร็จหลัง API ตอบกลับแล้วเท่านั้น
5. เปิด Neon แล้วเช็ก 3 ตารางนี้:

```sql
select code, points, shop_id, is_used, used_by_customer_id, used_at, expires_at, created_at
from point_coupons
order by created_at desc
limit 20;
```

```sql
select id, user_id, user_name, shop_id, type, points, status, points_expires_at, created_at
from transactions
order by created_at desc
limit 20;
```

```sql
select id, name, current_points, lifetime_points, tier, updated_at
from customers
order by updated_at desc
limit 20;
```

ผลที่ควรเห็น:

- `point_coupons.is_used = true`
- `point_coupons.used_by_customer_id` มีค่า
- `transactions` มีรายการ `type = earn`
- `customers.current_points` เพิ่ม
- `customers.lifetime_points` เพิ่ม
- `transactions.points_expires_at` มีค่า

## ข้อควรจำ

หลังจากรอบนี้ localStorage ยังมีอยู่ แต่สำหรับ flow รับแต้มจากลิงก์ localStorage ทำหน้าที่เป็น cache หลัง Neon ยืนยันแล้วเท่านั้น ไม่ใช่แหล่งข้อมูลจริงหลัก

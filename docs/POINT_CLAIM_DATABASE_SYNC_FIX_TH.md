# Fix: Point Claim Database Sync

วันที่ทำ: Phase Pilot Hardening Fix

## ปัญหาเดิม

ตอนลูกค้ากดรับแต้มจากลิงก์ ระบบเดิมบันทึกข้อมูลลง `localStorage` ก่อน แล้วค่อย sync ไป Neon ด้วย `/api/db/sync` แบบ background/fire-and-forget แยกทีละชุดข้อมูล เช่น customers, coupons, transactions

ปัญหาที่เกิดได้คือ:

- หน้าเว็บเหมือนรับแต้มสำเร็จ แต่ Neon ยังไม่ถูกเขียน
- ถ้า sync coupon/transaction วิ่งก่อน customer อาจติด foreign key
- ถ้า sync fail ระบบเดิมแค่ `console.warn` และไม่บอกผู้ใช้
- ใน LINE in-app browser หรือช่วงเปลี่ยนหน้า request background อาจไม่จบ

## สิ่งที่แก้

เพิ่ม API เฉพาะสำหรับการรับแต้มจากลิงก์:

```text
POST /api/db/point-claim
```

API นี้บันทึกข้อมูลสำคัญลง Neon แบบเรียงลำดับ:

1. upsert customer
2. mark coupon เป็นใช้แล้ว
3. insert/update transaction earn

จุดที่แก้ในโค้ด:

```text
src/app/api/db/point-claim/route.ts
src/lib/server/crmDb.ts
src/data/mockData.ts
src/components/CustomerDashboard.tsx
```

## ผลลัพธ์ที่ต้องได้

เมื่อลูกค้ารับแต้มจากลิงก์สำเร็จ ใน Neon ควรเห็น:

- `point_coupons.is_used = true`
- `point_coupons.used_by_customer_id` มีค่า
- `point_coupons.used_at` มีค่า
- `transactions` มีรายการ `type = 'earn'`
- `customers.current_points` เพิ่ม
- `customers.lifetime_points` เพิ่ม
- `transactions.points_expires_at` ถูกบันทึกตามกฎแต้มหมดอายุ

## SQL สำหรับตรวจสอบ

```sql
select
  code,
  points,
  shop_id,
  is_used,
  used_by_customer_id,
  used_at,
  expires_at,
  created_at
from point_coupons
order by created_at desc
limit 20;
```

```sql
select
  id,
  user_id,
  user_name,
  shop_id,
  type,
  points,
  status,
  points_expires_at,
  created_at
from transactions
order by created_at desc
limit 20;
```

```sql
select
  id,
  name,
  current_points,
  lifetime_points,
  tier,
  updated_at
from customers
order by updated_at desc
limit 20;
```

## หมายเหตุ

รอบนี้ไม่ได้เพิ่ม SQL migration ใหม่ เพราะใช้ table/column เดิมทั้งหมด

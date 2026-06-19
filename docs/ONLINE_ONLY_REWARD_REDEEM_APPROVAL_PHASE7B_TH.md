# Phase 7B — Online-only Reward Redeem / Approval

เป้าหมายของเฟสนี้คือทำให้ flow แลกรางวัลไม่พึ่ง `localStorage` เป็นแหล่งข้อมูลจริงอีกต่อไป โดยให้ Neon Database เป็นตัวตัดสินก่อนเสมอ

## สิ่งที่เปลี่ยน

### ลูกค้าขอแลกรางวัล

เดิม:

1. หักแต้มในหน้าเว็บ/local cache ก่อน
2. สร้าง transaction pending ใน local cache
3. ค่อย sync ไป Neon แบบ background

ใหม่:

1. ลูกค้ากดแลกรางวัล
2. เรียก `/api/db/reward-redeem`
3. API อ่านข้อมูลของรางวัลและลูกค้าจาก Neon
4. ตรวจว่าของรางวัลเปิดใช้งาน, มีสต็อก, ลูกค้ามีแต้มพอ
5. หัก `customers.current_points` ใน Neon
6. สร้าง `transactions` type `redeem` status `pending`
7. สร้าง audit log
8. สำเร็จแล้วฝั่งลูกค้าจึงแสดงลิงก์ส่งให้ร้าน

### ร้านอนุมัติ / ไม่อนุมัติ

เดิม:

1. ปรับสถานะ transaction ใน local cache
2. ลดสต็อก/คืนแต้มใน local cache
3. ค่อย sync ไป Neon

ใหม่:

1. ร้านกดอนุมัติหรือไม่อนุมัติ
2. เรียก `/api/db/reward-approval`
3. API ตรวจรายการจาก Neon
4. ถ้าอนุมัติ: เปลี่ยน transaction เป็น `completed` และลดสต็อกของรางวัล 1 ชิ้น
5. ถ้าไม่อนุมัติ: เปลี่ยน transaction เป็น `rejected` และคืนแต้มให้ลูกค้าใน Neon
6. สร้าง audit log
7. สำเร็จแล้ว refresh cache จาก Neon

## API ใหม่

- `POST /api/db/reward-redeem`
- `POST /api/db/reward-approval`

## SQL / Migration

เฟสนี้ไม่เพิ่ม table/column ใหม่ จึงไม่ต้องรัน SQL migration ใหม่

## วิธีทดสอบ

1. เข้าหน้าลูกค้า
2. กดแลกของรางวัล
3. ต้องเห็นลิงก์ส่งให้ร้านหลัง API สำเร็จเท่านั้น
4. เปิด Neon แล้วเช็ก `transactions` ต้องมีรายการ `type = 'redeem'` และ `status = 'pending'`
5. เปิดหลังบ้านร้านค้า → อนุมัติรางวัล
6. วางลิงก์หรือเปิดลิงก์ที่ลูกค้าส่งให้
7. กดอนุมัติ
8. Neon ต้องเปลี่ยน transaction เป็น `completed` และ reward stock ลดลง
9. ทดลองอีกรายการแล้วกดไม่อนุมัติ
10. Neon ต้องเปลี่ยน transaction เป็น `rejected` และ `customers.current_points` ต้องถูกคืน

## ข้อจำกัดที่ยังตั้งใจคงไว้

- ยังไม่ทำ FIFO point lots
- ยังไม่คืนแต้มแบบแยก lot หมดอายุ
- ยังไม่ refactor flow ปรับแต้มหลังบ้านเป็น online-only เฟสนี้จะทำต่อใน Phase 7C

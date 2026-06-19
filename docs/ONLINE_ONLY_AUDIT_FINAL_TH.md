# Pilot Online-only Audit Final

รอบนี้เป็นรอบตรวจและปิดจุดเสี่ยงสุดท้ายก่อนเปิด Pilot โดยยึดหลักว่า **Neon Database เป็นแหล่งข้อมูลจริง** ส่วน `localStorage` เป็นเพียง cache/read fallback หลังโหลด snapshot จาก Neon เท่านั้น

## สิ่งที่แก้ในรอบนี้

### 1. ปิด background sync อัตโนมัติจาก localStorage

เดิม `saveStoredData()` จะเขียน `localStorage` แล้ว queue `/api/db/sync` อัตโนมัติถ้าไม่ได้ระบุ `sync: false` ทำให้บาง flow อาจบันทึกในเครื่องก่อน และถ้า sync fail ข้อมูล Neon จะไม่ตรงกับหน้าเว็บ

รอบนี้เปลี่ยนเป็น:

```text
saveStoredData() จะไม่ sync ไป Neon โดยอัตโนมัติแล้ว
/api/db/sync ยังเก็บไว้เป็น emergency compatibility path เท่านั้น
flow สำคัญต้องใช้ dedicated API route และรอ Neon สำเร็จก่อน
```

### 2. เพิ่ม API ลูกค้าออนไลน์

เพิ่ม:

```text
/api/db/customers
```

ใช้สำหรับบันทึกข้อมูลลูกค้า/โปรไฟล์/เพิ่มสมาชิก โดยเขียน Neon ก่อน แล้วค่อย refresh local cache

### 3. เพิ่ม API ลบประวัติธุรกรรมออนไลน์

เพิ่ม:

```text
/api/db/transactions
```

รองรับ action `delete` สำหรับลบประวัติธุรกรรมจาก Neon โดยตรง พร้อม audit log

### 4. แก้เพิ่มสมาชิกจากหลังบ้าน

เดิมเพิ่มสมาชิกจากหลังบ้านด้วย `saveCustomers()` ทำให้ข้อมูลอาจอยู่แค่ local cache หรือรอ legacy sync

รอบนี้เปลี่ยนเป็น:

```text
Merchant เพิ่มสมาชิก
→ /api/db/customers
→ Neon สำเร็จ
→ refresh snapshot
→ แสดงว่าสำเร็จ
```

### 5. แก้โปรไฟล์ลูกค้า

เดิมลูกค้าแก้โปรไฟล์แล้วบันทึกใน local cache ก่อน

รอบนี้เปลี่ยนเป็น:

```text
Customer แก้โปรไฟล์
→ /api/db/customers
→ Neon สำเร็จ
→ refresh snapshot
→ แสดงว่าสำเร็จ
```

### 6. แก้ลบประวัติธุรกรรม

เดิมลบ transaction จาก local cache ก่อน แล้วอาจ sync ทีหลัง

รอบนี้เปลี่ยนเป็น:

```text
Merchant ลบประวัติธุรกรรม
→ /api/db/transactions
→ Neon สำเร็จ
→ refresh snapshot
→ แสดงว่าสำเร็จ
```

### 7. แก้ Platform Admin อนุมัติ/ปฏิเสธร้าน

เดิม Platform Admin เปลี่ยนสถานะร้านผ่าน local cache

รอบนี้เปลี่ยนเป็นเรียก `/api/db/merchant-settings` เพื่อบันทึกสถานะร้านใน Neon ก่อน แล้ว refresh snapshot

## จุดที่ยังตั้งใจให้เป็น local/demo เท่านั้น

ยังมีโค้ดบางส่วนที่ใช้ localStorage เฉพาะ demo/local UI เช่น:

```text
โค้ดรับแต้มตัวอย่าง WELCOME50 / CRM2026 ในโหมด demo
ปุ่ม simulator สแกน QR ในโหมด demo เท่านั้น
LINE identity cache สำหรับจำตัวตนผู้ใช้ใน browser
```

จุดเหล่านี้ไม่ควรถือเป็นข้อมูลธุรกิจจริงของ Pilot

## Checklist ทดสอบหลัง deploy

1. ลูกค้ารับแต้มจากลิงก์ แล้ว Neon ต้องอัปเดต `customers`, `point_coupons`, `transactions`
2. ลูกค้าแก้โปรไฟล์ แล้ว refresh หลังบ้านต้องเห็นชื่อ/เบอร์ล่าสุด
3. หลังบ้านเพิ่มสมาชิกเอง แล้ว Neon ต้องมี row ใน `customers`
4. หลังบ้านปรับเพิ่ม/ลดแต้ม แล้ว Neon ต้องเปลี่ยนทันที
5. ลูกค้าแลกรางวัล แล้วหลังบ้านต้องเห็น pending redeem หลัง refresh
6. ร้านอนุมัติ/ไม่อนุมัติ แล้ว transaction/status/customer points ต้องเปลี่ยนใน Neon
7. ตั้งค่าร้าน/ของรางวัล/banner/ระดับสมาชิก แล้ว refresh แล้วยังอยู่
8. Platform Admin อนุมัติ/ปฏิเสธร้าน แล้ว Neon `shops.registration_status` ต้องเปลี่ยน

## คำสั่ง SQL ตรวจเร็ว

```sql
select id, name, current_points, lifetime_points, tier, updated_at
from customers
order by updated_at desc
limit 20;
```

```sql
select id, user_id, user_name, shop_id, type, points, status, created_at
from transactions
order by created_at desc
limit 20;
```

```sql
select code, shop_id, points, is_used, used_by_customer_id, used_at, created_at
from point_coupons
order by created_at desc
limit 20;
```

```sql
select id, name, registration_status, is_active, updated_at
from shops
order by updated_at desc;
```

## หมายเหตุ

รอบนี้ไม่มี SQL migration ใหม่ เพราะใช้ schema เดิมและ API เดิม/ใหม่ที่เขียนกับตารางเดิม

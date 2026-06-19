# Phase 7F — Fresh Data Loading / No-cache / Customer Identity Fix

รอบนี้แก้ปัญหาข้อมูลในหน้าเว็บแสดงช้าหรือแสดงข้อมูลเก่าจาก cache/localStorage หลังจาก Neon มีข้อมูลถูกต้องแล้ว

## เป้าหมาย

- หน้า Customer ไม่แสดงโปรไฟล์ลูกค้าจาก localStorage เก่าก่อน LIFF/Neon ยืนยันตัวตนล่าสุด
- หน้า Customer ใน production ต้องจับคู่ลูกค้าด้วย LINE customer id เท่านั้น ห้าม fallback ไป customer คนแรก
- หน้า Merchant มีปุ่มรีเฟรชข้อมูลจาก Neon ชัดเจน
- ปุ่ม “โหลดค่าล่าสุด” ใน Settings ดึงข้อมูลจาก Neon จริง ไม่ใช่แค่โหลดจาก local cache
- `/api/db/snapshot` ส่ง header `no-store` และ response timestamp เพื่อลดโอกาสได้ข้อมูลค้าง
- `initializeDatabase()` เรียก snapshot พร้อม cache buster และ no-store headers

## สิ่งที่เปลี่ยน

### Customer Identity

ใน production ถ้ายังไม่มี LINE identity หรือยังหา customer ตาม LINE ID ไม่เจอ ระบบจะแสดงหน้ากำลังโหลด/ยังไม่พบข้อมูลแทนการเลือก customer คนแรกจาก cache

ก่อนหน้า:

```text
หา LINE customer ไม่เจอ → fallback ไป customer id เดิม → fallback ไป customer คนแรก
```

หลังแก้:

```text
production → ต้องมี lineIdentity.customerId หรือ lineUserId → หา customer จาก Neon cache ที่ refresh แล้วเท่านั้น
```

### LINE stored identity

สำหรับ customer context ระบบจะไม่ publish identity ที่อ่านจาก localStorage ให้ parent ทันทีแล้ว เพราะอาจเป็น LINE profile ของคนทดสอบเดิม

สำหรับ merchant context ยังใช้ stored identity ได้ แต่มีการตรวจ owner status ผ่าน `/api/line/me` เหมือนเดิม

### Merchant Fresh Refresh

หลังบ้านมีปุ่ม `รีเฟรช` ด้านบน เพื่อดึง snapshot ล่าสุดจาก Neon แล้วโหลดข้อมูลใหม่เข้าหน้าเว็บ

ปุ่ม `โหลดค่าล่าสุด` ในหน้า Settings เปลี่ยนจาก `loadData()` เป็น `refreshFromNeon()` แล้ว

## วิธีทดสอบ

1. Deploy แล้วเปิดหน้าลูกค้าใน LINE in-app browser
2. ใช้ LINE account ลูกค้าใหม่เปิดหน้า `/customer/im-sticker`
3. หน้าไม่ควรแสดงชื่อ/รูปของบัญชีทดสอบเดิมก่อน
4. หลัง LINE auth สำเร็จ ควรแสดงข้อมูลตาม LINE ID นั้น
5. Merchant สร้างลิงก์รับแต้ม แล้วตารางควรอัปเดตหลัง API สำเร็จ
6. กดปุ่ม `รีเฟรช` ด้านบนหลังบ้าน แล้วข้อมูลต้องตรงกับ Neon ทันที
7. กด `โหลดค่าล่าสุด` ใน Settings แล้วต้องดึง Neon ใหม่ ไม่ใช่แค่ cache เก่า

## หมายเหตุ

รอบนี้ยังไม่ลบ localStorage ทั้งหมด เพราะยังใช้เป็น read cache หลังจาก Neon ยืนยันข้อมูลแล้ว แต่ข้อมูลธุรกิจจริงยังยึด Neon เป็นหลัก

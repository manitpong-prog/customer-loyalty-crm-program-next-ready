# Phase 7G Hotfix — LIFF Query / Snapshot Speed

## สาเหตุที่พบ

หลัง Phase 7G มี 2 จุดที่ทำให้ใช้งานจริงติดขัด:

1. หน้า Customer/LIFF ที่มี `?tab=...` อาจทำให้ query ของระบบถูกล้างเร็วเกินไป ทำให้ LIFF login/redirect สูญเสียปลายทาง และบางกรณีดูเหมือนโหลดวน
2. `/api/db/snapshot` ยังรัน schema/bootstrap check ทุกครั้งที่โหลด snapshot ซึ่งหนักเกินไปสำหรับ production และทำให้หน้า Merchant หรือ action ที่ต้อง refresh ข้อมูลช้า 30-60 วินาทีได้

## สิ่งที่แก้

- ปรับ `cleanCustomerEntryQuery()` ให้ลบเฉพาะ query ของ LIFF/LINE callback แต่เก็บ query ของระบบ เช่น `tab` และ `code`
- ปรับ LIFF login auto flow ให้ยอม redirect อัตโนมัติเมื่อเปิดใน LINE/LIFF หรือกลับมาจาก callback จริง แต่ยังป้องกัน redirect loop ด้วย pending guard
- ปรับ `/api/db/snapshot` ให้ runtime schema/bootstrap check เป็น opt-in ผ่าน `ENABLE_RUNTIME_SCHEMA_CHECK=true` เท่านั้น
- ลดการเรียก full snapshot หลัง action สำคัญในหลังบ้าน เช่น setting, tier, reward, banner, point adjustment, reward approval โดยอัปเดต local read cache จาก response ที่ API ยืนยันแล้วแทน

## ต้องรัน SQL ไหม

ไม่ต้องรัน SQL ใหม่

## การทดสอบหลัก

1. เปิด `/customer/im-sticker`
2. เปิด `/customer/im-sticker?tab=code`
3. เปิด `/customer/im-sticker?tab=rewards`
4. เปิด `/customer/im-sticker?tab=history`
5. เปิด LIFF หลักและ LIFF พร้อม `?tab=code/rewards/history`
6. กดสร้างลิงก์รับแต้มหลังบ้าน ควรเร็วขึ้นและเห็นลิงก์ทันที
7. อนุมัติ/ปฏิเสธของรางวัล ควรเร็วขึ้นและไม่รอ full snapshot ยาว
8. เข้า Merchant dashboard ควรเร็วขึ้นจากการที่ snapshot ไม่รัน schema check ทุกครั้ง

## หมายเหตุ

ถ้าต้องการให้ระบบช่วยสร้าง/ตรวจ schema ตอน runtime อีกครั้ง ให้ตั้ง env:

```env
ENABLE_RUNTIME_SCHEMA_CHECK=true
```

แต่สำหรับ production/pilot ปกติให้ปล่อยว่างหรือ `false` เพราะเราใช้ไฟล์ migration เป็นตัวสร้าง schema อยู่แล้ว

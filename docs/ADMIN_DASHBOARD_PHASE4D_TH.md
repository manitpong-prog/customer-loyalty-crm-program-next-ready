# Phase 4D: Admin Dashboard Cleanup

รอบนี้ปรับหน้า `/admin` จากหน้า webmaster mock-up เดิมให้เป็น Platform Admin Dashboard แบบใช้งานจริงเบื้องต้นสำหรับ pilot ของร้าน iM Sticker

## สิ่งที่เปลี่ยน

- `/admin` ยังถูกกั้นด้วย Admin PIN เหมือนเดิม
- หลังผ่าน PIN แล้วจะแสดงหน้า Admin Dashboard ใหม่
- ดึงสถานะจาก API จริง:
  - `/api/db/health`
  - `/api/db/snapshot`
- แสดงจำนวนข้อมูลหลักจาก Neon:
  - ร้านค้า
  - ลูกค้า
  - ของรางวัล
  - แบนเนอร์
  - transactions
  - coupons
- แสดงลิงก์สำคัญสำหรับ LINE OA Pilot:
  - `/customer/im-sticker`
  - `/merchant/im-sticker`
- เพิ่มปุ่มคัดลอกลิงก์สำหรับนำไปใช้กับ Rich Menu
- เพิ่มทางลัดเปิด JSON health/snapshot เพื่อตรวจระบบ
- ย้ายแนวคิด mock-up webmaster เดิมไปใช้ผ่าน `/demo` เท่านั้น

## เป้าหมายของรอบนี้

ทำให้ `/admin` เป็นหน้าควบคุมระบบเบื้องต้นสำหรับเจ้าของระบบ ไม่ใช่หน้า demo รวมบทบาทแล้ว เพื่อเตรียมไปสู่ Phase 5A: Shop-scoped Data Filtering

## URL ที่ควรทดสอบหลัง deploy

```text
/admin
/api/db/health
/api/db/snapshot
/customer/im-sticker
/merchant/im-sticker
/demo
```

## หมายเหตุ

หน้านี้ยังไม่ใช่ระบบ Admin Auth แบบ production เต็มรูปแบบ เพราะยังใช้ PIN gate แบบง่ายจาก Phase 4A อยู่ แต่เหมาะสำหรับ pilot และตรวจระบบระหว่างเตรียมใช้งานผ่าน LINE OA

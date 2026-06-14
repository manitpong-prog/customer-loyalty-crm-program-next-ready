# Phase 6F — Point Expiry Foundation

เฟสนี้เพิ่มฐานข้อมูลวันหมดอายุของแต้มแบบปลอดภัยสำหรับ Pilot

## สิ่งที่เพิ่ม

- เพิ่ม `transactions.points_expires_at` สำหรับรายการรับแต้ม (`type = earn`)
- ตอนสร้างรายการรับแต้มใหม่ ระบบจะตั้งวันหมดอายุจาก `shop.pointExpiryDays`
- หน้า Customer แสดงจำนวนแต้มที่ใกล้หมดอายุตาม `pointExpiryReminderDays`
- หน้า Merchant ในรายชื่อลูกค้าและ popup ปรับแต้ม แสดงแต้มใกล้หมดอายุของลูกค้า
- Backfill รายการรับแต้มเดิมด้วย migration โดยใช้ค่า `point_expiry_days` ของร้าน

## สิ่งที่ยังไม่ทำในเฟสนี้

- ยังไม่หักแต้มอัตโนมัติ
- ยังไม่ทำ FIFO ตอนแลกรางวัล
- ยังไม่ทำ cron job
- ยังไม่ส่งแจ้งเตือน LINE จริง

## SQL migration

ให้รันไฟล์นี้ก่อน deploy code:

```text
neon/migrations/006_phase_6f_point_expiry_foundation.sql
```

## หมายเหตุเรื่องความแม่นยำ

จำนวนแต้มใกล้หมดอายุในเฟสนี้คำนวณจากรายการรับแต้มที่ยังไม่หมดอายุและอยู่ในช่วงแจ้งเตือน แต่ยังไม่ได้หักด้วย FIFO ตามการแลกรางวัล ดังนั้นให้ถือเป็น Foundation สำหรับ Pilot ก่อน

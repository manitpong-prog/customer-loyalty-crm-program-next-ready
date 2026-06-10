# Phase 5A: Shop-scoped Data Filtering

รอบนี้ปรับให้ route ตามร้านเริ่มล็อกข้อมูลตาม `shopId` จริง ไม่ใช่แค่เปลี่ยน URL เท่านั้น

## สิ่งที่เปลี่ยน

- `/customer/im-sticker` โหลดข้อมูลลูกค้า/แต้ม/รางวัล/แบนเนอร์/ประวัติ เฉพาะร้าน `im_sticker`
- `/merchant/im-sticker` แสดงข้อมูลหลังบ้านเฉพาะร้าน `im_sticker`
- หลังบ้านร้านค้าถูกล็อกตาม URL slug แล้ว ไม่แสดงตัวเลือกเปลี่ยนร้านใน production view
- ลิงก์แจกแต้มจากหลังบ้านร้านค้า generate ไปที่ `/customer/im-sticker?code=...` โดยตรง
- ตรวจ coupon ว่าเป็นของร้านเดียวกับ route ปัจจุบันก่อนให้รับแต้ม
- เพิ่ม `shopIds` ใน customer เพื่อรองรับ membership รายร้าน
- Neon schema เพิ่ม column `customers.shop_ids` แบบ backward-compatible โดยไม่ต้อง reset database

## การทดสอบ

1. เปิด `/admin` แล้วกดรีเฟรชสถานะ ดูว่า Neon ยังพร้อมใช้งาน
2. เปิด `/merchant/im-sticker` แล้วสร้างลิงก์แจกแต้ม
3. คัดลอกลิงก์ที่ได้ ต้องขึ้นต้นด้วย `/customer/im-sticker?code=`
4. เปิดลิงก์นั้นใน browser ใหม่หรือมือถือ แล้วกดรับแต้ม
5. กลับไป `/merchant/im-sticker` ดูรายการแต้ม ต้องเห็นรายการของร้านนี้เท่านั้น
6. เปิด `/api/db/health` ตรวจว่า transactions/coupons เพิ่มขึ้น

## หมายเหตุ

ระบบนี้ยังเป็น pilot สำหรับร้าน iM Sticker ก่อน ไม่ใช่ SaaS หลายร้านเต็มรูปแบบ แต่โครงสร้างข้อมูลเริ่มพร้อมสำหรับการขยายหลายร้านในอนาคตแล้ว

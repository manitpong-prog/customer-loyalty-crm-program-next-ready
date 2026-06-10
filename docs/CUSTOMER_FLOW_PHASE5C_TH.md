# Phase 5C: Customer Claim / Redeem Flow

รอบนี้ปรับฝั่งลูกค้าให้พร้อมสำหรับ LINE OA / Rich Menu มากขึ้น โดยโฟกัสที่หน้า `/customer/im-sticker`

## สิ่งที่เพิ่ม/ปรับ

- รองรับ deep link สำหรับ Rich Menu:
  - `/customer/im-sticker?tab=rewards`
  - `/customer/im-sticker?tab=history`
  - `/customer/im-sticker?tab=code`
  - `/customer/im-sticker?code=CPN-...`
- ถ้าเปิดลิงก์แจกแต้มที่มี `?code=...` ระบบจะพาลูกค้าไปแท็บรับแต้มและแสดงกล่องยืนยันรับแต้มทันที
- หน้า production ซ่อนรหัส mock เช่น `WELCOME50`, `CRM2026`
- หน้า production ซ่อนกล่องจำลองสแกน QR ที่ใช้สำหรับ demo
- ตรวจสอบคูปองก่อนรับแต้ม:
  - คูปองต้องเป็นของร้านเดียวกัน
  - ต้องยังไม่ถูกใช้
  - ต้องยังไม่หมดอายุ
- หน้าแลกรางวัลแสดงเฉพาะของรางวัลที่เปิดใช้งานและยังมี stock
- ตอนลูกค้าขอแลกรางวัล ระบบจะ:
  - ตรวจ stock ล่าสุด
  - ตรวจแต้มล่าสุด
  - หักแต้มลูกค้า
  - สร้าง transaction สถานะ `pending`
  - ให้ร้านไปอนุมัติหรือปฏิเสธใน `/merchant/im-sticker`

## วิธีทดสอบ

1. เข้า `/merchant/im-sticker`
2. สร้างของรางวัลที่เปิดใช้งานและมี stock
3. สร้างลิงก์แจกแต้ม
4. เปิดลิงก์ `/customer/im-sticker?code=...`
5. กดยืนยันรับแต้ม
6. เข้าแท็บรางวัลใน `/customer/im-sticker?tab=rewards`
7. กดแลกรางวัล
8. กลับไป `/merchant/im-sticker` เพื่ออนุมัติรายการแลก

## หมายเหตุ

รอบนี้ยังเป็นระบบ customer pilot สำหรับร้าน `iM Sticker` ก่อน ยังไม่ใช่ LINE LIFF identity จริงแบบแยก user รายคนจาก LINE userId

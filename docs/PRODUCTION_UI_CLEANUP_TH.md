# Production UI Cleanup Phase 4A

เวอร์ชันนี้ต่อยอดจาก Phase 3 โดยเพิ่ม Simple Access Control และซ่อนลิงก์หน้า Prototype Debug ออกจากหน้าแรก

## Routes ปัจจุบัน

- `/` = หน้า Production Landing ไม่มี role switcher, ไม่มีกรอบมือถือจำลอง และไม่มีลิงก์ `/demo` แล้ว
- `/customer` = หน้าลูกค้าแบบ Production View เปิดได้โดยตรง
- `/merchant` = หลังบ้านร้านค้าแบบแยก route และถูกกั้นด้วย Merchant PIN
- `/admin` = หน้าผู้ดูแลเว็บไซต์แบบแยก route และถูกกั้นด้วย Admin PIN
- `/demo` = หน้า Prototype/Demo เดิม ใช้ทดสอบ role switcher, mobile simulator และ workflow รวม แต่ถูกกั้นด้วย Demo PIN

## Environment Variables สำหรับ PIN

ตั้งค่าได้ทั้งใน `.env.local` และ Vercel Project Settings > Environment Variables

```env
NEXT_PUBLIC_MERCHANT_ACCESS_PIN="1234"
NEXT_PUBLIC_ADMIN_ACCESS_PIN="admin1234"
NEXT_PUBLIC_DEMO_ACCESS_PIN="demo2026"
```

ถ้าไม่ได้ตั้งค่า ระบบจะใช้ค่า default ตามด้านบนเพื่อให้ทดสอบต่อได้ทันที

## วิธีทดสอบหลัง deploy

1. เปิด `/customer` ต้องเข้าได้ทันที
2. เปิด `/merchant` ต้องเจอหน้ากรอก PIN ก่อน
3. ใส่ Merchant PIN ถูกต้องแล้วต้องเห็นหลังบ้านร้านค้า
4. เปิด `/admin` ต้องเจอหน้ากรอก PIN ก่อน
5. ใส่ Admin PIN ถูกต้องแล้วต้องเห็นผู้ดูแลระบบ
6. เปิด `/demo` ด้วยการพิมพ์ URL เอง ต้องเจอหน้ากรอก PIN ก่อน
7. หน้า `/` ต้องไม่แสดงลิงก์ไป `/demo` แล้ว

## ข้อจำกัดสำคัญ

Simple Access Control รอบนี้เป็น client-side PIN gate เพื่อกันผู้ใช้ทั่วไปเข้าโดยไม่ตั้งใจเท่านั้น เหมาะสำหรับ pilot/test project แต่ยังไม่ใช่ระบบความปลอดภัย Production เต็มรูปแบบ เพราะตัวแปร `NEXT_PUBLIC_*` ถูก expose ไปฝั่ง browser ตามธรรมชาติของ Next.js

รอบ Production จริงควรเปลี่ยนเป็น:

- ระบบ login เจ้าของร้าน
- ระบบ admin login
- session/cookie ฝั่ง server
- role-based authorization
- ป้องกัน API ฝั่ง server ตาม role จริง

## หมายเหตุ

- ข้อมูลยัง sync ผ่าน Neon PostgreSQL + Local Cache ตาม Phase 1
- ค่าเริ่มต้นใช้ร้าน pilot `im_sticker` และลูกค้าทดสอบ `cust_pilot_001` ตาม Production Data Cleanup
- Phase ถัดไปที่แนะนำคือทำ slug route เช่น `/customer/im-sticker`, `/merchant/im-sticker` และเริ่มวางระบบ auth จริงทีละส่วน

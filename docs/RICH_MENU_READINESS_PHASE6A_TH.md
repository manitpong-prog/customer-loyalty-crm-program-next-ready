# Phase 6A - Rich Menu / LIFF Pilot Readiness

รอบนี้ไม่ได้สร้าง Rich Menu ใน LINE OA ให้โดยตรง เพราะขั้นตอนนั้นทำใน LINE OA Manager/LINE Developers Console ได้เอง แต่ปรับฝั่งเว็บแอปให้พร้อมสำหรับการนำ URL ไปผูกกับ Rich Menu มากขึ้น

## สิ่งที่ปรับในโค้ด

- หน้า `/admin` แสดงชุดลิงก์สำหรับ Rich Menu ที่คัดลอกได้ทันที
- รองรับ LIFF URL พร้อม query เช่น `https://liff.line.me/{LIFF_ID}?tab=rewards`
- เพิ่มการอ่านค่า `liff.state` ในหน้า customer เพื่อให้ปุ่ม Rich Menu เปิด tab ที่ถูกต้องได้
- ยังแสดงเว็บตรงสำรอง เช่น `/customer/im-sticker?tab=rewards` สำหรับใช้ทดสอบหรือ fallback

## Mapping ที่ระบบรองรับ

- แต้มของฉัน → `?tab=home`
- ของรางวัล → `?tab=rewards`
- รับแต้ม → `?tab=code`
- ประวัติ → `?tab=history`
- โปรไฟล์ → `?tab=profile`

## วิธีทดสอบ

1. เปิด `/admin`
2. คัดลอก URL ในกล่อง LINE OA Pilot
3. เปิด URL ในมือถือผ่าน LINE หรือ browser
4. ตรวจว่าหน้า `/customer/im-sticker` เปิด tab ถูกต้อง
5. ถ้าใช้ LIFF URL ให้ทดสอบผ่าน `https://liff.line.me/{LIFF_ID}?tab=rewards`

## หมายเหตุ

สำหรับรอบ pilot ร้าน iM Sticker ให้ใช้ LIFF ID เดียวกับที่ตั้งใน Vercel ผ่าน `NEXT_PUBLIC_LINE_LIFF_ID` และ keep endpoint ของ LIFF เป็น `/customer/im-sticker` ได้ตามเดิม

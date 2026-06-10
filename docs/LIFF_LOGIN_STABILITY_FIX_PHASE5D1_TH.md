# Phase 5D.1 — LIFF Login Stability Fix

รอบนี้แก้ปัญหาการกด Login with LINE แล้ว redirect เด้งไปมา หรือกลับมาแล้วค้างที่ข้อความ “กำลังโหลดข้อมูลลูกค้า”

## สิ่งที่ปรับ

- ล้าง `redirectUri` ก่อนเรียก `liff.login()` เพื่อไม่ให้ query ของ LIFF/LINE เช่น `liff.state`, `code`, `state`, `access_token` ติดวนกลับไปมา
- เพิ่ม session flag ป้องกัน redirect loop ถ้า LINE login กลับมาแล้วแต่ยังไม่เจอ session
- เพิ่ม auto-auth แบบเงียบเมื่อเปิดผ่าน `https://liff.line.me/{LIFF_ID}` และ LIFF session พร้อมอยู่แล้ว
- เพิ่ม recovery link `?resetLine=1` สำหรับล้าง LINE session/local cache ชั่วคราวบนเครื่องผู้ใช้
- เปลี่ยนหน้าค้าง “กำลังโหลดข้อมูลลูกค้า...” เป็น recovery UI ที่มีปุ่มโหลดใหม่และล้าง session

## หลัง deploy ให้เช็กค่า Vercel

```env
NEXT_PUBLIC_LINE_LIFF_ID="2010362466-uenl7qUb"
LINE_CHANNEL_ID="2010362466"
MERCHANT_OWNER_LINK_CODE="imowner2026"
```

หลังแก้ Environment Variables ต้อง Redeploy ทุกครั้ง เพราะ `NEXT_PUBLIC_LINE_LIFF_ID` ถูกฝังเข้า frontend ตอน build

## วิธี reset ถ้าเครื่องเคยค้าง

เปิด URL นี้หนึ่งครั้ง:

```text
https://im-crm-two.vercel.app/customer/im-sticker?resetLine=1
```

จากนั้นค่อยเปิด LIFF URL ใหม่:

```text
https://liff.line.me/2010362466-uenl7qUb
```

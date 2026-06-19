# Phase 7H — Customer / LIFF Flow Stabilization Fix

รอบนี้แก้ต่อจาก Phase 7G/7G2 โดยยึดปัญหาที่พบจากการทดสอบจริง:

- เว็บตรง `/customer/im-sticker` และ `/customer/im-sticker?tab=...` เข้าไม่ได้หรือเหมือนโหลดวน
- LIFF URL แบบ `?tab=code`, `?tab=rewards`, `?tab=history` โหลดวนหรือทำให้ `liff.state` ซ้อน
- หน้า Customer ยิง request ซ้ำจาก effect หลายชุด
- หลัง LINE auth สำเร็จ ยังมีโอกาสเรียก full snapshot ผ่าน `initializeDatabase()` ซ้ำโดยไม่จำเป็น

## สิ่งที่แก้

### 1. แยก query ของระบบออกจาก query ของ LINE/OAuth

LINE/OAuth ใช้ query เช่น `code`, `state`, `liff.state`, `liffRedirectUri` ซึ่งชนกับระบบที่ใช้ `code` เป็นรหัสคูปองรับแต้ม

รอบนี้แก้ให้:

- `code` จะถูกนับเป็นรหัสคูปองเฉพาะเมื่อไม่ใช่ LIFF/OAuth callback
- ถ้ามาจาก `liff.state` จะ decode หลายชั้นและดึงเฉพาะ `tab`, `code`, `coupon`, `couponCode`, `claimCode`, `resetLine`
- URL หลัง callback จะล้างเฉพาะ query ของ LINE/LIFF แต่เก็บ `tab` และรหัสคูปองของระบบไว้

### 2. ตัด full snapshot ออกจาก customer identity flow

เดิม `handleLineIdentityChange()` ใน `App.tsx` สามารถเรียก `initializeDatabase()` เมื่อได้ LINE customer ใหม่แล้วไม่เจอใน cache ทำให้โหลด CRM snapshot ใหญ่ซ้ำ

รอบนี้เปลี่ยนให้หน้า Customer ใช้เฉพาะ `/api/db/customer-state` สำหรับโหลดข้อมูล scoped customer/shop เท่านั้น

### 3. ลด customer refresh loop

เดิม `CustomerDashboard.tsx` มี effect ซ้อนกันและ auto-refresh loop 8 รอบ

รอบนี้เปลี่ยนเป็น:

- ใช้ refresh หลักจาก `/api/db/customer-state` เพียงทางเดียว
- กัน request ซ้ำด้วย signature และ in-flight ref
- ตัด auto-refresh polling loop 8 รอบออก
- ปุ่ม refresh ยัง force refresh ได้ตามปกติ

### 4. หยุด LIFF silent login loop ระหว่าง callback

ถ้าอยู่ใน LIFF/OAuth callback แล้ว `liff.isLoggedIn()` ยังไม่พร้อม ระบบจะไม่เรียก `liff.login()` ซ้ำแบบ silent อีก เพื่อกัน URL ซ้อน `liff.state` / `liffRedirectUri`

### 5. เว็บตรงใช้ stored identity ได้อย่างปลอดภัยขึ้น

ถ้าเปิดเว็บตรง `/customer/{shopSlug}` ใน browser ปกติ และไม่มี LIFF callback ระบบสามารถใช้ LINE identity ที่เคย verified ไว้ในเครื่องเดิมเพื่อโหลดข้อมูลสมาชิกได้

แต่ถ้ามี LIFF/OAuth callback อยู่ จะไม่เอา stored identity มาแสดงก่อน เพื่อกันชื่อ/รูปคนเก่าค้างระหว่าง LINE กำลังยืนยันบัญชีล่าสุด

### 6. ลด runtime schema check ใน LINE API

`/api/line/auth`, `/api/line/me`, `/api/line/merchant-owner` จะไม่เรียก `ensureCrmSchema()` ทุก request แล้ว ยกเว้นตั้งค่า:

```env
ENABLE_RUNTIME_SCHEMA_CHECK=true
```

Production ปกติไม่ควรตั้งค่านี้ เพื่อไม่ให้ LINE/customer login ช้า

### 7. Preload LIFF SDK

เพิ่ม preload/preconnect สำหรับ LIFF SDK ใน `src/app/layout.tsx` เพื่อลดเวลารอโหลด SDK ครั้งแรก

## ไฟล์ที่เปลี่ยน

- `src/App.tsx`
- `src/components/LineLoginPanel.tsx`
- `src/components/CustomerDashboard.tsx`
- `src/app/api/line/auth/route.ts`
- `src/app/api/line/me/route.ts`
- `src/app/api/line/merchant-owner/route.ts`
- `src/app/layout.tsx`
- `docs/PHASE7H_CUSTOMER_LIFF_FLOW_FIX_TH.md`
- `README.md`
- `PROJECT_STATE.md`

## SQL

ไม่ต้องรัน SQL ใหม่

## Environment

Production บน Vercel:

```env
ENABLE_RUNTIME_SCHEMA_CHECK
```

ไม่ต้องตั้ง หรือให้ลบออกจาก Vercel

## จุดทดสอบหลัก

เว็บตรง:

- `/customer/im-sticker`
- `/customer/im-sticker?tab=code`
- `/customer/im-sticker?tab=rewards`
- `/customer/im-sticker?tab=history`

LIFF:

- `https://liff.line.me/2010362466-uenl7qUb`
- `https://liff.line.me/2010362466-uenl7qUb?tab=code`
- `https://liff.line.me/2010362466-uenl7qUb?tab=rewards`
- `https://liff.line.me/2010362466-uenl7qUb?tab=history`

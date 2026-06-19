# Phase 7H3 — Stable Rollback + LIFF Tab Fix

วันที่: 2026-06-19

## เป้าหมาย

รอบนี้แก้จากไฟล์ backup ที่ยังเปิดหน้า Customer และกดแท็บในหน้าร้านค้าได้ปกติ แล้วนำเฉพาะ hotfix ที่ปลอดภัยกลับเข้าไป เพื่อลด regression จากรอบ 7G/7H

## สาเหตุที่พบจากการเปรียบเทียบ

1. รอบ 7H เปลี่ยน Customer production route ให้ข้าม full snapshot แล้วพึ่ง `/api/db/customer-state` เป็นหลัก ทำให้หน้า Customer บางกรณีไม่มีข้อมูลร้าน/สมาชิกใน cache ก่อน render
2. รอบ 7H เปลี่ยน `CustomerDashboard.tsx` ให้ production strict เกินไป ถ้ายังไม่มี LINE identity จะไม่ fallback ไปข้อมูลเดิม จึงทำให้เว็บตรง `/customer/{slug}` ค้างหรือขึ้นหน้ารอสมาชิก
3. รอบ 7H เปลี่ยน LIFF parser และ cleanup URL หลายจุดพร้อมกัน ทำให้ deep link `?tab=...` เสี่ยงหายหรือวน callback
4. รอบ 7H เปลี่ยน refresh flow ใน CustomerDashboard มากเกินไป ทำให้การกดแท็บในหน้า Customer มีผลข้างเคียงกับ refresh/signature state

## สิ่งที่แก้ในรอบนี้

- คืน `App.tsx`, `CustomerDashboard.tsx` และ behavior หลักของ `LineLoginPanel.tsx` กลับมาใกล้ backup ที่เสถียร
- ปรับเฉพาะ parser ของ `liff.state` ให้ decode ได้หลายชั้นและดึงเฉพาะ query ของระบบเรา เช่น `tab`, `code`, `coupon`, `couponCode`, `claimCode`, `resetLine`
- แยก `code` ของ LINE OAuth ออกจาก coupon code โดยไม่ใช้ direct `code` ถ้า URL เป็น LINE callback (`state` + `code`)
- ปรับ `getCleanRedirectUri()` ให้ไม่ส่ง `liff.state` / OAuth params ซ้อนกลับไปใน `redirectUri` แต่ยังเก็บ `tab`/coupon code ของระบบไว้
- ปรับ `/api/db/snapshot` ให้ไม่เช็ก schema ทุก request เว้นแต่ตั้ง `ENABLE_RUNTIME_SCHEMA_CHECK=true`
- ปรับ `/api/line/auth`, `/api/line/me`, `/api/line/merchant-owner` ให้ไม่เช็ก schema ทุก request เว้นแต่ตั้ง `ENABLE_RUNTIME_SCHEMA_CHECK=true`

## ไม่ได้แก้/ไม่ได้เปลี่ยนในรอบนี้

- ไม่ refactor CustomerDashboard ใหม่
- ไม่ใช้ `/api/db/customer-state` แทน snapshot ในรอบนี้ เพราะเป็นต้นเหตุ regression
- ไม่เปลี่ยน UI แท็บลูกค้า
- ไม่ต้องรัน SQL ใหม่

## การตั้งค่า Production

ไม่ต้องตั้ง `ENABLE_RUNTIME_SCHEMA_CHECK=true` บน Vercel Production

ถ้ามีอยู่ ให้ลบออกหรือเปลี่ยนเป็น `false`

## ทดสอบหลักหลัง deploy

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

ในหน้า Customer:

- กดแท็บ หน้าแรก / ของรางวัล / รับแต้ม / ประวัติ / โปรไฟล์ ต้องเปลี่ยนได้เหมือน backup

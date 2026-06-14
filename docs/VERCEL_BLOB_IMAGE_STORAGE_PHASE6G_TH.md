# Phase 6G — Vercel Blob Image Storage

เฟสนี้ย้ายการอัปโหลดรูปใหม่ออกจาก data URL/base64 ในฐานข้อมูล ไปเก็บเป็นไฟล์จริงบน Vercel Blob แล้วเก็บ URL กลับมาใน Neon

## สิ่งที่เพิ่ม

- เพิ่ม API `/api/storage/upload`
- เพิ่ม dependency `@vercel/blob`
- เพิ่ม environment variable `BLOB_READ_WRITE_TOKEN`
- เพิ่ม columns ใหม่:
  - `shops.logo_url`
  - `shops.logo_storage_key`
  - `rewards.image_url`
  - `rewards.image_storage_key`
  - `promo_banners.image_url`
  - `promo_banners.image_storage_key`
- หน้า Merchant สามารถอัปโหลด:
  - โลโก้ร้าน
  - รูปของรางวัล
  - รูปโปรโมชัน/banner

## หลักการ Backward Compatible

ระบบยังเก็บ column เดิมไว้:

- `shops.logo`
- `rewards.image`
- `promo_banners.image`

ถ้ารูปเก่าเป็น `data:image/...` จะยังแสดงได้เหมือนเดิม
ถ้ารูปใหม่อัปโหลดผ่าน Vercel Blob ระบบจะใช้ URL จาก Blob ก่อน

## วิธีใช้งาน

1. รัน SQL migration `007_phase_6g_vercel_blob_image_storage.sql` ใน Neon
2. เปิด Vercel Dashboard → Storage → Blob
3. สร้างหรือเชื่อม Blob Store
4. เพิ่ม Environment Variable ใน Vercel:

```env
BLOB_READ_WRITE_TOKEN=...
```

5. Deploy เว็บใหม่
6. ทดสอบอัปโหลดโลโก้ร้าน / รูปของรางวัล / รูปโปรโมชัน

## หมายเหตุ

เฟสนี้ยังไม่ลบรูปเก่าออกจาก database และยังไม่ทำปุ่มลบไฟล์เก่าใน Blob เพื่อให้ปลอดภัยกับข้อมูลเดิมก่อน


## หมายเหตุเรื่อง Public / Private Blob Store

สำหรับโลโก้ร้าน รูปของรางวัล และ banner ควรใช้ Vercel Blob Store แบบ `Public` เพราะรูปต้องเปิดแสดงบนหน้าลูกค้าได้โดยตรง

ถ้าสร้าง store เป็น Private ไปแล้ว แนะนำให้สร้าง Blob Store ใหม่แบบ Public แล้วเปลี่ยน `BLOB_READ_WRITE_TOKEN` ใน Vercel Environment Variables ไปใช้ token ของ store ใหม่ จากนั้น Redeploy ใหม่หนึ่งรอบ

ใน Vercel ให้ใส่ token เป็น Sensitive เฉพาะ Production/Preview ได้ ส่วน local development ให้ใส่ใน `.env.local` แทน

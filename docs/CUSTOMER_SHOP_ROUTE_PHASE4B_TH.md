# Phase 4B: Customer Shop Route

รอบนี้เปลี่ยน Customer Flow ให้เริ่มรองรับ URL ตามร้านค้า เพื่อเตรียมใช้งานจริงและต่อยอด LINE Rich Menu / QR Code ในอนาคต

## Route ที่เพิ่ม

```text
/customer              redirect ไปยังร้านค่าเริ่มต้น
/customer/im-sticker   หน้าลูกค้าของร้าน iM Sticker
```

ค่าเริ่มต้นถูกควบคุมด้วย environment variables:

```env
NEXT_PUBLIC_DEFAULT_SHOP_ID=im_sticker
NEXT_PUBLIC_DEFAULT_SHOP_SLUG=im-sticker
```

ถ้าไม่ได้ตั้ง `NEXT_PUBLIC_DEFAULT_SHOP_SLUG` ระบบจะแปลงจาก `NEXT_PUBLIC_DEFAULT_SHOP_ID` อัตโนมัติ เช่น `im_sticker` → `im-sticker`

## วิธีทดสอบหลัง Deploy

เปิด URL เหล่านี้:

```text
https://im-crm-two.vercel.app/customer
https://im-crm-two.vercel.app/customer/im-sticker
```

ผลที่คาดหวัง:

- `/customer` จะ redirect ไป `/customer/im-sticker`
- `/customer/im-sticker` แสดงหน้าลูกค้าของ iM Sticker
- หน้าแรก `/` ปุ่ม “เข้าหน้าลูกค้า” ชี้ไป `/customer/im-sticker`
- `/merchant`, `/admin`, `/demo` ยังทำงานเหมือน Phase 4A

## หมายเหตุ

ตอนนี้ยังใช้ `shopId` ภายใน database เป็น `im_sticker` และใช้ URL slug เป็น `im-sticker` เพื่อให้ URL อ่านง่ายกว่า ในอนาคตถ้ารองรับหลายร้าน สามารถเพิ่ม route เช่น:

```text
/customer/coffee-shop
/customer/barber-shop
/customer/im-sticker
```

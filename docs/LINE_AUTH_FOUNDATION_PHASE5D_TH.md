# Phase 5D: LINE Auth Foundation

เป้าหมายของเฟสนี้คือวางฐานให้ระบบเริ่มรู้จักตัวตนจาก LINE จริง ก่อนนำไปผูกกับ LINE OA / Rich Menu

## Policy ที่ยึดจากเฟสนี้

- ลูกค้า = LINE Login / LIFF
- เจ้าของร้าน = LINE Login / LIFF
- Platform Admin = แยกต่างหาก ไม่ใช้ LINE ในอนาคตจะใช้ email + password

## Environment Variables ใหม่

```env
NEXT_PUBLIC_LINE_LIFF_ID=""
LINE_CHANNEL_ID=""
MERCHANT_OWNER_LINK_CODE=""
```

### NEXT_PUBLIC_LINE_LIFF_ID

ใช้ฝั่ง browser สำหรับเปิด LIFF SDK และให้ผู้ใช้ Login with LINE

### LINE_CHANNEL_ID

ใช้ฝั่ง server สำหรับ verify LINE ID token ผ่าน LINE API

ถ้ายังไม่ตั้งค่านี้ ระบบจะใช้ profile fallback เพื่อทดสอบ flow ได้ แต่ยังไม่ถือว่า verify แบบ production

### MERCHANT_OWNER_LINK_CODE

รหัสชั่วคราวสำหรับผูก LINE user เป็นเจ้าของร้านผ่านหน้า `/merchant/im-sticker`

## Route/API ใหม่

```text
POST /api/line/auth
GET  /api/line/me?lineUserId=...
POST /api/line/merchant-owner
```

## Database table ใหม่

```text
line_users
merchant_line_users
```

`line_users` เก็บ LINE user ที่ login เข้ามา  
`merchant_line_users` ผูก LINE user กับร้านใน role owner

## วิธีทดสอบหลัง deploy

1. ตั้ง `NEXT_PUBLIC_LINE_LIFF_ID` ใน Vercel ถ้ามี LIFF ID แล้ว
2. ตั้ง `LINE_CHANNEL_ID` ใน Vercel ถ้าต้องการ verify ID token จริง
3. ตั้ง `MERCHANT_OWNER_LINK_CODE` เช่น `owner2026`
4. เปิด `/customer/im-sticker` ผ่าน LIFF หรือ LINE in-app browser
5. กด Login with LINE
6. เปิด `/merchant/im-sticker`
7. กด Login with LINE
8. กรอกรหัสผูกเจ้าของร้าน
9. หลังจากนั้นบัญชี LINE เดิมควรเข้า `/merchant/im-sticker` ได้โดย owner check และ PIN จะเหลือเป็น fallback ชั่วคราว

## หมายเหตุ

เฟสนี้ยังไม่ใช่ auth/session เต็มระบบทั้งหมด แต่เป็นฐานสำคัญก่อนทำ Rich Menu pilot เพราะลูกค้าแต่ละคนต้องถูกแยกด้วย LINE user id ของตัวเอง

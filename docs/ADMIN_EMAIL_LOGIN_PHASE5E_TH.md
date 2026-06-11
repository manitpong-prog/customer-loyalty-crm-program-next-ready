# Phase 5E — Admin Email Login

รอบนี้เปลี่ยน `/admin` จาก PIN gate แบบชั่วคราว มาเป็นระบบเข้าสู่ระบบด้วย **email + password** ผ่าน browser ปกติ ตาม policy ใหม่ของโปรเจกต์

## Policy ที่ยึดจากนี้

```text
Customer        = LINE Login / LIFF
Merchant Owner  = LINE Login / LIFF
Platform Admin  = Email + Password only
```

Admin ไม่ผูกกับ LINE user แล้ว และไม่ใช้ LIFF สำหรับการควบคุมแพลตฟอร์ม

## Route ที่เพิ่ม/แก้

```text
/admin/login          หน้าเข้าสู่ระบบผู้ดูแล
/admin                Dashboard ผู้ดูแล ต้องมี admin session ก่อน
/api/admin/login      login และตั้ง HttpOnly cookie
/api/admin/logout     logout และลบ cookie
/api/admin/me         ตรวจ session ปัจจุบัน
```

## Environment Variables ใหม่

ตั้งใน Vercel Project Settings → Environment Variables:

```env
ADMIN_EMAIL="admin@your-domain.com"
ADMIN_PASSWORD="ตั้งรหัสผ่านเอง"
ADMIN_SESSION_SECRET="สุ่มเป็น string ยาว ๆ"
ADMIN_SESSION_DAYS="7"
```

ถ้าไม่ตั้งค่า ระบบมี default สำหรับทดสอบคือ:

```text
email: admin@im-crm.local
password: admin1234
```

ก่อนแชร์ลิงก์ให้คนอื่น ควรตั้งค่า `ADMIN_EMAIL`, `ADMIN_PASSWORD`, และ `ADMIN_SESSION_SECRET` เองเสมอ

## สิ่งที่เปลี่ยนจาก Phase ก่อนหน้า

- `/admin` ไม่ใช้ `NEXT_PUBLIC_ADMIN_ACCESS_PIN` แล้ว
- Session admin เก็บใน HttpOnly cookie ฝั่ง browser
- ปุ่ม logout ถูกเพิ่มในหน้า Platform Admin Dashboard
- `/admin/login` จะ redirect ไป `/admin` ถ้ามี session อยู่แล้ว
- ถ้าเปิด `/admin` โดยยังไม่ login ระบบจะ redirect ไป `/admin/login?next=/admin`

## วิธีทดสอบ

1. Deploy ขึ้น Vercel
2. ตั้ง env:

```env
ADMIN_EMAIL="อีเมลของคุณ"
ADMIN_PASSWORD="รหัสผ่านของคุณ"
ADMIN_SESSION_SECRET="string-long-random"
```

3. Redeploy หนึ่งรอบ
4. เปิด:

```text
https://im-crm-two.vercel.app/admin
```

ผลที่ควรได้:

```text
ยังไม่ login → redirect ไป /admin/login
login ถูกต้อง → เข้า /admin ได้
กดออกจากระบบ → กลับไป /admin/login
เปิด /admin อีกครั้งหลัง logout → ต้อง login ใหม่
```

## หมายเหตุ

รอบนี้ยังเป็น admin auth แบบเบาสำหรับ pilot แต่ดีกว่า PIN เดิมมาก เพราะค่า email/password อยู่ฝั่ง server และใช้ cookie แบบ HttpOnly ไม่ได้เปิดเป็น `NEXT_PUBLIC_*`

# Production Data Cleanup / Pilot Baseline

เอกสารนี้ใช้หลังจาก `/customer`, `/merchant`, `/admin` ทำงานแล้ว และต้องการล้าง demo data เช่น Koffee Craft ออกจาก Neon
เพื่อเริ่มระบบด้วยข้อมูลร้านจริงชุดแรก

## ค่า Environment ที่แนะนำ

ใน Vercel Project Settings → Environment Variables ให้ตั้งค่า:

```env
CRM_AUTO_SEED=pilot
NEXT_PUBLIC_DEFAULT_SHOP_ID=im_sticker
```

ความหมาย:

- `CRM_AUTO_SEED=pilot` = ถ้า Neon ว่าง ระบบจะ seed ร้าน `iM Sticker` ให้อัตโนมัติ
- `CRM_AUTO_SEED=demo` = ใช้ชุด mock/demo เดิม เช่น Koffee Craft
- `CRM_AUTO_SEED=none` = ไม่ seed อะไรเลย ถ้าฐานข้อมูลว่าง
- `NEXT_PUBLIC_DEFAULT_SHOP_ID=im_sticker` = ให้หน้าเว็บเลือก shop หลักเป็น `im_sticker`

## วิธีล้าง demo data และใส่ร้าน Pilot

### วิธีที่ 1: ทำผ่าน Neon SQL Editor

เปิด Neon → SQL Editor แล้วรันไฟล์:

```text
neon/seed-pilot-im-sticker.sql
```

จากนั้นเปิด:

```text
/api/db/health
```

ควรเห็นอย่างน้อย:

```json
{"shops":1,"customers":1}
```

### วิธีที่ 2: ทำผ่าน API reset

ตั้งค่าใน Vercel ชั่วคราว:

```env
ALLOW_DB_RESET=true
```

Redeploy แล้วเรียก API แบบ POST:

```bash
curl -X POST https://YOUR_DOMAIN/api/db/reset \
  -H "Content-Type: application/json" \
  -d '{"mode":"seed-pilot"}'
```

หลังทำเสร็จให้กลับไปตั้ง:

```env
ALLOW_DB_RESET=false
```

แล้ว Redeploy อีกครั้ง

## หลัง Cleanup

ให้ทดสอบ:

1. เปิด `/api/db/health`
2. เปิด `/customer`
3. เปิด `/merchant`
4. สร้างคูปองหรือเพิ่มแต้ม
5. Refresh หน้าเว็บ
6. เช็กจำนวน row ใน Neon SQL Editor

ถ้าข้อมูลยังอยู่หลัง refresh และเปิดจากมือถือ/Incognito แล้วยังเห็นข้อมูลเดียวกัน แปลว่า Neon เป็นแหล่งข้อมูลหลักแล้ว

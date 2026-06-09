# คู่มือ Deploy โปรเจกต์ Customer Loyalty CRM: GitHub + Vercel + Neon

## สถานะไฟล์ชุดนี้

ไฟล์ชุดนี้เป็น Next.js App Router และเพิ่ม Phase 1 Neon Database Integration แล้ว

แนวทางการทำงานตอนนี้คือ:

```text
Browser UI
  ↓ อ่าน cache เร็ว ๆ จาก localStorage
Next.js API Routes
  ↓ อ่าน/เขียนผ่าน DATABASE_URL
Neon PostgreSQL
```

เหตุผลที่ยังมี localStorage อยู่: โค้ด mock-up เดิมเป็น client-side ทั้งหมด การเปลี่ยนเป็น Neon แบบไม่รื้อ UI ใหญ่จึงใช้ localStorage เป็น local cache ชั่วคราว แต่ข้อมูลจะถูกโหลดจาก Neon ตอนเปิดเว็บ และบันทึกกลับ Neon ผ่าน `/api/db/sync` หลังมีการ save

## ขั้นที่ 1: ติดตั้ง dependency ใหม่

เวอร์ชันนี้เพิ่ม `@neondatabase/serverless` ดังนั้นหลังแตกไฟล์หรือ pull code ให้รัน:

```bash
npm install
npm run dev
```

เปิดเว็บที่:

```text
http://localhost:3000
```

ถ้ายังไม่ได้ใส่ `DATABASE_URL` เว็บจะ fallback ไปใช้ localStorage ได้เหมือนเดิม

## ขั้นที่ 2: ตั้งค่า Neon กับ Vercel

ถ้าคุณกด Install Neon จาก Vercel Marketplace แล้ว ระบบจะเพิ่ม Environment Variables ให้เอง:

```text
DATABASE_URL
DATABASE_URL_UNPOOLED
```

สำหรับ runtime ของเว็บ ให้ใช้ `DATABASE_URL` เป็นหลัก เพราะเป็น pooled connection เหมาะกับ Vercel/serverless

ถ้าตั้งเอง ให้ไปที่ Vercel:

```text
Project Settings > Environment Variables
```

แล้วใส่:

```env
DATABASE_URL="postgresql://...pooler.../neondb?sslmode=require&channel_binding=require"
DATABASE_URL_UNPOOLED="postgresql://.../neondb?sslmode=require"
NEXT_PUBLIC_APP_URL="https://your-project.vercel.app"
ALLOW_DB_RESET="false"
```

## ขั้นที่ 3: สร้าง schema ใน Neon

เปิด Neon Console > SQL Editor แล้ววางไฟล์:

```text
neon/schema.sql
```

จากนั้นกด Run

หมายเหตุ: แม้ยังไม่กด Run เอง โค้ด `/api/db/snapshot` จะพยายามสร้างตารางให้อัตโนมัติเมื่อมี `DATABASE_URL` แล้ว แต่การรัน schema เองทำให้ตรวจสอบง่ายกว่า

## ขั้นที่ 4: Push ขึ้น GitHub แล้ว Deploy ใหม่

```bash
git add .
git commit -m "Add Neon database integration"
git push
```

จากนั้น Vercel จะ redeploy อัตโนมัติ

## ขั้นที่ 5: เช็กว่าเว็บต่อ Neon แล้ว

เปิดเว็บ Production แล้วดูตรงแถบบน ถ้าขึ้น:

```text
ฐานข้อมูล: Neon PostgreSQL + Local Cache
```

แปลว่าเว็บโหลดข้อมูลจาก Neon สำเร็จ

ถ้าขึ้น:

```text
ฐานข้อมูล: LocalStorage Fallback
```

ให้เช็กว่า `DATABASE_URL` อยู่ใน Vercel Environment Variables หรือไม่ แล้ว redeploy อีกครั้ง


## ขั้นที่ 5.1: เช็ก API health

หลัง deploy แล้ว เปิด URL นี้ใน browser:

```text
https://your-project.vercel.app/api/db/health
```

ถ้าเชื่อมต่อสำเร็จควรเห็น JSON ประมาณนี้:

```json
{"ok":true,"source":"neon","counts":{"shops":6,"customers":4}}
```

## ขั้นที่ 6: ทดสอบการเขียนข้อมูลจริง

ให้ลองทำรายการเหล่านี้:

1. อนุมัติร้านค้าในหน้า Webmaster
2. สร้างคูปองในหน้าหลังบ้านร้านค้า
3. เปิดลิงก์รับแต้มฝั่งลูกค้า
4. แลกรางวัลหรืออนุมัติรายการแลกของ
5. เปิด Neon Console > Tables แล้วดูข้อมูลในตาราง เช่น `transactions`, `point_coupons`, `customers`

## Reset ข้อมูลตัวอย่าง

### วิธี SQL ตรงใน Neon

รันไฟล์:

```text
neon/reset-demo.sql
```

หรือใช้ SQL นี้:

```sql
truncate table point_coupons, transactions, promo_banners, rewards, customers, shops restart identity cascade;
```

### วิธี API เฉพาะตอนทดสอบ

ตั้ง Vercel Environment Variable:

```env
ALLOW_DB_RESET="true"
```

แล้ว redeploy ก่อน จากนั้นเรียก:

```bash
curl -X POST https://your-project.vercel.app/api/db/reset \
  -H "Content-Type: application/json" \
  -d '{"mode":"clear"}'
```

ถ้าต้องการ reseed demo data กลับเข้าไป:

```bash
curl -X POST https://your-project.vercel.app/api/db/reset \
  -H "Content-Type: application/json" \
  -d '{"mode":"seed-demo"}'
```

หลังใช้เสร็จ ให้ตั้ง `ALLOW_DB_RESET=false` แล้ว redeploy

## Roadmap ถัดไปก่อนใช้งานจริงจริง

1. แยก route จริง เช่น `/customer`, `/owner`, `/admin`
2. ทำ Auth/Role จริง เช่น LINE LIFF สำหรับลูกค้าและเจ้าของร้าน
3. ย้าย logic แต้มสำคัญไปทำใน server transaction ทั้งหมด
4. ทำ schema แบบ production ละเอียดขึ้น เช่น shop_members, merchant_applications, point_ledger
5. ล้าง demo data แล้ว seed เฉพาะร้านแรกจริง

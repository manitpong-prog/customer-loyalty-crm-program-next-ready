# คู่มือ Deploy โปรเจกต์ Customer Loyalty CRM: GitHub + Vercel + Neon

## สถานะไฟล์ชุดนี้

ไฟล์ mock-up เดิมเป็น React + Vite จาก AI Studio และเก็บข้อมูลทั้งหมดใน `localStorage` ของ browser ไม่ใช่ฐานข้อมูลจริง

ไฟล์ชุดนี้ถูกปรับเป็น Next.js App Router แล้ว และทดสอบผ่านคำสั่ง:

```bash
npm run lint
npm run build
```

ผลลัพธ์: Next.js production build ผ่าน

## ขั้นที่ 1: Run Local

```bash
npm install
npm run dev
```

เปิดเว็บที่:

```text
http://localhost:3000
```

## ขั้นที่ 2: Push ขึ้น GitHub

```bash
git init
git add .
git commit -m "Convert mock-up to Next.js production baseline"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

## ขั้นที่ 3: สร้าง Neon Database

1. เข้า neon.com
2. สร้าง Project ใหม่
3. คัดลอก pooled connection string เช่น `postgresql://...sslmode=require`
4. เปิด SQL Editor
5. วางไฟล์ `neon/schema.sql` แล้วกด Run

## ขั้นที่ 4: ตั้ง Environment Variables บน Vercel

ใน Vercel Project Settings > Environment Variables ให้เพิ่ม:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DB?sslmode=require"
NEXT_PUBLIC_APP_URL="https://your-project.vercel.app"
```

ตอนนี้ UI ยังไม่ได้ต่อ Neon จริง จึงยังไม่จำเป็นต้องใช้ `DATABASE_URL` ใน runtime จนกว่าจะทำ phase เชื่อม API/Server Actions

## ขั้นที่ 5: Deploy ผ่าน Vercel

1. เข้า vercel.com
2. Add New Project
3. Import GitHub repository
4. Framework Preset ควร detect เป็น Next.js
5. Build Command: `npm run build`
6. Output Directory: ปล่อยว่างสำหรับ Next.js
7. Deploy

## ขั้นที่ 6: Reset ข้อมูลตัวอย่าง

### ระยะ Prototype ปัจจุบัน

ข้อมูลอยู่ใน browser localStorage ถ้าต้องการล้างข้อมูล mock ในเครื่อง ให้เปิด DevTools Console แล้วใช้:

```js
localStorage.clear()
location.reload()
```

แต่ถ้าล้างหมด UI บางส่วนอาจไม่มีข้อมูลให้แสดง เพราะ mock-up เดิมออกแบบให้มีข้อมูลตั้งต้นเสมอ

### ระยะ Production หลังต่อ Neon แล้ว

ใช้ SQL นี้เพื่อล้างข้อมูลธุรกิจทั้งหมด แต่คง schema ไว้:

```sql
truncate table transactions, point_coupons, promo_banners, rewards, customers, shops restart identity cascade;
```

## Roadmap ที่แนะนำก่อนใช้งานจริง

1. แยกหน้า `/customer`, `/owner`, `/admin` เป็น route จริงของ Next.js
2. เปลี่ยน `src/data/mockData.ts` จาก localStorage เป็น API หรือ Server Actions ที่อ่าน/เขียน Neon
3. เพิ่มระบบ Auth เช่น LINE LIFF สำหรับลูกค้า/เจ้าของร้าน และ admin login สำหรับผู้ดูแลระบบ
4. เพิ่ม validation และ transaction-safe point logic เช่น ใช้ database transaction ตอนแลกรางวัล/รับแต้ม
5. ทำ Seed script สำหรับสร้างร้านแรกจริง เช่น `im-sticker`
6. ทำ Reset script สำหรับล้างข้อมูล demo ก่อนเริ่ม Production

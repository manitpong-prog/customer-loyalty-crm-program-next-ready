# Phase 6C.5 — Pilot Checklist with Database

เพิ่มกล่อง “Pilot Checklist ก่อนเปิดร้านจริง” ในหน้า `ตั้งค่าร้านค้า` ของ Merchant Dashboard เพื่อให้เจ้าของร้านตรวจความพร้อมก่อนใช้งานจริงได้ง่ายขึ้น

## สิ่งที่เพิ่มในรอบนี้

### 1. Database table ใหม่

เพิ่มตาราง:

```sql
shop_onboarding_checklists
```

ใช้เก็บ checklist ที่ระบบตรวจเองไม่ได้ เช่น เจ้าของร้านยืนยันว่าตั้งค่า Rich Menu แล้ว, ทดสอบใน LINE แล้ว, ล้างข้อมูลทดสอบแล้ว และพร้อมเปิด Pilot แล้ว

Migration ที่ต้องรัน:

```text
neon/migrations/002_phase_6c5_pilot_checklist.sql
```

### 2. Auto checklist

ระบบตรวจจากข้อมูลจริงในร้าน เช่น:

- ตั้งชื่อร้านแล้ว
- อัปโหลดโลโก้ร้านแล้ว
- ใส่ช่องทางติดต่อแล้ว
- ตั้งอัตราแจกแต้มแล้ว
- เพิ่มของรางวัลแล้ว
- มีของรางวัลที่เปิดใช้งานและมีสต็อก
- ลิงก์ลูกค้า/Rich Menu พร้อมใช้งาน
- เคยสร้างลิงก์รับแต้ม
- เคยทดสอบรับแต้ม
- เคยทดสอบแลกรางวัล

### 3. Manual checklist

เจ้าของร้านสามารถติ๊กสถานะที่ต้องยืนยันเองได้:

- ตั้งค่า Rich Menu ใน LINE OA แล้ว
- ทดสอบเปิดจากมือถือใน LINE แล้ว
- ทดสอบรับแต้มจากลิงก์จริงแล้ว
- ทดสอบแลกรางวัลจริงแล้ว
- ตรวจข้อความแนะนำลูกค้าแล้ว
- ล้างข้อมูลทดสอบก่อนเปิดจริงแล้ว
- เจ้าของร้านยืนยันว่าพร้อมเปิด Pilot

### 4. Local cache + Neon sync

เพิ่ม entity ใหม่ในระบบ sync:

```text
onboardingChecklists
```

เพื่อให้หน้าเว็บยังทำงานได้เร็วผ่าน localStorage และ sync กลับ Neon ผ่าน `/api/db/sync`

## ไฟล์หลักที่แก้

```text
src/types.ts
src/data/mockData.ts
src/lib/server/crmDb.ts
src/app/api/db/sync/route.ts
src/components/OwnerDashboard.tsx
neon/schema.sql
neon/migrations/002_phase_6c5_pilot_checklist.sql
```

## วิธีทดสอบหลัง Deploy

1. เปิด `/merchant/im-sticker`
2. เข้าเมนู `ตั้งค่า`
3. ดูกล่อง `Pilot Checklist ก่อนเปิดร้านจริง`
4. ติ๊ก manual checklist อย่างน้อย 1 รายการ
5. refresh หน้า
6. สถานะที่ติ๊กไว้ควรยังอยู่
7. เปิด Neon SQL Editor แล้วรัน:

```sql
select *
from shop_onboarding_checklists
order by updated_at desc;
```

ถ้าเห็น row ของร้าน แปลว่าบันทึกลง Database แล้ว

# Phase 6D — ตั้งค่ากฎการสะสมแต้มแบบ Database จริง

เฟสนี้เพิ่มกฎสะสมแต้มให้ร้านตั้งค่าได้ละเอียดขึ้น และบันทึกลง Neon Database จริง ไม่ใช่ UI mock

## สิ่งที่เพิ่ม

เพิ่ม field ใหม่ในตาราง `shops`:

- `point_rounding_mode` — วิธีปัดเศษแต้ม: `floor` หรือ `nearest`
- `minimum_purchase_for_points` — ยอดซื้อขั้นต่ำที่จะได้แต้ม
- `point_expiry_days` — แต้มหมดอายุหลังได้รับกี่วัน
- `point_expiry_reminder_days` — แจ้งเตือนแต้มใกล้หมดอายุก่อนกี่วัน

## ค่าเริ่มต้นสำหรับ Pilot

```text
ทุก 10 บาท = 1 แต้ม
ปัดเศษลง
ยอดซื้อขั้นต่ำ 1 บาท
ลิงก์รับแต้มตั้งอายุได้ในหน้า “รับแต้ม” เป็นนาที ค่าเริ่มต้น 10 นาที
คูปองรับแต้มใช้ได้ครั้งเดียวต่อคูปอง
แต้มหมดอายุหลังได้รับ 365 วัน
แจ้งเตือนก่อนหมดอายุ 30 วัน
```

## ไฟล์สำคัญ

```text
src/types.ts
src/lib/pointRules.ts
src/lib/server/crmDb.ts
src/components/OwnerDashboard.tsx
neon/schema.sql
neon/migrations/003_phase_6d_point_rules.sql
docs/POINT_RULES_PHASE6D_TH.md
```

## วิธีคำนวณแต้ม

ระบบใช้ helper กลางใน `src/lib/pointRules.ts`:

```text
calculateEarnPoints(amount, shop)
```

ตัวอย่าง:

- ร้านตั้ง `pointsRate = 10`
- ยอดซื้อ `95` บาท
- ถ้า `floor` = 9 แต้ม
- ถ้า `nearest` = 10 แต้ม

## ผลกับลิงก์รับแต้ม

หน้า “รับแต้ม” จะมีช่องตั้งอายุลิงก์เป็น “นาที” เฉพาะตอนสร้างลิงก์ ค่าเริ่มต้นคือ 10 นาที และไม่แสดงตัวเลือกนี้ในหน้า “ตั้งค่า” แล้ว

ตัวอย่าง:

```text
ตั้งค่าในหน้า รับแต้ม = 10 นาที
สร้างลิงก์เวลา 14:00
ลิงก์หมดอายุเวลา 14:10
```

หมายเหตุ: field `point_link_expiry_days` อาจยังอยู่ใน schema เดิมเพื่อ backward compatibility แต่โค้ดสร้างลิงก์รับแต้มรอบนี้ไม่ใช้ค่า field นี้แล้ว

## หมายเหตุสำคัญ

ระบบคูปองรับแต้มของ Phase นี้ยึดหลัก “คูปองหนึ่งรายการใช้ได้ครั้งเดียว” เท่านั้น จึงไม่มีตัวเลือกให้ลูกค้าหลายคนรับแต้มจากลิงก์เดียวกัน

## Migration

ก่อน deploy code ต้องรัน:

```text
neon/migrations/003_phase_6d_point_rules.sql
```

ถ้าเคยรันไฟล์ Phase 6D เวอร์ชันก่อนหน้าที่มี column `allow_duplicate_claim_per_link` แล้ว ให้รันไฟล์ cleanup เพิ่ม:

```text
neon/migrations/004_phase_6d_remove_duplicate_claim_setting.sql
```

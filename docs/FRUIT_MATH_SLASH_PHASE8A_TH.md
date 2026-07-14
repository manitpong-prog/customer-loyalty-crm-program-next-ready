# Phase 8A — Fruit Math Slash + Reward Ticket

อัปเดต: 14 กรกฎาคม 2026

## เป้าหมาย

เพิ่มมินิเกมใช้ทักษะในหน้า Customer โดยลูกค้าใช้แต้มเพื่อเริ่มเล่น หากตอบถูกครบตามเงื่อนไขจะได้รับ Reward Ticket และนำ Ticket ไปแลกของรางวัลที่ร้านกำหนดได้ ระบบแต้มเดิมยังทำงานเหมือนเดิม

## กติกาเกม MVP

- ชื่อเกม: Fruit Math Slash
- ค่าเริ่มต้น: 10 แต้มต่อรอบ
- จำนวนโจทย์สูงสุด: 10 ข้อ
- โจทย์: เลข 3 จำนวน ใช้เฉพาะ `+` และ `-`
- ชนะ: ตอบถูกครบ 8 ข้อ
- แพ้: ตอบผิดหรือหมดเวลาครบ 3 ข้อ
- ข้อ 1–3: 5 วินาที / 4 ผลไม้
- ข้อ 4–6: 4 วินาที / 6 ผลไม้
- ข้อ 7–10: 3 วินาที / 8 ผลไม้
- MVP ใช้การแตะผลไม้ที่เป็นคำตอบ
- ชนะได้รับ Reward Ticket 1 ใบ
- Ticket หมดอายุภายใน 30 วัน
- จำนวนครั้งต่อวันร้านตั้งค่าได้ ค่าเริ่มต้น 3 ครั้ง
- เล่นใหม่ต้องใช้แต้มใหม่ทุกครั้ง
- ออกจากเกมกลางรอบถือว่าใช้สิทธิ์แล้วและไม่คืนแต้ม

## การทำงานด้านความปลอดภัย

- Server เป็นผู้สุ่มโจทย์และเก็บคำตอบที่ถูกต้องไว้ในฐานข้อมูล
- Frontend ไม่ได้รับ field `correctAnswer`
- Server ตรวจคำตอบ ลำดับข้อ เวลาที่ใช้ และสถานะ session
- ใช้ PostgreSQL advisory lock เพื่อป้องกันการเริ่มเกมหรือส่งคำตอบซ้ำพร้อมกัน
- การเริ่มเกมหักแต้ม สร้าง session สร้าง transaction และ audit log ภายใน SQL statement เดียว
- ชนะหนึ่ง session ออก Ticket ได้ครั้งเดียวด้วย unique constraint
- Ticket ที่นำไปขอแลกรางวัลจะเปลี่ยนเป็น `reserved` ก่อน เพื่อป้องกันการใช้ซ้ำ
- ร้านอนุมัติ: `reserved → used`
- ร้านปฏิเสธ: `reserved → available` หรือ `expired` ถ้าหมดอายุแล้ว

## ระบบแลกรางวัลที่เพิ่มขึ้น

ของรางวัลแต่ละรายการตั้งค่าได้ 3 รูปแบบ:

1. ใช้แต้มเท่านั้น (`points`)
2. ใช้ Reward Ticket เท่านั้น (`tickets`)
3. เลือกใช้แต้ม หรือ Reward Ticket อย่างใดอย่างหนึ่ง (`either`)

MVP ยังไม่รองรับการใช้แต้มและ Ticket พร้อมกันในคำขอเดียว

## ตารางฐานข้อมูลใหม่

- `mini_games` — การตั้งค่าเกมต่อร้าน
- `game_sessions` — ประวัติการเล่นแต่ละรอบ พร้อมโจทย์และผลลัพธ์
- `reward_tickets` — Ticket รายใบและสถานะ available/reserved/used/expired

คอลัมน์ที่เพิ่ม:

- `rewards.redemption_mode`
- `rewards.ticket_cost`
- `transactions.payment_method`
- `transactions.tickets_used`

Migration:

```text
neon/migrations/009_fruit_math_game_reward_tickets.sql
```

## API ใหม่

```text
GET  /api/db/games/state
POST /api/db/games/start
POST /api/db/games/answer
POST /api/db/games/abandon
GET  /api/db/games/settings
POST /api/db/games/settings
```

## โครงสร้างโมดูล

```text
src/features/fruit-math-game/
├── FruitMathGame.tsx
├── GameSettingsPanel.tsx
└── types.ts

src/lib/server/games/
└── gameDb.ts
```

## วิธีติดตั้งและทดสอบ

### 1. สำรองฐานข้อมูล Neon

ทำ backup หรือสร้าง branch ของฐานข้อมูลก่อนรัน migration

### 2. รัน SQL

เปิด Neon SQL Editor แล้วรันไฟล์ก่อน deploy โค้ด (Production ไม่ควรเปิด `ENABLE_RUNTIME_SCHEMA_CHECK` เพราะจะเพิ่มเวลา cold start):

```text
neon/migrations/009_fruit_math_game_reward_tickets.sql
```

### 3. ตรวจโค้ด

```bash
npm install
npm run typecheck
npm run build
npm run dev
```

### 4. ทดสอบหลังบ้านร้านค้า

1. เปิด `/merchant/{shopSlug}`
2. เข้าเมนู `มินิเกม`
3. ตรวจค่าเข้าเล่น 10 แต้ม จำนวนครั้ง 3 ครั้ง/วัน และเปิดใช้งาน
4. เข้าเมนู `ของรางวัล`
5. เพิ่มหรือแก้รางวัล แล้วเลือกใช้แต้ม, Ticket หรือเลือกอย่างใดอย่างหนึ่ง

### 5. ทดสอบหน้าลูกค้า

1. เปิด `/customer/{shopSlug}`
2. ตรวจว่าลูกค้ามีอย่างน้อย 10 แต้ม
3. กดการ์ด Fruit Math Slash
4. ยืนยันใช้แต้มและเล่นจนชนะหรือแพ้
5. เมื่อชนะ ตรวจยอด Ticket
6. เปิดของรางวัลที่รับ Ticket แล้วส่งคำขอแลก
7. กลับหน้าร้านค้าเพื่ออนุมัติหรือปฏิเสธ
8. ตรวจว่าอนุมัติแล้ว Ticket เป็น used และปฏิเสธแล้ว Ticket ถูกคืน

## ข้อจำกัดของ MVP

- ยังเป็นการแตะผลไม้ ไม่ใช่การปัดฟัน
- ยังไม่มีเสียง เอฟเฟกต์ผลไม้แตก combo หรือ leaderboard
- ระบบป้องกันการแก้ request สำคัญอยู่ฝั่ง server แต่ผู้ใช้ที่เขียน automation ขั้นสูงยังสามารถคำนวณโจทย์จากหน้าเว็บได้ จึงควรเพิ่ม anti-bot/rate-limit หากเปิดเป็นกิจกรรมมูลค่าสูง
- API ของโปรเจคเดิมยังใช้ customer/shop ID จาก client หลายจุด ควรเพิ่มการผูก session กับ LINE token และสิทธิ์ Merchant ก่อนเปิดสาธารณะในวงกว้าง
- การแลกรางวัลเดิมใช้หลาย database statements พร้อม compensation; ควรย้าย flow ทั้งก้อนไป atomic transaction/CTE ใน Phase hardening ถัดไป

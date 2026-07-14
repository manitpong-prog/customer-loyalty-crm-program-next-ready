

## 2026-07-09 - Compact Customer Top Cards Patch v2

### Goal
- Reduce the two top customer UI blocks that were too visually dominant: LINE connection panel and member greeting card.
- Keep the existing LINE login/logout logic intact.

### Files changed
1. `src/components/LineLoginPanel.tsx`
   - Added a real compact render path when `compact` is true.
   - The previous `compact` prop only hid the merchant helper note, so the panel still looked large.
   - New compact UI uses smaller icon, text, button, spacing, and optional small status message.

2. `src/components/CustomerDashboard.tsx`
   - Reduced top body spacing from `pt-4` to `pt-2`.
   - Reduced home tab spacing from `space-y-5` to `space-y-3`.
   - Reduced member greeting card padding, avatar size, LINE badge size, name text size, tier badge size, and claim button size.

### Expected visual result
- The LINE panel becomes a slim single-row banner.
- The member greeting card becomes much shorter and should no longer pull focus from the points/member card below.

### Test commands
```bash
npm install
npm run typecheck
npm run dev
```

### Notes
- No database or SQL changes required.
- No business logic changed.

## 2026-07-09 - Compact Header Patch v3: รวม LINE + Member greeting เป็นกล่องเดียว

### เป้าหมาย
- ปรับส่วนบนของ CustomerDashboard ให้การ์ดเชื่อม LINE และการ์ดทักทายสมาชิกอยู่ในกล่องเดียวกัน
- ลดการดึงสายตาจากพื้นที่หลักของหน้าแอพ โดยยังให้ผู้ใช้เห็นสถานะ LINE และปุ่มเชื่อม/ออกจากระบบได้

### ไฟล์ที่แก้
1. `src/components/CustomerDashboard.tsx`
   - ย้าย `<LineLoginPanel compact />` จากตำแหน่งแยกด้านบนของหน้า เข้ามาอยู่ภายในการ์ดทักทายสมาชิก
   - ทำให้หน้า Home เหลือกล่องสมาชิกกล่องเดียวสำหรับ Avatar, ชื่อ, Tier, ปุ่มรับแต้ม และสถานะ LINE

2. `src/components/LineLoginPanel.tsx`
   - ปรับโหมด `compact` ให้เป็นแถวเล็กสำหรับฝังในกล่องอื่น แทนการสร้างการ์ดใหญ่แยกของตัวเอง
   - ลด icon, padding, font และปุ่ม ให้เหมาะกับการอยู่ใน Member greeting card

### สิ่งที่ไม่ได้แก้
- ไม่แก้ logic การ login/logout LINE
- ไม่แก้ API, database, Neon, SQL หรือ schema
- ไม่แก้หน้าร้านค้า/Admin

### วิธีทดสอบ
```bash
unzip -o customer-dashboard-compact-merged-v3.zip -d .
npm install
npm run dev
```

จากนั้นเปิดหน้า Customer Dashboard และตรวจว่า:
- การ์ด LINE ไม่แสดงเป็นกล่องแยกด้านบนแล้ว
- ข้อมูล LINE อยู่รวมในกล่องทักทายสมาชิกเดียวกัน
- ปุ่มเชื่อม LINE / ออกจากระบบ ยังคลิกได้ตามเดิม

## 2026-07-14 - Phase 8A: Fruit Math Slash + Reward Ticket

### เป้าหมาย
- เพิ่มมินิเกมคณิตศาสตร์แบบใช้ทักษะในหน้า Customer
- ใช้ 10 แต้มต่อรอบ ตอบถูก 8 จาก 10 ก่อนผิดครบ 3 ครั้ง
- เวลาต่อข้อ 5 → 4 → 3 วินาที และตัวเลือก 4 → 6 → 8 ผลไม้
- ชนะรับ Reward Ticket 1 ใบ อายุ 30 วัน
- เพิ่มระบบให้ของรางวัลเลือกใช้แต้ม, Ticket หรือเลือกอย่างใดอย่างหนึ่ง

### ไฟล์ใหม่
1. `src/features/fruit-math-game/FruitMathGame.tsx`
   - UI เกมเต็มหน้าจอ, lobby, ยืนยันหักแต้ม, timer, ผลไม้ตก, หน้าชนะ/แพ้
2. `src/features/fruit-math-game/GameSettingsPanel.tsx`
   - หน้าตั้งค่าค่าเข้าเล่น จำนวนครั้งต่อวัน และเปิด/ปิดเกม
3. `src/features/fruit-math-game/types.ts`
   - Types ของ game state, question และ round
4. `src/lib/server/games/gameDb.ts`
   - สุ่มโจทย์, เริ่มเกม, ตรวจคำตอบ, ออก Ticket, จอง/ใช้/คืน Ticket
5. `src/app/api/db/games/state/route.ts`
6. `src/app/api/db/games/start/route.ts`
7. `src/app/api/db/games/answer/route.ts`
8. `src/app/api/db/games/abandon/route.ts`
9. `src/app/api/db/games/settings/route.ts`
10. `neon/migrations/009_fruit_math_game_reward_tickets.sql`
11. `docs/FRUIT_MATH_SLASH_PHASE8A_TH.md`

### ไฟล์ที่แก้
1. `src/types.ts`
   - เพิ่ม Reward redemption mode, payment method, game config/session และ Ticket summary
2. `src/lib/server/crmDb.ts`
   - รองรับราคา Ticket ใน rewards/transactions
   - รองรับขอแลก อนุมัติ ปฏิเสธ และคืน Ticket
   - ตรวจการหักแต้มด้วย `UPDATE ... RETURNING`
3. `src/app/api/db/reward-redeem/route.ts`
   - รับ `paymentMethod` เป็น points หรือ tickets
4. `src/components/CustomerDashboard.tsx`
   - เพิ่มทางเข้าเกม ยอด Ticket และ UI เลือกวิธีแลกรางวัล
5. `src/components/OwnerDashboard.tsx`
   - เพิ่มเมนูมินิเกม ตั้งค่าเกม ตั้งค่ารางวัลแบบ Ticket และแสดงการอนุมัติที่รองรับทั้งสองสิทธิ์
6. `PROJECT_STATE.md`
   - อัปเดตสถานะ Phase ล่าสุด

### SQL ที่ต้องรัน
```text
neon/migrations/009_fruit_math_game_reward_tickets.sql
```

### การตรวจสอบ
```bash
npm run typecheck
npm run build
```

ผล: TypeScript ผ่าน และ Next.js production build ผ่าน

### หมายเหตุ
- โปรเจค ZIP นี้เป็น Next.js Web App ไม่ใช่ Expo React Native จึงไม่ได้เพิ่ม Expo dependency
- Game API ใช้ versioned migration เป็นหลัก และไม่รัน DDL ตอน runtime เว้นแต่ตั้ง `ENABLE_RUNTIME_SCHEMA_CHECK=true` เพื่อรักษาความเร็ว cold start
- MVP ใช้แตะผลไม้; swipe gesture วางไว้ Phase ถัดไป
- ก่อนเปิด public ควรเพิ่ม LINE-session binding/rate limit และ harden reward redemption ให้ atomic มากขึ้น


## 2026-07-14 — Fruit Math Slash v1.1: ปรับเวลาเป็น 7–6–5 วินาที

### เป้าหมาย
- ลดความยากด้านเวลา โดยคงกติกา จำนวนผลไม้ ค่าเข้าเล่น และรางวัลเดิมทั้งหมด

### ไฟล์ที่แก้
- `src/lib/server/games/gameDb.ts` — เปลี่ยนเวลาที่ Server กำหนดสำหรับข้อ 1–3 / 4–6 / 7–10 เป็น 7 / 6 / 5 วินาที
- `src/features/fruit-math-game/FruitMathGame.tsx` — อัปเดตข้อความกติกาหน้าลูกค้าให้ตรงกับเวลาใหม่
- `src/features/fruit-math-game/GameSettingsPanel.tsx` — อัปเดตข้อความกติกาหน้าร้านค้าให้ตรงกับเวลาใหม่
- `docs/FRUIT_MATH_SLASH_PHASE8A_TH.md` — อัปเดตคู่มือเกม
- `PROJECT_STATE.md` — อัปเดตสถานะกติกาปัจจุบัน

### สิ่งที่ไม่เปลี่ยน
- ค่าเข้าเล่น 10 แต้ม
- จำนวนผลไม้ 4 / 6 / 8 ลูก
- ชนะเมื่อถูก 8 ข้อ และแพ้เมื่อผิดครบ 3 ข้อ
- Reward Ticket 1 ใบ อายุ 30 วัน
- โครงสร้างฐานข้อมูลและ SQL migration

### SQL
- ไม่ต้องรัน SQL เพิ่ม เพราะเป็นการเปลี่ยนค่ากติกาในโค้ดเท่านั้น


## 2026-07-14 — Fruit Math Slash v1.2: Timer Synchronization Hotfix

### ปัญหาที่พบ
- ผู้เล่นเห็นตัวเลขเวลายังเหลือประมาณ 4 วินาที แต่ระบบตัดสินหมดเวลา
- ไม่เกี่ยวกับ realtime database; เป็นการเริ่มจับเวลาคนละจังหวะระหว่าง Client และ Server

### สาเหตุ
- `game_sessions.question_started_at` ถูกตั้งใน Neon ก่อน response ถึง LINE WebView
- ข้อถัดไปเริ่มเวลาใน Server ก่อน feedback 260 ms และก่อนหน้าจอ render
- network/cold start ทำให้เวลาฝั่ง Server เดินนำหน้าตัวเลขบนหน้าจอ

### แนวทางแก้
- เพิ่มขั้นตอน activate ต่อโจทย์ โดย Server เริ่มจับเวลาเมื่อ Client พร้อมแสดงโจทย์
- เพิ่ม `question_ready_index` ป้องกันการ activate โจทย์เดิมซ้ำเพื่อยืดเวลา
- Answer API รับคำตอบเฉพาะข้อที่ activate แล้ว
- Client ซ่อนโจทย์และผลไม้ระหว่างซิงก์เวลา
- Client ใช้ `performance.now()` คำนวณเวลาที่ผ่านจริง แม้ interval ถูก browser หน่วง

### ไฟล์ใหม่
- `src/app/api/db/games/activate/route.ts`
- `neon/migrations/010_fruit_math_timer_sync.sql`

### ไฟล์ที่แก้
- `src/lib/server/games/gameDb.ts`
- `src/features/fruit-math-game/FruitMathGame.tsx`
- `README.md`
- `PROJECT_STATE.md`
- `docs/FRUIT_MATH_SLASH_PHASE8A_TH.md`
- `log_history.md`

### SQL ที่ต้องรัน
```text
neon/migrations/010_fruit_math_timer_sync.sql
```

### การตรวจสอบ
- `npm run typecheck` ผ่าน
- `npm run build` ผ่าน
- Next.js build พบ route ใหม่ `/api/db/games/activate`



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

# Production UI Cleanup Phase 3

เวอร์ชันนี้ย้ายหน้า demo รวมทุกบทบาทออกจาก `/` ไปไว้ที่ `/demo` แล้ว และเปลี่ยนหน้าแรกเป็น Production Landing สำหรับเลือกเข้าใช้งานจริง

## Routes

- `/` = หน้า Production Landing ไม่มี role switcher และไม่มีกรอบมือถือจำลอง
- `/customer` = หน้าลูกค้าแบบ Production View เอากรอบจำลอง/role switcher/ข้อความ demo ออก
- `/merchant` = หลังบ้านร้านค้าแบบแยก route
- `/admin` = หน้าผู้ดูแลเว็บไซต์แบบแยก route
- `/demo` = หน้า Prototype/Demo เดิม ใช้ทดสอบ role switcher, mobile simulator และ workflow รวม

## หมายเหตุ

- ข้อมูลยัง sync ผ่าน Neon PostgreSQL + Local Cache ตาม Phase 1
- ค่าเริ่มต้นใช้ร้าน pilot `im_sticker` และลูกค้าทดสอบ `cust_pilot_001` ตาม Production Data Cleanup
- ก่อน production เต็มรูปแบบควรทำ Phase ถัดไป: slug route เช่น `/customer/[shopSlug]`, owner auth/PIN, admin auth และซ่อน `/demo` ด้วย environment flag หรือ auth

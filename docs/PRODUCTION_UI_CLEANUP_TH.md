# Production UI Cleanup Phase 1

เวอร์ชันนี้ยังเก็บหน้า demo หลักไว้ที่ `/` เพื่อใช้ทดสอบครบทุกบทบาทในหน้าเดียว แต่เพิ่ม route สำหรับใช้งานจริงแยกบทบาทแล้ว

## Routes

- `/` = หน้า Prototype/Demo เดิม ใช้ทดสอบ role switcher, mobile simulator และ workflow รวม
- `/customer` = หน้าลูกค้าแบบ Production View เอากรอบจำลอง/role switcher/ข้อความ demo ออก
- `/merchant` = หลังบ้านร้านค้าแบบแยก route
- `/admin` = หน้าผู้ดูแลเว็บไซต์แบบแยก route

## หมายเหตุ

- ข้อมูลยัง sync ผ่าน Neon PostgreSQL + Local Cache ตาม Phase 1
- หน้า `/customer` ยังใช้ลูกค้าทดสอบ `cust_line_user` และร้านเริ่มต้น `koffee_craft`
- ก่อน production จริงควรทำ Phase ถัดไป: slug route เช่น `/customer/[shopSlug]`, owner auth/PIN, admin auth และ reset demo data

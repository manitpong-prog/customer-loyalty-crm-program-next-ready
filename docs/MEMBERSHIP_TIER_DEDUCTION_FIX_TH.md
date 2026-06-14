# Membership Tier Deduction Fix

แพตช์นี้แก้ปัญหาระดับสมาชิกไม่ downgrade หลังปรับลดแต้มสะสมรวม

## ปัญหาเดิม

หลัง Phase 6E ระบบรองรับ `membership_tiers` จาก Database แล้ว แต่บางจุดยังอาจแสดง `customer.tier` เดิมที่ค้างอยู่ใน local cache/DB ได้ เช่น:

- ตั้ง VIP = 5,000 แต้ม
- ตั้ง Platinum = 3,500 แต้ม
- ลูกค้าเคยเป็น VIP/Platinum
- ร้านปรับลดแต้มสะสมรวมเหลือ 3,000 แต้ม
- หน้าร้านค้ายังแสดง Platinum ทั้งที่ควรเป็น Gold

## สิ่งที่แก้

- หน้า Merchant จะ normalize ระดับสมาชิกตอนโหลดข้อมูล โดยคำนวณจาก `lifetimePoints` + tier settings ล่าสุดของร้าน
- ตารางสมาชิกแสดงระดับจากการคำนวณสด
- Export/customer detail ใช้ระดับที่คำนวณสด
- หน้า Customer แสดง badge และสิทธิ์จากระดับที่คำนวณสด

## ผลลัพธ์ที่ควรได้

ถ้า settings เป็น:

- Gold = 1,500
- Platinum = 3,500
- VIP = 5,000

ลูกค้าที่มี `lifetimePoints = 3,000` จะถูกแสดงเป็น `Gold`

## Migration

ไม่ต้องรัน SQL ใหม่ เพราะเป็นการแก้ logic/UI เท่านั้น

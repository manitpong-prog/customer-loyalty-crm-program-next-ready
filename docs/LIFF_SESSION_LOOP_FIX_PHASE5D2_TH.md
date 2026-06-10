# Phase 5D.2 - LIFF Session Loop Fix

รอบนี้แก้ปัญหาเปิด LIFF แล้วหน้าเด้งสลับระหว่างหน้า Login กับหน้า "ยังไม่พบข้อมูลสมาชิก" ตลอดเวลา

## สาเหตุ

`LineLoginPanel` จะอ่าน LINE identity จาก `localStorage` ทุกครั้งที่ component mount และส่งกลับไปที่ `App` ผ่าน `onAuthenticated` จากนั้น `App` จะ refresh Neon snapshot และเพิ่ม `dataVersion` ทำให้ `CustomerDashboard` remount ใหม่ แล้ว `LineLoginPanel` อ่าน identity ซ้ำอีกครั้ง เกิดเป็นวงจร refresh/remount loop

## สิ่งที่แก้

- ป้องกัน `App` refresh snapshot ซ้ำเมื่อ LINE identity เดิมถูก restore จาก localStorage
- refresh Neon snapshot เฉพาะกรณี identity ใหม่ หรือยังไม่มี customer ของ LINE user ใน local cache
- หน้า fallback กรณีไม่พบ customer จะแสดง `LineLoginPanel` อยู่เสมอ ไม่ทำให้ลูกค้าติดหน้าขาว/หน้าค้าง
- ปรับข้อความ fallback ให้เหมาะกับช่วงสร้างสมาชิกจาก LINE Login

## วิธีทดสอบ

1. Deploy แล้วเปิด `/customer/im-sticker?resetLine=1` หนึ่งครั้ง
2. เปิด `https://liff.line.me/2010362466-uenl7qUb`
3. กด Login with LINE
4. หน้าไม่ควรเด้งสลับไปมาอีก
5. ไปที่ Neon SQL Editor แล้วรัน:

```sql
select * from line_users order by created_at desc;
select id, name, line_id, shop_ids from customers order by created_at desc;
```

ควรเห็น LINE user และ customer id ที่ขึ้นต้นด้วย `line_`

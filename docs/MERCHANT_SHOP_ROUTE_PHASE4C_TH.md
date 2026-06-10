# Phase 4C: Merchant Shop Route

รอบนี้ปรับ route หลังบ้านร้านค้าให้ผูกกับ slug ของร้านเหมือนฝั่งลูกค้า

## Route ใหม่

```text
/merchant              -> redirect ไป /merchant/im-sticker
/merchant/im-sticker   -> หลังบ้านร้าน iM Sticker พร้อม PIN gate
```

## Environment variables ที่เกี่ยวข้อง

```env
NEXT_PUBLIC_DEFAULT_SHOP_ID="im_sticker"
NEXT_PUBLIC_DEFAULT_SHOP_SLUG="im-sticker"
NEXT_PUBLIC_MERCHANT_ACCESS_PIN="1234"
```

## เหตุผลที่ทำแบบนี้

- เตรียมรองรับหลายร้านในอนาคต
- ลิงก์หลังบ้านของแต่ละร้านจะชัดเจน เช่น `/merchant/im-sticker`
- `/merchant` ยังใช้งานง่าย เพราะ redirect ไป default shop อัตโนมัติ
- PIN gate เดิมยังทำงานเหมือนเดิม

## การทดสอบหลัง deploy

เปิด URL เหล่านี้:

```text
/merchant
/merchant/im-sticker
/customer/im-sticker
/admin
/demo
```

ผลที่ควรได้คือ `/merchant` จะพาไป `/merchant/im-sticker` และหน้า `/merchant/im-sticker` ต้องถาม PIN ก่อนเข้าใช้งาน

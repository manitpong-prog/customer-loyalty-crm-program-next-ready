-- Seed a clean pilot baseline for iM Sticker.
-- This removes old mock/demo data and creates one active shop plus one placeholder customer.

truncate table point_coupons, transactions, promo_banners, rewards, customers, shops restart identity cascade;

insert into shops (
  id, name, description, logo, category, points_rate, is_active, registration_status, phone, created_at, updated_at
) values (
  'im_sticker',
  'iM Sticker',
  'ร้านค้าหลักสำหรับเริ่มทดสอบระบบสะสมแต้มจริง',
  '',
  'Sticker & Digital Goods',
  10,
  true,
  'approved',
  '',
  now(),
  now()
);

insert into customers (
  id, name, phone, line_name, line_id, avatar, current_points, lifetime_points, tier, created_at, updated_at
) values (
  'cust_pilot_001',
  'ลูกค้าทดสอบ',
  '',
  'LINE Customer',
  'U_pilot_customer_placeholder',
  '',
  0,
  0,
  'Silver',
  now(),
  now()
);

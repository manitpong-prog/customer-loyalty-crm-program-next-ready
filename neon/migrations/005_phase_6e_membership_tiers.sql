-- Phase 6E: Membership Tiers แบบ Database จริง
-- เพิ่มระดับสมาชิกต่อร้านและขยายค่า tier ของลูกค้าเป็น Member/Silver/Gold/Platinum/VIP

alter table customers alter column tier set default 'Member';

alter table customers drop constraint if exists customers_tier_check;

alter table customers
  add constraint customers_tier_check
  check (tier in ('Member', 'Silver', 'Gold', 'Platinum', 'VIP'));

create table if not exists membership_tiers (
  id text primary key,
  shop_id text not null references shops(id) on delete cascade,
  name text not null check (name in ('Member', 'Silver', 'Gold', 'Platinum', 'VIP')),
  min_lifetime_points integer not null default 0 check (min_lifetime_points >= 0),
  benefit_text text not null default '',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint membership_tiers_shop_name_unique unique (shop_id, name)
);

create index if not exists idx_membership_tiers_shop_id on membership_tiers(shop_id);

-- Seed ค่าเริ่มต้นให้ร้านที่มีอยู่ทั้งหมด โดยไม่ทับค่าที่มีอยู่แล้ว
insert into membership_tiers (id, shop_id, name, min_lifetime_points, benefit_text, is_active, sort_order)
select 'tier_' || id || '_member', id, 'Member', 0, 'สมาชิกทั่วไป', true, 1
from shops
on conflict (shop_id, name) do nothing;

insert into membership_tiers (id, shop_id, name, min_lifetime_points, benefit_text, is_active, sort_order)
select 'tier_' || id || '_silver', id, 'Silver', 500, 'เห็น badge Silver', true, 2
from shops
on conflict (shop_id, name) do nothing;

insert into membership_tiers (id, shop_id, name, min_lifetime_points, benefit_text, is_active, sort_order)
select 'tier_' || id || '_gold', id, 'Gold', 1500, 'ได้สิทธิ์โปรโมชันพิเศษ', true, 3
from shops
on conflict (shop_id, name) do nothing;

insert into membership_tiers (id, shop_id, name, min_lifetime_points, benefit_text, is_active, sort_order)
select 'tier_' || id || '_platinum', id, 'Platinum', 3000, 'badge พรีเมี่ยม + สิทธิ์ VIP', true, 4
from shops
on conflict (shop_id, name) do nothing;

insert into membership_tiers (id, shop_id, name, min_lifetime_points, benefit_text, is_active, sort_order)
select 'tier_' || id || '_vip', id, 'VIP', 5000, 'สิทธิ์สูงสุด', true, 5
from shops
on conflict (shop_id, name) do nothing;

-- ปรับระดับลูกค้าเดิมตามเกณฑ์เริ่มต้น เพื่อให้ลูกค้าแต้ม 0 กลับมาเป็น Member
update customers
set tier = case
  when lifetime_points >= 5000 then 'VIP'
  when lifetime_points >= 3000 then 'Platinum'
  when lifetime_points >= 1500 then 'Gold'
  when lifetime_points >= 500 then 'Silver'
  else 'Member'
end;

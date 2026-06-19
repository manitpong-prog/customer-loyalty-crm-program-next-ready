-- Neon / PostgreSQL schema for Customer Loyalty CRM Program
-- Phase 1: schema aligned with the current prototype data model.
-- IDs are text because the original mock-up already uses stable string IDs such as koffee_craft and cust_line_user.

create table if not exists shops (
  id text primary key,
  name text not null,
  description text not null default '',
  logo text not null default '',
  logo_url text,
  logo_storage_key text,
  category text not null default 'General',
  points_rate integer not null default 10 check (points_rate > 0),
  point_rounding_mode text not null default 'floor' check (point_rounding_mode in ('floor', 'nearest')),
  minimum_purchase_for_points integer not null default 1 check (minimum_purchase_for_points >= 0),
  point_link_expiry_days integer not null default 7 check (point_link_expiry_days > 0),
  point_expiry_days integer not null default 365 check (point_expiry_days > 0),
  point_expiry_reminder_days integer not null default 30 check (point_expiry_reminder_days >= 0),
  is_active boolean not null default false,
  registration_status text not null default 'pending' check (registration_status in ('pending', 'approved', 'rejected')),
  phone text not null default '',
  welcome_message text not null default '',
  contact_text text not null default '',
  share_message_template text not null default '',
  rich_menu_contact_url text not null default '',
  created_at timestamptz not null default now(),
  shop_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists customers (
  id text primary key,
  name text not null,
  phone text not null default '',
  line_name text not null default '',
  line_id text not null default '',
  avatar text not null default '',
  current_points integer not null default 0 check (current_points >= 0),
  lifetime_points integer not null default 0 check (lifetime_points >= 0),
  tier text not null default 'Member' check (tier in ('Member', 'Silver', 'Gold', 'Platinum', 'VIP')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rewards (
  id text primary key,
  name text not null,
  image text not null default '',
  image_url text,
  image_storage_key text,
  description text not null default '',
  points_cost integer not null default 1 check (points_cost > 0),
  stock integer not null default 0 check (stock >= 0),
  is_available boolean not null default true,
  shop_id text not null references shops(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists promo_banners (
  id text primary key,
  title text not null,
  image text not null default '',
  image_url text,
  image_storage_key text,
  description text not null default '',
  is_ad boolean not null default false,
  shop_id text references shops(id) on delete cascade,
  url text,
  expiration_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists transactions (
  id text primary key,
  user_id text not null references customers(id) on delete cascade,
  user_name text not null,
  user_phone text not null default '',
  shop_id text not null references shops(id) on delete cascade,
  shop_name text not null,
  type text not null check (type in ('earn', 'redeem')),
  points integer not null check (points > 0),
  description text not null default '',
  status text not null default 'completed' check (status in ('completed', 'pending', 'rejected')),
  reward_id text references rewards(id) on delete set null,
  points_expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists point_coupons (
  code text primary key,
  points integer not null check (points > 0),
  shop_id text not null references shops(id) on delete cascade,
  shop_name text not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  is_used boolean not null default false,
  used_by_customer_id text references customers(id) on delete set null,
  used_at timestamptz
);


create table if not exists line_users (
  line_user_id text primary key,
  display_name text not null default '',
  picture_url text not null default '',
  email text not null default '',
  last_login_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists merchant_line_users (
  shop_id text not null references shops(id) on delete cascade,
  line_user_id text not null references line_users(line_user_id) on delete cascade,
  role text not null default 'owner' check (role in ('owner')),
  created_at timestamptz not null default now(),
  primary key (shop_id, line_user_id)
);


create table if not exists shop_onboarding_checklists (
  id text primary key,
  shop_id text not null references shops(id) on delete cascade,
  rich_menu_configured boolean not null default false,
  tested_in_line_browser boolean not null default false,
  tested_customer_claim boolean not null default false,
  tested_reward_redeem boolean not null default false,
  test_data_cleaned boolean not null default false,
  reviewed_customer_messages boolean not null default false,
  ready_for_pilot boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shop_onboarding_checklists_shop_unique unique (shop_id)
);


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

create index if not exists idx_rewards_shop_id on rewards(shop_id);
create index if not exists idx_banners_shop_id on promo_banners(shop_id);
create index if not exists idx_transactions_user_id on transactions(user_id);
create index if not exists idx_transactions_shop_id on transactions(shop_id);
create index if not exists idx_transactions_points_expires_at on transactions(points_expires_at);
create index if not exists idx_point_coupons_shop_id on point_coupons(shop_id);
create index if not exists idx_customers_line_id on customers(line_id);
create index if not exists idx_merchant_line_users_line_user_id on merchant_line_users(line_user_id);
create index if not exists idx_shop_onboarding_checklists_shop_id on shop_onboarding_checklists(shop_id);
create index if not exists idx_membership_tiers_shop_id on membership_tiers(shop_id);

-- ล้างข้อมูลธุรกิจทั้งหมด แต่คงโครงสร้างตารางไว้
-- truncate table membership_tiers, shop_onboarding_checklists, merchant_line_users, line_users, point_coupons, transactions, promo_banners, rewards, customers, shops restart identity cascade;


-- Phase 6G: Real image storage fields. Legacy logo/image columns remain for backwards compatibility.
alter table shops add column if not exists logo_url text;
alter table shops add column if not exists logo_storage_key text;
alter table rewards add column if not exists image_url text;
alter table rewards add column if not exists image_storage_key text;
alter table promo_banners add column if not exists image_url text;
alter table promo_banners add column if not exists image_storage_key text;


-- Phase 7D: Online-only settings fields for customer-facing merchant text/link settings.
alter table shops add column if not exists welcome_message text not null default '';
alter table shops add column if not exists contact_text text not null default '';
alter table shops add column if not exists share_message_template text not null default '';
alter table shops add column if not exists rich_menu_contact_url text not null default '';

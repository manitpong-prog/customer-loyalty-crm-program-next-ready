-- Neon / PostgreSQL schema for Customer Loyalty CRM Program
-- Phase 1: schema aligned with the current prototype data model.
-- IDs are text because the original mock-up already uses stable string IDs such as koffee_craft and cust_line_user.

create table if not exists shops (
  id text primary key,
  name text not null,
  description text not null default '',
  logo text not null default '',
  category text not null default 'General',
  points_rate integer not null default 10 check (points_rate > 0),
  is_active boolean not null default false,
  registration_status text not null default 'pending' check (registration_status in ('pending', 'approved', 'rejected')),
  phone text not null default '',
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
  tier text not null default 'Silver' check (tier in ('Silver', 'Gold', 'Platinum')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rewards (
  id text primary key,
  name text not null,
  image text not null default '',
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

create index if not exists idx_rewards_shop_id on rewards(shop_id);
create index if not exists idx_banners_shop_id on promo_banners(shop_id);
create index if not exists idx_transactions_user_id on transactions(user_id);
create index if not exists idx_transactions_shop_id on transactions(shop_id);
create index if not exists idx_point_coupons_shop_id on point_coupons(shop_id);
create index if not exists idx_customers_line_id on customers(line_id);
create index if not exists idx_merchant_line_users_line_user_id on merchant_line_users(line_user_id);

-- ล้างข้อมูลธุรกิจทั้งหมด แต่คงโครงสร้างตารางไว้
-- truncate table merchant_line_users, line_users, point_coupons, transactions, promo_banners, rewards, customers, shops restart identity cascade;

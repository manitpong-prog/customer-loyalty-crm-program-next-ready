-- Neon / PostgreSQL schema for Customer Loyalty CRM Program
-- Run this in Neon SQL Editor before wiring the Next.js API/server actions.

create extension if not exists pgcrypto;

create type shop_registration_status as enum ('pending', 'approved', 'rejected');
create type tier_type as enum ('Silver', 'Gold', 'Platinum');
create type transaction_type as enum ('earn', 'redeem');
create type transaction_status as enum ('completed', 'pending', 'rejected');

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  logo_url text,
  category text not null default 'General',
  points_rate integer not null default 10 check (points_rate > 0),
  is_active boolean not null default false,
  registration_status shop_registration_status not null default 'pending',
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  line_user_id text unique,
  name text not null,
  phone text,
  line_name text,
  avatar_url text,
  current_points integer not null default 0 check (current_points >= 0),
  lifetime_points integer not null default 0 check (lifetime_points >= 0),
  tier tier_type not null default 'Silver',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rewards (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  image_url text,
  description text not null default '',
  points_cost integer not null check (points_cost > 0),
  stock integer not null default 0 check (stock >= 0),
  is_available boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists promo_banners (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id) on delete cascade,
  title text not null,
  image_url text,
  description text not null default '',
  is_ad boolean not null default false,
  url text,
  expiration_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists point_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  shop_id uuid not null references shops(id) on delete cascade,
  points integer not null check (points > 0),
  description text not null default '',
  is_used boolean not null default false,
  used_by_customer_id uuid references customers(id) on delete set null,
  used_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  reward_id uuid references rewards(id) on delete set null,
  type transaction_type not null,
  points integer not null check (points > 0),
  description text not null default '',
  status transaction_status not null default 'completed',
  created_at timestamptz not null default now()
);

create index if not exists idx_rewards_shop_id on rewards(shop_id);
create index if not exists idx_banners_shop_id on promo_banners(shop_id);
create index if not exists idx_coupons_shop_id on point_coupons(shop_id);
create index if not exists idx_transactions_customer_id on transactions(customer_id);
create index if not exists idx_transactions_shop_id on transactions(shop_id);

-- Reset demo/business data only. Keep schema intact.
-- truncate table transactions, point_coupons, promo_banners, rewards, customers, shops restart identity cascade;

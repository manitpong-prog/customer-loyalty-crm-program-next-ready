import { neon } from '@neondatabase/serverless';
import type { Customer, PromoBanner, Reward, Shop, Transaction } from '../../types';
import {
  INITIAL_BANNERS,
  INITIAL_CUSTOMERS,
  INITIAL_REWARDS,
  INITIAL_SHOPS,
  INITIAL_TRANSACTIONS,
} from '../../data/mockData';
import {
  PILOT_BANNERS,
  PILOT_CUSTOMERS,
  PILOT_REWARDS,
  PILOT_SHOPS,
  PILOT_TRANSACTIONS,
} from '../../data/productionSeed';

export type CrmEntity = 'shops' | 'customers' | 'rewards' | 'banners' | 'transactions' | 'coupons';

export type GeneratedCoupon = {
  code: string;
  points: number;
  shopId: string;
  shopName: string;
  description: string;
  createdAt: string;
  expiresAt: string;
  isUsed: boolean;
  usedByCustomerId?: string | null;
  usedAt?: string | null;
};

export type CrmSnapshot = {
  shops: Shop[];
  customers: Customer[];
  rewards: Reward[];
  banners: PromoBanner[];
  transactions: Transaction[];
  coupons: GeneratedCoupon[];
};

const connectionString = process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || '';
const sql = connectionString ? neon(connectionString) : null;

export function isDatabaseConfigured() {
  return Boolean(connectionString && sql);
}

function requireSql() {
  if (!sql) {
    throw new Error('DATABASE_URL is not configured. Add DATABASE_URL in .env.local or Vercel Environment Variables.');
  }
  return sql;
}

export const initialSnapshot: CrmSnapshot = {
  shops: INITIAL_SHOPS,
  customers: INITIAL_CUSTOMERS,
  rewards: INITIAL_REWARDS,
  banners: INITIAL_BANNERS,
  transactions: INITIAL_TRANSACTIONS,
  coupons: [],
};

export async function ensureCrmSchema() {
  const sql = requireSql();

  await sql`create table if not exists shops (
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
    updated_at timestamptz not null default now()
  )`;

  await sql`create table if not exists customers (
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
    shop_ids jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now()
  )`;

  await sql`alter table customers add column if not exists shop_ids jsonb not null default '[]'::jsonb`;

  // Backfill the current pilot customer created in earlier phases so Phase 5A scoping works without resetting Neon.
  await sql`update customers set shop_ids = jsonb_build_array('im_sticker') where id = 'cust_pilot_001' and jsonb_array_length(shop_ids) = 0 and exists (select 1 from shops where id = 'im_sticker')`;

  await sql`create table if not exists rewards (
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
  )`;

  await sql`create table if not exists promo_banners (
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
  )`;

  await sql`create table if not exists transactions (
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
  )`;

  await sql`create table if not exists point_coupons (
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
  )`;

  await sql`create index if not exists idx_rewards_shop_id on rewards(shop_id)`;
  await sql`create index if not exists idx_banners_shop_id on promo_banners(shop_id)`;
  await sql`create index if not exists idx_transactions_user_id on transactions(user_id)`;
  await sql`create index if not exists idx_transactions_shop_id on transactions(shop_id)`;
  await sql`create index if not exists idx_point_coupons_shop_id on point_coupons(shop_id)`;
}

export type AutoSeedMode = 'pilot' | 'demo' | 'none';

export function getAutoSeedMode(): AutoSeedMode {
  const value = (process.env.CRM_AUTO_SEED || 'pilot').toLowerCase();
  if (value === 'demo' || value === 'none' || value === 'pilot') return value;
  return 'pilot';
}

export async function seedInitialDataIfEmpty() {
  const sql = requireSql();
  const result = await sql`select count(*)::int as count from shops`;
  const shopCount = Number(result[0]?.count || 0);

  if (shopCount > 0) {
    return { seeded: false, mode: getAutoSeedMode() };
  }

  const mode = getAutoSeedMode();

  if (mode === 'none') {
    return { seeded: false, mode };
  }

  if (mode === 'demo') {
    await syncShops(INITIAL_SHOPS);
    await syncCustomers(INITIAL_CUSTOMERS);
    await syncRewards(INITIAL_REWARDS);
    await syncBanners(INITIAL_BANNERS);
    await syncTransactions(INITIAL_TRANSACTIONS);
    return { seeded: true, mode };
  }

  await syncShops(PILOT_SHOPS);
  await syncCustomers(PILOT_CUSTOMERS);
  await syncRewards(PILOT_REWARDS);
  await syncBanners(PILOT_BANNERS);
  await syncTransactions(PILOT_TRANSACTIONS);
  return { seeded: true, mode };
}

export async function getCrmSnapshot(): Promise<CrmSnapshot> {
  const sql = requireSql();

  const [shops, customers, rewards, banners, transactions, coupons] = await Promise.all([
    sql`select id, name, description, logo, category, points_rate as "pointsRate", is_active as "isActive", registration_status as "registrationStatus", phone, created_at as "createdAt" from shops order by created_at asc`,
    sql`select id, name, phone, line_name as "lineName", line_id as "lineId", avatar, current_points as "currentPoints", lifetime_points as "lifetimePoints", tier, created_at as "createdAt", shop_ids as "shopIds" from customers order by created_at asc`,
    sql`select id, name, image, description, points_cost as "pointsCost", stock, is_available as "isAvailable", shop_id as "shopId" from rewards order by created_at asc`,
    sql`select id, title, image, description, is_ad as "isAd", shop_id as "shopId", url, expiration_date as "expirationDate" from promo_banners order by created_at asc`,
    sql`select id, user_id as "userId", user_name as "userName", user_phone as "userPhone", shop_id as "shopId", shop_name as "shopName", type, points, description, status, reward_id as "rewardId", created_at as "createdAt" from transactions order by created_at desc`,
    sql`select code, points, shop_id as "shopId", shop_name as "shopName", description, created_at as "createdAt", expires_at as "expiresAt", is_used as "isUsed", used_by_customer_id as "usedByCustomerId", used_at as "usedAt" from point_coupons order by created_at desc`,
  ]);

  return {
    shops: shops as unknown as Shop[],
    customers: customers as unknown as Customer[],
    rewards: rewards as unknown as Reward[],
    banners: banners as unknown as PromoBanner[],
    transactions: transactions as unknown as Transaction[],
    coupons: coupons as unknown as GeneratedCoupon[],
  };
}

export async function syncEntity(entity: CrmEntity, rows: unknown[]) {
  await ensureCrmSchema();

  if (entity === 'shops') return syncShops(rows as Shop[]);
  if (entity === 'customers') return syncCustomers(rows as Customer[]);
  if (entity === 'rewards') return syncRewards(rows as Reward[]);
  if (entity === 'banners') return syncBanners(rows as PromoBanner[]);
  if (entity === 'transactions') return syncTransactions(rows as Transaction[]);
  if (entity === 'coupons') return syncCoupons(rows as GeneratedCoupon[]);

  throw new Error(`Unsupported CRM entity: ${entity}`);
}

async function syncShops(rows: Shop[]) {
  const sql = requireSql();
  const payload = JSON.stringify(rows);

  await sql`delete from shops where id not in (select id from jsonb_to_recordset(${payload}::jsonb) as x(id text))`;
  if (!rows.length) return;

  await sql`
    insert into shops (id, name, description, logo, category, points_rate, is_active, registration_status, phone, created_at, updated_at)
    select id, name, coalesce(description, ''), coalesce(logo, ''), coalesce(category, 'General'), coalesce("pointsRate", 10), coalesce("isActive", false), coalesce("registrationStatus", 'pending'), coalesce(phone, ''), coalesce("createdAt"::timestamptz, now()), now()
    from jsonb_to_recordset(${payload}::jsonb) as x(id text, name text, description text, logo text, category text, "pointsRate" integer, "isActive" boolean, "registrationStatus" text, phone text, "createdAt" text)
    on conflict (id) do update set
      name = excluded.name,
      description = excluded.description,
      logo = excluded.logo,
      category = excluded.category,
      points_rate = excluded.points_rate,
      is_active = excluded.is_active,
      registration_status = excluded.registration_status,
      phone = excluded.phone,
      updated_at = now()
  `;
}

async function syncCustomers(rows: Customer[]) {
  const sql = requireSql();
  const payload = JSON.stringify(rows);

  await sql`delete from customers where id not in (select id from jsonb_to_recordset(${payload}::jsonb) as x(id text))`;
  if (!rows.length) return;

  await sql`
    insert into customers (id, name, phone, line_name, line_id, avatar, current_points, lifetime_points, tier, created_at, shop_ids, updated_at)
    select id, name, coalesce(phone, ''), coalesce("lineName", ''), coalesce("lineId", ''), coalesce(avatar, ''), coalesce("currentPoints", 0), coalesce("lifetimePoints", 0), coalesce(tier, 'Silver'), coalesce("createdAt"::timestamptz, now()), coalesce("shopIds", '[]'::jsonb), now()
    from jsonb_to_recordset(${payload}::jsonb) as x(id text, name text, phone text, "lineName" text, "lineId" text, avatar text, "currentPoints" integer, "lifetimePoints" integer, tier text, "createdAt" text, "shopIds" jsonb)
    on conflict (id) do update set
      name = excluded.name,
      phone = excluded.phone,
      line_name = excluded.line_name,
      line_id = excluded.line_id,
      avatar = excluded.avatar,
      current_points = excluded.current_points,
      lifetime_points = excluded.lifetime_points,
      tier = excluded.tier,
      shop_ids = excluded.shop_ids,
      updated_at = now()
  `;
}

async function syncRewards(rows: Reward[]) {
  const sql = requireSql();
  const payload = JSON.stringify(rows);

  await sql`delete from rewards where id not in (select id from jsonb_to_recordset(${payload}::jsonb) as x(id text))`;
  if (!rows.length) return;

  await sql`
    insert into rewards (id, name, image, description, points_cost, stock, is_available, shop_id, updated_at)
    select id, name, coalesce(image, ''), coalesce(description, ''), coalesce("pointsCost", 1), coalesce(stock, 0), coalesce("isAvailable", true), "shopId", now()
    from jsonb_to_recordset(${payload}::jsonb) as x(id text, name text, image text, description text, "pointsCost" integer, stock integer, "isAvailable" boolean, "shopId" text)
    on conflict (id) do update set
      name = excluded.name,
      image = excluded.image,
      description = excluded.description,
      points_cost = excluded.points_cost,
      stock = excluded.stock,
      is_available = excluded.is_available,
      shop_id = excluded.shop_id,
      updated_at = now()
  `;
}

async function syncBanners(rows: PromoBanner[]) {
  const sql = requireSql();
  const payload = JSON.stringify(rows);

  await sql`delete from promo_banners where id not in (select id from jsonb_to_recordset(${payload}::jsonb) as x(id text))`;
  if (!rows.length) return;

  await sql`
    insert into promo_banners (id, title, image, description, is_ad, shop_id, url, expiration_date, updated_at)
    select id, title, coalesce(image, ''), coalesce(description, ''), coalesce("isAd", false), nullif("shopId", ''), url, "expirationDate"::date, now()
    from jsonb_to_recordset(${payload}::jsonb) as x(id text, title text, image text, description text, "isAd" boolean, "shopId" text, url text, "expirationDate" text)
    on conflict (id) do update set
      title = excluded.title,
      image = excluded.image,
      description = excluded.description,
      is_ad = excluded.is_ad,
      shop_id = excluded.shop_id,
      url = excluded.url,
      expiration_date = excluded.expiration_date,
      updated_at = now()
  `;
}

async function syncTransactions(rows: Transaction[]) {
  const sql = requireSql();
  const payload = JSON.stringify(rows);

  await sql`delete from transactions where id not in (select id from jsonb_to_recordset(${payload}::jsonb) as x(id text))`;
  if (!rows.length) return;

  await sql`
    insert into transactions (id, user_id, user_name, user_phone, shop_id, shop_name, type, points, description, status, reward_id, created_at)
    select id, "userId", coalesce("userName", ''), coalesce("userPhone", ''), "shopId", coalesce("shopName", ''), type, points, coalesce(description, ''), coalesce(status, 'completed'), nullif("rewardId", ''), coalesce("createdAt"::timestamptz, now())
    from jsonb_to_recordset(${payload}::jsonb) as x(id text, "userId" text, "userName" text, "userPhone" text, "shopId" text, "shopName" text, type text, points integer, description text, status text, "rewardId" text, "createdAt" text)
    on conflict (id) do update set
      user_id = excluded.user_id,
      user_name = excluded.user_name,
      user_phone = excluded.user_phone,
      shop_id = excluded.shop_id,
      shop_name = excluded.shop_name,
      type = excluded.type,
      points = excluded.points,
      description = excluded.description,
      status = excluded.status,
      reward_id = excluded.reward_id,
      created_at = excluded.created_at
  `;
}

async function syncCoupons(rows: GeneratedCoupon[]) {
  const sql = requireSql();
  const payload = JSON.stringify(rows);

  await sql`delete from point_coupons where code not in (select code from jsonb_to_recordset(${payload}::jsonb) as x(code text))`;
  if (!rows.length) return;

  await sql`
    insert into point_coupons (code, points, shop_id, shop_name, description, created_at, expires_at, is_used, used_by_customer_id, used_at)
    select code, points, "shopId", coalesce("shopName", ''), coalesce(description, ''), coalesce("createdAt"::timestamptz, now()), "expiresAt"::timestamptz, coalesce("isUsed", false), nullif("usedByCustomerId", ''), nullif("usedAt", '')::timestamptz
    from jsonb_to_recordset(${payload}::jsonb) as x(code text, points integer, "shopId" text, "shopName" text, description text, "createdAt" text, "expiresAt" text, "isUsed" boolean, "usedByCustomerId" text, "usedAt" text)
    on conflict (code) do update set
      points = excluded.points,
      shop_id = excluded.shop_id,
      shop_name = excluded.shop_name,
      description = excluded.description,
      expires_at = excluded.expires_at,
      is_used = excluded.is_used,
      used_by_customer_id = excluded.used_by_customer_id,
      used_at = excluded.used_at
  `;
}

export async function clearCrmData() {
  const sql = requireSql();
  await ensureCrmSchema();
  await sql`truncate table point_coupons, transactions, promo_banners, rewards, customers, shops restart identity cascade`;
}

export async function reseedDemoData() {
  await clearCrmData();
  await syncShops(INITIAL_SHOPS);
  await syncCustomers(INITIAL_CUSTOMERS);
  await syncRewards(INITIAL_REWARDS);
  await syncBanners(INITIAL_BANNERS);
  await syncTransactions(INITIAL_TRANSACTIONS);
}

export async function seedPilotData() {
  await clearCrmData();
  await syncShops(PILOT_SHOPS);
  await syncCustomers(PILOT_CUSTOMERS);
  await syncRewards(PILOT_REWARDS);
  await syncBanners(PILOT_BANNERS);
  await syncTransactions(PILOT_TRANSACTIONS);
}

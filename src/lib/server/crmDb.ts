import { neon } from "@neondatabase/serverless";
import type {
  AuditLog,
  Customer,
  PromoBanner,
  Reward,
  Shop,
  ShopOnboardingChecklist,
  Transaction,
  MembershipTier,
} from "../../types";
import {
  INITIAL_BANNERS,
  INITIAL_CUSTOMERS,
  INITIAL_REWARDS,
  INITIAL_SHOPS,
  INITIAL_TRANSACTIONS,
} from "../../data/mockData";
import {
  PILOT_BANNERS,
  PILOT_CUSTOMERS,
  PILOT_REWARDS,
  PILOT_SHOPS,
  PILOT_TRANSACTIONS,
} from "../../data/productionSeed";
import { getDefaultMembershipTiersForShops } from "../membershipTiers";

export type CrmEntity =
  | "shops"
  | "customers"
  | "rewards"
  | "banners"
  | "transactions"
  | "coupons"
  | "auditLogs"
  | "onboardingChecklists"
  | "membershipTiers";

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

export type LineUserRecord = {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  email?: string;
};

export type StoredLineUser = {
  lineUserId: string;
  displayName: string;
  pictureUrl: string;
  email: string;
};

export type CrmSnapshot = {
  shops: Shop[];
  customers: Customer[];
  rewards: Reward[];
  banners: PromoBanner[];
  transactions: Transaction[];
  coupons: GeneratedCoupon[];
  auditLogs: AuditLog[];
  onboardingChecklists: ShopOnboardingChecklist[];
  membershipTiers: MembershipTier[];
};

const connectionString =
  process.env.DATABASE_URL || process.env.DATABASE_URL_UNPOOLED || "";
const sql = connectionString ? neon(connectionString) : null;

export function isDatabaseConfigured() {
  return Boolean(connectionString && sql);
}

function requireSql() {
  if (!sql) {
    throw new Error(
      "DATABASE_URL is not configured. Add DATABASE_URL in .env.local or Vercel Environment Variables.",
    );
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
  auditLogs: [],
  onboardingChecklists: [],
  membershipTiers: getDefaultMembershipTiersForShops(
    INITIAL_SHOPS.map((shop) => shop.id),
  ),
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
    point_rounding_mode text not null default 'floor' check (point_rounding_mode in ('floor', 'nearest')),
    minimum_purchase_for_points integer not null default 1 check (minimum_purchase_for_points >= 0),
    point_link_expiry_days integer not null default 7 check (point_link_expiry_days > 0),
    point_expiry_days integer not null default 365 check (point_expiry_days > 0),
    point_expiry_reminder_days integer not null default 30 check (point_expiry_reminder_days >= 0),
    is_active boolean not null default false,
    registration_status text not null default 'pending' check (registration_status in ('pending', 'approved', 'rejected')),
    phone text not null default '',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;

  await sql`alter table shops add column if not exists point_rounding_mode text not null default 'floor'`;
  await sql`alter table shops add column if not exists minimum_purchase_for_points integer not null default 1`;
  await sql`alter table shops add column if not exists point_link_expiry_days integer not null default 7`;
  await sql`alter table shops add column if not exists point_expiry_days integer not null default 365`;
  await sql`alter table shops add column if not exists point_expiry_reminder_days integer not null default 30`;
  await sql`
    do $$
    begin
      if not exists (
        select 1 from pg_constraint where conname = 'shops_point_rounding_mode_check'
      ) then
        alter table shops add constraint shops_point_rounding_mode_check check (point_rounding_mode in ('floor', 'nearest'));
      end if;
    end
    $$
  `;
  await sql`
    do $$
    begin
      if not exists (select 1 from pg_constraint where conname = 'shops_minimum_purchase_for_points_check') then
        alter table shops add constraint shops_minimum_purchase_for_points_check check (minimum_purchase_for_points >= 0);
      end if;
      if not exists (select 1 from pg_constraint where conname = 'shops_point_link_expiry_days_check') then
        alter table shops add constraint shops_point_link_expiry_days_check check (point_link_expiry_days > 0);
      end if;
      if not exists (select 1 from pg_constraint where conname = 'shops_point_expiry_days_check') then
        alter table shops add constraint shops_point_expiry_days_check check (point_expiry_days > 0);
      end if;
      if not exists (select 1 from pg_constraint where conname = 'shops_point_expiry_reminder_days_check') then
        alter table shops add constraint shops_point_expiry_reminder_days_check check (point_expiry_reminder_days >= 0);
      end if;
    end
    $$
  `;

  await sql`create table if not exists customers (
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
    shop_ids jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now()
  )`;

  await sql`alter table customers add column if not exists shop_ids jsonb not null default '[]'::jsonb`;
  await sql`alter table customers alter column tier set default 'Member'`;
  await sql`
    do $$
    begin
      if exists (select 1 from pg_constraint where conname = 'customers_tier_check') then
        alter table customers drop constraint customers_tier_check;
      end if;
      alter table customers add constraint customers_tier_check check (tier in ('Member', 'Silver', 'Gold', 'Platinum', 'VIP'));
    exception when duplicate_object then
      null;
    end
    $$
  `;
  await sql`
    update customers set tier = case
      when lifetime_points >= 5000 then 'VIP'
      when lifetime_points >= 3000 then 'Platinum'
      when lifetime_points >= 1500 then 'Gold'
      when lifetime_points >= 500 then 'Silver'
      else 'Member'
    end
  `;

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
    points_expires_at timestamptz,
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

  await sql`create table if not exists audit_logs (
    id text primary key,
    shop_id text not null references shops(id) on delete cascade,
    shop_name text not null default '',
    actor_type text not null default 'system' check (actor_type in ('owner', 'customer', 'system')),
    actor_name text not null default '',
    actor_id text,
    action text not null default '',
    action_label text not null default '',
    description text not null default '',
    target_type text,
    target_id text,
    customer_id text,
    customer_name text,
    points integer,
    status text not null default 'info' check (status in ('info', 'success', 'warning', 'danger')),
    metadata jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
  )`;

  await sql`create table if not exists line_users (
    line_user_id text primary key,
    display_name text not null default '',
    picture_url text not null default '',
    email text not null default '',
    last_login_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )`;

  await sql`create table if not exists merchant_line_users (
    shop_id text not null references shops(id) on delete cascade,
    line_user_id text not null references line_users(line_user_id) on delete cascade,
    role text not null default 'owner' check (role in ('owner')),
    created_at timestamptz not null default now(),
    primary key (shop_id, line_user_id)
  )`;

  await sql`create table if not exists shop_onboarding_checklists (
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
  )`;

  await sql`create table if not exists membership_tiers (
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
  )`;

  await sql`create index if not exists idx_rewards_shop_id on rewards(shop_id)`;
  await sql`create index if not exists idx_banners_shop_id on promo_banners(shop_id)`;
  await sql`create index if not exists idx_transactions_user_id on transactions(user_id)`;
  await sql`alter table transactions add column if not exists points_expires_at timestamptz`;
  await sql`create index if not exists idx_transactions_shop_id on transactions(shop_id)`;
  await sql`create index if not exists idx_transactions_points_expires_at on transactions(points_expires_at)`;
  await sql`create index if not exists idx_point_coupons_shop_id on point_coupons(shop_id)`;
  await sql`create index if not exists idx_audit_logs_shop_id on audit_logs(shop_id)`;
  await sql`create index if not exists idx_audit_logs_created_at on audit_logs(created_at desc)`;
  await sql`create index if not exists idx_customers_line_id on customers(line_id)`;
  await sql`create index if not exists idx_merchant_line_users_line_user_id on merchant_line_users(line_user_id)`;
  await sql`create index if not exists idx_shop_onboarding_checklists_shop_id on shop_onboarding_checklists(shop_id)`;
  await sql`create index if not exists idx_membership_tiers_shop_id on membership_tiers(shop_id)`;
}

export type AutoSeedMode = "pilot" | "demo" | "none";

export function getAutoSeedMode(): AutoSeedMode {
  const value = (process.env.CRM_AUTO_SEED || "pilot").toLowerCase();
  if (value === "demo" || value === "none" || value === "pilot") return value;
  return "pilot";
}

export async function seedInitialDataIfEmpty() {
  const sql = requireSql();
  const result = await sql`select count(*)::int as count from shops`;
  const shopCount = Number(result[0]?.count || 0);

  if (shopCount > 0) {
    return { seeded: false, mode: getAutoSeedMode() };
  }

  const mode = getAutoSeedMode();

  if (mode === "none") {
    return { seeded: false, mode };
  }

  if (mode === "demo") {
    await syncShops(INITIAL_SHOPS);
    await syncCustomers(INITIAL_CUSTOMERS);
    await syncRewards(INITIAL_REWARDS);
    await syncBanners(INITIAL_BANNERS);
    await syncTransactions(INITIAL_TRANSACTIONS);
    await syncMembershipTiers(
      getDefaultMembershipTiersForShops(INITIAL_SHOPS.map((shop) => shop.id)),
    );
    return { seeded: true, mode };
  }

  await syncShops(PILOT_SHOPS);
  await syncCustomers(PILOT_CUSTOMERS);
  await syncRewards(PILOT_REWARDS);
  await syncBanners(PILOT_BANNERS);
  await syncTransactions(PILOT_TRANSACTIONS);
  await syncMembershipTiers(
    getDefaultMembershipTiersForShops(PILOT_SHOPS.map((shop) => shop.id)),
  );
  return { seeded: true, mode };
}

export async function getCrmSnapshot(): Promise<CrmSnapshot> {
  const sql = requireSql();

  const [
    shops,
    customers,
    rewards,
    banners,
    transactions,
    coupons,
    auditLogs,
    onboardingChecklists,
    membershipTiers,
  ] = await Promise.all([
    sql`select id, name, description, logo, category, points_rate as "pointsRate", point_rounding_mode as "pointRoundingMode", minimum_purchase_for_points as "minimumPurchaseForPoints", point_link_expiry_days as "pointLinkExpiryDays", point_expiry_days as "pointExpiryDays", point_expiry_reminder_days as "pointExpiryReminderDays", is_active as "isActive", registration_status as "registrationStatus", phone, created_at as "createdAt" from shops order by created_at asc`,
    sql`select id, name, phone, line_name as "lineName", line_id as "lineId", avatar, current_points as "currentPoints", lifetime_points as "lifetimePoints", tier, created_at as "createdAt", shop_ids as "shopIds" from customers order by created_at asc`,
    sql`select id, name, image, description, points_cost as "pointsCost", stock, is_available as "isAvailable", shop_id as "shopId" from rewards order by created_at asc`,
    sql`select id, title, image, description, is_ad as "isAd", shop_id as "shopId", url, expiration_date as "expirationDate" from promo_banners order by created_at asc`,
    sql`select id, user_id as "userId", user_name as "userName", user_phone as "userPhone", shop_id as "shopId", shop_name as "shopName", type, points, description, status, reward_id as "rewardId", points_expires_at as "pointsExpiresAt", created_at as "createdAt" from transactions order by created_at desc`,
    sql`select code, points, shop_id as "shopId", shop_name as "shopName", description, created_at as "createdAt", expires_at as "expiresAt", is_used as "isUsed", used_by_customer_id as "usedByCustomerId", used_at as "usedAt" from point_coupons order by created_at desc`,
    sql`select id, shop_id as "shopId", shop_name as "shopName", actor_type as "actorType", actor_name as "actorName", actor_id as "actorId", action, action_label as "actionLabel", description, target_type as "targetType", target_id as "targetId", customer_id as "customerId", customer_name as "customerName", points, status, metadata, created_at as "createdAt" from audit_logs order by created_at desc`,
    sql`select id, shop_id as "shopId", rich_menu_configured as "richMenuConfigured", tested_in_line_browser as "testedInLineBrowser", tested_customer_claim as "testedCustomerClaim", tested_reward_redeem as "testedRewardRedeem", test_data_cleaned as "testDataCleaned", reviewed_customer_messages as "reviewedCustomerMessages", ready_for_pilot as "readyForPilot", notes, created_at as "createdAt", updated_at as "updatedAt" from shop_onboarding_checklists order by created_at asc`,
    sql`select id, shop_id as "shopId", name, min_lifetime_points as "minLifetimePoints", benefit_text as "benefitText", is_active as "isActive", sort_order as "sortOrder", created_at as "createdAt", updated_at as "updatedAt" from membership_tiers order by shop_id asc, sort_order asc, min_lifetime_points asc`,
  ]);

  return {
    shops: shops as unknown as Shop[],
    customers: customers as unknown as Customer[],
    rewards: rewards as unknown as Reward[],
    banners: banners as unknown as PromoBanner[],
    transactions: transactions as unknown as Transaction[],
    coupons: coupons as unknown as GeneratedCoupon[],
    auditLogs: auditLogs as unknown as AuditLog[],
    onboardingChecklists:
      onboardingChecklists as unknown as ShopOnboardingChecklist[],
    membershipTiers: membershipTiers as unknown as MembershipTier[],
  };
}

export async function syncEntity(entity: CrmEntity, rows: unknown[]) {
  await ensureCrmSchema();

  if (entity === "shops") return syncShops(rows as Shop[]);
  if (entity === "customers") return syncCustomers(rows as Customer[]);
  if (entity === "rewards") return syncRewards(rows as Reward[]);
  if (entity === "banners") return syncBanners(rows as PromoBanner[]);
  if (entity === "transactions") return syncTransactions(rows as Transaction[]);
  if (entity === "coupons") return syncCoupons(rows as GeneratedCoupon[]);
  if (entity === "auditLogs") return syncAuditLogs(rows as AuditLog[]);
  if (entity === "onboardingChecklists")
    return syncOnboardingChecklists(rows as ShopOnboardingChecklist[]);
  if (entity === "membershipTiers")
    return syncMembershipTiers(rows as MembershipTier[]);

  throw new Error(`Unsupported CRM entity: ${entity}`);
}

async function syncShops(rows: Shop[]) {
  const sql = requireSql();
  const payload = JSON.stringify(rows);

  await sql`delete from shops where id not in (select id from jsonb_to_recordset(${payload}::jsonb) as x(id text))`;
  if (!rows.length) return;

  await sql`
    insert into shops (
      id, name, description, logo, category, points_rate,
      point_rounding_mode, minimum_purchase_for_points, point_link_expiry_days,
      point_expiry_days, point_expiry_reminder_days,
      is_active, registration_status, phone, created_at, updated_at
    )
    select
      id,
      name,
      coalesce(description, ''),
      coalesce(logo, ''),
      coalesce(category, 'General'),
      greatest(1, coalesce("pointsRate", 10)),
      case when "pointRoundingMode" = 'nearest' then 'nearest' else 'floor' end,
      greatest(0, coalesce("minimumPurchaseForPoints", 1)),
      greatest(1, coalesce("pointLinkExpiryDays", 7)),
      greatest(1, coalesce("pointExpiryDays", 365)),
      greatest(0, coalesce("pointExpiryReminderDays", 30)),
      coalesce("isActive", false),
      coalesce("registrationStatus", 'pending'),
      coalesce(phone, ''),
      coalesce("createdAt"::timestamptz, now()),
      now()
    from jsonb_to_recordset(${payload}::jsonb) as x(
      id text,
      name text,
      description text,
      logo text,
      category text,
      "pointsRate" integer,
      "pointRoundingMode" text,
      "minimumPurchaseForPoints" integer,
      "pointLinkExpiryDays" integer,
      "pointExpiryDays" integer,
      "pointExpiryReminderDays" integer,
      "isActive" boolean,
      "registrationStatus" text,
      phone text,
      "createdAt" text
    )
    on conflict (id) do update set
      name = excluded.name,
      description = excluded.description,
      logo = excluded.logo,
      category = excluded.category,
      points_rate = excluded.points_rate,
      point_rounding_mode = excluded.point_rounding_mode,
      minimum_purchase_for_points = excluded.minimum_purchase_for_points,
      point_link_expiry_days = excluded.point_link_expiry_days,
      point_expiry_days = excluded.point_expiry_days,
      point_expiry_reminder_days = excluded.point_expiry_reminder_days,
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
    select id, name, coalesce(phone, ''), coalesce("lineName", ''), coalesce("lineId", ''), coalesce(avatar, ''), coalesce("currentPoints", 0), coalesce("lifetimePoints", 0), case when tier in ('Member', 'Silver', 'Gold', 'Platinum', 'VIP') then tier else 'Member' end, coalesce("createdAt"::timestamptz, now()), coalesce("shopIds", '[]'::jsonb), now()
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

export async function upsertRewardRow(reward: Reward) {
  await ensureCrmSchema();
  const sql = requireSql();

  await sql`
    insert into rewards (id, name, image, description, points_cost, stock, is_available, shop_id, updated_at)
    values (
      ${reward.id},
      ${reward.name},
      ${reward.image || ""},
      ${reward.description || ""},
      ${Math.max(1, Number(reward.pointsCost) || 1)},
      ${Math.max(0, Number(reward.stock) || 0)},
      ${reward.isAvailable !== false},
      ${reward.shopId},
      now()
    )
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

export async function deleteRewardRow(rewardId: string, shopId: string) {
  await ensureCrmSchema();
  const sql = requireSql();
  await sql`delete from rewards where id = ${rewardId} and shop_id = ${shopId}`;
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
    insert into transactions (id, user_id, user_name, user_phone, shop_id, shop_name, type, points, description, status, reward_id, points_expires_at, created_at)
    select id, "userId", coalesce("userName", ''), coalesce("userPhone", ''), "shopId", coalesce("shopName", ''), type, points, coalesce(description, ''), coalesce(status, 'completed'), nullif("rewardId", ''), nullif("pointsExpiresAt", '')::timestamptz, coalesce("createdAt"::timestamptz, now())
    from jsonb_to_recordset(${payload}::jsonb) as x(id text, "userId" text, "userName" text, "userPhone" text, "shopId" text, "shopName" text, type text, points integer, description text, status text, "rewardId" text, "pointsExpiresAt" text, "createdAt" text)
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
      points_expires_at = excluded.points_expires_at,
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

async function syncAuditLogs(rows: AuditLog[]) {
  const sql = requireSql();
  const payload = JSON.stringify(rows);

  await sql`delete from audit_logs where id not in (select id from jsonb_to_recordset(${payload}::jsonb) as x(id text))`;
  if (!rows.length) return;

  await sql`
    insert into audit_logs (id, shop_id, shop_name, actor_type, actor_name, actor_id, action, action_label, description, target_type, target_id, customer_id, customer_name, points, status, metadata, created_at)
    select id, "shopId", coalesce("shopName", ''), coalesce("actorType", 'system'), coalesce("actorName", ''), nullif("actorId", ''), coalesce(action, ''), coalesce("actionLabel", ''), coalesce(description, ''), nullif("targetType", ''), nullif("targetId", ''), nullif("customerId", ''), nullif("customerName", ''), points, coalesce(status, 'info'), coalesce(metadata, '{}'::jsonb), coalesce("createdAt"::timestamptz, now())
    from jsonb_to_recordset(${payload}::jsonb) as x(id text, "shopId" text, "shopName" text, "actorType" text, "actorName" text, "actorId" text, action text, "actionLabel" text, description text, "targetType" text, "targetId" text, "customerId" text, "customerName" text, points integer, status text, metadata jsonb, "createdAt" text)
    on conflict (id) do update set
      shop_id = excluded.shop_id,
      shop_name = excluded.shop_name,
      actor_type = excluded.actor_type,
      actor_name = excluded.actor_name,
      actor_id = excluded.actor_id,
      action = excluded.action,
      action_label = excluded.action_label,
      description = excluded.description,
      target_type = excluded.target_type,
      target_id = excluded.target_id,
      customer_id = excluded.customer_id,
      customer_name = excluded.customer_name,
      points = excluded.points,
      status = excluded.status,
      metadata = excluded.metadata,
      created_at = excluded.created_at
  `;
}

async function syncOnboardingChecklists(rows: ShopOnboardingChecklist[]) {
  const sql = requireSql();
  const payload = JSON.stringify(rows);

  await sql`delete from shop_onboarding_checklists where id not in (select id from jsonb_to_recordset(${payload}::jsonb) as x(id text))`;
  if (!rows.length) return;

  await sql`
    insert into shop_onboarding_checklists (
      id,
      shop_id,
      rich_menu_configured,
      tested_in_line_browser,
      tested_customer_claim,
      tested_reward_redeem,
      test_data_cleaned,
      reviewed_customer_messages,
      ready_for_pilot,
      notes,
      created_at,
      updated_at
    )
    select
      id,
      "shopId",
      coalesce("richMenuConfigured", false),
      coalesce("testedInLineBrowser", false),
      coalesce("testedCustomerClaim", false),
      coalesce("testedRewardRedeem", false),
      coalesce("testDataCleaned", false),
      coalesce("reviewedCustomerMessages", false),
      coalesce("readyForPilot", false),
      coalesce(notes, ''),
      coalesce("createdAt"::timestamptz, now()),
      now()
    from jsonb_to_recordset(${payload}::jsonb) as x(
      id text,
      "shopId" text,
      "richMenuConfigured" boolean,
      "testedInLineBrowser" boolean,
      "testedCustomerClaim" boolean,
      "testedRewardRedeem" boolean,
      "testDataCleaned" boolean,
      "reviewedCustomerMessages" boolean,
      "readyForPilot" boolean,
      notes text,
      "createdAt" text,
      "updatedAt" text
    )
    on conflict (shop_id) do update set
      rich_menu_configured = excluded.rich_menu_configured,
      tested_in_line_browser = excluded.tested_in_line_browser,
      tested_customer_claim = excluded.tested_customer_claim,
      tested_reward_redeem = excluded.tested_reward_redeem,
      test_data_cleaned = excluded.test_data_cleaned,
      reviewed_customer_messages = excluded.reviewed_customer_messages,
      ready_for_pilot = excluded.ready_for_pilot,
      notes = excluded.notes,
      updated_at = now()
  `;
}

async function syncMembershipTiers(rows: MembershipTier[]) {
  const sql = requireSql();
  const payload = JSON.stringify(rows);

  await sql`delete from membership_tiers where id not in (select id from jsonb_to_recordset(${payload}::jsonb) as x(id text))`;
  if (!rows.length) return;

  await sql`
    insert into membership_tiers (
      id,
      shop_id,
      name,
      min_lifetime_points,
      benefit_text,
      is_active,
      sort_order,
      created_at,
      updated_at
    )
    select
      id,
      "shopId",
      case when name in ('Member', 'Silver', 'Gold', 'Platinum', 'VIP') then name else 'Member' end,
      greatest(0, coalesce("minLifetimePoints", 0)),
      coalesce("benefitText", ''),
      coalesce("isActive", true),
      coalesce("sortOrder", 0),
      coalesce("createdAt"::timestamptz, now()),
      now()
    from jsonb_to_recordset(${payload}::jsonb) as x(
      id text,
      "shopId" text,
      name text,
      "minLifetimePoints" integer,
      "benefitText" text,
      "isActive" boolean,
      "sortOrder" integer,
      "createdAt" text,
      "updatedAt" text
    )
    on conflict (shop_id, name) do update set
      min_lifetime_points = excluded.min_lifetime_points,
      benefit_text = excluded.benefit_text,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order,
      updated_at = now()
  `;
}

export async function upsertLineUser(lineUser: LineUserRecord) {
  const sql = requireSql();

  await sql`
    insert into line_users (line_user_id, display_name, picture_url, email, last_login_at, updated_at)
    values (${lineUser.lineUserId}, ${lineUser.displayName || ""}, ${lineUser.pictureUrl || ""}, ${lineUser.email || ""}, now(), now())
    on conflict (line_user_id) do update set
      display_name = excluded.display_name,
      picture_url = excluded.picture_url,
      email = coalesce(nullif(excluded.email, ''), line_users.email),
      last_login_at = now(),
      updated_at = now()
  `;
}

export async function getLineUser(
  lineUserId: string,
): Promise<StoredLineUser | null> {
  const sql = requireSql();

  const rows = await sql`
    select
      line_user_id as "lineUserId",
      display_name as "displayName",
      picture_url as "pictureUrl",
      email
    from line_users
    where line_user_id = ${lineUserId}
    limit 1
  `;

  return (rows[0] as StoredLineUser | undefined) || null;
}

export async function getOwnerShopIds(lineUserId: string): Promise<string[]> {
  const sql = requireSql();

  const rows = await sql`
    select shop_id as "shopId"
    from merchant_line_users
    where line_user_id = ${lineUserId} and role = 'owner'
    order by created_at asc
  `;

  return rows.map((row) => String((row as { shopId: string }).shopId));
}

export async function linkMerchantOwner(shopId: string, lineUserId: string) {
  const sql = requireSql();

  await sql`
    insert into merchant_line_users (shop_id, line_user_id, role)
    values (${shopId}, ${lineUserId}, 'owner')
    on conflict (shop_id, line_user_id) do update set role = 'owner'
  `;
}

export async function ensureCustomerMembershipForLineUser(params: {
  shopId: string;
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
}) {
  const sql = requireSql();
  const customerId = `line_${params.lineUserId}`;
  const shopIds = JSON.stringify([params.shopId]);

  await sql`
    insert into customers (
      id,
      name,
      phone,
      line_name,
      line_id,
      avatar,
      current_points,
      lifetime_points,
      tier,
      created_at,
      shop_ids,
      updated_at
    )
    values (
      ${customerId},
      ${params.displayName || "LINE User"},
      '',
      ${params.displayName || "LINE User"},
      ${params.lineUserId},
      ${params.pictureUrl || ""},
      0,
      0,
      'Member',
      now(),
      ${shopIds}::jsonb,
      now()
    )
    on conflict (id) do update set
      name = case when customers.name = '' or customers.name = 'LINE User' then excluded.name else customers.name end,
      line_name = excluded.line_name,
      line_id = excluded.line_id,
      avatar = excluded.avatar,
      shop_ids = coalesce(
        (
          select jsonb_agg(distinct value)
          from jsonb_array_elements_text(customers.shop_ids || excluded.shop_ids) as merged(value)
        ),
        excluded.shop_ids
      ),
      updated_at = now()
  `;

  const rows = await sql`
    select id, name, phone, line_name as "lineName", line_id as "lineId", avatar, current_points as "currentPoints", lifetime_points as "lifetimePoints", tier, created_at as "createdAt", shop_ids as "shopIds"
    from customers
    where id = ${customerId}
    limit 1
  `;

  return rows[0] as unknown as Customer;
}

export async function clearCrmData() {
  const sql = requireSql();
  await ensureCrmSchema();
  await sql`truncate table membership_tiers, audit_logs, merchant_line_users, line_users, point_coupons, transactions, promo_banners, rewards, customers, shops restart identity cascade`;
}

export async function reseedDemoData() {
  await clearCrmData();
  await syncShops(INITIAL_SHOPS);
  await syncCustomers(INITIAL_CUSTOMERS);
  await syncRewards(INITIAL_REWARDS);
  await syncBanners(INITIAL_BANNERS);
  await syncTransactions(INITIAL_TRANSACTIONS);
  await syncMembershipTiers(
    getDefaultMembershipTiersForShops(INITIAL_SHOPS.map((shop) => shop.id)),
  );
}

export async function seedPilotData() {
  await clearCrmData();
  await syncShops(PILOT_SHOPS);
  await syncCustomers(PILOT_CUSTOMERS);
  await syncRewards(PILOT_REWARDS);
  await syncBanners(PILOT_BANNERS);
  await syncTransactions(PILOT_TRANSACTIONS);
  await syncMembershipTiers(
    getDefaultMembershipTiersForShops(PILOT_SHOPS.map((shop) => shop.id)),
  );
}

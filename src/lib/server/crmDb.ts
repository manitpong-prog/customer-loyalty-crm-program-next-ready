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
    updated_at timestamptz not null default now()
  )`;

  await sql`alter table shops add column if not exists logo_url text`;
  await sql`alter table shops add column if not exists logo_storage_key text`;
  await sql`alter table shops add column if not exists welcome_message text not null default ''`;
  await sql`alter table shops add column if not exists contact_text text not null default ''`;
  await sql`alter table shops add column if not exists share_message_template text not null default ''`;
  await sql`alter table shops add column if not exists rich_menu_contact_url text not null default ''`;
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
    image_url text,
    image_storage_key text,
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
    image_url text,
    image_storage_key text,
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

  await sql`alter table rewards add column if not exists image_url text`;
  await sql`alter table rewards add column if not exists image_storage_key text`;
  await sql`alter table promo_banners add column if not exists image_url text`;
  await sql`alter table promo_banners add column if not exists image_storage_key text`;

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
    sql`select id, name, description, logo, logo_url as "logoUrl", logo_storage_key as "logoStorageKey", category, points_rate as "pointsRate", point_rounding_mode as "pointRoundingMode", minimum_purchase_for_points as "minimumPurchaseForPoints", point_link_expiry_days as "pointLinkExpiryDays", point_expiry_days as "pointExpiryDays", point_expiry_reminder_days as "pointExpiryReminderDays", is_active as "isActive", registration_status as "registrationStatus", phone, welcome_message as "welcomeMessage", contact_text as "contactText", share_message_template as "shareMessageTemplate", rich_menu_contact_url as "richMenuContactUrl", created_at as "createdAt" from shops order by created_at asc`,
    sql`select id, name, phone, line_name as "lineName", line_id as "lineId", avatar, current_points as "currentPoints", lifetime_points as "lifetimePoints", tier, created_at as "createdAt", shop_ids as "shopIds" from customers order by created_at asc`,
    sql`select id, name, image, image_url as "imageUrl", image_storage_key as "imageStorageKey", description, points_cost as "pointsCost", stock, is_available as "isAvailable", shop_id as "shopId" from rewards order by created_at asc`,
    sql`select id, title, image, image_url as "imageUrl", image_storage_key as "imageStorageKey", description, is_ad as "isAd", shop_id as "shopId", url, expiration_date as "expirationDate" from promo_banners order by created_at asc`,
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



export async function getCustomerOnlineState(params: {
  shopId: string;
  customerId?: string;
  lineUserId?: string;
  couponCode?: string;
}): Promise<CrmSnapshot> {
  const sql = requireSql();
  const shopId = params.shopId.trim();
  const customerId = params.customerId?.trim() || '';
  const lineUserId = params.lineUserId?.trim() || '';
  const couponCode = params.couponCode?.trim().toUpperCase() || '';

  if (!shopId) {
    throw new Error('Missing shopId for customer state.');
  }

  const [shops, customers, rewards, banners, membershipTiers, coupons] = await Promise.all([
    sql`select id, name, description, logo, logo_url as "logoUrl", logo_storage_key as "logoStorageKey", category, points_rate as "pointsRate", point_rounding_mode as "pointRoundingMode", minimum_purchase_for_points as "minimumPurchaseForPoints", point_link_expiry_days as "pointLinkExpiryDays", point_expiry_days as "pointExpiryDays", point_expiry_reminder_days as "pointExpiryReminderDays", is_active as "isActive", registration_status as "registrationStatus", phone, welcome_message as "welcomeMessage", contact_text as "contactText", share_message_template as "shareMessageTemplate", rich_menu_contact_url as "richMenuContactUrl", created_at as "createdAt" from shops where id = ${shopId} limit 1`,
    sql`select id, name, phone, line_name as "lineName", line_id as "lineId", avatar, current_points as "currentPoints", lifetime_points as "lifetimePoints", tier, created_at as "createdAt", shop_ids as "shopIds" from customers where ((${customerId} <> '' and id = ${customerId}) or (${customerId} = '' and ${lineUserId} <> '' and line_id = ${lineUserId})) limit 1`,
    sql`select id, name, image, image_url as "imageUrl", image_storage_key as "imageStorageKey", description, points_cost as "pointsCost", stock, is_available as "isAvailable", shop_id as "shopId" from rewards where shop_id = ${shopId} order by created_at asc`,
    sql`select id, title, image, image_url as "imageUrl", image_storage_key as "imageStorageKey", description, is_ad as "isAd", shop_id as "shopId", url, expiration_date as "expirationDate" from promo_banners where (shop_id = ${shopId} or is_ad = true) order by created_at desc`,
    sql`select id, shop_id as "shopId", name, min_lifetime_points as "minLifetimePoints", benefit_text as "benefitText", is_active as "isActive", sort_order as "sortOrder", created_at as "createdAt", updated_at as "updatedAt" from membership_tiers where shop_id = ${shopId} order by sort_order asc, min_lifetime_points asc`,
    couponCode
      ? sql`select code, points, shop_id as "shopId", shop_name as "shopName", description, created_at as "createdAt", expires_at as "expiresAt", is_used as "isUsed", used_by_customer_id as "usedByCustomerId", used_at as "usedAt" from point_coupons where upper(code) = upper(${couponCode}) and shop_id = ${shopId} limit 1`
      : sql`select code, points, shop_id as "shopId", shop_name as "shopName", description, created_at as "createdAt", expires_at as "expiresAt", is_used as "isUsed", used_by_customer_id as "usedByCustomerId", used_at as "usedAt" from point_coupons where shop_id = ${shopId} and created_at >= now() - interval '30 days' order by created_at desc limit 100`,
  ]);

  const customer = customers[0] as Record<string, unknown> | undefined;
  const customerForTransactions = customer?.id ? String(customer.id) : customerId;
  const transactions = customerForTransactions
    ? await sql`select id, user_id as "userId", user_name as "userName", user_phone as "userPhone", shop_id as "shopId", shop_name as "shopName", type, points, description, status, reward_id as "rewardId", points_expires_at as "pointsExpiresAt", created_at as "createdAt" from transactions where shop_id = ${shopId} and user_id = ${customerForTransactions} order by created_at desc limit 100`
    : [];

  return {
    shops: shops as unknown as Shop[],
    customers: customers as unknown as Customer[],
    rewards: rewards as unknown as Reward[],
    banners: banners as unknown as PromoBanner[],
    transactions: transactions as unknown as Transaction[],
    coupons: coupons as unknown as GeneratedCoupon[],
    auditLogs: [],
    onboardingChecklists: [],
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
      id, name, description, logo, logo_url, logo_storage_key, category, points_rate,
      point_rounding_mode, minimum_purchase_for_points, point_link_expiry_days,
      point_expiry_days, point_expiry_reminder_days,
      is_active, registration_status, phone, welcome_message, contact_text, share_message_template, rich_menu_contact_url, created_at, updated_at
    )
    select
      id,
      name,
      coalesce(description, ''),
      coalesce(logo, ''),
      nullif("logoUrl", ''),
      nullif("logoStorageKey", ''),
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
      coalesce("welcomeMessage", ''),
      coalesce("contactText", ''),
      coalesce("shareMessageTemplate", ''),
      coalesce("richMenuContactUrl", ''),
      coalesce("createdAt"::timestamptz, now()),
      now()
    from jsonb_to_recordset(${payload}::jsonb) as x(
      id text,
      name text,
      description text,
      logo text,
      "logoUrl" text,
      "logoStorageKey" text,
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
      "welcomeMessage" text,
      "contactText" text,
      "shareMessageTemplate" text,
      "richMenuContactUrl" text,
      "createdAt" text
    )
    on conflict (id) do update set
      name = excluded.name,
      description = excluded.description,
      logo = excluded.logo,
      logo_url = excluded.logo_url,
      logo_storage_key = excluded.logo_storage_key,
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
      welcome_message = excluded.welcome_message,
      contact_text = excluded.contact_text,
      share_message_template = excluded.share_message_template,
      rich_menu_contact_url = excluded.rich_menu_contact_url,
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

export async function upsertCustomerRow(customer: Customer): Promise<Customer> {
  const sql = requireSql();
  const shopIdsPayload = JSON.stringify(Array.from(new Set(customer.shopIds || [])));

  const rows = await sql`
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
    ) values (
      ${customer.id},
      ${customer.name || 'LINE User'},
      ${customer.phone || ''},
      ${customer.lineName || customer.name || ''},
      ${customer.lineId || ''},
      ${customer.avatar || ''},
      ${Math.max(0, Number(customer.currentPoints) || 0)},
      ${Math.max(0, Number(customer.lifetimePoints) || 0)},
      ${['Member', 'Silver', 'Gold', 'Platinum', 'VIP'].includes(customer.tier) ? customer.tier : 'Member'},
      ${customer.createdAt || new Date().toISOString()}::timestamptz,
      ${shopIdsPayload}::jsonb,
      now()
    )
    on conflict (id) do update set
      name = excluded.name,
      phone = excluded.phone,
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
    returning
      id,
      name,
      phone,
      line_name as "lineName",
      line_id as "lineId",
      avatar,
      current_points as "currentPoints",
      lifetime_points as "lifetimePoints",
      tier,
      created_at as "createdAt",
      shop_ids as "shopIds"
  `;

  const row = rows[0] as Record<string, unknown> | undefined;
  if (!row) throw new Error('บันทึกข้อมูลลูกค้าไม่สำเร็จ');
  return mapCustomerRow(row);
}

async function syncRewards(rows: Reward[]) {
  const sql = requireSql();
  const payload = JSON.stringify(rows);

  await sql`delete from rewards where id not in (select id from jsonb_to_recordset(${payload}::jsonb) as x(id text))`;
  if (!rows.length) return;

  await sql`
    insert into rewards (id, name, image, image_url, image_storage_key, description, points_cost, stock, is_available, shop_id, updated_at)
    select id, name, coalesce(image, ''), nullif("imageUrl", ''), nullif("imageStorageKey", ''), coalesce(description, ''), coalesce("pointsCost", 1), coalesce(stock, 0), coalesce("isAvailable", true), "shopId", now()
    from jsonb_to_recordset(${payload}::jsonb) as x(id text, name text, image text, "imageUrl" text, "imageStorageKey" text, description text, "pointsCost" integer, stock integer, "isAvailable" boolean, "shopId" text)
    on conflict (id) do update set
      name = excluded.name,
      image = excluded.image,
      image_url = excluded.image_url,
      image_storage_key = excluded.image_storage_key,
      description = excluded.description,
      points_cost = excluded.points_cost,
      stock = excluded.stock,
      is_available = excluded.is_available,
      shop_id = excluded.shop_id,
      updated_at = now()
  `;
}

export async function upsertRewardRow(reward: Reward) {
  const sql = requireSql();

  await sql`
    insert into rewards (id, name, image, image_url, image_storage_key, description, points_cost, stock, is_available, shop_id, updated_at)
    values (
      ${reward.id},
      ${reward.name},
      ${reward.image || ""},
      ${reward.imageUrl || null},
      ${reward.imageStorageKey || null},
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
      image_url = excluded.image_url,
      image_storage_key = excluded.image_storage_key,
      description = excluded.description,
      points_cost = excluded.points_cost,
      stock = excluded.stock,
      is_available = excluded.is_available,
      shop_id = excluded.shop_id,
      updated_at = now()
  `;
}

export async function deleteRewardRow(rewardId: string, shopId: string) {
  const sql = requireSql();
  await sql`delete from rewards where id = ${rewardId} and shop_id = ${shopId}`;
}

export async function upsertShopRow(shop: Shop) {
  const sql = requireSql();

  await sql`
    insert into shops (
      id, name, description, logo, logo_url, logo_storage_key, category, points_rate,
      point_rounding_mode, minimum_purchase_for_points, point_link_expiry_days,
      point_expiry_days, point_expiry_reminder_days,
      is_active, registration_status, phone,
      welcome_message, contact_text, share_message_template, rich_menu_contact_url,
      created_at, updated_at
    ) values (
      ${shop.id},
      ${shop.name},
      ${shop.description || ''},
      ${shop.logo || ''},
      ${shop.logoUrl || null},
      ${shop.logoStorageKey || null},
      ${shop.category || 'ร้านค้า'},
      ${Math.max(1, Number(shop.pointsRate) || 10)},
      ${shop.pointRoundingMode === 'nearest' ? 'nearest' : 'floor'},
      ${Math.max(0, Number(shop.minimumPurchaseForPoints ?? 1) || 0)},
      ${Math.max(1, Number(shop.pointLinkExpiryDays ?? 7) || 7)},
      ${Math.max(1, Number(shop.pointExpiryDays ?? 365) || 365)},
      ${Math.max(0, Number(shop.pointExpiryReminderDays ?? 30) || 0)},
      ${shop.isActive !== false},
      ${shop.registrationStatus || 'approved'},
      ${shop.phone || ''},
      ${shop.welcomeMessage || ''},
      ${shop.contactText || ''},
      ${shop.shareMessageTemplate || ''},
      ${shop.richMenuContactUrl || ''},
      ${shop.createdAt || new Date().toISOString()},
      now()
    )
    on conflict (id) do update set
      name = excluded.name,
      description = excluded.description,
      logo = excluded.logo,
      logo_url = excluded.logo_url,
      logo_storage_key = excluded.logo_storage_key,
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
      welcome_message = excluded.welcome_message,
      contact_text = excluded.contact_text,
      share_message_template = excluded.share_message_template,
      rich_menu_contact_url = excluded.rich_menu_contact_url,
      updated_at = now()
  `;
}

export async function upsertBannerRow(banner: PromoBanner) {
  const sql = requireSql();
  await sql`
    insert into promo_banners (id, title, image, image_url, image_storage_key, description, is_ad, shop_id, url, expiration_date, updated_at)
    values (
      ${banner.id}, ${banner.title}, ${banner.image || ''}, ${banner.imageUrl || null}, ${banner.imageStorageKey || null},
      ${banner.description || ''}, ${banner.isAd === true}, ${banner.shopId || null}, ${banner.url || null},
      ${banner.expirationDate}, now()
    )
    on conflict (id) do update set
      title = excluded.title,
      image = excluded.image,
      image_url = excluded.image_url,
      image_storage_key = excluded.image_storage_key,
      description = excluded.description,
      is_ad = excluded.is_ad,
      shop_id = excluded.shop_id,
      url = excluded.url,
      expiration_date = excluded.expiration_date,
      updated_at = now()
  `;
}

export async function deleteBannerRow(bannerId: string, shopId: string) {
  const sql = requireSql();
  await sql`delete from promo_banners where id = ${bannerId} and shop_id = ${shopId}`;
}

export async function upsertPointCouponRow(coupon: GeneratedCoupon) {
  const sql = requireSql();
  await sql`
    insert into point_coupons (code, points, shop_id, shop_name, description, created_at, expires_at, is_used, used_by_customer_id, used_at)
    values (
      ${coupon.code}, ${Math.max(1, Number(coupon.points) || 1)}, ${coupon.shopId}, ${coupon.shopName || ''}, ${coupon.description || ''},
      ${coupon.createdAt || new Date().toISOString()}, ${coupon.expiresAt}, ${coupon.isUsed === true}, ${coupon.usedByCustomerId || null}, ${coupon.usedAt || null}
    )
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

export async function deletePointCouponRow(code: string, shopId: string) {
  const sql = requireSql();
  await sql`delete from point_coupons where upper(code) = upper(${code}) and shop_id = ${shopId} and is_used = false`;
}

export async function insertAuditLogRow(log: AuditLog) {
  const sql = requireSql();
  await sql`
    insert into audit_logs (id, shop_id, shop_name, actor_type, actor_name, actor_id, action, action_label, description, target_type, target_id, customer_id, customer_name, points, status, metadata, created_at)
    values (
      ${log.id}, ${log.shopId}, ${log.shopName || ''}, ${log.actorType || 'system'}, ${log.actorName || ''}, ${log.actorId || null},
      ${log.action || ''}, ${log.actionLabel || ''}, ${log.description || ''}, ${log.targetType || null}, ${log.targetId || null},
      ${log.customerId || null}, ${log.customerName || null}, ${typeof log.points === 'number' ? log.points : null}, ${log.status || 'info'},
      ${JSON.stringify(log.metadata || {})}::jsonb, ${log.createdAt || new Date().toISOString()}
    )
    on conflict (id) do nothing
  `;
}

export async function upsertOnboardingChecklistRow(checklist: ShopOnboardingChecklist) {
  const sql = requireSql();
  await sql`
    insert into shop_onboarding_checklists (
      id, shop_id, rich_menu_configured, tested_in_line_browser, tested_customer_claim,
      tested_reward_redeem, test_data_cleaned, reviewed_customer_messages, ready_for_pilot,
      notes, created_at, updated_at
    ) values (
      ${checklist.id}, ${checklist.shopId}, ${checklist.richMenuConfigured === true}, ${checklist.testedInLineBrowser === true}, ${checklist.testedCustomerClaim === true},
      ${checklist.testedRewardRedeem === true}, ${checklist.testDataCleaned === true}, ${checklist.reviewedCustomerMessages === true}, ${checklist.readyForPilot === true},
      ${checklist.notes || ''}, ${checklist.createdAt || new Date().toISOString()}, now()
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

export async function upsertMembershipTiersForShop(shopId: string, tiers: MembershipTier[]) {
  const sql = requireSql();
  const payload = JSON.stringify(tiers.map((tier) => ({ ...tier, shopId })));
  await sql`
    insert into membership_tiers (id, shop_id, name, min_lifetime_points, benefit_text, is_active, sort_order, created_at, updated_at)
    select id, "shopId", name, greatest(0, coalesce("minLifetimePoints", 0)), coalesce("benefitText", ''), coalesce("isActive", true), coalesce("sortOrder", 0), coalesce("createdAt"::timestamptz, now()), now()
    from jsonb_to_recordset(${payload}::jsonb) as x(id text, "shopId" text, name text, "minLifetimePoints" integer, "benefitText" text, "isActive" boolean, "sortOrder" integer, "createdAt" text)
    on conflict (shop_id, name) do update set
      min_lifetime_points = excluded.min_lifetime_points,
      benefit_text = excluded.benefit_text,
      is_active = excluded.is_active,
      sort_order = excluded.sort_order,
      updated_at = now()
  `;

  const rows = await sql`select id, lifetime_points as "lifetimePoints", tier, shop_ids as "shopIds" from customers`;
  const txRows = await sql`select distinct user_id as "userId" from transactions where shop_id = ${shopId}`;
  const txCustomerIds = new Set((txRows as Array<{ userId: string }>).map((row) => row.userId));
  const activeTiers = tiers.filter((tier) => tier.isActive).sort((a, b) => b.minLifetimePoints - a.minLifetimePoints);

  for (const row of rows as Array<{ id: string; lifetimePoints: number; shopIds?: string[] }>) {
    const belongsToShop = Array.isArray(row.shopIds) ? row.shopIds.includes(shopId) : false;
    if (!belongsToShop && !txCustomerIds.has(row.id)) continue;
    const resolved = activeTiers.find((tier) => row.lifetimePoints >= tier.minLifetimePoints)?.name || 'Member';
    await sql`update customers set tier = ${resolved}, updated_at = now() where id = ${row.id}`;
  }
}

async function syncBanners(rows: PromoBanner[]) {
  const sql = requireSql();
  const payload = JSON.stringify(rows);

  await sql`delete from promo_banners where id not in (select id from jsonb_to_recordset(${payload}::jsonb) as x(id text))`;
  if (!rows.length) return;

  await sql`
    insert into promo_banners (id, title, image, image_url, image_storage_key, description, is_ad, shop_id, url, expiration_date, updated_at)
    select id, title, coalesce(image, ''), nullif("imageUrl", ''), nullif("imageStorageKey", ''), coalesce(description, ''), coalesce("isAd", false), nullif("shopId", ''), url, "expirationDate"::date, now()
    from jsonb_to_recordset(${payload}::jsonb) as x(id text, title text, image text, "imageUrl" text, "imageStorageKey" text, description text, "isAd" boolean, "shopId" text, url text, "expirationDate" text)
    on conflict (id) do update set
      title = excluded.title,
      image = excluded.image,
      image_url = excluded.image_url,
      image_storage_key = excluded.image_storage_key,
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

export async function deleteTransactionRow(transactionId: string, shopId: string) {
  const sql = requireSql();

  const rows = await sql`
    delete from transactions
    where id = ${transactionId} and shop_id = ${shopId}
    returning id
  `;

  if (!rows.length) {
    throw new Error('ไม่พบประวัติธุรกรรมในฐานข้อมูลออนไลน์ หรือรายการนี้เป็นของร้านอื่น');
  }
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



type OnlineRewardRedeemParams = {
  rewardId: string;
  shopId: string;
  customer: Partial<Customer> & { id: string };
};

type OnlineRewardApprovalParams = {
  transactionId: string;
  shopId: string;
  action: 'approve' | 'reject';
};

type OnlineMerchantPointAdjustmentParams = {
  customerId: string;
  shopId: string;
  adjustmentType: 'add' | 'deduct';
  points: number;
  reason: string;
};

type OnlinePointClaimParams = {
  couponCode: string;
  shopId: string;
  customer: Partial<Customer> & { id: string };
};

function makeServerId(prefix: string) {
  const randomPart = globalThis.crypto?.randomUUID?.().slice(0, 8) || Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now()}_${randomPart}`;
}

function mapCustomerRow(row: Record<string, unknown>): Customer {
  const shopIdsValue = row.shopIds;
  const shopIds = Array.isArray(shopIdsValue)
    ? shopIdsValue.map(String)
    : typeof shopIdsValue === 'string'
      ? (() => {
          try {
            const parsed = JSON.parse(shopIdsValue);
            return Array.isArray(parsed) ? parsed.map(String) : [];
          } catch {
            return [];
          }
        })()
      : [];

  return {
    id: String(row.id || ''),
    name: String(row.name || 'LINE User'),
    phone: String(row.phone || ''),
    lineName: String(row.lineName || ''),
    lineId: String(row.lineId || ''),
    avatar: String(row.avatar || ''),
    currentPoints: Number(row.currentPoints || 0),
    lifetimePoints: Number(row.lifetimePoints || 0),
    tier: ['Member', 'Silver', 'Gold', 'Platinum', 'VIP'].includes(String(row.tier)) ? (String(row.tier) as Customer['tier']) : 'Member',
    createdAt: new Date(String(row.createdAt || new Date().toISOString())).toISOString(),
    shopIds,
  };
}

function mapCouponRow(row: Record<string, unknown>): GeneratedCoupon {
  return {
    code: String(row.code || ''),
    points: Number(row.points || 0),
    shopId: String(row.shopId || ''),
    shopName: String(row.shopName || ''),
    description: String(row.description || ''),
    createdAt: new Date(String(row.createdAt || new Date().toISOString())).toISOString(),
    expiresAt: new Date(String(row.expiresAt || new Date().toISOString())).toISOString(),
    isUsed: Boolean(row.isUsed),
    usedByCustomerId: row.usedByCustomerId ? String(row.usedByCustomerId) : null,
    usedAt: row.usedAt ? new Date(String(row.usedAt)).toISOString() : null,
  };
}

function mapTransactionRow(row: Record<string, unknown>): Transaction {
  return {
    id: String(row.id || ''),
    userId: String(row.userId || ''),
    userName: String(row.userName || ''),
    userPhone: String(row.userPhone || ''),
    shopId: String(row.shopId || ''),
    shopName: String(row.shopName || ''),
    type: row.type === 'redeem' ? 'redeem' : 'earn',
    points: Number(row.points || 0),
    description: String(row.description || ''),
    status: row.status === 'pending' || row.status === 'rejected' ? row.status : 'completed',
    rewardId: row.rewardId ? String(row.rewardId) : undefined,
    pointsExpiresAt: row.pointsExpiresAt ? new Date(String(row.pointsExpiresAt)).toISOString() : undefined,
    createdAt: new Date(String(row.createdAt || new Date().toISOString())).toISOString(),
  };
}


function mapRewardRow(row: Record<string, unknown>): Reward {
  return {
    id: String(row.id || ''),
    name: String(row.name || ''),
    image: String(row.image || ''),
    imageUrl: row.imageUrl ? String(row.imageUrl) : undefined,
    imageStorageKey: row.imageStorageKey ? String(row.imageStorageKey) : undefined,
    description: String(row.description || ''),
    pointsCost: Number(row.pointsCost || 0),
    stock: Number(row.stock || 0),
    isAvailable: Boolean(row.isAvailable),
    shopId: String(row.shopId || ''),
  };
}

export async function claimPointCouponOnline(params: OnlinePointClaimParams): Promise<{
  customer: Customer;
  coupon: GeneratedCoupon;
  transaction: Transaction;
}> {
  const sql = requireSql();
  const couponCode = params.couponCode.trim().toUpperCase();
  const shopId = params.shopId.trim();
  const customerInput = params.customer;
  const customerId = customerInput.id.trim();

  if (!couponCode || !shopId || !customerId) {
    throw new Error('ข้อมูลรับแต้มไม่ครบ กรุณาลองใหม่อีกครั้ง');
  }

  const couponRows = await sql`
    select
      pc.code,
      pc.points,
      pc.shop_id as "shopId",
      pc.shop_name as "shopName",
      pc.description,
      pc.created_at as "createdAt",
      pc.expires_at as "expiresAt",
      pc.is_used as "isUsed",
      pc.used_by_customer_id as "usedByCustomerId",
      pc.used_at as "usedAt",
      s.point_expiry_days as "pointExpiryDays"
    from point_coupons pc
    join shops s on s.id = pc.shop_id
    where upper(pc.code) = upper(${couponCode}) and pc.shop_id = ${shopId}
    limit 1
  `;

  const couponCandidate = couponRows[0] as (Record<string, unknown> & { pointExpiryDays?: number }) | undefined;
  if (!couponCandidate) {
    throw new Error('ไม่พบลิงก์รับแต้มนี้ หรือไม่ได้เป็นลิงก์ของร้านนี้');
  }

  if (Boolean(couponCandidate.isUsed)) {
    throw new Error('ลิงก์รับแต้มนี้ถูกใช้ไปแล้ว');
  }

  if (new Date(String(couponCandidate.expiresAt)).getTime() < Date.now()) {
    throw new Error('ลิงก์รับแต้มนี้หมดอายุแล้ว');
  }

  const safeName = String(customerInput.name || customerInput.lineName || 'LINE User').trim() || 'LINE User';
  const safePhone = String(customerInput.phone || '').trim();
  const safeLineName = String(customerInput.lineName || safeName).trim();
  const safeLineId = String(customerInput.lineId || '').trim();
  const safeAvatar = String(customerInput.avatar || '').trim();
  const createdAt = customerInput.createdAt || new Date().toISOString();
  const shopIds = JSON.stringify([shopId]);

  // Online-only point claim: create/update profile fields, but never trust client-side
  // currentPoints/lifetimePoints. Neon is the source of truth and increments below.
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
    ) values (
      ${customerId},
      ${safeName},
      ${safePhone},
      ${safeLineName},
      ${safeLineId},
      ${safeAvatar},
      0,
      0,
      'Member',
      ${createdAt}::timestamptz,
      ${shopIds}::jsonb,
      now()
    )
    on conflict (id) do update set
      name = case when customers.name = '' or customers.name = 'LINE User' then excluded.name else customers.name end,
      phone = coalesce(nullif(excluded.phone, ''), customers.phone),
      line_name = coalesce(nullif(excluded.line_name, ''), customers.line_name),
      line_id = coalesce(nullif(excluded.line_id, ''), customers.line_id),
      avatar = coalesce(nullif(excluded.avatar, ''), customers.avatar),
      shop_ids = coalesce(
        (
          select jsonb_agg(distinct value)
          from jsonb_array_elements_text(customers.shop_ids || excluded.shop_ids) as merged(value)
        ),
        excluded.shop_ids
      ),
      updated_at = now()
  `;

  const usedCouponRows = await sql`
    update point_coupons
    set
      is_used = true,
      used_by_customer_id = ${customerId},
      used_at = now()
    where upper(code) = upper(${couponCode})
      and shop_id = ${shopId}
      and is_used = false
      and expires_at >= now()
    returning
      code,
      points,
      shop_id as "shopId",
      shop_name as "shopName",
      description,
      created_at as "createdAt",
      expires_at as "expiresAt",
      is_used as "isUsed",
      used_by_customer_id as "usedByCustomerId",
      used_at as "usedAt"
  `;

  const usedCoupon = usedCouponRows[0] as Record<string, unknown> | undefined;
  if (!usedCoupon) {
    throw new Error('ลิงก์รับแต้มนี้ถูกใช้ไปแล้วหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่จากร้านค้า');
  }

  const points = Math.max(1, Number(usedCoupon.points || 0));
  const updatedCustomerRows = await sql`
    update customers
    set
      current_points = current_points + ${points},
      lifetime_points = lifetime_points + ${points},
      tier = coalesce(
        (
          select name
          from membership_tiers
          where shop_id = ${shopId}
            and is_active = true
            and min_lifetime_points <= (customers.lifetime_points + ${points})
          order by min_lifetime_points desc, sort_order desc
          limit 1
        ),
        'Member'
      ),
      updated_at = now()
    where id = ${customerId}
    returning
      id,
      name,
      phone,
      line_name as "lineName",
      line_id as "lineId",
      avatar,
      current_points as "currentPoints",
      lifetime_points as "lifetimePoints",
      tier,
      created_at as "createdAt",
      shop_ids as "shopIds"
  `;

  const updatedCustomer = updatedCustomerRows[0] as Record<string, unknown> | undefined;
  if (!updatedCustomer) {
    throw new Error('ไม่สามารถอัปเดตแต้มลูกค้าได้ กรุณาลองใหม่อีกครั้ง');
  }

  const pointExpiryDays = Math.max(1, Number(couponCandidate.pointExpiryDays || 365));
  const transactionId = makeServerId('tx');
  const transactionRows = await sql`
    insert into transactions (
      id,
      user_id,
      user_name,
      user_phone,
      shop_id,
      shop_name,
      type,
      points,
      description,
      status,
      points_expires_at,
      created_at
    ) values (
      ${transactionId},
      ${customerId},
      ${String(updatedCustomer.name || safeName)},
      ${String(updatedCustomer.phone || safePhone)},
      ${String(usedCoupon.shopId || shopId)},
      ${String(usedCoupon.shopName || '')},
      'earn',
      ${points},
      ${`รับแต้มจากลิงก์ของร้าน: ${String(usedCoupon.description || '')} (รหัส: ${String(usedCoupon.code || couponCode)})`},
      'completed',
      now() + (${pointExpiryDays} * interval '1 day'),
      now()
    )
    returning
      id,
      user_id as "userId",
      user_name as "userName",
      user_phone as "userPhone",
      shop_id as "shopId",
      shop_name as "shopName",
      type,
      points,
      description,
      status,
      reward_id as "rewardId",
      points_expires_at as "pointsExpiresAt",
      created_at as "createdAt"
  `;

  const transaction = transactionRows[0] as Record<string, unknown> | undefined;
  if (!transaction) {
    throw new Error('ไม่สามารถสร้างประวัติรับแต้มได้ กรุณาลองใหม่อีกครั้ง');
  }

  await sql`
    insert into audit_logs (
      id,
      shop_id,
      shop_name,
      actor_type,
      actor_name,
      actor_id,
      action,
      action_label,
      description,
      target_type,
      target_id,
      customer_id,
      customer_name,
      points,
      status,
      metadata,
      created_at
    ) values (
      ${makeServerId('audit')},
      ${String(usedCoupon.shopId || shopId)},
      ${String(usedCoupon.shopName || '')},
      'customer',
      ${String(updatedCustomer.name || safeName)},
      ${customerId},
      'customer_point_link_claimed',
      'ลูกค้ากดรับแต้มจากลิงก์',
      ${`${String(updatedCustomer.name || safeName)} รับแต้ม +${points.toLocaleString('th-TH')} จากลิงก์รหัส ${String(usedCoupon.code || couponCode)}`},
      'coupon',
      ${String(usedCoupon.code || couponCode)},
      ${customerId},
      ${String(updatedCustomer.name || safeName)},
      ${points},
      'success',
      ${JSON.stringify({ transactionId, couponCode: String(usedCoupon.code || couponCode) })}::jsonb,
      now()
    )
    on conflict (id) do nothing
  `;

  return {
    customer: mapCustomerRow(updatedCustomer),
    coupon: mapCouponRow(usedCoupon),
    transaction: mapTransactionRow(transaction),
  };
}


export async function redeemRewardOnline(params: OnlineRewardRedeemParams): Promise<{
  customer: Customer;
  transaction: Transaction;
  reward: Reward;
}> {
  const sql = requireSql();
  const rewardId = params.rewardId.trim();
  const shopId = params.shopId.trim();
  const customerInput = params.customer;
  const customerId = customerInput.id.trim();

  if (!rewardId || !shopId || !customerId) {
    throw new Error('ข้อมูลแลกรางวัลไม่ครบ กรุณาลองใหม่อีกครั้ง');
  }

  const rewardCheckRows = await sql`
    select
      id,
      name,
      image,
      image_url as "imageUrl",
      image_storage_key as "imageStorageKey",
      description,
      points_cost as "pointsCost",
      stock,
      is_available as "isAvailable",
      shop_id as "shopId"
    from rewards
    where id = ${rewardId} and shop_id = ${shopId}
    limit 1
  `;

  const rewardCheck = rewardCheckRows[0] as Record<string, unknown> | undefined;
  if (!rewardCheck) {
    throw new Error('ไม่พบของรางวัลนี้ในร้านปัจจุบัน กรุณารีเฟรชแล้วลองใหม่');
  }
  if (!Boolean(rewardCheck.isAvailable)) {
    throw new Error('ของรางวัลนี้ไม่เปิดให้แลกในขณะนี้');
  }
  if (Number(rewardCheck.stock || 0) <= 0) {
    throw new Error('ของรางวัลนี้หมดสต็อกแล้ว กรุณาติดต่อร้านค้า');
  }

  const shopRows = await sql`select name from shops where id = ${shopId} limit 1`;
  const shopName = String((shopRows[0] as { name?: string } | undefined)?.name || shopId);
  const safeName = String(customerInput.name || customerInput.lineName || 'LINE User').trim() || 'LINE User';
  const safePhone = String(customerInput.phone || '').trim();
  const safeLineName = String(customerInput.lineName || safeName).trim();
  const safeLineId = String(customerInput.lineId || '').trim();
  const safeAvatar = String(customerInput.avatar || '').trim();
  const createdAt = customerInput.createdAt || new Date().toISOString();
  const shopIds = JSON.stringify([shopId]);

  // Keep profile fields fresh, but do not trust client-side points. Neon remains the source of truth.
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
    ) values (
      ${customerId},
      ${safeName},
      ${safePhone},
      ${safeLineName},
      ${safeLineId},
      ${safeAvatar},
      0,
      0,
      'Member',
      ${createdAt}::timestamptz,
      ${shopIds}::jsonb,
      now()
    )
    on conflict (id) do update set
      name = case when customers.name = '' or customers.name = 'LINE User' then excluded.name else customers.name end,
      phone = coalesce(nullif(excluded.phone, ''), customers.phone),
      line_name = coalesce(nullif(excluded.line_name, ''), customers.line_name),
      line_id = coalesce(nullif(excluded.line_id, ''), customers.line_id),
      avatar = coalesce(nullif(excluded.avatar, ''), customers.avatar),
      shop_ids = coalesce(
        (
          select jsonb_agg(distinct value)
          from jsonb_array_elements_text(customers.shop_ids || excluded.shop_ids) as merged(value)
        ),
        excluded.shop_ids
      ),
      updated_at = now()
  `;

  const transactionId = makeServerId('tx');
  const redeemRows = await sql`
    with selected_reward as (
      select
        id,
        name,
        image,
        image_url,
        image_storage_key,
        description,
        points_cost,
        stock,
        is_available,
        shop_id
      from rewards
      where id = ${rewardId}
        and shop_id = ${shopId}
        and is_available = true
        and stock > 0
      limit 1
    ),
    updated_customer as (
      update customers c
      set
        current_points = c.current_points - sr.points_cost,
        updated_at = now()
      from selected_reward sr
      where c.id = ${customerId}
        and c.current_points >= sr.points_cost
      returning
        c.id,
        c.name,
        c.phone,
        c.line_name,
        c.line_id,
        c.avatar,
        c.current_points,
        c.lifetime_points,
        c.tier,
        c.created_at,
        c.shop_ids
    ),
    inserted_tx as (
      insert into transactions (
        id,
        user_id,
        user_name,
        user_phone,
        shop_id,
        shop_name,
        type,
        points,
        description,
        status,
        reward_id,
        created_at
      )
      select
        ${transactionId},
        uc.id,
        uc.name,
        coalesce(uc.phone, ''),
        sr.shop_id,
        ${shopName},
        'redeem',
        sr.points_cost,
        'ขอแลกรางวัล: ' || sr.name,
        'pending',
        sr.id,
        now()
      from selected_reward sr
      join updated_customer uc on true
      returning
        id,
        user_id,
        user_name,
        user_phone,
        shop_id,
        shop_name,
        type,
        points,
        description,
        status,
        reward_id,
        points_expires_at,
        created_at
    )
    select
      uc.id as "customerId",
      uc.name as "customerName",
      uc.phone as "customerPhone",
      uc.line_name as "customerLineName",
      uc.line_id as "customerLineId",
      uc.avatar as "customerAvatar",
      uc.current_points as "customerCurrentPoints",
      uc.lifetime_points as "customerLifetimePoints",
      uc.tier as "customerTier",
      uc.created_at as "customerCreatedAt",
      uc.shop_ids as "customerShopIds",
      tx.id as "transactionId",
      tx.user_id as "transactionUserId",
      tx.user_name as "transactionUserName",
      tx.user_phone as "transactionUserPhone",
      tx.shop_id as "transactionShopId",
      tx.shop_name as "transactionShopName",
      tx.type as "transactionType",
      tx.points as "transactionPoints",
      tx.description as "transactionDescription",
      tx.status as "transactionStatus",
      tx.reward_id as "transactionRewardId",
      tx.points_expires_at as "transactionPointsExpiresAt",
      tx.created_at as "transactionCreatedAt",
      sr.id as "rewardId",
      sr.name as "rewardName",
      sr.image as "rewardImage",
      sr.image_url as "rewardImageUrl",
      sr.image_storage_key as "rewardImageStorageKey",
      sr.description as "rewardDescription",
      sr.points_cost as "rewardPointsCost",
      sr.stock as "rewardStock",
      sr.is_available as "rewardIsAvailable",
      sr.shop_id as "rewardShopId"
    from updated_customer uc
    join inserted_tx tx on true
    join selected_reward sr on true
  `;

  const row = redeemRows[0] as Record<string, unknown> | undefined;
  if (!row) {
    const customerRows = await sql`
      select current_points as "currentPoints"
      from customers
      where id = ${customerId}
      limit 1
    `;
    const currentPoints = Number((customerRows[0] as { currentPoints?: number } | undefined)?.currentPoints || 0);
    const requiredPoints = Number(rewardCheck.pointsCost || 0);
    if (currentPoints < requiredPoints) {
      throw new Error(`แต้มสะสมของคุณไม่เพียงพอสำหรับของรางวัลนี้ ต้องใช้ ${requiredPoints.toLocaleString('th-TH')} แต้ม แต่มี ${currentPoints.toLocaleString('th-TH')} แต้ม`);
    }
    throw new Error('ไม่สามารถสร้างคำขอแลกรางวัลได้ กรุณารีเฟรชแล้วลองใหม่');
  }

  const customer = mapCustomerRow({
    id: row.customerId,
    name: row.customerName,
    phone: row.customerPhone,
    lineName: row.customerLineName,
    lineId: row.customerLineId,
    avatar: row.customerAvatar,
    currentPoints: row.customerCurrentPoints,
    lifetimePoints: row.customerLifetimePoints,
    tier: row.customerTier,
    createdAt: row.customerCreatedAt,
    shopIds: row.customerShopIds,
  });
  const transaction = mapTransactionRow({
    id: row.transactionId,
    userId: row.transactionUserId,
    userName: row.transactionUserName,
    userPhone: row.transactionUserPhone,
    shopId: row.transactionShopId,
    shopName: row.transactionShopName,
    type: row.transactionType,
    points: row.transactionPoints,
    description: row.transactionDescription,
    status: row.transactionStatus,
    rewardId: row.transactionRewardId,
    pointsExpiresAt: row.transactionPointsExpiresAt,
    createdAt: row.transactionCreatedAt,
  });
  const reward = mapRewardRow({
    id: row.rewardId,
    name: row.rewardName,
    image: row.rewardImage,
    imageUrl: row.rewardImageUrl,
    imageStorageKey: row.rewardImageStorageKey,
    description: row.rewardDescription,
    pointsCost: row.rewardPointsCost,
    stock: row.rewardStock,
    isAvailable: row.rewardIsAvailable,
    shopId: row.rewardShopId,
  });

  await sql`
    insert into audit_logs (
      id,
      shop_id,
      shop_name,
      actor_type,
      actor_name,
      actor_id,
      action,
      action_label,
      description,
      target_type,
      target_id,
      customer_id,
      customer_name,
      points,
      status,
      metadata,
      created_at
    ) values (
      ${makeServerId('audit')},
      ${shopId},
      ${shopName},
      'customer',
      ${customer.name},
      ${customer.id},
      'customer_reward_redeemed_online',
      'ลูกค้าขอแลกรางวัลแบบออนไลน์',
      ${`${customer.name} ขอแลกรางวัล “${reward.name}” ใช้ ${transaction.points.toLocaleString('th-TH')} แต้ม`},
      'transaction',
      ${transaction.id},
      ${customer.id},
      ${customer.name},
      ${-Math.abs(transaction.points)},
      'success',
      ${JSON.stringify({ rewardId: reward.id, rewardName: reward.name })}::jsonb,
      now()
    )
    on conflict (id) do nothing
  `;

  return { customer, transaction, reward };
}

export async function handleRewardApprovalOnline(params: OnlineRewardApprovalParams): Promise<{
  transaction: Transaction;
  customer?: Customer;
  reward?: Reward;
}> {
  const sql = requireSql();
  const transactionId = params.transactionId.trim();
  const shopId = params.shopId.trim();
  const action = params.action;

  if (!transactionId || !shopId || (action !== 'approve' && action !== 'reject')) {
    throw new Error('ข้อมูลอนุมัติรางวัลไม่ครบ กรุณาลองใหม่อีกครั้ง');
  }

  const existingRows = await sql`
    select
      t.id,
      t.user_id as "userId",
      t.user_name as "userName",
      t.user_phone as "userPhone",
      t.shop_id as "shopId",
      t.shop_name as "shopName",
      t.type,
      t.points,
      t.description,
      t.status,
      t.reward_id as "rewardId",
      t.created_at as "createdAt",
      r.name as "rewardName",
      r.stock as "rewardStock"
    from transactions t
    left join rewards r on r.id = t.reward_id and r.shop_id = t.shop_id
    where t.id = ${transactionId} and t.shop_id = ${shopId} and t.type = 'redeem'
    limit 1
  `;

  const existing = existingRows[0] as Record<string, unknown> | undefined;
  if (!existing) {
    throw new Error('ไม่พบรายการแลกรางวัลนี้ในร้านปัจจุบัน');
  }
  if (String(existing.status) !== 'pending') {
    throw new Error('รายการนี้ถูกดำเนินการไปแล้ว');
  }

  if (action === 'approve') {
    if (!existing.rewardId) {
      throw new Error('รายการนี้ไม่มีข้อมูลของรางวัล กรุณาตรวจสอบอีกครั้ง');
    }
    if (Number(existing.rewardStock || 0) <= 0) {
      throw new Error('ไม่สามารถอนุมัติได้ เพราะของรางวัลนี้หมดสต็อกแล้ว');
    }

    const approveRows = await sql`
      with tx as (
        select *
        from transactions
        where id = ${transactionId}
          and shop_id = ${shopId}
          and type = 'redeem'
          and status = 'pending'
          and reward_id is not null
        limit 1
      ),
      updated_reward as (
        update rewards r
        set
          stock = r.stock - 1,
          updated_at = now()
        from tx
        where r.id = tx.reward_id
          and r.shop_id = tx.shop_id
          and r.stock > 0
        returning
          r.id,
          r.name,
          r.image,
          r.image_url,
          r.image_storage_key,
          r.description,
          r.points_cost,
          r.stock,
          r.is_available,
          r.shop_id
      ),
      updated_tx as (
        update transactions t
        set status = 'completed'
        from tx
        join updated_reward ur on true
        where t.id = tx.id
        returning
          t.id,
          t.user_id,
          t.user_name,
          t.user_phone,
          t.shop_id,
          t.shop_name,
          t.type,
          t.points,
          t.description,
          t.status,
          t.reward_id,
          t.points_expires_at,
          t.created_at
      )
      select
        ut.id as "transactionId",
        ut.user_id as "transactionUserId",
        ut.user_name as "transactionUserName",
        ut.user_phone as "transactionUserPhone",
        ut.shop_id as "transactionShopId",
        ut.shop_name as "transactionShopName",
        ut.type as "transactionType",
        ut.points as "transactionPoints",
        ut.description as "transactionDescription",
        ut.status as "transactionStatus",
        ut.reward_id as "transactionRewardId",
        ut.points_expires_at as "transactionPointsExpiresAt",
        ut.created_at as "transactionCreatedAt",
        ur.id as "rewardId",
        ur.name as "rewardName",
        ur.image as "rewardImage",
        ur.image_url as "rewardImageUrl",
        ur.image_storage_key as "rewardImageStorageKey",
        ur.description as "rewardDescription",
        ur.points_cost as "rewardPointsCost",
        ur.stock as "rewardStock",
        ur.is_available as "rewardIsAvailable",
        ur.shop_id as "rewardShopId"
      from updated_tx ut
      join updated_reward ur on true
    `;

    const row = approveRows[0] as Record<string, unknown> | undefined;
    if (!row) {
      throw new Error('อนุมัติไม่สำเร็จ รายการอาจถูกดำเนินการแล้วหรือของรางวัลหมดสต็อก');
    }

    const transaction = mapTransactionRow({
      id: row.transactionId,
      userId: row.transactionUserId,
      userName: row.transactionUserName,
      userPhone: row.transactionUserPhone,
      shopId: row.transactionShopId,
      shopName: row.transactionShopName,
      type: row.transactionType,
      points: row.transactionPoints,
      description: row.transactionDescription,
      status: row.transactionStatus,
      rewardId: row.transactionRewardId,
      pointsExpiresAt: row.transactionPointsExpiresAt,
      createdAt: row.transactionCreatedAt,
    });
    const reward = mapRewardRow({
      id: row.rewardId,
      name: row.rewardName,
      image: row.rewardImage,
      imageUrl: row.rewardImageUrl,
      imageStorageKey: row.rewardImageStorageKey,
      description: row.rewardDescription,
      pointsCost: row.rewardPointsCost,
      stock: row.rewardStock,
      isAvailable: row.rewardIsAvailable,
      shopId: row.rewardShopId,
    });

    await sql`
      insert into audit_logs (
        id, shop_id, shop_name, actor_type, actor_name, action, action_label,
        description, target_type, target_id, customer_id, customer_name, points, status, metadata, created_at
      ) values (
        ${makeServerId('audit')},
        ${transaction.shopId},
        ${transaction.shopName},
        'owner',
        'เจ้าของร้าน',
        'reward_redeem_approved_online',
        'อนุมัติรางวัลแบบออนไลน์',
        ${`อนุมัติของรางวัล “${reward.name}” ให้ ${transaction.userName}`},
        'transaction',
        ${transaction.id},
        ${transaction.userId},
        ${transaction.userName},
        ${-Math.abs(transaction.points)},
        'success',
        ${JSON.stringify({ rewardId: reward.id, rewardName: reward.name })}::jsonb,
        now()
      )
      on conflict (id) do nothing
    `;

    return { transaction, reward };
  }

  const rejectRows = await sql`
    with tx as (
      select *
      from transactions
      where id = ${transactionId}
        and shop_id = ${shopId}
        and type = 'redeem'
        and status = 'pending'
      limit 1
    ),
    updated_customer as (
      update customers c
      set
        current_points = c.current_points + tx.points,
        updated_at = now()
      from tx
      where c.id = tx.user_id
      returning
        c.id,
        c.name,
        c.phone,
        c.line_name,
        c.line_id,
        c.avatar,
        c.current_points,
        c.lifetime_points,
        c.tier,
        c.created_at,
        c.shop_ids
    ),
    updated_tx as (
      update transactions t
      set
        status = 'rejected',
        description = case
          when position('คืนแต้มแล้ว' in t.description) > 0 then t.description
          else t.description || ' (ร้านปฏิเสธ - คืนแต้มแล้ว)'
        end
      from tx
      join updated_customer uc on true
      where t.id = tx.id
      returning
        t.id,
        t.user_id,
        t.user_name,
        t.user_phone,
        t.shop_id,
        t.shop_name,
        t.type,
        t.points,
        t.description,
        t.status,
        t.reward_id,
        t.points_expires_at,
        t.created_at
    )
    select
      ut.id as "transactionId",
      ut.user_id as "transactionUserId",
      ut.user_name as "transactionUserName",
      ut.user_phone as "transactionUserPhone",
      ut.shop_id as "transactionShopId",
      ut.shop_name as "transactionShopName",
      ut.type as "transactionType",
      ut.points as "transactionPoints",
      ut.description as "transactionDescription",
      ut.status as "transactionStatus",
      ut.reward_id as "transactionRewardId",
      ut.points_expires_at as "transactionPointsExpiresAt",
      ut.created_at as "transactionCreatedAt",
      uc.id as "customerId",
      uc.name as "customerName",
      uc.phone as "customerPhone",
      uc.line_name as "customerLineName",
      uc.line_id as "customerLineId",
      uc.avatar as "customerAvatar",
      uc.current_points as "customerCurrentPoints",
      uc.lifetime_points as "customerLifetimePoints",
      uc.tier as "customerTier",
      uc.created_at as "customerCreatedAt",
      uc.shop_ids as "customerShopIds"
    from updated_tx ut
    join updated_customer uc on true
  `;

  const row = rejectRows[0] as Record<string, unknown> | undefined;
  if (!row) {
    throw new Error('ปฏิเสธไม่สำเร็จ รายการอาจถูกดำเนินการไปแล้ว');
  }

  const transaction = mapTransactionRow({
    id: row.transactionId,
    userId: row.transactionUserId,
    userName: row.transactionUserName,
    userPhone: row.transactionUserPhone,
    shopId: row.transactionShopId,
    shopName: row.transactionShopName,
    type: row.transactionType,
    points: row.transactionPoints,
    description: row.transactionDescription,
    status: row.transactionStatus,
    rewardId: row.transactionRewardId,
    pointsExpiresAt: row.transactionPointsExpiresAt,
    createdAt: row.transactionCreatedAt,
  });
  const customer = mapCustomerRow({
    id: row.customerId,
    name: row.customerName,
    phone: row.customerPhone,
    lineName: row.customerLineName,
    lineId: row.customerLineId,
    avatar: row.customerAvatar,
    currentPoints: row.customerCurrentPoints,
    lifetimePoints: row.customerLifetimePoints,
    tier: row.customerTier,
    createdAt: row.customerCreatedAt,
    shopIds: row.customerShopIds,
  });

  await sql`
    insert into audit_logs (
      id, shop_id, shop_name, actor_type, actor_name, action, action_label,
      description, target_type, target_id, customer_id, customer_name, points, status, metadata, created_at
    ) values (
      ${makeServerId('audit')},
      ${transaction.shopId},
      ${transaction.shopName},
      'owner',
      'เจ้าของร้าน',
      'reward_redeem_rejected_online',
      'ปฏิเสธรางวัล / คืนแต้มแบบออนไลน์',
      ${`ปฏิเสธรายการแลกและคืน ${transaction.points.toLocaleString('th-TH')} แต้มให้ ${transaction.userName}`},
      'transaction',
      ${transaction.id},
      ${transaction.userId},
      ${transaction.userName},
      ${transaction.points},
      'warning',
      ${JSON.stringify({ rewardId: transaction.rewardId || null })}::jsonb,
      now()
    )
    on conflict (id) do nothing
  `;

  return { transaction, customer };
}


export async function adjustCustomerPointsOnline(params: OnlineMerchantPointAdjustmentParams): Promise<{
  customer: Customer;
  transaction: Transaction;
}> {
  const sql = requireSql();
  const customerId = params.customerId.trim();
  const shopId = params.shopId.trim();
  const adjustmentType = params.adjustmentType;
  const points = Math.floor(Number(params.points));
  const reason = params.reason.trim() || 'ปรับแต้มโดยร้านค้า';

  if (!customerId || !shopId || (adjustmentType !== 'add' && adjustmentType !== 'deduct') || !Number.isFinite(points) || points <= 0) {
    throw new Error('ข้อมูลปรับแต้มไม่ครบ กรุณาลองใหม่อีกครั้ง');
  }

  const [shopRows, customerRows] = await Promise.all([
    sql`
      select id, name, point_expiry_days as "pointExpiryDays"
      from shops
      where id = ${shopId}
      limit 1
    `,
    sql`
      select
        id,
        name,
        phone,
        line_name as "lineName",
        line_id as "lineId",
        avatar,
        current_points as "currentPoints",
        lifetime_points as "lifetimePoints",
        tier,
        created_at as "createdAt",
        shop_ids as "shopIds"
      from customers
      where id = ${customerId}
      limit 1
    `,
  ]);

  const shop = shopRows[0] as Record<string, unknown> | undefined;
  const existingCustomer = customerRows[0] as Record<string, unknown> | undefined;

  if (!shop) {
    throw new Error('ไม่พบร้านค้าที่ต้องการปรับแต้ม');
  }
  if (!existingCustomer) {
    throw new Error('ไม่พบลูกค้าคนนี้ในฐานข้อมูลออนไลน์');
  }

  const currentPoints = Number(existingCustomer.currentPoints || 0);
  if (adjustmentType === 'deduct' && currentPoints < points) {
    throw new Error(`แต้มไม่พอสำหรับการหักรายการนี้ ลูกค้ามี ${currentPoints.toLocaleString('th-TH')} แต้ม`);
  }

  const shopIdsPayload = JSON.stringify([shopId]);
  const adjustmentRows = await sql`
    with selected_shop as (
      select id, name, point_expiry_days
      from shops
      where id = ${shopId}
      limit 1
    ),
    selected_customer as (
      select *
      from customers
      where id = ${customerId}
      limit 1
    ),
    computed as (
      select
        sc.*,
        ss.id as shop_id_for_adjustment,
        ss.name as shop_name_for_adjustment,
        ss.point_expiry_days,
        case
          when ${adjustmentType} = 'add' then sc.current_points + ${points}
          else sc.current_points - ${points}
        end as next_current_points,
        case
          when ${adjustmentType} = 'add' then sc.lifetime_points + ${points}
          else greatest(0, sc.lifetime_points - ${points})
        end as next_lifetime_points
      from selected_customer sc
      join selected_shop ss on true
    ),
    updated_customer as (
      update customers c
      set
        current_points = computed.next_current_points,
        lifetime_points = computed.next_lifetime_points,
        tier = coalesce(
          (
            select name
            from membership_tiers
            where shop_id = ${shopId}
              and is_active = true
              and min_lifetime_points <= computed.next_lifetime_points
            order by min_lifetime_points desc, sort_order desc
            limit 1
          ),
          'Member'
        ),
        shop_ids = coalesce(
          (
            select jsonb_agg(distinct value)
            from jsonb_array_elements_text(c.shop_ids || ${shopIdsPayload}::jsonb) as merged(value)
          ),
          ${shopIdsPayload}::jsonb
        ),
        updated_at = now()
      from computed
      where c.id = computed.id
        and computed.next_current_points >= 0
      returning
        c.id,
        c.name,
        c.phone,
        c.line_name,
        c.line_id,
        c.avatar,
        c.current_points,
        c.lifetime_points,
        c.tier,
        c.created_at,
        c.shop_ids,
        computed.shop_id_for_adjustment,
        computed.shop_name_for_adjustment,
        computed.point_expiry_days
    ),
    inserted_tx as (
      insert into transactions (
        id,
        user_id,
        user_name,
        user_phone,
        shop_id,
        shop_name,
        type,
        points,
        description,
        status,
        points_expires_at,
        created_at
      )
      select
        ${makeServerId('tx')},
        uc.id,
        uc.name,
        uc.phone,
        uc.shop_id_for_adjustment,
        uc.shop_name_for_adjustment,
        case when ${adjustmentType} = 'add' then 'earn' else 'redeem' end,
        ${points},
        ${`ปรับแต้มโดยร้าน: ${reason}`},
        'completed',
        case
          when ${adjustmentType} = 'add' then now() + (greatest(1, uc.point_expiry_days) * interval '1 day')
          else null::timestamptz
        end,
        now()
      from updated_customer uc
      returning
        id,
        user_id,
        user_name,
        user_phone,
        shop_id,
        shop_name,
        type,
        points,
        description,
        status,
        reward_id,
        points_expires_at,
        created_at
    )
    select
      uc.id as "customerId",
      uc.name as "customerName",
      uc.phone as "customerPhone",
      uc.line_name as "customerLineName",
      uc.line_id as "customerLineId",
      uc.avatar as "customerAvatar",
      uc.current_points as "customerCurrentPoints",
      uc.lifetime_points as "customerLifetimePoints",
      uc.tier as "customerTier",
      uc.created_at as "customerCreatedAt",
      uc.shop_ids as "customerShopIds",
      tx.id as "transactionId",
      tx.user_id as "transactionUserId",
      tx.user_name as "transactionUserName",
      tx.user_phone as "transactionUserPhone",
      tx.shop_id as "transactionShopId",
      tx.shop_name as "transactionShopName",
      tx.type as "transactionType",
      tx.points as "transactionPoints",
      tx.description as "transactionDescription",
      tx.status as "transactionStatus",
      tx.reward_id as "transactionRewardId",
      tx.points_expires_at as "transactionPointsExpiresAt",
      tx.created_at as "transactionCreatedAt"
    from updated_customer uc
    join inserted_tx tx on true
  `;

  const row = adjustmentRows[0] as Record<string, unknown> | undefined;
  if (!row) {
    throw new Error('ปรับแต้มไม่สำเร็จ กรุณารีเฟรชข้อมูลแล้วลองใหม่อีกครั้ง');
  }

  const customer = mapCustomerRow({
    id: row.customerId,
    name: row.customerName,
    phone: row.customerPhone,
    lineName: row.customerLineName,
    lineId: row.customerLineId,
    avatar: row.customerAvatar,
    currentPoints: row.customerCurrentPoints,
    lifetimePoints: row.customerLifetimePoints,
    tier: row.customerTier,
    createdAt: row.customerCreatedAt,
    shopIds: row.customerShopIds,
  });

  const transaction = mapTransactionRow({
    id: row.transactionId,
    userId: row.transactionUserId,
    userName: row.transactionUserName,
    userPhone: row.transactionUserPhone,
    shopId: row.transactionShopId,
    shopName: row.transactionShopName,
    type: row.transactionType,
    points: row.transactionPoints,
    description: row.transactionDescription,
    status: row.transactionStatus,
    rewardId: row.transactionRewardId,
    pointsExpiresAt: row.transactionPointsExpiresAt,
    createdAt: row.transactionCreatedAt,
  });

  const signedPoints = adjustmentType === 'add' ? points : -points;
  await sql`
    insert into audit_logs (
      id,
      shop_id,
      shop_name,
      actor_type,
      actor_name,
      action,
      action_label,
      description,
      target_type,
      target_id,
      customer_id,
      customer_name,
      points,
      status,
      metadata,
      created_at
    ) values (
      ${makeServerId('audit')},
      ${transaction.shopId},
      ${transaction.shopName},
      'owner',
      'เจ้าของร้าน',
      ${adjustmentType === 'add' ? 'manual_points_added_online' : 'manual_points_deducted_online'},
      ${adjustmentType === 'add' ? 'ปรับเพิ่มแต้มแบบออนไลน์' : 'ปรับลดแต้มแบบออนไลน์'},
      ${`${adjustmentType === 'add' ? 'เพิ่ม' : 'ลด'}แต้ม ${points.toLocaleString('th-TH')} แต้ม ให้ ${customer.name}: ${reason}`},
      'transaction',
      ${transaction.id},
      ${customer.id},
      ${customer.name},
      ${signedPoints},
      ${adjustmentType === 'add' ? 'success' : 'warning'},
      ${JSON.stringify({ reason, adjustmentType })}::jsonb,
      now()
    )
    on conflict (id) do nothing
  `;

  return { customer, transaction };
}

export async function persistPointClaim(params: {
  customer: Customer;
  coupon: GeneratedCoupon;
  transaction: Transaction;
}) {
  const sql = requireSql();
  const { customer, coupon, transaction } = params;

  const existingCoupon = await sql`
    select is_used as "isUsed", used_by_customer_id as "usedByCustomerId"
    from point_coupons
    where code = ${coupon.code}
    limit 1
  `;

  const existing = existingCoupon[0] as { isUsed?: boolean; usedByCustomerId?: string | null } | undefined;
  if (existing?.isUsed && existing.usedByCustomerId && existing.usedByCustomerId !== customer.id) {
    throw new Error('ลิงก์รับแต้มนี้ถูกใช้โดยลูกค้าคนอื่นแล้ว');
  }

  await sql`
    insert into customers (
      id, name, phone, line_name, line_id, avatar, current_points, lifetime_points, tier, created_at, shop_ids, updated_at
    ) values (
      ${customer.id},
      ${customer.name},
      ${customer.phone || ''},
      ${customer.lineName || ''},
      ${customer.lineId || ''},
      ${customer.avatar || ''},
      ${Math.max(0, Number(customer.currentPoints) || 0)},
      ${Math.max(0, Number(customer.lifetimePoints) || 0)},
      ${['Member', 'Silver', 'Gold', 'Platinum', 'VIP'].includes(customer.tier) ? customer.tier : 'Member'},
      ${customer.createdAt || new Date().toISOString()}::timestamptz,
      ${JSON.stringify(customer.shopIds || [])}::jsonb,
      now()
    )
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

  await sql`
    insert into point_coupons (
      code, points, shop_id, shop_name, description, created_at, expires_at, is_used, used_by_customer_id, used_at
    ) values (
      ${coupon.code},
      ${Math.max(1, Number(coupon.points) || 1)},
      ${coupon.shopId},
      ${coupon.shopName || ''},
      ${coupon.description || ''},
      ${coupon.createdAt || new Date().toISOString()}::timestamptz,
      ${coupon.expiresAt}::timestamptz,
      true,
      ${customer.id},
      ${coupon.usedAt || new Date().toISOString()}::timestamptz
    )
    on conflict (code) do update set
      points = excluded.points,
      shop_id = excluded.shop_id,
      shop_name = excluded.shop_name,
      description = excluded.description,
      expires_at = excluded.expires_at,
      is_used = true,
      used_by_customer_id = excluded.used_by_customer_id,
      used_at = excluded.used_at
  `;

  await sql`
    insert into transactions (
      id, user_id, user_name, user_phone, shop_id, shop_name, type, points, description, status, reward_id, points_expires_at, created_at
    ) values (
      ${transaction.id},
      ${transaction.userId},
      ${transaction.userName || ''},
      ${transaction.userPhone || ''},
      ${transaction.shopId},
      ${transaction.shopName || ''},
      ${transaction.type},
      ${Math.max(1, Number(transaction.points) || 1)},
      ${transaction.description || ''},
      ${transaction.status || 'completed'},
      ${transaction.rewardId || null},
      ${transaction.pointsExpiresAt || null}::timestamptz,
      ${transaction.createdAt || new Date().toISOString()}::timestamptz
    )
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

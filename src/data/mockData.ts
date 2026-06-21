import { Shop, Customer, Reward, PromoBanner, Transaction, AuditLog, ShopOnboardingChecklist, MembershipTier } from '../types';
import { getDefaultMembershipTiersForShops } from '../lib/membershipTiers';

export const INITIAL_SHOPS: Shop[] = [
  {
    id: 'koffee_craft',
    name: 'Koffee Craft',
    description: 'Specialty coffee roastery and modern brunch bistro.',
    logo: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=150&auto=format&fit=crop&q=60',
    category: 'Cafes & Dining',
    pointsRate: 10, // 10 Baht = 1 Point
    isActive: true,
    registrationStatus: 'approved',
    phone: '0812345678',
    createdAt: '2026-01-10T08:00:00Z',
  },
  {
    id: 'chic_boutique',
    name: 'Chic Boutique',
    description: 'Designer fashion, minimal leather goods and accessories.',
    logo: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=150&auto=format&fit=crop&q=60',
    category: 'Fashion & Apparel',
    pointsRate: 50, // 50 Baht = 1 Point
    isActive: true,
    registrationStatus: 'approved',
    phone: '0898765432',
    createdAt: '2026-02-15T09:30:00Z',
  },
  {
    id: 'hakata_ramen',
    name: 'สึโบะราเมน (TSUBO Ramen)',
    description: 'Authentic rich pork broth ramen from Hakata, Fukuoka.',
    logo: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=150&auto=format&fit=crop&q=60',
    category: 'Japanese Restaurant',
    pointsRate: 20, // 20 Baht = 1 Point
    isActive: true,
    registrationStatus: 'approved',
    phone: '023456789',
    createdAt: '2026-03-01T12:00:00Z',
  },
  // Pending shops for Webmaster approval simulation
  {
    id: 'matcha_land',
    name: 'Matcha Land Café',
    description: 'Premium ceremonial grade matcha bar imported from Uji, Kyoto.',
    logo: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=150&auto=format&fit=crop&q=60',
    category: 'Cafes & Dining',
    pointsRate: 15,
    isActive: false,
    registrationStatus: 'pending',
    phone: '0821112222',
    createdAt: '2026-06-08T04:15:00Z',
  },
  {
    id: 'la_patisserie',
    name: 'La Pâtisserie de Paris',
    description: 'Artisanal French pastries, croissants and custom celebration cakes.',
    logo: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=150&auto=format&fit=crop&q=60',
    category: 'Bakery & Sweets',
    pointsRate: 25,
    isActive: false,
    registrationStatus: 'pending',
    phone: '0834445555',
    createdAt: '2026-06-08T10:30:00Z',
  },
  {
    id: 'active_fit',
    name: 'ActiveFit Gym & Pilates',
    description: 'Boutique health club with modern pilates reformer equipment.',
    logo: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?w=150&auto=format&fit=crop&q=60',
    category: 'Sports & Fitness',
    pointsRate: 100,
    isActive: false,
    registrationStatus: 'pending',
    phone: '0859998888',
    createdAt: '2026-06-09T01:00:00Z',
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'cust_line_user',
    name: 'มนัสพงษ์ ศิริเลิศ',
    phone: '084-555-5555',
    lineName: 'M_Pong_2026',
    lineId: 'U11aa22bb33cc44dd55ee66ff',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=60',
    currentPoints: 480,
    lifetimePoints: 1280,
    tier: 'Silver',
    createdAt: '2026-01-11T10:00:00Z',
  },
  {
    id: 'cust_002',
    name: 'ธัญญารัตน์ สุขใจ',
    phone: '089-111-2222',
    lineName: 'Tanya_Sweet',
    lineId: 'U22bb33cc44dd55ee66ff77gg',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=60',
    currentPoints: 240,
    lifetimePoints: 540,
    tier: 'Silver',
    createdAt: '2026-02-20T14:22:00Z',
  },
  {
    id: 'cust_003',
    name: 'เกริกพล อัครเดช',
    phone: '081-333-4444',
    lineName: 'Kerklive_88',
    lineId: 'U33cc44dd55ee66ff77gg88hh',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=60',
    currentPoints: 85,
    lifetimePoints: 185,
    tier: 'Silver',
    createdAt: '2026-03-12T11:05:00Z',
  },
  {
    id: 'cust_004',
    name: 'นภาพร แจ่มใส',
    phone: '062-888-9999',
    lineName: 'Fah_Napaporn',
    lineId: 'U44dd55ee66ff77gg88hh99ii',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=60',
    currentPoints: 310,
    lifetimePoints: 810,
    tier: 'Silver',
    createdAt: '2026-04-18T16:40:00Z',
  }
];

export const INITIAL_REWARDS: Reward[] = [
  // Koffee Craft Rewards
  {
    id: 'rew_koffee_001',
    name: 'กาแฟแก้วฟรี (ร้อน/เย็น) ทุกเมนู',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&auto=format&fit=crop&q=80',
    description: 'สิทธิ์รับกาแฟแก้วฟรี ได้ทุกรอบ เมนู Specialty Coffee สดใหม่จากโรงคั่วเรา (จำกัดเฉพาะเมนูร้อน/เย็น)',
    pointsCost: 100,
    stock: 45,
    isAvailable: true,
    shopId: 'koffee_craft',
  },
  {
    id: 'rew_koffee_002',
    name: 'ชีสเค้กหน้าไหม้ (Burnt Basque)',
    image: 'https://images.unsplash.com/photo-1524351114678-eb26305a4645?w=400&auto=format&fit=crop&q=80',
    description: 'ชีสเค้กหน้าไหม้ สไตล์ละมุนลิ้น ซิกเนเจอร์ของร้าน นำเข้าวัตถุดิบจากสเปน',
    pointsCost: 180,
    stock: 12,
    isAvailable: true,
    shopId: 'koffee_craft',
  },
  {
    id: 'rew_koffee_003',
    name: 'เมล็ดกาแฟ Koffee Craft Blend (250g)',
    image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400&auto=format&fit=crop&q=80',
    description: 'เมล็ดกาแฟคั่วกลางคราฟต์สูตรลับ เมล็ดอราบิก้าแท้ระดับพรีเมี่ยม นุ่ม ครีมมี่ และฟรุตตี้ปลายๆ',
    pointsCost: 350,
    stock: 8,
    isAvailable: true,
    shopId: 'koffee_craft',
  },
  {
    id: 'rew_koffee_004',
    name: 'บัตรกำนัลแทนเงินสด 500 บาท',
    image: 'https://images.unsplash.com/photo-1580828343064-fde4fc206bc6?w=400&auto=format&fit=crop&q=80',
    description: 'คูปองแทนเงินสด 500 บาท สำหรับใช้บริการ ทานอาหาร และเครื่องดื่มทุกชนิดในเครือร้านค้า Koffee Craft',
    pointsCost: 450,
    stock: 15,
    isAvailable: true,
    shopId: 'koffee_craft',
  },
  {
    id: 'rew_koffee_005',
    name: 'กระบอกเก็บความเย็น Koffee Tumbler',
    image: 'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&auto=format&fit=crop&q=80',
    description: 'กระบอกนํ้าสูญญากาศสแตนเลสพิมพ์ลายนูนพรีเมี่ยม เก็บอุณหภูมิร้อน/เย็นได้สูงสุด 12 ชั่วโมง',
    pointsCost: 650,
    stock: 3,
    isAvailable: true,
    shopId: 'koffee_craft',
  },

  // Chic Boutique Rewards
  {
    id: 'rew_chic_001',
    name: 'กระเป๋าผ้า Canvas Minimalist',
    image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400&auto=format&fit=crop&q=80',
    description: 'กระเป๋าผ้าแคนวาสอย่างดี มินิมอล สกรีนลาย Chic Boutique ออกแบบเฉพาะฤดูกาลนี้',
    pointsCost: 150,
    stock: 20,
    isAvailable: true,
    shopId: 'chic_boutique',
  },
  {
    id: 'rew_chic_002',
    name: 'ส่วนลดซื้อสินค้า 15% (ไม่มีขั้นตํ่า)',
    image: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=400&auto=format&fit=crop&q=80',
    description: 'สิทธิ์รับส่วนลด 15% ในการรับบริการและสั่งซื้อเสื้อผ้าเซ็ตใหม่ทุกคอลเลกชัน',
    pointsCost: 200,
    stock: 999,
    isAvailable: true,
    shopId: 'chic_boutique',
  },

  // Hakata Ramen Rewards
  {
    id: 'rew_ramen_001',
    name: 'ไข่ต้มต้มยำอาจิทามะ ฟรี 1 ฟอง',
    image: 'https://images.unsplash.com/photo-1557872943-16a5ac26437e?w=400&auto=format&fit=crop&q=80',
    description: 'ไข่ต้มยางมะตูมดองซอสมิรินอร่อยเข้มข้นสไตล์ญี่ปุ่นแท้ๆ สำหรับเคียงราเมนแก้วโปรด',
    pointsCost: 30,
    stock: 120,
    isAvailable: true,
    shopId: 'hakata_ramen',
  },
  {
    id: 'rew_ramen_002',
    name: 'เกี๊ยวซ่าทอดกรอบซอสต้มยำ (5 ชิ้น)',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400&auto=format&fit=crop&q=80',
    description: 'เกี๊ยวซ่ากรอบนอก นุ่มใน ราดซอสต้มยำสูตรฟิวชั่นรสแช่บสะใจ',
    pointsCost: 120,
    stock: 50,
    isAvailable: true,
    shopId: 'hakata_ramen',
  }
];

export const INITIAL_BANNERS: PromoBanner[] = [
  {
    id: 'banner_pro_001',
    title: 'Rainy Days Coffee Combo! ☕🌧️',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    description: 'โปรโมชั่นต้อนรับหน้าฝน สั่งลาเต้คู่ครัวซองต์ ลดทันที 20% และรับแต้มคูณสองสูงสุดถึงเสาร์นี้!',
    isAd: false,
    shopId: 'koffee_craft',
    expirationDate: '2026-06-15',
  },
  {
    id: 'banner_ad_002',
    title: 'Line Pay x Quick Loyalty 💳✨',
    image: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=800&auto=format&fit=crop&q=80',
    description: 'พิเศษ! ผูกบัตรเครดิตด้วย LINE Pay ชำระผ่านระบบเป็นครั้งแรก รับแต้มต้อนรับฟรีทันที 50 แต้ม',
    isAd: true,
    url: 'https://line.me',
    expirationDate: '2026-12-31',
  },
  {
    id: 'banner_pro_003',
    title: 'New Season Collection 👗👠',
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&auto=format&fit=crop&q=80',
    description: 'เทรนด์แฟชั่นหน้าร้อน คอลเลกชัน Summer Splash ใหม่ล่าสุดวางจำหน่ายแล้ว ช้อปครบ 2,500 บาทรับ 100 แต้มพรีเมี่ยมสะสม!',
    isAd: false,
    shopId: 'chic_boutique',
    expirationDate: '2026-07-20',
  }
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx_001',
    userId: 'cust_line_user',
    userName: 'มนัสพงษ์ ศิริเลิศ',
    userPhone: '084-555-5555',
    shopId: 'koffee_craft',
    shopName: 'Koffee Craft',
    type: 'earn',
    points: 120,
    description: 'สะสมแต้มจากการซื้อกาแฟและขนมหวานบิลใหญ่',
    status: 'completed',
    createdAt: '2026-05-10T09:12:00Z',
  },
  {
    id: 'tx_002',
    userId: 'cust_line_user',
    userName: 'มนัสพงษ์ ศิริเลิศ',
    userPhone: '084-555-5555',
    shopId: 'koffee_craft',
    shopName: 'Koffee Craft',
    type: 'redeem',
    points: 100,
    description: 'แลกของรางวัล: กาแฟแก้วฟรี (ร้อน/เย็น) ทุกเมนู',
    status: 'completed',
    rewardId: 'rew_koffee_001',
    createdAt: '2026-05-15T15:30:00Z',
  },
  {
    id: 'tx_003',
    userId: 'cust_line_user',
    userName: 'มนัสพงษ์ ศิริเลิศ',
    userPhone: '084-555-5555',
    shopId: 'chic_boutique',
    shopName: 'Chic Boutique',
    type: 'earn',
    points: 80,
    description: 'สะสมแต้มจากการสั่งซือเครื่องแต่งกายสูทลำลอง',
    status: 'completed',
    createdAt: '2026-05-20T11:45:00Z',
  },
  {
    id: 'tx_004',
    userId: 'cust_line_user',
    userName: 'มนัสพงษ์ ศิริเลิศ',
    userPhone: '084-555-5555',
    shopId: 'koffee_craft',
    shopName: 'Koffee Craft',
    type: 'earn',
    points: 50,
    description: 'สะสมแต้มจากโค้ดรหัสรับแต้มกรณีพิเศษส่งท้ายปาร์ตี้ออฟฟิศ',
    status: 'completed',
    createdAt: '2026-06-01T17:20:00Z',
  },
  {
    id: 'tx_005',
    userId: 'cust_line_user',
    userName: 'มนัสพงษ์ ศิริเลิศ',
    userPhone: '084-555-5555',
    shopId: 'koffee_craft',
    shopName: 'Koffee Craft',
    type: 'redeem',
    points: 180,
    description: 'แลกของรางวัล: ชีสเค้กหน้าไหม้ (Burnt Basque)',
    status: 'pending',
    rewardId: 'rew_koffee_002',
    createdAt: '2026-06-08T09:40:00Z',
  },
  {
    id: 'tx_006',
    userId: 'cust_002',
    userName: 'ธัญญารัตน์ สุขใจ',
    userPhone: '089-111-2222',
    shopId: 'koffee_craft',
    shopName: 'Koffee Craft',
    type: 'earn',
    points: 40,
    description: 'ซื้ออาหารเช้าเบเกิลแซลมอนและชาเขียวเย็น',
    status: 'completed',
    createdAt: '2026-06-08T08:15:00Z',
  },
  {
    id: 'tx_007',
    userId: 'cust_003',
    userName: 'เกริกพล อัครเดช',
    userPhone: '081-333-4444',
    shopId: 'koffee_craft',
    shopName: 'Koffee Craft',
    type: 'redeem',
    points: 100,
    description: 'แลกของรางวัล: กาแฟแก้วฟรี (ร้อน/เย็น) ทุกเมนู',
    status: 'pending',
    rewardId: 'rew_koffee_001',
    createdAt: '2026-06-09T01:30:00Z',
  }
];

// Client-side cache helpers.
// Phase 7 final audit: Neon is the source of truth for business data.
// localStorage is kept only as a read cache/UI fallback after API routes confirm writes.
const KEYS = {
  SHOPS: 'crm_platforms_shops',
  CUSTOMERS: 'crm_platform_customers',
  REWARDS: 'crm_platform_rewards',
  BANNERS: 'crm_platform_banners',
  TRANSACTIONS: 'crm_platform_transactions',
  COUPONS: 'crm_platform_generated_coupons',
  AUDIT_LOGS: 'crm_platform_audit_logs',
  ONBOARDING_CHECKLISTS: 'crm_platform_onboarding_checklists',
  MEMBERSHIP_TIERS: 'crm_platform_membership_tiers',
} as const;

type SyncableKey = (typeof KEYS)[keyof typeof KEYS];
type CrmEntity = 'shops' | 'customers' | 'rewards' | 'banners' | 'transactions' | 'coupons' | 'auditLogs' | 'onboardingChecklists' | 'membershipTiers';

export type DatabaseBootstrapResult = {
  source: 'neon' | 'local-fallback' | 'error-fallback';
  message?: string;
};

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

const KEY_TO_ENTITY: Partial<Record<SyncableKey, CrmEntity>> = {
  [KEYS.SHOPS]: 'shops',
  [KEYS.CUSTOMERS]: 'customers',
  [KEYS.REWARDS]: 'rewards',
  [KEYS.BANNERS]: 'banners',
  [KEYS.TRANSACTIONS]: 'transactions',
  [KEYS.COUPONS]: 'coupons',
  [KEYS.AUDIT_LOGS]: 'auditLogs',
  [KEYS.ONBOARDING_CHECKLISTS]: 'onboardingChecklists',
  [KEYS.MEMBERSHIP_TIERS]: 'membershipTiers',
};

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

async function syncEntityToNeon<T>(key: SyncableKey, data: T): Promise<void> {
  if (typeof window === 'undefined') return;

  const entity = KEY_TO_ENTITY[key];
  if (!entity) return;

  const response = await window.fetch('/api/db/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entity, rows: data }),
  });

  let payload: { message?: string } | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.message) {
    throw new Error(payload?.message || `Could not sync ${entity} to Neon.`);
  }
}

export async function syncPointClaimDataToNeon(params: {
  customers: Customer[];
  coupons: GeneratedCoupon[];
  transactions: Transaction[];
}): Promise<void> {
  // Customer rows must be persisted before coupon/transaction rows because
  // point_coupons.used_by_customer_id and transactions.user_id reference customers.id.
  // The legacy fire-and-forget sync can race here, especially in LINE in-app browser.
  // Disabled to prevent full-table MVCC bloat. Use persistPointClaimToNeon instead.
  // await syncEntityToNeon(KEYS.CUSTOMERS, params.customers);
  // await syncEntityToNeon(KEYS.COUPONS, params.coupons);
  // await syncEntityToNeon(KEYS.TRANSACTIONS, params.transactions);
}

export async function persistPointClaimToNeon(params: {
  customer: Customer;
  coupon: GeneratedCoupon;
  transaction: Transaction;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const response = await window.fetch('/api/db/point-claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  let payload: { message?: string; skipped?: boolean } | null = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok || payload?.message) {
    throw new Error(payload?.message || 'บันทึกรับแต้มลง Neon ไม่สำเร็จ');
  }
}

function queueNeonSync<T>(key: SyncableKey, data: T) {
  // Discarded background sync to prevent resource bottlenecks and data corruption.
}

export function getStoredData<T>(key: SyncableKey, defaults: T): T {
  if (!canUseStorage()) {
    return defaults;
  }

  try {
    const data = window.localStorage.getItem(key);
    return data ? JSON.parse(data) : defaults;
  } catch (e) {
    return defaults;
  }
}

export function saveStoredData<T>(key: SyncableKey, data: T, options: { sync?: boolean } = {}): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(data));
    // Background sync is disabled in favor of dedicated online-only API routes.
  } catch (e) {
    console.error('Error saving storage', e);
  }
}

function seedLocalStorageIfEmpty() {
  if (!canUseStorage()) {
    return;
  }

  if (!window.localStorage.getItem(KEYS.SHOPS)) {
    saveStoredData(KEYS.SHOPS, INITIAL_SHOPS, { sync: false });
  }
  if (!window.localStorage.getItem(KEYS.CUSTOMERS)) {
    saveStoredData(KEYS.CUSTOMERS, INITIAL_CUSTOMERS, { sync: false });
  }
  if (!window.localStorage.getItem(KEYS.REWARDS)) {
    saveStoredData(KEYS.REWARDS, INITIAL_REWARDS, { sync: false });
  }
  if (!window.localStorage.getItem(KEYS.BANNERS)) {
    saveStoredData(KEYS.BANNERS, INITIAL_BANNERS, { sync: false });
  }
  if (!window.localStorage.getItem(KEYS.TRANSACTIONS)) {
    saveStoredData(KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS, { sync: false });
  }
  if (!window.localStorage.getItem(KEYS.COUPONS)) {
    saveStoredData(KEYS.COUPONS, [], { sync: false });
  }
  if (!window.localStorage.getItem(KEYS.AUDIT_LOGS)) {
    saveStoredData(KEYS.AUDIT_LOGS, [], { sync: false });
  }
  if (!window.localStorage.getItem(KEYS.ONBOARDING_CHECKLISTS)) {
    saveStoredData(KEYS.ONBOARDING_CHECKLISTS, [], { sync: false });
  }
  if (!window.localStorage.getItem(KEYS.MEMBERSHIP_TIERS)) {
    saveStoredData(KEYS.MEMBERSHIP_TIERS, getDefaultMembershipTiersForShops(INITIAL_SHOPS.map((shop) => shop.id)), { sync: false });
  }
}

export function replaceLocalCacheFromSnapshot(snapshot: {
  shops?: Shop[];
  customers?: Customer[];
  rewards?: Reward[];
  banners?: PromoBanner[];
  transactions?: Transaction[];
  coupons?: GeneratedCoupon[];
  auditLogs?: AuditLog[];
  onboardingChecklists?: ShopOnboardingChecklist[];
  membershipTiers?: MembershipTier[];
}) {
  saveStoredData(KEYS.SHOPS, snapshot.shops || INITIAL_SHOPS, { sync: false });
  saveStoredData(KEYS.CUSTOMERS, snapshot.customers || INITIAL_CUSTOMERS, { sync: false });
  saveStoredData(KEYS.REWARDS, snapshot.rewards || INITIAL_REWARDS, { sync: false });
  saveStoredData(KEYS.BANNERS, snapshot.banners || INITIAL_BANNERS, { sync: false });
  saveStoredData(KEYS.TRANSACTIONS, snapshot.transactions || INITIAL_TRANSACTIONS, { sync: false });
  saveStoredData(KEYS.COUPONS, snapshot.coupons || [], { sync: false });
  saveStoredData(KEYS.AUDIT_LOGS, snapshot.auditLogs || [], { sync: false });
  saveStoredData(KEYS.ONBOARDING_CHECKLISTS, snapshot.onboardingChecklists || [], { sync: false });
  saveStoredData(KEYS.MEMBERSHIP_TIERS, snapshot.membershipTiers || getDefaultMembershipTiersForShops((snapshot.shops || INITIAL_SHOPS).map((shop) => shop.id)), { sync: false });
}

export async function initializeDatabase(): Promise<DatabaseBootstrapResult> {
  if (!canUseStorage()) {
    return { source: 'local-fallback', message: 'Browser localStorage is not available.' };
  }

  seedLocalStorageIfEmpty();

  try {
    const snapshotUrl = `/api/db/snapshot?ts=${Date.now()}`;
    const response = await fetch(snapshotUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    });
    const payload = await response.json();

    if (payload?.source === 'neon' && payload?.data) {
      replaceLocalCacheFromSnapshot(payload.data);
    }

    return {
      source: payload?.source === 'neon' ? 'neon' : response.ok ? 'local-fallback' : 'error-fallback',
      message: payload?.message,
    };
  } catch (error) {
    console.warn('[crm-db] Neon bootstrap failed. Continuing with local cache.', error);
    return { source: 'error-fallback', message: 'Cannot reach database API. Using local cache.' };
  }
}

export function getShops(): Shop[] {
  return getStoredData(KEYS.SHOPS, INITIAL_SHOPS);
}

export function saveShops(shops: Shop[], options: { sync?: boolean } = {}) {
  saveStoredData(KEYS.SHOPS, shops, options);
}

export function getCustomers(): Customer[] {
  return getStoredData(KEYS.CUSTOMERS, INITIAL_CUSTOMERS);
}

export function saveCustomers(customers: Customer[], options: { sync?: boolean } = {}) {
  saveStoredData(KEYS.CUSTOMERS, customers, options);
}

export function getRewards(): Reward[] {
  return getStoredData(KEYS.REWARDS, INITIAL_REWARDS);
}

export function saveRewards(rewards: Reward[], options: { sync?: boolean } = {}) {
  saveStoredData(KEYS.REWARDS, rewards, options);
}

export function getBanners(): PromoBanner[] {
  return getStoredData(KEYS.BANNERS, INITIAL_BANNERS);
}

export function saveBanners(banners: PromoBanner[], options: { sync?: boolean } = {}) {
  saveStoredData(KEYS.BANNERS, banners, options);
}

export function getTransactions(): Transaction[] {
  return getStoredData(KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS);
}

export function saveTransactions(txs: Transaction[], options: { sync?: boolean } = {}) {
  saveStoredData(KEYS.TRANSACTIONS, txs, options);
}

export function getGeneratedCoupons(): GeneratedCoupon[] {
  return getStoredData(KEYS.COUPONS, [] as GeneratedCoupon[]);
}

export function saveGeneratedCoupons(coupons: GeneratedCoupon[], options: { sync?: boolean } = {}) {
  saveStoredData(KEYS.COUPONS, coupons, options);
}


export function getAuditLogs(): AuditLog[] {
  return getStoredData(KEYS.AUDIT_LOGS, [] as AuditLog[]);
}

export function saveAuditLogs(logs: AuditLog[], options: { sync?: boolean } = {}) {
  saveStoredData(KEYS.AUDIT_LOGS, logs, options);
}

export function addAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'> & Partial<Pick<AuditLog, 'id' | 'createdAt'>>, options: { sync?: boolean } = {}) {
  const now = new Date().toISOString();
  const nextLog: AuditLog = {
    ...log,
    id: log.id || `audit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: log.createdAt || now,
  };

  const logs = getAuditLogs();
  saveAuditLogs([nextLog, ...logs].slice(0, 1000), options);
  return nextLog;
}

export function getMembershipTiers(): MembershipTier[] {
  return getStoredData(KEYS.MEMBERSHIP_TIERS, getDefaultMembershipTiersForShops(getShops().map((shop) => shop.id)));
}

export function saveMembershipTiers(tiers: MembershipTier[], options: { sync?: boolean } = {}) {
  saveStoredData(KEYS.MEMBERSHIP_TIERS, tiers, options);
}

export function getOnboardingChecklists(): ShopOnboardingChecklist[] {
  return getStoredData(KEYS.ONBOARDING_CHECKLISTS, [] as ShopOnboardingChecklist[]);
}

export function saveOnboardingChecklists(checklists: ShopOnboardingChecklist[], options: { sync?: boolean } = {}) {
  saveStoredData(KEYS.ONBOARDING_CHECKLISTS, checklists, options);
}

export function getOrCreateOnboardingChecklist(shopId: string): ShopOnboardingChecklist {
  const now = new Date().toISOString();
  const existing = getOnboardingChecklists().find((item) => item.shopId === shopId);
  if (existing) return existing;

  return {
    id: `onboarding_${shopId}`,
    shopId,
    richMenuConfigured: false,
    testedInLineBrowser: false,
    testedCustomerClaim: false,
    testedRewardRedeem: false,
    testDataCleaned: false,
    reviewedCustomerMessages: false,
    readyForPilot: false,
    notes: '',
    createdAt: now,
    updatedAt: now,
  };
}

export function upsertOnboardingChecklist(checklist: ShopOnboardingChecklist) {
  const now = new Date().toISOString();
  const checklists = getOnboardingChecklists();
  const nextChecklist = { ...checklist, updatedAt: now };
  const exists = checklists.some((item) => item.shopId === checklist.shopId);
  const next = exists
    ? checklists.map((item) => (item.shopId === checklist.shopId ? { ...item, ...nextChecklist } : item))
    : [{ ...nextChecklist, createdAt: checklist.createdAt || now }, ...checklists];

  saveOnboardingChecklists(next, { sync: false });
  return nextChecklist;
}

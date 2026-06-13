import type { Customer, PromoBanner, Reward, Shop, Transaction } from '../types';

export const PILOT_SHOPS: Shop[] = [
  {
    id: 'im_sticker',
    name: 'iM Sticker',
    description: 'ร้านค้าหลักสำหรับเริ่มทดสอบระบบสะสมแต้มจริง',
    logo: '',
    category: 'Sticker & Digital Goods',
    pointsRate: 10,
    pointRoundingMode: 'floor',
    minimumPurchaseForPoints: 1,
    pointLinkExpiryDays: 7,
    pointExpiryDays: 365,
    pointExpiryReminderDays: 30,
    isActive: true,
    registrationStatus: 'approved',
    phone: '',
    createdAt: new Date('2026-06-09T00:00:00.000Z').toISOString(),
  },
];

export const PILOT_CUSTOMERS: Customer[] = [
  {
    id: 'cust_pilot_001',
    name: 'ลูกค้าทดสอบ',
    phone: '',
    lineName: 'LINE Customer',
    lineId: 'U_pilot_customer_placeholder',
    avatar: '',
    currentPoints: 0,
    lifetimePoints: 0,
    tier: 'Silver',
    createdAt: new Date('2026-06-09T00:00:00.000Z').toISOString(),
    shopIds: ['im_sticker'],
  },
];

export const PILOT_REWARDS: Reward[] = [];
export const PILOT_BANNERS: PromoBanner[] = [];
export const PILOT_TRANSACTIONS: Transaction[] = [];

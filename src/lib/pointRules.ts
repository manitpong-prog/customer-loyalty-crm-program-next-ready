import type { PointRoundingMode, Shop } from '../types';

export const DEFAULT_POINT_ROUNDING_MODE: PointRoundingMode = 'floor';
export const DEFAULT_MINIMUM_PURCHASE_FOR_POINTS = 1;
export const DEFAULT_POINT_LINK_EXPIRY_DAYS = 7;
export const DEFAULT_POINT_EXPIRY_DAYS = 365;
export const DEFAULT_POINT_EXPIRY_REMINDER_DAYS = 30;

export type NormalizedPointRules = {
  pointsRate: number;
  pointRoundingMode: PointRoundingMode;
  minimumPurchaseForPoints: number;
  pointLinkExpiryDays: number;
  pointExpiryDays: number;
  pointExpiryReminderDays: number;
};

export function getPointRules(shop?: Partial<Shop> | null): NormalizedPointRules {
  const pointsRate = Math.max(1, Math.floor(Number(shop?.pointsRate) || 10));
  const pointRoundingMode = shop?.pointRoundingMode === 'nearest' ? 'nearest' : DEFAULT_POINT_ROUNDING_MODE;
  const minimumPurchaseForPoints = Math.max(0, Math.floor(Number(shop?.minimumPurchaseForPoints ?? DEFAULT_MINIMUM_PURCHASE_FOR_POINTS) || 0));
  const pointLinkExpiryDays = Math.max(1, Math.floor(Number(shop?.pointLinkExpiryDays ?? DEFAULT_POINT_LINK_EXPIRY_DAYS) || DEFAULT_POINT_LINK_EXPIRY_DAYS));
  const pointExpiryDays = Math.max(1, Math.floor(Number(shop?.pointExpiryDays ?? DEFAULT_POINT_EXPIRY_DAYS) || DEFAULT_POINT_EXPIRY_DAYS));
  const pointExpiryReminderDays = Math.max(0, Math.floor(Number(shop?.pointExpiryReminderDays ?? DEFAULT_POINT_EXPIRY_REMINDER_DAYS) || 0));

  return {
    pointsRate,
    pointRoundingMode,
    minimumPurchaseForPoints,
    pointLinkExpiryDays,
    pointExpiryDays,
    pointExpiryReminderDays,
  };
}

export function calculateEarnPoints(amount: number, shop?: Partial<Shop> | null): number {
  const rules = getPointRules(shop);
  const safeAmount = Number(amount) || 0;

  if (!Number.isFinite(safeAmount) || safeAmount < rules.minimumPurchaseForPoints) {
    return 0;
  }

  const rawPoints = safeAmount / rules.pointsRate;
  const roundedPoints = rules.pointRoundingMode === 'nearest'
    ? Math.round(rawPoints)
    : Math.floor(rawPoints);

  return Math.max(0, roundedPoints);
}

export function getPointRuleSummary(shop?: Partial<Shop> | null) {
  const rules = getPointRules(shop);
  const roundingText = rules.pointRoundingMode === 'nearest' ? 'ปัดเศษใกล้สุด' : 'ปัดเศษลง';

  return {
    ...rules,
    roundingText,
    earnText: `ทุก ${rules.pointsRate.toLocaleString('th-TH')} บาท = 1 แต้ม`,
    minimumText: rules.minimumPurchaseForPoints > 0
      ? `ยอดซื้อขั้นต่ำ ${rules.minimumPurchaseForPoints.toLocaleString('th-TH')} บาท`
      : 'ไม่กำหนดยอดซื้อขั้นต่ำ',
    linkExpiryText: `ลิงก์รับแต้มหมดอายุใน ${rules.pointLinkExpiryDays.toLocaleString('th-TH')} วัน`,
    pointExpiryText: `แต้มหมดอายุหลังได้รับ ${rules.pointExpiryDays.toLocaleString('th-TH')} วัน`,
    reminderText: rules.pointExpiryReminderDays > 0
      ? `แจ้งเตือนก่อนหมดอายุ ${rules.pointExpiryReminderDays.toLocaleString('th-TH')} วัน`
      : 'ยังไม่แจ้งเตือนก่อนแต้มหมดอายุ',
  };
}

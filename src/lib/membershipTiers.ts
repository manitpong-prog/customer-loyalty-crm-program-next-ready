import type { MembershipTier, TierType } from '../types';

export const DEFAULT_MEMBERSHIP_TIER_TEMPLATES: Array<Pick<MembershipTier, 'name' | 'minLifetimePoints' | 'benefitText' | 'isActive' | 'sortOrder'>> = [
  { name: 'Member', minLifetimePoints: 0, benefitText: 'สมาชิกทั่วไป', isActive: true, sortOrder: 1 },
  { name: 'Silver', minLifetimePoints: 500, benefitText: 'เห็น badge Silver', isActive: true, sortOrder: 2 },
  { name: 'Gold', minLifetimePoints: 1500, benefitText: 'ได้สิทธิ์โปรโมชันพิเศษ', isActive: true, sortOrder: 3 },
  { name: 'Platinum', minLifetimePoints: 3000, benefitText: 'badge พรีเมี่ยม + สิทธิ์ VIP', isActive: true, sortOrder: 4 },
  { name: 'VIP', minLifetimePoints: 5000, benefitText: 'สิทธิ์สูงสุด', isActive: true, sortOrder: 5 },
];

export const TIER_NAMES: TierType[] = ['Bronze', 'Silver', 'Gold', 'Platinum', 'VIP'];

export function normalizeTierName(name: string | undefined | null): TierType {
  const normalized = String(name || '').trim();
  if (normalized === 'VIP') return 'VIP';
  if (normalized === 'Platinum') return 'Platinum';
  if (normalized === 'Gold') return 'Gold';
  if (normalized === 'Silver') return 'Silver';
  return 'Member';
}

export function getDefaultMembershipTiersForShop(shopId: string): MembershipTier[] {
  const now = new Date().toISOString();
  return DEFAULT_MEMBERSHIP_TIER_TEMPLATES.map((tier) => ({
    id: `tier_${shopId}_${tier.name.toLowerCase()}`,
    shopId,
    name: tier.name,
    minLifetimePoints: tier.minLifetimePoints,
    benefitText: tier.benefitText,
    isActive: tier.isActive,
    sortOrder: tier.sortOrder,
    createdAt: now,
    updatedAt: now,
  }));
}

export function getDefaultMembershipTiersForShops(shopIds: string[]): MembershipTier[] {
  return shopIds.flatMap((shopId) => getDefaultMembershipTiersForShop(shopId));
}

export function getMembershipTiersForShop(allTiers: MembershipTier[], shopId: string): MembershipTier[] {
  const tiers = allTiers.filter((tier) => tier.shopId === shopId);
  const source = tiers.length > 0 ? tiers : getDefaultMembershipTiersForShop(shopId);

  return [...source].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.minLifetimePoints - b.minLifetimePoints;
  });
}

export function resolveMembershipTier(lifetimePoints: number, tiers: MembershipTier[]): TierType {
  const safeLifetimePoints = Math.max(0, Number(lifetimePoints) || 0);
  const activeTiers = [...tiers]
    .filter((tier) => tier.isActive)
    .sort((a, b) => b.minLifetimePoints - a.minLifetimePoints);

  const matched = activeTiers.find((tier) => safeLifetimePoints >= tier.minLifetimePoints) || activeTiers[activeTiers.length - 1];
  return normalizeTierName(matched?.name || 'Member');
}

export function getNextMembershipTier(lifetimePoints: number, tiers: MembershipTier[]): MembershipTier | null {
  const safeLifetimePoints = Math.max(0, Number(lifetimePoints) || 0);
  const sorted = [...tiers]
    .filter((tier) => tier.isActive)
    .sort((a, b) => a.minLifetimePoints - b.minLifetimePoints);

  return sorted.find((tier) => tier.minLifetimePoints > safeLifetimePoints) || null;
}

export function getCurrentMembershipTierConfig(lifetimePoints: number, tiers: MembershipTier[]): MembershipTier {
  const safeLifetimePoints = Math.max(0, Number(lifetimePoints) || 0);
  const sorted = [...tiers]
    .filter((tier) => tier.isActive)
    .sort((a, b) => b.minLifetimePoints - a.minLifetimePoints);

  return sorted.find((tier) => safeLifetimePoints >= tier.minLifetimePoints) || sorted[sorted.length - 1] || getDefaultMembershipTiersForShop('default')[0];
}

export function getTierBadgeClassName(tier: string) {
  const normalized = normalizeTierName(tier);
  if (normalized === 'VIP') return 'bg-fuchsia-500/10 text-fuchsia-700 border border-fuchsia-200';
  if (normalized === 'Platinum') return 'bg-cyan-500/10 text-cyan-700 border border-cyan-200';
  if (normalized === 'Gold') return 'bg-yellow-500/10 text-yellow-700 border border-yellow-200';
  if (normalized === 'Silver') return 'bg-slate-100 text-slate-700 border border-slate-200';
  return 'bg-emerald-500/10 text-emerald-700 border border-emerald-200';
}

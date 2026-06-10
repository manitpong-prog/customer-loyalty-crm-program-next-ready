import type { Customer, PromoBanner, Reward, Shop, Transaction } from "../types";
import type { GeneratedCoupon } from "../data/mockData";

export function normalizeShopId(shopId: string | undefined | null): string {
  return (shopId || "").trim().toLowerCase();
}

export function isShopMatch(rowShopId: string | undefined | null, activeShopId: string): boolean {
  return normalizeShopId(rowShopId) === normalizeShopId(activeShopId);
}

export function scopeApprovedShops(shops: Shop[], activeShopId: string, lockToShop: boolean): Shop[] {
  const approved = shops.filter((shop) => shop.registrationStatus === "approved");
  if (!lockToShop) return approved;
  const scoped = approved.filter((shop) => isShopMatch(shop.id, activeShopId));
  return scoped.length > 0 ? scoped : approved.slice(0, 1);
}

export function filterRewardsByShop(rewards: Reward[], activeShopId: string): Reward[] {
  return rewards.filter((reward) => isShopMatch(reward.shopId, activeShopId));
}

export function filterBannersByShop(banners: PromoBanner[], activeShopId: string, includePlatformAds = true): PromoBanner[] {
  return banners.filter((banner) => {
    if (includePlatformAds && banner.isAd && !banner.shopId) return true;
    return isShopMatch(banner.shopId, activeShopId);
  });
}

export function filterTransactionsByShop(transactions: Transaction[], activeShopId: string): Transaction[] {
  return transactions.filter((transaction) => isShopMatch(transaction.shopId, activeShopId));
}

export function filterCouponsByShop(coupons: GeneratedCoupon[], activeShopId: string): GeneratedCoupon[] {
  return coupons.filter((coupon) => isShopMatch(coupon.shopId, activeShopId));
}

export function customerBelongsToShop(
  customer: Customer,
  activeShopId: string,
  transactions: Transaction[] = [],
  includeUnassigned = false,
): boolean {
  const normalizedShopId = normalizeShopId(activeShopId);
  const shopIds = Array.isArray(customer.shopIds) ? customer.shopIds.map(normalizeShopId).filter(Boolean) : [];

  if (shopIds.includes(normalizedShopId)) return true;
  if (transactions.some((transaction) => isShopMatch(transaction.shopId, normalizedShopId) && transaction.userId === customer.id)) {
    return true;
  }

  // Backward compatibility for old pilot databases that were created before `shopIds` existed.
  return includeUnassigned && shopIds.length === 0;
}

export function filterCustomersByShop(
  customers: Customer[],
  activeShopId: string,
  transactions: Transaction[] = [],
  includeUnassigned = false,
): Customer[] {
  return customers.filter((customer) => customerBelongsToShop(customer, activeShopId, transactions, includeUnassigned));
}

export function attachCustomerToShop(customer: Customer, activeShopId: string): Customer {
  const normalizedShopId = normalizeShopId(activeShopId);
  const current = Array.isArray(customer.shopIds) ? customer.shopIds : [];
  if (current.map(normalizeShopId).includes(normalizedShopId)) return customer;
  return { ...customer, shopIds: [...current, activeShopId] };
}

export function assertCouponBelongsToShop(couponShopId: string | undefined | null, activeShopId: string): boolean {
  return isShopMatch(couponShopId, activeShopId);
}

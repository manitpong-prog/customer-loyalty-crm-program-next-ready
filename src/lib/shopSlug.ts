export const FALLBACK_DEFAULT_SHOP_ID = "im_sticker";
export const FALLBACK_DEFAULT_SHOP_SLUG = "im-sticker";

export function shopIdToSlug(shopId: string | undefined | null): string {
  const normalized = (shopId || FALLBACK_DEFAULT_SHOP_ID).trim().toLowerCase();
  return normalized.replace(/_/g, "-");
}

export function shopSlugToId(shopSlug: string | undefined | null): string {
  const normalized = (shopSlug || FALLBACK_DEFAULT_SHOP_SLUG).trim().toLowerCase();
  return normalized.replace(/-/g, "_");
}

export function getDefaultShopId(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_SHOP_ID || FALLBACK_DEFAULT_SHOP_ID;
}

export function getDefaultShopSlug(): string {
  return process.env.NEXT_PUBLIC_DEFAULT_SHOP_SLUG || shopIdToSlug(getDefaultShopId());
}

export function getDefaultCustomerPath(): string {
  return `/customer/${getDefaultShopSlug()}`;
}

export function getDefaultMerchantPath(): string {
  return `/merchant/${getDefaultShopSlug()}`;
}

export type LineAuthContext = "customer" | "merchant";

export type LineIdentity = {
  lineUserId: string;
  displayName: string;
  pictureUrl?: string;
  customerId?: string;
  ownerShopIds: string[];
  verified: boolean;
  source: "line-id-token" | "line-profile-fallback" | "stored";
  updatedAt: string;
};

export const LINE_IDENTITY_STORAGE_KEY = "im_crm_line_identity_v1";

export function getLineCustomerId(lineUserId: string) {
  return `line_${lineUserId}`;
}

export function readStoredLineIdentity(): LineIdentity | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(LINE_IDENTITY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LineIdentity;
    if (!parsed?.lineUserId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLineIdentity(identity: LineIdentity) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      LINE_IDENTITY_STORAGE_KEY,
      JSON.stringify(identity),
    );
  } catch {
    // localStorage can be unavailable inside some embedded browsers.
  }
}

export function clearLineIdentity() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(LINE_IDENTITY_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function mergeLineIdentity(
  current: LineIdentity | null,
  next: Partial<LineIdentity> & Pick<LineIdentity, "lineUserId" | "displayName">,
): LineIdentity {
  return {
    lineUserId: next.lineUserId,
    displayName: next.displayName,
    pictureUrl: next.pictureUrl ?? current?.pictureUrl,
    customerId: next.customerId ?? current?.customerId,
    ownerShopIds: next.ownerShopIds ?? current?.ownerShopIds ?? [],
    verified: next.verified ?? current?.verified ?? false,
    source: next.source ?? current?.source ?? "stored",
    updatedAt: new Date().toISOString(),
  };
}

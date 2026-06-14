export type PointRoundingMode = 'floor' | 'nearest';

export interface Shop {
  id: string;
  name: string;
  description: string;
  logo: string;
  category: string;
  pointsRate: number; // e.g. 10 Baht = 1 Point
  pointRoundingMode?: PointRoundingMode;
  minimumPurchaseForPoints?: number;
  pointLinkExpiryDays?: number;
  pointExpiryDays?: number;
  pointExpiryReminderDays?: number;
  isActive: boolean;
  registrationStatus: 'pending' | 'approved' | 'rejected';
  phone: string;
  /** Optional merchant-facing settings used by the production pilot UI. */
  welcomeMessage?: string;
  contactText?: string;
  shareMessageTemplate?: string;
  richMenuContactUrl?: string;
  createdAt: string;
}

export type TierType = 'Member' | 'Silver' | 'Gold' | 'Platinum' | 'VIP';

export interface Customer {
  id: string;
  name: string;
  phone: string;
  lineName: string;
  lineId: string;
  avatar: string;
  currentPoints: number;
  lifetimePoints: number;
  tier: TierType;
  createdAt: string;
  /** Shop membership ids. Phase 5A uses this to prevent customer data from leaking across shop routes. */
  shopIds?: string[];
}

export interface Reward {
  id: string;
  name: string;
  image: string;
  description: string;
  pointsCost: number;
  stock: number;
  isAvailable: boolean;
  shopId: string;
}

export interface PromoBanner {
  id: string;
  title: string;
  image: string;
  description: string;
  isAd: boolean; // true = Platform Ad, false = Store Promotion
  shopId?: string; // Empty if it's a platform ad
  url?: string;
  expirationDate: string;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  shopId: string;
  shopName: string;
  type: 'earn' | 'redeem';
  points: number;
  description: string;
  status: 'completed' | 'pending' | 'rejected';
  rewardId?: string; // Optional if type is redeem
  /** For earn transactions, points expire at this timestamp. Redeem/manual deduct rows usually leave this empty. */
  pointsExpiresAt?: string;
  createdAt: string;
}

export interface StoreSession {
  activeShopId: string;
  ownerName: string;
}

export interface MembershipTier {
  id: string;
  shopId: string;
  name: TierType;
  minLifetimePoints: number;
  benefitText: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShopOnboardingChecklist {
  id: string;
  shopId: string;
  richMenuConfigured: boolean;
  testedInLineBrowser: boolean;
  testedCustomerClaim: boolean;
  testedRewardRedeem: boolean;
  testDataCleaned: boolean;
  reviewedCustomerMessages: boolean;
  readyForPilot: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}


export type AuditActorType = 'owner' | 'customer' | 'system';
export type AuditStatusType = 'info' | 'success' | 'warning' | 'danger';

export interface AuditLog {
  id: string;
  shopId: string;
  shopName: string;
  actorType: AuditActorType;
  actorName: string;
  actorId?: string;
  action: string;
  actionLabel: string;
  description: string;
  targetType?: string;
  targetId?: string;
  customerId?: string;
  customerName?: string;
  points?: number;
  status: AuditStatusType;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

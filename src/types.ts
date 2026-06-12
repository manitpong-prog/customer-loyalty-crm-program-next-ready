export interface Shop {
  id: string;
  name: string;
  description: string;
  logo: string;
  category: string;
  pointsRate: number; // e.g. 10 Baht = 1 Point
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

export type TierType = 'Silver' | 'Gold' | 'Platinum';

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
  createdAt: string;
}

export interface StoreSession {
  activeShopId: string;
  ownerName: string;
}

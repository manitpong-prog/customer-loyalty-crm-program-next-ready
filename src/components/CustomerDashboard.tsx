import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Award,
  Sparkles,
  Gift,
  QrCode,
  History,
  User,
  Copy,
  Share2,
  Check,
  Clock,
  RefreshCw,
  Camera,
  AlertCircle,
  CheckCircle2,
  Coffee,
  ShoppingBag,
  Store,
  ChevronRight,
  Compass,
  Bell,
  Home,
} from "lucide-react";
import {
  Customer,
  Reward,
  PromoBanner,
  Transaction,
  Shop,
} from "../types";
import {
  getCustomers,
  saveCustomers,
  getRewards,
  getBanners,
  getTransactions,
  initializeDatabase,
  saveTransactions,
  getShops,
  getGeneratedCoupons,
  saveGeneratedCoupons,
  addAuditLog,
  getMembershipTiers,
  type GeneratedCoupon,
} from "../data/mockData";
import {
  assertCouponBelongsToShop,
  filterBannersByShop,
  filterCustomersByShop,
  filterRewardsByShop,
  filterTransactionsByShop,
} from "../lib/shopScope";
import LineLoginPanel from "./LineLoginPanel";
import { shopIdToSlug } from "../lib/shopSlug";
import { getCurrentMembershipTierConfig, getMembershipTiersForShop, getNextMembershipTier, resolveMembershipTier } from "../lib/membershipTiers";
import { getEarnPointsExpiresAt, getPointRules, isEarnTransactionNearExpiry } from "../lib/pointRules";
import type { LineIdentity } from "../lib/lineAuth";

type CustomerTab = "home" | "rewards" | "code" | "history" | "profile";
type CouponValidationState = "ready" | "used" | "expired" | "wrong-shop" | "not-found";

interface CustomerDashboardProps {
  key?: string;
  currentCustomerId: string;
  onDataChange: () => void;
  selectedShopId: string;
  setSelectedShopId: (id: string) => void;
  initialCouponCode?: string;
  clearInitialCouponCode?: () => void;
  initialTab?: CustomerTab;
  displayMode?: "demo" | "production";
  dataVersion?: number;
  lineIdentity?: LineIdentity | null;
  onLineIdentityChange?: (identity: LineIdentity | null) => void;
}

export default function CustomerDashboard({
  currentCustomerId,
  onDataChange,
  selectedShopId,
  setSelectedShopId,
  initialCouponCode,
  clearInitialCouponCode,
  initialTab = "home",
  displayMode = "demo",
  dataVersion = 0,
  lineIdentity,
  onLineIdentityChange,
}: CustomerDashboardProps) {
  const isProductionView = displayMode === "production";
  // Navigation tabs: 'home', 'rewards', 'code', 'history', 'profile'
  const [activeTab, setActiveTab] = useState<CustomerTab>(initialTab);
  const [historySubTab, setHistorySubTab] = useState<"earn" | "redeem">("earn");

  // Data State
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [shops, setShops] = useState<Shop[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [membershipTiers, setMembershipTiers] = useState(getMembershipTiersForShop(getMembershipTiers(), selectedShopId));

  // Interactive UI States
  const [promoCode, setPromoCode] = useState("");
  const [qrCodeData, setQrCodeData] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isRedeemSuccess, setIsRedeemSuccess] = useState(false);
  const [latestRedeemTransaction, setLatestRedeemTransaction] = useState<Transaction | null>(null);
  const [copiedRedeemLinkId, setCopiedRedeemLinkId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedShopIndex, setCopiedShopIndex] = useState<number | null>(null);
  const [copiedText, setCopiedText] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [scanError, setScanError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerStreamRef = useRef<MediaStream | null>(null);
  const scanFrameRef = useRef<number | null>(null);
  const autoMemberRefreshTimerRef = useRef<number | null>(null);
  const autoMemberRefreshRunningRef = useRef(false);
  const [isAutoLoadingMember, setIsAutoLoadingMember] = useState(false);
  const [autoMemberRefreshAttempt, setAutoMemberRefreshAttempt] = useState(0);

  // Dynamic Coupon States
  const [pendingCoupon, setPendingCoupon] = useState<GeneratedCoupon | null>(null);
  const [showCouponConfirm, setShowCouponConfirm] = useState(false);
  const [isClaimingCoupon, setIsClaimingCoupon] = useState(false);

  const validateCouponForCurrentShop = (coupon?: GeneratedCoupon | null): CouponValidationState => {
    if (!coupon) return "not-found";
    if (!assertCouponBelongsToShop(coupon.shopId, selectedShopId)) return "wrong-shop";
    if (coupon.isUsed) return "used";
    if (new Date() > new Date(coupon.expiresAt)) return "expired";
    return "ready";
  };

  const explainCouponValidation = (state: CouponValidationState) => {
    if (state === "wrong-shop") return "รหัสนี้เป็นของร้านอื่น ไม่สามารถใช้กับร้านนี้ได้";
    if (state === "used") return "รหัสแจกแต้มนี้ถูกใช้งานไปแล้ว ใช้ซ้ำไม่ได้";
    if (state === "expired") return "รหัสแจกแต้มนี้หมดอายุแล้ว โปรดขอลิงก์ใหม่จากร้าน";
    if (state === "not-found") return "ไม่พบข้อมูลรหัสแจกแต้มนี้ กรุณาตรวจสอบรหัสอีกครั้ง";
    return "";
  };

  const getCustomerHomeUrl = () => {
    const liffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID;
    if (liffId) return `https://liff.line.me/${liffId}?tab=home`;

    if (typeof window !== "undefined") {
      return `${window.location.pathname}?tab=home`;
    }

    return "/customer/im-sticker?tab=home";
  };

  const goToCustomerHome = (delay = 0) => {
    if (typeof window === "undefined") return;
    window.setTimeout(() => {
      window.location.href = getCustomerHomeUrl();
    }, delay);
  };

  const getMerchantRedeemUrl = (transaction?: Transaction | null) => {
    if (!transaction) return "";
    const slug = shopIdToSlug(transaction.shopId || selectedShopId);
    const origin = typeof window !== "undefined" ? window.location.origin : "https://im-crm-two.vercel.app";
    return `${origin}/merchant/${slug}?merchantTab=approvals&redeem=${encodeURIComponent(transaction.id)}`;
  };

  const getRedeemRewardName = (transaction?: Transaction | null) => {
    if (!transaction) return selectedReward?.name || "ของรางวัล";
    return transaction.description.replace("ขอแลกรางวัล: ", "").replace(" (ร้านปฏิเสธ - คืนแต้มแล้ว)", "") || selectedReward?.name || "ของรางวัล";
  };

  const buildRedeemShareText = (transaction?: Transaction | null) => {
    if (!transaction) return "";
    const url = getMerchantRedeemUrl(transaction);
    const statusText = transaction.status === "pending" ? "รอร้านอนุมัติ" : transaction.status === "completed" ? "อนุมัติแล้ว" : "ถูกปฏิเสธ/คืนแต้มแล้ว";
    return [
      `คำขอแลกรางวัลจาก ${transaction.userName}`,
      `ร้าน: ${transaction.shopName}`,
      `รายการ: ${getRedeemRewardName(transaction)}`,
      `ใช้แต้ม: ${transaction.points} แต้ม`,
      `สถานะ: ${statusText}`,
      `ลิงก์สำหรับร้านค้า: ${url}`,
    ].join("\n");
  };

  const handleCopyRedeemLink = async (transaction?: Transaction | null) => {
    if (!transaction) return;
    const url = getMerchantRedeemUrl(transaction);

    try {
      await navigator.clipboard.writeText(url);
      setCopiedRedeemLinkId(transaction.id);
      setSuccessMessage("คัดลอกลิงก์สำหรับร้านค้าแล้ว");
      setTimeout(() => setCopiedRedeemLinkId(null), 2200);
      setTimeout(() => setSuccessMessage(""), 2600);
    } catch {
      setErrorMessage("คัดลอกลิงก์ไม่สำเร็จ กรุณากดค้างที่ลิงก์เพื่อคัดลอกเอง");
      setTimeout(() => setErrorMessage(""), 3000);
    }
  };

  const handleShareRedeemLink = async (transaction?: Transaction | null) => {
    if (!transaction) return;
    const url = getMerchantRedeemUrl(transaction);
    const shareText = buildRedeemShareText(transaction);
    const shareTitle = `คำขอแลกรางวัลจาก ${transaction.userName}`;
    const shareTextWithoutUrl = shareText.replace(url, "").trim() || shareTitle;

    try {
      if (window.liff?.shareTargetPicker) {
        await window.liff.shareTargetPicker([{ type: "text", text: shareText }]);
        setSuccessMessage("เปิดหน้าส่งลิงก์ใน LINE แล้ว");
        setTimeout(() => setSuccessMessage(""), 2600);
        return;
      }
    } catch (error) {
      console.warn("[redeem-share] LIFF shareTargetPicker failed, fallback to share URL.", error);
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareTextWithoutUrl, url });
        setSuccessMessage("เปิดหน้าส่งลิงก์แล้ว");
        setTimeout(() => setSuccessMessage(""), 2600);
        return;
      } catch (error) {
        console.warn("[redeem-share] Web Share API cancelled or failed.", error);
      }
    }

    window.open(`https://line.me/R/share?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
    setSuccessMessage("เปิด LINE สำหรับแชร์ลิงก์แล้ว");
    setTimeout(() => setSuccessMessage(""), 2600);
  };

  const extractCodeFromScannedText = (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) return "";

    try {
      const parsedUrl = new URL(trimmed);
      return (
        parsedUrl.searchParams.get("code") ||
        parsedUrl.searchParams.get("coupon") ||
        parsedUrl.searchParams.get("couponCode") ||
        trimmed
      );
    } catch {
      const codeMatch = trimmed.match(/[?&](?:code|coupon|couponCode)=([^&]+)/i);
      if (codeMatch?.[1]) return decodeURIComponent(codeMatch[1]);
      return trimmed;
    }
  };

  const stopCameraScanner = () => {
    if (scanFrameRef.current) {
      window.cancelAnimationFrame(scanFrameRef.current);
      scanFrameRef.current = null;
    }

    if (scannerStreamRef.current) {
      scannerStreamRef.current.getTracks().forEach((track) => track.stop());
      scannerStreamRef.current = null;
    }

    setScanning(false);
    setShowCameraScanner(false);
  };

  useEffect(() => {
    return () => {
      if (scanFrameRef.current) window.cancelAnimationFrame(scanFrameRef.current);
      if (autoMemberRefreshTimerRef.current) window.clearTimeout(autoMemberRefreshTimerRef.current);
      scannerStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  useEffect(() => {
    if (!initialCouponCode) return;

    const codeClean = initialCouponCode.trim().toUpperCase();
    setPromoCode(codeClean);
    setActiveTab("code");

    // When a brand-new LINE user opens a claim link, the member record may be
    // created by LINE auth a moment after this page first renders. Keep the
    // claim code alive and wait until the customer is loaded before opening the
    // confirmation modal. Otherwise the page can land on the code tab without
    // showing the confirm dialog.
    if (isProductionView && !customer) {
      return;
    }

    const coupons = getGeneratedCoupons();
    const matched = coupons.find(
      (c: any) => c.code.toUpperCase() === codeClean,
    );

    if (matched) {
      const couponState = validateCouponForCurrentShop(matched);
      setPendingCoupon(matched);

      if (couponState === "ready") {
        setShowCouponConfirm(true);
        setErrorMessage("");
      } else {
        setShowCouponConfirm(false);
        setErrorMessage(explainCouponValidation(couponState));
        setTimeout(() => setErrorMessage(""), 4500);
      }
    } else {
      setPendingCoupon(null);
      setShowCouponConfirm(false);

      const genericCodes = [
        "WELCOME50",
        "CRM2026",
        "KOFFEELOVER100",
        "CHICSTYLE80",
      ];
      if (!isProductionView && genericCodes.includes(codeClean)) {
        setSuccessMessage(
          `พบรหัสสะสมแต้มแคมเปญ: ${codeClean} โปรดกดปุ่มยืนยันเพื่อรับคะแนนสะสม`,
        );
        setTimeout(() => setSuccessMessage(""), 4500);
      } else {
        setErrorMessage("ไม่พบรหัสนี้ หรือรหัสหมดอายุแล้ว");
        setTimeout(() => setErrorMessage(""), 4500);
      }
    }

    if (clearInitialCouponCode) {
      clearInitialCouponCode();
    }
  }, [initialCouponCode, clearInitialCouponCode, selectedShopId, isProductionView, customer]);

  // Load latest data on mount and tab switch
  const loadData = () => {
    const allTransactions = getTransactions();
    const scopedTransactions = filterTransactionsByShop(allTransactions, selectedShopId);
    const allCustomers = getCustomers();
    const scopedCustomers = filterCustomersByShop(
      allCustomers,
      selectedShopId,
      allTransactions,
      true,
    );
    const lineCustomerId = lineIdentity?.customerId || (lineIdentity?.lineUserId ? `line_${lineIdentity.lineUserId}` : "");
    const currCust =
      (lineCustomerId ? scopedCustomers.find((c) => c.id === lineCustomerId) : undefined) ||
      scopedCustomers.find((c) => c.id === currentCustomerId) ||
      allCustomers.find((c) => c.id === currentCustomerId) ||
      scopedCustomers[0] ||
      allCustomers[0];
    setCustomer(currCust);

    // Production route is locked to one shop slug. Demo can still switch shops.
    const approvedShops = getShops().filter(
      (s) => s.registrationStatus === "approved",
    );
    const scopedShops = isProductionView
      ? approvedShops.filter((s) => s.id === selectedShopId)
      : approvedShops;
    setShops(scopedShops.length > 0 ? scopedShops : approvedShops);

    if (!isProductionView && approvedShops.length > 0 && !approvedShops.some((s) => s.id === selectedShopId)) {
      setSelectedShopId(approvedShops[0].id);
    }

    setRewards(
      filterRewardsByShop(getRewards(), selectedShopId).filter((r) => r.isAvailable && r.stock > 0),
    );
    setBanners(filterBannersByShop(getBanners(), selectedShopId, true));
    setTransactions(scopedTransactions.filter((t) => t.userId === currCust.id));
    setMembershipTiers(getMembershipTiersForShop(getMembershipTiers(), selectedShopId));
  };

  useEffect(() => {
    loadData();
  }, [currentCustomerId, selectedShopId, activeTab, lineIdentity?.lineUserId, lineIdentity?.customerId, dataVersion]);

  useEffect(() => {
    if (customer || !isProductionView || !lineIdentity?.customerId) {
      if (customer) {
        setIsAutoLoadingMember(false);
        setAutoMemberRefreshAttempt(0);
      }
      return;
    }

    if (autoMemberRefreshRunningRef.current) return;

    let cancelled = false;
    const expectedCustomerId = lineIdentity.customerId;

    const wait = (ms: number) =>
      new Promise<void>((resolve) => {
        if (typeof window === "undefined") {
          resolve();
          return;
        }

        autoMemberRefreshTimerRef.current = window.setTimeout(() => {
          autoMemberRefreshTimerRef.current = null;
          resolve();
        }, ms);
      });

    const refreshUntilMemberExists = async () => {
      autoMemberRefreshRunningRef.current = true;
      setIsAutoLoadingMember(true);

      try {
        for (let attempt = 1; attempt <= 8; attempt += 1) {
          if (cancelled) return;

          setAutoMemberRefreshAttempt(attempt);
          await initializeDatabase();

          if (cancelled) return;

          const memberExists = getCustomers().some((member) => member.id === expectedCustomerId);
          if (memberExists) {
            loadData();
            onDataChange();
            setIsAutoLoadingMember(false);
            setAutoMemberRefreshAttempt(0);
            return;
          }

          await wait(attempt <= 3 ? 650 : 1100);
        }
      } finally {
        if (!cancelled) {
          setIsAutoLoadingMember(false);
        }
        autoMemberRefreshRunningRef.current = false;
      }
    };

    refreshUntilMemberExists();

    return () => {
      cancelled = true;
      if (autoMemberRefreshTimerRef.current) {
        window.clearTimeout(autoMemberRefreshTimerRef.current);
        autoMemberRefreshTimerRef.current = null;
      }
      autoMemberRefreshRunningRef.current = false;
    };
  }, [customer, isProductionView, lineIdentity?.customerId, onDataChange, selectedShopId]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
  };

  // Profile Form Fields
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileLineName, setProfileLineName] = useState("");

  useEffect(() => {
    if (customer) {
      setProfileName(customer.name);
      setProfilePhone(customer.phone);
      setProfileLineName(customer.lineName);
    }
  }, [customer, activeTab]);

  if (!customer)
    return (
      <div className="min-h-[100dvh] bg-slate-50">
        <div className="bg-[#06C755] px-4 py-4 text-white shadow-sm">
          <div className="flex items-center gap-2 text-sm font-black">
            <span className="h-2.5 w-2.5 rounded-full bg-white/50" />
            iM Sticker
          </div>
        </div>

        {isProductionView && (
          <LineLoginPanel
            context="customer"
            shopId={selectedShopId}
            onAuthenticated={onLineIdentityChange}
            compact
          />
        )}

        <div className="flex min-h-[55vh] items-center justify-center p-6 text-center">
          <div className="max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="text-sm font-black text-slate-900">
              {isAutoLoadingMember ? "กำลังเตรียมบัตรสมาชิก" : "ยังไม่พบข้อมูลสมาชิกของคุณ"}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              {isAutoLoadingMember
                ? `กำลังโหลดข้อมูลสมาชิกอัตโนมัติ${autoMemberRefreshAttempt ? ` รอบที่ ${autoMemberRefreshAttempt}` : ""} เมื่อพร้อมแล้วจะพาไปหน้าสมาชิกอัตโนมัติ`
                : "ถ้าเพิ่งเข้าสู่ระบบด้วย LINE ระบบจะลองโหลดข้อมูลสมาชิกให้อัตโนมัติ หรือกดโหลดใหม่ได้อีกครั้ง"}
            </p>
            {isAutoLoadingMember && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs font-extrabold text-emerald-700">
                <RefreshCw className="h-4 w-4 animate-spin" />
                กำลังโหลดข้อมูลใหม่...
              </div>
            )}
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={async () => {
                  setIsAutoLoadingMember(true);
                  await initializeDatabase();
                  loadData();
                  onDataChange();
                  setIsAutoLoadingMember(false);
                }}
                className="rounded-2xl bg-slate-950 px-4 py-2 text-xs font-extrabold text-white"
              >
                โหลดข้อมูลใหม่
              </button>
              <button
                type="button"
                onClick={() => {
                  window.location.href = `${window.location.pathname}?resetLine=1`;
                }}
                className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-extrabold text-slate-700"
              >
                ล้างข้อมูล LINE ชั่วคราว
              </button>
            </div>
          </div>
        </div>
      </div>
    );

  // Find Active Shop details
  const activeShop = shops.find((s) => s.id === selectedShopId) || shops[0];
  const recordCustomerAuditLog = (params: {
    action: string;
    actionLabel: string;
    description: string;
    targetType?: string;
    targetId?: string;
    points?: number;
    status?: 'info' | 'success' | 'warning' | 'danger';
    metadata?: Record<string, unknown>;
  }) => {
    if (!customer) return;
    addAuditLog({
      shopId: selectedShopId,
      shopName: activeShop?.name || selectedShopId,
      actorType: 'customer',
      actorName: customer.name || customer.lineName || 'ลูกค้า',
      actorId: customer.id,
      action: params.action,
      actionLabel: params.actionLabel,
      description: params.description,
      targetType: params.targetType,
      targetId: params.targetId,
      customerId: customer.id,
      customerName: customer.name,
      points: params.points,
      status: params.status || 'success',
      metadata: params.metadata || {},
    });
  };
  const activeShopPointRate = Math.max(1, activeShop?.pointsRate || 10);
  const activeShopWelcomeMessage = activeShop?.welcomeMessage || activeShop?.description || "สะสมแต้ม แลกของรางวัล และรับสิทธิพิเศษจากร้านค้า";
  const activeShopContactText = activeShop?.contactText || activeShop?.phone || "ติดต่อร้านค้าเพื่อสอบถามรายละเอียดเพิ่มเติม";
  const displayedCustomerName = customer.name || customer.lineName || "สมาชิก";
  const maskedMemberId = `${(customer.lineId || customer.id).substring(0, 12).toUpperCase()}***`;
  const activeShopPointRules = getPointRules(activeShop);
  const expiringPointTransactions = transactions
    .filter((transaction) => isEarnTransactionNearExpiry(transaction, activeShop))
    .sort((a, b) => new Date(a.pointsExpiresAt || '').getTime() - new Date(b.pointsExpiresAt || '').getTime());
  const expiringPoints = expiringPointTransactions.reduce((sum, transaction) => sum + transaction.points, 0);
  const nearestPointExpiryLabel = expiringPointTransactions[0]?.pointsExpiresAt
    ? new Date(expiringPointTransactions[0].pointsExpiresAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
    : '-';
  const featuredRewards = rewards.slice(0, 3);
  const recentTransactions = [...transactions]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 2);

  const pendingCouponState = validateCouponForCurrentShop(pendingCoupon);
  const pendingCouponExpiryLabel = pendingCoupon
    ? new Date(pendingCoupon.expiresAt).toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
    })
    : "";

  // Point Progress calculate from database-backed membership tiers.
  const currentTierName = resolveMembershipTier(customer.lifetimePoints, membershipTiers);
  const currentTierConfig = getCurrentMembershipTierConfig(customer.lifetimePoints, membershipTiers);
  const nextTierConfig = getNextMembershipTier(customer.lifetimePoints, membershipTiers);
  const tierInfo = {
    next: nextTierConfig?.name || "Maxed",
    target: nextTierConfig?.minLifetimePoints || Math.max(currentTierConfig.minLifetimePoints, customer.lifetimePoints, 1),
    color: nextTierConfig ? "from-amber-600 to-amber-800" : "from-teal-400 to-cyan-500",
  };
  const pointsProgress = nextTierConfig
    ? Math.min(100, Math.max(0, (customer.lifetimePoints / Math.max(1, nextTierConfig.minLifetimePoints)) * 100))
    : 100;

  const processPromoCode = (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      setErrorMessage("กรอกรหัสก่อน");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    // Check dynamic coupons from Neon-backed local cache first
    const coupons = getGeneratedCoupons();
    const matchedCoupon = coupons.find(
      (c: any) => c.code.toUpperCase() === code,
    );

    if (matchedCoupon) {
      const couponState = validateCouponForCurrentShop(matchedCoupon);
      setPendingCoupon(matchedCoupon);
      setActiveTab("code");

      if (couponState !== "ready") {
        setShowCouponConfirm(false);
        setErrorMessage(explainCouponValidation(couponState));
        setTimeout(() => setErrorMessage(""), 3500);
        return;
      }

      // Valid dynamic coupon -> Launch confirmation modal.
      setShowCouponConfirm(true);
      return;
    }

    let pointsEarned = 0;
    let description = "";

    if (isProductionView) {
      setErrorMessage("รหัสนี้ไม่อยู่ในระบบของร้านนี้ กรุณารับรหัสจากร้านค้าอีกครั้ง");
      setTimeout(() => setErrorMessage(""), 3500);
      return;
    }

    if (code === "WELCOME50") {
      pointsEarned = 50;
      description = "รับแต้มต้อนรับ WELCOME50";
    } else if (code === "KOFFEELOVER100" && selectedShopId === "koffee_craft") {
      pointsEarned = 100;
      description = "รับแต้มพิเศษ KOFFEELOVER100";
    } else if (code === "CHICSTYLE80" && selectedShopId === "chic_boutique") {
      pointsEarned = 80;
      description = "รับแต้มพิเศษ CHICSTYLE80";
    } else if (code === "CRM2026") {
      pointsEarned = 150;
      description = "รับแต้มพิเศษ CRM2026";
    } else {
      setErrorMessage("รหัสโค้ดไม่ถูกต้องหรือหมดอายุแล้ว กรุณาลองใหม่อีกครั้ง");
      setTimeout(() => setErrorMessage(""), 3500);
      return;
    }

    // Add points
    const allCustomers = getCustomers();
    const updatedCustomers = allCustomers.map((c) => {
      if (c.id === customer.id) {
        const newPts = c.currentPoints + pointsEarned;
        const newLifetime = c.lifetimePoints + pointsEarned;
        // recalculate tier
        const newTier = resolveMembershipTier(newLifetime, membershipTiers);

        return {
          ...c,
          currentPoints: newPts,
          lifetimePoints: newLifetime,
          tier: newTier,
        };
      }
      return c;
    });

    saveCustomers(updatedCustomers);

    // Create Transaction
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: customer.id,
      userName: customer.name,
      userPhone: customer.phone,
      shopId: selectedShopId,
      shopName: activeShop?.name || "ร้านค้าพาร์ทเนอร์",
      type: "earn",
      points: pointsEarned,
      description,
      status: "completed",
      pointsExpiresAt: getEarnPointsExpiresAt(activeShop),
      createdAt: new Date().toISOString(),
    };

    const currentTxs = getTransactions();
    saveTransactions([newTx, ...currentTxs]);
    recordCustomerAuditLog({
      action: 'customer_promo_code_claimed',
      actionLabel: 'ลูกค้ารับแต้มจากโค้ด',
      description: `${customer.name} รับแต้ม +${pointsEarned.toLocaleString('th-TH')} จากโค้ด ${code}`,
      targetType: 'transaction',
      targetId: newTx.id,
      points: pointsEarned,
      metadata: { code },
    });

    setSuccessMessage(
      `ยินดีด้วย! คุณได้รับ +${pointsEarned} แต้มเรียบร้อยแล้ว`,
    );
    setPromoCode("");
    onDataChange();
    loadData();
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  // Submit manual code
  const handlePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processPromoCode(promoCode);
  };

  const handleDataChangeAfterOnlineClaim = (
    confirmedCustomer: Customer,
    confirmedCoupon: GeneratedCoupon,
    confirmedTransaction: Transaction,
  ) => {
    // Keep the UI responsive after Neon confirms the write. These local updates are
    // cache-only because initializeDatabase() has just refreshed from Neon.
    setCustomer(confirmedCustomer);
    setPendingCoupon(confirmedCoupon);
    setTransactions((current) => {
      const withoutDuplicate = current.filter((tx) => tx.id !== confirmedTransaction.id);
      return [confirmedTransaction, ...withoutDuplicate];
    });
  };

  const handleDeclineDynamicCoupon = () => {
    setShowCouponConfirm(false);
    setPendingCoupon(null);
    setPromoCode("");
    setSuccessMessage("ไม่ได้รับแต้ม กำลังพากลับหน้าแรก");
    goToCustomerHome(700);
  };

  const openCameraScanner = async () => {
    setScanError("");
    setShowCameraScanner(true);
    setScanning(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("เบราว์เซอร์นี้ยังไม่รองรับการเปิดกล้อง");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      scannerStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      const BarcodeDetectorConstructor = (window as any).BarcodeDetector;
      if (!BarcodeDetectorConstructor) {
        setScanError("เครื่องนี้ยังไม่รองรับการอ่าน QR อัตโนมัติ กรุณากรอกรหัสจาก QR ด้วยตัวเอง");
        setScanning(false);
        return;
      }

      const detector = new BarcodeDetectorConstructor({ formats: ["qr_code"] });

      const scanFrame = async () => {
        if (!scannerStreamRef.current || !videoRef.current) return;

        try {
          const barcodes = await detector.detect(videoRef.current);
          const rawValue = barcodes?.[0]?.rawValue;
          if (rawValue) {
            const detectedCode = extractCodeFromScannedText(rawValue).trim().toUpperCase();
            stopCameraScanner();
            setPromoCode(detectedCode);
            processPromoCode(detectedCode);
            return;
          }
        } catch {
          // Keep scanning. Some browsers throw while video is still warming up.
        }

        scanFrameRef.current = window.requestAnimationFrame(scanFrame);
      };

      scanFrameRef.current = window.requestAnimationFrame(scanFrame);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : "เปิดกล้องไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setScanning(false);
    }
  };

  // Confirm claim points via Dynamic Coupon modal overlay.
  // Phase 7A: online-only. The customer receives points only after Neon confirms
  // customer update + coupon used + transaction insert. LocalStorage becomes cache only.
  const handleConfirmClaimDynamicCoupon = async () => {
    if (!pendingCoupon || !customer || isClaimingCoupon) return;

    const coupons = getGeneratedCoupons();
    const matched = coupons.find(
      (c: any) => c.code.toUpperCase() === pendingCoupon.code.toUpperCase(),
    ) || pendingCoupon;

    const couponState = validateCouponForCurrentShop(matched);
    if (couponState !== "ready") {
      setErrorMessage(explainCouponValidation(couponState));
      setShowCouponConfirm(false);
      return;
    }

    setIsClaimingCoupon(true);
    setErrorMessage("");

    try {
      const response = await fetch('/api/db/point-claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          couponCode: matched.code,
          shopId: selectedShopId,
          customer: {
            id: customer.id,
            name: displayedCustomerName || customer.name,
            phone: customer.phone || '',
            lineName: customer.lineName || lineIdentity?.displayName || displayedCustomerName || customer.name,
            lineId: customer.lineId || lineIdentity?.lineUserId || '',
            avatar: customer.avatar || lineIdentity?.pictureUrl || '',
            createdAt: customer.createdAt,
          },
        }),
      });

      const payload = await response.json().catch(() => null) as {
        ok?: boolean;
        message?: string;
        customer?: Customer;
        coupon?: GeneratedCoupon;
        transaction?: Transaction;
      } | null;

      if (!response.ok || !payload?.ok || !payload.customer || !payload.coupon || !payload.transaction) {
        throw new Error(payload?.message || 'บันทึกรับแต้มลงฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
      }

      // Refresh the whole local cache from Neon so customer page and merchant back office
      // read the same database-confirmed values on the next render/page refresh.
      await initializeDatabase();
      handleDataChangeAfterOnlineClaim(payload.customer, payload.coupon, payload.transaction);

      setShowCouponConfirm(false);
      setSuccessMessage(
        `รับแต้ม ${payload.transaction.points.toLocaleString('th-TH')} แต้มแล้ว กำลังพากลับหน้าแรก`,
      );
      setPromoCode("");
      setPendingCoupon(null);
      onDataChange();
      loadData();
      goToCustomerHome(1300);
    } catch (error) {
      console.error('[point-claim-online]', error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'บันทึกรับแต้มลงฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง',
      );
      setShowCouponConfirm(false);
    } finally {
      setIsClaimingCoupon(false);
    }
  };

  // QR Simulator Scan
  const simulateScan = (
    points: number,
    shopName: string,
    shopId: string,
    desc: string,
  ) => {
    setScanning(true);
    setTimeout(() => {
      const allCustomers = getCustomers();
      const updatedCustomers = allCustomers.map((c) => {
        if (c.id === customer.id) {
          const newPts = c.currentPoints + points;
          const newLifetime = c.lifetimePoints + points;
          const newTier = resolveMembershipTier(newLifetime, membershipTiers);

          return {
            ...c,
            currentPoints: newPts,
            lifetimePoints: newLifetime,
            tier: newTier,
          };
        }
        return c;
      });
      saveCustomers(updatedCustomers);

      const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        userId: customer.id,
        userName: customer.name,
        userPhone: customer.phone,
        shopId: shopId,
        shopName: shopName,
        type: "earn",
        points,
        description: `สแกนคิวอาร์โค้ดรับแต้มหน้าร้าน: ${desc}`,
        status: "completed",
        pointsExpiresAt: getEarnPointsExpiresAt(activeShop),
        createdAt: new Date().toISOString(),
      };

      const currentTxs = getTransactions();
      saveTransactions([newTx, ...currentTxs]);
      recordCustomerAuditLog({
        action: 'customer_qr_points_claimed',
        actionLabel: 'ลูกค้าสแกนรับแต้ม',
        description: `${customer.name} สแกนรับแต้ม +${points.toLocaleString('th-TH')} จาก ${shopName}`,
        targetType: 'transaction',
        targetId: newTx.id,
        points,
        metadata: { shopId, shopName, desc },
      });

      setScanning(false);
      setSuccessMessage(
        `สแกนสำเร็จแล้ว! ได้รับ +${points} แต้ม จากร้าน ${shopName}`,
      );
      onDataChange();
      loadData();
      setTimeout(() => setSuccessMessage(""), 4000);
    }, 1200);
  };

  // Open Redemption Drawer/Modal
  const selectRewardForRedeem = (reward: Reward) => {
    setSelectedReward(reward);
    setIsRedeemSuccess(false);
    setLatestRedeemTransaction(null);
  };

  // Confirm Redeem
  const handleConfirmRedeem = () => {
    if (!selectedReward || !customer) return;

    const latestReward = getRewards().find(
      (reward) => reward.id === selectedReward.id && reward.shopId === selectedShopId,
    );

    if (!latestReward || !latestReward.isAvailable) {
      setErrorMessage("ของรางวัลนี้ไม่เปิดให้แลกในขณะนี้ กรุณาเลือกรายการอื่น");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    if (latestReward.stock <= 0) {
      setErrorMessage("ของรางวัลนี้หมดสต็อกแล้ว กรุณาติดต่อร้านค้า");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    if (customer.currentPoints < latestReward.pointsCost) {
      setErrorMessage("แต้มสะสมของคุณไม่เพียงพอสำหรับการแลกของรางวัลชิ้นนี้");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    setIsRedeeming(true);

    // Short delay for a friendlier mobile/LINE OA interaction.
    setTimeout(() => {
      const allCustomers = getCustomers();
      const updatedCustomers = allCustomers.map((c) => {
        if (c.id === customer.id) {
          return {
            ...c,
            currentPoints: c.currentPoints - latestReward.pointsCost,
          };
        }
        return c;
      });
      saveCustomers(updatedCustomers);

      // Create Pending Transaction. Merchant confirms handover in /merchant/im-sticker.
      const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        userId: customer.id,
        userName: customer.name,
        userPhone: customer.phone,
        shopId: selectedShopId,
        shopName: activeShop?.name || "ร้านค้าพาร์ทเนอร์",
        type: "redeem",
        points: latestReward.pointsCost,
        description: `ขอแลกรางวัล: ${latestReward.name}`,
        status: "pending",
        rewardId: latestReward.id,
        createdAt: new Date().toISOString(),
      };

      const currentTxs = getTransactions();
      saveTransactions([newTx, ...currentTxs]);
      recordCustomerAuditLog({
        action: 'customer_reward_redeemed',
        actionLabel: 'ลูกค้าแลกรางวัล',
        description: `${customer.name} ขอแลกรางวัล “${latestReward.name}” ใช้ ${latestReward.pointsCost.toLocaleString('th-TH')} แต้ม`,
        targetType: 'transaction',
        targetId: newTx.id,
        points: -Math.abs(latestReward.pointsCost),
        metadata: { rewardId: latestReward.id, rewardName: latestReward.name },
      });

      setSelectedReward(latestReward);
      setLatestRedeemTransaction(newTx);
      setIsRedeeming(false);
      setIsRedeemSuccess(true);
      onDataChange();
      loadData();
    }, 900);
  };

  // Update Profile
  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) return;

    const allCustomers = getCustomers();
    const updated = allCustomers.map((c) => {
      if (c.id === customer.id) {
        return {
          ...c,
          name: profileName,
          phone: profilePhone,
          lineName: profileLineName,
        };
      }
      return c;
    });

    saveCustomers(updated);
    setSuccessMessage("บันทึกข้อมูลโปรไฟล์แล้ว");
    onDataChange();
    loadData();
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  return (
    <div
      className={
        isProductionView
          ? "relative min-h-[100dvh] bg-[#fbfaf6] font-sans text-[#24120b] flex flex-col w-full max-w-md mx-auto overflow-hidden"
          : "relative min-h-[720px] bg-[#fbfaf6] font-sans text-[#24120b] flex flex-col max-w-[420px] mx-auto sm:border-[8px] sm:border-[#1f1712] rounded-[40px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(55,36,18,0.18)] border border-[#e7ded2]"
      }
    >
      {/* Premium customer header */}
      <div className="bg-[#fbfaf6]/95 px-5 pt-5 pb-3 select-none border-b border-[#eadfce]/70">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[30px] leading-none font-black tracking-tight text-[#2a140a]">
                {activeShop?.name || "iM Sticker"}
              </h1>
              <Sparkles className="h-5 w-5 text-[#c9942f]" />
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] font-extrabold tracking-wide text-[#6f5b43]">
              <span className="h-1.5 w-1.5 rotate-45 bg-[#d7a63d]" />
              <span>สมาชิกสะสมแต้ม</span>
              <span className="h-1.5 w-1.5 rotate-45 bg-[#d7a63d]" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isProductionView && (
              <div className="relative">
                <select
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="rounded-2xl border border-[#d6c7b3] bg-white px-3 py-2 pr-7 text-[10px] font-extrabold text-[#3a2116] outline-none shadow-sm appearance-none cursor-pointer"
                >
                  {shops.map((s) => (
                    <option key={s.id} value={s.id} className="bg-white text-slate-800 text-xs">
                      {s.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[#9b7651] text-[8px] font-black">
                  ▼
                </div>
              </div>
            )}
            <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-[#e6d8c6] bg-white text-[#2a140a] shadow-sm">
              <Bell className="h-5 w-5" />
              <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#d7a63d] ring-2 ring-white" />
            </div>
          </div>
        </div>
      </div>

      {isProductionView && (
        <LineLoginPanel
          context="customer"
          shopId={selectedShopId}
          onAuthenticated={onLineIdentityChange}
          compact
        />
      )}

      {/* Success / Error Notification banners floating */}
      <AnimatePresence>
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="absolute top-14 left-4 right-4 bg-emerald-600 text-white p-3.5 rounded-2xl shadow-lg z-50 flex items-center gap-2 text-xs"
          >
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{successMessage}</span>
          </motion.div>
        )}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="absolute top-14 left-4 right-4 bg-rose-600 text-white p-3.5 rounded-2xl shadow-lg z-50 flex items-center gap-2 text-xs"
          >
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="font-semibold">{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Area / Body with flex grow */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-4 scrollbar-none bg-[#fbfaf6]">
        {/* TAB 1: HOME */}
        {activeTab === "home" && (
          <div className="space-y-5">
            {/* Member greeting */}
            <section className="rounded-[28px] border border-[#eadfce] bg-white/80 p-4 shadow-[0_18px_38px_-26px_rgba(60,32,12,0.45)]">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="h-20 w-20 overflow-hidden rounded-full border-[3px] border-[#e7bf69] bg-white shadow-[0_10px_30px_-18px_rgba(55,36,18,0.55)]">
                      <img
                        src={customer.avatar}
                        alt={displayedCustomerName}
                        className="h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-[#06C755] text-[8px] font-black text-white shadow-md">
                      LINE
                    </div>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-[#5f5144]">สวัสดีค่ะ</p>
                    <h2 className="mt-0.5 truncate text-[22px] font-black leading-tight tracking-tight text-[#24120b]">
                      {displayedCustomerName}
                    </h2>
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-[#d6c7b3] bg-[#fbf7ef] px-3 py-1 text-[10px] font-black text-[#4a3626] shadow-sm">
                      <Award className="h-3.5 w-3.5 text-[#b8872d]" />
                      {currentTierName.toUpperCase()} MEMBER
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab("code")}
                  className="shrink-0 rounded-2xl border border-[#3b2b21] bg-white px-3.5 py-2.5 text-[11px] font-black text-[#2b1a12] shadow-[0_10px_28px_-24px_rgba(43,26,18,0.5)] transition active:scale-[0.98]"
                >
                  <span className="flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-[#9b7651]" />
                    รับแต้ม
                  </span>
                </button>
              </div>
            </section>

            {/* Platinum member card */}
            <motion.section
              initial={{ scale: 0.97, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="relative overflow-hidden rounded-[26px] border border-[#c9a45b] bg-[#f9f2e6] p-5 text-[#2a140a] shadow-[0_24px_44px_-28px_rgba(85,54,19,0.65)]"
              style={{
                background:
                  "radial-gradient(circle at 9% 12%, rgba(232, 185, 90, 0.72), rgba(255,255,255,0) 33%), radial-gradient(circle at 92% 18%, rgba(216, 219, 221, 0.92), rgba(255,255,255,0) 36%), linear-gradient(135deg, #f8df9d 0%, #fffaf0 45%, #e7e7e7 100%)",
              }}
            >
              <div className="pointer-events-none absolute -left-16 top-8 h-40 w-72 rotate-[-15deg] rounded-full border border-white/55 opacity-60" />
              <div className="pointer-events-none absolute -right-20 top-10 h-44 w-80 rotate-[-18deg] rounded-full border border-white/70 opacity-80" />
              <div className="pointer-events-none absolute inset-0 gold-shimmer opacity-45" />

              <div className="relative flex justify-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d6a846]/50 bg-[#c89435] text-white shadow-lg">
                  <Award className="h-7 w-7" />
                </div>
              </div>

              <div className="relative mt-3 text-center">
                <p className="text-[11px] font-black tracking-[0.16em] text-[#a8761f]">LOYALTY PRIVILEGE CLUB</p>
                <h3 className="mt-1 text-[22px] font-black tracking-wide text-[#2a140a]">
                  {currentTierName.toUpperCase()} MEMBER
                </h3>
                <div className="mx-auto mt-2 h-px w-24 bg-gradient-to-r from-transparent via-[#c89a45] to-transparent" />
              </div>

              <div className="relative mt-5 grid grid-cols-[1fr_1.35fr_1fr] items-end gap-3">
                <div className="space-y-1 border-r border-[#d8c4a2] pr-3">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[#836848]">MEMBER ID</p>
                  <p className="break-all font-mono text-[11px] font-black text-[#2a140a]">{maskedMemberId}</p>
                </div>
                <div className="text-center">
                  <p className="text-[12px] font-black text-[#4f3c2c]">แต้มคงเหลือ</p>
                  <p className="mt-0.5 font-mono text-[46px] font-black leading-none tracking-tight text-[#24120b]">
                    {customer.currentPoints.toLocaleString()}
                  </p>
                  <p className="mt-1 text-[12px] font-black text-[#4f3c2c]">คะแนน</p>
                </div>
                <div className="space-y-1 border-l border-[#d8c4a2] pl-3 text-right">
                  <p className="text-[10px] font-black uppercase tracking-wide text-[#836848]">VALID THRU</p>
                  <p className="text-[11px] font-black text-[#2a140a]">{nearestPointExpiryLabel}</p>
                </div>
              </div>

              <div className="relative mt-5 flex items-center justify-between border-t border-[#d8c4a2] pt-3 text-[12px] font-black">
                <span className="text-[#4f3c2c]">แต้มใกล้หมดอายุใน {activeShopPointRules.pointExpiryReminderDays.toLocaleString("th-TH")} วัน</span>
                <span className="text-red-600">{expiringPoints.toLocaleString()} คะแนน</span>
              </div>
            </motion.section>

            {/* Quick stats */}
            <section className="grid grid-cols-3 gap-2.5">
              {[
                { icon: Coffee, label: "แต้มคงเหลือ", value: customer.currentPoints.toLocaleString(), suffix: "คะแนน" },
                { icon: Sparkles, label: "แต้มสะสมทั้งหมด", value: customer.lifetimePoints.toLocaleString(), suffix: "คะแนน" },
                { icon: Clock, label: "แต้มใกล้หมดอายุ", value: expiringPoints.toLocaleString(), suffix: "คะแนน", danger: true },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-[#eadfce] bg-white p-3 shadow-[0_14px_34px_-30px_rgba(55,36,18,0.5)]">
                  <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#8a6936,#2d2119)] text-white shadow-sm">
                    <item.icon className="h-4 w-4" />
                  </div>
                  <p className="text-[9px] font-extrabold leading-tight text-[#5f5144]">{item.label}</p>
                  <p className={`mt-1 font-mono text-[18px] font-black leading-none ${item.danger ? "text-red-600" : "text-[#24120b]"}`}>{item.value}</p>
                  <p className="mt-0.5 text-[9px] font-bold text-[#6f6254]">{item.suffix}</p>
                </div>
              ))}
            </section>

            {activeShop?.isActive === false && (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-800">
                ร้านนี้ปิดใช้งานชั่วคราว บางฟังก์ชันอาจยังไม่เปิดให้ใช้งาน กรุณาติดต่อร้านก่อนรับแต้มหรือแลกรางวัล
              </div>
            )}

            {/* Recommended rewards */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black tracking-tight text-[#24120b]">รางวัลแนะนำ</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("rewards")}
                  className="flex items-center gap-1 text-[12px] font-black text-[#4a3626]"
                >
                  ดูทั้งหมด <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {featuredRewards.map((rew, index) => (
                  <button
                    key={rew.id}
                    type="button"
                    onClick={() => selectRewardForRedeem(rew)}
                    className="overflow-hidden rounded-2xl border border-[#eadfce] bg-white text-left shadow-[0_14px_32px_-30px_rgba(55,36,18,0.55)] transition active:scale-[0.98]"
                  >
                    <div className="relative h-20 overflow-hidden bg-[#f5eee4]">
                      <img src={rew.imageUrl || rew.image} alt={rew.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                      {index === 0 && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-[#2a140a]/90 px-2 py-0.5 text-[8px] font-black text-[#f4c767]">
                          ยอดนิยม
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 p-2.5">
                      <p className="line-clamp-2 min-h-[28px] text-[10px] font-black leading-tight text-[#24120b]">{rew.name}</p>
                      <div className="flex items-center gap-1.5">
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#d9a72f] text-[9px] font-black text-white">P</span>
                        <span className="font-mono text-[12px] font-black text-[#2a140a]">{rew.pointsCost.toLocaleString()}</span>
                        <span className="text-[9px] font-bold text-[#5f5144]">คะแนน</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Latest history */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black tracking-tight text-[#24120b]">ประวัติล่าสุด</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("history")}
                  className="flex items-center gap-1 text-[12px] font-black text-[#4a3626]"
                >
                  ดูทั้งหมด <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="overflow-hidden rounded-3xl border border-[#eadfce] bg-white shadow-[0_14px_34px_-30px_rgba(55,36,18,0.45)]">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((t, index) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActiveTab("history")}
                      className={`flex w-full items-center justify-between gap-3 p-3 text-left ${index > 0 ? "border-t border-[#efe6d8]" : ""}`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3eee7] text-[#4a2a18]">
                          {t.type === "earn" ? <Coffee className="h-5 w-5" /> : <Gift className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[12px] font-black text-[#24120b]">{t.description}</p>
                          <p className="mt-0.5 text-[10px] font-semibold text-[#7a6b5b]">
                            {new Date(t.createdAt).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <span className={`font-mono text-[13px] font-black ${t.type === "earn" ? "text-[#16833a]" : "text-red-600"}`}>
                          {t.type === "earn" ? `+${t.points}` : `-${t.points}`} คะแนน
                        </span>
                        <ChevronRight className="h-4 w-4 text-[#7a6b5b]" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-5 text-center text-[12px] font-bold text-[#7a6b5b]">ยังไม่มีประวัติล่าสุด</div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: REWARDS */}
        {activeTab === "rewards" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-amber-600" />
                ของรางวัลจากร้าน {activeShop?.name}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium font-sans">
                เลือกของรางวัลที่ต้องการแลก แล้วรอให้ร้านยืนยันตอนรับของ
              </p>
            </div>

            {/* Active Shop details banner inside rewards */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-3 flex items-center gap-3 shadow-sm">
              <img
                src={activeShop?.logoUrl || activeShop?.logo}
                className="w-10 h-10 rounded-full object-cover border border-slate-100"
                referrerPolicy="no-referrer"
              />
              <div>
                <p className="text-xs font-bold text-slate-900">
                  {activeShop?.name}
                </p>
                <p className="text-[10px] text-slate-500 font-semibold">
                  {activeShop?.category} • สะสม {activeShopPointRate} บ. = 1 แต้ม
                </p>
              </div>
            </div>

            {/* Rewards Filter grid */}
            <div className="grid grid-cols-2 gap-3">
              {rewards.map((rew) => {
                const canRedeem = customer.currentPoints >= rew.pointsCost;
                return (
                  <div
                    key={rew.id}
                    onClick={() => selectRewardForRedeem(rew)}
                    className="bg-white border border-slate-200/60 hover:border-slate-300 rounded-2xl overflow-hidden flex flex-col h-[210px] cursor-pointer transition active:scale-[0.97] shadow-sm"
                  >
                    <div className="h-24 relative overflow-hidden">
                      <img
                        src={rew.imageUrl || rew.image}
                        alt={rew.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 left-2 bg-slate-900/90 px-2 py-0.5 rounded-lg text-[9px] font-mono font-extrabold text-amber-400 shadow-sm">
                        ⚡ {rew.pointsCost} แต้ม
                      </div>
                      <div
                        className={`absolute bottom-2 right-2 text-[8px] font-black px-2.5 py-0.5 rounded-full shadow-sm text-white ${canRedeem ? "bg-emerald-600" : "bg-slate-500/80"}`}
                      >
                        {canRedeem ? "พร้อมแลก" : "แต้มไม่พอ"}
                      </div>
                    </div>
                    <div className="p-2.5 flex-1 flex flex-col justify-between">
                      <div className="space-y-0.5">
                        <h4 className="text-[11px] font-extrabold text-slate-900 line-clamp-1">
                          {rew.name}
                        </h4>
                        <p className="text-[9.5px] text-slate-500 line-clamp-2 leading-relaxed">
                          {rew.description}
                        </p>
                      </div>
                      <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono font-bold mt-1 pt-1.5 border-t border-slate-100">
                        <span>คงเหลือ: {rew.stock} ชิ้น</span>
                        <span className="text-amber-600 font-black">
                          กดแลกรางวัล
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {rewards.length === 0 && (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white space-y-2.5 shadow-sm">
                <Gift className="w-8 h-8 mx-auto stroke-1 text-slate-300" />
                <p className="text-xs font-semibold">
                  ตอนนี้ยังไม่มีของรางวัลให้แลก
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ENTER CODE */}
        {activeTab === "code" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-600" />
                รับแต้มจากร้าน {activeShop?.name}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                ถ้าร้านส่งลิงก์หรือ QR แจกแต้มมาให้ เปิดลิงก์แล้วกดยืนยันรับแต้มได้จากหน้านี้
              </p>
            </div>

            {pendingCoupon && (
              <div className={`rounded-3xl border p-4.5 shadow-sm space-y-3.5 ${pendingCouponState === "ready"
                ? "bg-emerald-50 border-emerald-200"
                : "bg-rose-50 border-rose-200"
                }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-[10px] font-mono font-black uppercase tracking-[0.18em] ${pendingCouponState === "ready" ? "text-emerald-700" : "text-rose-700"
                      }`}>
                      {pendingCouponState === "ready" ? "พบรหัสรับแต้มแล้ว" : "รหัสนี้ใช้ไม่ได้"}
                    </p>
                    <h4 className="mt-1 text-base font-black text-slate-950">
                      {pendingCouponState === "ready" ? `รับ +${pendingCoupon.points} แต้ม` : "ไม่สามารถรับแต้มได้"}
                    </h4>
                    <p className="mt-1 text-[11px] font-semibold text-slate-600 leading-relaxed">
                      {pendingCouponState === "ready"
                        ? pendingCoupon.description
                        : explainCouponValidation(pendingCouponState)}
                    </p>
                  </div>
                  <div className={`rounded-2xl px-3 py-2 text-center font-mono font-black ${pendingCouponState === "ready"
                    ? "bg-white text-emerald-700 border border-emerald-200"
                    : "bg-white text-rose-700 border border-rose-200"
                    }`}>
                    <span className="block text-lg leading-none">+{pendingCoupon.points}</span>
                    <span className="text-[9px]">แต้ม</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 rounded-2xl bg-white/80 p-3 text-[10px] font-bold text-slate-600 border border-white">
                  <div className="flex justify-between gap-3">
                    <span>ร้านค้า:</span>
                    <span className="text-slate-950 text-right">{pendingCoupon.shopName}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>รหัส:</span>
                    <span className="font-mono text-slate-950 text-right">{pendingCoupon.code}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span>หมดอายุ:</span>
                    <span className="text-amber-700 text-right">{pendingCouponExpiryLabel}</span>
                  </div>
                </div>

                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={handleDeclineDynamicCoupon}
                    className="flex-1 rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-xs font-extrabold text-slate-700 shadow-sm"
                  >
                    ไม่รับ
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmClaimDynamicCoupon}
                    disabled={pendingCouponState !== "ready" || isClaimingCoupon}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-black shadow-sm transition active:scale-[0.98] ${pendingCouponState === "ready" && !isClaimingCoupon
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed"
                      }`}
                  >
                    {isClaimingCoupon ? "กำลังบันทึก..." : "ยืนยัน"}
                  </button>
                </div>
              </div>
            )}

            {/* Manual Promo code entry */}
            <form
              onSubmit={handlePromoSubmit}
              className="bg-white border border-slate-200/80 p-4.5 rounded-3xl space-y-3.5 shadow-sm"
            >
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700">
                  กรอกรหัสจากร้านค้า
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="เช่น CPN-IS-50-ABCDE"
                    className="bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-xs text-slate-900 uppercase font-bold px-3.5 py-2.5 rounded-xl flex-1 outline-none transition"
                  />
                  <button
                    type="submit"
                    className="bg-stone-900 hover:bg-black text-white font-extrabold text-xs px-4.5 py-2.5 rounded-xl transition active:scale-95 shadow-sm cursor-pointer"
                  >
                    ตรวจรหัส
                  </button>
                </div>
                {isProductionView && (
                  <button
                    type="button"
                    onClick={openCameraScanner}
                    className="mt-2.5 w-full rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-extrabold text-emerald-800 flex items-center justify-center gap-2 active:scale-[0.98] transition"
                  >
                    <Camera className="w-4 h-4" />
                    เปิดกล้องเพื่อสแกนคิวอาร์โค้ด
                  </button>
                )}
              </div>

              {isProductionView ? (
                <div className="bg-emerald-50 rounded-2xl p-3 space-y-2 text-[10.5px] border border-emerald-100 text-emerald-900">
                  <p className="font-extrabold">รับแต้มได้ 2 วิธี</p>
                  <ol className="list-decimal list-inside space-y-1 font-semibold leading-relaxed">
                    <li>เปิดลิงก์รับแต้มที่ร้านส่งให้ใน LINE</li>
                    <li>สแกน QR หรือกรอกรหัสจากหน้าร้าน</li>
                    <li>กดยืนยันรับแต้ม แล้วระบบจะพากลับหน้าแรกให้เอง</li>
                  </ol>
                </div>
              ) : (
                <div className="bg-slate-50/80 rounded-2xl p-3 space-y-2 text-[10px] border border-slate-200/60 shadow-inner">
                  <p className="text-amber-700 font-bold">
                    รหัสทดสอบสำหรับหน้า demo:
                  </p>
                  <div className="grid grid-cols-2 gap-2 font-mono text-slate-500 font-semibold">
                    <div
                      className="flex justify-between hover:text-slate-900 cursor-pointer pr-1 transition"
                      onClick={() => setPromoCode("WELCOME50")}
                    >
                      <span>• WELCOME50</span>
                      <span className="text-emerald-600 font-bold text-[9px]">
                        (+50)
                      </span>
                    </div>
                    <div
                      className="flex justify-between hover:text-slate-900 cursor-pointer pr-1 transition"
                      onClick={() => setPromoCode("CRM2026")}
                    >
                      <span>• CRM2026</span>
                      <span className="text-emerald-600 font-bold text-[9px]">
                        (+150)
                      </span>
                    </div>
                    <div
                      className="flex justify-between hover:text-slate-900 cursor-pointer pr-1 transition"
                      onClick={() => setPromoCode("KOFFEELOVER100")}
                    >
                      <span>• KOFFEELOVER100</span>
                      <span className="text-emerald-600 font-bold text-[9px]">
                        (+100)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </form>

            {/* QR Scan Simulation interface - hidden from production customer route */}
            {!isProductionView && (
              <div className="bg-white border border-slate-200/80 p-4.5 rounded-3xl space-y-3.5 shadow-sm">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-extrabold text-slate-800">
                    สแกนคิวอาร์โค้ดรับแต้มหน้าร้าน
                  </h4>
                  <Camera className="w-4 h-4 text-slate-400" />
                </div>

                <div className="relative border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 aspect-video flex flex-col justify-center items-center overflow-hidden p-4 text-center shadow-inner">
                  {scanning ? (
                    <div className="space-y-3">
                      <div className="w-9 h-9 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
                      <p className="text-[11px] font-mono font-bold text-slate-500">
                        กำลังสแกนรับแต้ม...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center mx-auto text-amber-600 shadow-sm">
                        <QrCode className="w-7 h-7" />
                      </div>
                      <p className="text-xs font-semibold text-slate-500">
                        กดปุ่มด้านล่างเพื่อทดสอบการรับแต้ม
                      </p>
                    </div>
                  )}

                  {scanning && (
                    <div className="absolute left-0 right-0 h-0.5 bg-amber-500 top-0 shadow-lg animate-bounce duration-[1500ms]" />
                  )}
                </div>

                <div className="space-y-2.5">
                  <span className="text-[9px] uppercase font-mono text-slate-400 font-bold block">
                    ตัวอย่างรับแต้ม:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        simulateScan(
                          50,
                          activeShop?.name || "ร้านค้าพาร์ทเนอร์",
                          activeShop?.id || "shop-1",
                          "สแกนด่วนกิจกรรมเช้า",
                        )
                      }
                      disabled={scanning}
                      className="bg-slate-900 hover:bg-black text-white text-[10.5px] font-bold p-3 rounded-xl cursor-pointer text-center active:scale-95 transition shadow-sm"
                    >
                      🚀 รับ 50 แต้ม ({activeShop?.name})
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        simulateScan(
                          100,
                          activeShop?.name || "ร้านค้าพาร์ทเนอร์",
                          activeShop?.id || "shop-1",
                          "โปรด่วนพิเศษซื้อครบ 500",
                        )
                      }
                      disabled={scanning}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-[10.5px] font-bold p-3 rounded-xl cursor-pointer text-center active:scale-95 transition shadow-sm"
                    >
                      🔥 รับ 100 แต้ม ({activeShop?.name})
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-600" />
                ประวัติของคุณ
              </h3>
              <p className="text-[10px] text-slate-500 font-medium font-sans">
                ดูรายการรับแต้ม แลกรางวัล และสถานะล่าสุดได้ที่นี่
              </p>
            </div>

            {/* Split Switcher (earn / redeem) */}
            <div className="flex border-b border-slate-200 text-xs select-none">
              <button
                type="button"
                onClick={() => setHistorySubTab("earn")}
                className={`flex-1 text-center py-2.5 font-bold transition duration-155 cursor-pointer ${historySubTab === "earn" ? "text-amber-600 border-b-2 border-amber-600" : "text-slate-500 hover:text-slate-700"}`}
              >
                การสะสมแต้ม
              </button>
              <button
                type="button"
                onClick={() => setHistorySubTab("redeem")}
                className={`flex-1 text-center py-2.5 font-bold transition duration-155 cursor-pointer ${historySubTab === "redeem" ? "text-amber-600 border-b-2 border-amber-600" : "text-slate-500 hover:text-slate-700"}`}
              >
                ประวัติแลกของรางวัล
              </button>
            </div>

            {/* Transactions lists */}
            <div className="space-y-3">
              {transactions
                .filter((t) =>
                  historySubTab === "earn"
                    ? t.type === "earn"
                    : t.type === "redeem",
                )
                .map((t) => (
                  <div
                    key={t.id}
                    className="bg-white border border-slate-200/60 rounded-2xl p-3.5 space-y-2 shadow-sm"
                  >
                    <div className="flex justify-between items-start text-xs">
                      <div>
                        <span className="font-extrabold text-slate-900">
                          {t.shopName}
                        </span>
                        <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-mono mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {new Date(t.createdAt).toLocaleDateString("th-TH", {
                              hour: "numeric",
                              minute: "numeric",
                            })}
                          </span>
                        </div>
                      </div>

                      {/* Point numeric visual */}
                      <span
                        className={`font-mono font-black text-sm ${t.type === "earn" ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {t.type === "earn" ? `+${t.points}` : `-${t.points}`}
                      </span>
                    </div>

                    <p className="text-[10.5px] text-slate-500 font-medium font-sans leading-relaxed">
                      {t.description}
                    </p>

                    {/* REDEEM specific status layout with verification details */}
                    {t.type === "redeem" && (
                      <div className="pt-2 mt-2 border-t border-slate-100 space-y-2.5">
                        <div className="flex justify-between items-center text-[9px] font-mono font-bold">
                          <span className="text-slate-400">สถานะรายการ:</span>
                          <div className="flex items-center gap-1">
                            {t.status === "pending" && (
                              <>
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                                <span className="text-amber-600 font-bold uppercase">
                                  รออนุมัติหน้าร้าน
                                </span>
                              </>
                            )}
                            {t.status === "completed" && (
                              <>
                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                <span className="text-emerald-600 font-bold uppercase">
                                  อนุมัติแล้ว
                                </span>
                              </>
                            )}
                            {t.status === "rejected" && (
                              <>
                                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                                <span className="text-rose-500 font-bold uppercase text-decoration-line: line-through">
                                  ยกเลิก
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 space-y-2">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                              ลิงก์สำหรับส่งให้ร้านค้า
                            </p>
                            <p className="mt-1 break-all text-[9.5px] font-mono font-bold text-slate-600 leading-relaxed">
                              {getMerchantRedeemUrl(t)}
                            </p>
                          </div>
                          <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-[9.5px] font-bold text-amber-700 leading-relaxed">
                            ลูกค้าสามารถคัดลอกลิงก์นี้ส่งให้ร้านค้าอีกครั้งได้ตลอดจนกว่าร้านค้าจะอนุมัติหรือปฏิเสธรายการ
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => handleShareRedeemLink(t)}
                              className="rounded-xl bg-[#06C755] px-3 py-2.5 text-[10px] font-black text-white active:scale-95 transition flex items-center justify-center gap-1.5"
                            >
                              <Share2 className="w-3.5 h-3.5" /> แชร์ LINE
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopyRedeemLink(t)}
                              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[10px] font-black text-slate-700 active:scale-95 transition flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              {copiedRedeemLinkId === t.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              {copiedRedeemLinkId === t.id ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

              {transactions.filter((t) =>
                historySubTab === "earn"
                  ? t.type === "earn"
                  : t.type === "redeem",
              ).length === 0 && (
                  <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white shadow-sm space-y-1">
                    <History className="w-8 h-8 mx-auto stroke-1 text-slate-300" />
                    <p className="text-xs mt-2 font-bold text-slate-500">
                      {historySubTab === "earn" ? "ยังไม่มีประวัติรับแต้ม" : "ยังไม่มีประวัติแลกรางวัล"}
                    </p>
                    <p className="text-[10px] font-medium leading-relaxed">
                      {historySubTab === "earn"
                        ? "เมื่อรับแต้มจากร้าน รายการจะแสดงในหน้านี้"
                        : "เมื่อแลกรางวัลแล้ว คุณสามารถติดตามสถานะได้ที่นี่"}
                    </p>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* TAB 5: PROFILE */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-600" />
                โปรไฟล์สมาชิก
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                แก้ไขชื่อและเบอร์โทรสำหรับให้ร้านติดต่อหรือยืนยันของรางวัล
              </p>
            </div>

            <div className="bg-white border border-slate-200/70 rounded-3xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={customer.avatar}
                  className="w-12 h-12 rounded-full object-cover border border-slate-100"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0">
                  <p className="text-xs font-black text-slate-950 truncate">
                    {customer.lineName || customer.name}
                  </p>
                  <p className="text-[10px] text-slate-500 font-semibold">
                    สมาชิกของร้าน {activeShop?.name || "iM Sticker"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10.5px] font-bold">
                <div className="rounded-2xl bg-slate-50 p-3 border border-slate-100">
                  <p className="text-slate-400">วันที่สมัคร</p>
                  <p className="text-slate-800 mt-1">
                    {new Date(customer.createdAt).toLocaleDateString("th-TH")}
                  </p>
                </div>
                <div className="rounded-2xl bg-amber-50 p-3 border border-amber-100">
                  <p className="text-amber-700">แต้มที่ใช้ได้</p>
                  <p className="text-amber-900 mt-1 font-black">{customer.currentPoints} แต้ม</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/70 rounded-3xl p-4 shadow-sm">
              <p className="text-[10px] font-black text-slate-500">ติดต่อร้าน</p>
              <p className="text-xs font-bold text-slate-800 mt-1 leading-relaxed">{activeShopContactText}</p>
            </div>

            {/* Profile editing form */}
            <form
              onSubmit={handleUpdateProfile}
              className="bg-white border border-slate-200/80 p-4.5 rounded-3xl space-y-4 shadow-sm"
            >
              <div className="flex items-center gap-3.5 pb-3.5 border-b border-slate-100">
                <img
                  src={customer.avatar}
                  className="w-14 h-14 rounded-full object-cover border border-slate-100 shadow-sm"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="text-xs font-extrabold text-slate-900">
                    {customer.lineName}
                  </h4>
                  <p className="text-[9px] text-slate-400 font-mono font-semibold">
                    ข้อมูลจาก LINE
                  </p>
                  <span className="inline-block mt-1 bg-amber-500/10 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-full border border-amber-500/20 shadow-sm">
                    👑 ระดับ {currentTierName}
                  </span>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold">
                    ชื่อ-นามสกุล
                  </label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-xs text-slate-800 px-3.5 py-2.5 rounded-xl outline-none transition"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold">
                    เบอร์โทรศัพท์
                  </label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-xs text-slate-800 px-3.5 py-2.5 rounded-xl outline-none transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold">
                    ชื่อใน LINE
                  </label>
                  <input
                    type="text"
                    value={profileLineName}
                    onChange={(e) => setProfileLineName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-xs text-slate-800 px-3.5 py-2.5 rounded-xl outline-none transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-stone-900 hover:bg-black active:scale-[0.98] text-white font-extrabold text-xs py-2.5 rounded-xl transition shadow-md cursor-pointer"
              >
                บันทึกการเปลี่ยนแปลง
              </button>
            </form>

            {/* Level Privileges Info Card */}
            <div className="bg-amber-50/50 border border-amber-200/65 p-4 rounded-2xl space-y-2.5 text-[10.5px] shadow-sm">
              <span className="text-[11px] font-extrabold text-amber-900">
                สิทธิพิเศษประจำระดับ {currentTierName} :
              </span>
              <ul className="space-y-1.5 text-stone-700 list-disc list-inside font-semibold font-sans">
                <li>สะสมแต้มแลกเครื่องดื่มและของรางวัลพิเศษหน้าร้าน</li>
                <li>
                  รับสิทธิ์ร่วมกิจกรรมพิเศษของร้านตามเงื่อนไข
                </li>
                {(currentTierName === "Platinum" || currentTierName === "VIP") ? (
                  <>
                    <li className="text-amber-700 font-bold">
                      ส่วนลดวันเกิดทันที 20% และเค้กวันเกิดจานพิเศษฟรี
                    </li>
                    <li className="text-amber-700 font-bold">
                      มีโอกาสแลกของรางวัลพิเศษก่อนสมาชิกทั่วไป
                    </li>
                  </>
                ) : (
                  <li>สะสมแต้มให้ถึงระดับถัดไปเพื่ออัปเกรด badge สมาชิก</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* FIXED FOOTER TAB MENU (Premium customer theme) */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2 select-none">
        <div className="relative mx-auto flex h-[74px] max-w-md items-center justify-around rounded-[28px] border border-[#e5dccf] bg-white/95 shadow-[0_18px_42px_-22px_rgba(36,18,11,0.45)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setActiveTab("home")}
            className={`relative flex h-full w-14 flex-col items-center justify-center gap-1 transition ${activeTab === "home" ? "text-[#24120b]" : "text-[#5f6368]"}`}
          >
            <Home className={`h-5 w-5 ${activeTab === "home" ? "fill-[#20314b] stroke-[#20314b]" : "stroke-[#5f6368]"}`} />
            <span className="text-[10px] font-black">หน้าแรก</span>
            {activeTab === "home" && <span className="absolute bottom-2 h-1 w-7 rounded-full bg-[#20314b]" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("rewards")}
            className={`relative flex h-full w-14 flex-col items-center justify-center gap-1 transition ${activeTab === "rewards" ? "text-[#24120b]" : "text-[#5f6368]"}`}
          >
            <Gift className={`h-5 w-5 ${activeTab === "rewards" ? "stroke-[#20314b]" : "stroke-[#5f6368]"}`} />
            <span className="text-[10px] font-black">รางวัล</span>
            {activeTab === "rewards" && <span className="absolute bottom-2 h-1 w-7 rounded-full bg-[#20314b]" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("code")}
            className="-mt-9 flex h-[74px] w-[74px] flex-col items-center justify-center gap-1 rounded-full border-[3px] border-[#f6e1a7] bg-[radial-gradient(circle_at_35%_20%,#30496c,#111a29)] text-white shadow-[0_16px_32px_-14px_rgba(17,26,41,0.85)] transition active:scale-[0.97]"
          >
            <QrCode className="h-6 w-6" />
            <span className="text-[10px] font-black leading-none">รับแต้ม</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`relative flex h-full w-14 flex-col items-center justify-center gap-1 transition ${activeTab === "history" ? "text-[#24120b]" : "text-[#5f6368]"}`}
          >
            <History className={`h-5 w-5 ${activeTab === "history" ? "stroke-[#20314b]" : "stroke-[#5f6368]"}`} />
            <span className="text-[10px] font-black">ประวัติ</span>
            {activeTab === "history" && <span className="absolute bottom-2 h-1 w-7 rounded-full bg-[#20314b]" />}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`relative flex h-full w-14 flex-col items-center justify-center gap-1 transition ${activeTab === "profile" ? "text-[#24120b]" : "text-[#5f6368]"}`}
          >
            <User className={`h-5 w-5 ${activeTab === "profile" ? "stroke-[#20314b]" : "stroke-[#5f6368]"}`} />
            <span className="text-[10px] font-black">โปรไฟล์</span>
            {activeTab === "profile" && <span className="absolute bottom-2 h-1 w-7 rounded-full bg-[#20314b]" />}
          </button>
        </div>
      </div>

      {/* POPUP 1: Card Details QR Modal */}
      <AnimatePresence>
        {showQrModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex flex-col justify-center items-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-sm text-center relative space-y-5 shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="absolute top-4 right-5 text-slate-400 hover:text-slate-800 font-mono text-lg font-bold transition cursor-pointer"
              >
                ✕
              </button>

              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-amber-650 tracking-wider">
                  คิวอาร์สมาชิกของคุณ
                </h4>
                <p className="text-[10.5px] text-slate-500 font-semibold font-sans">
                  ยื่นหน้านี้ให้ร้านสแกนหรือใช้ยืนยันสมาชิก
                </p>
              </div>

              {/* Simulated QR Code box */}
              <div className="bg-white p-4 rounded-2xl w-44 h-44 mx-auto flex flex-col items-center justify-center border-4 border-amber-400 shadow-md relative">
                <QrCode className="w-36 h-36 text-slate-900" />
                {/* Simulated scan green line scanning */}
                <div className="absolute top-2 left-2 right-2 h-0.5 bg-emerald-500 opacity-60 animate-bounce" />
              </div>

              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-100 space-y-1 shadow-inner">
                <p className="text-[10px] text-slate-400 font-mono font-bold">
                  รหัสสมาชิก
                </p>
                <p className="text-xs font-bold font-mono tracking-widest text-slate-800">
                  {customer.phone.replace(/-/g, "")}-
                  {customer.lineId.substring(1, 5).toUpperCase()}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="bg-stone-900 hover:bg-black text-white font-extrabold text-xs px-6 py-2.5 rounded-xl active:scale-95 transition shadow-md cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* POPUP 2: Selected Reward Redemption Modal Drawer */}
      <AnimatePresence>
        {selectedReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex justify-center items-end"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="bg-white border-t border-slate-200 rounded-t-[32px] p-5 w-full space-y-4 max-h-[85%] overflow-y-auto shadow-2xl"
            >
              <div className="flex justify-between items-center pb-2.5 border-b border-slate-100">
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  รายละเอียดของรางวัล
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedReward(null)}
                  className="text-slate-400 hover:text-slate-800 transition text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <img
                  src={selectedReward.imageUrl || selectedReward.image}
                  alt={selectedReward.name}
                  className="w-full h-32 object-cover rounded-2xl border border-slate-100"
                  referrerPolicy="no-referrer"
                />

                <div className="space-y-1">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-extrabold text-slate-900">
                      {selectedReward.name}
                    </h4>
                    <span className="text-amber-700 font-mono font-black text-xs bg-amber-50 px-3 py-0.5 rounded-full border border-amber-200/50">
                      {selectedReward.pointsCost} แต้ม
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-relaxed pt-1 font-semibold font-sans">
                    {selectedReward.description}
                  </p>
                </div>

                {/* Point deduction calculation check representation */}
                <div className="bg-slate-50 rounded-2xl p-3.5 text-[10.5px] space-y-2 border border-slate-150/80 shadow-inner">
                  <div className="flex justify-between text-slate-500">
                    <span>แต้มสะสมมีอยู่:</span>
                    <span className="font-mono font-bold text-slate-700">
                      {customer.currentPoints} แต้ม
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>แต้มที่ใช้แลก:</span>
                    <span className="font-mono font-bold text-rose-600">
                      -{selectedReward.pointsCost} แต้ม
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 text-slate-650 font-bold">
                    <span>แต้มคงเหลือ:</span>
                    <span
                      className={`font-mono ${customer.currentPoints - selectedReward.pointsCost >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                    >
                      {customer.currentPoints - selectedReward.pointsCost} แต้ม
                    </span>
                  </div>
                </div>

                {/* Action button conditional state */}
                {!isRedeemSuccess ? (
                  <div className="pt-2">
                    {customer.currentPoints >= selectedReward.pointsCost ? (
                      <button
                        type="button"
                        onClick={handleConfirmRedeem}
                        disabled={isRedeeming}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs py-3 rounded-xl transition duration-150 active:scale-95 text-center block cursor-pointer shadow-md"
                      >
                        {isRedeeming
                          ? "กำลังส่งคำขอ..."
                          : "ยืนยันแลกรางวัล"}
                      </button>
                    ) : (
                      <div className="text-center p-3 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-600 font-bold">
                        แต้มของคุณยังไม่พอสำหรับรางวัลนี้
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4.5 text-center space-y-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <div className="space-y-1">
                      <h5 className="text-xs font-black text-emerald-600">
                        ส่งคำขอแลกรางวัลแล้ว
                      </h5>
                      <p className="text-[10px] font-semibold text-slate-500 leading-relaxed px-5 font-sans">
                        ส่งลิงก์นี้ให้ร้านค้า เพื่อให้ร้านเปิดรายการรออนุมัติและกดยืนยันเมื่อส่งมอบของรางวัลแล้ว
                      </p>
                    </div>

                    {latestRedeemTransaction && (
                      <div className="rounded-2xl bg-white border border-emerald-100 p-3 text-left space-y-2 shadow-sm">
                        <p className="text-[9px] font-black text-emerald-700 uppercase tracking-wider">
                          ลิงก์สำหรับส่งให้ร้านค้า
                        </p>
                        <p className="break-all text-[9.5px] font-mono font-bold text-slate-600 leading-relaxed">
                          {getMerchantRedeemUrl(latestRedeemTransaction)}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleShareRedeemLink(latestRedeemTransaction)}
                            className="rounded-xl bg-[#06C755] px-3 py-2 text-[10px] font-black text-white active:scale-95 transition flex items-center justify-center gap-1.5"
                          >
                            <Share2 className="w-3.5 h-3.5" /> แชร์ไปที่ LINE
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopyRedeemLink(latestRedeemTransaction)}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] font-black text-slate-700 active:scale-95 transition flex items-center justify-center gap-1.5"
                          >
                            {copiedRedeemLinkId === latestRedeemTransaction.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            {copiedRedeemLinkId === latestRedeemTransaction.id ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
                          </button>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReward(null);
                        setActiveTab("history");
                        setHistorySubTab("redeem");
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 font-extrabold text-white text-[10.5px] px-4.5 py-2 rounded-xl active:scale-95 transition cursor-pointer"
                    >
                      ดูสถานะในประวัติ
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Camera QR Scanner Modal */}
      <AnimatePresence>
        {showCameraScanner && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 20 }}
              className="bg-white rounded-[28px] p-4 w-full max-w-sm space-y-4 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900">
                    สแกน QR รับแต้ม
                  </h4>
                  <p className="text-[10.5px] text-slate-500 font-semibold mt-1">
                    นำกล้องไปส่อง QR ที่ร้านสร้างให้ ระบบจะอ่านรหัสให้อัตโนมัติ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={stopCameraScanner}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-700"
                >
                  ปิด
                </button>
              </div>

              <div className="relative overflow-hidden rounded-3xl bg-slate-900 aspect-square border border-slate-200">
                <video
                  ref={videoRef}
                  className="h-full w-full object-cover"
                  playsInline
                  muted
                />
                <div className="absolute inset-8 rounded-3xl border-2 border-emerald-400/80 shadow-[0_0_0_999px_rgba(15,23,42,0.35)]" />
                {scanning && (
                  <div className="absolute left-10 right-10 top-1/2 h-0.5 bg-emerald-400 shadow-lg animate-pulse" />
                )}
              </div>

              {scanError ? (
                <div className="rounded-2xl bg-amber-50 border border-amber-100 p-3 text-[10.5px] font-semibold text-amber-800 leading-relaxed">
                  {scanError}
                </div>
              ) : (
                <p className="text-center text-[10.5px] font-semibold text-slate-500">
                  กำลังรออ่าน QR Code...
                </p>
              )}

              <button
                type="button"
                onClick={stopCameraScanner}
                className="w-full rounded-2xl bg-slate-950 py-2.5 text-xs font-extrabold text-white"
              >
                ยกเลิกการสแกน
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎟️ Dynamic Coupon Claim Confirmation Modal */}
      <AnimatePresence>
        {showCouponConfirm && pendingCoupon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white border border-slate-200 rounded-[32px] p-5 w-full max-w-sm text-center space-y-4 shadow-2xl relative"
            >
              <div className="absolute -top-10 left-12 right-12 mx-auto w-16 h-16 rounded-full bg-emerald-50 border-4 border-white flex items-center justify-center text-emerald-500 shadow-md">
                <Sparkles className="w-8 h-8 animate-pulse text-emerald-500" />
              </div>

              <div className="pt-6 space-y-1">
                <span className="text-[9.5px] tracking-wider text-emerald-600 font-mono font-bold uppercase block animate-pulse">
                  พบสิทธิ์รับแต้ม
                </span>
                <h4 className="text-base font-black text-slate-900">
                  รับแต้มจากร้าน {pendingCoupon.shopName}
                </h4>
                <p className="text-xs text-slate-500 font-bold font-sans">
                  จำนวน {pendingCoupon.points} แต้ม
                </p>
              </div>

              {/* Points display card */}
              <div className="bg-emerald-50/55 rounded-2xl p-4 border border-emerald-100 space-y-1 shadow-inner">
                <span className="text-[10px] text-slate-500 block font-bold">
                  จำนวนแต้มที่คุณจะได้รับ
                </span>
                <span className="text-3xl font-black font-mono text-emerald-600 block">
                  +{pendingCoupon.points}{" "}
                  <span className="text-xs font-bold">แต้ม</span>
                </span>
                <p className="text-[10px] text-slate-500 font-semibold font-sans">
                  รายละเอียด: {pendingCoupon.description}
                </p>
              </div>

              {/* Security info list */}
              <div className="text-left bg-slate-50 p-3.5 rounded-2xl border border-slate-150 text-[10px] space-y-1 text-slate-500 font-mono font-bold">
                <div className="flex justify-between">
                  <span>รหัสคูปอง:</span>
                  <span className="text-slate-800 font-black">
                    {pendingCoupon.code}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>เวลาหมดอายุ:</span>
                  <span className="text-amber-750 font-black">
                    {new Date(pendingCoupon.expiresAt).toLocaleTimeString(
                      "th-TH",
                      { hour: "2-digit", minute: "2-digit" },
                    )}{" "}
                    น.
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>เงื่อนไข:</span>
                  <span className="text-emerald-600">
                    ใช้รับแต้มได้ 1 ครั้งเท่านั้น
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleDeclineDynamicCoupon}
                  disabled={isClaimingCoupon}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2.5 font-bold rounded-xl transition cursor-pointer"
                >
                  ไม่รับ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClaimDynamicCoupon}
                  disabled={isClaimingCoupon}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition active:scale-[0.98] cursor-pointer"
                >
                  {isClaimingCoupon ? "กำลังบันทึก..." : "ยืนยัน"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

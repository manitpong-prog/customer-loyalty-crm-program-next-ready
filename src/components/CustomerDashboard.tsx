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
} from "lucide-react";
import {
  Customer,
  Reward,
  PromoBanner,
  Transaction,
  Shop,
  TierType,
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

  // Interactive UI States
  const [promoCode, setPromoCode] = useState("");
  const [qrCodeData, setQrCodeData] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isRedeemSuccess, setIsRedeemSuccess] = useState(false);
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
  };

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
      <div className="min-h-screen bg-slate-50">
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
              {isAutoLoadingMember ? "กำลังเตรียมบัตรสมาชิกของคุณ" : "ยังไม่พบข้อมูลสมาชิกของคุณ"}
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-600">
              {isAutoLoadingMember
                ? `ระบบกำลังโหลดข้อมูลสมาชิกอัตโนมัติ${autoMemberRefreshAttempt ? ` รอบที่ ${autoMemberRefreshAttempt}` : ""} เมื่อพร้อมแล้วจะพาไปหน้ายืนยันรับแต้มให้อัตโนมัติ`
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
  const activeShopPointRate = Math.max(1, activeShop?.pointsRate || 10);
  const activeShopWelcomeMessage = activeShop?.welcomeMessage || activeShop?.description || "สะสมแต้ม แลกของรางวัล และรับสิทธิพิเศษจากร้านค้า";
  const activeShopContactText = activeShop?.contactText || activeShop?.phone || "ติดต่อร้านค้าเพื่อสอบถามรายละเอียดเพิ่มเติม";

  const pendingCouponState = validateCouponForCurrentShop(pendingCoupon);
  const pendingCouponExpiryLabel = pendingCoupon
    ? new Date(pendingCoupon.expiresAt).toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";

  // Point Progress calculate
  const getTierThreshold = (tier: TierType) => {
    if (tier === "Silver")
      return {
        next: "Gold",
        target: 300,
        color: "from-amber-600 to-amber-800",
      };
    if (tier === "Gold")
      return {
        next: "Platinum",
        target: 1000,
        color: "from-yellow-500 to-amber-500",
      };
    return { next: "Maxed", target: 1000, color: "from-teal-400 to-cyan-500" };
  };

  const tierInfo = getTierThreshold(customer.tier);
  const pointsProgress = Math.min(
    100,
    (customer.currentPoints / tierInfo.target) * 100,
  );

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
        let newTier = c.tier;
        if (newLifetime >= 1000) newTier = "Platinum";
        else if (newLifetime >= 300) newTier = "Gold";

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
      createdAt: new Date().toISOString(),
    };

    const currentTxs = getTransactions();
    saveTransactions([newTx, ...currentTxs]);

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

  // Confirm claim points via Dynamic Coupon modal overlay
  const handleConfirmClaimDynamicCoupon = () => {
    if (!pendingCoupon || !customer) return;

    const coupons = getGeneratedCoupons();

    const matchedIdx = coupons.findIndex(
      (c: any) => c.code.toUpperCase() === pendingCoupon.code.toUpperCase(),
    );
    if (matchedIdx === -1) {
      setErrorMessage("ตรวจรหัสไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
      setShowCouponConfirm(false);
      return;
    }

    const matched = coupons[matchedIdx];
    const couponState = validateCouponForCurrentShop(matched);
    if (couponState !== "ready") {
      setErrorMessage(explainCouponValidation(couponState));
      setShowCouponConfirm(false);
      return;
    }

    // 1. Mark as used
    coupons[matchedIdx].isUsed = true;
    coupons[matchedIdx].usedByCustomerId = customer.id;
    coupons[matchedIdx].usedAt = new Date().toISOString();
    saveGeneratedCoupons(coupons);

    // 2. Add points to the user
    const pointsToAdd = matched.points;
    const allCustomers = getCustomers();
    const updatedCustomers = allCustomers.map((c) => {
      if (c.id === customer.id) {
        const newPts = c.currentPoints + pointsToAdd;
        const newLifetime = c.lifetimePoints + pointsToAdd;
        let newTier = c.tier;
        if (newLifetime >= 1000) newTier = "Platinum";
        else if (newLifetime >= 300) newTier = "Gold";

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

    // 3. Create Transaction
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: customer.id,
      userName: customer.name,
      userPhone: customer.phone,
      shopId: matched.shopId,
      shopName: matched.shopName,
      type: "earn",
      points: pointsToAdd,
      description: `รับแต้มจากลิงก์ของร้าน: ${matched.description} (รหัส: ${matched.code})`,
      status: "completed",
      createdAt: new Date().toISOString(),
    };
    saveTransactions([newTx, ...getTransactions()]);

    setShowCouponConfirm(false);
    setSuccessMessage(
      `รับแต้ม ${pointsToAdd} แต้มแล้ว กำลังพากลับหน้าแรก`,
    );
    setPromoCode("");
    setPendingCoupon(null);
    onDataChange();
    loadData();
    goToCustomerHome(1300);
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
          let newTier = c.tier;
          if (newLifetime >= 1000) newTier = "Platinum";
          else if (newLifetime >= 300) newTier = "Gold";

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
        createdAt: new Date().toISOString(),
      };

      const currentTxs = getTransactions();
      saveTransactions([newTx, ...currentTxs]);

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

      setSelectedReward(latestReward);
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
          ? "relative min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col w-full max-w-md mx-auto overflow-hidden"
          : "relative min-h-[720px] bg-slate-50 font-sans text-slate-800 flex flex-col max-w-[420px] mx-auto sm:border-[8px] sm:border-slate-800 rounded-[40px] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.12)] border border-slate-200"
      }
    >
      {/* LINE OA Browser Frame Header */}
      <div className="bg-[#06C755] text-white px-4 py-3 flex items-center justify-between select-none shadow-xs border-b border-[#05b04b]">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-200 animate-pulse flex-shrink-0" />
          <span className="font-bold text-xs tracking-wide truncate">
            {activeShop?.name || "iM Sticker"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Shop Switcher inside customer view to test multi-shops */}
          {!isProductionView && (
            <div className="relative">
              <select
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="bg-[#05b04b] text-[10px] text-emerald-50 border-none rounded-lg px-2 py-1 pr-5 appearance-none outline-none focus:ring-1 focus:ring-emerald-300 font-bold cursor-pointer"
              >
                {shops.map((s) => (
                  <option
                    key={s.id}
                    value={s.id}
                    className="bg-white text-slate-800 text-xs"
                  >
                    {s.name}
                  </option>
                ))}
              </select>
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-emerald-100 text-[8px] font-black">
                ▼
              </div>
            </div>
          )}
          {!isProductionView && (
            <span className="text-white hover:opacity-85 text-xs cursor-pointer font-bold select-none px-1">
              ✕
            </span>
          )}
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
      <div className="flex-1 overflow-y-auto px-4 pb-20 pt-4 scrollbar-none bg-slate-55">
        {/* TAB 1: HOME */}
        {activeTab === "home" && (
          <div className="space-y-4">
            {/* 🏅 Premium Gold/Platinum สมาชิก Card Card */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="relative p-5 rounded-[24px] overflow-hidden shadow-[0_15px_30px_-5px_rgba(184,129,30,0.25)] border border-amber-500/20 text-stone-900"
              style={{
                background:
                  "linear-gradient(135deg, #FFE8A3 0%, #F5CE62 30%, #DFAC4C 65%, #B8811E 100%)",
              }}
            >
              {/* Metallic Card Shimmer Glow Overlay */}
              <div className="absolute inset-0 gold-shimmer opacity-85 pointer-events-none" />

              {/* Card Hologram Icon */}
              <div className="absolute top-4 right-4 bg-stone-900/10 border border-stone-900/10 p-1.5 rounded-lg text-amber-950">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>

              {/* Card Title */}
              <div className="flex flex-col">
                <span className="text-[9px] tracking-wider uppercase opacity-75 text-amber-950 font-bold font-mono">
                  บัตรสมาชิก iM Sticker
                </span>
                <span className="text-base font-black tracking-tight text-amber-950 italic">
                  {customer.tier === "Platinum"
                    ? "⭐️ สมาชิก PLATINUM"
                    : "👑 สมาชิก GOLD"}
                </span>
              </div>

              {/* Card Details / QR Button */}
              <div className="mt-8 flex justify-between items-end">
                <div className="space-y-0.5">
                  <p className="text-[9px] text-amber-900/80 font-bold">
                    ชื่อสมาชิก
                  </p>
                  <p className="font-extrabold text-sm text-stone-900">
                    {customer.name}
                  </p>
                  <p className="text-[10px] font-mono text-amber-950/70 mt-1.5 font-bold tracking-widest">
                    {customer.lineId.substring(0, 10).toUpperCase()}***
                  </p>
                </div>

                <button
                  onClick={() => setShowQrModal(true)}
                  className="bg-stone-900 hover:bg-black text-amber-300 border border-stone-800 p-2.5 rounded-2xl transition duration-250 active:scale-95 flex flex-col items-center justify-center gap-1 group shadow-md"
                >
                  <QrCode className="w-5 h-5 group-hover:scale-110 text-amber-400" />
                  <span className="text-[9px] font-black text-amber-200">
                    สะสมแต้ม
                  </span>
                </button>
              </div>

              {/* Bottom footer bar on Card */}
              <div className="mt-4 pt-3 border-t border-amber-900/15 flex justify-between text-[11px] text-amber-950 font-bold">
                <span>แต้มที่ใช้ได้ตอนนี้</span>
                <span className="font-mono text-stone-950 font-extrabold text-xs">
                  {customer.currentPoints} แต้ม
                </span>
              </div>
            </motion.div>

            {isProductionView && (
              <div className="bg-white border border-slate-200/70 rounded-3xl p-4 shadow-xs flex gap-3 items-start">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                  <Store className="w-5 h-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="text-xs font-black text-slate-950">
                    {activeShop?.name || "iM Sticker"}
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                    {activeShopWelcomeMessage}
                  </p>
                </div>
              </div>
            )}

            {activeShop?.isActive === false && (
              <div className="bg-rose-50 border border-rose-200 rounded-3xl p-4 text-xs text-rose-800 font-bold">
                ร้านนี้ปิดใช้งานชั่วคราว บางฟังก์ชันอาจยังไม่เปิดให้ใช้งาน กรุณาติดต่อร้านก่อนรับแต้มหรือแลกรางวัล
              </div>
            )}

            {/* Loyalty points details and Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white border border-slate-200/60 rounded-2xl p-3.5 flex flex-col shadow-2xs">
                <span className="text-[10px] text-slate-455 font-bold">
                  แต้มใช้แลกรางวัล
                </span>
                <span className="text-xl font-extrabold text-amber-600 font-mono mt-0.5">
                  {customer.currentPoints}{" "}
                  <span className="text-xs font-semibold text-slate-400">
                    แต้ม
                  </span>
                </span>
              </div>
              <div className="bg-white border border-slate-200/60 rounded-2xl p-3.5 flex flex-col shadow-2xs">
                <span className="text-[10px] text-slate-455 font-bold">
                  แต้มสะสมทั้งหมด
                </span>
                <span className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">
                  {customer.lifetimePoints}{" "}
                  <span className="text-xs font-semibold text-slate-400">
                    แต้ม
                  </span>
                </span>
              </div>
            </div>

            {isProductionView ? (
              <div className="bg-white border border-slate-200/70 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span className="font-extrabold text-slate-800">
                      แต้มใกล้หมดอายุ
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    ภายใน 30 วัน
                  </span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <span className="text-2xl font-black font-mono text-slate-900">0</span>
                    <span className="ml-1 text-xs font-bold text-slate-500">แต้ม</span>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold text-emerald-700 border border-emerald-100">
                    ยังไม่มีแต้มใกล้หมดอายุ
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/60 rounded-2xl p-4 space-y-2.5 shadow-2xs">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-amber-500" />
                    <span className="font-extrabold text-slate-800">
                      ระดับสมาชิก
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {customer.tier === "Platinum"
                      ? "คุณอยู่ระดับ Platinum แล้ว"
                      : `สะสมอีก ${tierInfo.target - customer.currentPoints} เพื่ออัปเกรด`}
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className={`bg-linear-to-r ${tierInfo.color} h-2 rounded-full`}
                    style={{
                      width: `${customer.tier === "Platinum" ? 100 : pointsProgress}%`,
                    }}
                  />
                </div>

                <div className="flex justify-between text-[9px] text-slate-400 font-mono font-bold">
                  <span>SILVER (0)</span>
                  <span>GOLD (300)</span>
                  <span>PLATINUM (1000)</span>
                </div>
              </div>
            )}

            {/* Quick Promo Store Swiper Header */}
            <div className="flex justify-between items-center pt-2">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">
                สิทธิพิเศษและของรางวัล
              </h3>
              <span
                className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5 cursor-pointer hover:underline"
                onClick={() => setActiveTab("rewards")}
              >
                ดูรางวัลทั้งหมด <ChevronRight className="w-3 h-3" />
              </span>
            </div>

            {/* Active Store Promotions slider */}
            <div className="space-y-3">
              {banners.map((ban) => {
                const isVisiblePromo = ban.isAd || ban.shopId === selectedShopId;
                if (!isVisiblePromo) return null;
                return (
                  <div
                    key={ban.id}
                    className="group bg-white border border-slate-200/60 rounded-2xl overflow-hidden hover:border-slate-350 transition shadow-xs"
                  >
                    <div className="h-28 overflow-hidden relative">
                      <img
                        src={ban.image}
                        alt={ban.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <span
                        className={`absolute top-2 right-2 text-[8px] font-black uppercase px-2.5 py-1 rounded-full text-white shadow-sm ${ban.isAd ? "bg-amber-500 text-stone-950" : "bg-[#06C755]"}`}
                      >
                        {ban.isAd ? "แนะนำ" : "โปรโมชัน"}
                      </span>
                    </div>
                    <div className="p-3.5 space-y-1">
                      <h4 className="text-xs font-extrabold text-slate-900">
                        {ban.title}
                      </h4>
                      <p className="text-[10.5px] text-slate-500 line-clamp-2 leading-relaxed">
                        {ban.description}
                      </p>
                      <div className="flex justify-between items-center pt-1 text-[9px] text-slate-400 font-mono font-semibold">
                        <span>หมดเขต: {ban.expirationDate}</span>
                        {ban.isAd && (
                          <span className="text-amber-600 underline">
                            ดูรายละเอียดเพิ่มเติม
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: REWARDS */}
        {activeTab === "rewards" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <Gift className="w-4 h-4 text-amber-550" />
                ของรางวัลจากร้าน {activeShop?.name}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium font-sans">
                เลือกของรางวัลที่ต้องการแลก แล้วรอให้ร้านยืนยันตอนรับของ
              </p>
            </div>

            {/* Active Shop details banner inside rewards */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-3 flex items-center gap-3 shadow-2xs">
              <img
                src={activeShop?.logo}
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
                    className="bg-white border border-slate-200/60 hover:border-slate-350 rounded-2xl overflow-hidden flex flex-col h-[210px] cursor-pointer transition active:scale-97 shadow-2xs"
                  >
                    <div className="h-24 relative overflow-hidden">
                      <img
                        src={rew.image}
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
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-250 rounded-2xl bg-white space-y-2.5 shadow-2xs">
                <Gift className="w-8 h-8 mx-auto stroke-1 text-slate-350" />
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
              <div className={`rounded-3xl border p-4.5 shadow-xs space-y-3.5 ${
                pendingCouponState === "ready"
                  ? "bg-emerald-50 border-emerald-200"
                  : "bg-rose-50 border-rose-200"
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className={`text-[10px] font-mono font-black uppercase tracking-[0.18em] ${
                      pendingCouponState === "ready" ? "text-emerald-700" : "text-rose-700"
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
                  <div className={`rounded-2xl px-3 py-2 text-center font-mono font-black ${
                    pendingCouponState === "ready"
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
                    disabled={pendingCouponState !== "ready"}
                    className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-black shadow-sm transition active:scale-[0.98] ${
                      pendingCouponState === "ready"
                        ? "bg-emerald-600 text-white hover:bg-emerald-700"
                        : "bg-slate-200 text-slate-500 cursor-not-allowed"
                    }`}
                  >
                    ยืนยัน
                  </button>
                </div>
              </div>
            )}

            {/* Manual Promo code entry */}
            <form
              onSubmit={handlePromoSubmit}
              className="bg-white border border-slate-200/80 p-4.5 rounded-3xl space-y-3.5 shadow-xs"
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
              <div className="bg-white border border-slate-200/80 p-4.5 rounded-3xl space-y-3.5 shadow-xs">
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
                      <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center mx-auto text-amber-550 shadow-2xs">
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
                <History className="w-4 h-4 text-amber-550" />
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
                className={`flex-1 text-center py-2.5 font-bold transition duration-155 cursor-pointer ${historySubTab === "earn" ? "text-amber-600 border-b-2 border-amber-600" : "text-slate-450 hover:text-slate-750"}`}
              >
                การสะสมแต้ม
              </button>
              <button
                type="button"
                onClick={() => setHistorySubTab("redeem")}
                className={`flex-1 text-center py-2.5 font-bold transition duration-155 cursor-pointer ${historySubTab === "redeem" ? "text-amber-600 border-b-2 border-amber-600" : "text-slate-450 hover:text-slate-750"}`}
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
                    className="bg-white border border-slate-200/60 rounded-2xl p-3.5 space-y-2 shadow-2xs"
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
                        className={`font-mono font-black text-sm ${t.type === "earn" ? "text-emerald-600" : "text-rose-650"}`}
                      >
                        {t.type === "earn" ? `+${t.points}` : `-${t.points}`}
                      </span>
                    </div>

                    <p className="text-[10.5px] text-slate-500 font-medium font-sans leading-relaxed">
                      {t.description}
                    </p>

                    {/* REDEEM specific status layout with verification details */}
                    {t.type === "redeem" && (
                      <div className="flex justify-between items-center pt-2 mt-2 border-t border-slate-100 text-[9px] font-mono font-bold">
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
                    )}
                  </div>
                ))}

              {transactions.filter((t) =>
                historySubTab === "earn"
                  ? t.type === "earn"
                  : t.type === "redeem",
              ).length === 0 && (
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white shadow-2xs space-y-1">
                  <History className="w-8 h-8 mx-auto stroke-1 text-slate-350" />
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
                <User className="w-4 h-4 text-amber-550" />
                โปรไฟล์สมาชิก
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                แก้ไขชื่อและเบอร์โทรสำหรับให้ร้านติดต่อหรือยืนยันของรางวัล
              </p>
            </div>

            <div className="bg-white border border-slate-200/70 rounded-3xl p-4 shadow-xs space-y-3">
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

            <div className="bg-white border border-slate-200/70 rounded-3xl p-4 shadow-xs">
              <p className="text-[10px] font-black text-slate-500">ติดต่อร้าน</p>
              <p className="text-xs font-bold text-slate-800 mt-1 leading-relaxed">{activeShopContactText}</p>
            </div>

            {/* Profile editing form */}
            <form
              onSubmit={handleUpdateProfile}
              className="bg-white border border-slate-200/80 p-4.5 rounded-3xl space-y-4 shadow-xs"
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
                  <span className="inline-block mt-1 bg-amber-500/10 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-full border border-amber-500/20 shadow-2xs">
                    👑 ระดับ {customer.tier}
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
            <div className="bg-amber-50/50 border border-amber-200/65 p-4 rounded-2xl space-y-2.5 text-[10.5px] shadow-2xs">
              <span className="text-[11px] font-extrabold text-amber-900">
                สิทธิพิเศษประจำระดับ {customer.tier} :
              </span>
              <ul className="space-y-1.5 text-stone-700 list-disc list-inside font-semibold font-sans">
                <li>สะสมแต้มแลกเครื่องดื่มและของรางวัลพิเศษหน้าร้าน</li>
                <li>
                  รับสิทธิ์ร่วมกิจกรรมพิเศษของร้านตามเงื่อนไข
                </li>
                {customer.tier === "Platinum" ? (
                  <>
                    <li className="text-amber-700 font-bold">
                      ส่วนลดวันเกิดทันที 20% และเค้กวันเกิดจานพิเศษฟรี
                    </li>
                    <li className="text-amber-700 font-bold">
                      มีโอกาสแลกของรางวัลพิเศษก่อนสมาชิกทั่วไป
                    </li>
                  </>
                ) : (
                  <li>สะสมครบ 1000 แต้มเพื่ออัปเกรดเป็น Platinum</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* FIXED FOOTER TAB MENU (Like Line LIFF Menu) */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-white/95 backdrop-blur-md border-t border-slate-200/85 flex justify-around items-center select-none z-10 shadow-lg">
        <button
          type="button"
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-full cursor-pointer transition duration-150 ${activeTab === "home" ? "text-amber-600 font-extrabold scale-105" : "text-slate-450 hover:text-slate-700"}`}
        >
          <Compass className="w-5 h-5 font-bold" />
          <span className="text-[9px] font-bold font-sans">หน้าแรก</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rewards")}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-full cursor-pointer transition duration-150 ${activeTab === "rewards" ? "text-amber-600 font-extrabold scale-105" : "text-slate-450 hover:text-slate-700"}`}
        >
          <Gift className="w-5 h-5 font-bold" />
          <span className="text-[9px] font-bold font-sans">รางวัล</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("code")}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-full cursor-pointer transition duration-150 ${activeTab === "code" ? "text-amber-600 font-extrabold scale-105" : "text-slate-450 hover:text-slate-700"}`}
        >
          <QrCode className="w-5 h-5 scale-110 text-emerald-600" />
          <span className="text-[9px] font-bold font-sans text-emerald-600">
            รับแต้ม
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-full cursor-pointer transition duration-150 ${activeTab === "history" ? "text-amber-600 font-extrabold scale-105" : "text-slate-450 hover:text-slate-700"}`}
        >
          <History className="w-5 h-5 font-bold" />
          <span className="text-[9px] font-bold font-sans">ประวัติ</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex flex-col items-center justify-center gap-1 w-14 h-full cursor-pointer transition duration-150 ${activeTab === "profile" ? "text-amber-600 font-extrabold scale-105" : "text-slate-450 hover:text-slate-700"}`}
        >
          <User className="w-5 h-5 font-bold" />
          <span className="text-[9px] font-bold font-sans">โปรไฟล์</span>
        </button>
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
                  src={selectedReward.image}
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
                        className="w-full bg-amber-550 hover:bg-amber-600 text-white font-extrabold text-xs py-3 rounded-xl transition duration-150 active:scale-95 text-center block cursor-pointer shadow-md"
                      >
                        {isRedeeming
                          ? "กำลังส่งคำขอ..."
                          : "ยืนยันแลกรางวัล"}
                      </button>
                    ) : (
                      <div className="text-center p-3 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-650 font-bold">
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
                        เมื่อไปรับของรางวัลที่ร้าน ให้แจ้งชื่อหรือเบอร์โทร เพื่อให้ร้านกดยืนยันรายการ
                      </p>
                    </div>
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
              className="bg-white border border-slate-250 rounded-[32px] p-5 w-full max-w-sm text-center space-y-4 shadow-2xl relative"
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
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs py-2.5 font-bold rounded-xl transition cursor-pointer"
                >
                  ไม่รับ
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClaimDynamicCoupon}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition active:scale-[0.98] cursor-pointer"
                >
                  ยืนยัน
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

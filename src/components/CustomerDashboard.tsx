import React, { useState, useEffect } from "react";
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
  saveTransactions,
  getShops,
  getGeneratedCoupons,
  saveGeneratedCoupons,
} from "../data/mockData";
import {
  assertCouponBelongsToShop,
  filterBannersByShop,
  filterCustomersByShop,
  filterRewardsByShop,
  filterTransactionsByShop,
} from "../lib/shopScope";

interface CustomerDashboardProps {
  key?: string;
  currentCustomerId: string;
  onDataChange: () => void;
  selectedShopId: string;
  setSelectedShopId: (id: string) => void;
  initialCouponCode?: string;
  clearInitialCouponCode?: () => void;
  displayMode?: "demo" | "production";
}

export default function CustomerDashboard({
  currentCustomerId,
  onDataChange,
  selectedShopId,
  setSelectedShopId,
  initialCouponCode,
  clearInitialCouponCode,
  displayMode = "demo",
}: CustomerDashboardProps) {
  const isProductionView = displayMode === "production";
  // Navigation tabs: 'home', 'rewards', 'code', 'history', 'profile'
  const [activeTab, setActiveTab] = useState<
    "home" | "rewards" | "code" | "history" | "profile"
  >("home");
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

  // Dynamic Coupon States
  const [pendingCoupon, setPendingCoupon] = useState<any | null>(null);
  const [showCouponConfirm, setShowCouponConfirm] = useState(false);

  useEffect(() => {
    if (initialCouponCode) {
      const codeClean = initialCouponCode.trim().toUpperCase();
      setPromoCode(codeClean);
      setActiveTab("code");

      const coupons = getGeneratedCoupons();
      const matched = coupons.find(
        (c: any) => c.code.toUpperCase() === codeClean,
      );

      if (matched && assertCouponBelongsToShop(matched.shopId, selectedShopId)) {
        setPendingCoupon(matched);
        setShowCouponConfirm(true);
      } else {
        const genericCodes = [
          "WELCOME50",
          "CRM2026",
          "KOFFEELOVER100",
          "CHICSTYLE80",
        ];
        if (genericCodes.includes(codeClean)) {
          setSuccessMessage(
            `พบรหัสสะสมแต้มแคมเปญ: ${codeClean} โปรดกดปุ่มยืนยันเพื่อรับคะแนนสะสม`,
          );
          setTimeout(() => setSuccessMessage(""), 4500);
        } else {
          setErrorMessage("ไม่พบข้อมูลรหัสแจกแต้มนี้ หรือคูปองสะสมหมดอายุแล้ว");
          setTimeout(() => setErrorMessage(""), 4500);
        }
      }

      if (clearInitialCouponCode) {
        clearInitialCouponCode();
      }
    }
  }, [initialCouponCode, clearInitialCouponCode]);

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
    const currCust =
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
      filterRewardsByShop(getRewards(), selectedShopId).filter((r) => r.isAvailable),
    );
    setBanners(filterBannersByShop(getBanners(), selectedShopId, true));
    setTransactions(scopedTransactions.filter((t) => t.userId === currCust.id));
  };

  useEffect(() => {
    loadData();
  }, [currentCustomerId, selectedShopId, activeTab]);

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
    return <div className="p-8 text-center">กำลังโหลดข้อมูลลูกค้า...</div>;

  // Find Active Shop details
  const activeShop = shops.find((s) => s.id === selectedShopId) || shops[0];

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

  // Submit manual code
  const handlePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    // Check dynamic coupons from Neon-backed local cache first
    const coupons = getGeneratedCoupons();
    const matchedCoupon = coupons.find(
      (c: any) => c.code.toUpperCase() === code,
    );

    if (matchedCoupon) {
      if (!assertCouponBelongsToShop(matchedCoupon.shopId, selectedShopId)) {
        setErrorMessage("รหัสนี้เป็นของร้านอื่น ไม่สามารถใช้กับร้านนี้ได้");
        setTimeout(() => setErrorMessage(""), 3500);
        return;
      }
      if (matchedCoupon.isUsed) {
        setErrorMessage(
          "ลิงก์หรือรหัสรวบรวมแต้มนี้ถูกใช้ไปแล้ว คูปองสามารถสะสมสิทธิ์ได้ครั้งเดียว!",
        );
        setTimeout(() => setErrorMessage(""), 3500);
        return;
      }
      if (new Date() > new Date(matchedCoupon.expiresAt)) {
        setErrorMessage(
          "ลิงก์หรือรหัสสะสมแต้มพรีเมี่ยมนี้หมดอายุการใช้งานไปแล้ว",
        );
        setTimeout(() => setErrorMessage(""), 3500);
        return;
      }

      // Valid dynamic coupon -> Launch confirmation modal!
      setPendingCoupon(matchedCoupon);
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
      description = "ยินดีต้อนรับสู่โปรแกรมสะสมแต้มพรีเมี่ยม WELCOME50";
    } else if (code === "KOFFEELOVER100" && selectedShopId === "koffee_craft") {
      pointsEarned = 100;
      description = "สิทธิพิเศษคอกาแฟชั้นเลิศ KOFFEELOVER100";
    } else if (code === "CHICSTYLE80" && selectedShopId === "chic_boutique") {
      pointsEarned = 80;
      description = "คูปองแต้มแต่งตัวสุดหรู CHICSTYLE80";
    } else if (code === "CRM2026") {
      pointsEarned = 150;
      description = "โบนัสเปิดตัว CRM ยุคใหม่ปี 2026";
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

  // Confirm claim points via Dynamic Coupon modal overlay
  const handleConfirmClaimDynamicCoupon = () => {
    if (!pendingCoupon || !customer) return;

    const coupons = getGeneratedCoupons();

    const matchedIdx = coupons.findIndex(
      (c: any) => c.code.toUpperCase() === pendingCoupon.code.toUpperCase(),
    );
    if (matchedIdx === -1) {
      setErrorMessage("เกิดปัญหาระบบตรวจสอบสิทธิ์ สแกนตรวจสอบใหม่อีกครั้ง");
      setShowCouponConfirm(false);
      return;
    }

    const matched = coupons[matchedIdx];
    if (!assertCouponBelongsToShop(matched.shopId, selectedShopId)) {
      setErrorMessage("รหัสนี้เป็นของร้านอื่น ไม่สามารถใช้กับร้านนี้ได้");
      setShowCouponConfirm(false);
      return;
    }

    if (matched.isUsed) {
      setErrorMessage("รหัสสะสมแต้มนี้ถูกใช้งานไปก่อนหน้าแล้ว");
      setShowCouponConfirm(false);
      return;
    }

    if (new Date() > new Date(matched.expiresAt)) {
      setErrorMessage("โค้ดหมดอายุการใช้งานแล้ว โปรดของลิ้งก์เติมแต้มใหม่");
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
      description: `สะสมแต้มจากคิวอาร์แจกสิทธิ์แคมเปญ: ${matched.description} (รหัส: ${matched.code})`,
      status: "completed",
      createdAt: new Date().toISOString(),
    };
    saveTransactions([newTx, ...getTransactions()]);

    setShowCouponConfirm(false);
    setSuccessMessage(
      `สะสมสิทธิ์สำเร็จ! ได้รับ +${pointsToAdd} แต้มจากกลุ่ม ${matched.shopName}`,
    );
    setPromoCode("");
    setPendingCoupon(null);
    onDataChange();
    loadData();
    setTimeout(() => setSuccessMessage(""), 4000);
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

    if (customer.currentPoints < selectedReward.pointsCost) {
      setErrorMessage("แต้มสะสมของคุณไม่เพียงพอสำหรับการแลกของรางวัลชิ้นนี้");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    setIsRedeeming(true);

    // Simulate short cool network delay
    setTimeout(() => {
      const allCustomers = getCustomers();
      const updatedCustomers = allCustomers.map((c) => {
        if (c.id === customer.id) {
          return {
            ...c,
            currentPoints: c.currentPoints - selectedReward.pointsCost,
          };
        }
        return c;
      });
      saveCustomers(updatedCustomers);

      // Create Pending Transaction (requires Store Owner approval!)
      const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        userId: customer.id,
        userName: customer.name,
        userPhone: customer.phone,
        shopId: selectedShopId,
        shopName: activeShop?.name || "ร้านค้าพาร์ทเนอร์",
        type: "redeem",
        points: selectedReward.pointsCost,
        description: `ขอแลกรางวัล: ${selectedReward.name}`,
        status: "pending",
        rewardId: selectedReward.id,
        createdAt: new Date().toISOString(),
      };

      const currentTxs = getTransactions();
      saveTransactions([newTx, ...currentTxs]);

      setIsRedeeming(false);
      setIsRedeemSuccess(true);
      onDataChange();
      loadData();
    }, 1500);
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
    setSuccessMessage("อัปเดตข้อมูลโปรไฟล์ส่วนตัวสำเร็จแล้ว");
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
            {activeShop?.name || "CRM Line MiniApp"}
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
            {/* 🏅 Premium Gold/Platinum Member Card Card */}
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
                  Loyalty Privilege Club
                </span>
                <span className="text-base font-black tracking-tight text-amber-950 italic">
                  {customer.tier === "Platinum"
                    ? "⭐️ PLATINUM VIP MEMBER"
                    : "👑 GOLD MEMBER CARD"}
                </span>
              </div>

              {/* Card Details / QR Button */}
              <div className="mt-8 flex justify-between items-end">
                <div className="space-y-0.5">
                  <p className="text-[9px] text-amber-900/80 font-bold">
                    ชื่อสมาชิก / Member Name
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
                <span>คะแนนปัจจุบัน :</span>
                <span className="font-mono text-stone-950 font-extrabold text-xs">
                  {customer.currentPoints} แต้ม (Points)
                </span>
              </div>
            </motion.div>

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

            {/* Tier upgrade progress bar */}
            <div className="bg-white border border-slate-200/60 rounded-2xl p-4 space-y-2.5 shadow-2xs">
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="font-extrabold text-slate-800">
                    สถานะ VIP ระดับล่าสุด
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">
                  {customer.tier === "Platinum"
                    ? "สิทธิ์ประโยชน์ Platinum ครบครัน"
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

            {/* Quick Promo Store Swiper Header */}
            <div className="flex justify-between items-center pt-2">
              <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-widest">
                โปรโมชั่นและสิทธิพิเศษ
              </h3>
              <span
                className="text-[10px] text-amber-600 font-bold flex items-center gap-0.5 cursor-pointer hover:underline"
                onClick={() => setActiveTab("rewards")}
              >
                ดูของรางวัลทั้งหมด <ChevronRight className="w-3 h-3" />
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
                        {ban.isAd ? "ADVERTISEMENT" : "PROMOTION"}
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
                ของรางวัลของร้าน {activeShop?.name}
              </h3>
              <p className="text-[10px] text-slate-500 font-medium font-sans">
                เลือกของรางวัลสุดพิเศษเพื่อรวบรวมรหัสไปเพื่อยืนยันที่หน้าร้านได้ทันที
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
                  {activeShop?.category} • สะสม 10 บ. = 1 แต้ม
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
                  ขณะนี้ยังไม่มีของรางวัลเปิดให้บริการสำหรับร้านหมวดนี้
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
                ใส่รหัสโค้ด / สแกนรับแต้ม
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                กรณีได้รับโค้ดจัดกิจกรรมจากร้านค้า หรือ
                สแกนคิวอาร์โค้ดสิทธิพิเศษ
              </p>
            </div>

            {/* Manual Promo code entry */}
            <form
              onSubmit={handlePromoSubmit}
              className="bg-white border border-slate-200/80 p-4.5 rounded-3xl space-y-3.5 shadow-xs"
            >
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-650">
                  กรอกรหัสสะสมแต้ม (สลักตัวอักษรพิมพ์ใหญ่)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="ตัวอย่าง WELCOME50"
                    className="bg-slate-50 border border-slate-200 focus:border-amber-500 focus:bg-white text-xs text-slate-800 uppercase font-bold px-3.5 py-2.5 rounded-xl flex-1 outline-none transition"
                  />
                  <button
                    type="submit"
                    className="bg-stone-900 hover:bg-black text-white font-extrabold text-xs px-4.5 py-2.5 rounded-xl transition active:scale-95 shadow-sm cursor-pointer"
                  >
                    ยืนยัน
                  </button>
                </div>
              </div>

              {/* Sample codes helper */}
              <div className="bg-slate-50/80 rounded-2xl p-3 space-y-2 text-[10px] border border-slate-200/60 shadow-inner">
                <p className="text-amber-700 font-bold">
                  รหัสสะสมแต้มสาธารณะเปิดซิมจำลอง:
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
            </form>

            {/* QR Scan Simulation interface */}
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
                      กำลังสแกนและยืนยันความปลอดภัยเข้ารับแต้ม...
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center mx-auto text-amber-550 shadow-2xs">
                      <QrCode className="w-7 h-7" />
                    </div>
                    <p className="text-xs font-semibold text-slate-500">
                      กดปุ่มจำลองการแสกนคิวอาร์รับแต้มด้านล่าง
                    </p>
                  </div>
                )}

                {/* Laser scan effect overlay */}
                {scanning && (
                  <div className="absolute left-0 right-0 h-0.5 bg-amber-500 top-0 shadow-lg animate-bounce duration-[1500ms]" />
                )}
              </div>

              {/* Simulation Quick Launchers for scanning */}
              <div className="space-y-2.5">
                <span className="text-[9px] uppercase font-mono text-slate-400 font-bold block">
                  จำลองรหัสสแกนคิวอาร์รับแต้มพิเศษ:
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
          </div>
        )}

        {/* TAB 4: HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-550" />
                ประวัติแต้มและของรางวัลของคุณ
              </h3>
              <p className="text-[10px] text-slate-500 font-medium font-sans">
                ติดตามการใช้งานและสถานะคูปองของรางวัลได้ตลอด 24 ชั่วโมง
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
                                ปฏิเสธ / ยกเลิก
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
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl bg-white shadow-2xs">
                  <History className="w-8 h-8 mx-auto stroke-1 text-slate-350" />
                  <p className="text-xs mt-2 font-semibold">
                    ยังไม่พบรายการกิจกรรมของคุณในหน้านี้
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
                โปรไฟล์สมาชิก Line Loyalty
              </h3>
              <p className="text-[10px] text-slate-500 font-medium">
                จัดการข้อมูลประจําตัวและช่องทางเพื่อรับข่าวสารพิเศษเฉพาะคนพิเศษ
              </p>
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
                    LINE UUID: U11aa2...26ff
                  </p>
                  <span className="inline-block mt-1 bg-amber-500/10 text-amber-700 text-[8px] font-black px-2 py-0.5 rounded-full border border-amber-500/20 shadow-2xs">
                    👑 VIP {customer.tier.toUpperCase()} MEMBER
                  </span>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold">
                    ชื่อจริง-นามสกุล :
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
                    เบอร์โทรศัพท์มือถือ :
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
                    ชื่อไลน์ (LINE Name) :
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
                  สิทธิ์ในการเข้าร่วมปาร์ตี้กาแฟเวิร์กชอปกราบนมัสการปีละ 2 ครั้ง
                </li>
                {customer.tier === "Platinum" ? (
                  <>
                    <li className="text-amber-700 font-bold">
                      ส่วนลดวันเกิดทันที 20% และเค้กวันเกิดจานพิเศษฟรี
                    </li>
                    <li className="text-amber-700 font-bold">
                      สิทธิ์แลกของขวัญจำกัดสต็อกล่วงหน้าก่อนสมาชิกปกติ 7 วัน
                    </li>
                  </>
                ) : (
                  <li>สะสมครบ 1000 แต้มเพื่อสิทธิ์เบิร์นมาร์แกตดิสเคาท์</li>
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
            ใส่โค้ด
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
                  คิวอาร์สะสมแต้มของหนู
                </h4>
                <p className="text-[10.5px] text-slate-500 font-semibold font-sans">
                  ยื่นให้เจ้าหน้าที่หน้าร้านเพื่อสะสมแต้มพรีเมี่ยมได้ทันที
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
                  รหัสคิวอาร์ส่วนตัวสมาชิก
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
                  รายละเอียดสิทธิ์แลกรางวัล
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
                    <span>แต้มที่ต้องใช้รวบรวม:</span>
                    <span className="font-mono font-bold text-rose-600">
                      -{selectedReward.pointsCost} แต้ม
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 pt-1.5 text-slate-650 font-bold">
                    <span>แต้มคงเหลือสำรอง:</span>
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
                          ? "กำลังตรวจสอบสิทธิ์..."
                          : "ยืนยันเพื่อ แลกรับของรางวัล"}
                      </button>
                    ) : (
                      <div className="text-center p-3 bg-rose-50 border border-rose-100 rounded-xl text-[10px] text-rose-650 font-bold">
                        คะแนนแต้มปัจจุบันของคุณไม่เพียงพอสำหรับการแลก
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4.5 text-center space-y-3">
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                    <div className="space-y-1">
                      <h5 className="text-xs font-black text-emerald-600">
                        ยื่นคำขอแลกสำเร็จแล้ว!
                      </h5>
                      <p className="text-[10px] font-semibold text-slate-500 leading-relaxed px-5 font-sans">
                        กรุณาแจ้งเบอร์โทรศัพท์หรือเปิดหน้าประวัติรับคูปอง
                        เพื่อให้แคชเชียร์สาขากดยืนยันทางระบบ
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
                      เปิดเช็คในคูปองส่วนตัว
                    </button>
                  </div>
                )}
              </div>
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
                  ตรวจสอบสิทธิ์สะสมแต้มสำเร็จ
                </span>
                <h4 className="text-base font-black text-slate-900">
                  ยืนยันรับแต้มจากหน้าร้านค้า
                </h4>
                <p className="text-xs text-slate-500 font-bold font-sans">
                  ✨ {pendingCoupon.shopName}
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
                  รายละเอียดแคมเปญ: {pendingCoupon.description}
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
                  <span>เงื่อนไขความปลอดภัย:</span>
                  <span className="text-emerald-600">
                    สะสมคะแนนได้เพียง 1 ครั้งเท่านั้น
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCouponConfirm(false);
                    setPendingCoupon(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-705 text-xs py-2.5 font-bold rounded-xl transition cursor-pointer"
                >
                  ปฏิเสธ / ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClaimDynamicCoupon}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 rounded-xl shadow-lg shadow-emerald-600/10 transition active:scale-[0.98] cursor-pointer"
                >
                  อนุมัติรับแต้ม
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

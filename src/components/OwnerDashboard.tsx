import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Store, QrCode, Users, Plus, Edit, Trash2, Check, X,
  ShoppingBag, Award, PlusCircle, MinusCircle, Search, 
  Image, HelpCircle, Calendar, RefreshCw, AlertCircle, FileText, Copy, UserPlus, ReceiptText
} from 'lucide-react';
import { Shop, Customer, Reward, Transaction, PromoBanner } from '../types';
import { 
  getShops, saveShops, getCustomers, saveCustomers, 
  getRewards, saveRewards, getTransactions, saveTransactions,
  getBanners, saveBanners, getGeneratedCoupons, saveGeneratedCoupons
} from '../data/mockData';
import { shopIdToSlug } from '../lib/shopSlug';
import {
  filterBannersByShop,
  filterCouponsByShop,
  filterCustomersByShop,
  filterRewardsByShop,
  filterTransactionsByShop,
  scopeApprovedShops,
} from '../lib/shopScope';

type MerchantTab = 'dashboard' | 'approvals' | 'customers' | 'rewards' | 'promotions' | 'generator' | 'settings';

interface OwnerDashboardProps {
  key?: string;
  onDataChange: () => void;
  selectedShopId: string;
  setSelectedShopId: (id: string) => void;
  onTriggerSimulatedLink?: (code: string) => void;
  displayMode?: 'demo' | 'production';
}

export default function OwnerDashboard({
  onDataChange,
  selectedShopId,
  setSelectedShopId,
  onTriggerSimulatedLink,
  displayMode = 'demo'
}: OwnerDashboardProps) {
  const isProductionView = displayMode === 'production';
  // Merchant pages
  const [activeTab, setActiveTab] = useState<MerchantTab>('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [approvalsSubTab, setApprovalsSubTab] = useState<'queue' | 'history'>('queue');
  
  // Database States
  const [shops, setShops] = useState<Shop[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Search Filter / Inputs
  const [searchTerm, setSearchTerm] = useState('');

  const activeShopDetail = shops.find(s => s.id === selectedShopId);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) ||
    (c.lineName && c.lineName.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Custom QR / Link generator states
  const [generatePoints, setGeneratePoints] = useState(50);
  const [generateDesc, setGenerateDesc] = useState('รับประทานอาหารครบกำหนด');
  const [generatedQRValue, setGeneratedQRValue] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState(15);
  const [activeCoupon, setActiveCoupon] = useState<any | null>(null);
  const [generatedCouponsList, setGeneratedCouponsList] = useState<any[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);

  const generateNewCouponAndLink = () => {
    // Generate unique code format CPN-[SHOP_ABBR]-[POINTS]-[RANDOM_5_CHARS]
    const shopAbbr = selectedShopId.split('_').map(w => w[0]).join('').toUpperCase() || 'CPN';
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const uniqueCode = `CPN-${shopAbbr}-${generatePoints}-${randomHex}`;

    const coupons = getGeneratedCoupons();

    const activeShop = shops.length > 0 ? shops.find(s => s.id === selectedShopId) : getShops().find(s => s.id === selectedShopId);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    const newCoupon = {
      code: uniqueCode,
      points: generatePoints,
      shopId: selectedShopId,
      shopName: activeShop?.name || 'ร้านกาแฟ KOFFEE CRAFT',
      description: generateDesc || 'รับแต้มจากร้าน',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt,
      isUsed: false
    };

    coupons.push(newCoupon);
    saveGeneratedCoupons(coupons);

    // Construct app's URL
    const generatedUrl = `${window.location.origin}/customer/${shopIdToSlug(selectedShopId)}?code=${uniqueCode}`;

    setGeneratedQRValue(generatedUrl);
    setActiveCoupon(newCoupon);

    // Refresh generated coupons list
    const shopCoupons = coupons.filter((c: any) => c.shopId === selectedShopId);
    shopCoupons.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setGeneratedCouponsList(shopCoupons);
  };

  const handleDeleteGeneratedCoupon = (code: string) => {
    if (confirm(`คุณแน่ใจต้องการลบรหัสคูปอง ${code} ถาวรใช่หรือไม่? หลังจากลบแล้ว คูปองหรือลิงก์สะสมแต้มนี้จะไม่สามารถถูกนำมาสแกนหรือใช้งานได้อีกทุกกรณี`)) {
      const coupons = getGeneratedCoupons();
      const filtered = coupons.filter((c: any) => c.code.toUpperCase() !== code.toUpperCase());
      saveGeneratedCoupons(filtered);
      showStatus('✓ ลบข้อมูลรหัสแจกแต้มพิเศษสำเร็จอย่างถาวร');
      loadData();
    }
  };

  // Rewards catalog states
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [newRewName, setNewRewName] = useState('');
  const [newRewPoints, setNewRewPoints] = useState(100);
  const [newRewStock, setNewRewStock] = useState(20);
  const [newRewDesc, setNewRewDesc] = useState('');
  const [newRewImage, setNewRewImage] = useState('');

  // Manual point adjusting modal states
  const [statusMsg, setStatusMsg] = useState('');
  const [selectedCustForAdjust, setSelectedCustForAdjust] = useState<Customer | null>(null);
  const [adjustPoints, setAdjustPoints] = useState(20);
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustReason, setAdjustReason] = useState('ปรับแต้มโดยร้านค้า');

  // Real merchant workflow states: create members and record purchases.
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerLineName, setNewCustomerLineName] = useState('');
  const [selectedSaleCustomerId, setSelectedSaleCustomerId] = useState('');
  const [saleAmount, setSaleAmount] = useState(100);
  const [saleReason, setSaleReason] = useState('บันทึกยอดซื้อหน้าร้าน');

  // Promotion Banner creation states
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerDesc, setNewBannerDesc] = useState('');
  const [newBannerImage, setNewBannerImage] = useState('');
  const [newBannerExp, setNewBannerExp] = useState('2026-06-30');

  // Load latest data on focus or change
  const loadData = () => {
    const allShops = getShops();
    const allTransactions = getTransactions();
    setShops(scopeApprovedShops(allShops, selectedShopId, isProductionView));
    setCustomers(filterCustomersByShop(getCustomers(), selectedShopId, allTransactions, true));
    setRewards(filterRewardsByShop(getRewards(), selectedShopId));
    setBanners(filterBannersByShop(getBanners(), selectedShopId, false));
    setTransactions(filterTransactionsByShop(allTransactions, selectedShopId));

    try {
      const shopCoupons = filterCouponsByShop(getGeneratedCoupons(), selectedShopId);
      shopCoupons.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setGeneratedCouponsList(shopCoupons);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedShopId, activeTab]);

  useEffect(() => {
    if (customers.length > 0 && !customers.some((customer) => customer.id === selectedSaleCustomerId)) {
      setSelectedSaleCustomerId(customers[0].id);
    }
  }, [customers, selectedSaleCustomerId]);

  const pointsRate = Math.max(1, activeShopDetail?.pointsRate || 10);
  const calculatedSalePoints = Math.max(0, Math.floor((Number(saleAmount) || 0) / pointsRate));

  const getTierForLifetime = (lifetimePoints: number): Customer['tier'] => {
    if (lifetimePoints >= 1000) return 'Platinum';
    if (lifetimePoints >= 300) return 'Gold';
    return 'Silver';
  };

  const showStatus = (text: string) => {
    setStatusMsg(text);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = newCustomerName.trim();
    const trimmedPhone = newCustomerPhone.trim();
    const trimmedLineName = newCustomerLineName.trim();

    if (!trimmedName) {
      showStatus('❌ กรุณาระบุชื่อลูกค้าก่อนบันทึกสมาชิก');
      return;
    }

    const allCustomers = getCustomers();
    const duplicatedPhone = trimmedPhone && allCustomers.some((customer) => customer.phone === trimmedPhone);
    if (duplicatedPhone) {
      showStatus('❌ เบอร์โทรนี้มีอยู่ในระบบแล้ว กรุณาค้นหาสมาชิกเดิมก่อน');
      return;
    }

    const newCustomer: Customer = {
      id: `cust_${Date.now()}`,
      name: trimmedName,
      phone: trimmedPhone || '-',
      lineName: trimmedLineName || trimmedName,
      lineId: `manual_${Date.now()}`,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(trimmedName)}&background=f59e0b&color=111827`,
      currentPoints: 0,
      lifetimePoints: 0,
      tier: 'Silver',
      createdAt: new Date().toISOString(),
      shopIds: [selectedShopId],
    };

    saveCustomers([...allCustomers, newCustomer]);
    setSelectedSaleCustomerId(newCustomer.id);
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerLineName('');
    setShowCustomerModal(false);
    showStatus(`✓ เพิ่มสมาชิก ${newCustomer.name} ให้ร้านนี้เรียบร้อยแล้ว`);
    onDataChange();
    loadData();
  };

  const handleRecordPurchase = (e: React.FormEvent) => {
    e.preventDefault();

    const allCustomers = getCustomers();
    const customer = allCustomers.find((item) => item.id === selectedSaleCustomerId);

    if (!customer) {
      showStatus('❌ กรุณาเลือกสมาชิกก่อนบันทึกยอดซื้อ');
      return;
    }

    if (calculatedSalePoints <= 0) {
      showStatus(`❌ ยอดซื้อยังไม่ถึงอัตราแจกแต้มของร้าน (${pointsRate} บาท = 1 แต้ม)`);
      return;
    }

    const updatedCustomers = allCustomers.map((item) => {
      if (item.id !== customer.id) return item;

      const nextLifetime = item.lifetimePoints + calculatedSalePoints;
      const nextShopIds = Array.from(new Set([...(item.shopIds || []), selectedShopId]));

      return {
        ...item,
        currentPoints: item.currentPoints + calculatedSalePoints,
        lifetimePoints: nextLifetime,
        tier: getTierForLifetime(nextLifetime),
        shopIds: nextShopIds,
      };
    });

    saveCustomers(updatedCustomers);

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: customer.id,
      userName: customer.name,
      userPhone: customer.phone,
      shopId: selectedShopId,
      shopName: activeShopDetail?.name || selectedShopId,
      type: 'earn',
      points: calculatedSalePoints,
      description: `${saleReason || 'บันทึกยอดซื้อหน้าร้าน'}: ยอดซื้อ ${Number(saleAmount).toLocaleString('th-TH')} บาท`,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    saveTransactions([newTx, ...getTransactions()]);
    showStatus(`✓ บันทึกยอดซื้อสำเร็จ: +${calculatedSalePoints} แต้มให้ ${customer.name}`);
    onDataChange();
    loadData();
  };

  const handleToggleRewardAvailability = (rewardId: string) => {
    const allRewards = getRewards();
    const reward = allRewards.find((item) => item.id === rewardId && item.shopId === selectedShopId);
    if (!reward) return;

    const updatedRewards = allRewards.map((item) => {
      if (item.id === rewardId && item.shopId === selectedShopId) {
        return { ...item, isAvailable: !item.isAvailable };
      }
      return item;
    });

    saveRewards(updatedRewards);
    showStatus(reward.isAvailable ? '✓ ปิดการแสดงของรางวัลนี้แล้ว' : '✓ เปิดให้ลูกค้าเห็นของรางวัลนี้แล้ว');
    onDataChange();
    loadData();
  };

  // 1. APPROVE CUSTOMER CLAIM
  const handleApproveRedeem = (txId: string) => {
    const allTxs = getTransactions();
    const tx = allTxs.find(t => t.id === txId);
    if (!tx || tx.status !== 'pending' || !tx.rewardId) return;

    // Deduct stock of reward if it exists
    const allRewards = getRewards();
    const matchedReward = allRewards.find(r => r.id === tx.rewardId);

    if (matchedReward) {
      if (matchedReward.stock <= 0) {
        showStatus('❌ ไม่สามารถอนุมัติได้เนื่องจากของรางวัล "สินค้าหมดสต็อก"');
        return;
      }
      // Update stock
      const updatedRewards = allRewards.map(r => {
        if (r.id === tx.rewardId) {
          return { ...r, stock: r.stock - 1 };
        }
        return r;
      });
      saveRewards(updatedRewards);
    }

    // Set transaction completed
    const updatedTxs = allTxs.map(t => {
      if (t.id === txId) {
        return { ...t, status: 'completed' as const };
      }
      return t;
    });
    saveTransactions(updatedTxs);

    showStatus('✓ อนุมัติการแลกของรางวัล เรียบร้อยแล้ว!');
    onDataChange();
    loadData();
  };

  // 2. REJECT CUSTOMER CLAIM (Refunds Points)
  const handleRejectRedeem = (txId: string) => {
    const allTxs = getTransactions();
    const tx = allTxs.find(t => t.id === txId);
    if (!tx || tx.status !== 'pending') return;

    // Refund points to user
    const allCustomers = getCustomers();
    const updatedCustomers = allCustomers.map(c => {
      if (c.id === tx.userId) {
        const refundedPoints = c.currentPoints + tx.points; // point cost of reward
        return { ...c, currentPoints: refundedPoints };
      }
      return c;
    });
    saveCustomers(updatedCustomers);

    // Reject transaction
    const updatedTxs = allTxs.map(t => {
      if (t.id === txId) {
        return { ...t, status: 'rejected' as const, description: `${t.description} (ถูกปฏิเสธโดยแอดมิน - แต้มคืนเรียบร้อย)` };
      }
      return t;
    });
    saveTransactions(updatedTxs);

    showStatus('✕ ปฏิเสธคำขอแลกของรางวัล และคืนคูปองคะแนนให้ลูกค้าสำเร็จ');
    onDataChange();
    loadData();
  };

  // 3. GENERATED LINK SIMULATION (Adds points to current user context immediately!)
  const simulateCustomerScanned = () => {
    const allCustomers = getCustomers();
    const scopedCustomers = filterCustomersByShop(allCustomers, selectedShopId, getTransactions(), true);
    // Pick the first member scoped to the active shop only.
    const victim = scopedCustomers[0];
    if (!victim) {
      showStatus('❌ ยังไม่มีลูกค้าให้ทดสอบรับแต้ม');
      return;
    }

    const updatedCusts = allCustomers.map(c => {
      if (c.id === victim.id) {
        const newPts = c.currentPoints + generatePoints;
        const newLifetime = c.lifetimePoints + generatePoints;
        const newTier = getTierForLifetime(newLifetime);

        return { ...c, currentPoints: newPts, lifetimePoints: newLifetime, tier: newTier, shopIds: Array.from(new Set([...(c.shopIds || []), selectedShopId])) };
      }
      return c;
    });
    saveCustomers(updatedCusts);

    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: victim.id,
      userName: victim.name,
      userPhone: victim.phone,
      shopId: selectedShopId,
      shopName: shops.find(s => s.id === selectedShopId)?.name || 'Koffee Craft',
      type: 'earn',
      points: generatePoints,
      description: `รับแต้มจากลิงก์ของร้าน: ${generateDesc}`,
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    saveTransactions([newTx, ...getTransactions()]);
    showStatus(`✓ ทดสอบรับแต้มสำเร็จ มอบ +${generatePoints} ให้ลูกค้า ${victim.name} เรียบร้อยแล้ว`);
    onDataChange();
    loadData();
  };

  // 4. MANUAL ADJUST POINTS FOR สมาชิก
  const handleManualAdjustPoints = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustForAdjust) return;

    const allCustomers = getCustomers();
    const finalAmount = adjustType === 'add' ? adjustPoints : -adjustPoints;
    
    // Validate deduction
    if (adjustType === 'deduct' && selectedCustForAdjust.currentPoints < adjustPoints) {
      showStatus('❌ แต้มไม่พอสำหรับการหักรายการนี้');
      return;
    }

    const updatedCusts = allCustomers.map(c => {
      if (c.id === selectedCustForAdjust.id) {
        const finalPts = c.currentPoints + finalAmount;
        const finalLifetime = adjustType === 'add' ? c.lifetimePoints + adjustPoints : c.lifetimePoints;
        const newTier = getTierForLifetime(finalLifetime);

        return { ...c, currentPoints: finalPts, lifetimePoints: finalLifetime, tier: newTier, shopIds: Array.from(new Set([...(c.shopIds || []), selectedShopId])) };
      }
      return c;
    });

    saveCustomers(updatedCusts);

    // Record system adjustment transaction
    const newTx: Transaction = {
      id: `tx_${Date.now()}`,
      userId: selectedCustForAdjust.id,
      userName: selectedCustForAdjust.name,
      userPhone: selectedCustForAdjust.phone,
      shopId: selectedShopId,
      shopName: shops.find(s => s.id === selectedShopId)?.name || 'Koffee Craft',
      type: adjustType === 'add' ? 'earn' : 'redeem',
      points: adjustPoints,
      description: `ปรับแต้มโดยร้าน: ${adjustReason}`,
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    saveTransactions([newTx, ...getTransactions()]);
    setSelectedCustForAdjust(null);
    showStatus(`✓ ปรับแต้มลูกค้า ${selectedCustForAdjust.name} จำนวน ${finalAmount} แต้ม สำเร็จ!`);
    onDataChange();
    loadData();
  };

  // 5. MANAGING REWARDS (Add/Edit)
  const openAddReward = () => {
    setEditingReward(null);
    setNewRewName('');
    setNewRewPoints(100);
    setNewRewStock(20);
    setNewRewDesc('');
    setNewRewImage('https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&auto=format&fit=crop&q=80');
    setShowRewardModal(true);
  };

  const openEditReward = (reward: Reward) => {
    setEditingReward(reward);
    setNewRewName(reward.name);
    setNewRewPoints(reward.pointsCost);
    setNewRewStock(reward.stock);
    setNewRewDesc(reward.description);
    setNewRewImage(reward.image);
    setShowRewardModal(true);
  };

  const saveRewardForm = (e: React.FormEvent) => {
    e.preventDefault();
    const allRewards = getRewards();

    if (editingReward) {
      // Edit
      const updated = allRewards.map(r => {
        if (r.id === editingReward.id) {
          return {
            ...r,
            name: newRewName,
            pointsCost: newRewPoints,
            stock: newRewStock,
            description: newRewDesc,
            image: newRewImage || 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400'
          };
        }
        return r;
      });
      saveRewards(updated);
      showStatus('✓ อัปเดตรายการสินค้าของรางวัลสำเร็จ');
    } else {
      // Add
      const newRew: Reward = {
        id: `rew_${Date.now()}`,
        name: newRewName,
        pointsCost: newRewPoints,
        stock: newRewStock,
        description: newRewDesc,
        image: newRewImage || 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400',
        isAvailable: true,
        shopId: selectedShopId
      };
      saveRewards([...allRewards, newRew]);
      showStatus('✓ บันทึกเปิดตัวสินค้าของรางวัลใหม่สำเร็จ');
    }

    setShowRewardModal(false);
    onDataChange();
    loadData();
  };

  const handleDeleteReward = (rewId: string) => {
    if (confirm('คุณต้องการยกเลิกและลบบาร์นี้ถาวรจากฐานสตรีมมิ่งเลยใช่หรือไม่?')) {
      const filtered = getRewards().filter(r => r.id !== rewId);
      saveRewards(filtered);
      showStatus('✓ ลบสินค้าของรางวัลเรียบร้อยแล้ว');
      onDataChange();
      loadData();
    }
  };

  const handleDeleteBanner = (bannerId: string) => {
    if (confirm('คุณแน่ใจต้องการลบแคมเปญโปรโมชั่นนี้ออกจากการแสดงผลอย่างถาวรใช่หรือไม่?')) {
      const filtered = getBanners().filter(b => b.id !== bannerId);
      saveBanners(filtered);
      showStatus('✓ ลบแคมเปญโปรโมชั่นสำเร็จ');
      onDataChange();
      loadData();
    }
  };

  const handleDeleteTransactionPermanently = (txId: string) => {
    if (confirm('คุณต้องการลบรายงานประวัติประวัติธุรกรรมนี้ถาวรจากฐานสตรีมมิ่งเลยใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      const filtered = getTransactions().filter(t => t.id !== txId);
      saveTransactions(filtered);
      showStatus('✓ ลบข้อมูลประวัติธุรกรรมถาวรเรียบร้อยแล้ว');
      onDataChange();
      loadData();
    }
  };

  const handleCreatePromoBanner = (e: React.FormEvent) => {
    e.preventDefault();
    const allBanners = getBanners();
    const newBan: PromoBanner = {
      id: `ban_${Date.now()}`,
      title: newBannerTitle,
      description: newBannerDesc || 'โปรโมชันพิเศษสำหรับสมาชิก',
      image: newBannerImage || 'https://images.unsplash.com/photo-1517142089942-ba376ce32a2e?w=400',
      expirationDate: new Date(newBannerExp || '2026-06-30').toISOString(),
      shopId: selectedShopId,
      isAd: false
    };
    saveBanners([...allBanners, newBan]);
    showStatus('✓ สร้างโปรโมชันเรียบร้อยแล้ว');
    setShowBannerModal(false);
    
    // Reset states
    setNewBannerTitle('');
    setNewBannerDesc('');
    setNewBannerImage('');
    setNewBannerExp('2026-06-30');

    onDataChange();
    loadData();
  };

  const pendingRedeems = transactions.filter(t => t.type === 'redeem' && t.status === 'pending');
  const completedRedeems = transactions.filter(t => t.type === 'redeem' && t.status === 'completed');
  const earnTransactions = transactions.filter(t => t.type === 'earn' && t.status === 'completed');
  const totalPointsIssued = earnTransactions.reduce((sum, tx) => sum + tx.points, 0);
  const availableRewards = rewards.filter(reward => reward.isAvailable);
  const usableCoupons = generatedCouponsList.filter((coupon: any) => !coupon.isUsed && new Date(coupon.expiresAt) > new Date());
  const latestActivities = [...transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const merchantPages: Array<{ id: MerchantTab; label: string; shortLabel: string; icon: string; count?: number; description: string }> = [
    { id: 'dashboard', label: 'แดชบอร์ด', shortLabel: 'หน้าแรก', icon: '🏠', description: 'ภาพรวมของร้านวันนี้' },
    { id: 'generator', label: 'ลิงก์รับแต้ม', shortLabel: 'รับแต้ม', icon: '🔗', count: usableCoupons.length, description: 'สร้างลิงก์หรือ QR สำหรับให้ลูกค้ารับแต้ม' },
    { id: 'rewards', label: 'ของรางวัล', shortLabel: 'รางวัล', icon: '🎁', count: rewards.length, description: 'เพิ่ม แก้ไข และเปิดปิดของรางวัล' },
    { id: 'approvals', label: 'อนุมัติรางวัล', shortLabel: 'อนุมัติ', icon: '✅', count: pendingRedeems.length, description: 'ตรวจรายการที่ลูกค้าขอแลกรางวัล' },
    { id: 'settings', label: 'ตั้งค่า', shortLabel: 'ตั้งค่า', icon: '⚙️', description: 'ข้อมูลร้านและลิงก์สำคัญ' },
    { id: 'customers', label: 'สมาชิก', shortLabel: 'สมาชิก', icon: '👥', count: customers.length, description: 'รายชื่อลูกค้าและการปรับแต้ม' },
    { id: 'promotions', label: 'โปรโมชัน', shortLabel: 'โปรโมชัน', icon: '📢', count: banners.length, description: 'แบนเนอร์และโปรโมชันที่แสดงในหน้าลูกค้า' },
  ];

  const currentPage = merchantPages.find(page => page.id === activeTab) || merchantPages[0];

  const goToTab = (tab: MerchantTab) => {
    setActiveTab(tab);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="relative bg-white border border-slate-200 rounded-3xl p-5 md:p-6.5 pb-24 md:pb-6.5 shadow-sm space-y-6.5 text-slate-900">
      
      {/* HEADER SECTION INCLUDES STATS & SWITCH SHOP */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/35 flex items-center justify-center text-amber-650">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-amber-700 font-extrabold tracking-wider uppercase">หลังบ้านร้านค้า</span>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">{activeShopDetail?.name || 'กำลังโหลดร้านค้า...'}</h2>
              <span className="bg-emerald-550/10 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/20">ออนไลน์</span>
            </div>
          </div>
        </div>

        {/* Change Store selector inside owner view */}
        <div className="flex items-center gap-2.5">
          {isProductionView ? (
            <span className="text-[11px] text-emerald-700 font-black whitespace-nowrap bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-xl">
              กำลังจัดการร้าน: {activeShopDetail?.name || selectedShopId}
            </span>
          ) : (
            <>
              <span className="text-xs text-slate-500 font-black whitespace-nowrap">เปลี่ยนร้านทดสอบ:</span>
              <select 
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs text-slate-800 font-bold max-w-[190px] cursor-pointer outline-none focus:ring-1 focus:ring-amber-500"
              >
                {shops.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </>
          )}
        </div>

      </div>

      {statusMsg && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800 shadow-sm">
          {statusMsg}
        </div>
      )}

      {/* Merchant page navigation */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50/80 p-3.5">
          <div className="space-y-0.5">
            <p className="text-[10px] font-black text-slate-500 tracking-[0.18em] uppercase">หน้าปัจจุบัน</p>
            <h3 className="text-xl font-black text-slate-950 flex items-center gap-2">
              <span>{currentPage.icon}</span>
              {currentPage.label}
            </h3>
            <p className="text-xs text-slate-600 font-medium">{currentPage.description}</p>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              className="w-full md:w-auto bg-slate-950 hover:bg-slate-800 text-white font-black px-5 py-3 rounded-2xl text-sm shadow-lg shadow-slate-950/10 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <span>เมนู</span>
              <span className={`transition ${menuOpen ? 'rotate-180' : ''}`}>⌄</span>
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full mt-2 w-[min(92vw,360px)] bg-white border border-slate-200 rounded-3xl shadow-2xl z-30 overflow-hidden p-2"
                >
                  <div className="grid grid-cols-1 gap-1.5">
                    {merchantPages.map((page) => (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => goToTab(page.id)}
                        className={`text-left rounded-2xl px-3.5 py-3 transition flex items-center justify-between gap-3 ${activeTab === page.id ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'hover:bg-slate-50 text-slate-700 border border-transparent'}`}
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <span className="text-lg">{page.icon}</span>
                          <span className="min-w-0">
                            <span className="block text-sm font-black truncate">{page.label}</span>
                            <span className="block text-[10px] text-slate-500 font-medium truncate">{page.description}</span>
                          </span>
                        </span>
                        {typeof page.count === 'number' && (
                          <span className="shrink-0 text-[10px] font-black bg-slate-100 text-slate-700 rounded-full px-2 py-0.5">
                            {page.count}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="hidden md:flex gap-2 overflow-x-auto pb-1">
          {merchantPages.slice(0, 5).map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => goToTab(page.id)}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap border transition ${activeTab === page.id ? 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/20' : 'bg-white text-slate-600 border-slate-200 hover:border-amber-200 hover:text-amber-700'}`}
            >
              {page.icon} {page.shortLabel}
              {typeof page.count === 'number' && <span className="ml-1 opacity-75">({page.count})</span>}
            </button>
          ))}
        </div>
      </div>

      {/* TABS CONTENT SYSTEM */}
      <div className="mt-4">
        {activeTab === 'dashboard' && (
          <div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <p className="text-[11px] font-black text-amber-800">รางวัลที่รอยืนยัน</p>
                <p className="mt-1 text-3xl font-black text-amber-700 font-mono">{pendingRedeems.length}</p>
                <p className="text-[10px] text-amber-700/75 font-bold">ควรตรวจรายการก่อนส่งมอบ</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-black text-slate-600">สมาชิกทั้งหมด</p>
                <p className="mt-1 text-3xl font-black text-slate-950 font-mono">{customers.length}</p>
                <p className="text-[10px] text-slate-500 font-bold">ลูกค้าของร้านนี้</p>
              </div>
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                <p className="text-[11px] font-black text-emerald-800">แต้มที่แจกแล้ว</p>
                <p className="mt-1 text-3xl font-black text-emerald-700 font-mono">{totalPointsIssued}</p>
                <p className="text-[10px] text-emerald-700/75 font-bold">รวมจากรายการที่บันทึกสำเร็จ</p>
              </div>
              <div className="rounded-3xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
                <p className="text-[11px] font-black text-sky-800">ลิงก์รับแต้มพร้อมใช้</p>
                <p className="mt-1 text-3xl font-black text-sky-700 font-mono">{usableCoupons.length}</p>
                <p className="text-[10px] text-sky-700/75 font-bold">ยังไม่หมดอายุและยังไม่ถูกใช้</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-base font-black text-slate-950">ภาพรวมร้านวันนี้</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">สรุปข้อมูลสำคัญสำหรับเจ้าของร้าน ก่อนเข้าไปจัดการแต่ละเมนู</p>
                  </div>
                  <button type="button" onClick={() => goToTab('approvals')} className="text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1.5">
                    ดูรายการรออนุมัติ
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <p className="text-[10px] font-black text-slate-500">ของรางวัลที่เปิดให้แลก</p>
                    <p className="text-2xl font-black text-slate-950 font-mono mt-1">{availableRewards.length}</p>
                    <p className="text-[10px] text-slate-500 font-medium">จากทั้งหมด {rewards.length} รายการ</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <p className="text-[10px] font-black text-slate-500">รายการแลกสำเร็จ</p>
                    <p className="text-2xl font-black text-slate-950 font-mono mt-1">{completedRedeems.length}</p>
                    <p className="text-[10px] text-slate-500 font-medium">รายการที่ร้านอนุมัติแล้ว</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <p className="text-[10px] font-black text-slate-500">โปรโมชันที่แสดงอยู่</p>
                    <p className="text-2xl font-black text-slate-950 font-mono mt-1">{banners.length}</p>
                    <p className="text-[10px] text-slate-500 font-medium">แสดงในหน้าลูกค้า</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-black text-slate-800">รายการล่าสุด</span>
                    <span className="text-[10px] text-slate-500 font-bold">แสดง 5 รายการล่าสุด</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {latestActivities.map((tx) => (
                      <div key={tx.id} className="px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">{tx.userName}</p>
                          <p className="text-[10px] text-slate-500 truncate">{tx.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-black font-mono ${tx.type === 'earn' ? 'text-emerald-700' : 'text-rose-600'}`}>{tx.type === 'earn' ? '+' : '-'}{tx.points}</p>
                          <p className="text-[9px] text-slate-500">{new Date(tx.createdAt).toLocaleDateString('th-TH')}</p>
                        </div>
                      </div>
                    ))}
                    {latestActivities.length === 0 && (
                      <div className="px-4 py-8 text-center text-xs text-slate-500 font-medium">ยังไม่มีรายการในร้านนี้</div>
                    )}
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-950 text-white p-5 shadow-sm space-y-4">
                <div>
                  <p className="text-[10px] font-black text-amber-300 tracking-[0.18em] uppercase">ทางลัด</p>
                  <h4 className="text-lg font-black mt-1">ทำรายการที่ใช้บ่อย</h4>
                </div>
                <div className="grid gap-2.5">
                  <button type="button" onClick={() => goToTab('generator')} className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-3 text-left transition">
                    <span className="block text-sm font-black">สร้างลิงก์รับแต้ม</span>
                    <span className="block text-[10px] text-slate-300 mt-0.5">ส่งให้ลูกค้าทาง LINE หรือทำ QR หน้าร้าน</span>
                  </button>
                  <button type="button" onClick={() => goToTab('rewards')} className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-3 text-left transition">
                    <span className="block text-sm font-black">จัดการของรางวัล</span>
                    <span className="block text-[10px] text-slate-300 mt-0.5">เพิ่ม ปิด เปิด หรือแก้ไขของรางวัล</span>
                  </button>
                  <button type="button" onClick={() => goToTab('customers')} className="rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-3 text-left transition">
                    <span className="block text-sm font-black">ดูสมาชิก</span>
                    <span className="block text-[10px] text-slate-300 mt-0.5">ค้นหาลูกค้าและปรับแต้มเมื่อจำเป็น</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h4 className="text-base font-black text-slate-950">ตั้งค่าร้านเบื้องต้น</h4>
              <p className="text-xs text-slate-500 font-medium mt-1">หน้านี้เป็นจุดรวมข้อมูลสำคัญของร้าน ตอนนี้ยังเป็นข้อมูลอ่านอย่างเดียวก่อน รอบถัดไปค่อยเปิดให้แก้ไขได้</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] font-black text-slate-500">ชื่อร้าน</p>
                  <p className="text-sm font-black text-slate-950 mt-1">{activeShopDetail?.name || selectedShopId}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] font-black text-slate-500">Slug สำหรับลิงก์</p>
                  <p className="text-sm font-black text-slate-950 mt-1">{shopIdToSlug(selectedShopId)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] font-black text-slate-500">อัตราแจกแต้ม</p>
                  <p className="text-sm font-black text-slate-950 mt-1">ทุก {pointsRate} บาท = 1 แต้ม</p>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-[10px] font-black text-slate-500">ลิงก์หน้าลูกค้า</p>
                  <p className="text-xs font-bold text-emerald-700 mt-1 break-all">{typeof window !== 'undefined' ? `${window.location.origin}/customer/${shopIdToSlug(selectedShopId)}` : `/customer/${shopIdToSlug(selectedShopId)}`}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <h4 className="text-sm font-black text-amber-900">ข้อเสนอแนะสำหรับรอบถัดไป</h4>
              <ul className="mt-3 space-y-2 text-xs text-amber-900 font-medium list-disc pl-5">
                <li>เพิ่มหน้าแก้ไขข้อมูลร้าน เช่น คำอธิบายร้าน รูปหน้าปก และช่องทางติดต่อ</li>
                <li>เพิ่มเมนูพนักงานร้าน ถ้าต้องการให้คนอื่นช่วยตรวจรางวัลหรือแจกแต้ม</li>
                <li>เพิ่มรายงานรายวัน เช่น แต้มที่แจกวันนี้ รางวัลที่แลกวันนี้ และลูกค้าใหม่วันนี้</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB A: APPROVALS LIST & ALL HISTORIES */}
        {activeTab === 'approvals' && (
          <div className="space-y-4 animate-fade-in">
            {/* Sub-Tabs Switches */}
            <div className="flex bg-neutral-900 p-1 rounded-xl border border-neutral-850 gap-1.5 self-start w-fit">
              <button
                type="button"
                onClick={() => setApprovalsSubTab('queue')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${approvalsSubTab === 'queue' ? 'bg-yellow-500 text-neutral-950 shadow' : 'text-neutral-400 hover:text-neutral-200'}`}
              >
                🕒 รายการรอยืนยัน ({transactions.filter(t => t.type === 'redeem' && t.status === 'pending').length} รายการ)
              </button>
              <button
                type="button"
                onClick={() => setApprovalsSubTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${approvalsSubTab === 'history' ? 'bg-yellow-500 text-neutral-950 shadow' : 'text-neutral-400 hover:text-neutral-200'}`}
              >
                📜 ประวัติรายการทั้งหมด ({transactions.length} รายการ)
              </button>
            </div>

            {approvalsSubTab === 'queue' ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-yellow-500/5 px-4 py-3 rounded-xl border border-yellow-500/10">
                  <div className="flex items-center gap-2 text-xs text-yellow-500 font-medium font-sans">
                    <AlertCircle className="w-4 h-4" />
                    <span>ก่อนกดยืนยัน กรุณาตรวจสอบกับลูกค้าหรือของรางวัลที่หน้าร้านให้เรียบร้อย</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider font-mono">
                        <th className="pb-3 pl-2">ชื่อลูกค้า / โทรศัพท์</th>
                        <th className="pb-3">ของรางวัลที่ขอแลก</th>
                        <th className="pb-3">แต้มที่ใช้</th>
                        <th className="pb-3 font-mono">วันที่ทำรายการ</th>
                        <th className="pb-3 pl-2">การจัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {transactions
                        .filter(t => t.type === 'redeem')
                        .map(t => {
                          const showBadge = t.status === 'pending';
                          return (
                            <tr key={t.id} className="hover:bg-amber-50/50">
                              <td className="py-3.5 pl-2">
                                <div className="font-semibold text-slate-900">{t.userName}</div>
                                <div className="text-[10px] text-slate-600">{t.userPhone}</div>
                              </td>
                              <td className="py-3.5 font-medium text-slate-800">
                                {t.description.replace('ขอแลกรางวัล: ', '')}
                              </td>
                              <td className="py-3.5 font-mono text-rose-400 font-bold font-semibold">-{t.points} แต้ม</td>
                              <td className="py-3.5 text-slate-600 font-mono">
                                {new Date(t.createdAt).toLocaleDateString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="py-3.5">
                                {showBadge ? (
                                  <div className="flex gap-1.5">
                                    <button 
                                      onClick={() => handleApproveRedeem(t.id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded text-[10px] transition cursor-pointer active:scale-95"
                                    >
                                      ✓ อนุมัติยื่นของ
                                    </button>
                                    <button 
                                      onClick={() => handleRejectRedeem(t.id)}
                                      className="bg-rose-600/90 hover:bg-rose-700 text-white font-bold px-2 py-1 rounded text-[10px] transition cursor-pointer active:scale-95"
                                    >
                                      ✕ ปฏิเสธ
                                    </button>
                                  </div>
                                ) : (
                                  <span className={`text-[10px] font-mono uppercase font-bold ${t.status === 'completed' ? 'text-emerald-700' : 'text-slate-500 line-through'}`}>
                                    {t.status === 'completed' ? 'อนุมัติเรียบร้อย' : 'คำขอถูกยกเลิก'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                      {transactions.filter(t => t.type === 'redeem').length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500 font-medium font-sans">
                            ยังไม่พบคำร้องขอแลกของรางวัลใดๆ สำหรับแบรนด์ของคุณ
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex justify-between items-center">
                  <span className="font-sans">แอดมินสามารถติดตามดูประวัติสะสมแต้ม/สแกน QR และข้อมูลแลกของรางวัลทั้งหมดในเครือคุณได้ ย้อนหลังครบถ้วน</span>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold">รวมทั้งหมด: {transactions.length} รายการ</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider font-mono">
                        <th className="pb-3 pl-2">รหัสธุรกรรม / อ้างอิง</th>
                        <th className="pb-3">ประเภทกิจกรรม</th>
                        <th className="pb-3">รายละเอียดบัญชี</th>
                        <th className="pb-3">แต้ม</th>
                        <th className="pb-3 font-mono">วันที่ทำรายการ</th>
                        <th className="pb-3 text-right pr-2">การดำเนินการถาวร</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {transactions.map(t => (
                        <tr key={t.id} className="hover:bg-amber-50/50">
                          <td className="py-3.5 pl-2 font-mono text-[10.5px]">
                            <div className="font-bold text-slate-900">{t.id}</div>
                            <div className="text-[9px] text-neutral-400">ลูกค้า: {t.userName} • {t.userPhone}</div>
                          </td>
                          <td className="py-3.5 font-sans">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${t.type === 'earn' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                              {t.type === 'earn' ? '📊 สะสมแต้ม' : '🎁 แลกรางวัล'}
                            </span>
                          </td>
                          <td className="py-3.5 text-slate-800 font-medium text-[11px] font-sans">
                            {t.description}
                          </td>
                          <td className={`py-3.5 font-mono text-xs font-black ${t.type === 'earn' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {t.type === 'earn' ? `+${t.points}` : `-${t.points}`} แต้ม
                          </td>
                          <td className="py-3.5 text-slate-600 font-mono text-[10.5px]">
                            {new Date(t.createdAt).toLocaleString('th-TH')}
                          </td>
                          <td className="py-3.5 text-right pr-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteTransactionPermanently(t.id)}
                              className="p-1 px-2 border border-red-500/20 bg-red-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition duration-150 text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                              title="ลบถาวร"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              ลบถาวร
                            </button>
                          </td>
                        </tr>
                      ))}

                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-500 font-medium font-sans">
                            ยังไม่มีข้อมูลประวัติธุรกรรมสะสมแต้มใดในระบบเว็พบอร์ดขณะนี้
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB B: CUSTOMERS สมาชิก DIRECTORY */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            
            {/* Search filter bar */}
            <div className="flex flex-col lg:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder="ค้นหาลูกค้าสะสมแต้มด้วยชื่อ หรือเบอร์โทรศัพท์..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-9 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowCustomerModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
              >
                <UserPlus className="w-3.5 h-3.5" /> เพิ่มสมาชิก
              </button>
            </div>

            <form onSubmit={handleRecordPurchase} className="grid grid-cols-1 lg:grid-cols-12 gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 text-slate-800">
              <div className="lg:col-span-4 space-y-1">
                <label className="text-[10px] font-black text-amber-700 uppercase tracking-wider">เลือกลูกค้า</label>
                <select
                  value={selectedSaleCustomerId}
                  onChange={(e) => setSelectedSaleCustomerId(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-300"
                >
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name} • {customer.phone}</option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-3 space-y-1">
                <label className="text-[10px] font-black text-amber-700 uppercase tracking-wider">ยอดซื้อ / บาท</label>
                <input
                  type="number"
                  min={0}
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
              <div className="lg:col-span-3 space-y-1">
                <label className="text-[10px] font-black text-amber-700 uppercase tracking-wider">หมายเหตุ</label>
                <input
                  type="text"
                  value={saleReason}
                  onChange={(e) => setSaleReason(e.target.value)}
                  className="w-full bg-white border border-amber-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-300"
                />
              </div>
              <div className="lg:col-span-2 flex flex-col justify-end gap-1">
                <span className="text-[10px] text-slate-500 font-bold text-center">คำนวณ: {pointsRate} บาท = 1 แต้ม</span>
                <button
                  type="submit"
                  disabled={customers.length === 0}
                  className="bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 disabled:text-slate-500 text-neutral-950 font-black text-xs px-3 py-2 rounded-xl flex items-center justify-center gap-1 cursor-pointer transition active:scale-95"
                >
                  <ReceiptText className="w-3.5 h-3.5" /> บันทึก +{calculatedSalePoints} แต้ม
                </button>
              </div>
            </form>

            {/* Customer tabular grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider font-mono">
                    <th className="pb-3 pr-2">ข้อมูลลูกค้า / พร็อพเพอร์ตี้ LINE</th>
                    <th className="pb-3">ระดับสมาชิก</th>
                    <th className="pb-3">แต้มปัจจุบัน</th>
                    <th className="pb-3">แต้มสะสมทั้งหมด</th>
                    <th className="pb-3">เข้าระบบเมื่อ</th>
                    <th className="pb-3 text-right">ปรับแต้ม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-amber-50/50">
                      <td className="py-3.5 pr-2">
                        <div className="flex items-center gap-2.5">
                          <img src={c.avatar} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                          <div>
                            <div className="font-semibold text-slate-900">{c.name}</div>
                            <div className="text-[10px] text-slate-600">{c.phone} • LINE: {c.lineName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${c.tier === 'Platinum' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : c.tier === 'Gold' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
                          {c.tier}
                        </span>
                      </td>
                      <td className="py-3.5 font-bold font-mono text-amber-700 text-sm">{c.currentPoints} แต้ม</td>
                      <td className="py-3.5 font-mono text-slate-700">{c.lifetimePoints} แต้ม</td>
                      <td className="py-3.5 font-mono text-slate-500">{new Date(c.createdAt).toLocaleDateString('th-TH')}</td>
                      <td className="py-3.5 text-right font-medium">
                        <button 
                          onClick={() => {
                            setSelectedCustForAdjust(c);
                            setAdjustPoints(20);
                            setAdjustType('add');
                          }}
                          className="bg-yellow-500 font-bold hover:bg-yellow-600 text-neutral-950 px-2.5 py-1 rounded text-[10px] transition active:scale-95 cursor-pointer"
                        >
                          แก้ไขแต้ม (+/-)
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-medium font-sans">
                        ยังไม่พบสมาชิกของร้านนี้ กด “เพิ่มสมาชิก” หรือให้ลูกค้ารับแต้มจากลิงก์ Rich Menu เพื่อเริ่มต้นได้เลย
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* EDIT POINTS MODAL IF USER SELECTS A CUSTOMER */}
            {selectedCustForAdjust && (
              <div className="fixed inset-0 bg-neutral-950/80 z-50 flex items-center justify-center p-4">
                <form 
                  onSubmit={handleManualAdjustPoints}
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative"
                >
                  <button 
                    type="button"
                    onClick={() => setSelectedCustForAdjust(null)}
                    className="absolute top-4 right-4 text-neutral-400 hover:text-white"
                  >
                    ✕
                  </button>

                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-neutral-100">ปรับแต้มลูกค้าด้วยมือ</h4>
                    <p className="text-[10px] text-slate-600">ลูกค้าปัจจุบัน: {selectedCustForAdjust.name}</p>
                  </div>

                  <div className="bg-neutral-950 p-2.5 rounded-lg text-[10px] text-center text-neutral-400">
                    มีแต้มปัจจุบันสะสมอยู่: <span className="font-mono text-yellow-400 font-bold">{selectedCustForAdjust.currentPoints} แต้ม</span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10.5px] text-neutral-400 block font-medium">กระทำการ / ทิศทางการเงิน:</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          type="button"
                          onClick={() => setAdjustType('add')}
                          className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${adjustType === 'add' ? 'bg-emerald-600 text-white' : 'bg-neutral-950 text-neutral-400'}`}
                        >
                          <PlusCircle className="w-3.5 h-3.5" /> เติมเพิ่มแต้ม (+)
                        </button>
                        <button 
                          type="button"
                          onClick={() => setAdjustType('deduct')}
                          className={`py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${adjustType === 'deduct' ? 'bg-rose-600 text-white' : 'bg-neutral-950 text-neutral-400'}`}
                        >
                          <MinusCircle className="w-3.5 h-3.5" /> หักแต้ม (-)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10.5px] text-neutral-400 block font-medium">จำนวนแต้ม</label>
                      <input 
                        type="number"
                        min={1}
                        max={1000}
                        value={adjustPoints}
                        onChange={(e) => setAdjustPoints(parseInt(e.target.value) || 0)}
                        className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10.5px] text-neutral-400 block font-medium">เหตุผลในการแก้ไขบัญชี :</label>
                      <input 
                        type="text"
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        placeholder="เช่น เพิ่มแต้มย้อนหลังจากบิลที่ตกหล่น"
                        className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1.5">
                    <button 
                      type="button"
                      onClick={() => setSelectedCustForAdjust(null)}
                      className="flex-1 bg-neutral-800 hover:bg-neutral-750 text-xs py-2 rounded-lg"
                    >
                      ยกเลิก
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-neutral-950 font-bold text-xs py-2 rounded-lg transition"
                    >
                      ตกลงแก้ไข
                    </button>
                  </div>
                </form>
              </div>
            )}

            {showCustomerModal && (
              <div className="fixed inset-0 bg-neutral-950/80 z-50 flex items-center justify-center p-4">
                <form
                  onSubmit={handleCreateCustomer}
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative"
                >
                  <button
                    type="button"
                    onClick={() => setShowCustomerModal(false)}
                    className="absolute top-4 right-4 text-neutral-400 hover:text-white"
                  >
                    ✕
                  </button>
                  <div>
                    <h4 className="text-sm font-bold text-neutral-100">เพิ่มสมาชิกใหม่ของร้าน</h4>
                    <p className="text-[10px] text-slate-600 mt-1">ใช้สำหรับเพิ่มลูกค้าที่สมัครหน้าร้านก่อนเชื่อม LINE Login จริง</p>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10.5px] text-neutral-400 block">ชื่อลูกค้า</label>
                      <input
                        type="text"
                        value={newCustomerName}
                        onChange={(e) => setNewCustomerName(e.target.value)}
                        placeholder="เช่น คุณแมน"
                        className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg outline-none"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10.5px] text-neutral-400 block">เบอร์โทรศัพท์</label>
                      <input
                        type="tel"
                        value={newCustomerPhone}
                        onChange={(e) => setNewCustomerPhone(e.target.value)}
                        placeholder="เช่น 0812345678"
                        className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10.5px] text-neutral-400 block">ชื่อ LINE / หมายเหตุ</label>
                      <input
                        type="text"
                        value={newCustomerLineName}
                        onChange={(e) => setNewCustomerLineName(e.target.value)}
                        placeholder="เช่น Manit LINE"
                        className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg outline-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1.5">
                    <button
                      type="button"
                      onClick={() => setShowCustomerModal(false)}
                      className="flex-1 bg-neutral-800 hover:bg-neutral-750 text-xs py-2 rounded-lg"
                    >
                      ยกเลิก
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 rounded-lg transition"
                    >
                      เพิ่มสมาชิก
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        )}

        {/* TAB C: SHOP REWARDS CATALOG */}
        {activeTab === 'rewards' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider">รายการของรางวัลของร้าน</h3>
              <button 
                onClick={openAddReward}
                className="bg-yellow-500 hover:bg-yellow-600 text-neutral-950 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มของรางวัลใหม่
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.map(rew => (
                <div key={rew.id} className="bg-white border border-slate-200 p-3.5 rounded-2xl flex gap-3 shadow-sm">
                  <img src={rew.image} alt={rew.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{rew.name}</h4>
                      <p className="text-[10px] text-slate-600 line-clamp-1">{rew.description}</p>
                      <p className="text-[10px] font-semibold text-yellow-500 mt-1">ใช้แต้ม : {rew.pointsCost} แต้ม • สต็อก: {rew.stock} ชิ้น</p>
                      <span className={`inline-flex w-fit mt-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${rew.isAvailable ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {rew.isAvailable ? 'แสดงบนหน้าลูกค้า' : 'ปิดการแสดงผล'}
                      </span>
                    </div>
                    
                    <div className="flex justify-end gap-1.5 mt-2">
                      <button 
                        onClick={() => handleToggleRewardAvailability(rew.id)}
                        className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-900 px-2.5 py-1.5 rounded-lg active:scale-90 transition cursor-pointer text-[10px] font-black shadow-sm"
                      >
                        {rew.isAvailable ? 'ปิด' : 'เปิด'}
                      </button>
                      <button 
                        onClick={() => openEditReward(rew)}
                        className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 p-1.5 rounded-lg active:scale-90 transition cursor-pointer shadow-sm"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDeleteReward(rew.id)}
                        className="bg-rose-950/40 hover:bg-rose-900 border border-rose-500/10 text-rose-400 p-1.5 rounded-lg active:scale-90 transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {rewards.length === 0 && (
                <div className="md:col-span-2 py-12 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 font-sans text-xs">
                  ยังไม่มีของรางวัลของร้านนี้ กด “เพิ่มของรางวัลใหม่” เพื่อเริ่มสร้างรายการแลกแต้มจริง
                </div>
              )}
            </div>

            {/* ADD OR EDIT REWARD CATALOG POPUP FORM */}
            {showRewardModal && (
              <div className="fixed inset-0 bg-neutral-950/85 z-50 flex items-center justify-center p-4">
                <form 
                  onSubmit={saveRewardForm}
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative"
                >
                  <button 
                    type="button"
                    onClick={() => setShowRewardModal(false)}
                    className="absolute top-4 right-4 text-neutral-400 hover:text-white"
                  >
                    ✕
                  </button>

                  <h4 className="text-sm font-bold text-neutral-100">
                    {editingReward ? 'แก้ไขของรางวัล' : 'เพิ่มของรางวัลใหม่'}
                  </h4>

                  <div className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[10.5px] text-neutral-400 block">ชื่อของรางวัลเป็นทางการ :</label>
                      <input 
                        type="text"
                        value={newRewName}
                        onChange={(e) => setNewRewName(e.target.value)}
                        placeholder="ตัวอย่างเช่น ส่วนลดอาหาร 100 บาท"
                        className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg outline-none"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10.5px] text-neutral-400 block">แต้มที่จะดึงใช้ :</label>
                        <input 
                          type="number"
                          value={newRewPoints}
                          onChange={(e) => setNewRewPoints(parseInt(e.target.value) || 0)}
                          className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10.5px] text-neutral-400 block">เปิดสต็อกเบื้องต้น :</label>
                        <input 
                          type="number"
                          value={newRewStock}
                          onChange={(e) => setNewRewStock(parseInt(e.target.value) || 0)}
                          className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10.5px] text-neutral-400 block">ภาพถ่ายของรางวัล (URL รูปภาพอินเตอร์เน็ต) :</label>
                      <input 
                        type="url"
                        value={newRewImage}
                        onChange={(e) => setNewRewImage(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10.5px] text-neutral-400 block">เงื่อนไขการใช้สิทธิ์เพิ่มเติม :</label>
                      <textarea 
                        value={newRewDesc}
                        onChange={(e) => setNewRewDesc(e.target.value)}
                        placeholder="เช่น แลกได้จำกัดสิทธิ์ สูงสุด 1 ท่านต่อ 1 ครั้ง เท่านั้น"
                        className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg h-20 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      type="button"
                      onClick={() => setShowRewardModal(false)}
                      className="flex-1 bg-neutral-800 hover:bg-neutral-750 text-xs py-2 rounded-lg"
                    >
                      ปิด
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-neutral-950 font-bold text-xs py-2 rounded-lg transition"
                    >
                      บันทึกสถิติ
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB D: PROMOTIONS & ADS */}
        {activeTab === 'promotions' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider">โปรโมชันหน้าลูกค้า</h3>
                <p className="text-[10px] text-slate-600">โปรโมชั่นที่ประกาศหน้าบ้านของคุณจะนำเสนอในหน้าจอ Line OA ในวันเดียวกัน</p>
              </div>
              <button 
                onClick={() => setShowBannerModal(true)}
                className="bg-yellow-500 hover:bg-yellow-600 text-neutral-950 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> สร้างโปรโมชั่นใหม่
              </button>
            </div>

            <div className="space-y-3.5">
              {banners.map((ban, idx) => (
                <div key={idx} className="bg-neutral-950 border border-neutral-850 p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <img src={ban.image} alt={ban.title} className="w-full md:w-36 h-20 object-cover rounded-xl border border-neutral-800" referrerPolicy="no-referrer" />
                  <div className="flex-grow space-y-1">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-bold text-neutral-100">{ban.title}</h4>
                      <div className="flex items-center gap-1.5">
                        <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/20">เผยแพร่อยู่</span>
                        <button 
                          onClick={() => handleDeleteBanner(ban.id)}
                          className="p-1 bg-red-950/10 hover:bg-rose-900/20 text-rose-400 hover:text-rose-300 border border-transparent hover:border-rose-900/30 rounded-lg transition cursor-pointer"
                          title="ลบแคมเปญนี้อย่างถาวร"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-600 leading-relaxed">{ban.description}</p>
                    <div className="text-[9px] text-neutral-500 font-mono flex gap-3 pt-1">
                      <span>สิ้นสุดแคมเปญ: {new Date(ban.expirationDate).toLocaleDateString('th-TH')}</span>
                    </div>
                  </div>
                </div>
              ))}

              {banners.length === 0 && (
                <div className="py-12 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-500 font-sans text-xs">
                  ยังไม่ได้สร้างโปรโมชั่นหรือโพสต์โฆษณาใดๆ ในปัจจุบัน
                </div>
              )}
            </div>

            {/* Modal Add Banner */}
            {showBannerModal && (
              <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                <form 
                  onSubmit={handleCreatePromoBanner}
                  className="bg-neutral-900 border border-neutral-800 p-5 rounded-3xl w-full max-w-sm space-y-4 animate-scale-up"
                >
                  <h4 className="text-sm font-bold text-neutral-100">เพิ่มโปรโมชันใหม่</h4>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10.5px] text-neutral-400 block font-sans">ชื่อโปรโมชัน</label>
                      <input 
                        type="text"
                        value={newBannerTitle}
                        onChange={(e) => setNewBannerTitle(e.target.value)}
                        placeholder="ระบุชื่อหัวข้อแคมเปญ เช่น ดื่มชาฟรีทุกวันพุธสุดท้ายของเดือน!"
                        className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg outline-none font-sans"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10.5px] text-neutral-400 block font-sans">ลิงก์รูปภาพโปรโมชัน</label>
                      <input 
                        type="url"
                        value={newBannerImage}
                        onChange={(e) => setNewBannerImage(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg outline-none font-sans"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10.5px] text-neutral-400 block font-sans">วันสิ้นสุดโปรโมชัน</label>
                        <input 
                          type="date"
                          value={newBannerExp}
                          onChange={(e) => setNewBannerExp(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg font-sans"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10.5px] text-neutral-400 block font-sans">รายละเอียดเชิงเงื่อนไข :</label>
                      <textarea 
                        value={newBannerDesc}
                        onChange={(e) => setNewBannerDesc(e.target.value)}
                        placeholder="ระบุ เช่น จำกัดเฉพาะสิทธิ์การสั่งซื้อหน้าร้านโดยตรง ไม่ร่วมรายการเดลิเวอรี่สายอื่น"
                        className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg h-16 outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setShowBannerModal(false)}
                      className="flex-grow bg-neutral-800 hover:bg-neutral-750 text-xs py-2 rounded-lg"
                    >
                      ปิดแถบ
                    </button>
                    <button 
                      type="submit"
                      className="flex-grow bg-yellow-500 hover:bg-yellow-600 text-neutral-950 font-bold text-xs py-2 rounded-lg transition"
                    >
                      ออกอากาศทันที
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* TAB E: QR CODE & POINTS LINK GENERATOR */}
        {activeTab === 'generator' && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider">ระบบสร้างลิ้งก์และ QR Code แจกแต้มด่วน</h3>
              <p className="text-[10px] text-slate-600">กำหนดจำนวนแต้ม แล้วสร้างลิงก์หรือ QR สำหรับส่งให้ลูกค้ารับแต้ม</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              
              {/* Form settings options */}
              <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-850 space-y-4">
                <span className="text-[11px] font-bold text-yellow-500 font-mono uppercase block font-sans">การตั้งค่าพารามิเตอร์แต้มสแกน</span>
                
                <div className="space-y-1 flex flex-col">
                  <label className="text-[10px] text-slate-600 block font-sans">จำนวนแต้มที่ต้องการแจก</label>
                  <select 
                    value={generatePoints}
                    onChange={(e) => setGeneratePoints(parseInt(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-yellow-500 cursor-pointer font-sans"
                  >
                    <option value={10}>+10 แต้ม</option>
                    <option value={20}>+20 แต้ม</option>
                    <option value={50}>+50 แต้ม</option>
                    <option value={100}>+100 แต้ม</option>
                    <option value={250}>+250 แต้ม</option>
                  </select>
                </div>

                <div className="space-y-1 font-sans">
                  <label className="text-[10px] text-slate-600 block font-sans">คําอธิบายหรือวัตถุประสงค์ในการเติมแต้ม :</label>
                  <input 
                    type="text"
                    value={generateDesc}
                    onChange={(e) => setGenerateDesc(e.target.value)}
                    placeholder="เช่น ซื้อสินค้าครบ 500 บาท"
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg outline-none font-sans"
                    required
                  />
                </div>

                {/* Expiry minute input bounded 1 to 60 */}
                <div className="space-y-1 font-sans">
                  <label className="text-[10px] text-slate-600 block font-sans font-medium">
                    กำหนดเวลาหมดอายุของลิงก์แอปพลิเคชัน (1 - 60 นาที):
                  </label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="number"
                      min={1}
                      max={60}
                      value={expiryMinutes}
                      onChange={(e) => {
                        const val = Math.max(1, Math.min(60, parseInt(e.target.value) || 1));
                        setExpiryMinutes(val);
                      }}
                      className="w-24 bg-neutral-900 border border-neutral-850 text-xs text-white px-3 py-2 rounded-lg outline-none text-center font-mono focus:border-yellow-500 transition duration-150"
                    />
                    <span className="text-xs text-neutral-300 font-sans">นาที (นับจากเวลาที่สถิติกำหนดไว้)</span>
                  </div>
                  <p className="text-[9px] text-neutral-500 italic block mt-1 font-sans">ลิงก์นี้ใช้ได้ครั้งเดียวและมีวันหมดอายุ เพื่อป้องกันการรับแต้มซ้ำ</p>
                </div>

                <div className="bg-neutral-900/60 rounded-xl p-3 text-[10px] text-slate-600 space-y-2 border border-neutral-800/40">
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-400 font-bold block">🔗 ลิงก์ที่ถูกสร้างอย่างปลอดภัย:</span>
                    {activeCoupon && (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase font-mono tracking-wider animate-pulse">
                        ใช้งานได้ครั้งเดียว
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-neutral-350 break-all select-all text-xs leading-normal bg-neutral-950 p-2.5 rounded border border-neutral-850 min-h-12">
                    {generatedQRValue || 'ยังไม่ได้สร้างลิงก์ กด “สร้างลิงก์ใหม่” เพื่อออกคูปองรับแต้มแบบใช้ครั้งเดียว'}
                  </p>
                  
                  {/* Link action copy buttons underneath link */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={generateNewCouponAndLink}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-3 rounded-lg text-xs duration-150 flex items-center gap-1 cursor-pointer active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> สร้างลิงก์ใหม่
                    </button>
                    <button
                      type="button"
                      disabled={!generatedQRValue}
                      onClick={() => {
                        if (!generatedQRValue) return;
                        navigator.clipboard.writeText(generatedQRValue);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 disabled:bg-neutral-800 disabled:text-neutral-500 text-neutral-950 font-bold py-2 px-3 rounded-lg text-xs duration-150 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4" /> คัดลอกลิงก์สำเร็จแล้ว! ✓
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> คัดลอกลิงก์
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Created QR display box with scan simulator */}
              <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-850 text-center space-y-4 font-sans">
                <span className="text-[11px] font-bold text-neutral-300 font-mono uppercase block">QR รับแต้มสำหรับลูกค้า</span>
                
                {/* Visual vector simulation of qr code */}
                <div className="bg-white p-3.5 rounded-2xl w-40 h-40 mx-auto flex items-center justify-center shadow-lg relative border-4 border-yellow-500">
                  <QrCode className="w-32 h-32 text-neutral-900" />
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] text-neutral-300">
                    เมื่อลูกค้าเปิดลิงก์หรือสแกน QR จะเข้าสู่หน้ารับแต้มทันที 
                    <span className="font-bold text-yellow-500 font-mono"> +{generatePoints} แต้ม</span>
                  </div>

                  {/* Interactive Button to simulate client scanning this link */}
                  <button 
                    type="button"
                    onClick={simulateCustomerScanned}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[11px] py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
                  >
                    ทดสอบเปิดลิงก์ในมุมลูกค้า
                  </button>
                  <p className="text-[9px] text-neutral-500 italic">ใช้สำหรับทดสอบว่าลิงก์รับแต้มทำงานถูกต้องก่อนส่งให้ลูกค้า</p>
                </div>
              </div>

            </div>

            {/* Generated coupons history panel */}
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-850 space-y-3 font-sans">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-neutral-200">📜 ประวัติลิงก์รับแต้ม ({generatedCouponsList.length} รายการ)</span>
                  <p className="text-[10px] text-slate-600">ดูสถานะลิงก์ที่สร้างไว้ คัดลอกใหม่ หรือลบลิงก์ที่ไม่ต้องการใช้</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider font-mono">
                      <th className="pb-2.5 pl-2 text-left">รหัสรับแต้ม</th>
                      <th className="pb-2.5 text-left">รายละเอียด</th>
                      <th className="pb-2.5 text-left">แต้มที่ให้</th>
                      <th className="pb-2.5 font-mono text-left">สร้างเมื่อ</th>
                      <th className="pb-2.5 font-mono text-left">หมดอายุเมื่อ</th>
                      <th className="pb-2.5 text-left">สถานะ</th>
                      <th className="pb-2.5 text-right pr-2 text-left font-sans">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-sans">
                    {generatedCouponsList.map((c: any) => {
                      const isExpired = new Date() > new Date(c.expiresAt);
                      const isUsed = c.isUsed;

                      let statusBadge = (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-bold">
                          พร้อมใช้
                        </span>
                      );
                      if (isUsed) {
                        statusBadge = (
                          <span className="bg-neutral-800 text-neutral-500 border border-neutral-750 px-2 py-0.5 rounded text-[9px] font-bold">
                            ใช้ไปแล้ว
                          </span>
                        );
                      } else if (isExpired) {
                        statusBadge = (
                          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[9px] font-bold">
                            หมดอายุ
                          </span>
                        );
                      }

                      return (
                        <tr key={c.code} className="hover:bg-amber-50/50">
                          <td className="py-3 pl-2 font-mono font-bold text-neutral-200">
                            <div className="flex items-center gap-1.5">
                              <span>{c.code}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const url = `${window.location.origin}/customer/${shopIdToSlug(selectedShopId)}?code=${c.code}`;
                                  navigator.clipboard.writeText(url);
                                  showStatus(`✓ คัดลอกลิงก์ของ ${c.code} เรียบร้อย!`);
                                }}
                                className="text-neutral-500 hover:text-yellow-400 transition duration-150 p-1 cursor-pointer"
                                title="คัดลอกลิงก์รับแต้มนี้"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 text-neutral-400 font-sans">{c.description}</td>
                          <td className="py-3 font-semibold text-yellow-500 font-mono">+{c.points} แต้ม</td>
                          <td className="py-3 text-neutral-400 font-mono text-[10px]">
                            {new Date(c.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} ({new Date(c.createdAt).toLocaleDateString('th-TH')})
                          </td>
                          <td className="py-3 text-neutral-400 font-mono text-[10px]">
                            {new Date(c.expiresAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} ({new Date(c.expiresAt).toLocaleDateString('th-TH')})
                          </td>
                          <td className="py-3 font-sans">{statusBadge}</td>
                          <td className="py-3 text-right pr-2">
                            <button
                              type="button"
                              onClick={() => handleDeleteGeneratedCoupon(c.code)}
                              className="p-1 px-2 border border-red-500/20 bg-red-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition duration-150 text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                              title="ลบรหัสนี้"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> ลบถาวร
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {generatedCouponsList.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-neutral-500 font-sans">
                          ยังไม่มีลิงก์รับแต้มที่สร้างไว้ กดสร้างลิงก์ใหม่ได้ด้านบน
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
        <div className="grid grid-cols-5 gap-1 max-w-md mx-auto">
          {merchantPages.slice(0, 5).map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => goToTab(page.id)}
              className={`relative rounded-2xl px-1.5 py-2 text-[10px] font-black transition flex flex-col items-center gap-0.5 ${activeTab === page.id ? 'text-amber-700 bg-amber-50' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <span className="text-lg leading-none">{page.icon}</span>
              <span className="leading-none whitespace-nowrap">{page.shortLabel}</span>
              {typeof page.count === 'number' && page.count > 0 && (
                <span className="absolute -top-1 right-2 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] leading-4 shadow-sm">
                  {page.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

    </div>
  );
}

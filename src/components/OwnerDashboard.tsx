import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Store, QrCode, Users, Plus, Edit, Trash2, Check, X,
  ShoppingBag, Award, PlusCircle, MinusCircle, Search, 
  Image, HelpCircle, Calendar, RefreshCw, AlertCircle, FileText, Copy
} from 'lucide-react';
import { Shop, Customer, Reward, Transaction, PromoBanner } from '../types';
import { 
  getShops, saveShops, getCustomers, saveCustomers, 
  getRewards, saveRewards, getTransactions, saveTransactions,
  getBanners, saveBanners, getGeneratedCoupons, saveGeneratedCoupons
} from '../data/mockData';

interface OwnerDashboardProps {
  key?: string;
  onDataChange: () => void;
  selectedShopId: string;
  setSelectedShopId: (id: string) => void;
  onTriggerSimulatedLink?: (code: string) => void;
}

export default function OwnerDashboard({
  onDataChange,
  selectedShopId,
  setSelectedShopId,
  onTriggerSimulatedLink
}: OwnerDashboardProps) {
  // Navigation tabs: 'approvals', 'customers', 'rewards', 'promotions', 'generator'
  const [activeTab, setActiveTab] = useState<'approvals' | 'customers' | 'rewards' | 'promotions' | 'generator'>('approvals');
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
      description: generateDesc || 'สะสมคะแนนพรีเมี่ยมพิเศษ',
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt,
      isUsed: false
    };

    coupons.push(newCoupon);
    saveGeneratedCoupons(coupons);

    // Construct app's URL
    const currentOrigin = window.location.origin + window.location.pathname;
    const generatedUrl = `${currentOrigin}?code=${uniqueCode}`;

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
  const [adjustReason, setAdjustReason] = useState('ปรับคะแนนกรณีพิเศษหน้าร้าน');

  // Promotion Banner creation states
  const [showBannerModal, setShowBannerModal] = useState(false);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerDesc, setNewBannerDesc] = useState('');
  const [newBannerImage, setNewBannerImage] = useState('');
  const [newBannerExp, setNewBannerExp] = useState('2026-06-30');

  // Load latest data on focus or change
  const loadData = () => {
    setShops(getShops().filter(s => s.registrationStatus === 'approved'));
    setCustomers(getCustomers());
    setRewards(getRewards().filter(r => r.shopId === selectedShopId));
    setBanners(getBanners().filter(b => b.shopId === selectedShopId));
    setTransactions(getTransactions().filter(t => t.shopId === selectedShopId));

    try {
      const coupons = getGeneratedCoupons();
      const shopCoupons = coupons.filter((c: any) => c.shopId === selectedShopId);
      shopCoupons.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setGeneratedCouponsList(shopCoupons);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedShopId, activeTab]);

  // Synchronize dynamic coupon and link on state modification
  useEffect(() => {
    if (activeTab === 'generator') {
      generateNewCouponAndLink();
    }
  }, [generatePoints, generateDesc, expiryMinutes, selectedShopId, activeTab]);

  const showStatus = (text: string) => {
    setStatusMsg(text);
    setTimeout(() => setStatusMsg(''), 3000);
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
    // Default is U11aa (which is the customer tab user)
    const victim = allCustomers[0];
    if (!victim) {
      showStatus('❌ ไม่ลองแต้มเนื่องจากไม่มีโปรไฟล์ลูกค้าจำลองในฐานข้อมูล');
      return;
    }

    const updatedCusts = allCustomers.map(c => {
      if (c.id === victim.id) {
        const newPts = c.currentPoints + generatePoints;
        const newLifetime = c.lifetimePoints + generatePoints;
        let newTier = c.tier;
        if (newLifetime >= 1000) newTier = 'Platinum';
        else if (newLifetime >= 300) newTier = 'Gold';

        return { ...c, currentPoints: newPts, lifetimePoints: newLifetime, tier: newTier };
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
      description: `สแกนลิงค์/คิวอาร์ QR Generator: ${generateDesc}`,
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    saveTransactions([newTx, ...getTransactions()]);
    showStatus(`✓ จำลองสำเร็จ! มอบแต้ม +${generatePoints} ให้ลูกค้า ${victim.name} เรียบร้อยแล้ว`);
    onDataChange();
    loadData();
  };

  // 4. MANUAL ADJUST POINTS FOR CRM
  const handleManualAdjustPoints = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustForAdjust) return;

    const allCustomers = getCustomers();
    const finalAmount = adjustType === 'add' ? adjustPoints : -adjustPoints;
    
    // Validate deduction
    if (adjustType === 'deduct' && selectedCustForAdjust.currentPoints < adjustPoints) {
      showStatus('❌ แต้มไม่พอลด! คะแนนของคุณสามารถติดลบไม่ได้');
      return;
    }

    const updatedCusts = allCustomers.map(c => {
      if (c.id === selectedCustForAdjust.id) {
        const finalPts = c.currentPoints + finalAmount;
        const finalLifetime = adjustType === 'add' ? c.lifetimePoints + adjustPoints : c.lifetimePoints;
        let newTier = c.tier;
        if (finalLifetime >= 1000) newTier = 'Platinum';
        else if (finalLifetime >= 300) newTier = 'Gold';

        return { ...c, currentPoints: finalPts, lifetimePoints: finalLifetime, tier: newTier };
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
      description: `ปรับคะแนนโดยผู้ดูแลระบบ: ${adjustReason}`,
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    saveTransactions([newTx, ...getTransactions()]);
    setSelectedCustForAdjust(null);
    showStatus(`✓ ปรับคะแนนลูกค้า ${selectedCustForAdjust.name} จำนวน ${finalAmount} แต้ม สำเร็จ!`);
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
      description: newBannerDesc || 'สะสมแต้มพรีเมี่ยมพิเศษเฉพาะสมาชิก',
      image: newBannerImage || 'https://images.unsplash.com/photo-1517142089942-ba376ce32a2e?w=400',
      expirationDate: new Date(newBannerExp || '2026-06-30').toISOString(),
      shopId: selectedShopId,
      isAd: false
    };
    saveBanners([...allBanners, newBan]);
    showStatus('✓ สร้างและจัดกิจกรรมโปรโมชั่นโฆษณาเรียบร้อยแล้ว');
    setShowBannerModal(false);
    
    // Reset states
    setNewBannerTitle('');
    setNewBannerDesc('');
    setNewBannerImage('');
    setNewBannerExp('2026-06-30');

    onDataChange();
    loadData();
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6.5 shadow-sm space-y-6.5 text-slate-850">
      
      {/* HEADER SECTION INCLUDES STATS & SWITCH SHOP */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/35 flex items-center justify-center text-amber-650">
            <Store className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] text-amber-700 font-extrabold tracking-wider uppercase">Store Administration Side (B2B Control)</span>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900">{activeShopDetail?.name || 'กำลังโหลดร้านค้า...'}</h2>
              <span className="bg-emerald-550/10 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/20">ออนไลน์</span>
            </div>
          </div>
        </div>

        {/* Change Store selector inside owner view */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-slate-500 font-black whitespace-nowrap">เปลี่ยนร้านค้าจำลองแอดมิน:</span>
          <select 
            value={selectedShopId}
            onChange={(e) => setSelectedShopId(e.target.value)}
            className="bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs text-slate-800 font-bold max-w-[190px] cursor-pointer outline-none focus:ring-1 focus:ring-amber-500"
          >
            {shops.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

      </div>

      {/* Stats Quick strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 shadow-3xs">
          <span className="text-[10px] text-slate-500 font-extrabold font-sans uppercase block">คำร้องขอแลกแต้มรออนุมัติ</span>
          <p className="text-2xl font-black font-mono text-amber-600 mt-1">
            {transactions.filter(t => t.status === 'pending').length} <span className="text-[11px] font-bold text-slate-500 font-sans">รายการ</span>
          </p>
        </div>
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 shadow-3xs">
          <span className="text-[10px] text-slate-500 font-extrabold font-sans uppercase block">สมาชิกทั้งหมดของแบรนด์</span>
          <p className="text-2xl font-black font-mono text-slate-855 mt-1">
            {customers.length} <span className="text-[11px] font-bold text-slate-500 font-sans">คน</span>
          </p>
        </div>
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 shadow-3xs">
          <span className="text-[10px] text-slate-500 font-extrabold font-sans uppercase block">จำนวนสินค้าของพรีเมี่ยม</span>
          <p className="text-2xl font-black font-mono text-slate-855 mt-1">
            {rewards.length} <span className="text-[11px] font-bold text-slate-500 font-sans">รายการ</span>
          </p>
        </div>
        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200 shadow-3xs">
          <span className="text-[10px] text-slate-500 font-extrabold font-sans uppercase block">โปรโมชั่นที่กำลังประกาศใช้</span>
          <p className="text-2xl font-black font-mono text-slate-855 mt-1">
            {banners.length} <span className="text-[11px] font-bold text-slate-500 font-sans">ชิ้น</span>
          </p>
        </div>
      </div>

      {/* TABS SELECTOR SYSTEM */}
      <div className="flex border-b border-slate-200 text-xs gap-1 select-none overflow-x-auto pb-px mb-4">
        <button 
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2.5 font-extrabold whitespace-nowrap rounded-t-xl transition cursor-pointer ${activeTab === 'approvals' ? 'bg-slate-50 border-t-2 border-amber-600 text-amber-700' : 'text-slate-500 hover:text-slate-800'}`}
        >
          🎁 อนุมัติแลกรางวัล ({transactions.filter(t => t.type === 'redeem' && t.status === 'pending').length})
        </button>
        <button 
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2.5 font-extrabold whitespace-nowrap rounded-t-xl transition cursor-pointer ${activeTab === 'customers' ? 'bg-slate-50 border-t-2 border-amber-600 text-amber-700' : 'text-slate-500 hover:text-slate-800'}`}
        >
          👥 สมาชิก CRM ({customers.length})
        </button>
        <button 
          onClick={() => setActiveTab('rewards')}
          className={`px-4 py-2.5 font-extrabold whitespace-nowrap rounded-t-xl transition cursor-pointer ${activeTab === 'rewards' ? 'bg-slate-50 border-t-2 border-amber-600 text-amber-700' : 'text-slate-500 hover:text-slate-800'}`}
        >
          💎 ของรางวัลสะสมแต้ม ({rewards.length})
        </button>
        <button 
          onClick={() => setActiveTab('promotions')}
          className={`px-4 py-2.5 font-extrabold whitespace-nowrap rounded-t-xl transition cursor-pointer ${activeTab === 'promotions' ? 'bg-slate-50 border-t-2 border-amber-600 text-amber-700' : 'text-slate-500 hover:text-slate-800'}`}
        >
          📢 แคมเปญย่อย ({banners.length})
        </button>
        <button 
          onClick={() => setActiveTab('generator')}
          className={`px-4 py-2.5 font-extrabold whitespace-nowrap rounded-t-xl transition cursor-pointer ${activeTab === 'generator' ? 'bg-slate-50 border-t-2 border-amber-600 text-amber-700' : 'text-slate-500 hover:text-slate-800'}`}
        >
          🔗 ลิงก์&คิวอาร์โค้ดแจกแต้ม
        </button>
      </div>

      {/* TABS CONTENT SYSTEM */}
      <div className="mt-4">
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
                🕒 คิวอนุมัติแลกรางวัล ({transactions.filter(t => t.type === 'redeem' && t.status === 'pending').length} รายการ)
              </button>
              <button
                type="button"
                onClick={() => setApprovalsSubTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition duration-150 cursor-pointer ${approvalsSubTab === 'history' ? 'bg-yellow-500 text-neutral-950 shadow' : 'text-neutral-400 hover:text-neutral-200'}`}
              >
                📜 ประวัติธุรกรรมสาขาทั้งหมด ({transactions.length} รายการ)
              </button>
            </div>

            {approvalsSubTab === 'queue' ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-yellow-500/5 px-4 py-3 rounded-xl border border-yellow-500/10">
                  <div className="flex items-center gap-2 text-xs text-yellow-500 font-medium font-sans">
                    <AlertCircle className="w-4 h-4" />
                    <span>คำเตือน: โปรดตรวจสอบบิลหรือสิทธิ์หน้าแอปพลิเคชันลูกค้า เพื่อความถูกต้องตรงกันทางบัญชีคลัง</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-850 text-neutral-400 font-bold uppercase tracking-wider font-mono">
                        <th className="pb-3 pl-2">ชื่อลูกค้า / โทรศัพท์</th>
                        <th className="pb-3">ของรางวัลที่ขอแลก</th>
                        <th className="pb-3">แต้มที่ใช้</th>
                        <th className="pb-3 font-mono">วันที่ทำรายการ</th>
                        <th className="pb-3 pl-2">การด่วนตัดสินใจ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850/60">
                      {transactions
                        .filter(t => t.type === 'redeem')
                        .map(t => {
                          const showBadge = t.status === 'pending';
                          return (
                            <tr key={t.id} className="hover:bg-neutral-900/30">
                              <td className="py-3.5 pl-2">
                                <div className="font-semibold text-neutral-100">{t.userName}</div>
                                <div className="text-[10px] text-neutral-400">{t.userPhone}</div>
                              </td>
                              <td className="py-3.5 font-medium text-neutral-200">
                                {t.description.replace('ขอแลกรางวัล: ', '')}
                              </td>
                              <td className="py-3.5 font-mono text-rose-400 font-bold font-semibold">-{t.points} แต้ม</td>
                              <td className="py-3.5 text-neutral-400 font-mono">
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
                                  <span className={`text-[10px] font-mono uppercase font-bold ${t.status === 'completed' ? 'text-emerald-400' : 'text-neutral-500 line-through'}`}>
                                    {t.status === 'completed' ? 'อนุมัติเรียบร้อย' : 'คำขอถูกยกเลิก'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}

                      {transactions.filter(t => t.type === 'redeem').length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-neutral-500 font-medium font-sans">
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
                <div className="bg-neutral-900/40 p-4 rounded-xl border border-neutral-850 text-xs text-neutral-450 flex justify-between items-center">
                  <span className="font-sans">แอดมินสามารถติดตามดูประวัติสะสมแต้ม/สแกน QR และข้อมูลแลกของรางวัลทั้งหมดในเครือคุณได้ ย้อนหลังครบถ้วน</span>
                  <span className="text-[10px] font-mono text-neutral-400 font-semibold">รวมทั้งหมด: {transactions.length} รายการ</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse font-sans">
                    <thead>
                      <tr className="border-b border-neutral-850 text-neutral-450 font-bold uppercase tracking-wider font-mono">
                        <th className="pb-3 pl-2">รหัสธุรกรรม / อ้างอิง</th>
                        <th className="pb-3">ประเภทกิจกรรม</th>
                        <th className="pb-3">รายละเอียดบัญชี</th>
                        <th className="pb-3">ปริมาณคะแนน</th>
                        <th className="pb-3 font-mono">วันที่ทำรายการ</th>
                        <th className="pb-3 text-right pr-2">การดำเนินการถาวร</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-850/60">
                      {transactions.map(t => (
                        <tr key={t.id} className="hover:bg-neutral-900/30">
                          <td className="py-3.5 pl-2 font-mono text-[10.5px]">
                            <div className="font-bold text-neutral-350">{t.id}</div>
                            <div className="text-[9px] text-neutral-400">ลูกค้า: {t.userName} • {t.userPhone}</div>
                          </td>
                          <td className="py-3.5 font-sans">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${t.type === 'earn' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                              {t.type === 'earn' ? '📊 สะสมแต้ม' : '🎁 แลกรางวัล'}
                            </span>
                          </td>
                          <td className="py-3.5 text-neutral-300 font-medium text-[11px] font-sans">
                            {t.description}
                          </td>
                          <td className={`py-3.5 font-mono text-xs font-black ${t.type === 'earn' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {t.type === 'earn' ? `+${t.points}` : `-${t.points}`} แต้ม
                          </td>
                          <td className="py-3.5 text-neutral-400 font-mono text-[10.5px]">
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
                          <td colSpan={6} className="py-8 text-center text-neutral-500 font-medium font-sans">
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

        {/* TAB B: CUSTOMERS CRM DIRECTORY */}
        {activeTab === 'customers' && (
          <div className="space-y-4">
            
            {/* Search filter bar */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input 
                  type="text"
                  placeholder="ค้นหาลูกค้าสะสมแต้มด้วยชื่อ หรือเบอร์โทรศัพท์..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-9 py-2 text-xs text-white"
                />
              </div>
            </div>

            {/* Customer tabular grid */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-neutral-850 text-neutral-400 font-bold uppercase tracking-wider font-mono">
                    <th className="pb-3 pr-2">ข้อมูลลูกค้า / พร็อพเพอร์ตี้ LINE</th>
                    <th className="pb-3">ระดับสมาชิก</th>
                    <th className="pb-3">แต้มปัจจุบัน</th>
                    <th className="pb-3">แต้มสะสมทั้งหมด</th>
                    <th className="pb-3">เข้าระบบเมื่อ</th>
                    <th className="pb-3 text-right">ปรับสมดุลคะแนน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-850/60">
                  {filteredCustomers.map(c => (
                    <tr key={c.id} className="hover:bg-neutral-900/20">
                      <td className="py-3.5 pr-2">
                        <div className="flex items-center gap-2.5">
                          <img src={c.avatar} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                          <div>
                            <div className="font-semibold text-neutral-100">{c.name}</div>
                            <div className="text-[10px] text-neutral-400">{c.phone} • LINE: {c.lineName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${c.tier === 'Platinum' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : c.tier === 'Gold' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 'bg-neutral-800 text-neutral-400'}`}>
                          {c.tier}
                        </span>
                      </td>
                      <td className="py-3.5 font-bold font-mono text-yellow-400 text-sm">{c.currentPoints} Pts</td>
                      <td className="py-3.5 font-mono text-neutral-400">{c.lifetimePoints} Pts</td>
                      <td className="py-3.5 font-mono text-neutral-500">{new Date(c.createdAt).toLocaleDateString('th-TH')}</td>
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
                    <h4 className="text-sm font-bold text-neutral-100">ปรับสมดุลคะแนนลูกค้าด้วยมือ</h4>
                    <p className="text-[10px] text-neutral-400">ลูกค้าปัจจุบัน: {selectedCustForAdjust.name}</p>
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
                          <MinusCircle className="w-3.5 h-3.5" /> หักคะแนนออก (-)
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10.5px] text-neutral-400 block font-medium">จำนวนแต้ม (Points) :</label>
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
                        placeholder="อย่างเช่น เติมแต้มบิลตกหล่นหน้าร้านค้าคลาดเคลื่อน"
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

          </div>
        )}

        {/* TAB C: SHOP REWARDS CATALOG */}
        {activeTab === 'rewards' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-neutral-300 uppercase font-mono tracking-wider">บัญชีคูปองพรีเมี่ยมของร้าน</h3>
              <button 
                onClick={openAddReward}
                className="bg-yellow-500 hover:bg-yellow-600 text-neutral-950 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-1 cursor-pointer transition active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" /> เพิ่มของรางวัลใหม่
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {rewards.map(rew => (
                <div key={rew.id} className="bg-neutral-950 border border-neutral-850 p-3.5 rounded-2xl flex gap-3">
                  <img src={rew.image} alt={rew.name} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" referrerPolicy="no-referrer" />
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-neutral-100 truncate">{rew.name}</h4>
                      <p className="text-[10px] text-neutral-400 line-clamp-1">{rew.description}</p>
                      <p className="text-[10px] font-semibold text-yellow-500 mt-1">ใช้แต้ม : {rew.pointsCost} แต้ม • สต็อก: {rew.stock} ชิ้น</p>
                    </div>
                    
                    <div className="flex justify-end gap-1.5 mt-2">
                      <button 
                        onClick={() => openEditReward(rew)}
                        className="bg-neutral-850 hover:bg-neutral-800 text-neutral-350 p-1.5 rounded-lg active:scale-90 transition cursor-pointer"
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
                    {editingReward ? 'แก้ไขสินค้าพรีเมี่ยม' : 'เพิ่มของรางวัลชิ้นใหม่ของร้าน'}
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
                <h3 className="text-xs font-bold text-neutral-300 uppercase font-mono tracking-wider">แคมเปญกระตุ้นยอดขายสะสม</h3>
                <p className="text-[10px] text-neutral-400">โปรโมชั่นที่ประกาศหน้าบ้านของคุณจะนำเสนอในหน้าจอ Line OA ในวันเดียวกัน</p>
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
                    <p className="text-[10px] text-neutral-400 leading-relaxed">{ban.description}</p>
                    <div className="text-[9px] text-neutral-500 font-mono flex gap-3 pt-1">
                      <span>สิ้นสุดแคมเปญ: {new Date(ban.expirationDate).toLocaleDateString('th-TH')}</span>
                    </div>
                  </div>
                </div>
              ))}

              {banners.length === 0 && (
                <div className="py-12 text-center bg-neutral-950 rounded-2xl border border-neutral-850 text-neutral-500 font-sans text-xs">
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
                  <h4 className="text-sm font-bold text-neutral-100">กระทำออกแคมเปญสะสมโฆษณาตัวใหม่</h4>
                  
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10.5px] text-neutral-400 block font-sans">พาดหัวแคมเปญหลัก (Banner Title) :</label>
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
                      <label className="text-[10.5px] text-neutral-400 block font-sans">ลิ้งค์ภาพแคมเปญ (Image Web URL) :</label>
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
                        <label className="text-[10.5px] text-neutral-400 block font-sans">วันหมดเขตของแคมเปญ :</label>
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
              <h3 className="text-xs font-bold text-neutral-300 uppercase font-mono tracking-wider">ระบบสร้างลิ้งก์และ QR Code แจกแต้มด่วน</h3>
              <p className="text-[10px] text-neutral-400">กำหนดพิกัดความเหมาะสมของคะแนนแล้วสร้างรูปคิวอาร์ แปะหน้าเครื่องคิดเงินหน้าร้านเพื่อกระตุ้นให้ลูกค้ากรอกสแกนรับแต้ม</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              
              {/* Form settings options */}
              <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-850 space-y-4">
                <span className="text-[11px] font-bold text-yellow-500 font-mono uppercase block font-sans">การตั้งค่าพารามิเตอร์แต้มสแกน</span>
                
                <div className="space-y-1 flex flex-col">
                  <label className="text-[10px] text-neutral-400 block font-sans">ปริมาณแต้มที่ต้องการแจก (Points) :</label>
                  <select 
                    value={generatePoints}
                    onChange={(e) => setGeneratePoints(parseInt(e.target.value))}
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-yellow-500 cursor-pointer font-sans"
                  >
                    <option value={10}>+10 Points (ซื้อกาแฟเล็กน้อย)</option>
                    <option value={20}>+20 Points (ซื้อเครื่องคู่เบเกอรี่)</option>
                    <option value={50}>+50 Points (กิจกรรมพิเศษต้อนรับเชลซี)</option>
                    <option value={100}>+100 Points (ทานบิลใหญ่ครอบครัว)</option>
                    <option value={250}>+250 Points (สิทธิประดับแต่งแคมเปญบิ๊ก)</option>
                  </select>
                </div>

                <div className="space-y-1 font-sans">
                  <label className="text-[10px] text-neutral-400 block font-sans">คําอธิบายหรือวัตถุประสงค์ในการเติมแต้ม :</label>
                  <input 
                    type="text"
                    value={generateDesc}
                    onChange={(e) => setGenerateDesc(e.target.value)}
                    placeholder="ตัวอย่างเช่น ซื้อเครื่องดื่มคราฟต์พรีเมี่ยม"
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg outline-none font-sans"
                    required
                  />
                </div>

                {/* Expiry minute input bounded 1 to 60 */}
                <div className="space-y-1 font-sans">
                  <label className="text-[10px] text-neutral-400 block font-sans font-medium">
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
                  <p className="text-[9px] text-neutral-500 italic block mt-1 font-sans">ลิงก์และคิวอาร์นี้จะหมดอายุและใช้ได้เพียง "ครั้งเดียว" เท่านั้นเพื่อความปลอดภัยระดับสถาบัน</p>
                </div>

                <div className="bg-neutral-900/60 rounded-xl p-3 text-[10px] text-neutral-400 space-y-2 border border-neutral-800/40">
                  <div className="flex justify-between items-center">
                    <span className="text-yellow-400 font-bold block">🔗 ลิงก์ที่ถูกสร้างอย่างปลอดภัย:</span>
                    {activeCoupon && (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded font-bold uppercase font-mono tracking-wider animate-pulse">
                        ใช้งานได้ครั้งเดียว
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-neutral-350 break-all select-all text-xs leading-normal bg-neutral-950 p-2.5 rounded border border-neutral-850">
                    {generatedQRValue}
                  </p>
                  
                  {/* Link action copy buttons underneath link */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedQRValue);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-neutral-950 font-bold py-2 px-3 rounded-lg text-xs duration-150 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-4 h-4" /> คัดลอกลิ้งค์สำเร็จแล้ว! ✓
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> คัดลอกลิ้งค์
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={generateNewCouponAndLink}
                      className="bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold py-2 px-3 rounded-lg text-[11px] duration-150 flex items-center gap-1 cursor-pointer active:scale-95 border border-neutral-750"
                      title="กดรีเฟรชโค้ดชุดใหม่ล่าสุด"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> รีโค้ดใหม่
                    </button>
                  </div>
                </div>
              </div>

              {/* Created QR display box with scan simulator */}
              <div className="bg-neutral-950 p-5 rounded-2xl border border-neutral-850 text-center space-y-4 font-sans">
                <span className="text-[11px] font-bold text-neutral-300 font-mono uppercase block">คิวอาร์โค้ดแจกคะแนนลูกค้า</span>
                
                {/* Visual vector simulation of qr code */}
                <div className="bg-white p-3.5 rounded-2xl w-40 h-40 mx-auto flex items-center justify-center shadow-lg relative border-4 border-yellow-500">
                  <QrCode className="w-32 h-32 text-neutral-900" />
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] text-neutral-300">
                    เมื่อผู้ใช้งานสแกนคิวอาร์นี้ผ่านแอป จะเข้าสู่หน้ายืนยันแต้มพิเศษทันที 
                    <span className="font-bold text-yellow-500 font-mono"> +{generatePoints} แต้ม</span>
                  </div>

                  {/* Interactive Button to simulate client scanning this link */}
                  <button 
                    type="button"
                    onClick={simulateCustomerScanned}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[11px] py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
                  >
                    🚀 จำลองสวมรอยลูกค้ากดลิงก์ (เปิดป็อปอัพยืนยันสะสมแต้ม)
                  </button>
                  <p className="text-[9px] text-neutral-500 italic">การจำลองจะนำพาผู้ขายสลับมุมมองไปยังหน้าระบบลูกค้าพร้อมกล่องยืนยันเคลมสิทธิ์แต้มพิเศษนี้แบบออโต้</p>
                </div>
              </div>

            </div>

            {/* Generated coupons history panel */}
            <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-850 space-y-3 font-sans">
              <div className="flex justify-between items-center">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-neutral-200">📜 ประวัติข้อมูลลิงก์คูปองระบบสแกนด่วน ({generatedCouponsList.length} รายการ)</span>
                  <p className="text-[10px] text-neutral-400">ควบคุม ตรวจสอง และยกเลิกรหัสบัตรของขวัญที่ผ่านการแชร์ทางลิงก์อินเตอร์เน็ตในทุกๆ รายการ</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-neutral-850 text-neutral-400 font-bold uppercase tracking-wider font-mono">
                      <th className="pb-2.5 pl-2 text-left">รหัสสกินคูปอง (Coupon Code)</th>
                      <th className="pb-2.5 text-left">คำอธิบายงาน</th>
                      <th className="pb-2.5 text-left">คะแนนบวก</th>
                      <th className="pb-2.5 font-mono text-left">สร้างเมื่อ</th>
                      <th className="pb-2.5 font-mono text-left">หมดอายุเมื่อ</th>
                      <th className="pb-2.5 text-left">ผลลัพธ์</th>
                      <th className="pb-2.5 text-right pr-2 text-left font-sans">การดำเนินการจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-850/60 font-sans">
                    {generatedCouponsList.map((c: any) => {
                      const isExpired = new Date() > new Date(c.expiresAt);
                      const isUsed = c.isUsed;

                      let statusBadge = (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-[9px] font-bold">
                          พร้อมใช้งาน (ครั้งเดียว)
                        </span>
                      );
                      if (isUsed) {
                        statusBadge = (
                          <span className="bg-neutral-800 text-neutral-500 border border-neutral-750 px-2 py-0.5 rounded text-[9px] font-bold">
                            ถูกเคลมไปเรียบร้อยแล้ว
                          </span>
                        );
                      } else if (isExpired) {
                        statusBadge = (
                          <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded text-[9px] font-bold">
                            คูปองหมดอายุแล้ว
                          </span>
                        );
                      }

                      return (
                        <tr key={c.code} className="hover:bg-neutral-900/30">
                          <td className="py-3 pl-2 font-mono font-bold text-neutral-200">
                            <div className="flex items-center gap-1.5">
                              <span>{c.code}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const currentOrigin = window.location.origin + window.location.pathname;
                                  const url = `${currentOrigin}?code=${c.code}`;
                                  navigator.clipboard.writeText(url);
                                  showStatus(`✓ คัดลอกลิงก์สากลของ ${c.code} เรียบร้อย!`);
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
                              title="ลบรหัสคูปองนี้ออกจากระบบอย่างถาวร"
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
                          ไม่พบประวัติการเปิดโค้ดสแกนรับแต้มด่วนของสาขานี้เลย คุณสามารถสุ่มรับคะแนนโดยเลือกตั้งค่าด้านบน
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

    </div>
  );
}

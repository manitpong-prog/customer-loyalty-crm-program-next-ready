import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building, Check, X, Shield, BarChart3, Settings, Users, Gift,
  AlertCircle, AppWindow, Globe, CheckCircle2, RotateCcw, Landmark
} from 'lucide-react';
import { Shop, Customer, Transaction } from '../types';
import { getShops, saveShops, getCustomers, getTransactions } from '../data/mockData';

interface WebmasterDashboardProps {
  key?: string;
  onDataChange: () => void;
}

export default function WebmasterDashboard({ onDataChange }: WebmasterDashboardProps) {
  // Navigation: 'stores', 'analytics', 'settings'
  const [activeTab, setActiveTab] = useState<'stores' | 'analytics' | 'settings'>('stores');
  
  // Platform Database States
  const [allShops, setAllShops] = useState<Shop[]>([]);
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allTxs, setAllTxs] = useState<Transaction[]>([]);
  
  // Configurations states
  const [silverCap, setSilverCap] = useState(0);
  const [goldCap, setGoldCap] = useState(300);
  const [platinumCap, setPlatinumCap] = useState(1000);
  const [baseSubscriptionFee, setBaseSubscriptionFee] = useState(1500);

  const [notification, setNotification] = useState('');

  const loadData = () => {
    setAllShops(getShops());
    setAllCustomers(getCustomers());
    setAllTxs(getTransactions());
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const triggerNotify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3500);
  };

  // Webmaster approves a store shop
  const handleApproveShop = (shopId: string) => {
    const shops = getShops();
    const updated = shops.map(s => {
      if (s.id === shopId) {
        return { ...s, registrationStatus: 'approved' as const, isActive: true };
      }
      return s;
    });

    saveShops(updated);
    triggerNotify('✓ อนุมัติการเปิดบริการร้านค้าใหม่ ทรานส์แอคชันพร้อมใช้งานได้ทันที!');
    onDataChange();
    loadData();
  };

  // Webmaster rejects a store shop
  const handleRejectShop = (shopId: string) => {
    const shops = getShops();
    const updated = shops.map(s => {
      if (s.id === shopId) {
        return { ...s, registrationStatus: 'rejected' as const, isActive: false };
      }
      return s;
    });

    saveShops(updated);
    triggerNotify('✕ ปฏิเสธคำร้องขอเปิดร้านค้าเรียบร้อยแล้ว');
    onDataChange();
    loadData();
  };

  // Save Platform core settings
  const handleSavePlatformSettings = (e: React.FormEvent) => {
    e.preventDefault();
    triggerNotify('✓ บันทึกค่าพารามิเตอร์แกนระบบ CRM และคะแนนวิทเจ็ตเสร็จสมบูรณ์');
  };

  // Analytics helper metrics
  const pendingRegistrations = allShops.filter(s => s.registrationStatus === 'pending');
  const activeStoresCount = allShops.filter(s => s.registrationStatus === 'approved').length;
  
  // Sum cumulative stats
  const totalPointsEarnedSum = allTxs
    .filter(t => t.type === 'earn' && t.status === 'completed')
    .reduce((sum, t) => sum + t.points, 0);

  const totalPointsRedeemedSum = allTxs
    .filter(t => t.type === 'redeem')
    .reduce((sum, t) => sum + t.points, 0);

  return (
    <div className="bg-neutral-900 border border-neutral-850 rounded-3xl p-6 shadow-xl space-y-6 text-neutral-200">
      
      {/* Super Header Webmaster Brand */}
      <div className="flex justify-between items-center border-b border-neutral-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-violet-400 font-mono tracking-wider uppercase font-bold">Platform Master (Global SaaS Admin)</span>
            <h2 className="text-lg font-bold text-neutral-50">Webmaster CRM Suite</h2>
          </div>
        </div>

        <div className="bg-neutral-950 px-3 py-1.5 rounded-xl border border-neutral-850 text-right text-[10px] font-mono text-neutral-400">
          บัญชีหลัก: <span className="text-violet-400 font-bold">Platform Owner (SuperAdmin)</span>
        </div>
      </div>

      {/* Stats indicators banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-neutral-950 rounded-2xl p-4 border border-neutral-850 space-y-1">
          <span className="text-[10.5px] text-neutral-400">จำนวนร้านค้ารออนุมัติ</span>
          <p className="text-2xl font-bold font-mono text-violet-400">{pendingRegistrations.length} ร้าน</p>
        </div>
        <div className="bg-neutral-950 rounded-2xl p-4 border border-neutral-850 space-y-1">
          <span className="text-[10.5px] text-neutral-400">ร้านค้าพาร์ทเนอร์ใช้งานอยู่</span>
          <p className="text-2xl font-bold font-mono text-neutral-200">{activeStoresCount} แบรนด์</p>
        </div>
        <div className="bg-neutral-950 rounded-2xl p-4 border border-neutral-850 space-y-1">
          <span className="text-[10.5px] text-neutral-400">รวมแต้มสะสมระบบบวกสะพัด</span>
          <p className="text-2xl font-bold font-mono text-emerald-400">{totalPointsEarnedSum} แต้ม</p>
        </div>
        <div className="bg-neutral-950 rounded-2xl p-4 border border-neutral-850 space-y-1">
          <span className="text-[10.5px] text-neutral-400">จำนวนประชากรสมาชิก LINE</span>
          <p className="text-2xl font-bold font-mono text-neutral-200">{allCustomers.length} บัญชี</p>
        </div>
      </div>

      {/* Tabs Selector System */}
      <div className="flex border-b border-neutral-800 text-xs select-none">
        <button 
          onClick={() => setActiveTab('stores')}
          className={`px-5 py-3 font-bold rounded-t-xl transition ${activeTab === 'stores' ? 'bg-neutral-950 border-t-2 border-violet-500 text-violet-400' : 'text-neutral-404 hover:text-neutral-200'}`}
        >
          🏬 อนุมัติการสร้างร้านอาหาร/แบรนด์ ({pendingRegistrations.length})
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`px-5 py-3 font-bold rounded-t-xl transition ${activeTab === 'analytics' ? 'bg-neutral-950 border-t-2 border-violet-500 text-violet-400' : 'text-neutral-444 hover:text-neutral-200'}`}
        >
          📊 วิเคราะห์สถิติภาพรวมเครือข่าย
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-5 py-3 font-bold rounded-t-xl transition ${activeTab === 'settings' ? 'bg-neutral-950 border-t-2 border-violet-500 text-violet-400' : 'text-neutral-404 hover:text-neutral-200'}`}
        >
          ⚙️ ค่าพารามิเตอร์เกณฑ์ระบบ (SaaS Configure)
        </button>
      </div>

      {/* Toast Notification for Webmaster */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="fixed bottom-6 right-6 bg-violet-600 text-white px-5 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2 text-xs font-bold font-sans"
          >
            <CheckCircle2 className="w-4.5 h-4.5" />
            <span>{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab panel contents router */}
      <div className="bg-neutral-950 border border-neutral-850 p-5 rounded-2xl">
        
        {/* TAB 1: STORES ONBOARDING APPROVAL */}
        {activeTab === 'stores' && (
          <div className="space-y-4">
            
            <div className="flex items-center gap-2 bg-violet-950/20 border border-violet-500/15 p-3.5 rounded-xl">
              <AlertCircle className="w-4 h-4 text-violet-400 flex-shrink-0" />
              <p className="text-[10.5px] text-violet-300">
                เมื่อร้านได้รับการอนุมัติ ร้านค้าจะสามารถเข้าสู่ระบบแอดมิน ร่วมจำลองสร้างคิวอาร์สะสมแต้ม จัดระเบียบของพาร์เนอร์ และประกาศแบนเนอร์ LINE OA ได้ทันที
              </p>
            </div>

            <div className="space-y-4">
              {allShops.map((shop) => {
                const isPending = shop.registrationStatus === 'pending';
                return (
                  <div 
                    key={shop.id}
                    className="p-4 bg-neutral-900/40 border border-neutral-850 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex gap-4 items-center">
                      <img src={shop.logo} className="w-12 h-12 rounded-xl object-cover border border-neutral-800" referrerPolicy="no-referrer" />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-neutral-100">{shop.name}</h4>
                          <span className={`text-[8.5px] font-bold px-2 py-0.5 rounded-full ${shop.registrationStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400' : shop.registrationStatus === 'pending' ? 'bg-amber-500/10 text-amber-500 animate-pulse' : 'bg-red-500/10 text-rose-500'}`}>
                            {shop.registrationStatus === 'approved' ? 'APPROVED' : shop.registrationStatus === 'pending' ? 'PENDING' : 'REJECTED'}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-400">{shop.description}</p>
                        <div className="text-[9px] text-neutral-500 font-mono">
                          ประเภท: {shop.category} • ติดต่อ: {shop.phone} • สมัครเมื่อ {new Date(shop.createdAt).toLocaleDateString('th-TH')}
                        </div>
                      </div>
                    </div>

                    {/* Pending action buttons */}
                    {isPending && (
                      <div className="flex gap-2 self-start md:self-center">
                        <button 
                          onClick={() => handleApproveShop(shop.id)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-lg active:scale-95 transition cursor-pointer"
                        >
                          ✓ อนุมัติการเปิดบริการ
                        </button>
                        <button 
                          onClick={() => handleRejectShop(shop.id)}
                          className="bg-rose-600/90 hover:bg-rose-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-lg active:scale-95 transition cursor-pointer"
                        >
                          ✕ ปฏิเสธร้าน
                        </button>
                      </div>
                    )}

                    {shop.registrationStatus === 'approved' && (
                      <span className="text-[10px] text-emerald-400 font-bold font-mono">✓ อนุมัติและพร้อมทำงาน</span>
                    )}

                    {shop.registrationStatus === 'rejected' && (
                      <span className="text-[10px] text-rose-450 font-bold font-mono">✕ ถูกปฏิเสธคำขอร่วมโครงการ</span>
                    )}

                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* TAB 2: PLATFORM ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-neutral-900 border border-neutral-850 p-4 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-450">% การตอบอนุมัติรางวัลสำเร็จ</span>
                <p className="text-xl font-bold font-mono text-emerald-400">92.4 %</p>
                <div className="text-[9px] text-neutral-500 font-semibold pt-1">อัตราเสียเวลาเฉลี่ย 3.4 วินาที</div>
              </div>
              <div className="bg-neutral-900 border border-neutral-850 p-4 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-450">แต้มใช้แลกพรีเมี่ยมทั้งหมด</span>
                <p className="text-xl font-bold font-mono text-rose-400">-{totalPointsRedeemedSum} แต้ม</p>
                <div className="text-[9px] text-neutral-500 font-semibold pt-1">แลกเปลี่ยนมูลค่าสะสมแล้ว</div>
              </div>
              <div className="bg-neutral-900 border border-neutral-850 p-4 rounded-xl space-y-1">
                <span className="text-[10px] text-neutral-450">ปริมาณการสแกน QR ต่อชั่วโมง</span>
                <p className="text-xl font-bold font-mono text-neutral-200">140 scans</p>
                <div className="text-[9px] text-neutral-500 font-semibold pt-1">สถานะลิงก์ออนไลน์เสถียร 99.9%</div>
              </div>
            </div>

            {/* Custom SVG line chart simulation */}
            <div className="bg-neutral-900 border border-neutral-850 p-4 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-xs font-bold text-neutral-300">วิถีกราฟพฤติกรรมการเพิ่มแต้มสะสมสะพัด (ยอดรวมของสัปดาห์ปัจจุบันปี 2026)</h4>
                <div className="flex gap-4 text-[9px] font-mono text-neutral-400">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-violet-500 rounded" /> ยอดสมัครแบรนด์</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-400 rounded" /> แต้มที่จ่ายหมุนเวียน</span>
                </div>
              </div>

              {/* simulated chart canvas with beautiful curves */}
              <div className="h-40 flex items-end justify-between px-2 pt-4 relative">
                
                {/* Simulated vertical indicator lines */}
                <div className="absolute inset-x-0 bottom-0 top-4 flex flex-col justify-between pointer-events-none opacity-5">
                  <div className="border-b border-white" />
                  <div className="border-b border-white" />
                  <div className="border-b border-white" />
                </div>

                <div className="flex flex-col items-center gap-1.5 flex-1 select-none">
                  <div className="w-4 bg-linear-to-t from-violet-950 to-violet-500 h-10 rounded-t" />
                  <span className="text-[8px] font-mono font-bold text-neutral-400">จ. (Mon)</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 flex-1 select-none">
                  <div className="w-4 bg-linear-to-t from-violet-950 to-violet-500 h-16 rounded-t" />
                  <span className="text-[8px] font-mono font-bold text-neutral-400">อ. (Tue)</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 flex-1 select-none">
                  <div className="w-4 bg-linear-to-t from-violet-950 to-violet-500 h-24 rounded-t animate-pulse" />
                  <span className="text-[8px] font-mono font-bold text-neutral-400">พ. (Wed)</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 flex-1 select-none">
                  <div className="w-4 bg-linear-to-t from-violet-950 to-violet-500 h-12 rounded-t" />
                  <span className="text-[8px] font-mono font-bold text-neutral-400">พฤ. (Thu)</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 flex-1 select-none">
                  <div className="w-4 bg-linear-to-t from-violet-950 to-violet-400 h-32 rounded-t" />
                  <span className="text-[8px] font-mono font-bold text-neutral-400">ศ. (Fri)</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 flex-1 select-none">
                  <div className="w-4 bg-linear-to-t from-violet-950 to-violet-400 h-28 rounded-t" />
                  <span className="text-[8px] font-mono font-bold text-neutral-400">ส. (Sat)</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 flex-1 select-none">
                  <div className="w-4 bg-linear-to-t from-violet-950 to-violet-400 h-36 rounded-t" />
                  <span className="text-[8px] font-mono font-bold text-neutral-400">อา. (Sun)</span>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 3: PLATFORM CORE CONFIGURATION */}
        {activeTab === 'settings' && (
          <form onSubmit={handleSavePlatformSettings} className="space-y-4">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div className="bg-neutral-900 border border-neutral-850 p-4 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-violet-400 font-mono uppercase block">คะแนนขั้นตํ่าระดับ GOLD</span>
                <div className="space-y-1">
                  <label className="text-[9.5px] text-neutral-400">กำหนดพิกัดแต้มเข้าเกณฑ์:</label>
                  <input 
                    type="number"
                    value={goldCap}
                    onChange={(e) => setGoldCap(parseInt(e.target.value) || 0)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-xs px-3 py-2 rounded-lg text-white font-mono"
                    required
                  />
                  <span className="text-[9px] text-neutral-500 italic block">ค่าเริ่มต้นระบบสถิติปัจจุบันคือ 300 แต้ม</span>
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-850 p-4 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-violet-400 font-mono uppercase block">คะแนนขั้นตํ่าระดับ PLATINUM</span>
                <div className="space-y-1">
                  <label className="text-[9.5px] text-neutral-400">กำหนดพิกัดแต้มเข้าเกณฑ์:</label>
                  <input 
                    type="number"
                    value={platinumCap}
                    onChange={(e) => setPlatinumCap(parseInt(e.target.value) || 0)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-xs px-3 py-2 rounded-lg text-white font-mono"
                    required
                  />
                  <span className="text-[9px] text-neutral-500 italic block">ระดับ VIP สิทธิพิเศษเหนือระดับคือ 1000 แต้ม</span>
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-850 p-4 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-violet-400 font-mono uppercase block">ค่าบริการระบบ SaaS (บาท / เดือน)</span>
                <div className="space-y-1">
                  <label className="text-[9.5px] text-neutral-400">ค่อจ้างสโตร์แพ็คเกจเริ่มต้น:</label>
                  <input 
                    type="number"
                    value={baseSubscriptionFee}
                    onChange={(e) => setBaseSubscriptionFee(parseInt(e.target.value) || 0)}
                    className="w-full bg-neutral-950 border border-neutral-800 text-xs px-3 py-2 rounded-lg text-white font-mono"
                    required
                  />
                  <span className="text-[9px] text-neutral-500 italic block">แพ็คเกจฟูลฟังก์ชันดูแลลูกค้าสะสมแต้ม</span>
                </div>
              </div>

            </div>

            <button 
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-700 active:scale-98 text-white font-bold text-xs py-2.5 rounded-xl transition duration-150 cursor-pointer text-center block"
            >
              บันทึกการตั้งค่าแกนระบบ Webmaster
            </button>

          </form>
        )}

      </div>

    </div>
  );
}

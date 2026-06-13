import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Store, QrCode, Users, Plus, Edit, Trash2, Check, X,
  ShoppingBag, Award, PlusCircle, MinusCircle, Search, 
  Image, HelpCircle, Calendar, RefreshCw, AlertCircle, FileText, Copy, UserPlus, ReceiptText, Share2
} from 'lucide-react';
import { Shop, Customer, Reward, Transaction, PromoBanner, AuditLog } from '../types';
import { 
  getShops, saveShops, getCustomers, saveCustomers, 
  getRewards, saveRewards, getTransactions, saveTransactions,
  getBanners, saveBanners, getGeneratedCoupons, saveGeneratedCoupons,
  getAuditLogs, addAuditLog
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

type MerchantTab = 'dashboard' | 'approvals' | 'customers' | 'rewards' | 'promotions' | 'generator' | 'reports' | 'audit' | 'settings';

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
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Search Filter / Inputs
  const [searchTerm, setSearchTerm] = useState('');

  const activeShopDetail = shops.find(s => s.id === selectedShopId);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm) ||
    (c.lineName && c.lineName.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Custom QR / Link generator states
  const [generatePurchaseAmount, setGeneratePurchaseAmount] = useState('500');
  const [generateDesc, setGenerateDesc] = useState('ยอดซื้อหน้าร้าน');
  const [generatedQRValue, setGeneratedQRValue] = useState('');
  const [expiryMinutes, setExpiryMinutes] = useState('15');
  const [activeCoupon, setActiveCoupon] = useState<any | null>(null);
  const [generatedCouponsList, setGeneratedCouponsList] = useState<any[]>([]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [shopPointRateInput, setShopPointRateInput] = useState('10');
  const [shopNameInput, setShopNameInput] = useState('');
  const [shopDescriptionInput, setShopDescriptionInput] = useState('');
  const [shopCategoryInput, setShopCategoryInput] = useState('');
  const [shopPhoneInput, setShopPhoneInput] = useState('');
  const [shopLogoInput, setShopLogoInput] = useState('');
  const [shopWelcomeInput, setShopWelcomeInput] = useState('');
  const [shopContactInput, setShopContactInput] = useState('');
  const [shopShareMessageInput, setShopShareMessageInput] = useState('');
  const [shopRichMenuContactUrlInput, setShopRichMenuContactUrlInput] = useState('');
  const [shopIsActiveInput, setShopIsActiveInput] = useState(true);

  const lineLiffId = process.env.NEXT_PUBLIC_LINE_LIFF_ID?.trim();
  const buildCustomerClaimUrl = (code: string) => {
    const encodedCode = encodeURIComponent(code);
    if (lineLiffId) return `https://liff.line.me/${lineLiffId}?code=${encodedCode}`;
    if (typeof window !== 'undefined') return `${window.location.origin}/customer/${shopIdToSlug(selectedShopId)}?code=${encodedCode}`;
    return `/customer/${shopIdToSlug(selectedShopId)}?code=${encodedCode}`;
  };

  const defaultRewardImage = 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=400&auto=format&fit=crop&q=80';
  const rewardImageMaxBytes = 2 * 1024 * 1024;
  const rewardImageAllowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const shopLogoImageMaxBytes = 2 * 1024 * 1024;
  const shopLogoImageAllowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

  const handleShopLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!shopLogoImageAllowedTypes.includes(file.type)) {
      showStatus('❌ รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP เท่านั้น');
      input.value = '';
      return;
    }

    if (file.size > shopLogoImageMaxBytes) {
      showStatus('❌ ไฟล์โลโก้ใหญ่เกินไป กรุณาใช้ไฟล์ไม่เกิน 2 MB');
      input.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        showStatus('❌ อ่านไฟล์โลโก้ไม่ได้ กรุณาลองเลือกรูปใหม่อีกครั้ง');
        input.value = '';
        return;
      }

      const previewImage = new window.Image();
      previewImage.onload = () => {
        const width = previewImage.naturalWidth;
        const height = previewImage.naturalHeight;
        setShopLogoInput(result);

        if (width < 300 || height < 300) {
          showStatus(`⚠️ อัปโหลดโลโก้แล้ว แต่รูปค่อนข้างเล็ก (${width}×${height}px) แนะนำ 512×512px`);
          return;
        }

        const ratio = width / height;
        if (ratio < 0.85 || ratio > 1.15) {
          showStatus(`⚠️ อัปโหลดโลโก้แล้ว (${width}×${height}px) แนะนำให้ใช้รูปสี่เหลี่ยมจัตุรัส 512×512px`);
          return;
        }

        showStatus(`✓ อัปโหลดโลโก้ร้านแล้ว (${width}×${height}px)`);
      };
      previewImage.onerror = () => {
        setShopLogoInput(result);
        showStatus('✓ อัปโหลดโลโก้ร้านแล้ว');
      };
      previewImage.src = result;
    };

    reader.onerror = () => {
      showStatus('❌ อ่านไฟล์โลโก้ไม่ได้ กรุณาลองเลือกรูปใหม่อีกครั้ง');
      input.value = '';
    };

    reader.readAsDataURL(file);
  };

  const handleRewardImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    if (!rewardImageAllowedTypes.includes(file.type)) {
      showStatus('❌ รองรับเฉพาะไฟล์ JPG, PNG หรือ WEBP เท่านั้น');
      input.value = '';
      return;
    }

    if (file.size > rewardImageMaxBytes) {
      showStatus('❌ ไฟล์รูปใหญ่เกินไป กรุณาใช้ไฟล์ไม่เกิน 2 MB');
      input.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (!result) {
        showStatus('❌ อ่านไฟล์รูปไม่ได้ กรุณาลองเลือกรูปใหม่อีกครั้ง');
        input.value = '';
        return;
      }

      const previewImage = new window.Image();
      previewImage.onload = () => {
        const width = previewImage.naturalWidth;
        const height = previewImage.naturalHeight;
        setNewRewImage(result);

        if (width < 600 || height < 600) {
          showStatus(`⚠️ อัปโหลดรูปแล้ว แต่รูปค่อนข้างเล็ก (${width}×${height}px) แนะนำ 800×800px`);
          return;
        }

        const ratio = width / height;
        if (ratio < 0.85 || ratio > 1.15) {
          showStatus(`⚠️ อัปโหลดรูปแล้ว (${width}×${height}px) แนะนำให้ใช้รูปสี่เหลี่ยมจัตุรัส 800×800px`);
          return;
        }

        showStatus(`✓ อัปโหลดรูปของรางวัลแล้ว (${width}×${height}px)`);
      };
      previewImage.onerror = () => {
        setNewRewImage(result);
        showStatus('✓ อัปโหลดรูปของรางวัลแล้ว');
      };
      previewImage.src = result;
    };

    reader.onerror = () => {
      showStatus('❌ อ่านไฟล์รูปไม่ได้ กรุณาลองเลือกรูปใหม่อีกครั้ง');
      input.value = '';
    };

    reader.readAsDataURL(file);
  };

  const generateNewCouponAndLink = () => {
    const activeShop = shops.length > 0 ? shops.find(s => s.id === selectedShopId) : getShops().find(s => s.id === selectedShopId);
    const currentPointsRate = Math.max(1, activeShop?.pointsRate || 10);
    const purchaseAmountText = String(generatePurchaseAmount).trim();
    const expiryMinutesText = String(expiryMinutes).trim();

    if (!purchaseAmountText) {
      showStatus('❌ กรุณาใส่ยอดซื้อก่อนสร้างลิงก์รับแต้ม');
      return;
    }

    const purchaseAmount = Number(purchaseAmountText);
    if (!Number.isFinite(purchaseAmount) || purchaseAmount <= 0) {
      showStatus('❌ กรุณาใส่ยอดซื้อเป็นตัวเลขที่มากกว่า 0');
      return;
    }

    if (!expiryMinutesText) {
      showStatus('❌ กรุณาใส่เวลาหมดอายุของลิงก์');
      return;
    }

    const parsedExpiryMinutes = Number(expiryMinutesText);
    if (!Number.isFinite(parsedExpiryMinutes) || parsedExpiryMinutes <= 0) {
      showStatus('❌ กรุณาใส่เวลาหมดอายุเป็นตัวเลข 1 - 60 นาที');
      return;
    }

    const boundedExpiryMinutes = Math.max(1, Math.min(60, Math.floor(parsedExpiryMinutes)));
    const couponPoints = Math.floor(purchaseAmount / currentPointsRate);

    if (couponPoints <= 0) {
      showStatus(`❌ ยอดซื้อยังไม่ถึงอัตราแจกแต้มของร้าน (${currentPointsRate} บาท = 1 แต้ม)`);
      return;
    }

    // Generate unique code format CPN-[SHOP_ABBR]-[POINTS]-[RANDOM_5_CHARS]
    const shopAbbr = selectedShopId.split('_').map(w => w[0]).join('').toUpperCase() || 'CPN';
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const uniqueCode = `CPN-${shopAbbr}-${couponPoints}-${randomHex}`;

    const coupons = getGeneratedCoupons();

    const expiresAt = new Date(Date.now() + boundedExpiryMinutes * 60 * 1000).toISOString();

    const newCoupon = {
      code: uniqueCode,
      points: couponPoints,
      shopId: selectedShopId,
      shopName: activeShop?.name || 'ร้านกาแฟ KOFFEE CRAFT',
      description: generateDesc || `ยอดซื้อ ${purchaseAmount.toLocaleString('th-TH')} บาท`,
      purchaseAmount,
      pointsRate: currentPointsRate,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt,
      isUsed: false
    };

    coupons.push(newCoupon);
    saveGeneratedCoupons(coupons);

    // Construct LIFF URL first so customer opens inside LINE when available.
    const generatedUrl = buildCustomerClaimUrl(uniqueCode);

    recordAuditLog({
      action: 'point_link_created',
      actionLabel: 'สร้างลิงก์รับแต้ม',
      description: `สร้างลิงก์รับแต้ม ${couponPoints.toLocaleString('th-TH')} แต้ม จากยอดซื้อ ${purchaseAmount.toLocaleString('th-TH')} บาท`,
      targetType: 'coupon',
      targetId: uniqueCode,
      points: couponPoints,
      metadata: { purchaseAmount, pointsRate: currentPointsRate, expiresAt, url: generatedUrl },
    });

    setGeneratedQRValue(generatedUrl);
    setActiveCoupon(newCoupon);

    // Refresh generated coupons list
    const shopCoupons = coupons.filter((c: any) => c.shopId === selectedShopId);
    shopCoupons.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setGeneratedCouponsList(shopCoupons);
  };

  const handleShareClaimLink = async (url: string, points: number, code?: string) => {
    if (!url) {
      showStatus('❌ กรุณาสร้างลิงก์รับแต้มก่อนแชร์');
      return;
    }

    const shopName = activeShopDetail?.name || 'ร้านค้า';
    const shareTitle = `รับแต้มจาก ${shopName}`;
    const template = activeShopDetail?.shareMessageTemplate?.trim();
    let shareTextWithUrl = template
      ? template
          .replaceAll('{shop}', shopName)
          .replaceAll('{points}', String(points))
          .replaceAll('{url}', url)
      : `รับแต้มจาก ${shopName} จำนวน ${points} แต้ม\nกดรับแต้มที่นี่: ${url}`;

    if (!shareTextWithUrl.includes(url)) {
      shareTextWithUrl = `${shareTextWithUrl}\n${url}`;
    }

    const shareTextWithoutUrl = shareTextWithUrl.replace(url, '').trim() || `รับแต้มจาก ${shopName} จำนวน ${points} แต้ม`;

    try {
      if (window.liff?.shareTargetPicker) {
        await window.liff.shareTargetPicker([{ type: 'text', text: shareTextWithUrl }]);
        showStatus('✓ เปิดหน้าส่งลิงก์ใน LINE แล้ว');
        return;
      }
    } catch (error) {
      console.warn('[line-share] LIFF shareTargetPicker failed, fallback to LINE share URL.', error);
    }

    if (navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareTextWithoutUrl, url });
        showStatus('✓ เปิดหน้าส่งลิงก์แล้ว');
        return;
      } catch (error) {
        console.warn('[line-share] Web Share API cancelled or failed.', error);
      }
    }

    const lineShareUrl = `https://line.me/R/share?text=${encodeURIComponent(shareTextWithUrl)}`;
    window.open(lineShareUrl, '_blank', 'noopener,noreferrer');
    showStatus(code ? `✓ เปิด LINE สำหรับแชร์รหัส ${code}` : '✓ เปิด LINE สำหรับแชร์ลิงก์แล้ว');
  };

  const handleDeleteGeneratedCoupon = (code: string) => {
    if (confirm(`คุณแน่ใจต้องการลบรหัสคูปอง ${code} ถาวรใช่หรือไม่? หลังจากลบแล้ว คูปองหรือลิงก์สะสมแต้มนี้จะไม่สามารถถูกนำมาสแกนหรือใช้งานได้อีกทุกกรณี`)) {
      const coupons = getGeneratedCoupons();
      const filtered = coupons.filter((c: any) => c.code.toUpperCase() !== code.toUpperCase());
      saveGeneratedCoupons(filtered);
      recordAuditLog({
        action: 'point_link_deleted',
        actionLabel: 'ลบลิงก์รับแต้ม',
        description: `ลบรหัสรับแต้ม ${code} ออกจากระบบ`,
        targetType: 'coupon',
        targetId: code,
        status: 'warning',
      });
      showStatus('✓ ลบข้อมูลรหัสแจกแต้มพิเศษสำเร็จอย่างถาวร');
      loadData();
    }
  };

  // Rewards catalog states
  const [showRewardModal, setShowRewardModal] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [newRewName, setNewRewName] = useState('');
  const [newRewPoints, setNewRewPoints] = useState('100');
  const [newRewStock, setNewRewStock] = useState('20');
  const [newRewDesc, setNewRewDesc] = useState('');
  const [newRewImage, setNewRewImage] = useState('');

  // Manual point adjusting modal states
  const [statusMsg, setStatusMsg] = useState('');
  const [selectedCustForAdjust, setSelectedCustForAdjust] = useState<Customer | null>(null);
  const [adjustPoints, setAdjustPoints] = useState('20');
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add');
  const [adjustReason, setAdjustReason] = useState('ปรับแต้มโดยร้านค้า');

  // Real merchant workflow states: create members and record purchases.
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerLineName, setNewCustomerLineName] = useState('');
  const [selectedSaleCustomerId, setSelectedSaleCustomerId] = useState('');
  const [saleAmount, setSaleAmount] = useState('100');
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
    setAuditLogs(getAuditLogs().filter((log) => log.shopId === selectedShopId));

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
    if (!activeShopDetail) return;
    setShopPointRateInput(String(activeShopDetail.pointsRate || 10));
    setShopNameInput(activeShopDetail.name || '');
    setShopDescriptionInput(activeShopDetail.description || '');
    setShopCategoryInput(activeShopDetail.category || '');
    setShopPhoneInput(activeShopDetail.phone || '');
    setShopLogoInput(activeShopDetail.logo || '');
    setShopWelcomeInput(activeShopDetail.welcomeMessage || `ยินดีต้อนรับสู่ ${activeShopDetail.name || 'ร้านค้า'} สะสมแต้มและแลกของรางวัลได้จากหน้านี้`);
    setShopContactInput(activeShopDetail.contactText || activeShopDetail.phone || '');
    setShopShareMessageInput(activeShopDetail.shareMessageTemplate || `รับแต้มจาก {shop} จำนวน {points} แต้ม\nกดรับแต้มที่นี่: {url}`);
    setShopRichMenuContactUrlInput(activeShopDetail.richMenuContactUrl || '');
    setShopIsActiveInput(activeShopDetail.isActive !== false);
  }, [activeShopDetail?.id, activeShopDetail?.name, activeShopDetail?.description, activeShopDetail?.category, activeShopDetail?.phone, activeShopDetail?.logo, activeShopDetail?.pointsRate, activeShopDetail?.isActive, activeShopDetail?.welcomeMessage, activeShopDetail?.contactText, activeShopDetail?.shareMessageTemplate, activeShopDetail?.richMenuContactUrl]);

  useEffect(() => {
    if (customers.length > 0 && !customers.some((customer) => customer.id === selectedSaleCustomerId)) {
      setSelectedSaleCustomerId(customers[0].id);
    }
  }, [customers, selectedSaleCustomerId]);

  const pointsRate = Math.max(1, activeShopDetail?.pointsRate || 10);
  const calculatedSalePoints = Math.max(0, Math.floor((Number(saleAmount) || 0) / pointsRate));
  const calculatedGeneratePoints = Math.max(0, Math.floor((Number(generatePurchaseAmount) || 0) / pointsRate));

  const getTierForLifetime = (lifetimePoints: number): Customer['tier'] => {
    if (lifetimePoints >= 1000) return 'Platinum';
    if (lifetimePoints >= 300) return 'Gold';
    return 'Silver';
  };

  const showStatus = (text: string) => {
    setStatusMsg(text);
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const getStatusClassName = () => {
    if (statusMsg.startsWith('❌')) return 'border-rose-200 bg-rose-50 text-rose-800 shadow-rose-100';
    if (statusMsg.startsWith('⚠️')) return 'border-amber-200 bg-amber-50 text-amber-800 shadow-amber-100';
    return 'border-emerald-200 bg-emerald-50 text-emerald-800 shadow-emerald-100';
  };

  const recordAuditLog = (params: {
    action: string;
    actionLabel: string;
    description: string;
    actorType?: AuditLog['actorType'];
    actorName?: string;
    actorId?: string;
    targetType?: string;
    targetId?: string;
    customerId?: string;
    customerName?: string;
    points?: number;
    status?: AuditLog['status'];
    metadata?: Record<string, unknown>;
  }) => {
    const shopName = activeShopDetail?.name || shops.find((shop) => shop.id === selectedShopId)?.name || selectedShopId;
    const log = addAuditLog({
      shopId: selectedShopId,
      shopName,
      actorType: params.actorType || 'owner',
      actorName: params.actorName || 'เจ้าของร้าน',
      actorId: params.actorId || 'merchant-owner',
      action: params.action,
      actionLabel: params.actionLabel,
      description: params.description,
      targetType: params.targetType,
      targetId: params.targetId,
      customerId: params.customerId,
      customerName: params.customerName,
      points: params.points,
      status: params.status || 'success',
      metadata: params.metadata || {},
    });
    setAuditLogs((prev) => [log, ...prev].slice(0, 1000));
    return log;
  };


  const formatReportDate = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const safeCsvCell = (value: unknown) => {
    if (value === null || typeof value === 'undefined') return '';
    const text = String(value).replace(/\r?\n/g, ' ').trim();
    const escapedFormula = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${escapedFormula.replace(/"/g, '""')}"`;
  };

  const downloadCsvReport = (
    fileKey: string,
    reportLabel: string,
    rows: Array<Record<string, unknown>>,
    fallbackHeaders: string[],
    silent = false,
  ) => {
    const headers = rows.length > 0 ? Object.keys(rows[0]) : fallbackHeaders;
    const csvLines = [
      headers.map(safeCsvCell).join(','),
      ...rows.map((row) => headers.map((header) => safeCsvCell(row[header])).join(',')),
    ];
    const csvContent = `\ufeff${csvLines.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const shopSlug = shopIdToSlug(selectedShopId);
    const dateKey = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `${shopSlug}-${fileKey}-${dateKey}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (!silent) {
      recordAuditLog({
        action: 'report_exported',
        actionLabel: 'Export CSV',
        description: `ดาวน์โหลดรายงาน${reportLabel} จำนวน ${rows.length.toLocaleString('th-TH')} รายการ`,
        targetType: 'report',
        targetId: fileKey,
        metadata: { reportLabel, rowCount: rows.length },
      });
      showStatus(`✓ ดาวน์โหลดรายงาน${reportLabel}แล้ว (${rows.length.toLocaleString('th-TH')} รายการ)`);
    }
  };

  const buildCustomerReportRows = () => customers.map((customer, index) => ({
    'ลำดับ': index + 1,
    'รหัสลูกค้า': customer.id,
    'ชื่อสมาชิก': customer.name,
    'ชื่อ LINE': customer.lineName || '',
    'LINE user id': customer.lineId || '',
    'เบอร์โทร': customer.phone || '',
    'แต้มคงเหลือ': customer.currentPoints,
    'แต้มสะสมทั้งหมด': customer.lifetimePoints,
    'ระดับสมาชิก': customer.tier,
    'วันที่สมัคร': formatReportDate(customer.createdAt),
  }));

  const buildTransactionReportRows = () => {
    const rewardNameById = new Map(rewards.map((reward) => [reward.id, reward.name]));
    return [...transactions]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((transaction, index) => ({
        'ลำดับ': index + 1,
        'รหัสรายการ': transaction.id,
        'วันที่': formatReportDate(transaction.createdAt),
        'ประเภท': transaction.type === 'earn' ? 'รับแต้ม' : 'แลกรางวัล',
        'สถานะ': transaction.status === 'completed' ? 'สำเร็จ' : transaction.status === 'pending' ? 'รออนุมัติ' : 'ปฏิเสธ/ยกเลิก',
        'ชื่อลูกค้า': transaction.userName,
        'เบอร์โทร': transaction.userPhone || '',
        'แต้ม': transaction.type === 'earn' ? transaction.points : -Math.abs(transaction.points),
        'รายละเอียด': transaction.description,
        'ของรางวัล': transaction.rewardId ? (rewardNameById.get(transaction.rewardId) || transaction.rewardId) : '',
        'ร้านค้า': transaction.shopName || activeShopDetail?.name || '',
      }));
  };

  const buildRedeemReportRows = () => {
    const rewardNameById = new Map(rewards.map((reward) => [reward.id, reward.name]));
    return [...rewardRedeems]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((transaction, index) => ({
        'ลำดับ': index + 1,
        'รหัสแลกรางวัล': transaction.id,
        'วันที่ขอแลก': formatReportDate(transaction.createdAt),
        'สถานะ': transaction.status === 'completed' ? 'อนุมัติแล้ว' : transaction.status === 'pending' ? 'รออนุมัติ' : 'ปฏิเสธและคืนแต้มแล้ว',
        'ชื่อลูกค้า': transaction.userName,
        'เบอร์โทร': transaction.userPhone || '',
        'ของรางวัล': transaction.rewardId ? (rewardNameById.get(transaction.rewardId) || transaction.description) : transaction.description,
        'แต้มที่ใช้': transaction.points,
        'รายละเอียด': transaction.description,
      }));
  };

  const buildCouponReportRows = () => generatedCouponsList.map((coupon: any, index: number) => {
    const isExpired = new Date(coupon.expiresAt) < new Date();
    const status = coupon.isUsed ? 'ใช้แล้ว' : isExpired ? 'หมดอายุ' : 'พร้อมใช้';
    return {
      'ลำดับ': index + 1,
      'รหัสรับแต้ม': coupon.code,
      'สถานะ': status,
      'แต้ม': coupon.points,
      'ยอดซื้อ': coupon.purchaseAmount || '',
      'รายละเอียด': coupon.description || '',
      'สร้างเมื่อ': formatReportDate(coupon.createdAt),
      'หมดอายุเมื่อ': formatReportDate(coupon.expiresAt),
      'ใช้โดยลูกค้า ID': coupon.usedByCustomerId || '',
      'ใช้เมื่อ': formatReportDate(coupon.usedAt),
      'ลิงก์รับแต้ม': buildCustomerClaimUrl(coupon.code),
    };
  });

  const buildRewardReportRows = () => rewards.map((reward, index) => ({
    'ลำดับ': index + 1,
    'รหัสของรางวัล': reward.id,
    'ชื่อของรางวัล': reward.name,
    'รายละเอียด': reward.description,
    'แต้มที่ใช้': reward.pointsCost,
    'สต็อกคงเหลือ': reward.stock,
    'สถานะการแสดงผล': reward.isAvailable ? 'เปิดให้แลก' : 'ซ่อนอยู่',
    'ลิงก์รูปภาพ': reward.image,
  }));

  const buildPromoReportRows = () => banners.map((banner, index) => ({
    'ลำดับ': index + 1,
    'รหัสโปรโมชัน': banner.id,
    'หัวข้อ': banner.title,
    'รายละเอียด': banner.description,
    'ประเภท': banner.isAd ? 'โฆษณาแพลตฟอร์ม' : 'โปรโมชันร้านค้า',
    'หมดอายุ': formatReportDate(banner.expirationDate),
    'ลิงก์': banner.url || '',
    'ลิงก์รูปภาพ': banner.image,
  }));

  const buildAuditReportRows = () => [...auditLogs]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((log, index) => ({
      'ลำดับ': index + 1,
      'วันที่/เวลา': formatReportDate(log.createdAt),
      'ประเภทกิจกรรม': log.actionLabel,
      'รหัสกิจกรรม': log.action,
      'รายละเอียด': log.description,
      'ผู้ทำรายการ': log.actorName,
      'ประเภทผู้ทำรายการ': log.actorType === 'owner' ? 'เจ้าของร้าน' : log.actorType === 'customer' ? 'ลูกค้า' : 'ระบบ',
      'ลูกค้าที่เกี่ยวข้อง': log.customerName || '',
      'แต้มที่เปลี่ยนแปลง': typeof log.points === 'number' ? log.points : '',
      'สถานะ': log.status,
      'เป้าหมาย': log.targetType || '',
      'รหัสเป้าหมาย': log.targetId || '',
    }));

  const exportReport = (type: 'customers' | 'transactions' | 'redeems' | 'coupons' | 'rewards' | 'promotions' | 'auditLogs', silent = false) => {
    if (type === 'customers') {
      downloadCsvReport('customers', 'รายชื่อลูกค้า', buildCustomerReportRows(), ['ลำดับ', 'รหัสลูกค้า', 'ชื่อสมาชิก', 'ชื่อ LINE', 'LINE user id', 'เบอร์โทร', 'แต้มคงเหลือ', 'แต้มสะสมทั้งหมด', 'ระดับสมาชิก', 'วันที่สมัคร'], silent);
      return;
    }
    if (type === 'transactions') {
      downloadCsvReport('points-history', 'ประวัติแต้ม', buildTransactionReportRows(), ['ลำดับ', 'รหัสรายการ', 'วันที่', 'ประเภท', 'สถานะ', 'ชื่อลูกค้า', 'เบอร์โทร', 'แต้ม', 'รายละเอียด', 'ของรางวัล', 'ร้านค้า'], silent);
      return;
    }
    if (type === 'redeems') {
      downloadCsvReport('reward-redeems', 'รายการแลกรางวัล', buildRedeemReportRows(), ['ลำดับ', 'รหัสแลกรางวัล', 'วันที่ขอแลก', 'สถานะ', 'ชื่อลูกค้า', 'เบอร์โทร', 'ของรางวัล', 'แต้มที่ใช้', 'รายละเอียด'], silent);
      return;
    }
    if (type === 'coupons') {
      downloadCsvReport('point-links', 'ลิงก์รับแต้ม', buildCouponReportRows(), ['ลำดับ', 'รหัสรับแต้ม', 'สถานะ', 'แต้ม', 'ยอดซื้อ', 'รายละเอียด', 'สร้างเมื่อ', 'หมดอายุเมื่อ', 'ใช้โดยลูกค้า ID', 'ใช้เมื่อ', 'ลิงก์รับแต้ม'], silent);
      return;
    }
    if (type === 'rewards') {
      downloadCsvReport('rewards-stock', 'ของรางวัลและสต็อก', buildRewardReportRows(), ['ลำดับ', 'รหัสของรางวัล', 'ชื่อของรางวัล', 'รายละเอียด', 'แต้มที่ใช้', 'สต็อกคงเหลือ', 'สถานะการแสดงผล', 'ลิงก์รูปภาพ'], silent);
      return;
    }
    if (type === 'auditLogs') {
      downloadCsvReport('audit-logs', 'กิจกรรมระบบ', buildAuditReportRows(), ['ลำดับ', 'วันที่/เวลา', 'ประเภทกิจกรรม', 'รหัสกิจกรรม', 'รายละเอียด', 'ผู้ทำรายการ', 'ประเภทผู้ทำรายการ', 'ลูกค้าที่เกี่ยวข้อง', 'แต้มที่เปลี่ยนแปลง', 'สถานะ', 'เป้าหมาย', 'รหัสเป้าหมาย'], silent);
      return;
    }
    downloadCsvReport('promotions', 'โปรโมชัน', buildPromoReportRows(), ['ลำดับ', 'รหัสโปรโมชัน', 'หัวข้อ', 'รายละเอียด', 'ประเภท', 'หมดอายุ', 'ลิงก์', 'ลิงก์รูปภาพ'], silent);
  };

  const exportAllReports = () => {
    const reportTypes: Array<'customers' | 'transactions' | 'redeems' | 'coupons' | 'rewards' | 'promotions' | 'auditLogs'> = ['customers', 'transactions', 'redeems', 'coupons', 'rewards', 'promotions', 'auditLogs'];
    reportTypes.forEach((type, index) => {
      window.setTimeout(() => exportReport(type, true), index * 260);
    });
    recordAuditLog({
      action: 'report_exported_all',
      actionLabel: 'Export CSV ทั้งหมด',
      description: 'ดาวน์โหลดรายงาน CSV ทั้งหมดของร้าน 7 ไฟล์',
      targetType: 'report',
      targetId: 'all-reports',
      metadata: { reportTypes },
    });
    showStatus('✓ เริ่มดาวน์โหลดรายงาน CSV ทั้งหมด 7 ไฟล์แล้ว');
  };

  const parsePositiveIntegerInput = (rawValue: string, fieldName: string, allowZero = false) => {
    const valueText = String(rawValue).trim();
    if (!valueText) {
      return { value: null as number | null, error: `❌ กรุณาใส่${fieldName}` };
    }

    const parsedValue = Number(valueText);
    const minValue = allowZero ? 0 : 1;
    if (!Number.isFinite(parsedValue) || parsedValue < minValue) {
      return {
        value: null as number | null,
        error: allowZero
          ? `❌ กรุณาใส่${fieldName}เป็นตัวเลข 0 หรือมากกว่า`
          : `❌ กรุณาใส่${fieldName}เป็นตัวเลขที่มากกว่า 0`,
      };
    }

    return { value: Math.floor(parsedValue), error: '' };
  };

  const getValidatedPointRate = () => {
    const rateText = String(shopPointRateInput).trim();
    if (!rateText) {
      return { value: null as number | null, error: '❌ กรุณาใส่จำนวนเงินก่อนบันทึกอัตราแต้ม' };
    }

    const parsedRate = Number(rateText);
    if (!Number.isFinite(parsedRate) || parsedRate <= 0) {
      return { value: null as number | null, error: '❌ กรุณาใส่อัตราแต้มเป็นตัวเลขที่มากกว่า 0' };
    }

    return { value: Math.floor(parsedRate), error: '' };
  };

  const handleSaveShopPointRate = (e: React.FormEvent | React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    const { value: nextRate, error } = getValidatedPointRate();
    if (error || nextRate === null) {
      showStatus(error);
      return;
    }

    const allShops = getShops();
    const targetShop = allShops.find((shop) => shop.id === selectedShopId);

    if (!targetShop) {
      showStatus('❌ ไม่พบข้อมูลร้าน กรุณาลองโหลดหน้าใหม่อีกครั้ง');
      return;
    }

    const updatedShops = allShops.map((shop) => (
      shop.id === selectedShopId ? { ...shop, pointsRate: nextRate } : shop
    ));

    saveShops(updatedShops);
    recordAuditLog({
      action: 'shop_point_rate_updated',
      actionLabel: 'แก้อัตราแต้ม',
      description: `บันทึกอัตราแจกแต้มใหม่: ${nextRate} บาท = 1 แต้ม`,
      targetType: 'shop',
      targetId: selectedShopId,
      metadata: { previousRate: targetShop.pointsRate, nextRate },
    });
    showStatus(`✓ บันทึกอัตราแจกแต้มแล้ว: ${nextRate} บาท = 1 แต้ม`);
    onDataChange();
    loadData();
  };

  const handleSaveShopSettings = (e: React.FormEvent) => {
    e.preventDefault();

    const allShops = getShops();
    const targetShop = allShops.find((shop) => shop.id === selectedShopId);

    if (!targetShop) {
      showStatus('❌ ไม่พบข้อมูลร้าน กรุณาลองโหลดหน้าใหม่อีกครั้ง');
      return;
    }

    const nextName = shopNameInput.trim();
    if (!nextName) {
      showStatus('❌ กรุณาใส่ชื่อร้านก่อนบันทึก');
      return;
    }

    const { value: nextRate, error } = getValidatedPointRate();
    if (error || nextRate === null) {
      showStatus(error);
      return;
    }

    const nextDescription = shopDescriptionInput.trim() || 'สะสมแต้ม แลกของรางวัล และรับสิทธิพิเศษจากร้านค้า';
    const nextCategory = shopCategoryInput.trim() || 'ร้านค้า';
    const nextPhone = shopPhoneInput.trim();
    const nextLogo = shopLogoInput.trim();
    const nextWelcome = shopWelcomeInput.trim() || `ยินดีต้อนรับสู่ ${nextName} สะสมแต้มและแลกของรางวัลได้จากหน้านี้`;
    const nextContact = shopContactInput.trim();
    const nextShareMessage = shopShareMessageInput.trim() || 'รับแต้มจาก {shop} จำนวน {points} แต้ม\nกดรับแต้มที่นี่: {url}';
    const nextRichMenuContactUrl = shopRichMenuContactUrlInput.trim();

    const updatedShops = allShops.map((shop) => (
      shop.id === selectedShopId
        ? {
            ...shop,
            name: nextName,
            description: nextDescription,
            category: nextCategory,
            phone: nextPhone,
            logo: nextLogo,
            pointsRate: nextRate,
            isActive: shopIsActiveInput,
            welcomeMessage: nextWelcome,
            contactText: nextContact,
            shareMessageTemplate: nextShareMessage,
            richMenuContactUrl: nextRichMenuContactUrl,
          }
        : shop
    ));

    saveShops(updatedShops);
    recordAuditLog({
      action: 'shop_settings_updated',
      actionLabel: 'แก้ไขตั้งค่าร้าน',
      description: `บันทึกข้อมูลร้าน “${nextName}” และการตั้งค่าหน้าลูกค้า`,
      targetType: 'shop',
      targetId: selectedShopId,
      metadata: { previousName: targetShop.name, nextName, nextRate, isActive: shopIsActiveInput },
    });
    showStatus('✓ บันทึกตั้งค่าร้านค้าสำเร็จแล้ว');
    onDataChange();
    loadData();
  };

  const handleCopyText = async (text: string, label = 'ข้อความ') => {
    if (!text) {
      showStatus(`❌ ไม่มี${label}ให้คัดลอก`);
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      showStatus(`✓ คัดลอก${label}แล้ว`);
    } catch {
      showStatus(`❌ คัดลอก${label}ไม่สำเร็จ กรุณาคัดลอกเองอีกครั้ง`);
    }
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
    recordAuditLog({
      action: 'customer_created',
      actionLabel: 'เพิ่มสมาชิก',
      description: `เพิ่มสมาชิกใหม่ ${newCustomer.name}`,
      targetType: 'customer',
      targetId: newCustomer.id,
      customerId: newCustomer.id,
      customerName: newCustomer.name,
    });
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

    const saleAmountText = String(saleAmount).trim();
    if (!saleAmountText) {
      showStatus('❌ กรุณาใส่ยอดซื้อก่อนบันทึกแต้ม');
      return;
    }

    const saleAmountValue = Number(saleAmountText);
    if (!Number.isFinite(saleAmountValue) || saleAmountValue <= 0) {
      showStatus('❌ กรุณาใส่ยอดซื้อเป็นตัวเลขที่มากกว่า 0');
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
      description: `${saleReason || 'บันทึกยอดซื้อหน้าร้าน'}: ยอดซื้อ ${saleAmountValue.toLocaleString('th-TH')} บาท`,
      status: 'completed',
      createdAt: new Date().toISOString(),
    };

    saveTransactions([newTx, ...getTransactions()]);
    recordAuditLog({
      action: 'purchase_points_recorded',
      actionLabel: 'บันทึกยอดซื้อ / ให้แต้ม',
      description: `บันทึกยอดซื้อ ${saleAmountValue.toLocaleString('th-TH')} บาท และให้ +${calculatedSalePoints.toLocaleString('th-TH')} แต้มแก่ ${customer.name}`,
      targetType: 'transaction',
      targetId: newTx.id,
      customerId: customer.id,
      customerName: customer.name,
      points: calculatedSalePoints,
      metadata: { saleAmount: saleAmountValue, pointsRate },
    });
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
    recordAuditLog({
      action: reward.isAvailable ? 'reward_hidden' : 'reward_shown',
      actionLabel: reward.isAvailable ? 'ซ่อนของรางวัล' : 'เปิดแสดงของรางวัล',
      description: `${reward.isAvailable ? 'ปิดการแสดง' : 'เปิดให้ลูกค้าเห็น'}ของรางวัล “${reward.name}”`,
      targetType: 'reward',
      targetId: reward.id,
      status: reward.isAvailable ? 'warning' : 'success',
    });
    showStatus(reward.isAvailable ? '✓ ปิดการแสดงของรางวัลนี้แล้ว' : '✓ เปิดให้ลูกค้าเห็นของรางวัลนี้แล้ว');
    onDataChange();
    loadData();
  };

  // 1. APPROVE CUSTOMER REWARD CLAIM
  const handleApproveRedeem = (txId: string) => {
    const allTxs = getTransactions();
    const tx = allTxs.find(t => t.id === txId && t.shopId === selectedShopId);

    if (!tx || tx.type !== 'redeem') {
      showStatus('❌ ไม่พบรายการแลกรางวัลนี้ในร้านปัจจุบัน');
      return;
    }

    if (tx.status !== 'pending') {
      showStatus('❌ รายการนี้ถูกดำเนินการไปแล้ว');
      return;
    }

    if (!tx.rewardId) {
      showStatus('❌ รายการนี้ไม่มีข้อมูลของรางวัล กรุณาตรวจสอบอีกครั้ง');
      return;
    }

    const allRewards = getRewards();
    const matchedReward = allRewards.find(r => r.id === tx.rewardId && r.shopId === selectedShopId);
    const rewardName = matchedReward?.name || tx.description.replace('ขอแลกรางวัล: ', '');

    if (matchedReward && matchedReward.stock <= 0) {
      showStatus('❌ ไม่สามารถอนุมัติได้ เพราะของรางวัลนี้หมดสต็อกแล้ว');
      return;
    }

    const confirmed = confirm(`ยืนยันอนุมัติรายการแลกรางวัลนี้ใช่ไหม?

ลูกค้า: ${tx.userName}
ของรางวัล: ${rewardName}
ใช้แต้ม: ${tx.points.toLocaleString('th-TH')} แต้ม

หลังอนุมัติ ระบบจะลดสต็อกของรางวัล 1 ชิ้น`);
    if (!confirmed) return;

    if (matchedReward) {
      const updatedRewards = allRewards.map(r => {
        if (r.id === tx.rewardId && r.shopId === selectedShopId) {
          return { ...r, stock: Math.max(0, r.stock - 1) };
        }
        return r;
      });
      saveRewards(updatedRewards);
    }

    const updatedTxs = allTxs.map(t => {
      if (t.id === txId && t.shopId === selectedShopId) {
        return { ...t, status: 'completed' as const };
      }
      return t;
    });
    saveTransactions(updatedTxs);

    recordAuditLog({
      action: 'reward_redeem_approved',
      actionLabel: 'อนุมัติรางวัล',
      description: `อนุมัติของรางวัล “${rewardName}” ให้ ${tx.userName}`,
      targetType: 'transaction',
      targetId: tx.id,
      customerId: tx.userId,
      customerName: tx.userName,
      points: -Math.abs(tx.points),
      metadata: { rewardId: tx.rewardId, rewardName },
    });

    showStatus(`✓ อนุมัติให้ของรางวัล “${rewardName}” กับ ${tx.userName} แล้ว`);
    onDataChange();
    loadData();
  };

  // 2. REJECT CUSTOMER REWARD CLAIM (refunds points)
  const handleRejectRedeem = (txId: string) => {
    const allTxs = getTransactions();
    const tx = allTxs.find(t => t.id === txId && t.shopId === selectedShopId);

    if (!tx || tx.type !== 'redeem') {
      showStatus('❌ ไม่พบรายการแลกรางวัลนี้ในร้านปัจจุบัน');
      return;
    }

    if (tx.status !== 'pending') {
      showStatus('❌ รายการนี้ถูกดำเนินการไปแล้ว');
      return;
    }

    const rewardName = tx.description.replace('ขอแลกรางวัล: ', '');
    const confirmed = confirm(`ยืนยันปฏิเสธรายการแลกรางวัลนี้ใช่ไหม?

ลูกค้า: ${tx.userName}
ของรางวัล: ${rewardName}
แต้มที่จะคืน: ${tx.points.toLocaleString('th-TH')} แต้ม

หลังปฏิเสธ ระบบจะคืนแต้มให้ลูกค้าทันที`);
    if (!confirmed) return;

    const allCustomers = getCustomers();
    const updatedCustomers = allCustomers.map(c => {
      if (c.id === tx.userId) {
        return { ...c, currentPoints: c.currentPoints + tx.points };
      }
      return c;
    });
    saveCustomers(updatedCustomers);

    const updatedTxs = allTxs.map(t => {
      if (t.id === txId && t.shopId === selectedShopId) {
        const alreadyHasRefundNote = t.description.includes('คืนแต้มแล้ว');
        return {
          ...t,
          status: 'rejected' as const,
          description: alreadyHasRefundNote ? t.description : `${t.description} (ร้านปฏิเสธ - คืนแต้มแล้ว)`,
        };
      }
      return t;
    });
    saveTransactions(updatedTxs);

    recordAuditLog({
      action: 'reward_redeem_rejected',
      actionLabel: 'ปฏิเสธรางวัล / คืนแต้ม',
      description: `ปฏิเสธรายการแลก “${rewardName}” และคืน ${tx.points.toLocaleString('th-TH')} แต้มให้ ${tx.userName}`,
      targetType: 'transaction',
      targetId: tx.id,
      customerId: tx.userId,
      customerName: tx.userName,
      points: tx.points,
      status: 'warning',
    });

    showStatus(`✕ ปฏิเสธรายการแล้ว และคืน ${tx.points.toLocaleString('th-TH')} แต้มให้ ${tx.userName} แล้ว`);
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
        const newPts = c.currentPoints + calculatedGeneratePoints;
        const newLifetime = c.lifetimePoints + calculatedGeneratePoints;
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
      points: calculatedGeneratePoints,
      description: `รับแต้มจากลิงก์ของร้าน: ${generateDesc || `ยอดซื้อ ${Number(generatePurchaseAmount || 0).toLocaleString('th-TH')} บาท`}`,
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    saveTransactions([newTx, ...getTransactions()]);
    recordAuditLog({
      action: 'test_points_claimed',
      actionLabel: 'ทดสอบรับแต้ม',
      description: `ทดสอบรับแต้ม +${calculatedGeneratePoints.toLocaleString('th-TH')} ให้ลูกค้า ${victim.name}`,
      targetType: 'transaction',
      targetId: newTx.id,
      customerId: victim.id,
      customerName: victim.name,
      points: calculatedGeneratePoints,
      metadata: { source: 'merchant-simulation' },
    });
    showStatus(`✓ ทดสอบรับแต้มสำเร็จ มอบ +${calculatedGeneratePoints} ให้ลูกค้า ${victim.name} เรียบร้อยแล้ว`);
    onDataChange();
    loadData();
  };

  // 4. MANUAL ADJUST POINTS FOR สมาชิก
  const handleManualAdjustPoints = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustForAdjust) return;

    const allCustomers = getCustomers();
    const parsedAdjustPoints = parsePositiveIntegerInput(adjustPoints, 'จำนวนแต้ม');
    if (parsedAdjustPoints.error || parsedAdjustPoints.value === null) {
      showStatus(parsedAdjustPoints.error);
      return;
    }

    const adjustPointsValue = parsedAdjustPoints.value;
    const finalAmount = adjustType === 'add' ? adjustPointsValue : -adjustPointsValue;
    
    // Validate deduction
    if (adjustType === 'deduct' && selectedCustForAdjust.currentPoints < adjustPointsValue) {
      showStatus('❌ แต้มไม่พอสำหรับการหักรายการนี้');
      return;
    }

    const updatedCusts = allCustomers.map(c => {
      if (c.id === selectedCustForAdjust.id) {
        const finalPts = Math.max(0, c.currentPoints + finalAmount);
        const finalLifetime = Math.max(0, c.lifetimePoints + finalAmount);
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
      points: adjustPointsValue,
      description: `ปรับแต้มโดยร้าน: ${adjustReason}`,
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    saveTransactions([newTx, ...getTransactions()]);
    recordAuditLog({
      action: adjustType === 'add' ? 'manual_points_added' : 'manual_points_deducted',
      actionLabel: adjustType === 'add' ? 'ปรับเพิ่มแต้ม' : 'ปรับลดแต้ม',
      description: `${adjustType === 'add' ? 'เพิ่ม' : 'ลด'}แต้ม ${adjustPointsValue.toLocaleString('th-TH')} แต้ม ให้ ${selectedCustForAdjust.name}: ${adjustReason}`,
      targetType: 'transaction',
      targetId: newTx.id,
      customerId: selectedCustForAdjust.id,
      customerName: selectedCustForAdjust.name,
      points: finalAmount,
      status: adjustType === 'add' ? 'success' : 'warning',
    });
    setSelectedCustForAdjust(null);
    showStatus(`✓ ปรับแต้มลูกค้า ${selectedCustForAdjust.name} จำนวน ${finalAmount > 0 ? '+' : ''}${finalAmount} แต้ม สำเร็จ!`);
    onDataChange();
    loadData();
  };

  // 5. MANAGING REWARDS (Add/Edit)
  const openAddReward = () => {
    setEditingReward(null);
    setNewRewName('');
    setNewRewPoints('100');
    setNewRewStock('20');
    setNewRewDesc('');
    setNewRewImage('');
    setShowRewardModal(true);
  };

  const openEditReward = (reward: Reward) => {
    setEditingReward(reward);
    setNewRewName(reward.name);
    setNewRewPoints(String(reward.pointsCost));
    setNewRewStock(String(reward.stock));
    setNewRewDesc(reward.description);
    setNewRewImage(reward.image);
    setShowRewardModal(true);
  };

  const saveRewardForm = (e: React.FormEvent) => {
    e.preventDefault();
    const allRewards = getRewards();

    const trimmedRewardName = newRewName.trim();
    if (!trimmedRewardName) {
      showStatus('❌ กรุณาใส่ชื่อของรางวัลก่อนบันทึก');
      return;
    }

    const parsedRewardPoints = parsePositiveIntegerInput(newRewPoints, 'แต้มที่ใช้แลก');
    if (parsedRewardPoints.error || parsedRewardPoints.value === null) {
      showStatus(parsedRewardPoints.error);
      return;
    }

    const parsedRewardStock = parsePositiveIntegerInput(newRewStock, 'จำนวนสต็อก', true);
    if (parsedRewardStock.error || parsedRewardStock.value === null) {
      showStatus(parsedRewardStock.error);
      return;
    }

    const rewardPointsValue = parsedRewardPoints.value;
    const rewardStockValue = parsedRewardStock.value;
    const rewardDescription = newRewDesc.trim() || 'ไม่มีเงื่อนไขเพิ่มเติม';

    if (editingReward) {
      // Edit
      const updated = allRewards.map(r => {
        if (r.id === editingReward.id) {
          return {
            ...r,
            name: trimmedRewardName,
            pointsCost: rewardPointsValue,
            stock: rewardStockValue,
            description: rewardDescription,
            image: newRewImage || defaultRewardImage
          };
        }
        return r;
      });
      saveRewards(updated);
      recordAuditLog({
        action: 'reward_updated',
        actionLabel: 'แก้ไขของรางวัล',
        description: `แก้ไขของรางวัล “${trimmedRewardName}”`,
        targetType: 'reward',
        targetId: editingReward.id,
        metadata: { pointsCost: rewardPointsValue, stock: rewardStockValue },
      });
      showStatus('✓ อัปเดตรายการสินค้าของรางวัลสำเร็จ');
    } else {
      // Add
      const newRew: Reward = {
        id: `rew_${Date.now()}`,
        name: trimmedRewardName,
        pointsCost: rewardPointsValue,
        stock: rewardStockValue,
        description: rewardDescription,
        image: newRewImage || defaultRewardImage,
        isAvailable: true,
        shopId: selectedShopId
      };
      saveRewards([...allRewards, newRew]);
      recordAuditLog({
        action: 'reward_created',
        actionLabel: 'เพิ่มของรางวัล',
        description: `เพิ่มของรางวัลใหม่ “${newRew.name}”`,
        targetType: 'reward',
        targetId: newRew.id,
        metadata: { pointsCost: rewardPointsValue, stock: rewardStockValue },
      });
      showStatus('✓ บันทึกเปิดตัวสินค้าของรางวัลใหม่สำเร็จ');
    }

    setShowRewardModal(false);
    setActiveTab('rewards');
    onDataChange();
    loadData();
  };

  const handleDeleteReward = (rewId: string) => {
    if (confirm('คุณต้องการยกเลิกและลบบาร์นี้ถาวรจากฐานสตรีมมิ่งเลยใช่หรือไม่?')) {
      const rewardToDelete = getRewards().find(r => r.id === rewId);
      const filtered = getRewards().filter(r => r.id !== rewId);
      saveRewards(filtered);
      recordAuditLog({
        action: 'reward_deleted',
        actionLabel: 'ลบของรางวัล',
        description: `ลบของรางวัล “${rewardToDelete?.name || rewId}”`,
        targetType: 'reward',
        targetId: rewId,
        status: 'danger',
      });
      showStatus('✓ ลบสินค้าของรางวัลเรียบร้อยแล้ว');
      onDataChange();
      loadData();
    }
  };

  const handleDeleteBanner = (bannerId: string) => {
    if (confirm('คุณแน่ใจต้องการลบแคมเปญโปรโมชั่นนี้ออกจากการแสดงผลอย่างถาวรใช่หรือไม่?')) {
      const bannerToDelete = getBanners().find(b => b.id === bannerId);
      const filtered = getBanners().filter(b => b.id !== bannerId);
      saveBanners(filtered);
      recordAuditLog({
        action: 'promotion_deleted',
        actionLabel: 'ลบโปรโมชัน',
        description: `ลบโปรโมชัน “${bannerToDelete?.title || bannerId}”`,
        targetType: 'promotion',
        targetId: bannerId,
        status: 'danger',
      });
      showStatus('✓ ลบแคมเปญโปรโมชั่นสำเร็จ');
      onDataChange();
      loadData();
    }
  };

  const handleDeleteTransactionPermanently = (txId: string) => {
    if (confirm('คุณต้องการลบรายงานประวัติประวัติธุรกรรมนี้ถาวรจากฐานสตรีมมิ่งเลยใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้')) {
      const txToDelete = getTransactions().find(t => t.id === txId);
      const filtered = getTransactions().filter(t => t.id !== txId);
      saveTransactions(filtered);
      recordAuditLog({
        action: 'transaction_deleted',
        actionLabel: 'ลบประวัติธุรกรรม',
        description: `ลบประวัติธุรกรรม ${txId}${txToDelete ? ` (${txToDelete.description})` : ''}`,
        targetType: 'transaction',
        targetId: txId,
        customerId: txToDelete?.userId,
        customerName: txToDelete?.userName,
        points: txToDelete?.type === 'earn' ? txToDelete.points : txToDelete ? -Math.abs(txToDelete.points) : undefined,
        status: 'danger',
      });
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
    recordAuditLog({
      action: 'promotion_created',
      actionLabel: 'สร้างโปรโมชัน',
      description: `สร้างโปรโมชัน “${newBan.title}”`,
      targetType: 'promotion',
      targetId: newBan.id,
      metadata: { expirationDate: newBan.expirationDate },
    });
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

  const rewardRedeems = transactions
    .filter(t => t.type === 'redeem')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const pendingRedeems = rewardRedeems.filter(t => t.status === 'pending');
  const completedRedeems = rewardRedeems.filter(t => t.status === 'completed');
  const rejectedRedeems = rewardRedeems.filter(t => t.status === 'rejected');
  const pendingRedeemPoints = pendingRedeems.reduce((sum, tx) => sum + tx.points, 0);
  const earnTransactions = transactions.filter(t => t.type === 'earn' && t.status === 'completed');
  const totalPointsIssued = earnTransactions.reduce((sum, tx) => sum + tx.points, 0);
  const availableRewards = rewards.filter(reward => reward.isAvailable);
  const usableCoupons = generatedCouponsList.filter((coupon: any) => !coupon.isUsed && new Date(coupon.expiresAt) > new Date());
  const latestActivities = [...transactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);
  const sortedAuditLogs = [...auditLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const todayAuditCount = sortedAuditLogs.filter((log) => new Date(log.createdAt).toDateString() === new Date().toDateString()).length;
  const customerAuditCount = sortedAuditLogs.filter((log) => log.actorType === 'customer').length;
  const ownerAuditCount = sortedAuditLogs.filter((log) => log.actorType === 'owner').length;
  const auditPointDelta = sortedAuditLogs.reduce((sum, log) => sum + (typeof log.points === 'number' ? log.points : 0), 0);
  const formatAuditActorType = (actorType: AuditLog['actorType']) => actorType === 'owner' ? 'เจ้าของร้าน' : actorType === 'customer' ? 'ลูกค้า' : 'ระบบ';
  const getAuditStatusClassName = (status: AuditLog['status']) => {
    if (status === 'danger') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (status === 'warning') return 'bg-amber-50 text-amber-800 border-amber-200';
    if (status === 'success') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const merchantPages: Array<{ id: MerchantTab; label: string; shortLabel: string; icon: string; count?: number; description: string }> = [
    { id: 'dashboard', label: 'แดชบอร์ด', shortLabel: 'หน้าแรก', icon: '🏠', description: 'ภาพรวมของร้านวันนี้' },
    { id: 'generator', label: 'ลิงก์รับแต้ม', shortLabel: 'รับแต้ม', icon: '🔗', count: usableCoupons.length, description: 'สร้างลิงก์หรือ QR สำหรับให้ลูกค้ารับแต้ม' },
    { id: 'rewards', label: 'ของรางวัล', shortLabel: 'รางวัล', icon: '🎁', count: rewards.length, description: 'เพิ่ม แก้ไข และเปิดปิดของรางวัล' },
    { id: 'approvals', label: 'อนุมัติรางวัล', shortLabel: 'อนุมัติ', icon: '✅', count: pendingRedeems.length, description: 'ตรวจรายการที่ลูกค้าขอแลกรางวัล' },
    { id: 'reports', label: 'รายงาน', shortLabel: 'รายงาน', icon: '📊', description: 'ดาวน์โหลด CSV สำหรับ Excel / Google Sheets' },
    { id: 'audit', label: 'กิจกรรมระบบ', shortLabel: 'กิจกรรม', icon: '🧾', count: auditLogs.length, description: 'ดูว่าใครทำอะไร เมื่อไหร่ และเกี่ยวกับรายการไหน' },
    { id: 'settings', label: 'ตั้งค่า', shortLabel: 'ตั้งค่า', icon: '⚙️', description: 'ข้อมูลร้านและลิงก์สำคัญ' },
    { id: 'customers', label: 'สมาชิก', shortLabel: 'สมาชิก', icon: '👥', count: customers.length, description: 'รายชื่อลูกค้าและการปรับแต้ม' },
    { id: 'promotions', label: 'โปรโมชัน', shortLabel: 'โปรโมชัน', icon: '📢', count: banners.length, description: 'แบนเนอร์และโปรโมชันที่แสดงในหน้าลูกค้า' },
  ];


  const goToTab = (tab: MerchantTab) => {
    setActiveTab(tab);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const customerSlug = shopIdToSlug(selectedShopId);
  const customerWebBaseUrl = typeof window !== 'undefined' ? `${window.location.origin}/customer/${customerSlug}` : `/customer/${customerSlug}`;
  const buildCustomerTabWebUrl = (tab?: 'home' | 'rewards' | 'code' | 'history' | 'profile') => {
    if (!tab || tab === 'home') return customerWebBaseUrl;
    return `${customerWebBaseUrl}?tab=${tab}`;
  };
  const buildCustomerTabLiffUrl = (tab?: 'home' | 'rewards' | 'code' | 'history' | 'profile') => {
    if (!lineLiffId) return buildCustomerTabWebUrl(tab);
    if (!tab || tab === 'home') return `https://liff.line.me/${lineLiffId}`;
    return `https://liff.line.me/${lineLiffId}?tab=${tab}`;
  };
  const sampleShareLink = buildCustomerClaimUrl('CPN-SAMPLE-50');
  const sampleShareMessage = (shopShareMessageInput || 'รับแต้มจาก {shop} จำนวน {points} แต้ม\nกดรับแต้มที่นี่: {url}')
    .replaceAll('{shop}', shopNameInput || activeShopDetail?.name || 'ร้านค้า')
    .replaceAll('{points}', '50')
    .replaceAll('{url}', sampleShareLink);
  const richMenuLinks = [
    { label: 'แต้มของฉัน', value: buildCustomerTabLiffUrl('home'), note: 'ใช้กับปุ่มหน้าแรกหรือแต้มของฉัน' },
    { label: 'ของรางวัล', value: buildCustomerTabLiffUrl('rewards'), note: 'ใช้กับปุ่มของรางวัล' },
    { label: 'รับแต้ม / ใส่รหัส', value: buildCustomerTabLiffUrl('code'), note: 'ใช้กับปุ่มรับแต้ม' },
    { label: 'ประวัติ', value: buildCustomerTabLiffUrl('history'), note: 'ใช้กับปุ่มประวัติ' },
    ...(shopRichMenuContactUrlInput.trim() ? [{ label: 'ติดต่อร้าน', value: shopRichMenuContactUrlInput.trim(), note: 'ใช้กับปุ่มติดต่อร้าน' }] : []),
  ];


  const reportDownloadCards = [
    {
      id: 'customers' as const,
      title: 'รายชื่อลูกค้า',
      description: 'รายชื่อสมาชิก เบอร์โทร LINE ID แต้มคงเหลือ และระดับสมาชิก',
      count: customers.length,
      accent: 'from-sky-50 to-white border-sky-200 text-sky-800',
    },
    {
      id: 'transactions' as const,
      title: 'ประวัติแต้ม',
      description: 'ทุกธุรกรรมรับแต้มและแลกรางวัล พร้อมสถานะและรายละเอียด',
      count: transactions.length,
      accent: 'from-emerald-50 to-white border-emerald-200 text-emerald-800',
    },
    {
      id: 'redeems' as const,
      title: 'รายการแลกรางวัล',
      description: 'รายการรออนุมัติ อนุมัติแล้ว และปฏิเสธ/คืนแต้มแล้ว',
      count: rewardRedeems.length,
      accent: 'from-amber-50 to-white border-amber-200 text-amber-800',
    },
    {
      id: 'coupons' as const,
      title: 'ลิงก์รับแต้ม',
      description: 'รหัสรับแต้ม สถานะลิงก์ วันหมดอายุ และลิงก์สำหรับตรวจย้อนหลัง',
      count: generatedCouponsList.length,
      accent: 'from-violet-50 to-white border-violet-200 text-violet-800',
    },
    {
      id: 'rewards' as const,
      title: 'ของรางวัล / สต็อก',
      description: 'รายการของรางวัล แต้มที่ใช้ สต็อก และสถานะเปิดให้แลก',
      count: rewards.length,
      accent: 'from-rose-50 to-white border-rose-200 text-rose-800',
    },
    {
      id: 'promotions' as const,
      title: 'โปรโมชัน',
      description: 'แบนเนอร์และโปรโมชันที่แสดงในหน้าลูกค้าของร้าน',
      count: banners.length,
      accent: 'from-slate-50 to-white border-slate-200 text-slate-800',
    },
    {
      id: 'auditLogs' as const,
      title: 'กิจกรรมระบบ',
      description: 'ประวัติการทำงานหลังบ้าน ลูกค้ารับแต้ม แลกรางวัล และ Export CSV',
      count: auditLogs.length,
      accent: 'from-indigo-50 to-white border-indigo-200 text-indigo-800',
    },
  ];

  return (
    <div className="relative bg-white border border-slate-200 rounded-3xl p-5 md:p-6.5 pb-24 md:pb-6.5 shadow-sm space-y-6.5 text-slate-900">
      
      {/* HEADER SECTION INCLUDES STATS & SWITCH SHOP */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
        
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/35 flex items-center justify-center text-amber-650">
            <Store className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-amber-700 font-extrabold tracking-wider uppercase">หลังบ้านร้านค้า</span>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-slate-900 truncate">{activeShopDetail?.name || 'กำลังโหลดร้านค้า...'}</h2>
              <span className="bg-emerald-550/10 text-emerald-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/20">ออนไลน์</span>
            </div>
          </div>
        </div>

        {/* Compact top menu / shop switch */}
        <div className="shrink-0 flex items-center justify-end gap-2.5">
          {isProductionView ? (
            <button
              type="button"
              onClick={() => setMenuOpen((value) => !value)}
              aria-expanded={menuOpen}
              className="min-w-[96px] sm:min-w-[112px] bg-slate-950 hover:bg-slate-800 text-white font-black px-4 py-2.5 rounded-2xl text-sm shadow-lg shadow-slate-950/10 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <span>เมนู</span>
              <span className={`transition ${menuOpen ? 'rotate-180' : ''}`}>⌄</span>
              {pendingRedeems.length > 0 && (
                <span className="ml-0.5 min-w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] leading-5 text-center font-black">
                  {pendingRedeems.length}
                </span>
              )}
            </button>
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
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                aria-expanded={menuOpen}
                className="bg-slate-950 hover:bg-slate-800 text-white font-black px-4 py-2.5 rounded-2xl text-sm shadow-lg shadow-slate-950/10 transition active:scale-95 flex items-center justify-center gap-2"
              >
                <span>เมนู</span>
                <span className={`transition ${menuOpen ? 'rotate-180' : ''}`}>⌄</span>
              </button>
            </>
          )}
        </div>

      </div>

      <AnimatePresence>
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className={`fixed left-1/2 top-4 z-[90] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border px-4 py-3 text-xs font-black shadow-xl ${getStatusClassName()}`}
            role="status"
            aria-live="polite"
          >
            {statusMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact expandable top menu. It stays in the normal page flow and pushes content down instead of covering the screen. */}
      <AnimatePresence initial={false}>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -6 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -6 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {merchantPages.map((page) => (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => goToTab(page.id)}
                    className={`relative rounded-2xl px-3 py-2.5 text-left transition border flex items-center gap-2.5 min-h-[52px] ${activeTab === page.id ? 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm' : 'bg-slate-50/70 text-slate-700 border-slate-100 hover:bg-white hover:border-amber-200 hover:text-amber-700'}`}
                  >
                    <span className="text-lg leading-none">{page.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-black truncate">{page.shortLabel}</span>
                      <span className="hidden sm:block text-[10px] font-medium text-slate-500 truncate">{page.label}</span>
                    </span>
                    {typeof page.count === 'number' && page.count > 0 && (
                      <span className={`shrink-0 min-w-5 h-5 rounded-full px-1.5 text-[10px] leading-5 text-center font-black ${page.id === 'approvals' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {page.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          <div className="space-y-5 animate-fade-in">
            <form onSubmit={handleSaveShopSettings} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-[0.22em]">Merchant settings</p>
                  <h4 className="text-xl font-black text-slate-950 mt-1">ตั้งค่าร้านค้า</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">แก้ข้อมูลพื้นฐาน อัตราแต้ม ข้อความ และลิงก์ที่ต้องใช้กับลูกค้า</p>
                </div>
                <div className={`rounded-2xl px-4 py-3 border ${shopIsActiveInput ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  <p className="text-[10px] font-black">สถานะร้าน</p>
                  <p className="text-sm font-black mt-0.5">{shopIsActiveInput ? 'เปิดใช้งาน' : 'ปิดชั่วคราว'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-600">ชื่อร้าน</label>
                  <input
                    type="text"
                    value={shopNameInput}
                    onChange={(e) => setShopNameInput(e.target.value)}
                    placeholder="เช่น iM Sticker"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-600">หมวดหมู่ร้าน</label>
                  <input
                    type="text"
                    value={shopCategoryInput}
                    onChange={(e) => setShopCategoryInput(e.target.value)}
                    placeholder="เช่น Sticker / ของขวัญ / ร้านกาแฟ"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-600">คำอธิบายร้านสั้น ๆ</label>
                  <textarea
                    value={shopDescriptionInput}
                    onChange={(e) => setShopDescriptionInput(e.target.value)}
                    rows={3}
                    placeholder="คำอธิบายนี้จะแสดงในหน้าลูกค้า"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-600">เบอร์ / ช่องทางติดต่อร้าน</label>
                  <input
                    type="text"
                    value={shopPhoneInput}
                    onChange={(e) => setShopPhoneInput(e.target.value)}
                    placeholder="เช่น 08x-xxx-xxxx หรือ LINE OA"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:ring-2 focus:ring-amber-300"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-600">สถานะเปิดรับลูกค้า</label>
                  <button
                    type="button"
                    onClick={() => setShopIsActiveInput((value) => !value)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition active:scale-95 ${shopIsActiveInput ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}
                  >
                    <span className="block text-sm font-black">{shopIsActiveInput ? 'เปิดใช้งานร้าน' : 'ปิดร้านชั่วคราว'}</span>
                    <span className="block text-[10px] font-bold mt-0.5 opacity-80">{shopIsActiveInput ? 'ลูกค้าสามารถใช้งานหน้าร้านและแลกรางวัลได้ตามปกติ' : 'ใช้สำหรับแจ้งสถานะในระบบก่อนเปิดจริง'}</span>
                  </button>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-1.5">
                    <div>
                      <label className="text-[10px] font-black text-slate-600">โลโก้ร้าน / รูปร้าน</label>
                      <p className="text-[10px] text-slate-500 font-bold mt-1">แนะนำ 512×512 px, ขั้นต่ำ 300×300 px, ไฟล์ JPG / PNG / WEBP ไม่เกิน 2 MB</p>
                    </div>
                    <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 w-fit">สัดส่วน 1:1 จะสวยที่สุด</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[96px_1fr] gap-3 items-center rounded-3xl border border-slate-200 bg-slate-50 p-3">
                    <div className="w-24 h-24 rounded-3xl border border-slate-200 bg-white overflow-hidden flex items-center justify-center shadow-sm">
                      {shopLogoInput ? (
                        <img src={shopLogoInput} alt="shop preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <Image className="w-8 h-8 text-slate-300" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <input
                        id="shop-logo-upload"
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleShopLogoUpload}
                        className="hidden"
                      />
                      <div className="flex flex-col sm:flex-row gap-2">
                        <label
                          htmlFor="shop-logo-upload"
                          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-black text-white transition hover:bg-slate-800 active:scale-95"
                        >
                          <Image className="w-4 h-4" />
                          เลือกไฟล์โลโก้ร้าน
                        </label>
                        {shopLogoInput && (
                          <button
                            type="button"
                            onClick={() => {
                              setShopLogoInput('');
                              showStatus('✓ ล้างรูปโลโก้ร้านแล้ว อย่าลืมกดบันทึกตั้งค่าร้านค้า');
                            }}
                            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 active:scale-95"
                          >
                            ล้างรูปโลโก้
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">หลังเลือกรูป ระบบจะแสดงตัวอย่างทันที และจะบันทึกจริงเมื่อกด “บันทึกตั้งค่าร้านค้า”</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 space-y-4">
                <div className="flex flex-col md:flex-row md:items-end gap-3">
                  <div className="flex-1 space-y-1.5">
                    <p className="text-[10px] font-black text-amber-700">อัตราแจกแต้ม</p>
                    <label className="text-xs font-bold text-slate-700 block">ลูกค้าซื้อครบกี่บาท = 1 แต้ม</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={1}
                      value={shopPointRateInput}
                      onChange={(e) => setShopPointRateInput(e.target.value)}
                      placeholder="เช่น 100"
                      className="w-full bg-white border border-amber-200 rounded-2xl px-4 py-3 text-sm font-black text-slate-950 outline-none focus:ring-2 focus:ring-amber-300"
                    />
                    <p className="text-[10px] text-slate-600 font-medium">ตอนนี้ระบบคำนวณจากยอดซื้อ: ทุก {pointsRate} บาท = 1 แต้ม</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveShopPointRate}
                    className="bg-white hover:bg-amber-100 text-amber-800 border border-amber-200 font-black text-xs rounded-2xl px-4 py-3 transition active:scale-95"
                  >
                    บันทึกเฉพาะอัตราแต้ม
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-600">ข้อความต้อนรับลูกค้า</label>
                  <textarea
                    value={shopWelcomeInput}
                    onChange={(e) => setShopWelcomeInput(e.target.value)}
                    rows={3}
                    placeholder="เช่น ยินดีต้อนรับสู่ร้าน iM Sticker สะสมแต้มและแลกของรางวัลได้จากหน้านี้"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-600">ข้อความติดต่อร้าน</label>
                  <textarea
                    value={shopContactInput}
                    onChange={(e) => setShopContactInput(e.target.value)}
                    rows={3}
                    placeholder="เช่น ติดต่อร้านทาง LINE OA หรือเบอร์โทร"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-600">ลิงก์ติดต่อร้านสำหรับ Rich Menu</label>
                  <input
                    type="text"
                    value={shopRichMenuContactUrlInput}
                    onChange={(e) => setShopRichMenuContactUrlInput(e.target.value)}
                    placeholder="เช่น https://line.me/R/ti/p/@xxxx"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <p className="text-[10px] text-slate-500 font-medium">ถ้าใส่ไว้ ระบบจะแสดงลิงก์นี้ในชุด Rich Menu ด้านล่าง</p>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-600">ข้อความแชร์รับแต้ม</label>
                  <textarea
                    value={shopShareMessageInput}
                    onChange={(e) => setShopShareMessageInput(e.target.value)}
                    rows={4}
                    placeholder={'รับแต้มจาก {shop} จำนวน {points} แต้ม\nกดรับแต้มที่นี่: {url}'}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                  />
                  <p className="text-[10px] text-slate-500 font-medium">ใช้ตัวแปรได้: {'{shop}'} = ชื่อร้าน, {'{points}'} = จำนวนแต้ม, {'{url}'} = ลิงก์รับแต้ม</p>
                  <div className="rounded-2xl bg-slate-950 text-white p-3 text-xs font-medium whitespace-pre-wrap">{sampleShareMessage}</div>
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-3 pt-1">
                <button
                  type="submit"
                  className="flex-1 bg-slate-950 hover:bg-slate-800 text-white font-black text-sm rounded-2xl px-5 py-3.5 transition active:scale-95"
                >
                  บันทึกตั้งค่าร้านค้า
                </button>
                <button
                  type="button"
                  onClick={() => loadData()}
                  className="md:w-44 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-sm rounded-2xl px-5 py-3.5 transition active:scale-95"
                >
                  โหลดค่าล่าสุด
                </button>
              </div>
            </form>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <div>
                <h4 className="text-base font-black text-slate-950">ลิงก์ลูกค้าและ Rich Menu</h4>
                <p className="text-xs text-slate-500 font-medium mt-1">คัดลอกลิงก์เหล่านี้ไปใช้ใน LINE OA Rich Menu ได้ทันที</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {richMenuLinks.map((link) => (
                  <div key={link.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black text-slate-950">{link.label}</p>
                        <p className="text-[10px] text-slate-500 font-medium mt-0.5">{link.note}</p>
                        <p className="text-[11px] font-bold text-emerald-700 mt-2 break-all">{link.value}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyText(link.value, `ลิงก์ ${link.label}`)}
                        className="shrink-0 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-black text-xs rounded-xl px-3 py-2 transition active:scale-95 flex items-center justify-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" /> คัดลอก
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <h4 className="text-sm font-black text-amber-900">หมายเหตุสำหรับ pilot</h4>
              <ul className="mt-3 space-y-2 text-xs text-amber-900 font-medium list-disc pl-5">
                <li>ข้อมูลที่บันทึกตรงนี้จะถูกใช้กับหน้าลูกค้าและข้อความแชร์รับแต้ม</li>
                <li>ลิงก์ LIFF ใช้รูปแบบ query เช่น ?tab=rewards / ?tab=code เพื่อไม่ให้เกิด 404</li>
                <li>ถ้าจะเปิดหลายร้านจริงในอนาคต ควรย้ายรูปโลโก้และรูปของรางวัลไปเก็บใน Storage จริง</li>
              </ul>
            </div>
          </div>
        )}


        {activeTab === 'reports' && (
          <div className="space-y-5 animate-fade-in">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-5 text-white shadow-sm overflow-hidden relative">
              <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-amber-400/20 blur-2xl" />
              <div className="absolute -left-10 bottom-0 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black text-amber-300 uppercase tracking-[0.22em]">CSV reports</p>
                  <h3 className="mt-1 text-2xl font-black">รายงานร้านค้า</h3>
                  <p className="mt-2 text-sm text-slate-200 max-w-2xl leading-relaxed">
                    ดาวน์โหลดข้อมูลของร้านเป็นไฟล์ CSV สำหรับเปิดใน Excel หรือ Google Sheets ก่อนส่งบัญชี ตรวจย้อนหลัง หรือสำรองข้อมูลช่วง Pilot
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportAllReports}
                  className="shrink-0 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-3 text-sm shadow-lg shadow-amber-950/20 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" /> ดาวน์โหลดทั้งหมด
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-black text-slate-600">สมาชิก</p>
                <p className="mt-1 text-3xl font-black text-slate-950 font-mono">{customers.length}</p>
                <p className="text-[10px] text-slate-500 font-bold">ใช้ในรายงานลูกค้า</p>
              </div>
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                <p className="text-[11px] font-black text-emerald-800">ธุรกรรมแต้ม</p>
                <p className="mt-1 text-3xl font-black text-emerald-700 font-mono">{transactions.length}</p>
                <p className="text-[10px] text-emerald-700/75 font-bold">รับแต้มและแลกรางวัล</p>
              </div>
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <p className="text-[11px] font-black text-amber-800">รออนุมัติ</p>
                <p className="mt-1 text-3xl font-black text-amber-700 font-mono">{pendingRedeems.length}</p>
                <p className="text-[10px] text-amber-700/75 font-bold">รายการแลกรางวัลค้างอยู่</p>
              </div>
              <div className="rounded-3xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
                <p className="text-[11px] font-black text-violet-800">ลิงก์รับแต้ม</p>
                <p className="mt-1 text-3xl font-black text-violet-700 font-mono">{generatedCouponsList.length}</p>
                <p className="text-[10px] text-violet-700/75 font-bold">รวมทุกสถานะ</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {reportDownloadCards.map((card) => (
                <div key={card.id} className={`rounded-3xl border bg-gradient-to-br p-5 shadow-sm ${card.accent}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-950">{card.title}</p>
                      <p className="mt-1 text-xs text-slate-600 leading-relaxed min-h-[48px]">{card.description}</p>
                    </div>
                    <div className="shrink-0 w-11 h-11 rounded-2xl bg-white/85 border border-white shadow-sm flex items-center justify-center text-lg font-black">
                      {card.count.toLocaleString('th-TH')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => exportReport(card.id)}
                    className="mt-4 w-full rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-black text-xs py-3 transition active:scale-95 flex items-center justify-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> ดาวน์โหลด CSV
                  </button>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <h4 className="text-sm font-black text-amber-900">วิธีใช้งานไฟล์ CSV</h4>
              <ul className="mt-3 space-y-2 text-xs text-amber-900 font-medium list-disc pl-5 leading-relaxed">
                <li>ไฟล์มี BOM ภาษาไทย เพื่อให้ Excel เปิดแล้วอ่านภาษาไทยได้ง่ายขึ้น</li>
                <li>ถ้าเปิดใน Google Sheets ให้เลือก File → Import แล้วอัปโหลดไฟล์ CSV</li>
                <li>ข้อมูลในรายงานเป็นข้อมูลของร้านที่กำลังเปิดอยู่เท่านั้น ไม่รวมร้านอื่น</li>
                <li>แนะนำดาวน์โหลดก่อนกดล้างข้อมูลหรือก่อนเริ่มแคมเปญใหญ่ทุกครั้ง</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="space-y-5 animate-fade-in">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-5 text-white shadow-sm overflow-hidden relative">
              <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-indigo-400/20 blur-2xl" />
              <div className="absolute -left-10 bottom-0 w-32 h-32 rounded-full bg-amber-300/10 blur-2xl" />
              <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black text-amber-300 uppercase tracking-[0.22em]">Audit log</p>
                  <h3 className="mt-1 text-2xl font-black">กิจกรรมระบบ</h3>
                  <p className="mt-2 text-sm text-slate-200 max-w-2xl leading-relaxed">
                    ตรวจย้อนหลังว่าใครทำอะไร เมื่อไหร่ เกี่ยวกับลูกค้าหรือรายการไหน ช่วยตามปัญหาแต้มและการอนุมัติช่วง Pilot ได้ง่ายขึ้น
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => exportReport('auditLogs')}
                  className="shrink-0 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-3 text-sm shadow-lg shadow-amber-950/20 transition active:scale-95 flex items-center justify-center gap-2"
                >
                  <FileText className="w-4 h-4" /> Export CSV
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-[11px] font-black text-slate-600">กิจกรรมทั้งหมด</p>
                <p className="mt-1 text-3xl font-black text-slate-950 font-mono">{sortedAuditLogs.length}</p>
                <p className="text-[10px] text-slate-500 font-bold">ของร้านนี้เท่านั้น</p>
              </div>
              <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
                <p className="text-[11px] font-black text-amber-800">วันนี้</p>
                <p className="mt-1 text-3xl font-black text-amber-700 font-mono">{todayAuditCount}</p>
                <p className="text-[10px] text-amber-700/75 font-bold">รายการที่เกิดวันนี้</p>
              </div>
              <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
                <p className="text-[11px] font-black text-indigo-800">ลูกค้าทำรายการ</p>
                <p className="mt-1 text-3xl font-black text-indigo-700 font-mono">{customerAuditCount}</p>
                <p className="text-[10px] text-indigo-700/75 font-bold">รับแต้ม / แลกรางวัล / โปรไฟล์</p>
              </div>
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                <p className="text-[11px] font-black text-emerald-800">แต้มสุทธิใน log</p>
                <p className="mt-1 text-3xl font-black text-emerald-700 font-mono">{auditPointDelta.toLocaleString('th-TH')}</p>
                <p className="text-[10px] text-emerald-700/75 font-bold">บวก/ลบจากกิจกรรมที่บันทึก</p>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="text-base font-black text-slate-950">รายการกิจกรรมล่าสุด</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">แสดงกิจกรรมล่าสุดสูงสุด 120 รายการแรก เพื่อให้หน้าโหลดเร็วบนมือถือ</p>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-black">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">เจ้าของร้าน {ownerAuditCount}</span>
                  <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-indigo-700">ลูกค้า {customerAuditCount}</span>
                </div>
              </div>

              {sortedAuditLogs.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {sortedAuditLogs.slice(0, 120).map((log) => (
                    <div key={log.id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${getAuditStatusClassName(log.status)}`}>
                              {log.actionLabel}
                            </span>
                            <span className="rounded-full bg-white border border-slate-200 px-2.5 py-1 text-[10px] font-black text-slate-600">
                              {formatAuditActorType(log.actorType)}
                            </span>
                            {typeof log.points === 'number' && (
                              <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${log.points >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'}`}>
                                {log.points >= 0 ? '+' : ''}{log.points.toLocaleString('th-TH')} แต้ม
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-sm font-black text-slate-950 leading-relaxed">{log.description}</p>
                          <p className="mt-1 text-xs text-slate-500 font-medium">
                            ผู้ทำรายการ: <span className="font-black text-slate-700">{log.actorName}</span>
                            {log.customerName ? <> • ลูกค้า: <span className="font-black text-slate-700">{log.customerName}</span></> : null}
                          </p>
                          {(log.targetType || log.targetId) && (
                            <p className="mt-1 text-[11px] text-slate-400 font-mono break-all">
                              {log.targetType || 'target'}: {log.targetId || '-'}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-left md:text-right">
                          <p className="text-[11px] text-slate-500 font-mono">{formatReportDate(log.createdAt)}</p>
                          <p className="mt-1 text-[10px] text-slate-400 font-mono break-all max-w-[180px]">{log.id}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-xl">🧾</div>
                  <h4 className="font-black text-slate-950 mt-3">ยังไม่มีประวัติกิจกรรม</h4>
                  <p className="text-xs text-slate-500 font-medium mt-1">เมื่อสร้างลิงก์รับแต้ม อนุมัติรางวัล หรือ Export CSV รายการจะมาแสดงที่นี่</p>
                </div>
              )}
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5">
              <h4 className="text-sm font-black text-amber-900">หมายเหตุ</h4>
              <ul className="mt-3 space-y-2 text-xs text-amber-900 font-medium list-disc pl-5 leading-relaxed">
                <li>กิจกรรมระบบนี้บันทึกไว้เพื่อช่วยตรวจย้อนหลัง ไม่ได้ใช้แทนระบบบัญชีอย่างเป็นทางการ</li>
                <li>รายการใหม่จะถูกบันทึกอัตโนมัติจากการทำงานหลังบ้านและการทำรายการของลูกค้า</li>
                <li>สามารถกด Export CSV เพื่อนำไปเปิดใน Excel / Google Sheets ได้</li>
              </ul>
            </div>
          </div>
        )}

        {/* TAB A: APPROVALS LIST & ALL HISTORIES */}
        {activeTab === 'approvals' && (
          <div className="space-y-5 animate-fade-in">
            <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-[0.22em]">Reward approval</p>
                  <h3 className="text-xl font-black text-slate-950 mt-1">อนุมัติรางวัล</h3>
                  <p className="text-xs text-slate-600 font-medium mt-1">
                    ตรวจรายการที่ลูกค้าขอแลกของรางวัลก่อนส่งมอบจริง ถ้าปฏิเสธ ระบบจะคืนแต้มให้ลูกค้าทันที
                  </p>
                </div>
                <div className="rounded-2xl bg-white border border-amber-200 px-4 py-3 text-right shadow-sm">
                  <p className="text-[10px] font-black text-slate-500">รายการรอดำเนินการ</p>
                  <p className="text-2xl font-black text-amber-700 font-mono">{pendingRedeems.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-4">
                <div className="rounded-2xl bg-white border border-slate-200 p-3">
                  <p className="text-[10px] font-black text-slate-500">รออนุมัติ</p>
                  <p className="text-xl font-black text-amber-700 font-mono mt-1">{pendingRedeems.length}</p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-3">
                  <p className="text-[10px] font-black text-slate-500">อนุมัติแล้ว</p>
                  <p className="text-xl font-black text-emerald-700 font-mono mt-1">{completedRedeems.length}</p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-3">
                  <p className="text-[10px] font-black text-slate-500">ปฏิเสธ/คืนแต้ม</p>
                  <p className="text-xl font-black text-rose-700 font-mono mt-1">{rejectedRedeems.length}</p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-3">
                  <p className="text-[10px] font-black text-slate-500">แต้มในคิว</p>
                  <p className="text-xl font-black text-slate-950 font-mono mt-1">{pendingRedeemPoints}</p>
                </div>
              </div>
            </div>

            {/* Sub-Tabs Switches */}
            <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 gap-1.5 self-start w-fit max-w-full overflow-x-auto">
              <button
                type="button"
                onClick={() => setApprovalsSubTab('queue')}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-black transition duration-150 cursor-pointer ${approvalsSubTab === 'queue' ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:text-slate-950'}`}
              >
                🕒 รอยืนยัน ({pendingRedeems.length})
              </button>
              <button
                type="button"
                onClick={() => setApprovalsSubTab('history')}
                className={`shrink-0 px-3 py-2 rounded-xl text-xs font-black transition duration-150 cursor-pointer ${approvalsSubTab === 'history' ? 'bg-slate-950 text-white shadow' : 'text-slate-600 hover:text-slate-950'}`}
              >
                📜 ประวัติแลกรางวัล ({rewardRedeems.length})
              </button>
            </div>

            {approvalsSubTab === 'queue' ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 bg-amber-50 px-4 py-3 rounded-2xl border border-amber-200">
                  <AlertCircle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                  <div className="text-xs text-amber-900 font-medium">
                    <p className="font-black">ก่อนอนุมัติ ให้ตรวจของรางวัลและยืนยันกับลูกค้าที่หน้าร้านก่อนเสมอ</p>
                    <p className="mt-1 text-amber-800">กด “อนุมัติ” เมื่อส่งมอบของแล้วเท่านั้น ถ้ากด “ปฏิเสธ” ระบบจะคืนแต้มให้ลูกค้าโดยอัตโนมัติ</p>
                  </div>
                </div>

                {pendingRedeems.length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {pendingRedeems.map(t => {
                      const reward = rewards.find(item => item.id === t.rewardId);
                      const customer = customers.find(item => item.id === t.userId);
                      const rewardName = reward?.name || t.description.replace('ขอแลกรางวัล: ', '');
                      const stockLabel = reward ? `${reward.stock} ชิ้น` : 'ไม่พบข้อมูลสต็อก';
                      const stockDanger = reward ? reward.stock <= 0 : false;
                      return (
                        <div key={t.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black text-amber-700 uppercase tracking-wider">รายการรออนุมัติ</p>
                              <h4 className="text-base font-black text-slate-950 mt-1 truncate">{rewardName}</h4>
                              <p className="text-[11px] text-slate-500 font-mono mt-1">{new Date(t.createdAt).toLocaleString('th-TH')}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 text-[10px] font-black">
                              รอดำเนินการ
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 col-span-2 sm:col-span-1">
                              <p className="text-[10px] font-black text-slate-500">ลูกค้า</p>
                              <p className="font-black text-slate-950 mt-1">{t.userName}</p>
                              <p className="text-[11px] text-slate-600 mt-0.5">{t.userPhone || '-'}</p>
                              {customer && <p className="text-[11px] text-slate-500 mt-0.5">แต้มคงเหลือหลังขอแลก: {customer.currentPoints.toLocaleString('th-TH')} แต้ม</p>}
                            </div>
                            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3 col-span-2 sm:col-span-1">
                              <p className="text-[10px] font-black text-slate-500">แต้ม / สต็อก</p>
                              <p className="font-black text-rose-700 mt-1">-{t.points.toLocaleString('th-TH')} แต้ม</p>
                              <p className={`text-[11px] font-bold mt-0.5 ${stockDanger ? 'text-rose-700' : 'text-slate-600'}`}>คงเหลือ: {stockLabel}</p>
                            </div>
                          </div>

                          {stockDanger && (
                            <div className="rounded-2xl bg-rose-50 border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700">
                              ของรางวัลนี้หมดสต็อกแล้ว ระบบจะไม่ให้อนุมัติจนกว่าจะเพิ่มสต็อกก่อน
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <button 
                              type="button"
                              onClick={() => handleApproveRedeem(t.id)}
                              disabled={stockDanger}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:text-slate-500 text-white font-black px-3 py-2.5 rounded-2xl text-xs transition cursor-pointer disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <Check className="w-4 h-4" /> อนุมัติให้ของแล้ว
                            </button>
                            <button 
                              type="button"
                              onClick={() => handleRejectRedeem(t.id)}
                              className="bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-black px-3 py-2.5 rounded-2xl text-xs transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <X className="w-4 h-4" /> ปฏิเสธและคืนแต้ม
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center mx-auto text-xl">✅</div>
                    <h4 className="font-black text-slate-950 mt-3">ยังไม่มีรายการรออนุมัติ</h4>
                    <p className="text-xs text-slate-500 font-medium mt-1">เมื่อลูกค้าแลกของรางวัล รายการใหม่จะมาแสดงที่นี่</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-600 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
                  <span className="font-medium">ประวัติรายการแลกรางวัลทั้งหมดของร้าน ใช้ตรวจย้อนหลังว่าอนุมัติ ปฏิเสธ หรือยังรอดำเนินการ</span>
                  <span className="text-[10px] font-mono text-slate-500 font-semibold">รวมทั้งหมด: {rewardRedeems.length} รายการ</span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs border-collapse font-sans min-w-[760px]">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider font-mono">
                        <th className="py-3 pl-4">ลูกค้า / วันที่</th>
                        <th className="py-3">ของรางวัล</th>
                        <th className="py-3">แต้ม</th>
                        <th className="py-3">สถานะ</th>
                        <th className="py-3 text-right pr-4">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {rewardRedeems.map(t => {
                        const rewardName = t.description.replace('ขอแลกรางวัล: ', '').replace(' (ร้านปฏิเสธ - คืนแต้มแล้ว)', '');
                        const statusBadge = t.status === 'pending'
                          ? <span className="px-2 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">รออนุมัติ</span>
                          : t.status === 'completed'
                            ? <span className="px-2 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">อนุมัติแล้ว</span>
                            : <span className="px-2 py-1 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">ปฏิเสธ / คืนแต้มแล้ว</span>;
                        return (
                          <tr key={t.id} className="hover:bg-amber-50/40">
                            <td className="py-3.5 pl-4">
                              <div className="font-black text-slate-950">{t.userName}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{t.userPhone || '-'}</div>
                              <div className="text-[10px] text-slate-500 font-mono mt-0.5">{new Date(t.createdAt).toLocaleString('th-TH')}</div>
                            </td>
                            <td className="py-3.5 text-slate-800 font-bold text-[11px]">
                              {rewardName}
                            </td>
                            <td className="py-3.5 font-mono text-rose-700 font-black">
                              -{t.points.toLocaleString('th-TH')} แต้ม
                            </td>
                            <td className="py-3.5">{statusBadge}</td>
                            <td className="py-3.5 text-right pr-4">
                              {t.status === 'pending' ? (
                                <div className="inline-flex gap-1.5">
                                  <button type="button" onClick={() => handleApproveRedeem(t.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-2 py-1 text-[10px] font-black">อนุมัติ</button>
                                  <button type="button" onClick={() => handleRejectRedeem(t.id)} className="bg-rose-600 hover:bg-rose-700 text-white rounded-lg px-2 py-1 text-[10px] font-black">ปฏิเสธ</button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTransactionPermanently(t.id)}
                                  className="p-1 px-2 border border-red-500/20 bg-red-500/10 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg transition duration-150 text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                                  title="ลบถาวร"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  ลบถาวร
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {rewardRedeems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-slate-500 font-medium font-sans">
                            ยังไม่มีประวัติการแลกของรางวัลของร้านนี้
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
                  inputMode="decimal"
                  min={0}
                  value={saleAmount}
                  onChange={(e) => setSaleAmount(e.target.value)}
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
                            setAdjustPoints('20');
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
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 w-full max-w-sm max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl relative"
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
                        inputMode="numeric"
                        min={1}
                        max={1000}
                        value={adjustPoints}
                        onChange={(e) => setAdjustPoints(e.target.value)}
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
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 w-full max-w-sm max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl relative"
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
                  className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 w-full max-w-sm max-h-[92vh] overflow-y-auto space-y-4 shadow-2xl relative"
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
                          inputMode="numeric"
                          min={1}
                          value={newRewPoints}
                          onChange={(e) => setNewRewPoints(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10.5px] text-neutral-400 block">เปิดสต็อกเบื้องต้น :</label>
                        <input 
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={newRewStock}
                          onChange={(e) => setNewRewStock(e.target.value)}
                          className="w-full bg-neutral-950 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-[10.5px] text-neutral-300 block font-bold">รูปของรางวัล :</label>
                        <p className="text-[9.5px] text-neutral-500 leading-relaxed mt-0.5">
                          แนะนำ 800×800 px • ขั้นต่ำ 600×600 px • JPG/PNG/WEBP • ไม่เกิน 2 MB
                        </p>
                      </div>

                      <div className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-950/70 p-3 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-20 h-20 rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0">
                            {newRewImage ? (
                              <img
                                src={newRewImage}
                                alt="ตัวอย่างรูปของรางวัล"
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Image className="w-8 h-8 text-neutral-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={handleRewardImageUpload}
                              className="block w-full text-[10px] text-neutral-400 file:mr-3 file:rounded-lg file:border-0 file:bg-yellow-500 file:px-3 file:py-2 file:text-[10px] file:font-black file:text-neutral-950 hover:file:bg-yellow-400"
                            />
                            <p className="text-[9px] text-neutral-500 leading-relaxed">
                              ระบบจะเก็บรูปนี้ไว้กับรายการของรางวัล เพื่อให้แสดงทั้งหลังบ้านและหน้าลูกค้า
                            </p>
                          </div>
                        </div>

                        {newRewImage && (
                          <button
                            type="button"
                            onClick={() => setNewRewImage('')}
                            className="text-[10px] font-bold text-neutral-400 hover:text-rose-300 underline underline-offset-2"
                          >
                            ล้างรูปนี้แล้วเลือกรูปใหม่
                          </button>
                        )}
                      </div>
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
                      บันทึกของรางวัล
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
              <h3 className="text-xs font-bold text-slate-700 uppercase font-mono tracking-wider">สร้างลิงก์และ QR Code รับแต้ม</h3>
              <p className="text-[10px] text-slate-600">กรอกยอดซื้อของลูกค้า ระบบจะคำนวณแต้มจากอัตราที่ตั้งไว้ของร้าน แล้วสร้างลิงก์ LIFF สำหรับส่งใน LINE</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
              
              {/* Form settings options */}
              <div className="bg-neutral-950 p-4 rounded-2xl border border-neutral-850 space-y-4">
                <span className="text-[11px] font-bold text-yellow-500 font-mono uppercase block font-sans">ข้อมูลยอดซื้อสำหรับออกลิงก์</span>
                
                <div className="space-y-1 flex flex-col">
                  <label className="text-[10px] text-slate-600 block font-sans">ยอดซื้อของลูกค้า (บาท)</label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={generatePurchaseAmount}
                    onChange={(e) => setGeneratePurchaseAmount(e.target.value)}
                    placeholder="เช่น 500"
                    className="w-full bg-neutral-900 border border-neutral-800 text-xs text-white px-3 py-2 rounded-lg focus:ring-1 focus:ring-yellow-500 outline-none font-sans"
                  />
                  <p className="text-[9.5px] text-neutral-400 font-medium">คำนวณจากอัตราร้าน: {pointsRate} บาท = 1 แต้ม → ลูกค้าจะได้รับ +{calculatedGeneratePoints} แต้ม</p>
                </div>

                <div className="space-y-1 font-sans">
                  <label className="text-[10px] text-slate-600 block font-sans">หมายเหตุบนรายการรับแต้ม</label>
                  <input 
                    type="text"
                    value={generateDesc}
                    onChange={(e) => setGenerateDesc(e.target.value)}
                    placeholder="เช่น ยอดซื้อหน้าร้าน / ใบเสร็จเลขที่..."
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
                      inputMode="numeric"
                      min={1}
                      max={60}
                      value={expiryMinutes}
                      onChange={(e) => setExpiryMinutes(e.target.value)}
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
                          <Check className="w-4 h-4" /> คัดลอกแล้ว ✓
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" /> คัดลอก
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={!generatedQRValue}
                      onClick={() => handleShareClaimLink(generatedQRValue, activeCoupon?.points || calculatedGeneratePoints, activeCoupon?.code)}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-neutral-800 disabled:text-neutral-500 text-white font-bold py-2 px-3 rounded-lg text-xs duration-150 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <Share2 className="w-4 h-4" /> แชร์ไปที่ LINE
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
                    <span className="font-bold text-yellow-500 font-mono"> +{calculatedGeneratePoints} แต้ม</span>
                  </div>

                  {/* Interactive Button to simulate client scanning this link */}
                  <button 
                    type="button"
                    onClick={simulateCustomerScanned}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[11px] py-2.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg"
                  >
เปิดลิงก์ทดสอบ
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
                      <th className="pb-2.5 text-left">ยอดซื้อ / แต้ม</th>
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
                                  const url = buildCustomerClaimUrl(c.code);
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
                          <td className="py-3 font-semibold text-yellow-500 font-mono">{c.purchaseAmount ? `${Number(c.purchaseAmount).toLocaleString('th-TH')} บาท → ` : ''}+{c.points} แต้ม</td>
                          <td className="py-3 text-neutral-400 font-mono text-[10px]">
                            {new Date(c.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} ({new Date(c.createdAt).toLocaleDateString('th-TH')})
                          </td>
                          <td className="py-3 text-neutral-400 font-mono text-[10px]">
                            {new Date(c.expiresAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} ({new Date(c.expiresAt).toLocaleDateString('th-TH')})
                          </td>
                          <td className="py-3 font-sans">{statusBadge}</td>
                          <td className="py-3 text-right pr-2">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleShareClaimLink(buildCustomerClaimUrl(c.code), c.points, c.code)}
                                className="p-1 px-2 border border-green-500/20 bg-green-500/10 hover:bg-green-600 text-green-400 hover:text-white rounded-lg transition duration-150 text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                                title="แชร์ลิงก์นี้ไปที่ LINE"
                              >
                                <Share2 className="w-3.5 h-3.5" /> แชร์
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGeneratedCoupon(c.code)}
                                className="p-1 px-2 border border-red-500/20 bg-red-500/10 hover:bg-rose-600 text-rose-400 hover:text-white rounded-lg transition duration-150 text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                                title="ลบรหัสนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> ลบ
                              </button>
                            </div>
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

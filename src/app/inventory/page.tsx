'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import AssetQrModal from '@/components/qrcode/AssetQrModal';
import ConsumableQrModal from '@/components/qrcode/ConsumableQrModal';
import BoxStickerModal from '@/components/qrcode/BoxStickerModal';
import { formatImageUrl } from '@/lib/image-helper';
import {
  Boxes,
  Box,
  Search,
  Filter,
  Plus,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  MapPin,
  Tag,
  ChevronDown,
  ChevronUp,
  PackagePlus,
  Wrench,
  Eye,
  QrCode,
  Coins,
  Image as ImageIcon,
  History,
  X,
  Check,
  RotateCcw,
  Edit,
  Trash2,
  FileEdit,
  FileSpreadsheet,
  Download,
  Upload,
  Folder,
  FolderPlus,
  Settings,
  RefreshCw,
  Info,
  Building2,
  ShieldCheck,
  ClipboardCheck,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TableLoadingRow } from '@/components/common/LoadingSpinner';

export default function InventoryPage() {
  const { currentUser, isOfficer, isAdmin } = useAuth();
  const isStaff = isOfficer || isAdmin;

  const [items, setItems] = useState<any[]>([]);
  const [selectedAssetForQr, setSelectedAssetForQr] = useState<{ asset: any; itemName: string; itemUnit?: string } | null>(null);
  const [selectedLotForQr, setSelectedLotForQr] = useState<{ lot: any; item: any } | null>(null);
  const [selectedLotForBoxStickers, setSelectedLotForBoxStickers] = useState<{ item: any; lot: any; boxes: any[] } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  // Cycle Count & Stock Reconciliation State
  const [showCycleCountModal, setShowCycleCountModal] = useState(false);
  const [cycleCountItem, setCycleCountItem] = useState<any | null>(null);
  const [cycleCounts, setCycleCounts] = useState<{ [lotId: string]: number }>({});
  const [cycleCountReasons, setCycleCountReasons] = useState<{ [lotId: string]: string }>({});
  const [cycleCountNote, setCycleCountNote] = useState('');
  const [cycleCountSubmitting, setCycleCountSubmitting] = useState(false);


  // Category Management State
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryForm, setCategoryForm] = useState({
    id: '',
    code: '',
    name: '',
    type: 'CONSUMABLE',
    description: '',
  });
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [categorySubmitting, setCategorySubmitting] = useState(false);

  // Bulk Import state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{
    itemsCreated: number;
    itemsUpdated: number;
    assetsCreated: number;
    lotsCreated: number;
    errors?: string[];
  } | null>(null);

  // Repair & Maintenance Modals
  const [repairTarget, setRepairTarget] = useState<{ asset: any; itemName: string } | null>(null);
  const [completeTarget, setCompleteTarget] = useState<{ asset: any; itemName: string } | null>(null);
  const [historyTarget, setHistoryTarget] = useState<{ asset: any; itemName: string } | null>(null);

  const [repairForm, setRepairForm] = useState({
    issue: '',
    repairShop: 'ศูนย์ซ่อมบำรุงพัสดุ / ช่างประจำคณะ',
    repairCost: 0,
    technicianNote: '',
  });

  const [completeForm, setCompleteForm] = useState({
    technicianNote: 'ซ่อมแซมเสร็จสมบูรณ์ ทดสอบระบบใช้งานได้ปกติ คืนเข้าสต็อก',
    repairCost: 0,
    repairShop: '',
  });

  const [maintenanceSubmitting, setMaintenanceSubmitting] = useState(false);

  const handleSendRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repairTarget || !repairForm.issue) {
      alert('กรุณาระบุอาการชำรุด');
      return;
    }
    setMaintenanceSubmitting(true);
    try {
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_REPAIR',
          assetId: repairTarget.asset.id,
          issue: repairForm.issue,
          repairShop: repairForm.repairShop,
          repairCost: repairForm.repairCost,
          technicianNote: repairForm.technicianNote,
          userId: currentUser?.id,
        }),
      });
      if (res.ok) {
        setRepairTarget(null);
        setRepairForm({
          issue: '',
          repairShop: 'ศูนย์ซ่อมบำรุงพัสดุ / ช่างประจำคณะ',
          repairCost: 0,
          technicianNote: '',
        });
        await fetchItems();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการส่งซ่อม');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setMaintenanceSubmitting(false);
    }
  };

  const handleCompleteRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeTarget) return;
    setMaintenanceSubmitting(true);
    try {
      const activeLog = completeTarget.asset.maintenanceLogs?.find((l: any) => l.status === 'UNDER_REPAIR');
      const res = await fetch('/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COMPLETE_REPAIR',
          assetId: completeTarget.asset.id,
          logId: activeLog?.id,
          technicianNote: completeForm.technicianNote,
          repairCost: completeForm.repairCost || activeLog?.repairCost || 0,
          repairShop: completeForm.repairShop || activeLog?.repairShop,
        }),
      });
      if (res.ok) {
        setCompleteTarget(null);
        setCompleteForm({
          technicianNote: 'ซ่อมแซมเสร็จสมบูรณ์ ทดสอบระบบใช้งานได้ปกติ คืนเข้าสต็อก',
          repairCost: 0,
          repairShop: '',
        });
        await fetchItems();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการบันทึกการซ่อมเสร็จ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setMaintenanceSubmitting(false);
    }
  };

  // Edit & Delete Asset State
  const [editAssetTarget, setEditAssetTarget] = useState<{ asset: any; itemName: string } | null>(null);
  const [editAssetForm, setEditAssetForm] = useState({
    assetCode: '',
    govAssetCode: '',
    brand: '',
    model: '',
    supplier: '',
    warrantyExpiry: '',
    location: '',
    serialNumber: '',
    cost: 0,
    receivedDate: '',
    imageUrl: '',
    note: '',
    status: 'AVAILABLE',
    condition: 'GOOD',
  });
  const [assetSaving, setAssetSaving] = useState(false);

  // Edit & Delete Item State
  const [editItemTarget, setEditItemTarget] = useState<any | null>(null);
  const [editItemForm, setEditItemForm] = useState({
    name: '',
    code: '',
    categoryId: '',
    unit: 'เครื่อง',
    usageUnit: '',
    conversionRatio: 1,
    minStockAlert: 5,
    brand: '',
    model: '',
    location: '',
    description: '',
    isBorrowable: true,
    allowExpiredForSim: true,
  });
  const [itemSaving, setItemSaving] = useState(false);

  const openEditAsset = (asset: any, itemName: string) => {
    setEditAssetTarget({ asset, itemName });
    setEditAssetForm({
      assetCode: asset.assetCode || '',
      govAssetCode: asset.govAssetCode || '',
      brand: asset.brand || '',
      model: asset.model || '',
      supplier: asset.supplier || '',
      warrantyExpiry: asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toISOString().split('T')[0] : '',
      location: asset.location || '',
      serialNumber: asset.serialNumber || '',
      cost: asset.cost || 0,
      receivedDate: asset.receivedDate ? new Date(asset.receivedDate).toISOString().split('T')[0] : '',
      imageUrl: asset.imageUrl || '',
      note: asset.note || '',
      status: asset.status || 'AVAILABLE',
      condition: asset.condition || 'GOOD',
    });
  };

  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editAssetTarget) return;
    setAssetSaving(true);
    try {
      const res = await fetch(`/api/assets/${editAssetTarget.asset.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editAssetForm),
      });
      if (res.ok) {
        setEditAssetTarget(null);
        await fetchItems();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการบันทึกการแก้ไขอุปกรณ์');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setAssetSaving(false);
    }
  };

  const handleDeleteAsset = async (asset: any, itemName: string) => {
    if (!confirm(`คุณต้องการลบชิ้นอุปกรณ์ "${asset.assetCode}" (${itemName}) ออกจากระบบใช่หรือไม่?\n\n* การกระทำนี้ไม่สามารถย้อนกลับได้`)) {
      return;
    }
    try {
      const res = await fetch(`/api/assets/${asset.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchItems();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการลบชิ้นอุปกรณ์');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const openEditItem = (item: any) => {
    setEditItemTarget(item);
    setEditItemForm({
      name: item.name || '',
      code: item.code || '',
      categoryId: item.categoryId || (categories[0]?.id || ''),
      unit: item.unit || 'เครื่อง',
      usageUnit: item.usageUnit || '',
      conversionRatio: item.conversionRatio || (item.type === 'CONSUMABLE' ? 1 : 1),
      minStockAlert: item.minStockAlert || 5,
      brand: item.brand || '',
      model: item.model || '',
      location: item.location || '',
      description: item.description || '',
      isBorrowable: item.isBorrowable !== false,
      allowExpiredForSim: item.allowExpiredForSim !== false,
    });
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItemTarget) return;
    setItemSaving(true);
    try {
      const res = await fetch(`/api/items/${editItemTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editItemForm),
      });
      if (res.ok) {
        setEditItemTarget(null);
        await fetchItems();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการบันทึกการแก้ไขพัสดุ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setItemSaving(false);
    }
  };

  const handleDeleteItem = async (item: any) => {
    if (!confirm(`คุณต้องการลบรายการพัสดุ "${item.name}" [${item.code}] ออกจากระบบใช่หรือไม่?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/items/${item.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchItems();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการลบรายการพัสดุ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    code: '',
    name: '',
    type: 'EQUIPMENT',
    categoryId: '',
    unit: 'เครื่อง',
    usageUnit: '',
    conversionRatio: 1,
    minStockAlert: 5,
    brand: '',
    model: '',
    location: '',
    description: '',
    isBorrowable: true,
    allowExpiredForSim: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const [itemsRes, catRes] = await Promise.all([
        fetch('/api/items'),
        fetch('/api/categories'),
      ]);
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data);
        try { sessionStorage.setItem('cached_inventory_items', JSON.stringify(data)); } catch {}
      }
      if (catRes.ok) {
        const catData = await catRes.json();
        setCategories(catData);
        try { sessionStorage.setItem('cached_inventory_categories', JSON.stringify(catData)); } catch {}
      }
      setLastUpdated(new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };


  const openCycleCountModal = (item?: any) => {
    const targetItem = item || items.find((i) => i.type === 'CONSUMABLE' && i.stockLots?.length > 0) || items[0];
    setCycleCountItem(targetItem);
    const initialCounts: { [lotId: string]: number } = {};
    const initialReasons: { [lotId: string]: string } = {};
    if (targetItem?.stockLots) {
      targetItem.stockLots.forEach((l: any) => {
        initialCounts[l.id] = l.quantityRemaining;
        initialReasons[l.id] = 'ตรวจนับสต็อกประจำงวด (Periodic Cycle Count)';
      });
    }
    setCycleCounts(initialCounts);
    setCycleCountReasons(initialReasons);
    setCycleCountNote('');
    setShowCycleCountModal(true);
  };

  const handleSelectCycleItem = (itemId: string) => {
    const targetItem = items.find((i) => i.id === itemId);
    if (!targetItem) return;
    setCycleCountItem(targetItem);
    const initialCounts: { [lotId: string]: number } = {};
    const initialReasons: { [lotId: string]: string } = {};
    if (targetItem.stockLots) {
      targetItem.stockLots.forEach((l: any) => {
        initialCounts[l.id] = l.quantityRemaining;
        initialReasons[l.id] = 'ตรวจนับสต็อกประจำงวด (Periodic Cycle Count)';
      });
    }
    setCycleCounts(initialCounts);
    setCycleCountReasons(initialReasons);
  };

  const handleSaveReconcile = async () => {
    if (!cycleCountItem?.stockLots || cycleCountItem.stockLots.length === 0) {
      alert('รายการนี้ไม่มีสต็อกล็อตให้ตรวจนับ');
      return;
    }

    const adjustments = cycleCountItem.stockLots
      .filter((lot: any) => cycleCounts[lot.id] !== undefined && cycleCounts[lot.id] !== lot.quantityRemaining)
      .map((lot: any) => ({
        lotId: lot.id,
        physicalCount: Number(cycleCounts[lot.id]),
        reason: cycleCountReasons[lot.id] || 'ตรวจนับสต็อกประจำงวด',
      }));

    if (adjustments.length === 0) {
      alert('จำนวนที่ตรวจนับตรงกับยอดในระบบทั้งหมด ไม่มีการปรับยอดสต็อก');
      setShowCycleCountModal(false);
      return;
    }

    setCycleCountSubmitting(true);
    try {
      const res = await fetch('/api/inventory/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustments,
          note: cycleCountNote || `ตรวจนับสต็อก ${cycleCountItem.name} [${cycleCountItem.code}]`,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`ปรับยอดสต็อกสำเร็จเรียบร้อย (${data.adjustedLots?.length || adjustments.length} ล็อต)`);
        setShowCycleCountModal(false);
        await fetchItems(true);
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการปรับยอดสต็อก');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setCycleCountSubmitting(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    try {
      const cItems = sessionStorage.getItem('cached_inventory_items');
      const cCats = sessionStorage.getItem('cached_inventory_categories');
      if (cItems) {
        setItems(JSON.parse(cItems));
        setLoading(false);
      }
      if (cCats) setCategories(JSON.parse(cCats));
    } catch {}

    fetchItems();
    fetchCategories();
  }, []);


  // ฟังก์ชันสร้างรหัสพัสดุอัตโนมัติตามประเภทและหมวดหมู่
  const generateSuggestedItemCode = (type: string, categoryId: string, currentItems: any[]) => {
    const cat = categories.find((c) => c.id === categoryId);
    const catName = cat?.name || '';
    
    // ใช้รหัสหมวดหมู่ภาษาอังกฤษที่ผู้ใช้กำหนด (ถ้ามี) มิฉะนั้นใช้การจับคู่คำอัตโนมัติ
    let group = cat?.code ? cat.code.toUpperCase() : '';
    if (!group) {
      if (type === 'CONSUMABLE') {
        if (catName.includes('ฉีด') || catName.includes('สารน้ำ') || catName.includes('IV')) {
          group = 'IV';
        } else if (catName.includes('แผล') || catName.includes('ผ่าตัด') || catName.includes('ฆ่าเชื้อ')) {
          group = 'WD';
        } else if (catName.includes('ป้องกัน') || catName.includes('PPE') || catName.includes('ถุงมือ')) {
          group = 'PPE';
        } else {
          group = 'GEN';
        }
      } else {
        if (catName.includes('หุ่น') || catName.includes('โมเดล')) {
          group = 'MNK';
        } else if (catName.includes('สัญญาณชีพ') || catName.includes('ตรวจ')) {
          group = 'MED';
        } else if (catName.includes('หัตถการ')) {
          group = 'PRO';
        } else {
          group = 'EQ';
        }
      }
    }

    // หาเลขรหัสสูงสุดในกลุ่มนี้
    const prefix = `${type === 'CONSUMABLE' ? 'CON' : 'EQ'}-${group}-`;
    const existingInGroup = currentItems.filter((i) => i.code && i.code.startsWith(prefix));
    let maxNum = 0;
    existingInGroup.forEach((i) => {
      const parts = i.code.split('-');
      const num = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
  };

  const handleOpenAddCategory = () => {
    setCategoryForm({ id: '', code: '', name: '', type: 'CONSUMABLE', description: '' });
    setIsEditingCategory(false);
    setShowCategoryModal(true);
  };

  const handleEditCategory = (cat: any) => {
    setCategoryForm({
      id: cat.id,
      code: cat.code || '',
      name: cat.name,
      type: cat.type || 'CONSUMABLE',
      description: cat.description || '',
    });
    setIsEditingCategory(true);
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;
    setCategorySubmitting(true);
    try {
      const url = isEditingCategory ? `/api/categories/${categoryForm.id}` : '/api/categories';
      const method = isEditingCategory ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      });
      const data = await res.json();
      if (res.ok) {
        setCategoryForm({ id: '', code: '', name: '', type: 'CONSUMABLE', description: '' });
        setIsEditingCategory(false);
        await fetchCategories();
        await fetchItems();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการบันทึกหมวดหมู่');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setCategorySubmitting(false);
    }
  };

  const handleDeleteCategory = async (cat: any) => {
    if (!confirm(`คุณต้องการลบหมวดหมู่ "${cat.name}" ใช่หรือไม่?`)) return;
    try {
      const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        await fetchCategories();
        await fetchItems();
      } else {
        alert(data.error || 'ไม่สามารถลบหมวดหมู่ได้');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.categoryId) {
      alert('กรุณาเลือกหมวดหมู่ของพัสดุ');
      return;
    }
    if (!newItem.code || !newItem.name) {
      alert('กรุณากรอกรหัสพัสดุและชื่อพัสดุให้ครบถ้วน');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newItem),
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewItem({
          code: '',
          name: '',
          type: 'CONSUMABLE',
          categoryId: '',
          unit: 'กล่อง',
          usageUnit: '',
          conversionRatio: 1,
          minStockAlert: 5,
          brand: '',
          model: '',
          location: '',
          description: '',
          isBorrowable: true,
          allowExpiredForSim: true,
        });
        fetchItems();
      } else {
        const err = await res.json();
        alert(err.error || 'เกิดข้อผิดพลาดในการเพิ่มรายการ');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesType =
        filterType === 'ALL' || item.type === filterType;
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [items, filterType, searchQuery]);

  // Reset page when filter or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / (pageSize || 25)));
  const paginatedItems = useMemo(() => {
    if (pageSize >= 1000) return filteredItems;
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // 1. แบบฟอร์มวัสดุสิ้นเปลือง / เวชภัณฑ์ (Consumables Template)
  const handleDownloadConsumablesTemplate = () => {
    const sampleData = [
      {
        'ชื่อรายการ': 'เข็มฉีดยาเบอร์ 18 ความยาว 1 นิ้ว',
        'รหัสพัสดุ': 'CS-NDL-18-1',
        'หมวดหมู่': 'เวชภัณฑ์ฉีดยา',
        'หน่วยบรรจุ (หน่วยใหญ่)': 'กล่อง',
        'จำนวนรับเข้า (หน่วยใหญ่)': 10,
        'จำนวนย่อยต่อแพ็ค (ชิ้น/กล่อง)': 100,
        'หน่วยย่อยที่เบิกใช้': 'เล่ม',
        'ราคาต่อหน่วยบรรจุ': 180,
        'หมายเลขล็อต': 'LOT-2026-N18',
        'วันหมดอายุ (YYYY-MM-DD)': '2028-12-31',
        'วันที่รับเข้า (YYYY-MM-DD)': '2026-09-12',
        'ผู้จัดจำหน่าย (Supplier)': 'บจก. นอร์ทเทิร์นเมดิคอล',
        'สถานที่จัดเก็บ': 'ตู้เก็บเวชภัณฑ์ฉีดยา ห้องแล็บ 402',
        'จุดแจ้งเตือนสต็อกขั้นต่ำ': 5,
        'คำอธิบาย': 'เข็มดูดยา สแตนเลส สเตอร์ไรด์ ชนิดใช้ครั้งเดียวทิ้ง',
      },
      {
        'ชื่อรายการ': 'เข็มฉีดยาเบอร์ 24 ความยาว 1½ นิ้ว',
        'รหัสพัสดุ': 'CS-NDL-24-15',
        'หมวดหมู่': 'เวชภัณฑ์ฉีดยา',
        'หน่วยบรรจุ (หน่วยใหญ่)': 'กล่อง',
        'จำนวนรับเข้า (หน่วยใหญ่)': 10,
        'จำนวนย่อยต่อแพ็ค (ชิ้น/กล่อง)': 100,
        'หน่วยย่อยที่เบิกใช้': 'เล่ม',
        'ราคาต่อหน่วยบรรจุ': 180,
        'หมายเลขล็อต': 'LOT-2026-N24',
        'วันหมดอายุ (YYYY-MM-DD)': '2028-12-31',
        'วันที่รับเข้า (YYYY-MM-DD)': '2026-09-12',
        'ผู้จัดจำหน่าย (Supplier)': 'บจก. นอร์ทเทิร์นเมดิคอล',
        'สถานที่จัดเก็บ': 'ตู้เก็บเวชภัณฑ์ฉีดยา ห้องแล็บ 402',
        'จุดแจ้งเตือนสต็อกขั้นต่ำ': 5,
        'คำอธิบาย': 'เข็มฉีดยาเข้ากล้ามเนื้อ (IM) สเตอร์ไรด์ ชนิดใช้ครั้งเดียวทิ้ง',
      },
      {
        'ชื่อรายการ': 'ถุงมือตรวจโรคสเตอร์ไรด์ เบอร์ 7',
        'รหัสพัสดุ': 'CS-GLOVE-07',
        'หมวดหมู่': 'เวชภัณฑ์ปลอดเชื้อ',
        'หน่วยบรรจุ (หน่วยใหญ่)': 'กล่อง',
        'จำนวนรับเข้า (หน่วยใหญ่)': 20,
        'จำนวนย่อยต่อแพ็ค (ชิ้น/กล่อง)': 50,
        'หน่วยย่อยที่เบิกใช้': 'คู่',
        'ราคาต่อหน่วยบรรจุ': 220,
        'หมายเลขล็อต': 'LOT-2026-A1',
        'วันหมดอายุ (YYYY-MM-DD)': '2028-12-31',
        'วันที่รับเข้า (YYYY-MM-DD)': '2026-09-12',
        'ผู้จัดจำหน่าย (Supplier)': 'บจก. สยามเซมเพอร์เมด',
        'สถานที่จัดเก็บ': 'ตู้เก็บเวชภัณฑ์ ชั้น 2',
        'จุดแจ้งเตือนสต็อกขั้นต่ำ': 5,
        'คำอธิบาย': 'ถุงมือยางธรรมชาติชนิดมีแป้ง กล่องละ 50 คู่',
      },
      {
        'ชื่อรายการ': 'สำลีก้อนกลมบริสุทธิ์ 0.50 กรัม',
        'รหัสพัสดุ': 'CS-COT-01',
        'หมวดหมู่': 'วัสดุทำแผล',
        'หน่วยบรรจุ (หน่วยใหญ่)': 'ห่อ',
        'จำนวนรับเข้า (หน่วยใหญ่)': 15,
        'จำนวนย่อยต่อแพ็ค (ชิ้น/กล่อง)': 450,
        'หน่วยย่อยที่เบิกใช้': 'ก้อน',
        'ราคาต่อหน่วยบรรจุ': 120,
        'หมายเลขล็อต': 'LOT-2026-C1',
        'วันหมดอายุ (YYYY-MM-DD)': '2029-06-30',
        'วันที่รับเข้า (YYYY-MM-DD)': '2026-09-12',
        'ผู้จัดจำหน่าย (Supplier)': 'บจก. ไทยก๊อซ',
        'สถานที่จัดเก็บ': 'ชั้นเก็บวัสดุทำแผล',
        'จุดแจ้งเตือนสต็อกขั้นต่ำ': 3,
        'คำอธิบาย': 'สำลีก้อนชุบแอลกอฮอล์หรือน้ำยาฆ่าเชื้อ นำไป Repack สเตอร์ไรด์ได้',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'แบบฟอร์มวัสดุสิ้นเปลือง');
    XLSX.writeFile(wb, 'Template_Consumables_วัสดุสิ้นเปลืองและเวชภัณฑ์.xlsx');
  };

  // 2. แบบฟอร์มครุภัณฑ์และอุปกรณ์ (Equipment Template)
  const handleDownloadEquipmentTemplate = () => {
    const sampleData = [
      {
        'ชื่อรายการ': 'เครื่องกระตุกหัวใจไฟฟ้า AED Trainer',
        'รหัสพัสดุ': 'EQ-AED-01',
        'หมวดหมู่': 'อุปกรณ์ช่วยชีวิตและฉุกเฉิน',
        'หน่วยนับ': 'เครื่อง',
        'จำนวนรับเข้า': 2,
        'ราคาต่อหน่วย': 45000,
        'วันที่รับเข้า (YYYY-MM-DD)': '2026-09-10',
        'ยี่ห้อ (Brand)': 'Philips',
        'รุ่น (Model)': 'HeartStart FRx',
        'ผู้จัดจำหน่าย (Supplier)': 'บจก. เมดิคอลซัพพลาย',
        'วันหมดประกัน (YYYY-MM-DD)': '2028-09-10',
        'สถานที่จัดเก็บ': 'ห้องแล็บ 402 ตู้ฉุกเฉิน',
        'คำอธิบาย': 'เครื่องฝึกช่วยฟื้นคืนชีพ AED แบบมีเสียงแนะนำ',
        'รหัสแล็บ (ขึ้นต้น)': 'AED-2569-',
        'เลขครุภัณฑ์ราชการ': 'พย.69-02-0045, พย.69-02-0046',
      },
      {
        'ชื่อรายการ': 'เครื่องวัดความดันโลหิตระบบดิจิทัล',
        'รหัสพัสดุ': 'EQ-BP-01',
        'หมวดหมู่': 'อุปกรณ์ตรวจวินิจฉัย',
        'หน่วยนับ': 'เครื่อง',
        'จำนวนรับเข้า': 4,
        'ราคาต่อหน่วย': 3200,
        'วันที่รับเข้า (YYYY-MM-DD)': '2026-09-10',
        'ยี่ห้อ (Brand)': 'Omron',
        'รุ่น (Model)': 'HEM-7120',
        'ผู้จัดจำหน่าย (Supplier)': 'บจก. ออมรอนเฮลธ์แคร์',
        'วันหมดประกัน (YYYY-MM-DD)': '2027-09-10',
        'สถานที่จัดเก็บ': 'ตู้เครื่องมือตรวจ ชั้น 1',
        'คำอธิบาย': 'เครื่องวัดความดันโลหิตแบบสอดแขนพร้อมผ้าพันแขน',
        'รหัสแล็บ (ขึ้นต้น)': 'BP-2569-',
        'เลขครุภัณฑ์ราชการ': 'พย.69-03-0112, พย.69-03-0113, พย.69-03-0114, พย.69-03-0115',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'แบบฟอร์มครุภัณฑ์');
    XLSX.writeFile(wb, 'Template_Equipment_ครุภัณฑ์และเครื่องมือ.xlsx');
  };

  // 3. แบบฟอร์มรวมเดิม (All-in-One Template)
  const handleDownloadTemplate = () => {
    handleDownloadConsumablesTemplate();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFile(file);
    setBulkResult(null);

    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const jsonData: any[] = XLSX.utils.sheet_to_json(sheet);

      if (jsonData.length === 0) {
        alert('ไฟล์ไม่มีข้อมูลหรือข้อมูลว่างเปล่า');
        return;
      }
      setPreviewData(jsonData);
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถอ่านไฟล์ได้ กรุณาตรวจสอบว่าเป็นไฟล์ .xlsx หรือ .csv ที่ถูกต้อง');
    }
  };

  const handleBulkSubmit = async () => {
    if (previewData.length === 0) return;
    setBulkSubmitting(true);
    setBulkResult(null);

    try {
      const res = await fetch('/api/items/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: previewData }),
      });

      const data = await res.json();
      if (res.ok) {
        setBulkResult(data);
        fetchItems();
      } else {
        alert(data.error || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-teal-600" />
            ทะเบียนพัสดุและครุภัณฑ์ห้องปฏิบัติการพยาบาล
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            รายการครุภัณฑ์คงทนและเวชภัณฑ์สิ้นเปลือง พร้อมระบบติดตามสถานะรายชิ้นและ Lot วันหมดอายุ
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {lastUpdated && (
            <span className="hidden sm:inline text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              อัปเดตล่าสุด: {lastUpdated}
            </span>
          )}
          <button
            onClick={() => fetchItems(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer shadow-sm disabled:opacity-60"
            title="รีเฟรชข้อมูลสต็อกทันที"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-teal-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'กำลังโหลด...' : 'รีเฟรช'}</span>
          </button>

          {isOfficer && (
            <>
              <button
                onClick={() => openCycleCountModal()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition cursor-pointer"
                title="ตรวจนับสต็อกจริงและปรับยอดกระทบยอด (Cycle Count & Reconciliation)"
              >
                <ClipboardCheck className="w-4 h-4 text-emerald-300" />
                <span>ตรวจนับสต็อกประจำงวด</span>
              </button>

              <button
                onClick={handleOpenAddCategory}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm transition cursor-pointer"
              title="จัดการหมวดหมู่พัสดุ (เพิ่ม, แก้ไขชื่อ, ลบหมวดหมู่)"
            >
              <Folder className="w-4 h-4 text-teal-600" />
              <span>จัดการหมวดหมู่ ({categories.length})</span>
            </button>

            <button
              onClick={() => {
                setShowBulkModal(true);
                setBulkFile(null);
                setPreviewData([]);
                setBulkResult(null);
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>นำเข้าจาก Excel</span>
            </button>

              <button
                onClick={() => {
                  setNewItem({
                    code: '',
                    name: '',
                    type: 'CONSUMABLE',
                    categoryId: '',
                    unit: 'กล่อง',
                    usageUnit: '',
                    conversionRatio: '' as any,
                    minStockAlert: '' as any,
                    brand: '',
                    model: '',
                    location: '',
                    description: '',
                    isBorrowable: true,
                    allowExpiredForSim: true,
                  });
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>เพิ่มรายการใหม่</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        {/* Type Tabs */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl w-full md:w-auto border border-transparent dark:border-slate-700">
          <button
            onClick={() => setFilterType('ALL')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ทั้งหมด ({items.length})
          </button>
          <button
            onClick={() => setFilterType('EQUIPMENT')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              filterType === 'EQUIPMENT'
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            ครุภัณฑ์คงทน ({items.filter((i) => i.type === 'EQUIPMENT').length})
          </button>
          <button
            onClick={() => setFilterType('CONSUMABLE')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
              filterType === 'CONSUMABLE'
                ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            วัสดุสิ้นเปลือง ({items.filter((i) => i.type === 'CONSUMABLE').length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <input
            type="text"
            placeholder="ค้นหาชื่อ, รหัส, หมวดหมู่..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">รหัส / ชื่อพัสดุ</th>
                <th className="py-3.5 px-4">ประเภท / หมวดหมู่</th>
                <th className="py-3.5 px-4">สถานที่จัดเก็บ</th>
                <th className="py-3.5 px-4 text-center">คงเหลือ / สถานะ</th>
                <th className="py-3.5 px-4 text-right">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <TableLoadingRow colSpan={5} message="กำลังโหลดรายการวัสดุ ครุภัณฑ์ และสต็อกยา..." />
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 dark:text-slate-500">
                    ไม่พบรายการพัสดุที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => {
                  const isExpanded = expandedItemId === item.id;
                  const isEquipment = item.type === 'EQUIPMENT';

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white text-sm">{item.name}</div>
                          <div className="flex items-center flex-wrap gap-2 mt-0.5">
                            <span className="font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/70 px-1.5 py-0.5 rounded border border-teal-100 dark:border-teal-800/60">
                              {item.code}
                            </span>
                            {item.type === 'CONSUMABLE' && (
                              item.code.startsWith('RP-') || item.unit === 'ซอง' ? (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
                                  <span>✨ ปลอดเชื้อแบ่งบรรจุ</span>
                                  {item.usageUnit && <span>(ซองละ {item.conversionRatio || 1} {item.usageUnit})</span>}
                                </span>
                              ) : (
                                item.usageUnit ? (
                                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                    1 {item.unit} = {item.conversionRatio || 1} {item.usageUnit}
                                  </span>
                                ) : null
                              )
                            )}
                            {item.type === 'EQUIPMENT' && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                                item.isBorrowable === false
                                  ? 'text-rose-700 bg-rose-50 border-rose-200'
                                  : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                              }`}>
                                {item.isBorrowable === false ? '🔒 ประจำห้อง (ห้ามยืมออก)' : '✅ ยืมออกได้'}
                              </span>
                            )}
                            {item.type === 'CONSUMABLE' && item.allowExpiredForSim !== false && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 flex items-center gap-1" title="สามารถนำสต็อกหมดอายุไปฝึกกับหุ่นจำลองได้">
                                🧪 รองรับฝึกหุ่น (Sim-Lab)
                              </span>
                            )}
                            {item.description && (
                              <span className="text-slate-400 text-[11px] truncate max-w-xs">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mb-1">
                            {isEquipment ? (
                              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                ครุภัณฑ์คงทน
                              </span>
                            ) : (
                              <span className="bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full">
                                วัสดุสิ้นเปลือง
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {item.category?.name}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <span>{item.location || 'ไม่ได้ระบุ'}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {isEquipment ? (
                            <div>
                              <span className="font-black text-slate-900 text-sm">
                                {item.currentStock}
                              </span>{' '}
                              <span className="text-slate-500 text-xs">/ {item.totalQuantity} {item.unit}</span>
                              <div className="text-[10px] text-emerald-600 font-bold mt-0.5">
                                พร้อมใช้ {item.currentStock} {item.unit}
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-center justify-center gap-1.5">
                                <span
                                  className={`font-black text-sm ${
                                    item.isLowStock ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100'
                                  }`}
                                >
                                  {item.currentStock}
                                </span>
                                <span className="text-slate-500 text-xs">{item.unit}</span>
                              </div>
                              {item.totalPiecesRemaining > 0 && item.usageUnit && (
                                <div className="text-[10px] text-teal-700 dark:text-teal-400 font-bold mt-0.5">
                                  รวม ~{item.totalPiecesRemaining.toLocaleString()} {item.usageUnit}
                                </div>
                              )}
                              {item.openPackRemainder > 0 && (
                                <div className="mt-0.5">
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
                                    🔓 เศษเปิด {item.openPackRemainder} {item.usageUnit || 'ชิ้น'}
                                  </span>
                                </div>
                              )}
                              {item.isLowStock && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 font-bold text-[10px]">
                                  <AlertTriangle className="w-2.5 h-2.5" /> ต่ำกว่าเกณฑ์ ({item.minStockAlert})
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isStaff && (
                              <button
                                onClick={() => openEditItem(item)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-400 hover:bg-teal-50 transition cursor-pointer"
                                title="แก้ไขข้อมูลพัสดุ (เปลี่ยนชื่อ, รหัส, หมวดหมู่, ที่เก็บหลัก)"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isStaff && (item.currentStock === 0 && (!item.assets || item.assets.length === 0)) && (
                              <button
                                onClick={() => handleDeleteItem(item)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition cursor-pointer"
                                title="ลบรายการพัสดุนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-teal-500 hover:text-teal-600 font-bold transition text-[11px]"
                            >
                              <span>{isEquipment ? 'ดูรหัสชิ้น/Asset' : 'ดูล็อต/วันหมดอายุ'}</span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded Sub-table for Pieces (Assets) or Lots */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
                          <td colSpan={5} className="p-4">
                            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-inner space-y-3">
                              {isEquipment ? (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                      <Tag className="w-3.5 h-3.5 text-teal-600" />
                                      รายการครุภัณฑ์รายชิ้น (Individual Assets)
                                    </h4>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {item.assets?.map((asset: any) => {
                                      const photoUrl = formatImageUrl(asset.imageUrl || item.imageUrl);
                                      const activeLog = asset.maintenanceLogs?.find((l: any) => l.status === 'UNDER_REPAIR') || asset.maintenanceLogs?.[0];
                                      return (
                                        <div
                                          key={asset.id}
                                          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 hover:bg-white dark:hover:bg-slate-800/80 hover:border-teal-300 dark:hover:border-teal-700 transition space-y-2.5 shadow-sm"
                                        >
                                          {/* Card Header: Dual-Code and Status */}
                                          <div className="flex items-start justify-between gap-2">
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-300">
                                                  {item.unit || 'ชิ้น'}ที่ {asset.sequenceNumber || 1}
                                                </span>
                                                <span className="font-mono font-black text-slate-900 dark:text-slate-100 text-xs tracking-wider">
                                                  {asset.assetCode}
                                                </span>
                                              </div>
                                              {asset.govAssetCode && (
                                                <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                                  <Tag className="w-3 h-3 text-slate-400" />
                                                  <span>เลขครุภัณฑ์: {asset.govAssetCode}</span>
                                                </div>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                              {asset.condition && (
                                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                                  asset.condition === 'GOOD' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40' :
                                                  asset.condition === 'FAIR' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40' :
                                                  'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40'
                                                }`}>
                                                  {asset.condition === 'GOOD' ? 'สมบูรณ์' : asset.condition === 'FAIR' ? 'สภาพพอใช้' : 'ชำรุด'}
                                                </span>
                                              )}
                                              {asset.status === 'AVAILABLE' && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                                                  พร้อมใช้
                                                </span>
                                              )}
                                              {asset.status === 'BORROWED' && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-300">
                                                  ถูกยืมอยู่
                                                </span>
                                              )}
                                              {asset.status === 'MAINTENANCE' && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300 flex items-center gap-1">
                                                  <Wrench className="w-3 h-3" />
                                                  กำลังซ่อมบำรุง
                                                </span>
                                              )}
                                              {asset.status === 'RETIRED' && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                                  จำหน่ายออก
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {/* Role-based Maintenance Banner / Details */}
                                          {asset.status === 'MAINTENANCE' && (
                                            !isStaff ? (
                                              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/60 text-rose-800 dark:text-rose-300 text-[11px] flex items-center gap-2">
                                                <Wrench className="w-4 h-4 text-rose-600 flex-shrink-0" />
                                                <span>อุปกรณ์ชิ้นนี้อยู่ระหว่างการซ่อมบำรุง ไม่สามารถเลือกยืมได้ชั่วคราว</span>
                                              </div>
                                            ) : (
                                              <div className="p-2.5 rounded-xl bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-slate-700 dark:text-slate-200 text-[11px] space-y-1">
                                                <div className="flex items-center justify-between text-rose-800 font-bold">
                                                  <span className="flex items-center gap-1">
                                                    <Wrench className="w-3.5 h-3.5 text-rose-600" />
                                                    ข้อมูลการส่งซ่อมบำรุง
                                                  </span>
                                                  <span className="text-[10px] text-slate-500 font-normal">
                                                    {activeLog?.sentDate ? new Date(activeLog.sentDate).toLocaleDateString('th-TH') : ''}
                                                  </span>
                                                </div>
                                                <div><strong className="text-slate-900">อาการชำรุด:</strong> {activeLog?.issue || asset.note || 'รอการตรวจสอบ'}</div>
                                                {activeLog?.repairShop && (
                                                  <div><strong className="text-slate-900">ส่งซ่อมที่:</strong> {activeLog.repairShop}</div>
                                                )}
                                                {activeLog?.repairCost && activeLog.repairCost > 0 ? (
                                                  <div><strong className="text-slate-900">ประมาณการค่าซ่อม:</strong> ฿{Number(activeLog.repairCost).toLocaleString('th-TH')} บาท</div>
                                                ) : null}
                                              </div>
                                            )
                                          )}

                                          {/* Asset Meta Details */}
                                          <div className="flex items-center gap-3 text-xs">
                                            {photoUrl ? (
                                              <img
                                                src={photoUrl}
                                                alt={item.name}
                                                className="w-14 h-14 rounded-lg object-cover border border-slate-200 flex-shrink-0 shadow-sm"
                                                onError={(e) => {
                                                  (e.target as HTMLElement).style.display = 'none';
                                                }}
                                              />
                                            ) : null}

                                            <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300 flex-1">
                                              <div className="flex items-center gap-1.5 font-medium">
                                                <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                                                <span className="truncate">
                                                  {asset.location || item.location || 'ห้องปฏิบัติการพยาบาล'}
                                                </span>
                                              </div>

                                              <div className="flex items-center gap-3 text-slate-500">
                                                {asset.receivedDate && (
                                                  <span className="flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(asset.receivedDate).toLocaleDateString('th-TH')}
                                                  </span>
                                                )}
                                                {asset.cost && asset.cost > 0 ? (
                                                  <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                                                    <Coins className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                    <span>฿{Number(asset.cost).toLocaleString('th-TH')} บาท</span>
                                                  </span>
                                                ) : null}
                                              </div>

                                              {(asset.brand || asset.model || item.brand || item.model) && (
                                                <div className="text-[11px] flex items-center gap-1.5 flex-wrap">
                                                  <span className="text-slate-400 dark:text-slate-500 text-[10px]">รุ่น/ยี่ห้อ:</span>
                                                  <span className="font-bold text-teal-700 dark:text-teal-400">
                                                    {[asset.brand || item.brand, asset.model || item.model].filter(Boolean).join(' - ')}
                                                  </span>
                                                </div>
                                              )}

                                              {asset.serialNumber && (
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                  SN: {asset.serialNumber}
                                                </div>
                                              )}

                                              {(asset.supplier || asset.warrantyExpiry) && (
                                                <div className="flex items-center gap-2.5 text-[10px] text-slate-500 dark:text-slate-400 flex-wrap">
                                                  {asset.supplier && (
                                                    <span className="flex items-center gap-1">
                                                      <Building2 className="w-3 h-3 text-slate-400" />
                                                      <span>{asset.supplier}</span>
                                                    </span>
                                                  )}
                                                  {asset.warrantyExpiry && (
                                                    <span className="flex items-center gap-1">
                                                      <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                                      <span>ประกันถึง {new Date(asset.warrantyExpiry).toLocaleDateString('th-TH')}</span>
                                                    </span>
                                                  )}
                                                </div>
                                              )}

                                              {asset.note && (
                                                <div className="text-[10px] text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2 py-1 rounded-lg border border-teal-200/60 dark:border-teal-900/40 flex items-start gap-1 mt-1">
                                                  <Info className="w-3 h-3 text-teal-600 dark:text-teal-400 flex-shrink-0 mt-0.5" />
                                                  <span className="leading-snug">{asset.note}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {/* Action Buttons */}
                                          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                              {/* Restore to Available (Staff only) */}
                                              {isStaff && asset.status === 'MAINTENANCE' && (
                                                <button
                                                  onClick={() => {
                                                    setCompleteTarget({ asset, itemName: item.name });
                                                    setCompleteForm({
                                                      technicianNote: 'ซ่อมแซมเสร็จสมบูรณ์ ทดสอบระบบใช้งานได้ปกติ คืนเข้าสต็อก',
                                                      repairCost: activeLog?.repairCost || 0,
                                                      repairShop: activeLog?.repairShop || '',
                                                    });
                                                  }}
                                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-sm transition cursor-pointer"
                                                >
                                                  <CheckCircle2 className="w-3 h-3" />
                                                  <span>ซ่อมเสร็จ / คืนสต็อก</span>
                                                </button>
                                              )}

                                              {/* Send to Repair (Staff only) */}
                                              {isStaff && asset.status === 'AVAILABLE' && (
                                                <button
                                                  onClick={() => {
                                                    setRepairTarget({ asset, itemName: item.name });
                                                    setRepairForm({
                                                      issue: '',
                                                      repairShop: 'ศูนย์ซ่อมบำรุงพัสดุ / ช่างประจำคณะ',
                                                      repairCost: 0,
                                                      technicianNote: '',
                                                    });
                                                  }}
                                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 text-[11px] font-bold transition border border-rose-200 dark:border-rose-800 cursor-pointer"
                                                >
                                                  <Wrench className="w-3 h-3" />
                                                  <span>ส่งซ่อม</span>
                                                </button>
                                              )}

                                              {/* View Repair History (Staff only) */}
                                              {isStaff && asset.maintenanceLogs && asset.maintenanceLogs.length > 0 && (
                                                <button
                                                  onClick={() => setHistoryTarget({ asset, itemName: item.name })}
                                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium transition cursor-pointer"
                                                >
                                                  <History className="w-3 h-3 text-slate-500" />
                                                  <span>ประวัติ ({asset.maintenanceLogs.length})</span>
                                                </button>
                                              )}

                                              {/* Edit Asset (Staff only) */}
                                              {isStaff && (
                                                <button
                                                  onClick={() => openEditAsset(asset, item.name)}
                                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-200 hover:text-teal-700 dark:hover:text-teal-300 text-[11px] font-medium transition border border-slate-200 dark:border-slate-700 hover:border-teal-300 dark:hover:border-teal-600 cursor-pointer"
                                                  title="แก้ไขข้อมูลชิ้นนี้ (เปลี่ยนที่อยู่, รหัส, Serial, ราคา, หมายเหตุ)"
                                                >
                                                  <Edit className="w-3 h-3 text-slate-500" />
                                                  <span>แก้ไข</span>
                                                </button>
                                              )}

                                              {/* Delete Asset (Staff only - if not currently borrowed) */}
                                              {isStaff && asset.status !== 'BORROWED' && (
                                                <button
                                                  onClick={() => handleDeleteAsset(asset, item.name)}
                                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 text-[11px] font-medium transition border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-700 cursor-pointer"
                                                  title="ลบชิ้นอุปกรณ์นี้ออกจากระบบ"
                                                >
                                                  <Trash2 className="w-3 h-3 text-slate-400" />
                                                  <span>ลบ</span>
                                                </button>
                                              )}
                                            </div>

                                            <button
                                              onClick={() =>
                                                setSelectedAssetForQr({
                                                  asset,
                                                  itemName: item.name,
                                                  itemUnit: item.unit,
                                                })
                                              }
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-xs font-bold transition border border-teal-200 dark:border-teal-800 cursor-pointer ml-auto"
                                            >
                                              <QrCode className="w-3.5 h-3.5" />
                                              <span>พิมพ์ป้าย QR Code</span>
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {(!item.assets || item.assets.length === 0) && (
                                      <p className="text-xs text-slate-400 col-span-2">
                                        ยังไม่มีการลงทะเบียนรหัส Asset สำหรับรายการนี้
                                      </p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      <Calendar className="w-3.5 h-3.5 text-teal-600" />
                                      ล็อตคงคลังและวันหมดอายุ (Stock Lots & Expiry Dates)
                                    </h4>
                                  </div>
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left">
                                      <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                          <th className="py-2">เลข Lot & ยี่ห้อ</th>
                                          <th className="py-2">จำนวนคงเหลือ (ห่อ/ชิ้นย่อย)</th>
                                          <th className="py-2">ราคาต้นทุน/หน่วย</th>
                                          <th className="py-2">วันหมดอายุ</th>
                                          <th className="py-2">ผู้จัดจำหน่าย</th>
                                          <th className="py-2 text-right">ป้าย QR</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                        {item.stockLots?.map((lot: any) => {
                                          const unitLabel = lot.packageUnit || item.unit || 'กล่อง';
                                          const nextBox =
                                            lot.boxes?.find((b: any) => b.status === 'IN_USE') ||
                                            lot.boxes?.find((b: any) => b.status === 'IN_STOCK');

                                          return (
                                            <tr key={lot.id}>
                                              <td className="py-2 font-mono font-bold text-teal-800 dark:text-teal-300">
                                                <div>{lot.lotNumber}</div>
                                                {lot.brand && (
                                                  <div className="font-sans text-[11px] font-semibold text-slate-600 dark:text-slate-400 mt-0.5 flex items-center gap-1">
                                                    <Tag className="w-3 h-3 text-teal-600" />
                                                    <span>ยี่ห้อ: {lot.brand}</span>
                                                  </div>
                                                )}
                                                {nextBox && (
                                                  <div className="mt-1">
                                                    <span className="font-sans text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.5 rounded-md inline-flex items-center gap-1">
                                                      👉 หยิบ{unitLabel} #{nextBox.boxNumberInYear} ({nextBox.boxCode})
                                                    </span>
                                                  </div>
                                                )}
                                              </td>
                                              <td className="py-2">
                                                <div className="flex items-baseline gap-1">
                                                  <span className="font-bold text-slate-900 dark:text-slate-100">
                                                    {lot.quantityRemaining}
                                                  </span>{' '}
                                                  <span className="text-slate-500 text-xs">{lot.packageUnit || item.unit}</span>
                                                </div>
                                                {(lot.packSize > 1 || (item.conversionRatio && item.conversionRatio > 1)) && (
                                                  <div className="text-[10px] text-teal-700 dark:text-teal-400 font-bold mt-0.5">
                                                    {lot.packSize || item.conversionRatio} {item.usageUnit || 'ชิ้น'}/{lot.packageUnit || item.unit}
                                                    {' '}• รวม {((lot.piecesRemaining ?? (lot.quantityRemaining * (lot.packSize || item.conversionRatio || 1)))).toLocaleString()} {item.usageUnit || 'ชิ้น'}
                                                  </div>
                                                )}
                                                {lot.openPackRemainder > 0 && (
                                                  <span className="mt-1 inline-block px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 font-bold text-[10px] border border-purple-200">
                                                    + เศษเปิด {lot.openPackRemainder} {item.usageUnit || 'ชิ้น'}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="py-2 text-slate-700 dark:text-slate-300">
                                                ฿{lot.unitCost.toFixed(2)} บาท
                                              </td>
                                              <td className="py-2">
                                                {lot.expiryDate ? (
                                                  <div>
                                                    <span className={`font-semibold ${
                                                      new Date(lot.expiryDate) < new Date() ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200'
                                                    }`}>
                                                      {new Date(lot.expiryDate).toLocaleDateString('th-TH')}
                                                    </span>
                                                    {new Date(lot.expiryDate) < new Date() && item.allowExpiredForSim !== false && (
                                                      <span className="block text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1 mt-0.5 w-max">
                                                        🧪 ใช้ฝึกกับหุ่นได้ (Sim-Lab)
                                                      </span>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <span className="text-slate-400">ไม่ระบุ</span>
                                                )}
                                              </td>
                                              <td className="py-2 text-slate-500">
                                                {lot.supplier || '-'}
                                              </td>
                                              <td className="py-2 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                  {lot.boxes && lot.boxes.length > 0 && (
                                                    <button
                                                      type="button"
                                                      onClick={() =>
                                                        setSelectedLotForBoxStickers({
                                                          item,
                                                          lot,
                                                          boxes: lot.boxes,
                                                        })
                                                      }
                                                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-[11px] font-bold shadow-sm transition cursor-pointer"
                                                      title="พิมพ์สติกเกอร์ประจำกล่อง/หน่วยย่อยของล็อตนี้"
                                                    >
                                                      <Box className="w-3.5 h-3.5" />
                                                      <span>สติกเกอร์ราย{unitLabel} ({lot.boxes.length})</span>
                                                    </button>
                                                  )}
                                                  <button
                                                    type="button"
                                                    onClick={() => setSelectedLotForQr({ lot, item })}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 text-[11px] font-bold transition border border-teal-200 dark:border-teal-800 cursor-pointer"
                                                    title="พิมพ์ป้ายสติกเกอร์ QR Code ประจำล็อตนี้"
                                                  >
                                                    <QrCode className="w-3.5 h-3.5" />
                                                    <span>ป้าย QR ล็อต</span>
                                                  </button>
                                                </div>
                                              </td>
                                            </tr>
                                          );
                                        })}
                                        {(!item.stockLots || item.stockLots.length === 0) && (
                                          <tr>
                                            <td colSpan={6} className="py-3 text-center text-slate-400">
                                              ไม่มีล็อตคงคลังที่มียอดเหลือ
                                            </td>
                                          </tr>
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination Controls */}
          {filteredItems.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-50/70 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <span>
                  แสดง {Math.min((currentPage - 1) * pageSize + 1, filteredItems.length)} - {Math.min(currentPage * pageSize, filteredItems.length)} จาก {filteredItems.length} รายการ
                </span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <div className="flex items-center gap-1.5">
                  <span>แสดงต่อหน้า:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                  >
                    <option value={20}>20</option>
                    <option value={35}>35</option>
                    <option value={50}>50</option>
                    <option value={9999}>ทั้งหมด ({filteredItems.length})</option>
                  </select>
                </div>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    ก่อนหน้า
                  </button>
                  <div className="flex items-center gap-1 px-1">
                    {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                      .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-slate-400">...</span>}
                          <button
                            type="button"
                            onClick={() => setCurrentPage(p)}
                            className={`min-w-[28px] h-7 px-2 rounded-lg font-bold transition text-xs cursor-pointer ${
                              currentPage === p
                                ? 'bg-teal-600 text-white shadow-sm'
                                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    ถัดไป
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Add New Item */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <PackagePlus className="w-5 h-5 text-teal-600" />
                เพิ่มพัสดุ / ครุภัณฑ์ใหม่
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ประเภทพัสดุ
                  </label>
                  <select
                    value={newItem.type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      const suggested = generateSuggestedItemCode(newType, newItem.categoryId, items);
                      setNewItem({
                        ...newItem,
                        type: newType,
                        code: suggested,
                        unit: newType === 'CONSUMABLE' ? 'กล่อง' : 'เครื่อง',
                      });
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="EQUIPMENT">ครุภัณฑ์คงทน (Equipment)</option>
                    <option value="CONSUMABLE">วัสดุสิ้นเปลือง (Consumable)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      รหัสพัสดุ (Item Code) *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const suggested = generateSuggestedItemCode(newItem.type, newItem.categoryId, items);
                        setNewItem({ ...newItem, code: suggested });
                      }}
                      className="text-[10px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 transition cursor-pointer"
                      title="กดเพื่อรันเลขรหัสถัดไปอัตโนมัติตามหมวดหมู่"
                    >
                      ⚡ รันรหัสอัตโนมัติ
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="เช่น CON-IV-005, CON-PPE-002"
                    value={newItem.code}
                    onChange={(e) =>
                      setNewItem({ ...newItem, code: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-teal-900 dark:text-teal-300 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    * ระบบสร้างรหัสให้อัตโนมัติตามหมวดหมู่ (แก้ไขเองได้)
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่ออุปกรณ์ / เวชภัณฑ์
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น หุ่นฝึกใส่สายสวนปัสสาวะ, เข็มฉีดยา เบอร์ 24"
                  value={newItem.name}
                  onChange={(e) =>
                    setNewItem({ ...newItem, name: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      หมวดหมู่พัสดุ <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenAddCategory}
                      className="text-[10px] text-teal-600 hover:text-teal-700 font-bold hover:underline cursor-pointer"
                    >
                      + เพิ่มหมวดหมู่ใหม่
                    </button>
                  </div>
                  <select
                    value={newItem.categoryId}
                    required
                    onChange={(e) => {
                      const newCatId = e.target.value;
                      const suggested = newCatId ? generateSuggestedItemCode(newItem.type, newCatId, items) : '';
                      setNewItem({
                        ...newItem,
                        categoryId: newCatId,
                        code: suggested || newItem.code,
                      });
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">-- กรุณาเลือกหมวดหมู่ --</option>
                    {categories
                      .filter((c) => !c.type || c.type === newItem.type)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          📁 {c.code ? `[${c.code}] ` : ''}{c.name}
                        </option>
                      ))}
                    {/* Fallback to show remaining categories if any */}
                    {categories.some((c) => c.type && c.type !== newItem.type) && (
                      <optgroup label="หมวดหมู่อื่นๆ">
                        {categories
                          .filter((c) => c.type && c.type !== newItem.type)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              📁 {c.code ? `[${c.code}] ` : ''}{c.name}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {newItem.type === 'CONSUMABLE' ? 'หน่วยจัดซื้อ/คลังหลัก (Unit) *' : 'หน่วยนับ *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={newItem.type === 'CONSUMABLE' ? "เช่น กล่อง, ถุง, ห่อ, ขวด" : "เช่น ตัว, เครื่อง, ชิ้น"}
                    value={newItem.unit}
                    onChange={(e) =>
                      setNewItem({ ...newItem, unit: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ยี่ห้อ / ผู้ผลิต (Brand)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Laerdal, Amoul, 3M"
                    value={newItem.brand}
                    onChange={(e) =>
                      setNewItem({ ...newItem, brand: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    รุ่น / รหัสโมเดล (Model)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น AMM-P, Resusci Anne"
                    value={newItem.model}
                    onChange={(e) =>
                      setNewItem({ ...newItem, model: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {newItem.type === 'CONSUMABLE' && (
                <div className="p-3.5 bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60 rounded-2xl space-y-2.5">
                  <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                    <span>⚡ กำหนดหน่วยย่อยและการแปลงสต็อก (Unit of Measure)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        หน่วยย่อยใช้งานจริง (Usage Unit)
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น คู่, ชิ้น, แผ่น, ก้อน, กรัม"
                        value={newItem.usageUnit}
                        onChange={(e) => setNewItem({ ...newItem, usageUnit: e.target.value })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        อัตราส่วนแปลงหน่วย (1 {newItem.unit || 'หน่วยหลัก'} = ? {newItem.usageUnit || 'หน่วยย่อย'})
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="เช่น 100"
                        value={newItem.conversionRatio}
                        onChange={(e) => setNewItem({ ...newItem, conversionRatio: e.target.value === '' ? ('' as any) : Number(e.target.value) })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-teal-800 dark:text-teal-300 focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    * เช่น ถุงมือ 1 <b>{newItem.unit || 'กล่อง'}</b> มี <b>{newItem.conversionRatio || 50}</b> <b>{newItem.usageUnit || 'คู่'}</b> ช่วยให้เวลาเบิกแบ่งซองคำนวณจำนวนซองและตัดสต็อกได้ตรงความจริง
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    จุดแจ้งเตือนใกล้หมด (Min Alert)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="เช่น 5"
                    value={newItem.minStockAlert}
                    onChange={(e) =>
                      setNewItem({ ...newItem, minStockAlert: e.target.value === '' ? ('' as any) : Number(e.target.value) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    สถานที่จัดเก็บ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ตู้ A ชั้น 2, ตู้เย็นเวชภัณฑ์"
                    value={newItem.location}
                    onChange={(e) =>
                      setNewItem({ ...newItem, location: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Toggle การยืม และ อนุญาตใช้ฝึกหุ่น */}
              {editItemTarget?.type === 'EQUIPMENT' ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      อนุญาตให้ยืมออกนอกห้องปฏิบัติการ (Borrowable)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      หากปิดไว้ รายการนี้จะเป็นครุภัณฑ์ประจำห้อง (เช่น จอติดผนัง, เตียงไฟฟ้า) และจะไม่แสดงให้เลือกในใบขอยืม
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editItemForm.isBorrowable !== false}
                      onChange={(e) => setEditItemForm({ ...editItemForm, isBorrowable: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                      🧪 อนุญาตให้นำของหมดอายุไปฝึกกับหุ่นจำลอง (Sim-Lab Simulation)
                    </span>
                    <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                      เวชภัณฑ์ที่หมดอายุแล้วสามารถนำมาใช้ซ้ำฝึกหัตถการกับหุ่นทางการพยาบาลได้เพื่อประหยัดงบประมาณ
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editItemForm.allowExpiredForSim !== false}
                      onChange={(e) => setEditItemForm({ ...editItemForm, allowExpiredForSim: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  รายละเอียดเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  placeholder="สเปกอุปกรณ์ ขนาด หรือข้อควรระวัง"
                  value={newItem.description}
                  onChange={(e) =>
                    setNewItem({ ...newItem, description: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{submitting ? 'กำลังบันทึกข้อมูลพัสดุ...' : 'บันทึกรายการ'}</span>
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Send to Repair */}
      {repairTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                แจ้งชำรุด / ส่งซ่อมบำรุง
              </h3>
              <button
                onClick={() => setRepairTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div className="font-bold text-slate-800">{repairTarget.itemName}</div>
              <div className="font-mono text-teal-700 font-bold">
                รหัสแล็บ: {repairTarget.asset.assetCode}
              </div>
              {repairTarget.asset.govAssetCode && (
                <div className="font-mono text-slate-500 text-[11px]">
                  เลขครุภัณฑ์: {repairTarget.asset.govAssetCode}
                </div>
              )}
            </div>

            <form onSubmit={handleSendRepair} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  อาการชำรุด / สาเหตุที่ส่งซ่อม *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="เช่น หน้าจอไม่ติด, สายไฟชำรุด, แบตเตอรี่เสื่อมสภาพ, สัญญาณเตือนผิดปกติ"
                  value={repairForm.issue}
                  onChange={(e) => setRepairForm({ ...repairForm, issue: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ส่งซ่อมที่ / ช่างผู้รับผิดชอบ
                </label>
                <input
                  type="text"
                  value={repairForm.repairShop}
                  onChange={(e) => setRepairForm({ ...repairForm, repairShop: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ประมาณการค่าซ่อม (บาท)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={repairForm.repairCost}
                    onChange={(e) => setRepairForm({ ...repairForm, repairCost: Number(e.target.value) })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pl-7 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <span className="absolute left-2.5 top-2 text-slate-400 text-xs font-bold">฿</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หมายเหตุเพิ่มเติม (ถ้ามี)
                </label>
                <input
                  type="text"
                  placeholder="เช่น กำหนดส่งคืนโดยประมาณ 15 วันทำการ"
                  value={repairForm.technicianNote}
                  onChange={(e) => setRepairForm({ ...repairForm, technicianNote: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRepairTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={maintenanceSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{maintenanceSubmitting ? 'กำลังบันทึก...' : 'ยืนยันส่งซ่อมบำรุง'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Complete Repair & Restore to Stock */}
      {completeTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                บันทึกผลซ่อมเสร็จ & คืนสต็อกพร้อมใช้
              </h3>
              <button
                onClick={() => setCompleteTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="font-bold text-slate-800">{completeTarget.itemName}</div>
              <div className="font-mono text-teal-700 font-bold">
                รหัสแล็บ: {completeTarget.asset.assetCode}
              </div>
              {completeTarget.asset.govAssetCode && (
                <div className="font-mono text-slate-500 text-[11px]">
                  เลขครุภัณฑ์: {completeTarget.asset.govAssetCode}
                </div>
              )}
            </div>

            <form onSubmit={handleCompleteRepair} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ผลการซ่อมแซมและการทดสอบใช้งาน *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="เช่น เปลี่ยนอะไหล่ชุดแผงวงจรและแบตเตอรี่ใหม่ ทดสอบใช้งานผ่านเกณฑ์มาตรฐาน"
                  value={completeForm.technicianNote}
                  onChange={(e) => setCompleteForm({ ...completeForm, technicianNote: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ค่าใช้จ่ายจริง (บาท)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={completeForm.repairCost}
                      onChange={(e) => setCompleteForm({ ...completeForm, repairCost: Number(e.target.value) })}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 pl-7 text-xs font-bold text-emerald-700 dark:text-emerald-300 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <span className="absolute left-2.5 top-2 text-slate-400 text-xs font-bold">฿</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ร้าน/ศูนย์ที่ซ่อม
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น ช่างประจำคณะ / บจก. เมดิคอล"
                    value={completeForm.repairShop}
                    onChange={(e) => setCompleteForm({ ...completeForm, repairShop: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-[11px] leading-relaxed">
                * เมื่อกดยืนยัน อุปกรณ์ชิ้นนี้จะเปลี่ยนสถานะเป็น <strong>"พร้อมใช้ (AVAILABLE)"</strong> และนิสิต/อาจารย์จะสามารถเลือกยืมได้ทันที
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCompleteTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={maintenanceSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{maintenanceSubmitting ? 'กำลังบันทึก...' : 'คืนเข้าสต็อกพร้อมใช้'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Repair History */}
      {historyTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                ประวัติการซ่อมบำรุง
              </h3>
              <button
                onClick={() => setHistoryTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1 flex-shrink-0">
              <div className="font-bold text-slate-800">{historyTarget.itemName}</div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-teal-700 font-bold">
                  รหัสแล็บ: {historyTarget.asset.assetCode}
                </span>
                {historyTarget.asset.govAssetCode && (
                  <span className="font-mono text-slate-500 text-[11px]">
                    เลขครุภัณฑ์: {historyTarget.asset.govAssetCode}
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-y-auto space-y-3 pr-1 flex-1">
              {historyTarget.asset.maintenanceLogs?.map((log: any) => {
                const isCompleted = log.status === 'COMPLETED';
                return (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 space-y-2 text-xs shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isCompleted ? '✓ ซ่อมเสร็จสมบูรณ์' : '🔧 กำลังอยู่ระหว่างการซ่อม'}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        ส่งซ่อมเมื่อ {new Date(log.sentDate).toLocaleDateString('th-TH')}
                      </span>
                    </div>

                    <div>
                      <strong className="text-slate-800">อาการชำรุด:</strong> {log.issue}
                    </div>

                    {log.repairShop && (
                      <div className="text-slate-600 text-[11px]">
                        <strong>ผู้ซ่อม/ร้าน:</strong> {log.repairShop}
                      </div>
                    )}

                    {log.repairCost > 0 && (
                      <div className="text-emerald-700 font-bold text-[11px]">
                        <strong>ค่าใช้จ่าย:</strong> ฿{Number(log.repairCost).toLocaleString('th-TH')} บาท
                      </div>
                    )}

                    {log.technicianNote && (
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px]">
                        <strong>บันทึกผลการซ่อม:</strong> {log.technicianNote}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                      <span>ผู้บันทึก: {log.handledBy?.name || 'เจ้าหน้าที่ห้องปฏิบัติการ'}</span>
                      {log.completedDate && (
                        <span>เสร็จสิ้น: {new Date(log.completedDate).toLocaleDateString('th-TH')}</span>
                      )}
                    </div>
                  </div>
                );
              })}

              {(!historyTarget.asset.maintenanceLogs || historyTarget.asset.maintenanceLogs.length === 0) && (
                <div className="py-8 text-center text-xs text-slate-400">
                  ไม่มีประวัติการซ่อมบำรุงสำหรับชิ้นนี้
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 text-right flex-shrink-0">
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Individual Asset */}
      {editAssetTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Edit className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                แก้ไขข้อมูลชิ้นอุปกรณ์ / ครุภัณฑ์
              </h3>
              <button
                onClick={() => setEditAssetTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-0.5">
              <div className="font-bold text-slate-800">{editAssetTarget.itemName}</div>
              <div className="font-mono text-slate-500 text-[11px]">
                ID: {editAssetTarget.asset.id} | ลำดับที่: {editAssetTarget.asset.sequenceNumber}
              </div>
            </div>

            <form onSubmit={handleSaveAsset} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    รหัสประจำชิ้นในแล็บ (Lab Code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editAssetForm.assetCode}
                    onChange={(e) =>
                      setEditAssetForm({ ...editAssetForm, assetCode: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    เลขครุภัณฑ์ทางราชการ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 7440-001-0001/2569"
                    value={editAssetForm.govAssetCode}
                    onChange={(e) =>
                      setEditAssetForm({ ...editAssetForm, govAssetCode: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    สถานที่จัดเก็บเฉพาะชิ้น (ที่อยู่) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ตู้ฉุกเฉิน เสา C ห้อง Simulation Lab 1"
                    value={editAssetForm.location}
                    onChange={(e) =>
                      setEditAssetForm({ ...editAssetForm, location: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    placeholder="SN จากผู้ผลิต"
                    value={editAssetForm.serialNumber}
                    onChange={(e) =>
                      setEditAssetForm({ ...editAssetForm, serialNumber: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ยี่ห้อ / ผู้ผลิต (Brand)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Laerdal, Amoul, 3M"
                    value={editAssetForm.brand}
                    onChange={(e) =>
                      setEditAssetForm({ ...editAssetForm, brand: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    รุ่น / รหัสโมเดล (Model)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น AMM-P, Resusci Anne"
                    value={editAssetForm.model}
                    onChange={(e) =>
                      setEditAssetForm({ ...editAssetForm, model: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ผู้จัดจำหน่าย / บริษัทคู่ค้า (Supplier)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น บจก. นำทิศการแพทย์"
                    value={editAssetForm.supplier}
                    onChange={(e) =>
                      setEditAssetForm({ ...editAssetForm, supplier: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    วันสิ้นสุดการรับประกัน (Warranty Expiry)
                  </label>
                  <input
                    type="date"
                    value={editAssetForm.warrantyExpiry}
                    onChange={(e) =>
                      setEditAssetForm({ ...editAssetForm, warrantyExpiry: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    สถานะการใช้งาน
                  </label>
                  <select
                    value={editAssetForm.status}
                    onChange={(e) =>
                      setEditAssetForm({ ...editAssetForm, status: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="AVAILABLE">พร้อมใช้ (AVAILABLE)</option>
                    <option value="MAINTENANCE">ส่งซ่อมบำรุง (MAINTENANCE)</option>
                    <option value="BORROWED">ถูกยืมอยู่ (BORROWED)</option>
                    <option value="RETIRED">จำหน่ายออก / ปลดระวาง (RETIRED)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    สภาพอุปกรณ์
                  </label>
                  <select
                    value={editAssetForm.condition}
                    onChange={(e) =>
                      setEditAssetForm({ ...editAssetForm, condition: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="GOOD">ปกติ สมบูรณ์ (GOOD)</option>
                    <option value="FAIR">พอใช้ มีรอยการใช้งาน (FAIR)</option>
                    <option value="DAMAGED">ชำรุด รอซ่อม (DAMAGED)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ราคา / มูลค่าจัดซื้อ (บาท)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editAssetForm.cost}
                    onChange={(e) =>
                      setEditAssetForm({ ...editAssetForm, cost: Number(e.target.value) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    วันที่รับเข้า
                  </label>
                  <input
                    type="date"
                    value={editAssetForm.receivedDate}
                    onChange={(e) =>
                      setEditAssetForm({ ...editAssetForm, receivedDate: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ลิงก์รูปภาพครุภัณฑ์ (URL หรือ Google Drive)
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/file/d/..."
                  value={editAssetForm.imageUrl}
                  onChange={(e) =>
                    setEditAssetForm({ ...editAssetForm, imageUrl: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หมายเหตุเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  placeholder="รายละเอียดสภาพอุปกรณ์ หรือประวัติการย้ายสถานที่"
                  value={editAssetForm.note}
                  onChange={(e) =>
                    setEditAssetForm({ ...editAssetForm, note: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditAssetTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={assetSaving}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer"
                >
                  {assetSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขชิ้นอุปกรณ์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Item (Name, Code, Category, Unit, MinAlert, Description) */}
      {editItemTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto border border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                แก้ไขข้อมูลพัสดุ / ครุภัณฑ์หลัก
              </h3>
              <button
                onClick={() => setEditItemTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่ออุปกรณ์ / เวชภัณฑ์ *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น หุ่นฝึกกู้ชีพผู้ใหญ่พร้อมไฟ LED"
                  value={editItemForm.name}
                  onChange={(e) =>
                    setEditItemForm({ ...editItemForm, name: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    รหัสพัสดุ (Item Code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editItemForm.code}
                    onChange={(e) =>
                      setEditItemForm({ ...editItemForm, code: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      หมวดหมู่พัสดุ <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleOpenAddCategory}
                      className="text-[10px] text-teal-600 hover:text-teal-700 font-bold hover:underline cursor-pointer"
                    >
                      + เพิ่มหมวดหมู่ใหม่
                    </button>
                  </div>
                  <select
                    value={editItemForm.categoryId}
                    required
                    onChange={(e) =>
                      setEditItemForm({ ...editItemForm, categoryId: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="">-- กรุณาเลือกหมวดหมู่ --</option>
                    {categories
                      .filter((c) => !c.type || c.type === editItemTarget?.type)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          📁 {c.code ? `[${c.code}] ` : ''}{c.name}
                        </option>
                      ))}
                    {categories.some((c) => c.type && c.type !== editItemTarget?.type) && (
                      <optgroup label="หมวดหมู่อื่นๆ">
                        {categories
                          .filter((c) => c.type && c.type !== editItemTarget?.type)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              📁 {c.code ? `[${c.code}] ` : ''}{c.name}
                            </option>
                          ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {editItemTarget?.type === 'CONSUMABLE' ? 'หน่วยจัดซื้อ/คลังหลัก (เช่น กล่อง, ถุง, ห่อ) *' : 'หน่วยนับ *'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น เครื่อง, ชิ้น, ใบ, กล่อง"
                    value={editItemForm.unit}
                    onChange={(e) =>
                      setEditItemForm({ ...editItemForm, unit: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    จุดแจ้งเตือนขั้นต่ำ (Min Alert)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editItemForm.minStockAlert}
                    onChange={(e) =>
                      setEditItemForm({ ...editItemForm, minStockAlert: Number(e.target.value) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ยี่ห้อ / ผู้ผลิต (Brand)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น Laerdal, Amoul, 3M"
                    value={editItemForm.brand}
                    onChange={(e) =>
                      setEditItemForm({ ...editItemForm, brand: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    รุ่น / รหัสโมเดล (Model)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น AMM-P, Resusci Anne"
                    value={editItemForm.model}
                    onChange={(e) =>
                      setEditItemForm({ ...editItemForm, model: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* ส่วนกำหนดและแก้ไขหน่วยย่อย สำหรับวัสดุสิ้นเปลือง */}
              {editItemTarget?.type === 'CONSUMABLE' && (
                <div className="p-3.5 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-2xl space-y-2.5">
                  <div className="text-xs font-bold text-teal-900 flex items-center justify-between">
                    <span>⚡ กำหนดหน่วยย่อยและการแปลงสต็อก (เช่น 1 กล่อง = กี่คู่)</span>
                    <span className="text-[10px] text-teal-700 dark:text-teal-300 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                      ใช้คำนวณอัตโนมัติเวลาแบ่งบรรจุ
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        หน่วยย่อยใช้งานจริง
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น คู่, ชิ้น, แผ่น, ก้อน, กรัม"
                        value={editItemForm.usageUnit}
                        onChange={(e) => setEditItemForm({ ...editItemForm, usageUnit: e.target.value })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                        1 {editItemForm.unit || 'หน่วยหลัก'} มีกี่ {editItemForm.usageUnit || 'หน่วยย่อย'} ?
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="เช่น 100 (1 กล่อง = 100 คู่)"
                        value={editItemForm.conversionRatio}
                        onChange={(e) => setEditItemForm({ ...editItemForm, conversionRatio: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-black text-center text-teal-800 dark:text-teal-300 focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-teal-800 dark:text-teal-200 bg-teal-100/60 dark:bg-teal-950/50 p-2 rounded-xl">
                    💡 ตัวอย่าง: ถุงมือ 1 <b>{editItemForm.unit || 'กล่อง'}</b> มี <b>{editItemForm.conversionRatio || 100}</b> <b>{editItemForm.usageUnit || 'คู่'}</b>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  สถานที่จัดเก็บหลัก
                </label>
                <input
                  type="text"
                  placeholder="เช่น ห้อง Simulation Lab 2, ตู้เวชภัณฑ์ A"
                  value={editItemForm.location}
                  onChange={(e) =>
                    setEditItemForm({ ...editItemForm, location: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Toggle การยืม และ อนุญาตใช้ฝึกหุ่น */}
              {editItemTarget?.type === 'EQUIPMENT' ? (
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      อนุญาตให้ยืมออกนอกห้องปฏิบัติการ (Borrowable)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      หากปิดไว้ รายการนี้จะเป็นครุภัณฑ์ประจำห้อง (เช่น จอติดผนัง, เตียงไฟฟ้า) และจะไม่แสดงให้เลือกในใบขอยืม
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editItemForm.isBorrowable !== false}
                      onChange={(e) => setEditItemForm({ ...editItemForm, isBorrowable: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
                  </label>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/60 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-amber-900 dark:text-amber-200 block">
                      🧪 อนุญาตให้นำของหมดอายุไปฝึกกับหุ่นจำลอง (Sim-Lab Simulation)
                    </span>
                    <span className="text-[11px] text-amber-800/80 dark:text-amber-300/80">
                      เวชภัณฑ์ที่หมดอายุแล้วสามารถนำมาใช้ซ้ำฝึกหัตถการกับหุ่นทางการพยาบาลได้เพื่อประหยัดงบประมาณ
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editItemForm.allowExpiredForSim !== false}
                      onChange={(e) => setEditItemForm({ ...editItemForm, allowExpiredForSim: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600"></div>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  รายละเอียดเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  placeholder="สเปกอุปกรณ์ หรือข้อควรระวังในการใช้งาน"
                  value={editItemForm.description}
                  onChange={(e) =>
                    setEditItemForm({ ...editItemForm, description: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditItemTarget(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={itemSaving}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5">
                    {itemSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>{itemSaving ? 'กำลังบันทึกการแก้ไข...' : 'บันทึกการแก้ไขพัสดุ'}</span>
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: QR Code and Sticker Print */}
      {selectedAssetForQr && (
        <AssetQrModal
          asset={selectedAssetForQr.asset}
          itemName={selectedAssetForQr.itemName}
          itemUnit={selectedAssetForQr.itemUnit}
          onClose={() => setSelectedAssetForQr(null)}
        />
      )}

      {/* Modal: Consumable Lot QR Sticker Print */}
      {selectedLotForQr && (
        <ConsumableQrModal
          item={selectedLotForQr.item}
          lot={selectedLotForQr.lot}
          onClose={() => setSelectedLotForQr(null)}
        />
      )}

      {/* Modal: Box-Level Stickers Print */}
      {selectedLotForBoxStickers && (
        <BoxStickerModal
          item={selectedLotForBoxStickers.item}
          lot={selectedLotForBoxStickers.lot}
          boxes={selectedLotForBoxStickers.boxes}
          onClose={() => setSelectedLotForBoxStickers(null)}
        />
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    นำเข้าพัสดุและครุภัณฑ์คงทนจากไฟล์ Excel / CSV
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    นำเข้ารายการวัสดุสิ้นเปลืองพร้อมล็อต หรือครุภัณฑ์คงทนพร้อมรหัสแล็บและเลขครุภัณฑ์ราชการ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 overflow-y-auto flex-1">
              {/* Step 1: Download Template */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    ดาวน์โหลดแบบฟอร์ม Excel (แยกตามประเภทพัสดุ)
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    กรุณาเลือกดาวน์โหลดแบบฟอร์มให้ตรงกับประเภท เพื่อให้มีคอลัมน์เฉพาะที่ถูกต้องครบถ้วน:
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {/* ปุ่มแบบฟอร์มวัสดุสิ้นเปลือง / เวชภัณฑ์ */}
                  <button
                    type="button"
                    onClick={handleDownloadConsumablesTemplate}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100/80 dark:hover:bg-emerald-900/40 transition text-left cursor-pointer group shadow-xs"
                  >
                    <div className="p-2 rounded-lg bg-emerald-600 text-white flex-shrink-0 group-hover:scale-105 transition">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-950 dark:text-emerald-200 flex items-center gap-1">
                        แบบฟอร์มวัสดุสิ้นเปลือง / เวชภัณฑ์
                      </div>
                      <p className="text-[10px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5 leading-tight">
                        รองรับระบุจำนวนย่อยต่อแพ็ค (เช่น 100 เล่ม/กล่อง), ล็อต และวันหมดอายุ
                      </p>
                    </div>
                  </button>

                  {/* ปุ่มแบบฟอร์มครุภัณฑ์ / เครื่องมือ */}
                  <button
                    type="button"
                    onClick={handleDownloadEquipmentTemplate}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 hover:bg-purple-100/80 dark:hover:bg-purple-900/40 transition text-left cursor-pointer group shadow-xs"
                  >
                    <div className="p-2 rounded-lg bg-purple-600 text-white flex-shrink-0 group-hover:scale-105 transition">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-purple-950 dark:text-purple-200 flex items-center gap-1">
                        แบบฟอร์มครุภัณฑ์ / เครื่องมือ
                      </div>
                      <p className="text-[10px] text-purple-800/80 dark:text-purple-300/80 mt-0.5 leading-tight">
                        รองรับระบุเลขครุภัณฑ์ราชการ, รหัสแล็บ, ยี่ห้อ, รุ่น, วันหมดประกัน
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Step 2: Upload File */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                  เลือกไฟล์ที่กรอกข้อมูลแล้ว (.xlsx, .xls, .csv)
                </div>

                <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 rounded-2xl p-6 text-center transition bg-white dark:bg-slate-950">
                  <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <label className="cursor-pointer">
                    <span className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-sm inline-block transition">
                      เลือกไฟล์จากคอมพิวเตอร์
                    </span>
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <p className="text-[11px] text-slate-400 mt-2">
                    {bulkFile ? `ไฟล์ที่เลือก: ${bulkFile.name}` : 'รองรับไฟล์ Excel และ CSV'}
                  </p>
                </div>
              </div>

              {/* Preview Box */}
              {previewData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>ตัวอย่างข้อมูลที่จะนำเข้า ({previewData.length} แถว)</span>
                    <span className="text-[11px] text-teal-600 font-medium">แสดง 5 แถวแรก</span>
                  </div>
                  <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl max-h-48">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold sticky top-0">
                        <tr>
                          {Object.keys(previewData[0] || {}).map((col) => (
                            <th key={col} className="p-2 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {previewData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            {Object.keys(previewData[0] || {}).map((col) => (
                              <td key={col} className="p-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
                                {String(row[col] ?? '-')}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Result Summary */}
              {bulkResult && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                  <div className="text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> นำเข้าข้อมูลเรียบร้อยแล้ว
                  </div>
                  <p className="text-xs">
                    รายการใหม่: <b>{bulkResult.itemsCreated}</b> รายการ | อัปเดต: <b>{bulkResult.itemsUpdated}</b> รายการ
                  </p>
                  <p className="text-xs text-emerald-800">
                    ครุภัณฑ์รายชิ้น (Assets) ที่สร้าง: <b>{bulkResult.assetsCreated}</b> ชิ้น | สต็อกล็อต (Lots) ที่สร้าง: <b>{bulkResult.lotsCreated}</b> ล็อต
                  </p>
                  {bulkResult.errors && bulkResult.errors.length > 0 && (
                    <div className="mt-2 text-[11px] text-rose-700 bg-rose-50 p-2 rounded-lg border border-rose-200">
                      <b>พบข้อผิดพลาดบางรายการ:</b>
                      <ul className="list-disc pl-4 mt-0.5 space-y-0.5">
                        {bulkResult.errors.map((e, idx) => (
                          <li key={idx}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
              {previewData.length > 0 && (
                <button
                  type="button"
                  disabled={bulkSubmitting}
                  onClick={handleBulkSubmit}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition disabled:opacity-50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{bulkSubmitting ? 'กำลังนำเข้าข้อมูล...' : `ยืนยันนำเข้า ${previewData.length} รายการ`}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CATEGORY MANAGEMENT (เพิ่ม, แก้ไข, ลบ หมวดหมู่พัสดุ) */}
      {/* ========================================================================= */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                  <Folder className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    จัดการหมวดหมู่พัสดุและครุภัณฑ์ (Categories)
                  </h3>
                  <p className="text-xs text-slate-500">
                    เพิ่มหมวดหมู่ใหม่ แก้ไขชื่อ หรือลบหมวดหมู่ที่ไม่ได้ใช้งาน
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form to Add / Edit Category */}
            <form onSubmit={handleSaveCategory} className="p-4 bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/60 rounded-2xl space-y-3">
              <div className="text-xs font-bold text-teal-900 flex items-center justify-between">
                <span>{isEditingCategory ? '✏️ กำลังแก้ไขหมวดหมู่' : '➕ เพิ่มหมวดหมู่ใหม่'}</span>
                {isEditingCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryForm({ id: '', code: '', name: '', type: 'CONSUMABLE', description: '' });
                      setIsEditingCategory(false);
                    }}
                    className="text-[11px] text-teal-700 hover:underline"
                  >
                    ยกเลิกการแก้ไข (สร้างใหม่)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    รหัสหมวดหมู่ (Code) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="เช่น IV, PPE, WD"
                    value={categoryForm.code}
                    onChange={(e) =>
                      setCategoryForm({
                        ...categoryForm,
                        code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''),
                      })
                    }
                    className="w-full font-mono uppercase bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-teal-700 dark:text-teal-400 focus:ring-2 focus:ring-teal-500"
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                    เช่น IV, WD (ใช้นำหน้ารหัสพัสดุ)
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ชื่อหมวดหมู่ *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น เวชภัณฑ์ฉีดและให้สารน้ำ, อุปกรณ์ทำแผล"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ประเภทการใช้งาน *
                  </label>
                  <select
                    value={categoryForm.type}
                    onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="CONSUMABLE">วัสดุสิ้นเปลือง</option>
                    <option value="EQUIPMENT">ครุภัณฑ์คงทน</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="submit"
                  disabled={categorySubmitting}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer disabled:opacity-50"
                >
                  {categorySubmitting ? 'กำลังบันทึก...' : isEditingCategory ? 'บันทึกการแก้ไข' : '+ เพิ่มหมวดหมู่นี้'}
                </button>
              </div>
            </form>

            {/* List of Existing Categories */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              <div className="text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>รายการหมวดหมู่ที่มีอยู่ในระบบทั้งหมด ({categories.length} หมวด)</span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3.5 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition flex items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center gap-2">
                        {cat.code && (
                          <span className="font-mono text-[11px] font-black px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                            [{cat.code}]
                          </span>
                        )}
                        <span>{cat.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            cat.type === 'EQUIPMENT'
                              ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800'
                              : 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800'
                          }`}
                        >
                          {cat.type === 'EQUIPMENT' ? 'ครุภัณฑ์คงทน' : 'วัสดุสิ้นเปลือง'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        มีพัสดุในหมวดนี้: <b>{cat._count?.items ?? items.filter((i) => i.categoryId === cat.id).length}</b> รายการ
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleEditCategory(cat)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-teal-600 hover:border-teal-300 hover:bg-teal-50 transition cursor-pointer"
                        title="แก้ไขชื่อหมวดหมู่"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50 transition cursor-pointer"
                        title="ลบหมวดหมู่นี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-right">
              <button
                onClick={() => setShowCategoryModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Modal: ตรวจนับสต็อกประจำงวด (Cycle Count & Reconciliation) */}
      {showCycleCountModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                    ตรวจนับสต็อกประจำงวดและปรับยอดกระทบยอด (Cycle Count & Reconciliation)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    นับจำนวนคงเหลือจริงหน้างาน ตรวจสอบผลต่าง และปรับยอดคงคลังอัตโนมัติพร้อมบันทึกประวัติการตรวจสอบ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCycleCountModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-4 overflow-y-auto flex-1">
              {/* เลือกรายการพัสดุ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  เลือกรายการพัสดุที่ต้องการตรวจนับ
                </label>
                <select
                  value={cycleCountItem?.id || ''}
                  onChange={(e) => handleSelectCycleItem(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500"
                >
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      [{it.code}] {it.name} ({it.type === 'EQUIPMENT' ? 'ครุภัณฑ์' : 'วัสดุสิ้นเปลือง'}) - คงเหลือระบบ {it.currentStock} {it.unit}
                    </option>
                  ))}
                </select>
              </div>

              {cycleCountItem && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {cycleCountItem.name} [{cycleCountItem.code}]
                    </span>
                    <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded-md">
                      หน่วยนับ: {cycleCountItem.unit}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    ที่เก็บหลัก: {cycleCountItem.location || 'ห้องปฏิบัติการพยาบาล'} | หมวดหมู่: {cycleCountItem.category?.name || 'ทั่วไป'}
                  </div>
                </div>
              )}

              {/* รายการล็อตคงคลัง */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-indigo-600" />
                    <span>ตารางนับยอดจริงเทียบยอดระบบรายล็อต</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    * กรอกจำนวนที่นับได้จริงในแต่ละล็อต ระบบจะคำนวณผลต่างให้อัตโนมัติ
                  </span>
                </div>

                {cycleCountItem?.stockLots && cycleCountItem.stockLots.length > 0 ? (
                  <div className="space-y-2.5">
                    {cycleCountItem.stockLots.map((lot: any) => {
                      const sysQty = lot.quantityRemaining;
                      const physical = cycleCounts[lot.id] !== undefined ? cycleCounts[lot.id] : sysQty;
                      const diff = physical - sysQty;

                      return (
                        <div
                          key={lot.id}
                          className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 space-y-2"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-teal-700 dark:text-teal-400">
                                  Lot: {lot.lotNumber}
                                </span>
                                {lot.expiryDate && (
                                  <span className="text-[10px] text-slate-500">
                                    (หมดอายุ: {new Date(lot.expiryDate).toLocaleDateString('th-TH')})
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                ยอดในระบบ: <strong className="text-slate-800 dark:text-slate-200">{sysQty}</strong> {cycleCountItem.unit}
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                  นับได้จริง ({cycleCountItem.unit})
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={physical}
                                  onChange={(e) =>
                                    setCycleCounts((prev) => ({
                                      ...prev,
                                      [lot.id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                                    }))
                                  }
                                  className="w-24 text-center font-bold text-xs bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2 py-1 focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>

                              <div className="min-w-[70px] text-center">
                                <div className="text-[10px] text-slate-400 mb-0.5">ผลต่าง</div>
                                {diff === 0 ? (
                                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                                    ตรง (0)
                                  </span>
                                ) : diff > 0 ? (
                                  <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                                    เกิน (+{diff})
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                                    ขาด ({diff})
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {diff !== 0 && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60">
                              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                                ระบุเหตุผลการปรับปรุงยอดผลต่าง:
                              </label>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {['ตรวจนับสต็อกประจำงวด', 'พบชำรุดตัดยอดทิ้ง', 'ของเกินรับเข้าคลัง', 'หมดอายุใช้งาน'].map((r) => (
                                  <button
                                    key={r}
                                    type="button"
                                    onClick={() =>
                                      setCycleCountReasons((prev) => ({ ...prev, [lot.id]: r }))
                                    }
                                    className={`text-[10px] px-2 py-0.5 rounded-md border transition ${
                                      cycleCountReasons[lot.id] === r
                                        ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-bold'
                                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                                  >
                                    {r}
                                  </button>
                                ))}
                                <input
                                  type="text"
                                  placeholder="หรือพิมพ์เหตุผลอื่น..."
                                  value={cycleCountReasons[lot.id] || ''}
                                  onChange={(e) =>
                                    setCycleCountReasons((prev) => ({
                                      ...prev,
                                      [lot.id]: e.target.value,
                                    }))
                                  }
                                  className="flex-1 min-w-[150px] text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-md px-2 py-0.5"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-800 rounded-xl">
                    {cycleCountItem?.type === 'EQUIPMENT'
                      ? 'สำหรับครุภัณฑ์คงทน สามารถตรวจสอบสถานะรายชิ้นได้ที่แถบรายการด้านล่าง'
                      : 'ไม่พบล็อตคงคลังสำหรับรายการนี้'}
                  </div>
                )}
              </div>

              {/* บันทึกหมายเหตุการตรวจนับ */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  หมายเหตุ / ผู้รับผิดชอบตรวจนับ
                </label>
                <input
                  type="text"
                  placeholder="เช่น กรรมการตรวจนับประจำปี 2569, จนท. สมชาย ร่วมกับ ผศ. ดร. ..."
                  value={cycleCountNote}
                  onChange={(e) => setCycleCountNote(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowCycleCountModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition cursor-pointer"
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleSaveReconcile}
                disabled={cycleCountSubmitting || !cycleCountItem?.stockLots || cycleCountItem.stockLots.length === 0}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition cursor-pointer disabled:opacity-50"
              >
                {cycleCountSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{cycleCountSubmitting ? 'กำลังปรับยอดสต็อก...' : 'ยืนยันและปรับปรุงยอดสต็อก (Reconcile)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

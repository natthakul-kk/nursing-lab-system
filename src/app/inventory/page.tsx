'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import AssetQrModal from '@/components/qrcode/AssetQrModal';
import { formatImageUrl } from '@/lib/image-helper';
import {
  Boxes,
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
  DollarSign,
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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { TableLoadingRow } from '@/components/common/LoadingSpinner';

export default function InventoryPage() {
  const { currentUser, isOfficer, isAdmin } = useAuth();
  const isStaff = isOfficer || isAdmin;

  const [items, setItems] = useState<any[]>([]);
  const [selectedAssetForQr, setSelectedAssetForQr] = useState<{ asset: any; itemName: string } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);

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
    location: '',
    description: '',
  });
  const [itemSaving, setItemSaving] = useState(false);

  const openEditAsset = (asset: any, itemName: string) => {
    setEditAssetTarget({ asset, itemName });
    setEditAssetForm({
      assetCode: asset.assetCode || '',
      govAssetCode: asset.govAssetCode || '',
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
      location: item.location || '',
      description: item.description || '',
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
    location: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/items');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/categories');
      if (res.ok) {
        const data = await res.json();
        setCategories(data);
        if (data.length > 0 && !newItem.categoryId) {
          setNewItem((prev) => ({ ...prev, categoryId: data[0].id }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchCategories();
  }, []);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.code || !newItem.name || !newItem.categoryId) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
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
          type: 'EQUIPMENT',
          categoryId: categories[0]?.id || '',
          unit: 'เครื่อง',
          usageUnit: '',
          conversionRatio: 1,
          minStockAlert: 5,
          location: '',
          description: '',
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

  const filteredItems = items.filter((item) => {
    const matchesType =
      filterType === 'ALL' || item.type === filterType;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const handleDownloadTemplate = () => {
    const sampleData = [
      {
        'ชื่อรายการ': 'เครื่องกระตุกหัวใจไฟฟ้า AED Trainer',
        'รหัสพัสดุ': 'EQ-AED-01',
        'ประเภท (EQUIPMENT/CONSUMABLE)': 'EQUIPMENT',
        'หมวดหมู่': 'อุปกรณ์ช่วยชีวิตและฉุกเฉิน',
        'หน่วยนับ': 'เครื่อง',
        'จำนวนรับเข้า': 2,
        'ราคาต่อหน่วย': 45000,
        'สถานที่จัดเก็บ': 'ห้องแล็บ 402 ตู้ฉุกเฉิน',
        'คำอธิบาย': 'เครื่องฝึกช่วยฟื้นคืนชีพ AED แบบมีเสียงแนะนำ',
        'รหัสแล็บ (ขึ้นต้น)': 'AED-2569-',
        'เลขครุภัณฑ์ราชการ': 'พย.69-02-0045, พย.69-02-0046',
      },
      {
        'ชื่อรายการ': 'ถุงมือตรวจโรคสเตอร์ไรด์ เบอร์ 7',
        'รหัสพัสดุ': 'CS-GLOVE-07',
        'ประเภท (EQUIPMENT/CONSUMABLE)': 'CONSUMABLE',
        'หมวดหมู่': 'เวชภัณฑ์ปลอดเชื้อ',
        'หน่วยนับ': 'กล่อง',
        'จำนวนรับเข้า': 50,
        'ราคาต่อหน่วย': 220,
        'สถานที่จัดเก็บ': 'ตู้เก็บเวชภัณฑ์ ชั้น 2',
        'คำอธิบาย': 'ถุงมือยางธรรมชาติชนิดมีแป้ง กล่องละ 50 คู่',
        'หมายเลขล็อต': 'LOT-2026-A1',
        'วันหมดอายุ (YYYY-MM-DD)': '2028-12-31',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(sampleData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'แบบฟอร์มนำเข้าพัสดุ');
    XLSX.writeFile(wb, 'Template_Items_and_Assets.xlsx');
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

        {isOfficer && (
          <div className="flex items-center gap-2.5">
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
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>เพิ่มรายการใหม่</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Type Tabs */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setFilterType('ALL')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition ${
              filterType === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ทั้งหมด ({items.length})
          </button>
          <button
            onClick={() => setFilterType('EQUIPMENT')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition ${
              filterType === 'EQUIPMENT'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            ครุภัณฑ์คงทน ({items.filter((i) => i.type === 'EQUIPMENT').length})
          </button>
          <button
            onClick={() => setFilterType('CONSUMABLE')}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition ${
              filterType === 'CONSUMABLE'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
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
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">รหัส / ชื่อพัสดุ</th>
                <th className="py-3.5 px-4">ประเภท / หมวดหมู่</th>
                <th className="py-3.5 px-4">สถานที่จัดเก็บ</th>
                <th className="py-3.5 px-4 text-center">คงเหลือ / สถานะ</th>
                <th className="py-3.5 px-4 text-right">รายละเอียด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <TableLoadingRow colSpan={5} message="กำลังโหลดรายการวัสดุ ครุภัณฑ์ และสต็อกยา..." />
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    ไม่พบรายการพัสดุที่ตรงกับเงื่อนไข
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isExpanded = expandedItemId === item.id;
                  const isEquipment = item.type === 'EQUIPMENT';

                  return (
                    <React.Fragment key={item.id}>
                      <tr className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 text-sm">{item.name}</div>
                          <div className="flex items-center flex-wrap gap-2 mt-0.5">
                            <span className="font-mono text-[11px] font-semibold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
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
                                    item.isLowStock ? 'text-rose-600' : 'text-slate-900'
                                  }`}
                                >
                                  {item.currentStock}
                                </span>
                                <span className="text-slate-500 text-xs">{item.unit}</span>
                              </div>
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
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={5} className="p-4">
                            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-inner space-y-3">
                              {isEquipment ? (
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                      <Tag className="w-3.5 h-3.5 text-teal-600" />
                                      รายการชิ้นครุภัณฑ์รายบุคคล (Individual Asset Codes)
                                    </h4>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {item.assets?.map((asset: any) => {
                                      const photoUrl = formatImageUrl(asset.imageUrl || item.imageUrl);
                                      const activeLog = asset.maintenanceLogs?.find((l: any) => l.status === 'UNDER_REPAIR') || asset.maintenanceLogs?.[0];
                                      return (
                                        <div
                                          key={asset.id}
                                          className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-teal-300 transition space-y-2.5 shadow-sm"
                                        >
                                          {/* Card Header: Dual-Code and Status */}
                                          <div className="flex items-start justify-between gap-2">
                                            <div>
                                              <div className="flex items-center gap-2">
                                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800">
                                                  เครื่อง/ชิ้นที่ {asset.sequenceNumber || 1}
                                                </span>
                                                <span className="font-mono font-black text-slate-900 text-xs tracking-wider">
                                                  {asset.assetCode}
                                                </span>
                                              </div>
                                              {asset.govAssetCode && (
                                                <div className="mt-1 flex items-center gap-1 font-mono text-[10px] text-slate-500 font-medium">
                                                  <Tag className="w-3 h-3 text-slate-400" />
                                                  <span>เลขครุภัณฑ์: {asset.govAssetCode}</span>
                                                </div>
                                              )}
                                            </div>

                                            <div>
                                              {asset.status === 'AVAILABLE' && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                                  พร้อมใช้
                                                </span>
                                              )}
                                              {asset.status === 'BORROWED' && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                                  ถูกยืมอยู่
                                                </span>
                                              )}
                                              {asset.status === 'MAINTENANCE' && (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1">
                                                  <Wrench className="w-3 h-3" />
                                                  กำลังซ่อมบำรุง
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {/* Role-based Maintenance Banner / Details */}
                                          {asset.status === 'MAINTENANCE' && (
                                            !isStaff ? (
                                              <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-[11px] flex items-center gap-2">
                                                <Wrench className="w-4 h-4 text-rose-600 flex-shrink-0" />
                                                <span>อุปกรณ์ชิ้นนี้อยู่ระหว่างการซ่อมบำรุง ไม่สามารถเลือกยืมได้ชั่วคราว</span>
                                              </div>
                                            ) : (
                                              <div className="p-2.5 rounded-xl bg-rose-50/80 border border-rose-200 text-slate-700 text-[11px] space-y-1">
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

                                            <div className="space-y-1 text-[11px] text-slate-600 flex-1">
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
                                                  <span className="font-bold text-emerald-700 flex items-center gap-0.5">
                                                    <DollarSign className="w-3 h-3" />
                                                    ฿{Number(asset.cost).toLocaleString('th-TH')}
                                                  </span>
                                                ) : null}
                                              </div>

                                              {asset.serialNumber && (
                                                <div className="text-[10px] text-slate-400 font-mono">
                                                  SN: {asset.serialNumber}
                                                </div>
                                              )}
                                            </div>
                                          </div>

                                          {/* Action Buttons */}
                                          <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2">
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
                                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-[11px] font-bold transition border border-rose-200 cursor-pointer"
                                                >
                                                  <Wrench className="w-3 h-3" />
                                                  <span>ส่งซ่อม</span>
                                                </button>
                                              )}

                                              {/* View Repair History (Staff only) */}
                                              {isStaff && asset.maintenanceLogs && asset.maintenanceLogs.length > 0 && (
                                                <button
                                                  onClick={() => setHistoryTarget({ asset, itemName: item.name })}
                                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition cursor-pointer"
                                                >
                                                  <History className="w-3 h-3 text-slate-500" />
                                                  <span>ประวัติ ({asset.maintenanceLogs.length})</span>
                                                </button>
                                              )}

                                              {/* Edit Asset (Staff only) */}
                                              {isStaff && (
                                                <button
                                                  onClick={() => openEditAsset(asset, item.name)}
                                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 text-[11px] font-medium transition border border-slate-200 hover:border-teal-300 cursor-pointer"
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
                                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-600 text-[11px] font-medium transition border border-slate-200 hover:border-rose-300 cursor-pointer"
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
                                                })
                                              }
                                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold transition border border-teal-200 cursor-pointer ml-auto"
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
                                      <thead className="text-[10px] uppercase text-slate-400 border-b border-slate-100">
                                        <tr>
                                          <th className="py-2">เลข Lot</th>
                                          <th className="py-2">จำนวนคงเหลือ</th>
                                          <th className="py-2">ราคาต้นทุน/หน่วย</th>
                                          <th className="py-2">วันหมดอายุ</th>
                                          <th className="py-2">ผู้จัดจำหน่าย</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 font-medium">
                                        {item.stockLots?.map((lot: any) => (
                                          <tr key={lot.id}>
                                            <td className="py-2 font-mono font-bold text-teal-800">
                                              {lot.lotNumber}
                                            </td>
                                            <td className="py-2">
                                              <span className="font-bold text-slate-900">
                                                {lot.quantityRemaining}
                                              </span>{' '}
                                              {item.unit}
                                            </td>
                                            <td className="py-2 text-slate-700">
                                              ฿{lot.unitCost.toFixed(2)}
                                            </td>
                                            <td className="py-2">
                                              {lot.expiryDate ? (
                                                <span className="text-slate-800">
                                                  {new Date(lot.expiryDate).toLocaleDateString('th-TH')}
                                                </span>
                                              ) : (
                                                <span className="text-slate-400">ไม่ระบุ</span>
                                              )}
                                            </td>
                                            <td className="py-2 text-slate-500">
                                              {lot.supplier || '-'}
                                            </td>
                                          </tr>
                                        ))}
                                        {(!item.stockLots || item.stockLots.length === 0) && (
                                          <tr>
                                            <td colSpan={5} className="py-3 text-center text-slate-400">
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
        </div>
      </div>

      {/* Modal: Add New Item */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ประเภทพัสดุ
                  </label>
                  <select
                    value={newItem.type}
                    onChange={(e) =>
                      setNewItem({ ...newItem, type: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="EQUIPMENT">ครุภัณฑ์คงทน (Equipment)</option>
                    <option value="CONSUMABLE">วัสดุสิ้นเปลือง (Consumable)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสพัสดุ (Item Code)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น EQ-MNK-003, CON-IV-005"
                    value={newItem.code}
                    onChange={(e) =>
                      setNewItem({ ...newItem, code: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หมวดหมู่
                  </label>
                  <select
                    value={newItem.categoryId}
                    onChange={(e) =>
                      setNewItem({ ...newItem, categoryId: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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

              {newItem.type === 'CONSUMABLE' && (
                <div className="p-3.5 bg-teal-50/50 border border-teal-200/80 rounded-2xl space-y-2.5">
                  <div className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
                    <span>⚡ กำหนดหน่วยย่อยและการแปลงสต็อก (Unit of Measure)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        หน่วยย่อยใช้งานจริง (Usage Unit)
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น คู่, ชิ้น, แผ่น, ก้อน, กรัม"
                        value={newItem.usageUnit}
                        onChange={(e) => setNewItem({ ...newItem, usageUnit: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        อัตราส่วนแปลงหน่วย (1 {newItem.unit || 'หน่วยหลัก'} = ? {newItem.usageUnit || 'หน่วยย่อย'})
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="เช่น 50 (1 กล่อง = 50 คู่)"
                        value={newItem.conversionRatio}
                        onChange={(e) => setNewItem({ ...newItem, conversionRatio: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-teal-800 focus:ring-2 focus:ring-teal-500"
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    จุดแจ้งเตือนใกล้หมด (Min Alert)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.minStockAlert}
                    onChange={(e) =>
                      setNewItem({ ...newItem, minStockAlert: Number(e.target.value) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Send to Repair */}
      {repairTarget && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-rose-600" />
                แจ้งชำรุด / ส่งซ่อมบำรุง
              </h3>
              <button
                onClick={() => setRepairTarget(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ประมาณการค่าซ่อม (บาท)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    value={repairForm.repairCost}
                    onChange={(e) => setRepairForm({ ...repairForm, repairCost: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pl-7 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                  <span className="absolute left-2.5 top-2 text-slate-400 text-xs font-bold">฿</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ค่าใช้จ่ายจริง (บาท)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={completeForm.repairCost}
                      onChange={(e) => setCompleteForm({ ...completeForm, repairCost: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pl-7 text-xs font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <span className="absolute left-2.5 top-2 text-slate-400 text-xs font-bold">฿</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-[11px] leading-relaxed">
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
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-shrink-0">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="w-4 h-4 text-teal-600" />
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
                    className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2 text-xs shadow-sm"
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
                      <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-slate-700 text-[11px]">
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
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition"
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-teal-600" />
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสประจำชิ้นในแล็บ (Lab Code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editAssetForm.assetCode}
                    onChange={(e) =>
                      setEditAssetForm({ ...editAssetForm, assetCode: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    เลขครุภัณฑ์ทางราชการ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น 7440-001-0001/2569"
                    value={editAssetForm.govAssetCode}
                    onChange={(e) =>
                      setEditAssetForm({ ...editAssetForm, govAssetCode: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    placeholder="SN จากผู้ผลิต"
                    value={editAssetForm.serialNumber}
                    onChange={(e) =>
                      setEditAssetForm({ ...editAssetForm, serialNumber: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileEdit className="w-5 h-5 text-teal-600" />
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
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หมวดหมู่
                  </label>
                  <select
                    value={editItemForm.categoryId}
                    onChange={(e) =>
                      setEditItemForm({ ...editItemForm, categoryId: e.target.value })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
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

              {/* ส่วนกำหนดและแก้ไขหน่วยย่อย สำหรับวัสดุสิ้นเปลือง */}
              {editItemTarget?.type === 'CONSUMABLE' && (
                <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-2.5">
                  <div className="text-xs font-bold text-teal-900 flex items-center justify-between">
                    <span>⚡ กำหนดหน่วยย่อยและการแปลงสต็อก (เช่น 1 กล่อง = กี่คู่)</span>
                    <span className="text-[10px] text-teal-700 bg-white px-2 py-0.5 rounded-full border border-teal-200">
                      ใช้คำนวณอัตโนมัติเวลาแบ่งบรรจุ
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        หน่วยย่อยใช้งานจริง
                      </label>
                      <input
                        type="text"
                        placeholder="เช่น คู่, ชิ้น, แผ่น, ก้อน, กรัม"
                        value={editItemForm.usageUnit}
                        onChange={(e) => setEditItemForm({ ...editItemForm, usageUnit: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        1 {editItemForm.unit || 'หน่วยหลัก'} มีกี่ {editItemForm.usageUnit || 'หน่วยย่อย'} ?
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="เช่น 100 (1 กล่อง = 100 คู่)"
                        value={editItemForm.conversionRatio}
                        onChange={(e) => setEditItemForm({ ...editItemForm, conversionRatio: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-black text-center text-teal-800 focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-teal-800 bg-teal-100/60 p-2 rounded-xl">
                    💡 ตัวอย่าง: ถุงมือ 1 <b>{editItemForm.unit || 'กล่อง'}</b> มี <b>{editItemForm.conversionRatio || 100}</b> <b>{editItemForm.usageUnit || 'คู่'}</b>
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                  {itemSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขพัสดุ'}
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
          onClose={() => setSelectedAssetForQr(null)}
        />
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    นำเข้าพัสดุและครุภัณฑ์คงทนจากไฟล์ Excel / CSV
                  </h3>
                  <p className="text-xs text-slate-500">
                    นำเข้ารายการวัสดุสิ้นเปลืองพร้อมล็อต หรือครุภัณฑ์คงทนพร้อมรหัสแล็บและเลขครุภัณฑ์ราชการ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 overflow-y-auto flex-1">
              {/* Step 1: Download Template */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">1</span>
                    ดาวน์โหลดแม่แบบไฟล์ Excel สำหรับนำเข้าพัสดุ
                  </div>
                  <p className="text-[11px] text-slate-500">
                    มีตัวอย่างทั้ง <b>ครุภัณฑ์คงทน (EQUIPMENT)</b> และ <b>วัสดุสิ้นเปลือง (CONSUMABLE)</b>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold shadow-sm transition flex-shrink-0 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-teal-600" />
                  <span>ดาวน์โหลด Template (.xlsx)</span>
                </button>
              </div>

              {/* Step 2: Upload File */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-teal-600 text-white text-[10px] flex items-center justify-center font-bold">2</span>
                  เลือกไฟล์ที่กรอกข้อมูลแล้ว (.xlsx, .xls, .csv)
                </div>

                <div className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-6 text-center transition bg-white">
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
                  <div className="overflow-x-auto border border-slate-200 rounded-xl max-h-48">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 text-slate-700 font-bold">
                        <tr>
                          {Object.keys(previewData[0] || {}).slice(0, 7).map((col) => (
                            <th key={col} className="p-2 whitespace-nowrap">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            {Object.keys(previewData[0] || {}).slice(0, 7).map((col) => (
                              <td key={col} className="p-2 whitespace-nowrap text-slate-600">
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

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 cursor-pointer"
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
    </div>
  );
}

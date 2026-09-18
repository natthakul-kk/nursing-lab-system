'use client';

import React from 'react';
import { Archive, X } from 'lucide-react';

interface CabinetFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEdit: boolean;
  cabinetForm: {
    code: string;
    name: string;
    type: string;
    roomId: string;
    floor: string;
    building: string;
    description: string;
  };
  setCabinetForm: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  rooms: any[];
}

export default function CabinetFormModal({
  isOpen,
  onClose,
  isEdit,
  cabinetForm,
  setCabinetForm,
  onSubmit,
  submitting,
  rooms,
}: CabinetFormModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/50">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Archive className="w-5 h-5 text-teal-600" />
            <span>{isEdit ? 'แก้ไขข้อมูลจุดจัดเก็บ' : 'เพิ่มตู้ / จุดจัดเก็บใหม่'}</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                รหัสตู้ / จุดจัดเก็บ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น CAB-01, SHELF-A"
                value={cabinetForm.code}
                onChange={(e) => setCabinetForm({ ...cabinetForm, code: e.target.value.toUpperCase() })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-mono font-bold focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ประเภทจุดจัดเก็บ
              </label>
              <select
                value={cabinetForm.type}
                onChange={(e) => setCabinetForm({ ...cabinetForm, type: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-teal-500"
              >
                <option value="CABINET">ตู้เก็บอุปกรณ์ (Cabinet)</option>
                <option value="SHELF">ชั้นวางของ (Shelf)</option>
                <option value="DRAWER">ลิ้นชัก (Drawer)</option>
                <option value="CART">รถเข็นหัตถการ (Cart/Trolley)</option>
                <option value="ROOM">ห้องเก็บของย่อย (Store Room)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              ชื่อตู้ / จุดจัดเก็บ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น ตู้เก็บเวชภัณฑ์ทำแผลและผ่าตัด, ชั้นวางสารน้ำ IV"
              value={cabinetForm.name}
              onChange={(e) => setCabinetForm({ ...cabinetForm, name: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              ติดตั้งประจำห้องปฏิบัติการ
            </label>
            <select
              value={cabinetForm.roomId}
              onChange={(e) => setCabinetForm({ ...cabinetForm, roomId: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs font-medium focus:ring-2 focus:ring-teal-500"
            >
              <option value="">-- ไม่ระบุห้อง (จุดจัดเก็บส่วนกลาง) --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.code} - {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ชั้นที่
              </label>
              <input
                type="text"
                value={cabinetForm.floor}
                onChange={(e) => setCabinetForm({ ...cabinetForm, floor: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                อาคาร
              </label>
              <input
                type="text"
                value={cabinetForm.building}
                onChange={(e) => setCabinetForm({ ...cabinetForm, building: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              คำอธิบายหรือคำแนะนำในการจัดเก็บ
            </label>
            <textarea
              rows={2}
              placeholder="เช่น เก็บเฉพาะอุปกรณ์ปลอดเชื้อ, ล็อคกุญแจตลอดเวลา..."
              value={cabinetForm.description}
              onChange={(e) => setCabinetForm({ ...cabinetForm, description: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-50 cursor-pointer"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition shadow-md shadow-teal-600/20 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'กำลังบันทึก...' : isEdit ? 'บันทึกการแก้ไข' : 'สร้างจุดจัดเก็บ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

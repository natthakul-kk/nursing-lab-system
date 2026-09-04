'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  CheckSquare,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  BookOpen,
  Calendar,
  AlertCircle,
  ShieldCheck,
  Check
} from 'lucide-react';

export default function ApprovalsPage() {
  const { currentUser, isApprover, isAdmin } = useAuth();
  const [borrowRequests, setBorrowRequests] = useState<any[]>([]);
  const [requisitionRequests, setRequisitionRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALL' | 'BORROW' | 'REQUISITION'>('ALL');

  // Reject Modal State
  const [rejectItem, setRejectItem] = useState<{ id: string; type: 'BORROW' | 'REQUISITION' } | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchPendingData = async () => {
    try {
      const [borrowRes, reqRes] = await Promise.all([
        fetch('/api/borrow'),
        fetch('/api/requisitions'),
      ]);

      if (borrowRes.ok) {
        const bData = await borrowRes.json();
        setBorrowRequests(bData.filter((r: any) => r.status === 'PENDING'));
      }
      if (reqRes.ok) {
        const rData = await reqRes.json();
        setRequisitionRequests(rData.filter((r: any) => r.status === 'PENDING'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingData();
  }, []);

  const handleApprove = async (id: string, type: 'BORROW' | 'REQUISITION') => {
    setSubmitting(true);
    try {
      const endpoint = type === 'BORROW' ? `/api/borrow/${id}` : `/api/requisitions/${id}`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'APPROVE',
          userId: currentUser?.id,
        }),
      });

      if (res.ok) {
        fetchPendingData();
      } else {
        alert('เกิดข้อผิดพลาดในการอนุมัติ');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectItem) return;
    setSubmitting(true);
    try {
      const endpoint =
        rejectItem.type === 'BORROW'
          ? `/api/borrow/${rejectItem.id}`
          : `/api/requisitions/${rejectItem.id}`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'REJECT',
          userId: currentUser?.id,
          reason: rejectionReason,
        }),
      });

      if (res.ok) {
        setRejectItem(null);
        setRejectionReason('');
        fetchPendingData();
      } else {
        alert('เกิดข้อผิดพลาด');
      }
    } catch (err) {
      alert('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isApprover && !isAdmin) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-amber-800">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-amber-600" />
        <h3 className="font-bold text-base">เฉพาะผู้อนุมัติหรือผู้บริหาร</h3>
        <p className="text-xs mt-1">
          กรุณาสลับบทบาทเป็น "ผู้อนุมัติ (Approver)" หรือ "ผู้ดูแลระบบ (Admin)" จากแถบด้านบนเพื่อพิจารณาคำขอ
        </p>
      </div>
    );
  }

  const totalPending = borrowRequests.length + requisitionRequests.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-teal-600" />
            ศูนย์พิจารณาและอนุมัติคำขอ (Approval Center)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            พิจารณาอนุมัติคำขอยืมครุภัณฑ์และการเบิกจ่ายวัสดุสิ้นเปลืองสำหรับการเรียนการสอนรายวิชา
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" /> รอการพิจารณาทั้งสิ้น {totalPending} รายการ
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center p-1 bg-slate-100 rounded-xl w-full sm:w-auto">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'ALL'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          ทั้งหมด ({totalPending})
        </button>
        <button
          onClick={() => setActiveTab('BORROW')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'BORROW'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          คำขอยืมครุภัณฑ์ ({borrowRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('REQUISITION')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === 'REQUISITION'
              ? 'bg-white text-teal-700 shadow-sm'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          คำขอเบิกวัสดุสิ้นเปลือง ({requisitionRequests.length})
        </button>
      </div>

      {/* Pending Items List */}
      <div className="space-y-4">
        {totalPending === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200/80 text-slate-400 text-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-75" />
            ยอดเยี่ยม! ไม่มีคำขอค้างรอการอนุมัติในขณะนี้
          </div>
        ) : (
          <>
            {/* Section: Borrows */}
            {(activeTab === 'ALL' || activeTab === 'BORROW') &&
              borrowRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 border-l-4 border-l-purple-500"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 uppercase">
                        ยืมครุภัณฑ์
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {req.requestNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium">{req.user?.name}</span>
                      </div>
                      {req.course && (
                        <div className="font-medium text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                          {req.course.code}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-xs space-y-2">
                    <div>
                      <span className="text-slate-400 font-bold">วัตถุประสงค์: </span>
                      <span className="text-slate-800 font-medium">{req.purpose}</span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-600">
                      <span>ยืม: {new Date(req.borrowDate).toLocaleDateString('th-TH')}</span>
                      <span>•</span>
                      <span>กำหนดคืน: {new Date(req.expectedReturnDate).toLocaleDateString('th-TH')}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-[11px] font-bold text-slate-500 mb-1.5">
                        ครุภัณฑ์ที่ขอ:
                      </div>
                      <div className="space-y-1">
                        {req.items?.map((it: any) => (
                          <div key={it.id} className="text-xs font-semibold text-slate-800">
                            • {it.item?.name} ({it.quantity} {it.item?.unit})
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      disabled={submitting}
                      onClick={() => setRejectItem({ id: req.id, type: 'BORROW' })}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                    >
                      ไม่อนุมัติ
                    </button>
                    <button
                      disabled={submitting}
                      onClick={() => handleApprove(req.id, 'BORROW')}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> อนุมัติคำขอยืม
                    </button>
                  </div>
                </div>
              ))}

            {/* Section: Requisitions */}
            {(activeTab === 'ALL' || activeTab === 'REQUISITION') &&
              requisitionRequests.map((req) => (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm space-y-4 border-l-4 border-l-teal-500"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 uppercase">
                        เบิกวัสดุสิ้นเปลือง
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800">
                        {req.requestNumber}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded">
                        [{req.course?.code}] {req.course?.name}
                      </span>
                      <span className="text-slate-500 font-medium">โดย {req.user?.name}</span>
                    </div>
                  </div>

                  <div className="text-xs space-y-2">
                    <div>
                      <span className="text-slate-400 font-bold">วัตถุประสงค์: </span>
                      <span className="text-slate-800 font-medium">{req.purpose}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-600">
                      <span>ต้องการใช้: {new Date(req.dateNeeded).toLocaleDateString('th-TH')}</span>
                      <span className="font-black text-emerald-700 text-sm">
                        ประมาณการต้นทุน: ฿{req.totalCost.toFixed(2)} บาท
                      </span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="text-[11px] font-bold text-slate-500 mb-1.5">
                        รายการวัสดุที่ขอเบิก:
                      </div>
                      <div className="space-y-1">
                        {req.items?.map((it: any) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between text-xs font-semibold text-slate-800"
                          >
                            <span>• {it.item?.name}</span>
                            <span>
                              {it.quantityRequested} {it.item?.unit} (~฿{it.totalCost.toFixed(2)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      disabled={submitting}
                      onClick={() => setRejectItem({ id: req.id, type: 'REQUISITION' })}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                    >
                      ไม่อนุมัติ
                    </button>
                    <button
                      disabled={submitting}
                      onClick={() => handleApprove(req.id, 'REQUISITION')}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 shadow-md shadow-teal-600/20 transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> อนุมัติการเบิกจ่าย
                    </button>
                  </div>
                </div>
              ))}
          </>
        )}
      </div>

      {/* Reject Modal */}
      {rejectItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              ระบุเหตุผลที่ไม่อนุมัติคำขอ
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                เหตุผลประกอบการพิจารณา
              </label>
              <textarea
                rows={3}
                required
                placeholder="เช่น จำนวนที่ขอเกินความจำเป็น, ติดการสอนคาบปฏิบัติการวิชาอื่น, งบประมาณคงเหลือไม่พอ"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setRejectItem(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleRejectSubmit}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition disabled:opacity-50"
              >
                {submitting ? 'กำลังบันทึก...' : 'ยืนยันไม่อนุมัติ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

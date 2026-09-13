'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  CheckCircle2,
  X,
  Stethoscope,
  Building2,
  Calendar,
  User,
  BookOpen,
  ArrowDownToLine,
  RefreshCw,
} from 'lucide-react';

interface PosReceiptModalProps {
  receipt: {
    receiptNumber: string;
    checkoutAt: string;
    user: {
      id: string;
      name: string;
      studentId?: string | null;
    };
    course?: {
      id: string;
      code: string;
      name: string;
    } | null;
    purpose: string;
    dispensedItems: {
      name: string;
      code?: string;
      quantity: number;
      unit: string;
      cost: number;
    }[];
    borrowedItems: {
      name: string;
      assetCode: string;
      unit: string;
      condition?: string;
    }[];
    totalCost: number;
  };
  onClose: () => void;
}

export default function PosReceiptModal({ receipt, onClose }: PosReceiptModalProps) {
  const [qrUrl, setQrUrl] = useState<string>('');

  useEffect(() => {
    async function genQr() {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const payload = `${origin}/verify/${encodeURIComponent(receipt.receiptNumber)}`;
        const url = await QRCode.toDataURL(payload, {
          width: 160,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        setQrUrl(url);
      } catch (err) {
        console.error('Failed to gen receipt QR', err);
      }
    }
    genQr();
  }, [receipt.receiptNumber]);

  const formattedDate = new Date(receipt.checkoutAt).toLocaleString('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  const handlePrint80mm = () => {
    const printWindow = window.open('', '_blank', 'width=450,height=650');
    if (!printWindow) return;

    const itemsHtml = receipt.dispensedItems
      .map(
        (it) => `
        <tr>
          <td style="padding: 2px 0;">
            <div style="font-weight: bold;">${it.name}</div>
            <div style="font-size: 10px; color: #64748b;">${it.code || ''}</div>
          </td>
          <td style="text-align: right; vertical-align: top; white-space: nowrap;">
            ${it.quantity} ${it.unit}
          </td>
          <td style="text-align: right; vertical-align: top; white-space: nowrap; font-weight: bold;">
            ฿${it.cost.toLocaleString('th-TH', { minimumFractionDigits: 1 })}
          </td>
        </tr>
      `
      )
      .join('');

    const borrowHtml =
      receipt.borrowedItems.length > 0
        ? `
        <div style="margin-top: 8px; border-top: 1px dashed #cbd5e1; padding-top: 6px;">
          <div style="font-size: 11px; font-weight: bold; color: #0e7490;">🩺 รายการยืมครุภัณฑ์คงทน (ต้องส่งคืน):</div>
          <table style="width: 100%; font-size: 11px; margin-top: 4px;">
            ${receipt.borrowedItems
              .map(
                (b) => `
              <tr>
                <td>${b.name}</td>
                <td style="text-align: right; font-family: monospace; font-weight: bold;">${b.assetCode}</td>
              </tr>
            `
              )
              .join('')}
          </table>
        </div>
      `
        : '';

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>สลิปเบิกจ่ายด่วน - ${receipt.receiptNumber}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, sans-serif;
              font-size: 11px;
              line-height: 1.35;
              color: #0f172a;
              width: 72mm;
              margin: 4mm auto;
              padding: 0;
              background: #fff;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 6px 0; }
            table { width: 100%; border-collapse: collapse; }
          </style>
        </head>
        <body>
          <div class="center">
            <div style="font-size: 13px; font-weight: bold;">ห้องปฏิบัติการพยาบาลศาสตร์</div>
            <div style="font-size: 11px;">คณะพยาบาลศาสตร์ มหาวิทยาลัย</div>
            <div style="font-size: 12px; font-weight: bold; margin-top: 4px;">ใบเบิกจ่ายพัสดุด่วน (Express POS)</div>
          </div>

          <div class="divider"></div>

          <div style="font-size: 10.5px;">
            <div>เลขที่: <b>${receipt.receiptNumber}</b></div>
            <div>วัน-เวลา: ${formattedDate} น.</div>
            <div>ผู้เบิก: <b>${receipt.user.name}</b> ${receipt.user.studentId ? `(${receipt.user.studentId})` : ''}</div>
            ${receipt.course ? `<div>วิชา: <b>[${receipt.course.code}] ${receipt.course.name}</b></div>` : ''}
            <div>วัตถุประสงค์: ${receipt.purpose}</div>
          </div>

          <div class="divider"></div>

          <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px;">รายการวัสดุสิ้นเปลือง:</div>
          <table>
            <thead>
              <tr style="border-bottom: 1px solid #cbd5e1; font-size: 10px;">
                <th style="text-align: left;">รายการ</th>
                <th style="text-align: right;">จำนวน</th>
                <th style="text-align: right;">มูลค่า</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          ${borrowHtml}

          <div class="divider"></div>

          <table style="font-size: 12px; font-weight: bold;">
            <tr>
              <td>มูลค่าต้นทุนรวม:</td>
              <td style="text-align: right; font-size: 13px;">฿${receipt.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท</td>
            </tr>
          </table>

          <div class="divider"></div>

          <div class="center" style="margin-top: 8px;">
            ${qrUrl ? `<img src="${qrUrl}" style="width: 80px; height: 80px; display: inline-block;" />` : ''}
            <div style="font-size: 9px; color: #64748b; margin-top: 2px;">สแกนตรวจสอบข้อมูลย้อนหลัง</div>
            <div style="font-size: 10px; margin-top: 4px;">* ใช้เป็นหลักฐานแนบโต๊ะฝึกหัตถการ *</div>
          </div>

          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 800);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                ทำรายการเบิกจ่ายสำเร็จ!
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {receipt.receiptNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Receipt Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 text-xs">
          {/* Metadata Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">วัน-เวลา:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{formattedDate} น.</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">ผู้เบิก:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">
                {receipt.user.name} {receipt.user.studentId ? `(${receipt.user.studentId})` : ''}
              </span>
            </div>
            {receipt.course && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">รายวิชา:</span>
                <span className="font-bold text-teal-700 dark:text-teal-400">
                  [{receipt.course.code}] {receipt.course.name}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-slate-500">วัตถุประสงค์:</span>
              <span className="text-slate-700 dark:text-slate-300">{receipt.purpose}</span>
            </div>
          </div>

          {/* Consumables Table */}
          {receipt.dispensedItems.length > 0 && (
            <div className="space-y-1.5">
              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between text-[11px]">
                <span>📦 วัสดุสิ้นเปลืองที่ตัดสต็อก ({receipt.dispensedItems.length} รายการ):</span>
                <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">
                  ฿{receipt.totalCost.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                    <tr>
                      <th className="p-2">รายการพัสดุ</th>
                      <th className="p-2 text-center">จำนวน</th>
                      <th className="p-2 text-right">ต้นทุน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {receipt.dispensedItems.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="p-2">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{it.name}</div>
                          {it.code && <div className="text-[10px] font-mono text-slate-400">{it.code}</div>}
                        </td>
                        <td className="p-2 text-center font-bold text-slate-900 dark:text-slate-100">
                          {it.quantity} {it.unit}
                        </td>
                        <td className="p-2 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                          ฿{it.cost.toLocaleString('th-TH', { minimumFractionDigits: 1 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Borrowed Equipment Table */}
          {receipt.borrowedItems.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <div className="font-bold text-cyan-900 dark:text-cyan-300 flex items-center gap-1.5 text-[11px]">
                <span>🩺 ครุภัณฑ์คงทนที่ยืมด่วน (ต้องส่งคืน):</span>
              </div>
              <div className="border border-cyan-200 dark:border-cyan-800/60 rounded-xl overflow-hidden bg-cyan-50/30 dark:bg-cyan-950/20">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-cyan-100/70 dark:bg-cyan-900/50 text-cyan-900 dark:text-cyan-200 font-bold">
                    <tr>
                      <th className="p-2">อุปกรณ์</th>
                      <th className="p-2 text-right">รหัสประจำชิ้น (Asset ID)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cyan-100 dark:divide-cyan-900/40">
                    {receipt.borrowedItems.map((b, idx) => (
                      <tr key={idx}>
                        <td className="p-2 font-bold text-slate-800 dark:text-slate-200">{b.name}</td>
                        <td className="p-2 text-right font-mono font-black text-cyan-800 dark:text-cyan-300">
                          {b.assetCode}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* QR Code Verification Preview */}
          <div className="p-3 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">หลักฐานดิจิทัล E-Receipt</div>
              <p className="text-[10px] text-slate-500">
                สามารถสแกนเพื่อตรวจสอบประวัติการเบิกจ่ายย้อนหลังได้ตลอดเวลา
              </p>
            </div>
            {qrUrl ? (
              <img src={qrUrl} alt="Receipt QR" className="w-14 h-14 rounded-lg border border-slate-200 bg-white p-0.5" />
            ) : (
              <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">
                QR...
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition cursor-pointer"
          >
            ปิด / เริ่มรายการใหม่
          </button>

          <button
            type="button"
            onClick={handlePrint80mm}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์สลิปใบเสร็จ (80mm)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

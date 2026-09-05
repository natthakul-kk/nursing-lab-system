'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { formatImageUrl } from '@/lib/image-helper';
import { QrCode, Printer, X, Tag, MapPin, Calendar, DollarSign, Image as ImageIcon } from 'lucide-react';

interface AssetQrModalProps {
  asset: {
    id: string;
    assetCode: string;
    govAssetCode?: string | null;
    sequenceNumber?: number | null;
    serialNumber?: string | null;
    location?: string | null;
    receivedDate?: string | Date | null;
    cost?: number | null;
    imageUrl?: string | null;
    status: string;
    item?: {
      name: string;
      code: string;
      unit: string;
    };
  };
  itemName?: string;
  onClose: () => void;
}

export default function AssetQrModal({ asset, itemName, onClose }: AssetQrModalProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const title = itemName || asset.item?.name || 'ครุภัณฑ์ห้องปฏิบัติการพยาบาล';

  useEffect(() => {
    async function generateQr() {
      try {
        // Direct URL payload encoded into QR code for camera scanning
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const qrPayload = `${origin}/asset/${encodeURIComponent(asset.assetCode)}`;

        const url = await QRCode.toDataURL(qrPayload, {
          width: 320,
          margin: 2,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });
        setQrDataUrl(url);
      } catch (err) {
        console.error('Failed to generate QR code', err);
      }
    }

    generateQr();
  }, [asset, title]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (!printWindow) {
      window.print();
      return;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>ป้าย QR Code - ${asset.assetCode}</title>
          <style>
            @page { size: auto; margin: 10mm; }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 90vh;
              margin: 0;
            }
            .label-card {
              border: 2px dashed #0d9488;
              border-radius: 16px;
              padding: 24px;
              width: 360px;
              text-align: center;
              background: #fff;
              box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            }
            .header-org {
              font-size: 11px;
              font-weight: bold;
              color: #0d9488;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin-bottom: 4px;
            }
            .item-title {
              font-size: 15px;
              font-weight: bold;
              color: #0f172a;
              margin-bottom: 4px;
              line-height: 1.3;
            }
            .seq-badge {
              display: inline-block;
              background: #ccfbf1;
              color: #0f766e;
              font-size: 12px;
              font-weight: bold;
              padding: 2px 10px;
              border-radius: 999px;
              margin-bottom: 12px;
            }
            .qr-img {
              width: 180px;
              height: 180px;
              margin: 0 auto 12px;
              display: block;
            }
            .asset-code {
              font-family: monospace;
              font-size: 18px;
              font-weight: 900;
              color: #0f172a;
              letter-spacing: 1px;
              margin-bottom: 8px;
            }
            .details {
              font-size: 11px;
              color: #475569;
              text-align: left;
              border-top: 1px solid #e2e8f0;
              padding-top: 8px;
              margin-top: 8px;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="label-card">
            <div class="header-org">คณะพยาบาลศาสตร์ • ห้องปฏิบัติการ</div>
            <div class="item-title">${title}</div>
            <div class="seq-badge">เครื่อง/ชิ้นที่ ${asset.sequenceNumber || 1}</div>
            <img src="${qrDataUrl}" class="qr-img" />
            <div class="asset-code">${asset.assetCode}</div>
            ${asset.govAssetCode ? `<div style="font-family: monospace; font-size: 11px; color: #64748b; margin-top: -4px; margin-bottom: 6px;">เลขครุภัณฑ์: ${asset.govAssetCode}</div>` : ''}
            <div class="details">
              <div><strong>สถานที่เก็บ:</strong> ${asset.location || 'ห้องปฏิบัติการพยาบาล'}</div>
              ${asset.serialNumber ? `<div><strong>Serial No.:</strong> ${asset.serialNumber}</div>` : ''}
              ${asset.cost ? `<div><strong>มูลค่า:</strong> ฿${Number(asset.cost).toLocaleString('th-TH')} บาท</div>` : ''}
            </div>
          </div>
          <script>
            window.onload = () => {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const formattedImg = formatImageUrl(asset.imageUrl);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                ป้ายสติกเกอร์และ QR Code ประจำชิ้น
              </h3>
              <p className="text-[11px] text-slate-500">สำหรับตัดแปะติดบนตัวเครื่องหรืออุปกรณ์</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Label Card Preview */}
        <div className="bg-slate-50 p-5 rounded-2xl border-2 border-dashed border-teal-500/40 text-center space-y-3">
          <div className="text-[10px] font-bold text-teal-700 uppercase tracking-widest">
            คณะพยาบาลศาสตร์ • ห้องปฏิบัติการ
          </div>

          <div className="font-bold text-slate-900 text-sm leading-snug">{title}</div>

          <div>
            <span className="inline-block bg-teal-100 text-teal-800 text-xs font-bold px-3 py-0.5 rounded-full">
              เครื่อง/ชิ้นที่ {asset.sequenceNumber || 1}
            </span>
          </div>

          {/* QR Image */}
          <div className="flex justify-center my-1">
            {qrDataUrl ? (
              <div className="flex flex-col items-center">
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${asset.assetCode}`}
                  className="w-44 h-44 rounded-xl shadow-sm border border-slate-200 p-1 bg-white"
                />
                <span className="text-[10px] text-teal-700 font-medium mt-1.5 flex items-center gap-1">
                  📱 สแกนด้วยกล้องมือถือเพื่อดูข้อมูลออนไลน์ทันที
                </span>
              </div>
            ) : (
              <div className="w-44 h-44 flex items-center justify-center text-xs text-slate-400">
                กำลังสร้าง QR Code...
              </div>
            )}
          </div>

          {/* Asset Code */}
          <div>
            <div className="font-mono font-black text-lg text-slate-900 tracking-wider">
              {asset.assetCode}
            </div>
            {asset.govAssetCode && (
              <div className="mt-1">
                <span className="font-mono text-[11px] text-slate-500 font-semibold bg-slate-200/70 px-2 py-0.5 rounded-md inline-block">
                  เลขครุภัณฑ์: {asset.govAssetCode}
                </span>
              </div>
            )}
          </div>

          {/* Detailed attributes in label */}
          <div className="text-left text-[11px] text-slate-600 border-t border-slate-200 pt-2.5 space-y-1">
            <div className="flex items-start gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-teal-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>ที่เก็บ:</strong> {asset.location || 'ห้องปฏิบัติการพยาบาล'}
              </span>
            </div>
            {asset.serialNumber && (
              <div className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>
                  <strong>Serial:</strong> {asset.serialNumber}
                </span>
              </div>
            )}
            {asset.receivedDate && (
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                <span>
                  <strong>รับเข้าเมื่อ:</strong>{' '}
                  {new Date(asset.receivedDate).toLocaleDateString('th-TH')}
                </span>
              </div>
            )}
            {asset.cost && asset.cost > 0 ? (
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>
                  <strong>ราคา/มูลค่า:</strong> ฿{Number(asset.cost).toLocaleString('th-TH')} บาท
                </span>
              </div>
            ) : null}
          </div>
        </div>

        {/* Photo Preview if Available */}
        {formattedImg && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
            <img
              src={formattedImg}
              alt={title}
              className="w-12 h-12 rounded-lg object-cover border border-slate-200"
              onError={(e) => {
                // If Google Drive link or image fails, hide thumbnail smoothly
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1">
                <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
                รูปภาพตัวเครื่องในระบบ
              </div>
              <a
                href={asset.imageUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-teal-600 hover:underline truncate max-w-[240px] block"
              >
                เปิดดูภาพต้นฉบับ
              </a>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์สติกเกอร์ QR Code</span>
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { formatImageUrl } from '@/lib/image-helper';
import { QrCode, Printer, X, Tag, MapPin, Calendar, DollarSign, Image as ImageIcon, SlidersHorizontal } from 'lucide-react';

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
  const [labelSize, setLabelSize] = useState<'standard' | 'compact' | 'mini'>('standard');
  const title = itemName || asset.item?.name || 'ครุภัณฑ์ห้องปฏิบัติการพยาบาล';

  useEffect(() => {
    async function generateQr() {
      try {
        const origin = typeof window !== 'undefined' ? window.location.origin : '';
        const qrPayload = `${origin}/asset/${encodeURIComponent(asset.assetCode)}`;

        const url = await QRCode.toDataURL(qrPayload, {
          width: 320,
          margin: labelSize === 'mini' ? 1 : 2,
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
  }, [asset, labelSize]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (!printWindow) {
      window.print();
      return;
    }

    let bodyContent = '';
    let pageCss = '';

    if (labelSize === 'mini') {
      // Mini: Strip layout ~30x15 mm
      pageCss = `
        @page { size: auto; margin: 4mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 90vh;
          margin: 0;
          background: #fff;
        }
        .mini-card {
          border: 1px dashed #0d9488;
          border-radius: 6px;
          padding: 4px 6px;
          width: 160px;
          height: 68px;
          display: flex;
          align-items: center;
          gap: 6px;
          background: #fff;
          box-sizing: border-box;
        }
        .mini-qr {
          width: 58px;
          height: 58px;
          flex-shrink: 0;
          display: block;
        }
        .mini-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          line-height: 1.15;
        }
        .mini-code {
          font-family: monospace;
          font-size: 11px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 0.2px;
          white-space: nowrap;
        }
        .mini-title {
          font-size: 8.5px;
          font-weight: bold;
          color: #334155;
          margin-top: 2px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .mini-loc {
          font-size: 7.5px;
          color: #0f766e;
          margin-top: 2px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `;
      bodyContent = `
        <div class="mini-card">
          <img src="${qrDataUrl}" class="mini-qr" />
          <div class="mini-info">
            <div class="mini-code">${asset.assetCode}</div>
            <div class="mini-title">${title}</div>
            <div class="mini-loc">📍 ${asset.location || 'ห้องแล็บพยาบาล'}</div>
          </div>
        </div>
      `;
    } else if (labelSize === 'compact') {
      // Compact: Horizontal ~45x25 mm
      pageCss = `
        @page { size: auto; margin: 6mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 90vh;
          margin: 0;
          background: #fff;
        }
        .compact-card {
          border: 1.5px dashed #0d9488;
          border-radius: 10px;
          padding: 8px 10px;
          width: 240px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          box-sizing: border-box;
        }
        .compact-qr {
          width: 78px;
          height: 78px;
          flex-shrink: 0;
          display: block;
        }
        .compact-info {
          display: flex;
          flex-direction: column;
          justify-content: center;
          overflow: hidden;
          line-height: 1.25;
        }
        .compact-org {
          font-size: 8px;
          font-weight: 700;
          color: #0d9488;
          text-transform: uppercase;
        }
        .compact-code {
          font-family: monospace;
          font-size: 13px;
          font-weight: 900;
          color: #0f172a;
          margin-top: 1px;
        }
        .compact-title {
          font-size: 10.5px;
          font-weight: 700;
          color: #1e293b;
          margin-top: 2px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .compact-meta {
          font-size: 8.5px;
          color: #64748b;
          margin-top: 3px;
        }
      `;
      bodyContent = `
        <div class="compact-card">
          <img src="${qrDataUrl}" class="compact-qr" />
          <div class="compact-info">
            <div class="compact-org">คณะพยาบาลศาสตร์</div>
            <div class="compact-code">${asset.assetCode}</div>
            <div class="compact-title">${title} (${asset.sequenceNumber || 1})</div>
            <div class="compact-meta">
              <span>📍 ${asset.location || 'ห้องแล็บพยาบาล'}</span>
              ${asset.govAssetCode ? `<div>เลข: ${asset.govAssetCode}</div>` : ''}
            </div>
          </div>
        </div>
      `;
    } else {
      // Standard: Full ~60x40 mm card
      pageCss = `
        @page { size: auto; margin: 10mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 90vh;
          margin: 0;
          background: #fff;
        }
        .label-card {
          border: 2px dashed #0d9488;
          border-radius: 16px;
          padding: 22px;
          width: 320px;
          text-align: center;
          background: #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.06);
        }
        .header-org {
          font-size: 10.5px;
          font-weight: bold;
          color: #0d9488;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          margin-bottom: 4px;
        }
        .item-title {
          font-size: 14px;
          font-weight: bold;
          color: #0f172a;
          margin-bottom: 4px;
          line-height: 1.3;
        }
        .seq-badge {
          display: inline-block;
          background: #ccfbf1;
          color: #0f766e;
          font-size: 11px;
          font-weight: bold;
          padding: 2px 10px;
          border-radius: 999px;
          margin-bottom: 10px;
        }
        .qr-img {
          width: 160px;
          height: 160px;
          margin: 0 auto 10px;
          display: block;
        }
        .asset-code {
          font-family: monospace;
          font-size: 17px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: 0.8px;
          margin-bottom: 6px;
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
      `;
      bodyContent = `
        <div class="label-card">
          <div class="header-org">คณะพยาบาลศาสตร์ • ห้องปฏิบัติการ</div>
          <div class="item-title">${title}</div>
          <div class="seq-badge">เครื่อง/ชิ้นที่ ${asset.sequenceNumber || 1}</div>
          <img src="${qrDataUrl}" class="qr-img" />
          <div class="asset-code">${asset.assetCode}</div>
          ${asset.govAssetCode ? `<div style="font-family: monospace; font-size: 11px; color: #64748b; margin-top: -2px; margin-bottom: 6px;">เลขครุภัณฑ์: ${asset.govAssetCode}</div>` : ''}
          <div class="details">
            <div><strong>สถานที่เก็บ:</strong> ${asset.location || 'ห้องปฏิบัติการพยาบาล'}</div>
            ${asset.serialNumber ? `<div><strong>Serial No.:</strong> ${asset.serialNumber}</div>` : ''}
            ${asset.cost ? `<div><strong>มูลค่า:</strong> ฿${Number(asset.cost).toLocaleString('th-TH')} บาท</div>` : ''}
          </div>
        </div>
      `;
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>ป้าย QR Code - ${asset.assetCode}</title>
          <style>
            ${pageCss}
          </style>
        </head>
        <body>
          ${bodyContent}
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
      <div className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl border border-slate-100 space-y-4 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                ป้ายสติกเกอร์และ QR Code ประจำชิ้น
              </h3>
              <p className="text-[11px] text-slate-500">เลือกขนาดสติกเกอร์ที่เหมาะกับอุปกรณ์</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Size Preset Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700">
            <span className="flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-teal-600" />
              เลือกขนาดสติกเกอร์:
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setLabelSize('standard')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                labelSize === 'standard'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div>มาตรฐาน</div>
              <div className="text-[10px] font-normal text-slate-400">~6x4 ซม.</div>
            </button>
            <button
              type="button"
              onClick={() => setLabelSize('compact')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                labelSize === 'compact'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div>กะทัดรัด</div>
              <div className="text-[10px] font-normal text-slate-400">~4.5x2.5 ซม.</div>
            </button>
            <button
              type="button"
              onClick={() => setLabelSize('mini')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer text-center ${
                labelSize === 'mini'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <div>จิ๋ว (ชิ้นเล็ก)</div>
              <div className="text-[10px] font-normal text-slate-400">~3x1.5 ซม.</div>
            </button>
          </div>
        </div>

        {/* Printable Label Card Preview according to Size */}
        {labelSize === 'mini' ? (
          /* Mini Strip Preview */
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-teal-500/40 flex items-center justify-center">
            <div className="bg-white border border-teal-600/50 rounded-lg p-2 flex items-center gap-2.5 shadow-sm max-w-[260px] w-full">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${asset.assetCode}`}
                  className="w-14 h-14 rounded border border-slate-200 p-0.5 bg-white flex-shrink-0"
                />
              ) : (
                <div className="w-14 h-14 bg-slate-100 rounded animate-pulse" />
              )}
              <div className="overflow-hidden space-y-0.5">
                <div className="font-mono font-black text-xs text-slate-900 truncate">
                  {asset.assetCode}
                </div>
                <div className="text-[10px] font-bold text-slate-700 line-clamp-1 leading-tight">
                  {title}
                </div>
                <div className="text-[9px] text-teal-700 flex items-center gap-0.5 truncate">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                  <span>{asset.location || 'ห้องแล็บพยาบาล'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : labelSize === 'compact' ? (
          /* Compact Horizontal Preview */
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-teal-500/40 flex items-center justify-center">
            <div className="bg-white border border-teal-600/50 rounded-xl p-3 flex items-center gap-3 shadow-sm max-w-[320px] w-full">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${asset.assetCode}`}
                  className="w-20 h-20 rounded-lg border border-slate-200 p-1 bg-white flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 bg-slate-100 rounded animate-pulse" />
              )}
              <div className="overflow-hidden space-y-1">
                <div className="text-[9px] font-bold text-teal-700 uppercase tracking-wide">
                  คณะพยาบาลศาสตร์
                </div>
                <div className="font-mono font-black text-sm text-slate-900 leading-none">
                  {asset.assetCode}
                </div>
                <div className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight">
                  {title} <span className="text-teal-600 font-semibold">({asset.sequenceNumber || 1})</span>
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-teal-600 flex-shrink-0" />
                  <span className="truncate">{asset.location || 'ห้องแล็บพยาบาล'}</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Standard Card Preview */
          <div className="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-teal-500/40 text-center space-y-2.5">
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
                <img
                  src={qrDataUrl}
                  alt={`QR Code ${asset.assetCode}`}
                  className="w-36 h-36 rounded-xl shadow-sm border border-slate-200 p-1 bg-white"
                />
              ) : (
                <div className="w-36 h-36 flex items-center justify-center text-xs text-slate-400">
                  กำลังสร้าง QR Code...
                </div>
              )}
            </div>

            {/* Asset Code */}
            <div>
              <div className="font-mono font-black text-base text-slate-900 tracking-wider">
                {asset.assetCode}
              </div>
              {asset.govAssetCode && (
                <div className="mt-1">
                  <span className="font-mono text-[10px] text-slate-500 font-semibold bg-slate-200/70 px-2 py-0.5 rounded-md inline-block">
                    เลขครุภัณฑ์: {asset.govAssetCode}
                  </span>
                </div>
              )}
            </div>

            {/* Detailed attributes in label */}
            <div className="text-left text-[11px] text-slate-600 border-t border-slate-200 pt-2 space-y-1">
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
        )}

        {/* Photo Preview if Available */}
        {formattedImg && (
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-2.5">
            <img
              src={formattedImg}
              alt={title}
              className="w-10 h-10 rounded-lg object-cover border border-slate-200"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1">
                <ImageIcon className="w-3 h-3 text-teal-600" />
                รูปภาพตัวเครื่องในระบบ
              </div>
              <a
                href={asset.imageUrl || '#'}
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-teal-600 hover:underline truncate max-w-[240px] block"
              >
                เปิดดูภาพต้นฉบับ
              </a>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            ปิด
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์สติกเกอร์ QR Code ({labelSize === 'mini' ? 'จิ๋ว' : labelSize === 'compact' ? 'กะทัดรัด' : 'มาตรฐาน'})</span>
          </button>
        </div>
      </div>
    </div>
  );
}

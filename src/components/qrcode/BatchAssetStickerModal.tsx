'use client';

import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Printer,
  X,
  Tag,
  Search,
  CheckSquare,
  Square,
  Package,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Layers,
  FileDown,
} from 'lucide-react';
import { downloadStickerDocx, type DocxCardItem } from '@/lib/exportStickerDocx';
import { downloadStickerPdf, type PdfCardItem } from '@/lib/exportStickerPdf';

export interface EquipmentItemForBatch {
  id: string;
  name: string;
  code: string;
  unit: string;
  brand?: string | null;
  model?: string | null;
  location?: string | null;
  category?: { name: string } | null;
  assetItems?: Array<{
    id: string;
    assetCode: string;
    govAssetCode?: string | null;
    sequenceNumber?: number | null;
    status: string;
    condition?: string | null;
    location?: string | null;
    brand?: string | null;
    model?: string | null;
  }>;
}

interface BatchAssetStickerModalProps {
  items: EquipmentItemForBatch[];
  onClose: () => void;
}

export default function BatchAssetStickerModal({
  items,
  onClose,
}: BatchAssetStickerModalProps) {
  // Only items with assets
  const availableItems = useMemo(() => {
    return items.filter(
      (item) => item.assetItems && item.assetItems.length > 0
    );
  }, [items]);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItemIds, setExpandedItemIds] = useState<string[]>([]);
  const [showRetired, setShowRetired] = useState(false);
  // Selected asset IDs (Default: Only active/available assets, exclude RETIRED)
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>(() => {
    const ids: string[] = [];
    availableItems.forEach((item) => {
      item.assetItems?.forEach((a) => {
        if (a.status !== 'RETIRED') {
          ids.push(a.id);
        }
      });
    });
    return ids;
  });

  const [labelSize, setLabelSize] = useState<'compact' | 'standard' | 'mini' | 'template_doc'>('compact');
  const [startPosition, setStartPosition] = useState<number>(1);
  const [showBorders, setShowBorders] = useState<boolean>(true);
  const [copiesPerAsset, setCopiesPerAsset] = useState<1 | 2>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [qrCache, setQrCache] = useState<Record<string, string>>({});

  // Filter items by search
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return availableItems;
    const q = searchQuery.toLowerCase();
    return availableItems.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.code.toLowerCase().includes(q) ||
        (i.brand && i.brand.toLowerCase().includes(q)) ||
        (i.model && i.model.toLowerCase().includes(q)) ||
        i.assetItems?.some(
          (a) =>
            a.assetCode.toLowerCase().includes(q) ||
            (a.govAssetCode && a.govAssetCode.toLowerCase().includes(q))
        )
    );
  }, [availableItems, searchQuery]);

  // Expand/collapse
  const toggleExpand = (itemId: string) => {
    setExpandedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  // Toggle item all assets
  const toggleItemAssets = (item: EquipmentItemForBatch) => {
    const itemAssetIds = item.assetItems?.map((a) => a.id) || [];
    const allSelected = itemAssetIds.every((id) => selectedAssetIds.includes(id));
    if (allSelected) {
      setSelectedAssetIds((prev) => prev.filter((id) => !itemAssetIds.includes(id)));
    } else {
      setSelectedAssetIds((prev) => Array.from(new Set([...prev, ...itemAssetIds])));
    }
  };

  // Toggle single asset
  const toggleAsset = (assetId: string) => {
    setSelectedAssetIds((prev) =>
      prev.includes(assetId) ? prev.filter((id) => id !== assetId) : [...prev, assetId]
    );
  };

  // Select all / Deselect all
  const selectAll = () => {
    const allAssetIds: string[] = [];
    filteredItems.forEach((item) => {
      item.assetItems?.forEach((a) => allAssetIds.push(a.id));
    });
    setSelectedAssetIds(allAssetIds);
  };

  const deselectAll = () => {
    setSelectedAssetIds([]);
  };

  // Total count
  const totalAssetsCount = selectedAssetIds.length;
  const totalStickersCount = totalAssetsCount * copiesPerAsset;

  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isExportingDocx, setIsExportingDocx] = useState<boolean>(false);

  const handleExportPdf = async () => {
    if (totalAssetsCount === 0) {
      alert('กรุณาเลือกครุภัณฑ์อย่างน้อย 1 ชิ้นเพื่อพิมพ์สติกเกอร์');
      return;
    }

    setIsExportingPdf(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const qrs: Record<string, string> = { ...qrCache };
      const assetsToPrint: Array<{
        asset: any;
        item: EquipmentItemForBatch;
      }> = [];

      availableItems.forEach((item) => {
        item.assetItems?.forEach((a) => {
          if (selectedAssetIds.includes(a.id)) {
            assetsToPrint.push({ asset: a, item });
          }
        });
      });

      for (const { asset } of assetsToPrint) {
        const payload = `${origin}/asset/${encodeURIComponent(asset.assetCode || asset.govAssetCode)}`;
        if (!qrs[payload]) {
          qrs[payload] = await QRCode.toDataURL(payload, {
            width: 250,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
          });
        }
      }
      setQrCache(qrs);

      const pdfCards: PdfCardItem[] = [];
      for (const { asset, item } of assetsToPrint) {
        const payload = `${origin}/asset/${encodeURIComponent(asset.assetCode || asset.govAssetCode)}`;
        const qrUrl = qrs[payload] || '';
        const rawCode = asset.govAssetCode || asset.assetCode;
        const unitName = item.unit || 'เครื่อง';
        const cardTitle = item.name && asset.brand && asset.model
          ? `${item.name} (${asset.brand} / ${asset.model})`
          : item.name;

        const cardItem: PdfCardItem = {
          qrBase64: qrUrl,
          orgText: 'คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์',
          codeText: rawCode,
          badgeText: `${unitName}ที่ ${asset.sequenceNumber || 1}`,
          titleText: cardTitle,
          locOrExpText: `📍 ${asset.location || item.location || 'ห้องปฏิบัติการ'}`,
        };

        for (let copy = 0; copy < copiesPerAsset; copy++) {
          pdfCards.push({ ...cardItem });
        }
      }

      await downloadStickerPdf(
        `สติกเกอร์ครุภัณฑ์_รวม_${pdfCards.length}ดวง_ตราช้าง_A7`,
        pdfCards,
        { startPosition, showBorders }
      );
    } catch (err) {
      console.error('Error generating PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportDocx = async () => {
    if (totalAssetsCount === 0) {
      alert('กรุณาเลือกครุภัณฑ์อย่างน้อย 1 ชิ้นเพื่อพิมพ์สติกเกอร์');
      return;
    }

    setIsExportingDocx(true);
    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const qrs: Record<string, string> = { ...qrCache };
      const assetsToPrint: Array<{
        asset: any;
        item: EquipmentItemForBatch;
      }> = [];

      availableItems.forEach((item) => {
        item.assetItems?.forEach((a) => {
          if (selectedAssetIds.includes(a.id)) {
            assetsToPrint.push({ asset: a, item });
          }
        });
      });

      for (const { asset } of assetsToPrint) {
        const payload = `${origin}/asset/${encodeURIComponent(asset.assetCode || asset.govAssetCode)}`;
        if (!qrs[payload]) {
          qrs[payload] = await QRCode.toDataURL(payload, {
            width: 250,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
          });
        }
      }
      setQrCache(qrs);

      const docxCards: DocxCardItem[] = [];
      for (const { asset, item } of assetsToPrint) {
        const payload = `${origin}/asset/${encodeURIComponent(asset.assetCode || asset.govAssetCode)}`;
        const qrUrl = qrs[payload] || '';
        const rawCode = asset.govAssetCode || asset.assetCode;
        const unitName = item.unit || 'เครื่อง';
        const cardTitle = item.name && asset.brand && asset.model
          ? `${item.name} (${asset.brand} / ${asset.model})`
          : item.name;

        const cardItem: DocxCardItem = {
          qrBase64: qrUrl,
          orgText: 'คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์',
          codeText: rawCode,
          badgeText: `${unitName}ที่ ${asset.sequenceNumber || 1}`,
          titleText: cardTitle,
          locOrExpText: `📍 ${asset.location || item.location || 'ห้องปฏิบัติการ'}`,
        };

        for (let copy = 0; copy < copiesPerAsset; copy++) {
          docxCards.push({ ...cardItem });
        }
      }

      await downloadStickerDocx(
        `สติกเกอร์ครุภัณฑ์_รวม_${docxCards.length}ดวง_ตราช้าง_A7`,
        docxCards,
        { startPosition, showBorders }
      );
    } catch (err) {
      console.error('Error generating docx:', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Print Handler
  const handlePrint = async () => {
    if (totalAssetsCount === 0) {
      alert('กรุณาเลือกครุภัณฑ์อย่างน้อย 1 ชิ้นเพื่อพิมพ์สติกเกอร์');
      return;
    }

    setIsGenerating(true);

    try {
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const qrs: Record<string, string> = { ...qrCache };

      // Collect assets to print
      const assetsToPrint: Array<{
        asset: any;
        item: EquipmentItemForBatch;
      }> = [];

      availableItems.forEach((item) => {
        item.assetItems?.forEach((a) => {
          if (selectedAssetIds.includes(a.id)) {
            assetsToPrint.push({ asset: a, item });
          }
        });
      });

      // Generate QRs
      for (const { asset } of assetsToPrint) {
        const payload = `${origin}/asset/${encodeURIComponent(asset.assetCode || asset.govAssetCode)}`;
        if (!qrs[payload]) {
          qrs[payload] = await QRCode.toDataURL(payload, {
            width: 200,
            margin: 1,
            color: { dark: '#0f172a', light: '#ffffff' },
          });
        }
      }
      setQrCache(qrs);

      // Generate HTML cards
      let cardsHtml = '';

      if (labelSize === 'template_doc') {
        const allCardItems: string[] = [];

        for (const { asset, item } of assetsToPrint) {
          const payload = `${origin}/equipment/${encodeURIComponent(asset.assetCode || asset.govAssetCode)}`;
          const qrUrl = qrs[payload] || '';
          const rawCode = asset.govAssetCode || asset.assetCode;
          const unitName = item.unit || 'เครื่อง';

          for (let copy = 0; copy < copiesPerAsset; copy++) {
            allCardItems.push(`
              <div class="doc-card-inner">
                <div class="doc-qr-wrap">
                  <img src="${qrUrl}" class="doc-qr" />
                </div>
                <div class="doc-info">
                  <div class="doc-org-text">คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์</div>
                  <div class="doc-code-row">
                    <span class="doc-code">${rawCode}</span>
                    <span class="doc-seq">${unitName}ที่ ${asset.sequenceNumber || 1}</span>
                  </div>
                  <div class="doc-name">${item.name}</div>
                  <div class="doc-loc">📍 ${asset.location || item.location || 'ห้องปฏิบัติการ'}</div>
                </div>
              </div>
            `);
          }
        }

        // Apply starting position offset
        const effectiveCards: string[] = [];
        const startOffset = Math.max(0, startPosition - 1);
        for (let i = 0; i < startOffset; i++) {
          effectiveCards.push('');
        }
        effectiveCards.push(...allCardItems);

        // Group into pages of 40 (8 rows x 5 cols)
        const CARDS_PER_PAGE = 40;
        const totalSheets = Math.ceil(effectiveCards.length / CARDS_PER_PAGE) || 1;

        for (let s = 0; s < totalSheets; s++) {
          const sheetCards = effectiveCards.slice(s * CARDS_PER_PAGE, (s + 1) * CARDS_PER_PAGE);
          while (sheetCards.length < CARDS_PER_PAGE) {
            sheetCards.push('');
          }

          let sheetTableRows = '';
          for (let r = 0; r < 8; r++) {
            const rowCards = sheetCards.slice(r * 5, (r + 1) * 5);
            let rowCellsHtml = '';
            for (let c = 0; c < 5; c++) {
              const cardContent = rowCards[c];
              rowCellsHtml += `
                <td class="doc-cell">
                  ${cardContent || '<div class="doc-empty-cell"></div>'}
                </td>
              `;
              if (c < 4) {
                rowCellsHtml += `<td class="doc-spacer-col"></td>`;
              }
            }
            sheetTableRows += `<tr class="doc-sticker-row">${rowCellsHtml}</tr>`;
          }

          cardsHtml += `
            <div class="doc-sheet-page">
              <table class="doc-table">
                <tbody>
                  ${sheetTableRows}
                </tbody>
              </table>
            </div>
          `;
        }
      } else {
        for (const { asset, item } of assetsToPrint) {
          const payload = `${origin}/equipment/${encodeURIComponent(asset.assetCode || asset.govAssetCode)}`;
          const qrUrl = qrs[payload] || '';
          const rawCode = asset.govAssetCode || asset.assetCode;
          const subCode = asset.govAssetCode ? asset.assetCode : '';
          const unitName = item.unit || 'เครื่อง';
          const brandModel = [asset.brand || item.brand, asset.model || item.model].filter(Boolean).join(' ');

          for (let copy = 0; copy < copiesPerAsset; copy++) {
            if (labelSize === 'mini') {
              cardsHtml += `
                <div class="mini-card">
                  <img src="${qrUrl}" class="mini-qr" />
                  <div class="mini-info">
                    <div class="mini-org">คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์</div>
                    <div class="mini-code-row">
                      <span class="mini-code">${rawCode}</span>
                      <span class="mini-seq">${unitName}ที่ ${asset.sequenceNumber || 1}</span>
                    </div>
                    <div class="mini-title">${item.name}</div>
                    <div class="mini-loc">📍 ${asset.location || item.location || 'ห้องแล็บพยาบาล'}</div>
                  </div>
                </div>
              `;
            } else if (labelSize === 'compact') {
              cardsHtml += `
                <div class="compact-card">
                  <div class="compact-header">
                    <span class="compact-org-text">คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์</span>
                    <span class="compact-org-sub">ห้องปฏิบัติการ</span>
                  </div>
                  <div class="compact-body">
                    <img src="${qrUrl}" class="compact-qr" />
                    <div class="compact-info">
                      <div class="compact-code-row">
                        <span class="compact-code">${rawCode}</span>
                        <span class="compact-seq">${unitName}ที่ ${asset.sequenceNumber || 1}</span>
                      </div>
                      <div class="compact-title">${item.name}</div>
                      ${brandModel ? `<div class="compact-brand">${brandModel}</div>` : ''}
                      <div class="compact-meta">
                        <span>📍 ${asset.location || item.location || 'ห้องปฏิบัติการ'}</span>
                        ${subCode ? `<span class="compact-subcode">(${subCode})</span>` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              `;
            } else {
              // Standard
              cardsHtml += `
                <div class="std-card">
                  <div class="std-header">
                    <div class="std-org-main">คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์</div>
                    <div class="std-org-sub">ห้องปฏิบัติการ</div>
                  </div>
                  <div class="std-body">
                    <img src="${qrUrl}" class="std-qr" />
                    <div class="std-info">
                      <div class="std-code-row">
                        <div class="std-gov-code">${rawCode}</div>
                        <div class="std-seq-badge">${unitName}ที่ ${asset.sequenceNumber || 1}</div>
                      </div>
                      <div class="std-title">${item.name}</div>
                      ${brandModel ? `<div class="std-model">${brandModel}</div>` : ''}
                      <div class="std-footer-row">
                        <div class="std-loc">📍 ${asset.location || item.location || 'ห้องปฏิบัติการ'}</div>
                        ${subCode ? `<div class="std-internal-code">${subCode}</div>` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }
          }
        }
      }

      // Page CSS
      let pageCss = '';

      if (labelSize === 'template_doc') {
        pageCss = `
          @page {
            size: 205mm 175mm landscape;
            margin: 0;
          }
          html, body {
            width: 205mm;
            margin: 0;
            padding: 0;
            background: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Sarabun", sans-serif;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .doc-sheet-page {
            width: 202mm;
            height: 168mm;
            margin: 3.5mm 0 0 1.5mm;
            box-sizing: border-box;
            page-break-after: always;
            break-after: page;
            overflow: hidden;
          }
          .doc-sheet-page:last-child {
            page-break-after: avoid;
            break-after: avoid;
          }
          .doc-table {
            width: 202mm;
            border-collapse: collapse;
            table-layout: fixed;
            margin: 0;
            padding: 0;
          }
          .doc-sticker-row {
            height: 21mm;
            max-height: 21mm;
            min-height: 21mm;
          }
          .doc-cell {
            width: 38mm;
            max-width: 38mm;
            height: 21mm;
            max-height: 21mm;
            min-height: 21mm;
            padding: 1mm 0;
            vertical-align: middle;
            box-sizing: border-box;
            overflow: hidden;
          }
          .doc-spacer-col {
            width: 3mm;
            max-width: 3mm;
            min-width: 3mm;
            padding: 0;
            margin: 0;
            border: none;
          }
          .doc-empty-cell {
            width: 38mm;
            height: 19mm;
            box-sizing: border-box;
            ${showBorders ? 'border: 0.5px dashed #f1f5f9;' : 'border: none;'}
          }
          .doc-card-inner {
            width: 38mm;
            max-width: 38mm;
            height: 19mm;
            max-height: 19mm;
            display: flex;
            align-items: center;
            gap: 1.5mm;
            box-sizing: border-box;
            overflow: hidden;
            padding: 1mm 1.2mm;
            ${showBorders ? 'border: 0.5px dashed #cbd5e1;' : 'border: none;'}
          }
          .doc-qr-wrap {
            width: 13.5mm;
            height: 13.5mm;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
          }
          .doc-qr {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: block;
          }
          .doc-info {
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
            line-height: 1.15;
            flex: 1;
            min-width: 0;
            text-align: left;
          }
          .doc-org-text {
            font-size: 5.5px;
            font-weight: 800;
            color: #0f766e;
            line-height: 1.1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .doc-code-row {
            display: flex;
            align-items: center;
            gap: 2px;
            margin-top: 0.5px;
          }
          .doc-code {
            font-family: monospace;
            font-size: 6.5px;
            font-weight: 900;
            color: #0f172a;
            line-height: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .doc-seq {
            font-size: 5px;
            font-weight: 700;
            color: #0f766e;
            background: #f0fdfa;
            border: 0.4px solid #99f6e4;
            border-radius: 1.5px;
            padding: 0 1px;
            line-height: 1;
            white-space: nowrap;
            flex-shrink: 0;
          }
          .doc-name {
            font-size: 5.5px;
            font-weight: 700;
            color: #334155;
            line-height: 1.12;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
            margin-top: 0.5px;
          }
          .doc-loc {
            font-size: 5px;
            color: #64748b;
            font-weight: 600;
            line-height: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            margin-top: 0.5px;
          }
        `;
      } else if (labelSize === 'mini') {
        pageCss = `
          @page { size: A4 portrait; margin: 6mm 5mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Sarabun", sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .labels-container {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 2mm 2.5mm;
            width: 100%;
            box-sizing: border-box;
          }
          .mini-card {
            border: 1px solid #334155;
            border-radius: 3px;
            padding: 2.5px 4px;
            width: 100%;
            height: 18mm;
            max-height: 18mm;
            display: flex;
            align-items: center;
            gap: 5px;
            box-sizing: border-box;
            page-break-inside: avoid;
            break-inside: avoid;
            background: #fff;
          }
          .mini-qr {
            width: 48px;
            height: 48px;
            flex-shrink: 0;
            display: block;
          }
          .mini-info {
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
            line-height: 1.15;
            flex: 1;
            min-width: 0;
          }
          .mini-org {
            font-size: 7px;
            font-weight: 800;
            color: #0f766e;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .mini-code-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 3px;
            margin-top: 0.5px;
          }
          .mini-code {
            font-family: monospace;
            font-size: 8.5px;
            font-weight: 900;
            color: #0f172a;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .mini-seq {
            font-size: 6.5px;
            font-weight: 800;
            color: #0f766e;
            background: #f0fdfa;
            border: 0.5px solid #99f6e4;
            border-radius: 2px;
            padding: 0.5px 2.5px;
            white-space: nowrap;
          }
          .mini-title {
            font-size: 7.5px;
            font-weight: bold;
            color: #334155;
            margin-top: 0.5px;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            line-height: 1.12;
            word-break: break-word;
          }
          .mini-loc {
            font-size: 6.5px;
            color: #64748b;
            margin-top: 0.5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
        `;
      } else if (labelSize === 'compact') {
        pageCss = `
          @page { size: A4 portrait; margin: 6mm 5mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Sarabun", sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .labels-container {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 2.5mm 2.5mm;
            width: 100%;
            box-sizing: border-box;
          }
          .compact-card {
            border: 1.2px solid #334155;
            border-radius: 4px;
            padding: 2.5px 5px 3px 5px;
            width: 100%;
            min-height: 26mm;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            page-break-inside: avoid;
            break-inside: avoid;
            background: #fff;
          }
          .compact-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f0fdfa;
            border-bottom: 1px solid #0d9488;
            border-top-left-radius: 3px;
            border-top-right-radius: 3px;
            padding: 1.5px 5px;
            margin: -2.5px -5px 2px -5px;
            box-sizing: border-box;
          }
          .compact-org-text {
            font-size: 7.5px;
            font-weight: 800;
            color: #0f766e;
            letter-spacing: 0.2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .compact-org-sub {
            font-size: 6.5px;
            font-weight: 700;
            color: #0d9488;
            white-space: nowrap;
          }
          .compact-body {
            display: flex;
            align-items: center;
            gap: 6px;
            flex: 1;
            min-height: 0;
          }
          .compact-qr {
            width: 60px;
            height: 60px;
            flex-shrink: 0;
            display: block;
          }
          .compact-info {
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
            line-height: 1.15;
            flex: 1;
            min-width: 0;
          }
          .compact-code-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4px;
          }
          .compact-code {
            font-family: monospace;
            font-size: 10px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 0.2px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .compact-seq {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 7.5px;
            font-weight: 800;
            color: #0f766e;
            background: #f0fdfa;
            border: 0.5px solid #99f6e4;
            border-radius: 3px;
            padding: 1px 4px;
            white-space: nowrap;
            flex-shrink: 0;
          }
          .compact-title {
            font-size: 8.5px;
            font-weight: 800;
            color: #1e293b;
            margin-top: 1px;
            line-height: 1.15;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            word-break: break-word;
          }
          .compact-brand {
            font-size: 7.5px;
            font-weight: 600;
            color: #475569;
            margin-top: 0.5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .compact-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4px;
            font-size: 7px;
            color: #64748b;
            margin-top: 1px;
            white-space: nowrap;
            overflow: hidden;
          }
          .compact-subcode {
            font-family: monospace;
            color: #94a3b8;
          }
        `;
      } else {
        // Standard
        pageCss = `
          @page { size: A4 portrait; margin: 8mm 6mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Sarabun", sans-serif;
            margin: 0;
            padding: 0;
            background: #fff;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .labels-container {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 4mm 4mm;
            width: 100%;
            box-sizing: border-box;
          }
          .std-card {
            border: 1.5px solid #334155;
            border-radius: 6px;
            padding: 4px 6px;
            width: 100%;
            min-height: 38mm;
            display: flex;
            flex-direction: column;
            box-sizing: border-box;
            page-break-inside: avoid;
            break-inside: avoid;
            background: #fff;
          }
          .std-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #f0fdfa;
            border-bottom: 1.2px solid #0d9488;
            border-top-left-radius: 4px;
            border-top-right-radius: 4px;
            padding: 2px 6px;
            margin: -4px -6px 3px -6px;
            box-sizing: border-box;
          }
          .std-org-main {
            font-size: 8.5px;
            font-weight: 800;
            color: #0f766e;
            letter-spacing: 0.2px;
          }
          .std-org-sub {
            font-size: 7.5px;
            font-weight: 700;
            color: #0d9488;
          }
          .std-body {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
            min-height: 0;
          }
          .std-qr {
            width: 80px;
            height: 80px;
            flex-shrink: 0;
            display: block;
          }
          .std-info {
            display: flex;
            flex-direction: column;
            justify-content: center;
            overflow: hidden;
            line-height: 1.2;
            flex: 1;
            min-width: 0;
          }
          .std-code-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4px;
          }
          .std-gov-code {
            font-family: monospace;
            font-size: 11.5px;
            font-weight: 900;
            color: #0f172a;
            letter-spacing: 0.2px;
          }
          .std-seq-badge {
            font-size: 8.5px;
            font-weight: 800;
            color: #0f766e;
            background: #f0fdfa;
            border: 1px solid #99f6e4;
            border-radius: 3px;
            padding: 1px 5px;
            white-space: nowrap;
          }
          .std-title {
            font-size: 10px;
            font-weight: 800;
            color: #1e293b;
            margin-top: 1.5px;
            line-height: 1.2;
            word-break: break-word;
          }
          .std-model {
            font-size: 8.5px;
            font-weight: 600;
            color: #475569;
            margin-top: 1px;
          }
          .std-footer-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 4px;
            font-size: 8px;
            color: #64748b;
            margin-top: 2px;
          }
          .std-internal-code {
            font-family: monospace;
            color: #94a3b8;
          }
        `;
      }

      const printWindow = window.open('', '_blank', 'width=900,height=800');
      if (!printWindow) {
        alert('เบราว์เซอร์บล็อกหน้าต่างพิมพ์ กรุณาอนุญาตป๊อปอัป');
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${labelSize === 'template_doc' ? '' : 'พิมพ์สติกเกอร์ครุภัณฑ์หลายรายการ - คณะพยาบาลศาสตร์ ม.เกษตรศาสตร์'}</title>
            <meta charset="utf-8" />
            <style>${pageCss}</style>
          </head>
          <body>
            ${labelSize === 'template_doc' ? cardsHtml : `<div class="labels-container">${cardsHtml}</div>`}
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                  window.close();
                }, 400);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Error printing asset stickers:', err);
      alert('เกิดข้อผิดพลาดในการพิมพ์สติกเกอร์ครุภัณฑ์');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-100 dark:border-slate-800 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-100 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                พิมพ์สติกเกอร์ครุภัณฑ์ทีละหลายรายการ (Batch Equipment Stickers)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                เลือกครุภัณฑ์รายชิ้นหรือทั้งกลุ่มเพื่อพิมพ์สติกเกอร์พร้อมเลขครุภัณฑ์และ QR Code
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="py-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="ค้นหาชื่อครุภัณฑ์, รหัสพัสดุ, เลขครุภัณฑ์ราชการ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          {/* Label size switch */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setLabelSize('compact')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                labelSize === 'compact'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              กะทัดรัด (3 แถว)
            </button>
            <button
              onClick={() => setLabelSize('standard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                labelSize === 'standard'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              มาตรฐาน (2 แถว)
            </button>
            <button
              onClick={() => setLabelSize('mini')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                labelSize === 'mini'
                  ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              แถบจิ๋ว (4 แถว)
            </button>
            <button
              onClick={() => setLabelSize('template_doc')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                labelSize === 'template_doc'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
              title="เทมเพลตกระดาษสติกเกอร์ 175×205 มม. (5 แถว × 8 ช่อง = 40 ดวง/แผ่น • สติกเกอร์ 19 × 38 มม.)"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>เทมเพลต 19×38 มม. (40 ดวง)</span>
            </button>
          </div>

          {/* Copies count */}
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
            <span>จำนวนใบต่อชิ้น:</span>
            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setCopiesPerAsset(1)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  copiesPerAsset === 1
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                1 ชุด
              </button>
              <button
                onClick={() => setCopiesPerAsset(2)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  copiesPerAsset === 2
                    ? 'bg-white dark:bg-slate-700 text-teal-700 dark:text-teal-300 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                2 ชุด (เผื่อติดตัวเครื่อง+กล่อง)
              </button>
            </div>
          </div>

          {/* Show Retired Toggle */}
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 cursor-pointer select-none px-2 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition">
            <input
              type="checkbox"
              checked={showRetired}
              onChange={(e) => setShowRetired(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
            />
            <span>รวมครุภัณฑ์ที่แทงจำหน่ายแล้ว (Retired)</span>
          </label>
        </div>

        {/* Template Doc configuration panel */}
        {labelSize === 'template_doc' && (
          <div className="p-3 my-2 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 space-y-2 text-xs animate-fadeIn">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="font-bold text-teal-900 dark:text-teal-200 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 animate-pulse inline-block" />
                  <span>แผ่นสติกเกอร์ 40 ดวง (8 แถว × 5 ช่อง แนวนอน • สติกเกอร์ 38 × 19 มม.)</span>
                </div>
                <span className="text-teal-300 dark:text-teal-700 hidden sm:inline">|</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">เริ่มพิมพ์จากช่องที่:</span>
                  <input
                    type="number"
                    min={1}
                    max={40}
                    value={startPosition}
                    onChange={(e) => setStartPosition(Math.max(1, Math.min(40, parseInt(e.target.value) || 1)))}
                    className="w-14 px-2 py-1 text-center font-bold bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-lg text-teal-800 dark:text-teal-200 focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">(1-40 สำหรับแผ่นเดิมที่แกะใช้ไปบางส่วน)</span>
                </div>
              </div>

              <label className="flex items-center gap-1.5 cursor-pointer select-none font-semibold text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={showBorders}
                  onChange={(e) => setShowBorders(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                />
                <span>แสดงเส้นประไกด์ตำแหน่งดวงสติกเกอร์</span>
              </label>
            </div>

            {/* Print Help Guide */}
            <div className="p-2.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                <span>💡 พิมพ์ลงกระดาษตราช้าง A7 (19×38 มม.):</span>
              </div>
              <div className="text-[10.5px] leading-relaxed text-amber-700 dark:text-amber-300 space-y-0.5">
                <div>• <b>แนะนำที่สุด (ตรงช่อง 100%):</b> กดปุ่ม <b>&quot;ดาวน์โหลด PDF (ตราช้าง A7)&quot;</b> ด้านล่าง เพื่อพิมพ์ไฟล์ PDF ล็อกขนาดพอดีเป๊ะ หรือดาวน์โหลดเป็นไฟล์ Word (.docx)</div>
                <div>• <b>พิมพ์ผ่านเบราว์เซอร์ Chrome:</b> ตั้งระยะขอบ (Margins) = <b>&quot;None&quot; (ไม่มี)</b> • มาตราส่วน (Scale) = <b>100%</b> • เอาติ๊กถูกออกที่ &quot;ส่วนหัวและส่วนท้าย&quot;</div>
              </div>
            </div>
          </div>
        )}

        {/* Selection summary & quick actions */}
        <div className="py-2.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          <div>
            เลือกแล้ว: <strong className="text-teal-600 dark:text-teal-400 font-bold">{totalAssetsCount}</strong> ชิ้นครุภัณฑ์
            {' '}(พิมพ์ทั้งหมด <strong className="text-slate-900 dark:text-slate-100 font-bold">{totalStickersCount}</strong> ดวง)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={selectAll}
              className="text-teal-600 dark:text-teal-400 hover:underline font-semibold cursor-pointer"
            >
              เลือกทั้งหมด
            </button>
            <span>•</span>
            <button
              onClick={deselectAll}
              className="text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 font-semibold cursor-pointer"
            >
              ล้างการเลือก
            </button>
          </div>
        </div>

        {/* List of Equipment Items */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
              ไม่พบรายการครุภัณฑ์ที่ตรงกับการค้นหา
            </div>
          ) : (
            filteredItems.map((item) => {
              const itemAssets = item.assetItems || [];
              const selectedInItem = itemAssets.filter((a) => selectedAssetIds.includes(a.id)).length;
              const isAllSelected = itemAssets.length > 0 && selectedInItem === itemAssets.length;
              const isPartiallySelected = selectedInItem > 0 && selectedInItem < itemAssets.length;
              const isExpanded = expandedItemIds.includes(item.id);

              return (
                <div key={item.id} className="pt-3 first:pt-0">
                  {/* Item Header Row */}
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        onClick={() => toggleItemAssets(item)}
                        className="text-teal-600 dark:text-teal-400 cursor-pointer"
                      >
                        {isAllSelected ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : isPartiallySelected ? (
                          <div className="w-5 h-5 rounded border-2 border-teal-600 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 bg-teal-600 rounded-sm" />
                          </div>
                        ) : (
                          <Square className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0" onClick={() => toggleExpand(item.id)}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {item.name}
                          </span>
                          <span className="font-mono text-[10px] bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 px-1.5 py-0.2 rounded font-semibold">
                            {item.code}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{item.brand || item.model ? `${item.brand || ''} ${item.model || ''}`.trim() : 'ไม่ระบุรุ่น'}</span>
                          <span>•</span>
                          <span>
                            เลือก {selectedInItem} จาก {itemAssets.length} {item.unit || 'ชิ้น'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleExpand(item.id)}
                      className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                    >
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Expanded Asset Units */}
                  {isExpanded && (
                    <div className="ml-8 mt-2 space-y-2 pl-3 border-l-2 border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {itemAssets.filter((a) => showRetired ? true : a.status !== 'RETIRED').map((asset) => {
                          const isSelected = selectedAssetIds.includes(asset.id);
                          return (
                            <div
                              key={asset.id}
                              onClick={() => toggleAsset(asset.id)}
                              className={`p-2.5 rounded-xl border transition cursor-pointer flex items-start gap-2.5 ${
                                isSelected
                                  ? 'bg-teal-50/60 dark:bg-teal-950/40 border-teal-400 dark:border-teal-700'
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                              }`}
                            >
                              <div className="pt-0.5 text-teal-600 dark:text-teal-400">
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-mono font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                                  {asset.govAssetCode || asset.assetCode}
                                </div>
                                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center justify-between mt-0.5">
                                  <span>{item.unit || 'เครื่อง'}ที่ {asset.sequenceNumber || 1}</span>
                                  <span className="font-mono text-[10px] text-slate-400">({asset.assetCode})</span>
                                </div>
                                <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                  📍 {asset.location || item.location || 'ห้องแล็บ'}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            พิมพ์เรียงตามรายการครุภัณฑ์และหมายเลขลำดับรายชิ้นอย่างเป็นระเบียบ
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              ยกเลิก
            </button>
            {labelSize === 'template_doc' && (
              <>
                <button
                  type="button"
                  onClick={handleExportPdf}
                  disabled={isGenerating || totalAssetsCount === 0 || isExportingPdf}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition cursor-pointer disabled:opacity-50"
                  title="ดาวน์โหลดไฟล์ PDF ขนาด 205×175 มม. ล็อกขนาดพอดีเป๊ะ สั่งพิมพ์ได้ตรงช่องสติกเกอร์ 100%"
                >
                  <FileDown className="w-4 h-4" />
                  <span>{isExportingPdf ? 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF (ตราช้าง A7)'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportDocx}
                  disabled={isGenerating || totalAssetsCount === 0 || isExportingDocx}
                  className="inline-flex items-center gap-1 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                  title="ดาวน์โหลดไฟล์ Microsoft Word (.docx)"
                >
                  <span>Word (.docx)</span>
                </button>
              </>
            )}
            <button
              onClick={handlePrint}
              disabled={isGenerating || totalAssetsCount === 0}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 transition cursor-pointer disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>
                {isGenerating
                  ? 'กำลังสร้างสติกเกอร์...'
                  : labelSize === 'template_doc'
                  ? `พิมพ์ ${totalStickersCount} ดวง (เทมเพลต 175×205 มม. • ${Math.ceil((totalStickersCount + (startPosition - 1)) / 40)} แผ่น)`
                  : `พิมพ์ ${totalStickersCount} ใบ (A4)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

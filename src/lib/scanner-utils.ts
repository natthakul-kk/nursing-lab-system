/**
 * Universal Scanner & Code Parser Utility
 * ถอดรหัส QR Code (URL, JSON, Token) และ Barcode ทุกรูปแบบให้เป็น Clean Code อัตโนมัติ
 */

export interface ParsedScanResult {
  raw: string;
  cleanCode: string;
  detectedType: 'ASSET' | 'CONSUMABLE' | 'PRACTICE' | 'USER' | 'UNKNOWN';
}

/**
 * สกัดรหัสจริง (Clean Code) จากข้อความที่สแกนได้ ไม่ว่าจะเป็น URL, JSON, หรือ Barcode ธรรมดา
 */
export function extractCleanCode(rawInput: string | null | undefined): ParsedScanResult {
  if (!rawInput) {
    return { raw: '', cleanCode: '', detectedType: 'UNKNOWN' };
  }

  // 1. Clean whitespace, invisible characters, BOM, and newlines from scanner guns
  let text = String(rawInput)
    .replace(/^\uFEFF/, '') // Remove BOM
    .trim()
    .replace(/[\r\n\t]+/g, ''); // Remove CR/LF commonly sent by barcode guns

  if (!text) {
    return { raw: rawInput, cleanCode: '', detectedType: 'UNKNOWN' };
  }

  // 2. ตรวจสอบกรณีเป็น JSON String เช่น {"assetCode": "EQ-01"}
  if ((text.startsWith('{') && text.endsWith('}')) || (text.startsWith('[') && text.endsWith(']'))) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) {
        if (parsed.assetCode) {
          return { raw: rawInput, cleanCode: String(parsed.assetCode).trim(), detectedType: 'ASSET' };
        }
        if (parsed.boxCode) {
          return { raw: rawInput, cleanCode: String(parsed.boxCode).trim(), detectedType: 'CONSUMABLE' };
        }
        if (parsed.packCode) {
          return { raw: rawInput, cleanCode: String(parsed.packCode).trim(), detectedType: 'CONSUMABLE' };
        }
        if (parsed.lotNumber) {
          return { raw: rawInput, cleanCode: String(parsed.lotNumber).trim(), detectedType: 'CONSUMABLE' };
        }
        if (parsed.token) {
          return { raw: rawInput, cleanCode: String(parsed.token).trim(), detectedType: 'PRACTICE' };
        }
        if (parsed.studentId) {
          return { raw: rawInput, cleanCode: String(parsed.studentId).trim(), detectedType: 'USER' };
        }
        if (parsed.code) {
          return { raw: rawInput, cleanCode: String(parsed.code).trim(), detectedType: 'UNKNOWN' };
        }
      }
    } catch {
      // Not valid JSON, continue
    }
  }

  // 3. ตรวจสอบกรณีเป็น URL ลิงก์ (เช่น สติกเกอร์ QR Code ที่พิมพ์ออกมาจากระบบ)
  // ตัวอย่าง:
  // http://localhost:3000/asset/EQ-MNK-001
  // https://nurse-lab.edu/equipment/EQ-AED-01
  // http://192.168.1.50:3000/consumable/CS-SHP-01-2569-B001
  // http://.../practice?token=SPK-2026-0001
  const isUrl = /^https?:\/\//i.test(text) || text.includes('/asset/') || text.includes('/equipment/') || text.includes('/consumable/') || text.includes('/practice');

  if (isUrl) {
    try {
      // 3.1 ตรวจสอบ URL พัสดุครุภัณฑ์ /asset/[code]
      const assetMatch = text.match(/\/asset\/([^\/\?#]+)/i);
      if (assetMatch && assetMatch[1]) {
        const decoded = decodeURIComponent(assetMatch[1]).trim();
        return { raw: rawInput, cleanCode: decoded, detectedType: 'ASSET' };
      }

      // 3.2 ตรวจสอบ URL ครุภัณฑ์ /equipment/[code]
      const equipMatch = text.match(/\/equipment\/([^\/\?#]+)/i);
      if (equipMatch && equipMatch[1]) {
        const decoded = decodeURIComponent(equipMatch[1]).trim();
        return { raw: rawInput, cleanCode: decoded, detectedType: 'ASSET' };
      }

      // 3.3 ตรวจสอบ URL วัสดุสิ้นเปลือง / กล่อง / ซอง /consumable/[code]
      const consumableMatch = text.match(/\/consumable\/([^\/\?#]+)/i);
      if (consumableMatch && consumableMatch[1]) {
        const decoded = decodeURIComponent(consumableMatch[1]).trim();
        return { raw: rawInput, cleanCode: decoded, detectedType: 'CONSUMABLE' };
      }

      // 3.4 ตรวจสอบ URL ฝึกปฏิบัติ OSCE / Practice Token
      const practiceTokenMatch = text.match(/[?&]token=([^\/\?#&]+)/i);
      if (practiceTokenMatch && practiceTokenMatch[1]) {
        const decoded = decodeURIComponent(practiceTokenMatch[1]).trim();
        return { raw: rawInput, cleanCode: decoded, detectedType: 'PRACTICE' };
      }

      // 3.5 กรณีเป็น URL ทั่วไปที่ลงท้ายด้วยรหัส เช่น http://.../item/ABC-123
      const parsedUrl = new URL(text.startsWith('http') ? text : `http://${text}`);
      const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);
      if (pathSegments.length > 0) {
        const lastSegment = decodeURIComponent(pathSegments[pathSegments.length - 1]).trim();
        if (lastSegment) {
          return { raw: rawInput, cleanCode: lastSegment, detectedType: detectTypeFromCode(lastSegment) };
        }
      }
    } catch {
      // URL parsing failed, fall back to string scanning
    }
  }

  // 4. กรณีเป็นข้อความหรือบาร์โค้ดธรรมดา (Plain Barcode / Text)
  const cleanCode = text;
  const detectedType = detectTypeFromCode(cleanCode);

  return {
    raw: rawInput,
    cleanCode,
    detectedType,
  };
}

/**
 * วิเคราะห์ประเภทของรหัสจาก Prefix หรือ Pattern ของรหัสในระบบ
 */
function detectTypeFromCode(code: string): 'ASSET' | 'CONSUMABLE' | 'PRACTICE' | 'USER' | 'UNKNOWN' {
  if (!code) return 'UNKNOWN';
  const upper = code.toUpperCase();

  // Practice Booking Token
  if (upper.startsWith('SPK-') || upper.startsWith('SPB-')) {
    return 'PRACTICE';
  }

  // User / Student ID
  if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(code)) {
    return 'USER'; // Email
  }
  if (/^\d{8,11}$/.test(code)) {
    return 'USER'; // Student ID (8-11 digits)
  }

  // Consumable Box / Repack Pack / Lot
  if (
    upper.startsWith('CON-') ||
    upper.startsWith('CS-') ||
    upper.startsWith('RP-') ||
    upper.startsWith('SL-') ||
    upper.includes('-B') || // Box code เช่น ...-2569-B001
    upper.includes('-P')    // Pack code เช่น ...-P01
  ) {
    return 'CONSUMABLE';
  }

  // Equipment Asset
  if (
    upper.startsWith('EQ-') ||
    upper.startsWith('MED-') ||
    upper.startsWith('MNK-') ||
    upper.startsWith('PRO-') ||
    upper.startsWith('AED-') ||
    upper.startsWith('KD-') ||
    upper.startsWith('AMM-') ||
    upper.includes('/') // Gov Asset Code เช่น 7440-001-0001/2569
  ) {
    return 'ASSET';
  }

  return 'UNKNOWN';
}

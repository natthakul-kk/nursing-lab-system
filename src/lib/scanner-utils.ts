/**
 * Universal Scanner & Code Parser Utility
 * ถอดรหัส QR Code (URL, JSON, Token) และ Barcode ทุกรูปแบบให้เป็น Clean Code อัตโนมัติ
 */

export interface ParsedScanResult {
  raw: string;
  cleanCode: string;
  detectedType: 'ASSET' | 'CONSUMABLE' | 'PRACTICE' | 'USER' | 'STORAGE' | 'STORAGE_ROOM' | 'UNKNOWN';
  itemCode?: string;
  lotNumber?: string;
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
  const isUrl = /^https?:\/\//i.test(text) || text.includes('/asset/') || text.includes('/equipment/') || text.includes('/consumable/') || text.includes('/practice') || text.includes('/storage/');

  if (isUrl) {
    try {
      // 3.1 ตรวจสอบ URL ตู้จัดเก็บห้องแล็บ /storage/room/[code]
      const storageRoomMatch = text.match(/\/storage\/room\/(.+?)(?:[\?#]|$)/i);
      if (storageRoomMatch && storageRoomMatch[1]) {
        try {
          const decoded = decodeURIComponent(storageRoomMatch[1]).trim();
          return { raw: rawInput, cleanCode: decoded, detectedType: 'STORAGE_ROOM' };
        } catch {
          return { raw: rawInput, cleanCode: storageRoomMatch[1].trim(), detectedType: 'STORAGE_ROOM' };
        }
      }

      // 3.2 ตรวจสอบ URL ตู้/ชั้นจัดเก็บ /storage/[code]
      const storageMatch = text.match(/\/storage\/(.+?)(?:[\?#]|$)/i);
      if (storageMatch && storageMatch[1]) {
        try {
          const decoded = decodeURIComponent(storageMatch[1]).trim();
          return { raw: rawInput, cleanCode: decoded, detectedType: 'STORAGE' };
        } catch {
          return { raw: rawInput, cleanCode: storageMatch[1].trim(), detectedType: 'STORAGE' };
        }
      }

      // 3.3 ตรวจสอบ URL พัสดุครุภัณฑ์ /asset/[code]
      const assetMatch = text.match(/\/asset\/(.+?)(?:[\?#]|$)/i);
      if (assetMatch && assetMatch[1]) {
        try {
          const decoded = decodeURIComponent(assetMatch[1]).trim();
          return { raw: rawInput, cleanCode: decoded, detectedType: 'ASSET' };
        } catch {
          return { raw: rawInput, cleanCode: assetMatch[1].trim(), detectedType: 'ASSET' };
        }
      }

      // 3.4 ตรวจสอบ URL ครุภัณฑ์ /equipment/[code]
      const equipMatch = text.match(/\/equipment\/(.+?)(?:[\?#]|$)/i);
      if (equipMatch && equipMatch[1]) {
        try {
          const decoded = decodeURIComponent(equipMatch[1]).trim();
          return { raw: rawInput, cleanCode: decoded, detectedType: 'ASSET' };
        } catch {
          return { raw: rawInput, cleanCode: equipMatch[1].trim(), detectedType: 'ASSET' };
        }
      }

      // 3.5 ตรวจสอบ URL วัสดุสิ้นเปลือง / กล่อง / ซอง / ล็อต /consumable/[code]
      const consumableMatch = text.match(/\/consumable\/(.+?)(?:[\?#]|$)/i);
      if (consumableMatch && consumableMatch[1]) {
        try {
          const decoded = decodeURIComponent(consumableMatch[1]).trim();
          const lotMatch = text.match(/[?&]lot=([^&#]+)/i);
          let lotNumber: string | undefined = undefined;
          if (lotMatch && lotMatch[1]) {
            try {
              lotNumber = decodeURIComponent(lotMatch[1]).trim();
            } catch {
              lotNumber = lotMatch[1].trim();
            }
          }

          if (lotNumber) {
            return {
              raw: rawInput,
              cleanCode: `${decoded}?lot=${lotNumber}`,
              itemCode: decoded,
              lotNumber,
              detectedType: 'CONSUMABLE',
            };
          }

          return { raw: rawInput, cleanCode: decoded, detectedType: 'CONSUMABLE' };
        } catch {
          return { raw: rawInput, cleanCode: consumableMatch[1].trim(), detectedType: 'CONSUMABLE' };
        }
      }

      // 3.6 ตรวจสอบ URL ฝึกปฏิบัติ OSCE / Practice Token
      const practiceTokenMatch = text.match(/[?&]token=([^\/\?#&]+)/i);
      if (practiceTokenMatch && practiceTokenMatch[1]) {
        try {
          const decoded = decodeURIComponent(practiceTokenMatch[1]).trim();
          return { raw: rawInput, cleanCode: decoded, detectedType: 'PRACTICE' };
        } catch {
          return { raw: rawInput, cleanCode: practiceTokenMatch[1].trim(), detectedType: 'PRACTICE' };
        }
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
function detectTypeFromCode(code: string): 'ASSET' | 'CONSUMABLE' | 'PRACTICE' | 'USER' | 'STORAGE' | 'STORAGE_ROOM' | 'UNKNOWN' {
  if (!code) return 'UNKNOWN';
  const upper = code.toUpperCase();

  // Storage Room (เช่น LAB-01-1, LAB-SIM-MAN)
  if (upper.startsWith('LAB-')) {
    return 'STORAGE_ROOM';
  }

  // Storage Location / Cabinet / Shelf (เช่น CAB-01, SHELF-01, STORE-01, CART-01, DRAWER-01)
  if (
    upper.startsWith('CAB-') ||
    upper.startsWith('SHELF-') ||
    upper.startsWith('CART-') ||
    upper.startsWith('STORE-') ||
    upper.startsWith('DRAWER-')
  ) {
    return 'STORAGE';
  }

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

  // Consumable Box / Repack Pack / Lot (รวมรหัสล็อตราชการที่มี อว. และเลขคำสั่ง)
  if (
    code.startsWith('อว') ||
    upper.startsWith('LOT') ||
    upper.startsWith('CON-') ||
    upper.startsWith('CS-') ||
    upper.startsWith('RP-') ||
    upper.startsWith('SL-') ||
    upper.includes('-B') || // Box code เช่น ...-2569-B001
    upper.includes('-P')    // Pack code เช่น ...-P01
  ) {
    return 'CONSUMABLE';
  }

  // Equipment Asset (รวมรหัสครุภัณฑ์ราชการ เช่น 7440-001-0001/2569)
  if (
    upper.startsWith('EQ-') ||
    upper.startsWith('MED-') ||
    upper.startsWith('MNK-') ||
    upper.startsWith('PRO-') ||
    upper.startsWith('AED-') ||
    upper.startsWith('KD-') ||
    upper.startsWith('AMM-') ||
    (/^\d{4}/.test(code) && code.includes('/')) // Gov Asset Code เช่น 7440-001-0001/2569
  ) {
    return 'ASSET';
  }

  return 'UNKNOWN';
}

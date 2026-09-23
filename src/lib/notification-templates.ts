import { prisma } from '@/lib/prisma';

export interface DefaultTemplateConfig {
  id: string;
  category: 'BORROW' | 'REQUISITION' | 'ROOM' | 'PRACTICE' | 'SYSTEM';
  name: string;
  description: string;
  title: string;
  message: string;
  variables: { name: string; label: string }[];
}

export const DEFAULT_NOTIFICATION_TEMPLATES: DefaultTemplateConfig[] = [
  // 1. หมวดการยืม-คืนอุปกรณ์ (Borrow)
  {
    id: 'BORROW_REQUEST_SUBMITTED',
    category: 'BORROW',
    name: 'มีคำขอยืมอุปกรณ์ใหม่ (แจ้งเตือนผู้อนุมัติ/เจ้าหน้าที่)',
    description: 'ส่งแจ้งเตือนไปยังผู้อนุมัติและเจ้าหน้าที่เมื่อนิสิตยื่นส่งคำขอยืมอุปกรณ์',
    title: 'มีคำขอยืมอุปกรณ์ใหม่จากนิสิต',
    message: 'นิสิต {studentName} ได้ส่งคำขอยืมอุปกรณ์ รหัส {requestNumber} ({itemSummary}) กรุณาตรวจสอบและดำเนินการ',
    variables: [
      { name: 'studentName', label: 'ชื่อนิสิตผู้ยื่น' },
      { name: 'requestNumber', label: 'รหัสคำขอ' },
      { name: 'itemSummary', label: 'สรุปรายการอุปกรณ์' },
    ],
  },
  {
    id: 'BORROW_APPROVED',
    category: 'BORROW',
    name: 'คำขอยืมอุปกรณ์ได้รับการอนุมัติ (แจ้งเตือนนิสิต)',
    description: 'ส่งแจ้งเตือนไปยังนิสิตเมื่อคำขอยืมได้รับการอนุมัติเรียบร้อยแล้ว',
    title: 'คำขอยืมอุปกรณ์ได้รับการอนุมัติแล้ว',
    message: 'คำขอยืมอุปกรณ์ {requestNumber} ได้รับการอนุมัติเรียบร้อยแล้ว กรุณาติดต่อรับอุปกรณ์ตามกำหนดเวลา',
    variables: [
      { name: 'studentName', label: 'ชื่อนิสิต' },
      { name: 'requestNumber', label: 'รหัสคำขอ' },
      { name: 'approverName', label: 'ชื่อผู้อนุมัติ' },
    ],
  },
  {
    id: 'BORROW_REJECTED',
    category: 'BORROW',
    name: 'คำขอยืมอุปกรณ์ไม่ผ่านการอนุมัติ (แจ้งเตือนนิสิต)',
    description: 'ส่งแจ้งเตือนไปยังนิสิตเมื่อคำขอยืมถูกปฏิเสธหรือไม่ผ่านการอนุมัติ',
    title: 'คำขอยืมอุปกรณ์ไม่ผ่านการอนุมัติ',
    message: 'คำขอยืมอุปกรณ์ {requestNumber} ไม่ผ่านการอนุมัติ เนื่องจาก: {reason}',
    variables: [
      { name: 'studentName', label: 'ชื่อนิสิต' },
      { name: 'requestNumber', label: 'รหัสคำขอ' },
      { name: 'reason', label: 'เหตุผลที่ไม่อนุมัติ' },
    ],
  },

  // 2. หมวดการเบิกวัสดุสิ้นเปลือง (Requisition)
  {
    id: 'REQUISITION_REQUEST_SUBMITTED',
    category: 'REQUISITION',
    name: 'มีคำขอเบิกวัสดุสิ้นเปลืองใหม่ (แจ้งเตือนผู้อนุมัติ/เจ้าหน้าที่)',
    description: 'ส่งแจ้งเตือนไปยังผู้อนุมัติและเจ้าหน้าที่เมื่อนิสิตยื่นส่งคำขอเบิกวัสดุ',
    title: 'มีคำขอเบิกวัสดุสิ้นเปลืองใหม่จากนิสิต',
    message: 'นิสิต {studentName} ได้ส่งคำขอเบิกวัสดุ รหัส {requestNumber} ({itemSummary}) กรุณาตรวจสอบและดำเนินการ',
    variables: [
      { name: 'studentName', label: 'ชื่อนิสิตผู้ยื่น' },
      { name: 'requestNumber', label: 'รหัสคำขอ' },
      { name: 'itemSummary', label: 'สรุปรายการวัสดุ' },
    ],
  },
  {
    id: 'REQUISITION_APPROVED',
    category: 'REQUISITION',
    name: 'คำขอเบิกวัสดุได้รับการอนุมัติ (แจ้งเตือนนิสิต)',
    description: 'ส่งแจ้งเตือนไปยังนิสิตเมื่อคำขอเบิกวัสดุได้รับการอนุมัติ',
    title: 'คำขอเบิกวัสดุได้รับการอนุมัติแล้ว',
    message: 'คำขอเบิกวัสดุ {requestNumber} ได้รับการอนุมัติเรียบร้อยแล้ว กรุณาติดต่อรับวัสดุตามกำหนดเวลา',
    variables: [
      { name: 'studentName', label: 'ชื่อนิสิต' },
      { name: 'requestNumber', label: 'รหัสคำขอ' },
      { name: 'approverName', label: 'ชื่อผู้อนุมัติ' },
    ],
  },
  {
    id: 'REQUISITION_REJECTED',
    category: 'REQUISITION',
    name: 'คำขอเบิกวัสดุไม่ผ่านการอนุมัติ (แจ้งเตือนนิสิต)',
    description: 'ส่งแจ้งเตือนไปยังนิสิตเมื่อคำขอเบิกวัสดุถูกปฏิเสธ',
    title: 'คำขอเบิกวัสดุไม่ผ่านการอนุมัติ',
    message: 'คำขอเบิกวัสดุ {requestNumber} ไม่ผ่านการอนุมัติ เนื่องจาก: {reason}',
    variables: [
      { name: 'studentName', label: 'ชื่อนิสิต' },
      { name: 'requestNumber', label: 'รหัสคำขอ' },
      { name: 'reason', label: 'เหตุผลที่ไม่อนุมัติ' },
    ],
  },

  // 3. หมวดการจองห้องปฏิบัติการ (Room Booking)
  {
    id: 'ROOM_BOOKING_SUBMITTED',
    category: 'ROOM',
    name: 'มีคำขอจองห้องปฏิบัติการใหม่ (แจ้งเตือนผู้อนุมัติ/เจ้าหน้าที่)',
    description: 'ส่งแจ้งเตือนไปยังผู้อนุมัติและเจ้าหน้าที่เมื่อมีการจองห้องปฏิบัติการ',
    title: 'มีคำขอจองห้องปฏิบัติการใหม่',
    message: 'ผู้ยื่นคำขอ {studentName} ได้ส่งคำขอจองห้อง {roomName} วันที่ {date} ({bookingNumber}) กรุณาตรวจสอบและดำเนินการ',
    variables: [
      { name: 'studentName', label: 'ชื่อผู้ยื่นจอง' },
      { name: 'roomName', label: 'ชื่อห้องปฏิบัติการ' },
      { name: 'date', label: 'วันที่ใช้งาน' },
      { name: 'bookingNumber', label: 'รหัสการจอง' },
    ],
  },
  {
    id: 'ROOM_BOOKING_APPROVED',
    category: 'ROOM',
    name: 'คำขอจองห้องปฏิบัติการได้รับการอนุมัติ (แจ้งเตือนผู้จอง)',
    description: 'ส่งแจ้งเตือนไปยังผู้จองเมื่อคำขอจองห้องปฏิบัติการได้รับการอนุมัติ',
    title: 'คำขอจองห้องปฏิบัติการได้รับการอนุมัติแล้ว',
    message: 'คำขอจองห้อง {roomName} วันที่ {date} ได้รับการอนุมัติเรียบร้อยแล้ว',
    variables: [
      { name: 'studentName', label: 'ชื่อผู้ยื่นจอง' },
      { name: 'roomName', label: 'ชื่อห้องปฏิบัติการ' },
      { name: 'date', label: 'วันที่ใช้งาน' },
      { name: 'bookingNumber', label: 'รหัสการจอง' },
    ],
  },
  {
    id: 'ROOM_BOOKING_REJECTED',
    category: 'ROOM',
    name: 'คำขอจองห้องปฏิบัติการไม่ผ่านการอนุมัติ (แจ้งเตือนผู้จอง)',
    description: 'ส่งแจ้งเตือนไปยังผู้จองเมื่อคำขอจองห้องปฏิบัติการถูกปฏิเสธ',
    title: 'คำขอจองห้องปฏิบัติการไม่ผ่านการอนุมัติ',
    message: 'คำขอจองห้อง {roomName} วันที่ {date} ไม่ผ่านการอนุมัติ เนื่องจาก: {reason}',
    variables: [
      { name: 'studentName', label: 'ชื่อผู้ยื่นจอง' },
      { name: 'roomName', label: 'ชื่อห้องปฏิบัติการ' },
      { name: 'date', label: 'วันที่ใช้งาน' },
      { name: 'reason', label: 'เหตุผลที่ไม่อนุมัติ' },
      { name: 'bookingNumber', label: 'รหัสการจอง' },
    ],
  },

  // 4. หมวดการจองฝึกปฏิบัติทักษะด้วยตนเอง (Practice OSCE)
  {
    id: 'PRACTICE_BOOKING_SUBMITTED',
    category: 'PRACTICE',
    name: 'มีคำขอจองฝึกปฏิบัติตามอิสระใหม่ (แจ้งเตือนผู้อนุมัติ/เจ้าหน้าที่)',
    description: 'ส่งแจ้งเตือนไปยังผู้อนุมัติเมื่อนิสิตจองช่วงเวลาฝึกปฏิบัติการพยาบาล',
    title: 'มีคำขอจองฝึกปฏิบัติตามอิสระใหม่จากนิสิต',
    message: 'นิสิต {studentName} ได้จองฝึกปฏิบัติห้อง {roomName} วันที่ {date} เวลา {timeSlot}',
    variables: [
      { name: 'studentName', label: 'ชื่อนิสิต' },
      { name: 'roomName', label: 'ห้องปฏิบัติการ' },
      { name: 'date', label: 'วันที่' },
      { name: 'timeSlot', label: 'ช่วงเวลา' },
      { name: 'bookingNumber', label: 'รหัสการจอง' },
    ],
  },
  {
    id: 'PRACTICE_BOOKING_APPROVED',
    category: 'PRACTICE',
    name: 'คำขอจองฝึกปฏิบัติได้รับการอนุมัติ (แจ้งเตือนนิสิต)',
    description: 'ส่งแจ้งเตือนไปยังนิสิตเมื่อการจองฝึกปฏิบัติได้รับการอนุมัติ',
    title: 'คำขอจองฝึกปฏิบัติได้รับการอนุมัติแล้ว',
    message: 'คำขอจองฝึกปฏิบัติห้อง {roomName} วันที่ {date} เวลา {timeSlot} ได้รับการอนุมัติเรียบร้อยแล้ว',
    variables: [
      { name: 'studentName', label: 'ชื่อนิสิต' },
      { name: 'roomName', label: 'ห้องปฏิบัติการ' },
      { name: 'date', label: 'วันที่' },
      { name: 'timeSlot', label: 'ช่วงเวลา' },
      { name: 'bookingNumber', label: 'รหัสการจอง' },
    ],
  },
  {
    id: 'PRACTICE_BOOKING_REJECTED',
    category: 'PRACTICE',
    name: 'คำขอจองฝึกปฏิบัติไม่ผ่านการอนุมัติ (แจ้งเตือนนิสิต)',
    description: 'ส่งแจ้งเตือนไปยังนิสิตเมื่อการจองฝึกปฏิบัติถูกปฏิเสธ',
    title: 'คำขอจองฝึกปฏิบัติไม่ผ่านการอนุมัติ',
    message: 'คำขอจองฝึกปฏิบัติห้อง {roomName} ไม่ผ่านการอนุมัติ เนื่องจาก: {reason}',
    variables: [
      { name: 'studentName', label: 'ชื่อนิสิต' },
      { name: 'roomName', label: 'ห้องปฏิบัติการ' },
      { name: 'date', label: 'วันที่' },
      { name: 'reason', label: 'เหตุผลที่ไม่อนุมัติ' },
      { name: 'bookingNumber', label: 'รหัสการจอง' },
    ],
  },

  // 5. หมวดระบบเตือนกำหนดคืน & คลังพัสดุ (System & Inventory Alerts)
  {
    id: 'RETURN_DUE_REMINDER',
    category: 'SYSTEM',
    name: 'แจ้งเตือนใกล้ถึงกำหนดคืนอุปกรณ์ (แจ้งเตือนนิสิต)',
    description: 'ส่งแจ้งเตือนล่วงหน้า 1 วัน ก่อนถึงกำหนดส่งคืนอุปกรณ์',
    title: 'แจ้งเตือนกำหนดคืนอุปกรณ์',
    message: 'อุปกรณ์ตามคำขอ {requestNumber} มีกำหนดคืนในวันพรุ่งนี้ ({dueDate}) กรุณาส่งคืนให้ตรงเวลา',
    variables: [
      { name: 'studentName', label: 'ชื่อนิสิต' },
      { name: 'requestNumber', label: 'รหัสคำขอ' },
      { name: 'dueDate', label: 'วันที่กำหนดคืน' },
    ],
  },
  {
    id: 'RETURN_OVERDUE',
    category: 'SYSTEM',
    name: 'เตือนเลยกำหนดส่งคืนอุปกรณ์ (แจ้งเตือนนิสิต & เจ้าหน้าที่)',
    description: 'ส่งแจ้งเตือนเมื่อคำขอยืมเลยกำหนดเวลาส่งคืนอุปกรณ์แล้ว',
    title: 'เตือนเลยกำหนดส่งคืนอุปกรณ์',
    message: 'คำขอยืมอุปกรณ์ {requestNumber} เลยกำหนดส่งคืนแล้ว ({dueDate}) กรุณาดำเนินการส่งคืนโดยด่วน',
    variables: [
      { name: 'studentName', label: 'ชื่อนิสิต' },
      { name: 'requestNumber', label: 'รหัสคำขอ' },
      { name: 'dueDate', label: 'วันที่กำหนดคืน' },
    ],
  },
  {
    id: 'STOCK_LOW_ALERT',
    category: 'SYSTEM',
    name: 'แจ้งเตือนวัสดุ/อุปกรณ์ใกล้หมด (แจ้งเตือนเจ้าหน้าที่/แอดมิน)',
    description: 'ส่งแจ้งเตือนเมื่อจำนวนพัสดุหรือวัสดุในคลังลดลงต่ำกว่าเกณฑ์ขั้นต่ำ',
    title: 'แจ้งเตือนวัสดุ/อุปกรณ์ใกล้หมด',
    message: 'รายการ {itemName} เหลือจำนวน {currentQuantity} {unit} ซึ่งต่ำกว่าเกณฑ์ขั้นต่ำ ({minQuantity} {unit})',
    variables: [
      { name: 'itemName', label: 'ชื่อพัสดุ/วัสดุ' },
      { name: 'currentQuantity', label: 'จำนวนคงเหลือ' },
      { name: 'minQuantity', label: 'เกณฑ์ขั้นต่ำ' },
      { name: 'unit', label: 'หน่วยนับ' },
    ],
  },
];

/**
 * แทนที่ตัวแปร {variable} ในข้อความด้วยค่าจริง
 */
export function interpolateVariables(template: string, vars: Record<string, string | number | undefined | null>): string {
  if (!template) return '';
  let result = template;

  // แผนที่จับคู่ชื่อตัวแปรทั้งภาษาอังกฤษและภาษาไทย
  const aliasMap: Record<string, string[]> = {
    studentName: ['studentName', 'นิสิต', 'ชื่อนิสิต', 'userName'],
    requestNumber: ['requestNumber', 'รหัสคำขอ'],
    itemSummary: ['itemSummary', 'รายการ', 'สรุปรายการ'],
    approverName: ['approverName', 'ผู้อนุมัติ', 'ชื่อผู้อนุมัติ'],
    reason: ['reason', 'เหตุผล', 'เหตุผลที่ไม่อนุมัติ'],
    roomName: ['roomName', 'ห้อง', 'ชื่อห้อง'],
    date: ['date', 'วันที่'],
    timeSlot: ['timeSlot', 'เวลา', 'ช่วงเวลา'],
    bookingNumber: ['bookingNumber', 'รหัสการจอง'],
    dueDate: ['dueDate', 'กำหนดคืน', 'วันที่กำหนดคืน'],
    itemName: ['itemName', 'ชื่อพัสดุ', 'ชื่อวัสดุ'],
    currentQuantity: ['currentQuantity', 'จำนวนคงเหลือ'],
    minQuantity: ['minQuantity', 'เกณฑ์ขั้นต่ำ'],
    unit: ['unit', 'หน่วยนับ', 'หน่วย'],
  };

  for (const [canonicalKey, aliases] of Object.entries(aliasMap)) {
    const val = vars[canonicalKey] ?? '';
    const valStr = val !== undefined && val !== null ? String(val) : '';
    for (const alias of aliases) {
      result = result.replace(new RegExp(`\\{\\s*${alias}\\s*\\}`, 'gi'), valStr);
    }
  }

  // แทนที่ตัวแปรทั่วไปอื่นๆ ที่ส่งเข้ามา
  for (const [key, value] of Object.entries(vars)) {
    const valStr = value !== undefined && value !== null ? String(value) : '';
    result = result.replace(new RegExp(`\\{\\s*${key}\\s*\\}`, 'gi'), valStr);
  }

  return result;
}

/**
 * ดึงเทมเพลตและแปลงข้อความแจ้งเตือนพร้อมใช้งาน
 */
export async function getRenderedNotification(
  templateId: string,
  variables: Record<string, string | number | undefined | null>,
  fallback?: { title: string; message: string }
): Promise<{ title: string; message: string; isActive: boolean }> {
  try {
    const defaultTpl = DEFAULT_NOTIFICATION_TEMPLATES.find((t) => t.id === templateId);

    const dbTemplate = await prisma.notificationTemplate.findUnique({
      where: { id: templateId },
    });

    if (dbTemplate) {
      if (!dbTemplate.isActive) {
        return { title: '', message: '', isActive: false };
      }
      return {
        title: interpolateVariables(dbTemplate.title, variables),
        message: interpolateVariables(dbTemplate.message, variables),
        isActive: true,
      };
    }

    // หากยังไม่มีใน DB ให้ใช้ Default Template
    const titleTpl = defaultTpl?.title || fallback?.title || 'แจ้งเตือนระบบ';
    const messageTpl = defaultTpl?.message || fallback?.message || 'มีการแจ้งเตือนใหม่ในระบบ';

    return {
      title: interpolateVariables(titleTpl, variables),
      message: interpolateVariables(messageTpl, variables),
      isActive: true,
    };
  } catch (error) {
    console.warn(`[NotificationTemplates] Failed to load template ${templateId}:`, error);
    const defaultTpl = DEFAULT_NOTIFICATION_TEMPLATES.find((t) => t.id === templateId);
    const titleTpl = defaultTpl?.title || fallback?.title || 'แจ้งเตือนระบบ';
    const messageTpl = defaultTpl?.message || fallback?.message || 'มีการแจ้งเตือนใหม่ในระบบ';
    return {
      title: interpolateVariables(titleTpl, variables),
      message: interpolateVariables(messageTpl, variables),
      isActive: true,
    };
  }
}

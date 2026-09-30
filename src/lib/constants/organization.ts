/**
 * ข้อมูลส่วนราชการและหน่วยงานกลางของระบบห้องปฏิบัติการพยาบาล
 * 
 * รวมศูนย์เป็น Single Source of Truth
 * สามารถปรับเปลี่ยนชื่อหน่วยงาน คณะ หรือมหาวิทยาลัย ได้ที่ไฟล์นี้ที่เดียว
 * ระบบจะอัปเดตชื่อในหน้าแดชบอร์ดผู้บริหาร, เอกสารรายงาน Excel ราชการ, สติกเกอร์ QR Code และการแจ้งเตือนทั้งหมดโดยอัตโนมัติ
 */

export const ORG_CONFIG = {
  // 1. ชื่อมหาวิทยาลัย
  UNIVERSITY_NAME: 'มหาวิทยาลัยเกษตรศาสตร์',

  // 2. ส่วนราชการระดับคณะ
  FACULTY_NAME: 'คณะพยาบาลศาสตร์',

  // 3. ชื่อหน่วยงานผู้ครอบครอง / ศูนย์ / ห้องปฏิบัติการ (สามารถแก้ไขชื่อได้ที่นี่)
  CUSTODIAN_UNIT_NAME: 'ศูนย์การเรียนรู้ปฏิบัติการทางการพยาบาลเสมือนจริง',

  // 4. ชื่อภาษาอังกฤษสากล
  LAB_EN_NAME: 'Nursing Simulation Learning Center',

  // 5. ชื่อเต็มสำหรับแสดงผลในข้อมูลครุภัณฑ์และแดชบอร์ด
  get FULL_CUSTODIAN_LABEL(): string {
    return `${this.CUSTODIAN_UNIT_NAME} ${this.FACULTY_NAME}`;
  },

  // 6. ชื่อเต็มรวมมหาวิทยาลัย สำหรับเอกสารทางการ
  get FULL_ORG_NAME(): string {
    return `${this.CUSTODIAN_UNIT_NAME} ${this.FACULTY_NAME} ${this.UNIVERSITY_NAME}`;
  },

  // 7. ข้อความส่วนหัวสำหรับแบบฟอร์มทะเบียนพัสดุและครุภัณฑ์ราชการ (Excel)
  get EXCEL_EQUIPMENT_HEADER(): string {
    return `ส่วนราชการ: ${this.FACULTY_NAME} ${this.UNIVERSITY_NAME}       หน่วยงานผู้ครอบครอง: ${this.CUSTODIAN_UNIT_NAME}       ประเภท: ครุภัณฑ์การแพทย์และฝึกทักษะ`;
  },

  // 8. ข้อความส่วนหัวสำหรับแบบฟอร์มบัญชีคุมวัสดุสิ้นเปลือง (Excel)
  get EXCEL_CONSUMABLE_HEADER(): string {
    return `ส่วนราชการ: ${this.FACULTY_NAME} ${this.UNIVERSITY_NAME}       หน่วยงานผู้ครอบครอง: ${this.CUSTODIAN_UNIT_NAME}       ประเภท: วัสดุการแพทย์และเวชภัณฑ์สิ้นเปลือง`;
  },
};

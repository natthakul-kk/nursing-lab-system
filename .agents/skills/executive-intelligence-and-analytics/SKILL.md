---
name: executive-intelligence-and-analytics
description: Expert guidelines for designing 3-tier enterprise dashboards, strategic executive KPIs, cross-system metric synthesis, Zero-PII AI Executive Advisors, and real-time faculty analytics.
---

# Executive Intelligence & Analytics Expert Skill

## 🏛️ 1. มาตรฐานสถาปัตยกรรมแดชบอร์ด 3 ลำดับชั้น (3-Tier Dashboard Architecture)
ทุกระบบย่อยในพอร์ทัลกลางต้องแยกแยะและจัดวางแดชบอร์ดตามลำดับชั้นอย่างเคร่งครัด:

1. **Tier 1: Personal Dashboard (หน้าแรกของแอปย่อย - สำหรับทุกคน):**
   - **Focus:** *"My Work & My Status"* ตอบโจทย์ผู้ใช้งานรายบุคคล (Self-Service)
   - **องค์ประกอบ:** โควตาคงเหลือของฉัน, คำขอล่าสุดที่ฉันยื่น, งานที่ฉันต้องส่งวันนี้, ปุ่ม Quick Action ทำรายการทันที
   - **PDPA Enforcement:** ผู้ใช้ทั่วไปต้องเห็นเฉพาะข้อมูลของตนเอง 100% ห้ามแสดงข้อมูลคนอื่น

2. **Tier 2: Scoped Sub-App Admin Analytics (แท็บรายงานในแอปย่อย - ล็อกสิทธิ์เฉพาะ Sub-App Admin):**
   - **Focus:** *"Domain Operational Metrics"* สถิติและประสิทธิภาพการดำเนินงานระดับแอป
   - **การควบคุมสิทธิ์:** แสดงผลเฉพาะเมื่อ `profile.sub_app_admins.includes(app_id)` หรือ `profile.system_role === 'admin'`
   - **องค์ประกอบ:** สถิติแยกตามภาควิชา/ประเภท, คำขอค้างในสายอนุมัติ, ตารางสรุปเพื่อประกอบการทำเงินเดือนหรือการจัดตาราง

3. **Tier 3: Central Executive Cockpit 360° (ใน `/admin/executive-dashboard` - สำหรับผู้บริหารระดับสูง):**
   - **Focus:** *"Faculty Strategic Overview & Anomaly Detection"* การตัดสินใจเชิงนโยบายและดัชนีสุขภาพองค์กร
   - **หน้าหลัก (Home Tab):** **"🌐 ภาพรวมคณะ 360° (Faculty 360° Overview)"** รวม Vital Signs สำคัญของทุกระบบในหน้าเดียว (วันลา + จองห้อง/Lab + งาน + รถยนต์ + พัสดุ)
   - **หน้าเจาะลึก (Drill-Down Tabs):** สลับดูสถิติและชาร์ตเฉพาะระบบย่อยได้ พร้อมตาราง Drill-down ละเอียด
   - **AI Executive Advisor:** ฝัง Inline Cockpit วิเคราะห์และแนะนำเชิงกลยุทธ์แบบ Real-time

---

## 📊 2. การออกแบบ Strategic KPI Cards (ไม่ใช่แค่ตัวเลขดิบ)
KPI Cards สำหรับผู้บริหารต้องเป็น **"ดัชนีชี้วัดเพื่อการตัดสินใจ (Actionable Decision Metrics)"**:

| หมวดหมู่ | ตัวชี้วัดที่ถูกต้อง (Strategic Metric) | สิ่งที่ไม่ควรทำ (Avoid Raw Counts) |
| :--- | :--- | :--- |
| **วันลา & กำลังคน** | • อัตราการใช้วันลาเทียบกับกำลังคนรวม (% Capacity)<br>• สัดส่วนบุคลากรที่มีความเสี่ยง Burnout<br>• อัตราเปรียบเทียบ YoY | • บอกแค่จำนวนยอดวันลารวมดิบๆ โดยไม่เทียบสัดส่วนอาจารย์ |
| **พื้นที่ & ห้อง Lab** | • Space & Lab Utilization Rate (%) เทียบกับเวลาเปิดทำการ<br>• สัดส่วนชั่วโมงการเรียนการสอนจริง vs การจองชั่วคราว<br>• ช่วงเวลา Peak Load ประจำสัปดาห์ | • บอกแค่ยอดจำนวนครั้งการจอง โดยไม่คำนวณชั่วโมงที่ใช้งานจริง |
| **ประสิทธิภาพการอนุมัติ** | • SLA Velocity: ระยะเวลาอนุมัติเฉลี่ยทั้งคณะ (ชั่วโมง)<br>• จำนวนคำขอที่ติดค้างในสายอนุมัตินานเกิน 48 ชั่วโมง (Bottlenecks) | • บอกแค่ยอด Approved / Pending ธรรมดา |

---

## 🤖 3. มาตรฐานระบบ AI Executive Intelligence (5 Core Architectural Principles)

1. **Zero-PII Sanitation Policy:**
   - ห้ามส่ง PII (ชื่อ-นามสกุล, เลขบัตร, เบอร์โทร, เหตุผลการลาส่วนตัว) ไปยัง AI API (Gemini) เด็ดขาด
   - ต้องใช้ Metric Sanitizer ฟังก์ชัน (เช่น `buildSanitizedLeaveData`, `buildSanitizedRoomData`) สรุปเป็นตัวเลขทางสถิติ (Counts, Ratios, Sums, Department-level averages) ก่อน Prompt LLM เสมอ

2. **Embedded Inline Cockpit View (ห้ามใช้ Modal บังจอ):**
   - AI Insight Card ต้องฝังอยู่บนหน้า Dashboard เคียงคู่กับกราฟ Recharts เสมอ เพื่อให้ผู้บริหารมองเห็นกราฟและอ่านบทวิเคราะห์ได้พร้อมกันในสายตาเดียว
   - รองรับ Collapse/Expand, Quick Inquiry Chips, ปุ่ม Copy ข้อความ, และ Custom Prompt Input

3. **Dynamic Waterfall Auto-Cascade & Zero-Downtime Fallback:**
   - ลำดับ Cascade: `[VITE_GEMINI_MODEL, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']`
   - หาก API ขัดข้องหรือไม่มี API Key ต้อง Failover ไปยัง Internal Smart Synthesizer Engine ทันที เพื่อป้องกันหน้าจอ Crash

4. **Zero-Data Intelligence (Empty State Guard):**
   - เมื่อข้อมูลมี 0 เรคคอร์ด ห้าม AI แต่งตัวเลขหลอก (เช่น แสดง Utilization 100%)
   - ต้องแสดงสถานะความพร้อมของระบบ และแนะนำขั้นตอนตั้งค่าเริ่มต้น

5. **Filter-Aware Dual-Scope Reactivity:**
   - AI ต้องอัปเดตบทวิเคราะห์ตามตัวกรอง 5 มิติ (ปีงบ, แผนก, ประเภท, ไตรมาส, สถานะ)
   - รองรับทั้งมุมมอง `🎯 ตามตัวกรอง (Filtered Scope)` และ `🌐 ภาพรวมทั้งคณะ (Overview Scope)`

---

## 📈 4. การเลือกใช้ชาร์ต Data Visualization (Recharts)
- **Stacked BarChart:** แสดงสัดส่วนประเภทการลา/ประเภทการใช้ห้องแยกตามภาควิชา
- **Multi-Line / Area Chart:** แสดงแนวโน้ม YoY เปรียบเทียบปีงบประมาณก่อนหน้า
- **Heatmap / Distribution Grid:** แสดงช่วงวันและเวลาที่มีการใช้ทรัพยากรหนาแน่นสูงสุด
- **Donut Chart:** แสดงสัดส่วนกลุ่มผู้ใช้งาน หรือสัดส่วนสถานะคำขอ

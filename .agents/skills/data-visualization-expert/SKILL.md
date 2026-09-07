---
name: data-visualization-expert
description: Guidelines and best practices for creating interactive charts, KPI metric cards, data analytics dashboards, and responsive visualizations using Recharts and Lucide icons.
---

# Data Visualization & Dashboard Expert Skill

## Instructions
1. **Library Requirement:** ใช้ไลบรารี `recharts` ในการสร้างกราฟเสมอ เพราะเป็น React-friendly และปรับแต่งได้ง่าย
2. **KPI Cards:** ส่วนบนสุดของ Dashboard ต้องเป็นพื้นที่สำหรับ "KPI Cards" เพื่อสรุปตัวเลขที่สำคัญที่สุด (เช่น ตัวเลขรวม, เปอร์เซ็นต์การเติบโต) พร้อมไอคอนจาก `lucide-react`
3. **Chart Variety:** ในหนึ่ง Dashboard ควรนำเสนอกราฟที่หลากหลายและเหมาะสมกับชุดข้อมูล เช่น:
   - `BarChart`: สำหรับเปรียบเทียบข้อมูลเป็นหมวดหมู่ (เช่น จำนวนวันลาแยกตามฝ่าย)
   - `LineChart`: สำหรับดูแนวโน้มตามช่วงเวลา (เช่น สถิติการเบิกของในแต่ละเดือน)
   - `PieChart` / `DonutChart`: สำหรับดูสัดส่วน (เช่น ประเภทของใบลาที่ถูกใช้)
   - `RadarChart`: สำหรับประเมินศักยภาพหรือมิติที่หลากหลาย
4. **Responsive Grid:** ใช้ Tailwind CSS Grid (เช่น `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`) เพื่อให้กราฟจัดเรียงสวยงามทั้งบนจอคอมพิวเตอร์และมือถือ
5. **Aesthetics:** กราฟต้องเข้ากับธีมหลักของระบบ (รองรับ Neon Dark Mode) ใช้สีที่ดูเป็นมืออาชีพ (เช่น สีฟ้า น้ำเงิน ส้ม เขียว แบบ Pastel หรือ Neon) ไม่ใช้สีที่ฉูดฉาดจนแสบตา และต้องมี Tooltip เมื่อนำเมาส์ไปชี้เสมอ
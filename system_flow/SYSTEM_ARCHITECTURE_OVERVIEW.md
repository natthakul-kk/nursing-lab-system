# ภาพรวมสถาปัตยกรรมและการทำงานทั้งระบบ (System Architecture & Operational Overview)
**ระบบบริหารจัดการห้องปฏิบัติการพยาบาล (Nursing Lab Information & Inventory Management System)**  
*คณะพยาบาลศาสตร์ มหาวิทยาลัยเกษตรศาสตร์*

---

## 1. วัตถุประสงค์และภาพรวมระดับสูง (High-Level Purpose)

ระบบห้องปฏิบัติการพยาบาลถูกออกแบบและพัฒนาขึ้นเป็น **Enterprise Web Application แบบครบวงจร (End-to-End)** เพื่อยกระดับการบริหารจัดการห้องปฏิบัติการพยาบาล จากเดิมที่ใช้เอกสารกระดาษหรือสมุดจดบันทึก มาเป็นระบบดิจิทัลที่เชื่อมโยงกันอย่างไร้รอยต่อ ครอบคลุม:
1. **การควบคุมพัสดุและสินทรัพย์แม่นยำ:** แยกชัดเจนระหว่าง **ครุภัณฑ์ (Equipment Assets)** ที่ต้องติดตามประวัติรายชิ้น และ **วัสดุสิ้นเปลือง (Consumables)** ที่บริหารจัดการตามล็อต (Lot/Expiry)
2. **งานแบ่งบรรจุเวชภัณฑ์และการอบฆ่าเชื้อ (Repack & Sterilization):** รองรับการเบิกห่อใหญ่มาจัดชุดซองย่อยปลอดเชื้อ กำหนดรหัส Sub-lot และติดตามรายซอง (Pack 1..N)
3. **การบริการการเรียนการสอนและฝึกทักษะอิสระ:** การเปิดจองรอบซ้อมแล็บ (Self-Practice Slots) และการยื่นคำขอเบิก-ยืมพัสดุแบบบูรณาการ (Unified Request)
4. **ระบบกำกับดูแลและความโปร่งใส (Governance & Auditability):** การอนุมัติหลายระดับ (Multi-tier Approval), การประเมินความเสียหาย/ค่าปรับ, และรายงานผู้บริหารพร้อมบล็อกลงนามทางการ 3 ลำดับขั้น

---

## 2. โครงสร้างสถาปัตยกรรมทางเทคนิค (Technical Architecture Stack)

```mermaid
graph TB
    subgraph ClientLayer ["1. Client & Presentation Layer (ส่วนติดต่อผู้ใช้งาน)"]
        UI["Web UI: Next.js 15 (App Router) + React 19 + TypeScript"]
        Tailwind["Styling: Tailwind CSS (Responsive Desktop / Tablet / Mobile + Dark Mode)"]
        Components["Component System: Lucide React + Recharts (KPI Dashboards)"]
        PWA["QR Scanner & Print Engine (Dedicated CSS Paged Media A4)"]
    end

    subgraph ServiceLayer ["2. Application & API Layer (Next.js Route Handlers)"]
        AuthService["Authentication & RBAC Service (Admin / Officer / Teacher / Student)"]
        InvService["Inventory & Lot Balances Engine (FIFO / LIFO / Depletion Tracking)"]
        RepackService["Repack & Sterilization Workflow Engine"]
        BookingService["Slot Booking & Conflict Detection Engine"]
        ApprovalService["Unified Request & Multi-tier Approval State Machine"]
        ReportService["Export Engine (Excel / Official PDF / Print Layouts)"]
    end

    subgraph DataLayer ["3. Persistence & Database Layer"]
        Prisma["Prisma ORM (v6.x) - Type-Safe Schema & Migrations"]
        DB[(PostgreSQL Database / Supabase)]
        AuditLog[(Audit Trail & Immutable Activity Logs)]
    end

    ClientLayer --> ServiceLayer
    ServiceLayer --> DataLayer
```

- **Frontend Framework:** Next.js 15 (App Router) พร้อม React 19, TypeScript และ Tailwind CSS
- **API & Business Logic:** RESTful Route Handlers (`/api/*`) ตรวจสอบความถูกต้องและจัดการ Transaction ผ่าน Server-Side
- **Database & ORM:** PostgreSQL ผ่าน **Prisma ORM (v6.x)** พร้อมการรักษาความสัมพันธ์เชิงข้อมูล (Relational Integrity)
- **Security & Authorization:** Role-Based Access Control (RBAC) แบ่ง 4 บทบาทหลัก:
  - `ADMIN` (ผู้ดูแลระบบสูงสุด)
  - `OFFICER` (เจ้าหน้าที่ห้องปฏิบัติการ)
  - `TEACHER` (อาจารย์ประจำหลักสูตร/ผู้ประสานงานรายวิชา)
  - `STUDENT` (นิสิตพยาบาล)

---

## 3. สถาปัตยกรรม 6 มิติหลักของระบบ (6 Core Architectural Pillars)

```mermaid
flowchart TB
    classDef inv fill:#ecfdf5,stroke:#10b981,stroke-width:2px,color:#065f46;
    classDef repack fill:#f0fdfa,stroke:#0d9488,stroke-width:2px,color:#134e4a;
    classDef teach fill:#eff6ff,stroke:#3b82f6,stroke-width:2px,color:#1e40af;
    classDef flow fill:#fff7ed,stroke:#f97316,stroke-width:2px,color:#9a3412;
    classDef inspect fill:#fef2f2,stroke:#ef4444,stroke-width:2px,color:#991b1b;
    classDef report fill:#faf5ff,stroke:#a855f7,stroke-width:2px,color:#6b21a8;

    subgraph P1 [" เสาหลักที่ 1: ทะเบียนคลังพัสดุ & ครุภัณฑ์ (Inventory & Assets)"]
        Items["ทะเบียนพัสดุหลัก (Items)"]
        Assets["ครุภัณฑ์รายชิ้น (EquipmentAsset)<br/>• Serial Number / เลขครุภัณฑ์<br/>• ประวัติซ่อมบำรุง (Maintenance)"]
        Lots["ล็อตวัสดุสิ้นเปลือง (StockLots)<br/>• Lot No, Expire Date, วันตรวจรับ<br/>• กล่องบรรจุ (Box Tracking) & สถานะคงเหลือ"]
        Items --> Assets
        Items --> Lots
    end
    class P1,Items,Assets,Lots inv;

    subgraph P2 ["✂️ เสาหลักที่ 2: งานแบ่งบรรจุ & สเตอร์ไรด์ (Repacking & Sterilization)"]
        RepackAction["ตัดยอดเวชภัณฑ์ห่อใหญ่ (Source Item/Lot)"]
        SubLot["สร้างรอบแบ่งบรรจุ (Sub-lot No.)<br/>• วันที่ผลิต & วันหมดอายุปลอดเชื้อ<br/>• วิธีการฆ่าเชื้อ (Autoclave / EO Gas)"]
        Packs["ผลิตซองย่อยรายชิ้น (Pack 1..N)<br/>• บันทึกสถานะ (AVAILABLE / DISPENSED)<br/>• Batch Repack Sticker Printing"]
        RepackAction --> SubLot --> Packs
    end
    class P2,RepackAction,SubLot,Packs repack;

    subgraph P3 [" เสาหลักที่ 3: หลักสูตร & การฝึกปฏิบัติ (Academic & Practice)"]
        Courses["รายวิชา & อาจารย์ผู้ประสานงาน"]
        Kits["ชุดฝึกปฏิบัติการแม่แบบ (Practice Kits)"]
        Rooms["ห้องปฏิบัติการพยาบาล & เตียงฝึก"]
        Slots["ระบบเปิดตารางซ้อมแล็บ (Self-Practice Slots)"]
        Courses --> Kits
        Rooms --> Slots
    end
    class P3,Courses,Kits,Rooms,Slots teach;

    subgraph P4 [" เสาหลักที่ 4: คำขอ & การอนุมัติแบบบูรณาการ (Unified Request & Approval)"]
        Req["ยื่นคำขอใช้งาน (Unified Request)<br/>• ขอยืมครุภัณฑ์ (Borrow)<br/>• เบิกวัสดุสิ้นเปลือง (Requisition)<br/>• จองห้องฝึก/ชุดหัตถการ (Practice & Kit)"]
        Approval["ระบบอนุมัติ 2 ระดับ (Two-tier Approvals)<br/>• อาจารย์ประจำวิชาอนุมัติคำขอ<br/>• เจ้าหน้าที่แลปอนุมัติการจ่ายพัสดุ"]
        Hold["กันสต็อกและล็อกคิวห้องแลปทันที (Inventory Hold)"]
        Req --> Approval --> Hold
    end
    class P4,Req,Approval,Hold flow;

    subgraph P5 [" เสาหลักที่ 5: การส่งมอบ คืนพัสดุ & คุณภาพ (Fulfillment & Quality Inspection)"]
        ScanOut["สแกน QR Code ตรวจสอบ & ส่งมอบ (Check-out)"]
        Use["อยู่ระหว่างการเรียนการสอน / ฝึกปฏิบัติ (IN_USE)"]
        ScanIn["ตรวจรับคืน & ตรวจนับสภาพ (Check-in Inspection)"]
        Judge{"ตรวจพบชำรุด<br/>หรือสูญหาย?"}
        Normal["สภาพสมบูรณ์:<br/>• ปรับครุภัณฑ์เป็นพร้อมใช้ (AVAILABLE)<br/>• ตัดยอดเวชภัณฑ์ใช้หมดจริง (Consumed)"]
        Damage["ชำรุด/เสียหาย:<br/>• บันทึกรูปภาพ & บันทึกชดใช้ค่าเสียหาย<br/>• ส่งเข้าคิวซ่อมบำรุง (Maintenance Ticket)"]

        ScanOut --> Use --> ScanIn --> Judge
        Judge -- ไม่มี --> Normal
        Judge -- พบชำรุด --> Damage
    end
    class P5,ScanOut,Use,ScanIn,Normal flow;
    class Judge,Damage inspect;

    subgraph P6 [" เสาหลักที่ 6: ตรวจสอบ สรุปสถิติ & รายงานผู้บริหาร (Audit & Executive Intelligence)"]
        Audit["System Audit Trail (บันทึกทุก Action ห้ามลบ)"]
        Reports["รายงานมาตรฐานทางการ:<br/>• รายงานยอดคงเหลือวัสดุสิ้นเปลือง (Excel / ลายมือชื่อ 3 ขั้น)<br/>• รายงานครุภัณฑ์และการเสื่อมสภาพ<br/>• รายงานการใช้ห้องแลปแยกรายวิชา"]
        Dashboard["Executive Dashboard & Strategic KPIs"]
        Audit --> Reports --> Dashboard
    end
    class P6,Audit,Reports,Dashboard report;

    %% Inter-module links
    Lots -.->|เบิกไปแบ่งบรรจุ| RepackAction
    Kits -.->|ดึงไปใช้ในคำร้อง| Req
    Slots -.->|พ่วงขอพัสดุ| Req
    Hold -.->|เบิกจ่ายของจริง| ScanOut
    Normal -.->|บันทึกสถิติ| Audit
    Damage -.->|บันทึกสถิติ| Audit
```

---

## 4. วงจรการทำงานตั้งแต่ต้นจนจบ (End-to-End Operational Lifecycle)

```mermaid
sequenceDiagram
    autonumber
    actor User as นิสิต / อาจารย์ผู้สอน
    actor Teacher as อาจารย์ผู้ประสานงานวิชา
    actor Officer as เจ้าหน้าที่ห้องปฏิบัติการ
    participant Sys as ระบบ Nursing Lab System
    participant DB as ฐานข้อมูล & Audit Trail

    Note over Officer,Sys: 1. ขั้นเตรียมการและจัดการคลัง
    Officer->>Sys: นำเข้าพัสดุ (Stock-In), แยกกล่อง, สั่งพิมพ์สติกเกอร์ QR Code แบบชุด (Batch)
    Officer->>Sys: แบ่งบรรจุซองย่อย (Repack), อบฆ่าเชื้อ, พิมพ์สติกเกอร์ซองย่อยประจำ Sub-lot

    Note over User,Sys: 2. ยื่นคำขอใช้งาน
    User->>Sys: เลือกวันเวลา, ห้องแลป, ชุดฝึก หรือระบุครุภัณฑ์/เวชภัณฑ์ที่ต้องการ
    Sys->>DB: บันทึกคำขอ สถานะ PENDING

    Note over Teacher,Officer: 3. การพิจารณาอนุมัติ (Approval Gate)
    Teacher->>Sys: ตรวจสอบความสอดคล้องกับรายวิชา -> กดอนุมัติ (Approved by Teacher)
    Officer->>Sys: ตรวจสอบความพร้อมของคลังและห้องปฏิบัติการ -> กดอนุมัติจ่าย (Approved by Lab)
    Sys->>DB: ล็อกยอดพัสดุในคลัง (Hold Stock) และจองคิวห้องแลป

    Note over Officer,User: 4. การส่งมอบ (Fulfillment)
    Officer->>Sys: สแกน QR Code ประจำอุปกรณ์รายชิ้นเพื่อยืนยันความถูกต้อง
    Officer->>User: ส่งมอบพัสดุ ตรวจสภาพร่วมกัน และบันทึกจ่ายของ (สถานะ: IN_USE)

    Note over User,Officer: 5. การฝึกปฏิบัติและการส่งคืน (Return & Inspection)
    User->>Officer: นำพัสดุมาส่งคืนที่ห้องปฏิบัติการหลังเสร็จสิ้นการเรียนการสอน
    Officer->>Sys: ตรวจสอบสภาพการทำงาน และนับจำนวนเวชภัณฑ์ที่เหลือ
    alt พบการชำรุดหรือสูญหาย
        Officer->>Sys: บันทึก Damage Assessment แนบรูปภาพ ประเมินค่าปรับ ส่งซ่อมบำรุง
    else ปกติสมบูรณ์
        Officer->>Sys: รับคืน ปรับสถานะครุภัณฑ์เป็น AVAILABLE และตัดสต็อกเวชภัณฑ์ที่ใช้จริง
    end

    Note over Sys,DB: 6. การปิดงานและสรุปผลผู้บริหาร
    Sys->>DB: บันทึกสถานะ COMPLETED พร้อมลง Audit Trail ป้องกันการแก้ไขย้อนหลัง
    Sys->>Sys: ประมวลผลดัชนีชี้วัด (KPIs) นำเสนอขึ้น Executive Analytics Dashboard
```

---

## 5. จุดเด่นเฉพาะตัวของระบบที่ได้รับการพัฒนาล่าสุด

| ฟังก์ชันงาน | รายละเอียดและการทำงาน | ประโยชน์ต่อองค์กร |
| :--- | :--- | :--- |
| **ระบบแบ่งบรรจุ & ปลอดเชื้อ (`/repack`)** | รองรับการตัดยอดกล่องใหญ่มาแบ่งบรรจุเป็นซองย่อยปลอดเชื้อ กำหนด Sub-lot วันที่หมดอายุ และวิธีอบฆ่าเชื้อ | ลดต้นทุนการซื้อเวชภัณฑ์สำเร็จรูปขนาดเล็ก ควบคุมมาตรฐานความปลอดเชื้อทางการพยาบาล |
| **การพิมพ์สติกเกอร์ทีละหลายรายการ (Batch Sticker Printing)** | พิมพ์สติกเกอร์ QR Code สำหรับกล่องพัสดุ, ครุภัณฑ์, และซองย่อยได้คราวละหลายรายการ พร้อมตัวกรองซองที่เบิกจ่ายแล้วออกอัตโนมัติ และหัวแถบทางการของคณะพยาบาลศาสตร์ มก. | ประหยัดเวลาเจ้าหน้าที่อย่างมหาศาล สั่งพิมพ์ A4 รวดเดียวไม่มีหน้าว่างปน |
| **รายงานยอดคงเหลือวัสดุสิ้นเปลืองทางการ (`/reports`)** | ตารางแจกแจงพัสดุตามหมวดหมู่ คำนวณยอดคงเหลือ มูลค่ารวม ตารางสรุปท้ายหน้า และบล็อกลงนามทางการ 3 ระดับ (ผู้รายงาน, ผู้ตรวจสอบ, ผู้อนุมัติ) พร้อมปุ่ม Export Excel | ใช้เป็นเอกสารตรวจนับพัสดุประจำปีตามระเบียบพัสดุภาครัฐได้ทันที |
| **ระบบจองฝึกทักษะอิสระ (`/practice`)** | จัดสรรห้องปฏิบัติการและเตียงฝึกตาม Slot เวลาที่เปิดให้จอง ป้องกันการชนกันของห้อง (Conflict Detection) พร้อมระบุอาจารย์ผู้ควบคุม | นิสิตฝึกฝนทักษะหัตถการได้อย่างมีประสิทธิภาพ มีความปลอดภัยในการใช้งาน |
| **ระบบความปลอดภัยและการตรวจสอบ (Audit Trail)** | บันทึกประวัติการกระทำ เวลา ผู้ใช้ และค่าก่อน-หลังการเปลี่ยนแปลง ทุกคำขอมีเลขอ้างอิงติดตามได้ | โปร่งใส ตรวจสอบย้อนหลังได้ 100% ป้องกันทุจริตและการสูญหายของพัสดุ |

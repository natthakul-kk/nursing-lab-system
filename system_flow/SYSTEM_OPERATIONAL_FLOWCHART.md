# ผังขั้นตอนการทำงานและความเชื่อมโยงทั้งระบบ (System Operational Flowchart)
**ระบบห้องปฏิบัติการพยาบาล (Nursing Lab System)**

ผังงานนี้แสดงลำดับขั้นตอนการปฏิบัติงานในรูปแบบ **Vertical Flowchart (แนวตั้ง)** ตามมาตรฐานผังงานสากล มีจุดเริ่มต้น-สิ้นสุด (Terminator), กล่องขั้นตอน (Process), และจุดตัดสินใจเงื่อนไข (Decision Diamonds) พร้อมการแยกแขนงกรณีปกติและกรณีเกิดความเสียหายอย่างชัดเจน

```mermaid
flowchart TD
    %% Styling Definitions
    classDef startEnd fill:#0f172a,stroke:#334155,stroke-width:2.5px,color:#ffffff,font-weight:bold,rx:20,ry:20;
    classDef process fill:#ffffff,stroke:#0284c7,stroke-width:2px,color:#0f172a,rx:8,ry:8;
    classDef decision fill:#fef3c7,stroke:#d97706,stroke-width:2.5px,color:#92400e,font-weight:bold;
    classDef prep fill:#f0fdf4,stroke:#16a34a,stroke-width:2px,color:#14532d,rx:8,ry:8;
    classDef warn fill:#fef2f2,stroke:#dc2626,stroke-width:2px,color:#991b1b,rx:8,ry:8;
    classDef audit fill:#faf5ff,stroke:#9333ea,stroke-width:2px,color:#581c87,rx:8,ry:8;

    Start([🔵 เริ่มต้น: ผู้ใช้งานเข้าสู่ระบบ Nursing Lab System]):::startEnd
    Auth[🔑 ตรวจสอบยืนยันตัวตนและสิทธิ์การใช้งาน<br/>(Supabase Auth & Role-Based Access Control: RLS)]:::process
    Start --> Auth

    %% STAGE 1
    subgraph S1 ["ขั้นตอนที่ 1: การเตรียมข้อมูลแม่แบบและบริหารคลังพัสดุ (Master Data & Inventory Setup)"]
        CourseSetup[📚 อาจารย์/เจ้าหน้าที่กำหนดรายวิชาและผูกชุดอุปกรณ์แม่แบบ<br/>(Course Setup & Kit Templates)]:::prep
        CheckStock[📦 ตรวจสอบยอดคงคลัง: เวชภัณฑ์ในสต็อกและครุภัณฑ์พร้อมใช้<br/>(Check Consumables & Equipment Assets)]:::prep
        IsStockEnough{ยอดพัสดุในคลัง<br/>เพียงพอหรือไม่?}:::decision
        OrderSupply[⚠️ แจ้งเตือนสต็อกต่ำ & ดำเนินการสั่งซื้อ/รับเข้าพัสดุใหม่<br/>(Low Stock Alert & Procurement)]:::warn
        StockIn[📥 ตรวจรับพัสดุเข้าคลัง บันทึก Lot วันหมดอายุ และติด QR Code<br/>(Stock-In Processing)]:::prep
        PackPrep[✂️ จัดเตรียมเซ็ตฝึกปฏิบัติและแบ่งบรรจุซองสเตอร์ไรด์<br/>(Repack & Set Preparation)]:::prep

        CourseSetup --> CheckStock
        CheckStock --> IsStockEnough
        IsStockEnough -- ❌ ไม่เพียงพอ --> OrderSupply
        OrderSupply --> StockIn
        StockIn --> CheckStock
        IsStockEnough --  เพียงพอ --> PackPrep
    end
    Auth --> CourseSetup

    %% STAGE 2
    subgraph S2 ["ขั้นตอนที่ 2: การยื่นคำร้องและการจองฝึกปฏิบัติ (Request & Booking Submission)"]
        UserSelect[🗓️ ผู้ขอ (นศ./อาจารย์) เลือกรายวิชา ระบุวัน-เวลา ห้องแลป และอุปกรณ์<br/>(Select Course, Time Slot & Required Items)]:::process
        CreateReq[📝 ส่งคำร้องขอเบิกพัสดุ หรือจองฝึกทักษะการพยาบาล<br/>(Submit Material Request / Practice Booking)]:::process
        ReqStatus[⏳ บันทึกคำร้องลงฐานข้อมูล สถานะ: รอดำเนินการ (PENDING)<br/>(Pending Approval Queue)]:::process

        PackPrep --> UserSelect
        UserSelect --> CreateReq
        CreateReq --> ReqStatus
    end

    %% STAGE 3
    subgraph S3 ["ขั้นตอนที่ 3: การตรวจสอบและพิจารณาอนุมัติคำขอ (Review & Approval Process)"]
        ReviewReq[🔍 อาจารย์ผู้รับผิดชอบหรือเจ้าหน้าที่แลปตรวจสอบความถูกต้อง<br/>(Review Request Details & Lab Availability)]:::process
        IsApproved{ผลการพิจารณา<br/>อนุมัติหรือไม่?}:::decision
        RejectReq[🚫 ไม่อนุมัติ: แจ้งเหตุผลปฏิเสธและส่งกลับให้ผู้ขอดำเนินการ<br/>(Rejected / Reason Provided)]:::warn
        ApproveReq[✅ อนุมัติคำขอ: จองคิวห้องแลปและกันยอดพัสดุในระบบทันที<br/>(Approved: Hold Inventory & Reserve Room)]:::process

        ReqStatus --> ReviewReq
        ReviewReq --> IsApproved
        IsApproved -- ❌ ไม่อนุมัติ --> RejectReq
        RejectReq -.->|แก้ไขข้อมูล/ยื่นใหม่| UserSelect
        IsApproved --  อนุมัติ --> ApproveReq
    end

    %% STAGE 4
    subgraph S4 ["ขั้นตอนที่ 4: การจัดเตรียมและส่งมอบอุปกรณ์ (Fulfillment & Check-out)"]
        StaffPick[🛒 เจ้าหน้าที่จัดของตามใบงาน หยิบครุภัณฑ์และเวชภัณฑ์ตามจำนวน<br/>(Staff Pick & Assemble Items)]:::process
        ScanQR[📱 สแกน QR Code ประจำเครื่องเพื่อตรวจสอบความถูกต้องรายชิ้น<br/>(QR Code Verification)]:::process
        Handover[🤝 ส่งมอบอุปกรณ์ให้ผู้ขอ ตรวจสอบสภาพร่วมกันและลงชื่อรับ<br/>(Handover & Sign-off Confirmation)]:::process
        SetInUse[🚀 ระบบปรับสถานะคำร้องเป็น: อยู่ระหว่างใช้งาน (IN_USE)<br/>(Status Updated to IN_USE)]:::process

        ApproveReq --> StaffPick
        StaffPick --> ScanQR
        ScanQR --> Handover
        Handover --> SetInUse
    end

    %% STAGE 5
    subgraph S5 ["ขั้นตอนที่ 5: การฝึกปฏิบัติและการตรวจรับคืน (Practice & Return Inspection)"]
        InPractice[🩺 ดำเนินการเรียนการสอน หรือฝึกทักษะการพยาบาลตามตาราง<br/>(Active Nursing Practice Session)]:::process
        ReturnItem[🔄 นำอุปกรณ์และเวชภัณฑ์ที่เหลือมาส่งคืนที่ห้องปฏิบัติการ<br/>(Return Items to Nursing Lab)]:::process
        InspectItem[🔬 เจ้าหน้าที่ตรวจนับจำนวน ตรวจสภาพการทำงาน และความสะอาด<br/>(Inspection & Count Verification)]:::process
        IsDamaged{พบการชำรุด<br/>เสียหาย หรือสูญหาย?}:::decision

        InPractice --> ReturnItem
        ReturnItem --> InspectItem
        InspectItem --> IsDamaged

        subgraph S5_Damaged ["⚠️ กรณีพบความเสียหายหรือสูญหาย (Damage Handling)"]
            RecordDamage[📋 บันทึกประเมินความเสียหาย (Damage Assessment Record)<br/>ระบุลักษณะอาการ ภาพถ่าย และสาเหตุ]:::warn
            AssessFine[💰 คำนวณค่าปรับ/ค่าชดใช้ตามระเบียบคณะพยาบาลศาสตร์<br/>(Fine & Compensation Assessment)]:::warn
            SendRepair[🛠️ ส่งรายการเข้าคิวแจ้งซ่อม ปรับสถานะเครื่องเป็น MAINTENANCE<br/>(Create Maintenance Ticket)]:::warn
        end

        subgraph S5_Normal [" กรณีสภาพปกติสมบูรณ์ (Normal Return)"]
            AcceptReturn[✨ ยืนยันการรับคืนสำเร็จ ปรับสถานะเครื่องเป็น AVAILABLE พร้อมใช้<br/>(Update Asset to AVAILABLE)]:::prep
            CutStock[📊 ตัดลดยอดเวชภัณฑ์ที่ใช้หมดไปตามจริง (Consumed Stock)<br/>(Update Stock Lot Balances)]:::prep
        end

        IsDamaged -- ⚠️ พบชำรุด/สูญหาย --> RecordDamage
        RecordDamage --> AssessFine
        AssessFine --> SendRepair

        IsDamaged --  ปกติสมบูรณ์ --> AcceptReturn
        AcceptReturn --> CutStock
    end
    SetInUse --> InPractice

    %% STAGE 6
    subgraph S6 ["ขั้นตอนที่ 6: การบันทึกประวัติ สรุปผล และรายงานผู้บริหาร (Audit & Analytics)"]
        CloseReq[🏁 ปิดคำร้องสมบูรณ์ อัปเดตสถานะเป็น: เสร็จสิ้น (COMPLETED)<br/>(Finalize Request)]:::audit
        AuditLog[🔒 บันทึก Audit Trail ทุกการกระทำ เวลา และผู้รับผิดชอบอย่างโปร่งใส<br/>(Immutable System Audit Log)]:::audit
        CalcMetrics[📈 ประมวลผลดัชนีชี้วัด (KPIs): อัตราการใช้ห้อง อุปกรณ์ยอดนิยม ยอดชำรุด<br/>(Compute Strategic Metrics)]:::audit
        ExecDashboard[📊 นำเสนอข้อมูลบน Executive Dashboard สำหรับอาจารย์และผู้บริหาร<br/>(Dean & Faculty Analytics View)]:::audit
        EndNode([🔴 สิ้นสุดกระบวนการทำงาน]):::startEnd

        SendRepair --> CloseReq
        CutStock --> CloseReq
        CloseReq --> AuditLog
        AuditLog --> CalcMetrics
        CalcMetrics --> ExecDashboard
        ExecDashboard --> EndNode
    end

```

---

### รายละเอียด 6 ขั้นตอนหลักในผังงาน:
1. **ขั้นตอนที่ 1: การเตรียมข้อมูลแม่แบบและบริหารคลังพัสดุ (Master Data & Inventory Setup)**
   - อาจารย์/เจ้าหน้าที่กำหนดรายวิชาและผูกชุดอุปกรณ์แม่แบบ (Kit Templates)
   - ตรวจสอบยอดคงคลัง: เวชภัณฑ์ในสต็อกและครุภัณฑ์พร้อมใช้
   - **จุดตัดสินใจ 1**: ยอดพัสดุในคลังเพียงพอหรือไม่? หากไม่พอ แจ้งเตือน Low Stock เพื่อสั่งซื้อและตรวจรับเข้าคลังใหม่ (Stock-In) หากเพียงพอ จัดเตรียมเซ็ตฝึกและแบ่งบรรจุสเตอร์ไรด์ (Repack)
2. **ขั้นตอนที่ 2: การยื่นคำร้องและการจองฝึกปฏิบัติ (Request & Booking Submission)**
   - ผู้ขอกำหนดวัน-เวลา รายวิชา และเลือกรายการอุปกรณ์
   - ยื่นคำร้องผ่านระบบ สถานะจะถูกบันทึกเป็น `PENDING`
3. **ขั้นตอนที่ 3: การตรวจสอบและพิจารณาอนุมัติคำขอ (Review & Approval Process)**
   - อาจารย์ผู้รับผิดชอบหรือเจ้าหน้าที่ตรวจสอบรายละเอียด
   - **จุดตัดสินใจ 2**: ผลการพิจารณาอนุมัติหรือไม่? หากไม่อนุมัติ ระบบแจ้งเหตุผลและส่งกลับให้แก้ไข หากอนุมัติ ระบบจะล็อกยอดคงคลังและจองคิวห้องแลปทันที
4. **ขั้นตอนที่ 4: การจัดเตรียมและส่งมอบอุปกรณ์ (Fulfillment & Check-out)**
   - เจ้าหน้าที่จัดของตามใบงาน และสแกน QR Code ประจำเครื่องเพื่อตรวจสอบความถูกต้อง
   - ส่งมอบอุปกรณ์ให้ผู้ขอ เซ็นรับในระบบ และปรับสถานะเป็น `IN_USE`
5. **ขั้นตอนที่ 5: การฝึกปฏิบัติและการตรวจรับคืน (Practice & Return Inspection)**
   - นักศึกษาฝึกทักษะการพยาบาลตามเวลา เมื่อเสร็จสิ้นนำส่งคืนที่ห้องปฏิบัติการ
   - เจ้าหน้าที่ตรวจนับจำนวน ตรวจสภาพการทำงาน และความสะอาด
   - **จุดตัดสินใจ 3**: พบการชำรุด เสียหาย หรือสูญหายหรือไม่?
     - **กรณีพบชำรุด/สูญหาย**: บันทึกประเมินความเสียหาย (Damage Assessment) -> คำนวณค่าปรับตามระเบียบ -> ส่งรายการเข้าคิวแจ้งซ่อม (MAINTENANCE)
     - **กรณีปกติสมบูรณ์**: ปรับสถานะเครื่องเป็นพร้อมใช้ (AVAILABLE) -> ตัดลดยอดเวชภัณฑ์ที่ใช้หมดไปตามจริง (Consumed Stock)
6. **ขั้นตอนที่ 6: การบันทึกประวัติ สรุปผล และรายงานผู้บริหาร (Audit & Analytics)**
   - ปิดคำร้องสมบูรณ์ (`COMPLETED`)
   - บันทึกประวัติการทำรายการลง Audit Trail แบบเปลี่ยนแปลงไม่ได้
   - ประมวลผลดัชนีชี้วัด (KPIs) และนำเสนอข้อมูลบน Executive Dashboard

import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

BASE_DIR = os.path.join('d:', os.sep, 'LAB-system')
MANUAL_DIR = os.path.join(BASE_DIR, 'manual')
IMAGES_DIR = os.path.join(MANUAL_DIR, 'images')
FLOWCHART_DIR = os.path.join(MANUAL_DIR, 'flowcharts')

DOCX_PATH = os.path.join(MANUAL_DIR, 'คู่มือการใช้งานระบบสำหรับนิสิตพยาบาล.docx')
HTML_PATH = os.path.join(MANUAL_DIR, 'STUDENT_USER_MANUAL.html')

# -------------------------------------------------------------
# 1. GENERATE STANDALONE HTML MANUAL
# -------------------------------------------------------------
def generate_html_manual():
    print("Generating standalone HTML manual...")
    html_content = f"""<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>คู่มือการใช้งานระบบห้องปฏิบัติการพยาบาลศาสตร์ สำหรับนิสิต (Student User Manual)</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&family=Prompt:wght@400;600;700;800&display=swap');
    
    :root {{
      --primary: #0d9488;
      --primary-dark: #0f766e;
      --primary-light: #f0fdfa;
      --secondary: #0284c7;
      --accent: #f59e0b;
      --text-main: #0f172a;
      --text-muted: #475569;
      --border: #e2e8f0;
      --bg-page: #f8fafc;
      --bg-card: #ffffff;
    }}

    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'Sarabun', sans-serif;
      background: var(--bg-page);
      color: var(--text-main);
      line-height: 1.7;
      font-size: 15px;
    }}

    .container {{
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 24px;
    }}

    /* Cover / Header */
    .manual-header {{
      background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
      color: white;
      border-radius: 24px;
      padding: 48px 36px;
      text-align: center;
      margin-bottom: 36px;
      box-shadow: 0 20px 40px -15px rgba(13, 148, 136, 0.3);
    }}
    .header-badge {{
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.3);
      padding: 6px 16px;
      border-radius: 30px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 16px;
      letter-spacing: 0.5px;
    }}
    .manual-header h1 {{
      font-family: 'Prompt', sans-serif;
      font-size: 28px;
      font-weight: 800;
      line-height: 1.3;
      margin-bottom: 10px;
    }}
    .manual-header h2 {{
      font-size: 18px;
      font-weight: 400;
      opacity: 0.95;
      margin-bottom: 18px;
    }}
    .manual-header p {{
      font-size: 14px;
      opacity: 0.85;
    }}

    /* Card Content */
    .card {{
      background: var(--bg-card);
      border-radius: 20px;
      border: 1px solid var(--border);
      padding: 36px;
      margin-bottom: 28px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.02);
    }}

    h2.chapter-title {{
      font-family: 'Prompt', sans-serif;
      font-size: 22px;
      font-weight: 700;
      color: var(--primary-dark);
      border-bottom: 2px solid #ccfbf1;
      padding-bottom: 10px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }}

    h3.section-title {{
      font-family: 'Prompt', sans-serif;
      font-size: 17px;
      font-weight: 600;
      color: #1e293b;
      margin-top: 24px;
      margin-bottom: 12px;
    }}

    p {{
      margin-bottom: 14px;
      color: var(--text-muted);
    }}

    ul, ol {{
      margin-left: 24px;
      margin-bottom: 16px;
      color: var(--text-muted);
    }}
    li {{
      margin-bottom: 6px;
    }}

    /* Images & Figures */
    .figure-box {{
      margin: 24px 0;
      text-align: center;
      background: #f8fafc;
      border-radius: 16px;
      padding: 16px;
      border: 1px solid var(--border);
    }}
    .figure-box img {{
      max-width: 100%;
      height: auto;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.06);
    }}
    .figure-caption {{
      font-size: 13px;
      color: #64748b;
      margin-top: 10px;
      font-weight: 500;
    }}

    /* Tables */
    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0;
      font-size: 14px;
    }}
    th {{
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 12px 16px;
      border-bottom: 2px solid var(--border);
    }}
    td {{
      padding: 12px 16px;
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
    }}
    tr:hover td {{
      background: #f8fafc;
    }}

    /* Callout Alert */
    .callout {{
      border-radius: 14px;
      padding: 16px 20px;
      margin: 20px 0;
      display: flex;
      gap: 14px;
      align-items: flex-start;
      font-size: 14px;
    }}
    .callout-info {{
      background: #f0fdfa;
      border: 1.5px solid #99f6e4;
      color: #0f766e;
    }}
    .callout-warn {{
      background: #fff1f2;
      border: 1.5px solid #fecdd3;
      color: #be123c;
    }}

    /* Table of contents */
    .toc-list {{
      list-style: none;
      margin: 0;
      padding: 0;
    }}
    .toc-list li {{
      padding: 8px 0;
      border-bottom: 1px dashed var(--border);
    }}
    .toc-list a {{
      color: var(--primary-dark);
      text-decoration: none;
      font-weight: 600;
    }}
    .toc-list a:hover {{
      text-decoration: underline;
    }}

    /* Print styles */
    @media print {{
      body {{ background: white; }}
      .container {{ max-width: 100%; padding: 0; }}
      .card {{ border: none; box-shadow: none; padding: 10px 0; page-break-inside: avoid; }}
      .figure-box {{ border: none; padding: 0; }}
    }}
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="manual-header">
      <span class="header-badge">SMART NURSING LAB • STUDENT MANUAL</span>
      <h1>คู่มือการใช้งานระบบห้องปฏิบัติการพยาบาลศาสตร์</h1>
      <h2>สำหรับนิสิตพยาบาลศาสตร์ (Student User Manual)</h2>
      <p>คณะพยาบาลศาสตร์ มหาวิทยาลัย • ฉบับปรับปรุงมาตรฐานสากลและระบบความปลอดภัย 2569</p>
    </div>

    <!-- TOC -->
    <div class="card">
      <h2 class="chapter-title">📑 สารบัญ (Table of Contents)</h2>
      <ul class="toc-list">
        <li><a href="#intro">บทนำ: วัตถุประสงค์และภาพรวมระบบ</a></li>
        <li><a href="#ch1">บทที่ 1: การเข้าสู่ระบบและการเตรียมความพร้อม</a></li>
        <li><a href="#ch2">บทที่ 2: ผังงานขั้นตอนการทำงานมาตรฐาน (Standard ISO/ANSI Flowcharts)</a></li>
        <li><a href="#ch3">บทที่ 3: ขั้นตอนการยืม-คืนครุภัณฑ์ และเบิกพัสดุสิ้นเปลือง (One-Stop Requisition)</a></li>
        <li><a href="#ch4">บทที่ 4: การขอเบิกชุดฝึกปฏิบัติการสำเร็จรูป (Nursing Practice Kits)</a></li>
        <li><a href="#ch5">บทที่ 5: การขอเข้าฝึกปฏิบัติการด้วยตนเองและสแกน QR Code (Self-Practice & QR Check-in)</a></li>
        <li><a href="#ch6">บทที่ 6: การส่งคืนอุปกรณ์และข้อปฏิบัติความปลอดภัย (Return Guidelines & Safety)</a></li>
      </ul>
    </div>

    <!-- Intro -->
    <div class="card" id="intro">
      <h2 class="chapter-title">🩺 บทนำและวัตถุประสงค์ของระบบ</h2>
      <p>ระบบบริหารจัดการห้องปฏิบัติการพยาบาลศาสตร์ (Smart Nursing Lab Management System) ได้รับการออกแบบขึ้นเพื่อสนับสนุนการเรียนการสอนและฝึกทักษะทางการพยาบาลของนิสิต ให้เป็นไปอย่างราบรื่น รวดเร็ว ถูกต้องตามหลักการพยาบาล และเกิดความปลอดภัยสูงสุด</p>
      
      <div class="callout callout-info">
        <div>💡</div>
        <div>
          <b>3 จุดเด่นสำคัญสำหรับนิสิต:</b>
          <ol style="margin-top: 6px; margin-bottom: 0;">
            <li><b>One-Stop Requisition:</b> รวมการยืมครุภัณฑ์และการเบิกเวชภัณฑ์ในใบเดียว</li>
            <li><b>Patient Safety Lock:</b> แยกการเบิกเวชภัณฑ์สำหรับ "หุ่นจำลอง" กับ "คนจริง" ชัดเจน 100%</li>
            <li><b>Self-Practice Booking & E-Ticket:</b> จองห้องแล็บซ้อมนอกเวลา พร้อมสแกน QR Code เข้าห้องได้ทันที</li>
          </ol>
        </div>
      </div>
    </div>

    <!-- Chapter 1 -->
    <div class="card" id="ch1">
      <h2 class="chapter-title">🔑 บทที่ 1: การเข้าสู่ระบบและการเตรียมความพร้อม</h2>
      <p>นิสิตสามารถเข้าใช้งานระบบผ่านอุปกรณ์ใดก็ได้ โดยเข้าสู่หน้าล็อกอินด้วยบัญชีมหาวิทยาลัยหรือรหัสนิสิต</p>

      <div class="figure-box">
        <img src="./images/ui_mockup_login.png" alt="หน้าจอเข้าสู่ระบบสำหรับนิสิตพยาบาล">
        <div class="figure-caption">รูปที่ 1.1: หน้าจอเข้าสู่ระบบสำหรับนิสิตพยาบาล (Student Login)</div>
      </div>

      <h3 class="section-title">ข้อมูลตัวอย่างนิสิตในคู่มือ (Student Persona):</h3>
      <ul>
        <li><b>ชื่อ-สกุล:</b> น.ส. นภัสสร ใจดี</li>
        <li><b>รหัสนิสิต:</b> 66010023 (ชั้นปีที่ 2 สาขาวิชาพยาบาลศาสตร์)</li>
        <li><b>รายวิชาที่เรียน:</b> NS201 การพยาบาลพื้นฐาน (Fundamental of Nursing)</li>
        <li><b>อาจารย์ประจำวิชา:</b> ผศ.ดร.พิมพา สุขเกษม</li>
      </ul>
    </div>

    <!-- Chapter 2 -->
    <div class="card" id="ch2">
      <h2 class="chapter-title">📊 บทที่ 2: ผังงานขั้นตอนการทำงานมาตรฐาน (Standard Flowcharts)</h2>
      <p>ผังงานในระบบใช้มาตรฐานสากล ISO 5807 / ANSI เพื่อให้นิสิตเข้าใจลำดับขั้นตอนและจุดตัดสินใจทางเทคนิคได้อย่างชัดเจน</p>

      <table>
        <thead>
          <tr>
            <th>สัญลักษณ์</th>
            <th>ชื่อเรียก</th>
            <th>ความหมาย</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>🟢 วงรี / แคปซูล</td>
            <td>Terminator</td>
            <td>จุดเริ่มต้นหรือจุดสิ้นสุดกระบวนการ</td>
          </tr>
          <tr>
            <td>⬜ สี่เหลี่ยมผืนผ้า</td>
            <td>Process</td>
            <td>ขั้นตอนการปฏิบัติงานหรือการประมวลผล</td>
          </tr>
          <tr>
            <td>🔶 สี่เหลี่ยมข้าวหลามตัด</td>
            <td>Decision</td>
            <td>จุดตรวจสอบเงื่อนไข / การตัดสินใจ (Yes/No)</td>
          </tr>
          <tr>
            <td>🔷 สี่เหลี่ยมด้านขนาน</td>
            <td>Data / I/O</td>
            <td>การกรอกข้อมูลนำเข้า หรือการแสดงผล</td>
          </tr>
          <tr>
            <td>📄 เอกสาร</td>
            <td>Document</td>
            <td>การออกเอกสาร บัตรคิว หรือ E-Ticket</td>
          </tr>
        </tbody>
      </table>

      <h3 class="section-title">2.1 ผังงานภาพรวมการใช้งานของนิสิต (Overall Student Lifecycle)</h3>
      <div class="figure-box">
        <img src="./flowcharts/flowchart_1_student_lifecycle.png" alt="ผังงานภาพรวมการใช้งานของนิสิต">
        <div class="figure-caption">ผังงานที่ 1: ภาพรวมกระบวนการใช้งานระบบของนิสิตพยาบาล</div>
      </div>

      <h3 class="section-title">2.2 ผังงานการยืม-เบิก One-Stop และระบบ Patient Safety Lock</h3>
      <div class="figure-box">
        <img src="./flowcharts/flowchart_2_unified_borrow_requisition.png" alt="ผังงานการยืม-เบิก One-Stop">
        <div class="figure-caption">ผังงานที่ 2: ขั้นตอนการยืม-เบิกแบบ One-Stop พร้อมระบบ Patient Safety Lock</div>
      </div>

      <h3 class="section-title">2.3 ผังงานการจองห้องปฏิบัติการและ Check-in สแกนเข้าห้อง</h3>
      <div class="figure-box">
        <img src="./flowcharts/flowchart_3_practice_booking.png" alt="ผังงานการจองห้องแล็บและ Check-in">
        <div class="figure-caption">ผังงานที่ 3: ขั้นตอนการจองห้องแล็บและสแกน QR Code Check-in</div>
      </div>
    </div>

    <!-- Chapter 3 -->
    <div class="card" id="ch3">
      <h2 class="chapter-title">📑 บทที่ 3: ขั้นตอนการยืม-คืนครุภัณฑ์ และเบิกพัสดุสิ้นเปลือง (One-Stop Requisition)</h2>
      <p>ระบบรองรับการยื่นคำขอในหน้าต่างเดียว ทั้งครุภัณฑ์ที่ต้องส่งคืน และเวชภัณฑ์สิ้นเปลืองที่เบิกใช้หมดไป</p>

      <div class="figure-box">
        <img src="./images/ui_mockup_unified_request.png" alt="หน้าต่างขอยืม-เบิกแบบ One-Stop">
        <div class="figure-caption">รูปที่ 3.1: หน้าต่างขอยืม-เบิกแบบ One-Stop (Unified Requisition Modal)</div>
      </div>

      <h3 class="section-title">ขั้นตอนการกรอกคำขอ:</h3>
      <ol>
        <li><b>เลือกวัตถุประสงค์การใช้งาน (Use Target):</b>
          <ul>
            <li><b>🧪 ฝึกปฏิบัติการกับหุ่นจำลอง (Sim-Lab):</b> ระบบอนุญาตให้เบิกเวชภัณฑ์หมดอายุได้เพื่อความคุ้มค่า</li>
            <li><b>🧑‍⚕️ ใช้งานกับคนจริง (Clinical Patient):</b> ระบบจะเปิดโหมดความปลอดภัย บล็อกล็อตหมดอายุ 100%</li>
          </ul>
        </li>
        <li><b>เลือกรหัสรายวิชา:</b> เลือกรหัสวิชา เช่น <code>NS201 การพยาบาลพื้นฐาน</code> ระบบจะดึงชื่ออาจารย์ผู้รับผิดชอบให้อัตโนมัติ</li>
        <li><b>กำหนดวัน-เวลานัดหมาย:</b> ระบุวันเวลารับของ และกำหนดวันส่งคืนครุภัณฑ์</li>
        <li><b>เลือกอุปกรณ์และเวชภัณฑ์:</b> ระบุจำนวนที่ต้องการ</li>
        <li><b>กดยืนยันและส่งคำขอ:</b> คำขอจะส่งไปยังอาจารย์ประจำวิชาเพื่อรับทราบ และเจ้าหน้าที่แล็บเพื่ออนุมัติ</li>
      </ol>
    </div>

    <!-- Chapter 4 -->
    <div class="card" id="ch4">
      <h2 class="chapter-title">📦 บทที่ 4: การขอเบิกชุดฝึกปฏิบัติการสำเร็จรูป (Nursing Practice Kits)</h2>
      <p>ชุด Box Set สำเร็จรูปตามหัตถการทางการพยาบาล ช่วยให้นิสิตขอเบิกได้ในคลิกเดียว (One-Click)</p>

      <div class="figure-box">
        <img src="./images/ui_mockup_kits.png" alt="ชุดฝึกปฏิบัติการสำเร็จรูป">
        <div class="figure-caption">รูปที่ 4.1: หน้ารายการชุดฝึกปฏิบัติการสำเร็จรูป (Practice Kits)</div>
      </div>

      <h3 class="section-title">ตัวอย่างชุดฝึกยอดนิยม:</h3>
      <ul>
        <li><b>ชุดทำแผลปลอดเชื้อ (Sterile Dressing Kit):</b> ปากคีบ, ถ้วยไอโอดีนสแตนเลส, สำลีก้อน, กอซ, ผ้าเจาะกลาง</li>
        <li><b>ชุดฝึกสวนปัสสาวะ (Catheterization Kit):</b> Foley catheter, Urine bag, Syringe 10ml, K-Y Jelly, ถุงมือ Sterile</li>
        <li><b>ชุดตรวจสัญญาณชีพ (Vital Signs Kit):</b> Stethoscope, Sphygmomanometer, ปรอทดิจิทัล, Pulse Oximeter</li>
      </ul>
    </div>

    <!-- Chapter 5 -->
    <div class="card" id="ch5">
      <h2 class="chapter-title">📅 บทที่ 5: การขอเข้าฝึกปฏิบัติการด้วยตนเองและสแกน QR Code</h2>
      <p>นิสิตสามารถจองห้องปฏิบัติการทักษะและเตียงฝึกซ้อมนอกเวลาเรียน เพื่อทบทวนหัตถการก่อนสอบ OSCE</p>

      <div class="figure-box">
        <img src="./images/ui_mockup_practice_booking.png" alt="หน้าจอจองห้องปฏิบัติการ">
        <div class="figure-caption">รูปที่ 5.1: การเลือกรอบเวลา (Time Slots) และระบุหัตถการ</div>
      </div>

      <div class="figure-box">
        <img src="./images/ui_mockup_practice_ticket.png" alt="บัตร Digital E-Ticket พร้อม QR Code">
        <div class="figure-caption">รูปที่ 5.2: บัตร Digital E-Ticket พร้อม QR Code สำหรับ Check-in เข้าห้องแล็บ</div>
      </div>

      <h3 class="section-title">ขั้นตอนการ Check-in หน้าห้องแล็บ:</h3>
      <ol>
        <li>เดินทางมาถึงหน้าห้องปฏิบัติการก่อนเวลาเริ่มซ้อม 5 นาที</li>
        <li>เปิดหน้า Digital E-Ticket บนสมาร์ทโฟน</li>
        <li>สแกน QR Code หน้าห้องแล็บเพื่อเช็คอิน</li>
        <li>ระบบจะเริ่มนับเวลาและบันทึก "ชั่วโมงฝึกปฏิบัติการสะสม" ให้อัตโนมัติ</li>
      </ol>
    </div>

    <!-- Chapter 6 -->
    <div class="card" id="ch6">
      <h2 class="chapter-title">🛡️ บทที่ 6: การส่งคืนอุปกรณ์และข้อปฏิบัติความปลอดภัย</h2>
      <p>เพื่อรักษามาตรฐานความปลอดภัยและความพร้อมใช้ของอุปกรณ์ นิสิตต้องปฏิบัติตามแนวทางดังนี้:</p>

      <div class="callout callout-warn">
        <div>⚠️</div>
        <div>
          <b>ข้อพึงระวังสำคัญ:</b>
          <p style="margin-top: 4px; margin-bottom: 0;">ห้ามนำเวชภัณฑ์ที่มีป้าย "สำหรับฝึกกับหุ่นจำลองเท่านั้น" ไปใช้กับผู้ป่วยจริงบนหอผู้ป่วยโดยเด็ดขาด</p>
        </div>
      </div>

      <h3 class="section-title">ขั้นตอนการส่งคืนครุภัณฑ์:</h3>
      <ul>
        <li>ทำความสะอาดและจัดเรียงอุปกรณ์เข้ากล่องบรรจุให้เรียบร้อย</li>
        <li>นำส่งคืน ณ เคาน์เตอร์ห้องปฏิบัติการตามเวลาที่นัดหมาย</li>
        <li>เจ้าหน้าที่ตรวจรับความสมบูรณ์และกดปิดสถานะเป็น <code>RETURNED</code></li>
      </ul>
    </div>

    <footer style="text-align: center; font-size: 13px; color: #94a3b8; padding: 20px 0;">
      งานห้องปฏิบัติการและเทคโนโลยีการศึกษา คณะพยาบาลศาสตร์ มหาวิทยาลัย<br>
      Smart Nursing Lab Management System • เวอร์ชัน 2.0 (กันยายน 2569)
    </footer>
  </div>
</body>
</html>
"""
    with open(HTML_PATH, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"HTML manual saved: {HTML_PATH}")

# -------------------------------------------------------------
# 2. GENERATE FORMAL DOCX MANUAL
# -------------------------------------------------------------
def set_cell_background(cell, fill_color):
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_color}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = parse_xml(f'''<w:tcMar {nsdecls("w")}>
        <w:top w:w="{top}" w:type="dxa"/>
        <w:bottom w:w="{bottom}" w:type="dxa"/>
        <w:left w:w="{left}" w:type="dxa"/>
        <w:right w:w="{right}" w:type="dxa"/>
    </w:tcMar>''')
    tcPr.append(tcMar)

def generate_docx_manual():
    print("Generating Word (.docx) manual...")
    doc = Document()

    # Configure Margins
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Styles
    styles = doc.styles
    normal_style = styles['Normal']
    normal_style.font.name = 'Sarabun'
    normal_style.font.size = Pt(12)
    normal_style.font.color.rgb = RGBColor(0x0f, 0x17, 0x2a)

    # ---------------- COVER PAGE ----------------
    cover_p = doc.add_paragraph()
    cover_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cover_p.paragraph_format.space_before = Pt(80)
    cover_p.paragraph_format.space_after = Pt(12)
    
    r_badge = cover_p.add_run("คณะพยาบาลศาสตร์ มหาวิทยาลัย\nSMART NURSING LAB MANAGEMENT SYSTEM\n")
    r_badge.font.name = 'Prompt'
    r_badge.font.size = Pt(14)
    r_badge.font.bold = True
    r_badge.font.color.rgb = RGBColor(0x0d, 0x94, 0x88)

    r_title = cover_p.add_run("คู่มือการใช้งานระบบ\nห้องปฏิบัติการพยาบาลศาสตร์\n")
    r_title.font.name = 'Prompt'
    r_title.font.size = Pt(26)
    r_title.font.bold = True
    r_title.font.color.rgb = RGBColor(0x0f, 0x76, 0x6e)

    r_sub = cover_p.add_run("สำหรับนิสิตพยาบาล (Student User Manual)\n")
    r_sub.font.name = 'Prompt'
    r_sub.font.size = Pt(18)
    r_sub.font.color.rgb = RGBColor(0x02, 0x84, 0xc7)

    p_line = doc.add_paragraph()
    p_line.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_line.paragraph_format.space_after = Pt(120)
    r_div = p_line.add_run("____________________________________________________")
    r_div.font.color.rgb = RGBColor(0xcc, 0xfb, 0xf1)

    p_author = doc.add_paragraph()
    p_author.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r_auth = p_author.add_run("งานห้องปฏิบัติการและเทคโนโลยีการศึกษา คณะพยาบาลศาสตร์\nระบบ One-Stop Requisition • Patient Safety Lock • QR Check-in\nฉบับปรับปรุง กันยายน 2569")
    r_auth.font.size = Pt(11)
    r_auth.font.color.rgb = RGBColor(0x64, 0x74, 0x8b)

    doc.add_page_break()

    # ---------------- TABLE OF CONTENTS ----------------
    h_toc = doc.add_heading("สารบัญ (Table of Contents)", level=1)
    h_toc.runs[0].font.name = 'Prompt'
    h_toc.runs[0].font.color.rgb = RGBColor(0x0f, 0x76, 0x6e)

    toc_items = [
        ("บทนำและวัตถุประสงค์ของระบบ", "หน้า 3"),
        ("บทที่ 1: การเข้าสู่ระบบและการเตรียมความพร้อม", "หน้า 4"),
        ("บทที่ 2: ผังงานขั้นตอนการทำงานมาตรฐาน (Standard Flowcharts)", "หน้า 5"),
        ("   - 2.1 ผังงานภาพรวมการใช้งานของนิสิต (Overall Student Lifecycle)", "หน้า 6"),
        ("   - 2.2 ผังงานการยืม-เบิก One-Stop และระบบ Patient Safety Lock", "หน้า 7"),
        ("   - 2.3 ผังงานการจองห้องแล็บและระบบสแกน QR Code Check-in", "หน้า 8"),
        ("บทที่ 3: ขั้นตอนการยืม-คืนครุภัณฑ์ และเบิกพัสดุสิ้นเปลือง (One-Stop Requisition)", "หน้า 9"),
        ("บทที่ 4: การขอเบิกชุดฝึกปฏิบัติการสำเร็จรูป (Nursing Practice Kits)", "หน้า 11"),
        ("บทที่ 5: การขอเข้าฝึกปฏิบัติการด้วยตนเองและสแกน QR Code", "หน้า 12"),
        ("บทที่ 6: การส่งคืนอุปกรณ์และข้อปฏิบัติความปลอดภัย (Return Guidelines)", "หน้า 14")
    ]

    for title, page in toc_items:
        p_t = doc.add_paragraph()
        p_t.paragraph_format.space_after = Pt(6)
        r_t = p_t.add_run(f"{title} ".ljust(65, '.'))
        r_t.font.size = Pt(11)
        r_p = p_t.add_run(f" {page}")
        r_p.font.size = Pt(11)
        r_p.font.bold = True

    doc.add_page_break()

    # ---------------- INTRO ----------------
    h1 = doc.add_heading("บทนำและวัตถุประสงค์ของระบบ", level=1)
    h1.runs[0].font.name = 'Prompt'
    h1.runs[0].font.color.rgb = RGBColor(0x0f, 0x76, 0x6e)

    p_intro = doc.add_paragraph(
        "ระบบบริหารจัดการห้องปฏิบัติการพยาบาลศาสตร์ (Smart Nursing Lab Management System) "
        "ได้รับการออกแบบและพัฒนาขึ้นเพื่อรองรับกระบวนการฝึกทักษะทางการพยาบาลของนิสิต "
        "โดยเน้นความสะดวก รวดเร็ว ถูกต้องตามหลักวิชาชีพ และมีระบบป้องกันความปลอดภัยทางการแพทย์อย่างเข้มงวด"
    )
    p_intro.paragraph_format.space_after = Pt(10)

    # Highlight box
    tbl_intro = doc.add_table(rows=1, cols=1)
    tbl_intro.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_intro = tbl_intro.cell(0, 0)
    set_cell_background(c_intro, "F0FDFA")
    set_cell_margins(c_intro, top=140, bottom=140, left=200, right=200)
    p_box = c_intro.paragraphs[0]
    r_box_title = p_box.add_run("💡 3 นวัตกรรมสำคัญสำหรับนิสิตในระบบนี้:\n")
    r_box_title.font.name = 'Prompt'
    r_box_title.font.bold = True
    r_box_title.font.color.rgb = RGBColor(0x0f, 0x76, 0x6e)
    r_box_body = p_box.add_run(
        "1. One-Stop Requisition: รวมการขอยืมครุภัณฑ์และการเบิกเวชภัณฑ์ไว้ในฟอร์มเดียว สะดวก รวดเร็ว\n"
        "2. Patient Safety Lock: แยกวัตถุประสงค์การใช้งานระหว่างหุ่นจำลองกับคนจริงอย่างเด็ดขาด บล็อกล็อตหมดอายุ 100%\n"
        "3. Digital Practice Ticket: จองห้องแล็บฝึกซ้อมนอกเวลา พร้อมออกบัตรคิวเสมือนและ QR Code สแกนเข้าห้อง"
    )
    r_box_body.font.size = Pt(10.5)

    doc.add_page_break()

    # ---------------- CHAPTER 1 ----------------
    h_ch1 = doc.add_heading("บทที่ 1: การเข้าสู่ระบบและการเตรียมความพร้อม", level=1)
    h_ch1.runs[0].font.name = 'Prompt'
    h_ch1.runs[0].font.color.rgb = RGBColor(0x0f, 0x76, 0x6e)

    p_ch1 = doc.add_paragraph(
        "นิสิตสามารถเข้าใช้งานระบบได้จากอุปกรณ์คอมพิวเตอร์ แท็บเล็ต หรือสมาร์ทโฟน "
        "โดยเข้าใช้งานผ่านเว็บเบราว์เซอร์ของมหาวิทยาลัยและล็อกอินด้วยรหัสนิสิต"
    )

    login_img_path = os.path.join(IMAGES_DIR, 'ui_mockup_login.png')
    if os.path.join(login_img_path):
        doc.add_picture(login_img_path, width=Inches(5.6))
        p_cap = doc.add_paragraph("รูปที่ 1.1: หน้าจอเข้าสู่ระบบสำหรับนิสิตพยาบาล (Student Login)")
        p_cap.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cap.runs[0].font.size = Pt(9.5)
        p_cap.runs[0].font.italic = True
        p_cap.runs[0].font.color.rgb = RGBColor(0x64, 0x74, 0x8b)

    doc.add_paragraph(
        "ข้อมูลจำลองนิสิตสำหรับคู่มือฉบับนี้ (Student Persona):\n"
        "• ชื่อ-สกุล: น.ส. นภัสสร ใจดี\n"
        "• รหัสนิสิต: 66010023 (ชั้นปีที่ 2 หลักสูตรพยาบาลศาสตรบัณฑิต)\n"
        "• รายวิชาที่ศึกษา: NS201 การพยาบาลพื้นฐาน (อาจารย์ผู้รับผิดชอบ: ผศ.ดร.พิมพา สุขเกษม)"
    )

    doc.add_page_break()

    # ---------------- CHAPTER 2: FLOWCHARTS ----------------
    h_ch2 = doc.add_heading("บทที่ 2: ผังงานขั้นตอนการทำงานมาตรฐาน (Standard Flowcharts)", level=1)
    h_ch2.runs[0].font.name = 'Prompt'
    h_ch2.runs[0].font.color.rgb = RGBColor(0x0f, 0x76, 0x6e)

    doc.add_paragraph(
        "ผังงานในคู่มือฉบับนี้จัดทำขึ้นตามมาตรฐานสากล ISO 5807 / ANSI Information Processing "
        "โดยมีสัญลักษณ์และข้อกำหนดการใช้งานดังนี้:"
    )

    # Symbol Table
    table = doc.add_table(rows=6, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = table.rows[0].cells
    hdr[0].text = "สัญลักษณ์"
    hdr[1].text = "ชื่อมาตรฐาน"
    hdr[2].text = "ความหมายและการใช้งานในระบบ"
    for c in hdr:
        set_cell_background(c, "E2E8F0")
        c.paragraphs[0].runs[0].font.bold = True
        c.paragraphs[0].runs[0].font.size = Pt(10.5)

    symbols_data = [
        ("Terminator (วงรี/แคปซูล)", "จุดเริ่มต้น / จุดสิ้นสุด", "ระบุจุดเริ่มต้นกระบวนการ หรือจุดเสร็จสิ้นขั้นตอนทั้งหมด"),
        ("Process (สี่เหลี่ยมผืนผ้า)", "ขั้นตอนการปฏิบัติงาน", "การกระทำ เช่น กรอกข้อมูล, คำนวณสต็อก, จ่ายพัสดุ"),
        ("Decision (ข้าวหลามตัด)", "จุดตัดสินใจเงื่อนไข", "การตรวจสอบเงื่อนไข เช่น อนุมัติหรือไม่, วันหมดอายุผ่านหรือไม่"),
        ("Data / I/O (ด้านขนาน)", "การรับ-แสดงข้อมูล", "การเลือกรายวิชา, การระบุจำนวนยืม-เบิก, การแสดงผลตาราง"),
        ("Document (เอกสาร)", "เอกสารและแจ้งเตือน", "การออกบัตร E-Ticket, QR Code, หรือใบสรุปรายงาน")
    ]

    for idx, (sym, name, desc) in enumerate(symbols_data, start=1):
        row = table.rows[idx].cells
        row[0].text = sym
        row[1].text = name
        row[2].text = desc
        for c in row:
            c.paragraphs[0].runs[0].font.size = Pt(10)
            set_cell_margins(c, top=80, bottom=80, left=120, right=120)

    p_sp = doc.add_paragraph()
    p_sp.paragraph_format.space_before = Pt(10)

    # Flowchart 1
    doc.add_heading("2.1 ผังงานภาพรวมการใช้งานของนิสิต (Overall Student Lifecycle)", level=2)
    fc1_path = os.path.join(FLOWCHART_DIR, 'flowchart_1_student_lifecycle.png')
    if os.path.exists(fc1_path):
        doc.add_picture(fc1_path, width=Inches(5.8))
        p_c1 = doc.add_paragraph("ผังงานที่ 1: ภาพรวมกระบวนการใช้งานระบบของนิสิตพยาบาล (Student Lifecycle)")
        p_c1.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_c1.runs[0].font.size = Pt(9.5)
        p_c1.runs[0].font.italic = True

    doc.add_page_break()

    # Flowchart 2
    doc.add_heading("2.2 ผังงานการยืม-เบิก One-Stop และระบบ Patient Safety Lock", level=2)
    fc2_path = os.path.join(FLOWCHART_DIR, 'flowchart_2_unified_borrow_requisition.png')
    if os.path.exists(fc2_path):
        doc.add_picture(fc2_path, width=Inches(5.8))
        p_c2 = doc.add_paragraph("ผังงานที่ 2: ขั้นตอนการยืม-เบิกแบบ One-Stop พร้อมเงื่อนไขตรวจสอบความปลอดภัย")
        p_c2.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_c2.runs[0].font.size = Pt(9.5)
        p_c2.runs[0].font.italic = True

    doc.add_page_break()

    # Flowchart 3
    doc.add_heading("2.3 ผังงานการจองห้องปฏิบัติการและ Check-in สแกนเข้าห้อง", level=2)
    fc3_path = os.path.join(FLOWCHART_DIR, 'flowchart_3_practice_booking.png')
    if os.path.exists(fc3_path):
        doc.add_picture(fc3_path, width=Inches(5.8))
        p_c3 = doc.add_paragraph("ผังงานที่ 3: ขั้นตอนการจองห้องปฏิบัติการและ Check-in สแกนเข้าห้อง")
        p_c3.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_c3.runs[0].font.size = Pt(9.5)
        p_c3.runs[0].font.italic = True

    doc.add_page_break()

    # ---------------- CHAPTER 3 ----------------
    h_ch3 = doc.add_heading("บทที่ 3: ขั้นตอนการยืม-คืนครุภัณฑ์ และเบิกพัสดุสิ้นเปลือง", level=1)
    h_ch3.runs[0].font.name = 'Prompt'
    h_ch3.runs[0].font.color.rgb = RGBColor(0x0f, 0x76, 0x6e)

    doc.add_paragraph(
        "ระบบ One-Stop Requisition รวมการขออุปกรณ์ 2 รูปแบบไว้ในฟอร์มเดียวกัน:\n"
        "1. ครุภัณฑ์ (Equipment): อุปกรณ์ทางการแพทย์ที่ต้องส่งคืนหลังเสร็จสิ้นการใช้งาน\n"
        "2. วัสดุเวชภัณฑ์สิ้นเปลือง (Consumables): พัสดุใช้หมดไป เช่น ถุงมือ, ผ้ากอซ, สำลี"
    )

    req_img = os.path.join(IMAGES_DIR, 'ui_mockup_unified_request.png')
    if os.path.exists(req_img):
        doc.add_picture(req_img, width=Inches(5.8))
        p_cr = doc.add_paragraph("รูปที่ 3.1: หน้าต่างสร้างคำขอยืม-เบิกแบบ One-Stop (Unified Requisition)")
        p_cr.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cr.runs[0].font.size = Pt(9.5)
        p_cr.runs[0].font.italic = True

    doc.add_heading("ขั้นตอนการทำรายการ:", level=2)
    doc.add_paragraph(
        "1. กดปุ่ม '+ ขอยืม-เบิกอุปกรณ์ (One-Stop)' บนเมนูหลัก\n"
        "2. เลือกวัตถุประสงค์การใช้งาน (Use Target):\n"
        "    • 🧪 ฝึกกับหุ่นจำลอง (Sim-Lab): อนุญาตให้เบิกเวชภัณฑ์หมดอายุได้เพื่อประหยัดทรัพยากร\n"
        "    • 🧑‍⚕️ ใช้งานกับคนจริง (Clinical Patient): ระบบเปิด Patient Safety Lock บล็อกล็อตหมดอายุ 100%\n"
        "3. เลือกรหัสวิชาทางการพยาบาล: ระบบจะค้นหาและระบุอาจารย์ผู้รับผิดชอบรายวิชาให้อัตโนมัติ\n"
        "4. ระบุวัน-เวลานัดหมายรับของ และกำหนดวันส่งคืน\n"
        "5. เลือกรายการอุปกรณ์และจำนวนที่ต้องการ จากนั้นกดยืนยันส่งคำขอ"
    )

    doc.add_page_break()

    # ---------------- CHAPTER 4 ----------------
    h_ch4 = doc.add_heading("บทที่ 4: การขอเบิกชุดฝึกปฏิบัติการสำเร็จรูป (Nursing Practice Kits)", level=1)
    h_ch4.runs[0].font.name = 'Prompt'
    h_ch4.runs[0].font.color.rgb = RGBColor(0x0f, 0x76, 0x6e)

    doc.add_paragraph(
        "เพื่อความสะดวกรวดเร็วในการฝึกหัตถการทางการพยาบาล คณะได้จัดเตรียมชุดอุปกรณ์สำเร็จรูป (Box Sets) "
        "ซึ่งรวบรวมอุปกรณ์และเวชภัณฑ์ที่จำเป็นสำหรับแต่ละหัตถการไว้ครบถ้วนในกล่องเดียว"
    )

    kit_img = os.path.join(IMAGES_DIR, 'ui_mockup_kits.png')
    if os.path.exists(kit_img):
        doc.add_picture(kit_img, width=Inches(5.8))
        p_ck = doc.add_paragraph("รูปที่ 4.1: หน้ารายการชุดฝึกปฏิบัติการสำเร็จรูป (Nursing Practice Kits)")
        p_ck.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_ck.runs[0].font.size = Pt(9.5)
        p_ck.runs[0].font.italic = True

    doc.add_paragraph(
        "วิธีการขอเบิกแบบ One-Click:\n"
        "1. เข้าเมนู 'ชุดฝึกปฏิบัติการ (Practice Kits)'\n"
        "2. ค้นหาชุดฝึกตามหัตถการ เช่น ชุดฝึกทำแผลปลอดเชื้อ (KIT-01) หรือ ชุดฝึกสวนปัสสาวะ (KIT-02)\n"
        "3. กดปุ่ม '⚡ ขอเบิกชุดนี้ทันที (One-Click)'\n"
        "4. ตรวจสอบรายการและกดยืนยัน คำขอจะถูกส่งเพื่อจัดเตรียมทันที"
    )

    doc.add_page_break()

    # ---------------- CHAPTER 5 ----------------
    h_ch5 = doc.add_heading("บทที่ 5: การขอเข้าฝึกปฏิบัติการด้วยตนเองและสแกน QR Code", level=1)
    h_ch5.runs[0].font.name = 'Prompt'
    h_ch5.runs[0].font.color.rgb = RGBColor(0x0f, 0x76, 0x6e)

    doc.add_paragraph(
        "นิสิตสามารถจองห้องปฏิบัติการและเตียงฝึกซ้อมนอกเวลาเรียนเพื่อทบทวนทักษะ หรือเตรียมสอบ OSCE "
        "ผ่านระบบจองรอบเวลา (Time Slots Booking) และรับ Digital E-Ticket พร้อม QR Code สำหรับ Check-in"
    )

    bk_img = os.path.join(IMAGES_DIR, 'ui_mockup_practice_booking.png')
    if os.path.exists(bk_img):
        doc.add_picture(bk_img, width=Inches(5.8))
        p_cbk = doc.add_paragraph("รูปที่ 5.1: หน้าจอเลือกรอบเวลาและจองห้องปฏิบัติการฝึกซ้อม")
        p_cbk.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_cbk.runs[0].font.size = Pt(9.5)
        p_cbk.runs[0].font.italic = True

    tk_img = os.path.join(IMAGES_DIR, 'ui_mockup_practice_ticket.png')
    if os.path.exists(tk_img):
        doc.add_picture(tk_img, width=Inches(3.8))
        p_ctk = doc.add_paragraph("รูปที่ 5.2: บัตร Digital E-Ticket พร้อม QR Code Check-in")
        p_ctk.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p_ctk.runs[0].font.size = Pt(9.5)
        p_ctk.runs[0].font.italic = True

    doc.add_heading("ขั้นตอนการ Check-in หน้าห้องแล็บ:", level=2)
    doc.add_paragraph(
        "1. เดินทางมาถึงหน้าห้องปฏิบัติการก่อนเวลานัดหมายอย่างน้อย 5 นาที\n"
        "2. เปิดบัตร Digital E-Ticket บนสมาร์ทโฟนของนิสิต\n"
        "3. นำ QR Code สแกนที่เครื่องสแกนหน้าห้องปฏิบัติการ\n"
        "4. เมื่อระบบตรวจสอบผ่าน สถานะจะเปลี่ยนเป็น IN_PRACTICE และเริ่มบันทึกชั่วโมงฝึกซ้อมสะสม"
    )

    doc.add_page_break()

    # ---------------- CHAPTER 6 ----------------
    h_ch6 = doc.add_heading("บทที่ 6: การส่งคืนอุปกรณ์และข้อปฏิบัติความปลอดภัย", level=1)
    h_ch6.runs[0].font.name = 'Prompt'
    h_ch6.runs[0].font.color.rgb = RGBColor(0x0f, 0x76, 0x6e)

    doc.add_paragraph(
        "เพื่อรักษามาตรฐานความปลอดภัยและความพร้อมใช้ของอุปกรณ์ นิสิตต้องปฏิบัติตามกฎระเบียบอย่างเคร่งครัด:"
    )

    tbl_warn = doc.add_table(rows=1, cols=1)
    tbl_warn.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_w = tbl_warn.cell(0, 0)
    set_cell_background(c_w, "FFF1F2")
    set_cell_margins(c_w, top=140, bottom=140, left=200, right=200)
    p_w = c_w.paragraphs[0]
    r_wt = p_w.add_run("⚠️ ข้อพึงระวังด้านความปลอดภัยสูงสุด:\n")
    r_wt.font.name = 'Prompt'
    r_wt.font.bold = True
    r_wt.font.color.rgb = RGBColor(0xbe, 0x12, 0x3c)
    r_wb = p_w.add_run(
        "ห้ามนำเวชภัณฑ์หรือพัสดุที่มีป้ายเตือน 'สำหรับฝึกกับหุ่นจำลองเท่านั้น (For Simulation Only)' "
        "ไปใช้กับผู้ป่วยจริงบนหอผู้ป่วยหรือในคลินิกโดยเด็ดขาด การฝ่าฝืนถือเป็นความผิดทางวินัยร้ายแรง"
    )
    r_wb.font.size = Pt(10.5)

    doc.add_paragraph(
        "\nขั้นตอนการส่งคืนครุภัณฑ์:\n"
        "1. ตรวจสอบความสะอาดและจัดเก็บอุปกรณ์เข้าชุดให้เรียบร้อย\n"
        "2. นำส่งคืน ณ เคาน์เตอร์ห้องปฏิบัติการตามวัน-เวลาที่กำหนด\n"
        "3. เจ้าหน้าที่ตรวจสอบสภาพอุปกรณ์และกดยืนยันการรับคืนในระบบ สถานะเปลี่ยนเป็น RETURNED\n"
        "4. กรณีพบการชำรุดหรือสูญหาย ให้แจ้งเจ้าหน้าที่ทันทีเพื่อบันทึกในระบบและดำเนินการตามระเบียบคณะ"
    )

    # Save document
    doc.save(DOCX_PATH)
    print(f"Word document saved successfully: {DOCX_PATH}")

if __name__ == '__main__':
    generate_html_manual()
    generate_docx_manual()

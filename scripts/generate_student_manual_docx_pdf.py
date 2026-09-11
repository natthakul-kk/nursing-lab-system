import os
import sys
import docx
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls, qn

BASE_DIR = os.path.join('d:', os.sep, 'LAB-system')
MANUAL_DIR = os.path.join(BASE_DIR, 'manual')
IMAGES_DIR = os.path.join(MANUAL_DIR, 'images')
FLOWCHART_DIR = os.path.join(MANUAL_DIR, 'flowcharts')

DOCX_PATH = os.path.join(MANUAL_DIR, 'คู่มือการใช้งานระบบสำหรับนิสิตพยาบาล.docx')
DOCX_ASCII = os.path.join(MANUAL_DIR, 'student_user_manual.docx')
HTML_PATH = os.path.join(MANUAL_DIR, 'STUDENT_USER_MANUAL.html')

FONT_NAME = 'TH Sarabun PSK'
FONT_SIZE_BODY = 16
FONT_SIZE_H1 = 20
FONT_SIZE_H2 = 18
FONT_SIZE_H3 = 16

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

def apply_thai_font(run, font_name=FONT_NAME, size_pt=FONT_SIZE_BODY, bold=False, italic=False, color_rgb=None):
    run.font.name = font_name
    run.font.size = Pt(size_pt)
    run.font.bold = bold
    run.font.italic = italic
    if color_rgb:
        run.font.color.rgb = color_rgb
    rPr = run._r.get_or_add_rPr()
    rFonts = rPr.get_or_add_rFonts()
    rFonts.set(qn('w:ascii'), font_name)
    rFonts.set(qn('w:hAnsi'), font_name)
    rFonts.set(qn('w:cs'), font_name)

# -------------------------------------------------------------
# 1. GENERATE STANDALONE HTML MANUAL
# -------------------------------------------------------------
def generate_html_manual():
    print("Generating standalone HTML manual with TH Sarabun PSK 16pt...")
    html_content = f"""<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>คู่มือการใช้งานระบบห้องปฏิบัติการพยาบาลศาสตร์ สำหรับนิสิต (Student User Manual)</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700;800&display=swap');
    
    :root {{
      --primary: #0d9488;
      --primary-dark: #0f766e;
      --primary-light: #f0fdfa;
      --secondary: #0284c7;
      --accent: #f59e0b;
      --text-main: #0f172a;
      --text-muted: #334155;
      --border: #cbd5e1;
      --bg-page: #f8fafc;
      --bg-card: #ffffff;
    }}

    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: 'TH Sarabun PSK', 'TH Sarabun New', 'Sarabun', sans-serif;
      background: var(--bg-page);
      color: var(--text-main);
      line-height: 1.5;
      font-size: 16px;
    }}

    .container {{
      max-width: 960px;
      margin: 0 auto;
      padding: 30px 20px;
    }}

    .manual-header {{
      background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%);
      color: white;
      border-radius: 20px;
      padding: 40px 30px;
      text-align: center;
      margin-bottom: 30px;
      box-shadow: 0 15px 30px -10px rgba(13, 148, 136, 0.35);
    }}
    .header-badge {{
      display: inline-block;
      background: rgba(255, 255, 255, 0.2);
      border: 1px solid rgba(255, 255, 255, 0.35);
      padding: 4px 14px;
      border-radius: 24px;
      font-size: 14px;
      font-weight: 700;
      margin-bottom: 12px;
    }}
    .manual-header h1 {{
      font-size: 28px;
      font-weight: 800;
      margin-bottom: 6px;
    }}
    .manual-header h2 {{
      font-size: 20px;
      font-weight: 600;
      opacity: 0.95;
      margin-bottom: 12px;
    }}
    .manual-header p {{
      font-size: 15px;
      opacity: 0.85;
    }}

    .card {{
      background: var(--bg-card);
      border-radius: 16px;
      border: 1px solid var(--border);
      padding: 30px;
      margin-bottom: 24px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);
    }}

    h2.chapter-title {{
      font-size: 22px;
      font-weight: 800;
      color: var(--primary-dark);
      border-bottom: 2px solid #99f6e4;
      padding-bottom: 8px;
      margin-bottom: 18px;
    }}

    h3.section-title {{
      font-size: 18px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 20px;
      margin-bottom: 10px;
    }}

    p {{
      margin-bottom: 12px;
      color: var(--text-muted);
      font-size: 16px;
    }}

    ul, ol {{
      margin-left: 26px;
      margin-bottom: 14px;
      color: var(--text-muted);
      font-size: 16px;
    }}
    li {{
      margin-bottom: 4px;
    }}

    .figure-box {{
      margin: 20px 0;
      text-align: center;
      background: #f8fafc;
      border-radius: 14px;
      padding: 14px;
      border: 1px solid var(--border);
    }}
    .figure-box img {{
      max-width: 100%;
      height: auto;
      border-radius: 10px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }}
    .figure-caption {{
      font-size: 14px;
      color: #64748b;
      margin-top: 8px;
      font-weight: 600;
    }}

    .step-grid {{
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
      margin: 18px 0;
    }}
    .step-item {{
      display: flex;
      gap: 12px;
      background: #f0fdfa;
      border: 1.5px solid #99f6e4;
      border-radius: 12px;
      padding: 12px 16px;
      align-items: flex-start;
    }}
    .step-badge-num {{
      background: #0f766e;
      color: white;
      width: 28px;
      height: 28px;
      min-width: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 16px;
    }}
    .step-content h4 {{
      font-size: 16px;
      font-weight: 700;
      color: #0f766e;
      margin-bottom: 2px;
    }}
    .step-content p {{
      font-size: 15px;
      margin: 0;
      color: #334155;
    }}

    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      font-size: 15px;
    }}
    th {{
      background: #f1f5f9;
      color: #1e293b;
      font-weight: 700;
      text-align: left;
      padding: 10px 14px;
      border-bottom: 2px solid var(--border);
    }}
    td {{
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      color: var(--text-muted);
    }}

    .callout {{
      border-radius: 12px;
      padding: 14px 18px;
      margin: 16px 0;
      display: flex;
      gap: 12px;
      align-items: flex-start;
      font-size: 15px;
    }}
    .callout-info {{
      background: #f0fdfa;
      border: 1.5px solid #5eead4;
      color: #0f766e;
    }}
    .callout-warn {{
      background: #fff1f2;
      border: 1.5px solid #fecdd3;
      color: #be123c;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="manual-header">
      <span class="header-badge">SMART NURSING LAB • STUDENT MANUAL</span>
      <h1>คู่มือการใช้งานระบบห้องปฏิบัติการพยาบาลศาสตร์</h1>
      <h2>สำหรับนิสิตพยาบาลศาสตร์ (Student User Manual)</h2>
      <p>คณะพยาบาลศาสตร์ มหาวิทยาลัย • ฉบับภาพจากระบบจริงพร้อมขั้นตอน 1 2 3 4 อย่างละเอียด</p>
    </div>

    <!-- Chapter 1: Login -->
    <div class="card">
      <h2 class="chapter-title">🔑 บทที่ 1: การเข้าสู่ระบบ (Student Login)</h2>
      <p>เข้าสู่ระบบผ่านเว็บเบราว์เซอร์ของมหาวิทยาลัย โดยระบุรหัสนิสิตและรหัสผ่านตามขั้นตอนดังนี้:</p>

      <div class="figure-box">
        <img src="./images/step_login_guide.png" alt="ขั้นตอนการเข้าสู่ระบบ">
        <div class="figure-caption">รูปที่ 1.1: ภาพจากระบบจริง - ขั้นตอนการกรอกข้อมูลเข้าสู่ระบบ (ขั้นตอน 1 - 3)</div>
      </div>

      <div class="step-grid">
        <div class="step-item">
          <span class="step-badge-num">1</span>
          <div class="step-content">
            <h4>ขั้นตอนที่ 1: กรอกรหัสนิสิต / บัญชีผู้ใช้งาน</h4>
            <p>กรอกรหัสนิสิต (เช่น 6811700661) หรืออีเมลมหาวิทยาลัย (@ku.th)</p>
          </div>
        </div>
        <div class="step-item">
          <span class="step-badge-num">2</span>
          <div class="step-content">
            <h4>ขั้นตอนที่ 2: กรอกรหัสผ่าน (Password)</h4>
            <p>กรอกรหัสผ่านบัญชีนิสิตของตนเอง</p>
          </div>
        </div>
        <div class="step-item">
          <span class="step-badge-num" style="background: #0284c7;">3</span>
          <div class="step-content">
            <h4 style="color: #0284c7;">ขั้นตอนที่ 3: กดปุ่ม "เข้าสู่ระบบ (Sign In)"</h4>
            <p>ระบบจะตรวจสอบสิทธิ์และนำเข้าสู่หน้าจอหลักของนิสิตทันที</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Chapter 2: Standard Flowcharts (Straight Linear Arrows) -->
    <div class="card">
      <h2 class="chapter-title">📊 บทที่ 2: ผังงานขั้นตอนการทำงานมาตรฐาน (Standard Flowcharts)</h2>
      <p>ผังงานมาตรฐานสากล ISO 5807 เส้นตรงชัดเจน (Linear Flow) ไม่โค้งไปมา เพื่อให้อ่านเข้าใจง่าย:</p>

      <h3 class="section-title">2.1 ผังงานภาพรวมการใช้งานของนิสิต (Overall Student Lifecycle)</h3>
      <div class="figure-box">
        <img src="./flowcharts/flowchart_1_student_lifecycle.png" alt="ผังงานภาพรวม">
        <div class="figure-caption">ผังงานที่ 1: ภาพรวมกระบวนการใช้งานของนิสิต (เส้นตรงมาตรฐาน ไม่โค้ง)</div>
      </div>

      <h3 class="section-title">2.2 ผังงานการยืม-เบิก One-Stop และระบบ Patient Safety Lock</h3>
      <div class="figure-box">
        <img src="./flowcharts/flowchart_2_unified_borrow_requisition.png" alt="ผังงาน One-Stop">
        <div class="figure-caption">ผังงานที่ 2: ขั้นตอนการยืม-เบิก One-Stop พร้อมเงื่อนไขตรวจสอบความปลอดภัยคนจริง/หุ่น (เส้นตรงมาตรฐาน)</div>
      </div>
      <p><b>กระบวนการทำงานของผังงานที่ 2:</b></p>
      <ol>
        <li><b>เลือกรหัสรายวิชา:</b> นิสิตเลือกรหัสวิชา ระบบจะผูกชื่ออาจารย์ผู้รับผิดชอบให้อัตโนมัติ</li>
        <li><b>ระบุวัน-เวลานัดหมายรับของและส่งคืน:</b> พร้อมระบุวัตถุประสงค์และสถานที่ใช้งาน</li>
        <li><b>เลือกรายการครุภัณฑ์และเวชภัณฑ์:</b> รวมทั้งอุปกรณ์ส่งคืนและวัสดุสิ้นเปลืองในคำขอเดียว</li>
        <li><b>ตรวจสอบเงื่อนไขความปลอดภัย (Patient Safety Lock):</b>
          <ul>
            <li><b>กรณีใช้งานกับคนจริง / คลินิก (Clinical Patient):</b> ระบบจะล็อกความปลอดภัย กรองเฉพาะล็อตที่ยังไม่หมดอายุ 100% หากไม่พอยอดจะถูกปฏิเสธทันทีเพื่อความปลอดภัยของผู้ป่วย</li>
            <li><b>กรณีฝึกปฏิบัติกับหุ่นจำลอง (Sim-Lab):</b> ระบบอนุญาตให้เบิกเวชภัณฑ์หมดอายุได้เพื่อประหยัดงบประมาณของคณะ</li>
          </ul>
        </li>
        <li><b>ส่งคำขอและอนุมัติ:</b> แจ้งเตือนอาจารย์รับทราบ และส่งให้เจ้าหน้าที่แล็บตรวจจ่ายอุปกรณ์</li>
      </ol>

      <h3 class="section-title">2.3 ผังงานการจองห้องแล็บและ Check-in สแกนเข้าห้อง</h3>
      <div class="figure-box">
        <img src="./flowcharts/flowchart_3_practice_booking.png" alt="ผังงานการจองแล็บ">
        <div class="figure-caption">ผังงานที่ 3: ขั้นตอนการจองห้องปฏิบัติการและสแกน QR Code Check-in (เส้นตรงมาตรฐาน)</div>
      </div>
    </div>

    <!-- Chapter 3: One-Stop Borrowing (Steps 1, 2, 3, 4, 5, 6, 7) -->
    <div class="card">
      <h2 class="chapter-title">📑 บทที่ 3: ภาพรวมรายการคำขอและขั้นตอนการยืม-เบิก One-Stop (ภาพจากระบบจริง)</h2>
      <p>เมื่อนิสิตเข้าสู่เมนู <b>"ยืม-คืนอุปกรณ์"</b> ระบบจะแสดงหน้าจอภาพรวม (Overview Dashboard) แสดงรายการคำขอของนิสิตพร้อมสถานะการดำเนินการแบบเรียลไทม์ ดังรูปที่ 3.1:</p>

      <div class="figure-box">
        <img src="./images/overview_student_dashboard_annotated.png" alt="ภาพรวมรายการคำขอยืม-คืนของนิสิต">
        <div class="figure-caption">รูปที่ 3.1: ภาพจากระบบจริง - ภาพรวมรายการคำขอยืม-คืนของนิสิต (Overview Dashboard พร้อมข้อมูลคำขอจริงและปุ่ม One-Stop)</div>
      </div>

      <p>จากหน้าจอภาพรวม นิสิตสามารถตรวจสอบประวัติและสถานะคำขอของตนเองได้ 4 สถานะหลัก ได้แก่:</p>
      <ul>
        <li><b style="color: #d97706;">รออนุมัติ (PENDING):</b> คำขอถูกส่งเข้าระบบแล้ว อยู่ระหว่างรออาจารย์ผู้รับผิดชอบรายวิชารับทราบ และเจ้าหน้าที่ห้องปฏิบัติการตรวจสอบความถูกต้อง</li>
        <li><b style="color: #0284c7;">อนุมัติแล้ว (APPROVED):</b> คำขอได้รับการอนุมัติเรียบร้อยแล้ว นิสิตสามารถมารับอุปกรณ์ได้ตามวัน-เวลาที่ระบุ</li>
        <li><b style="color: #16a34a;">รับอุปกรณ์แล้ว (DISPENSED):</b> นิสิตมาติดต่อรับอุปกรณ์และเวชภัณฑ์ไปใช้งานแล้ว โดยต้องนำครุภัณฑ์มาส่งคืนตามกำหนดเวลา</li>
        <li><b style="color: #64748b;">คืนแล้ว (RETURNED):</b> นำครุภัณฑ์ส่งคืนเจ้าหน้าที่ตรวจรับความสมบูรณ์และปิดคำขอสมบูรณ์</li>
      </ul>

      <p style="margin-top: 16px;">เมื่อต้องการสร้างคำขอยืม-เบิกใหม่ ให้กดปุ่ม <b>"+ ขอยืม-เบิกอุปกรณ์ (One-Stop)"</b> ที่มุมขวาบน ระบบจะเปิดหน้าต่างฟอร์มรวมดังรูปที่ 3.2 ให้นิสิตกรอกข้อมูลตามหมายเลขกำกับในแต่ละช่องดังนี้:</p>

      <div class="figure-box">
        <img src="./images/step_borrow_one_stop_guide.png" alt="ขั้นตอนการยืม-เบิก One-Stop จากระบบจริง">
        <div class="figure-caption">รูปที่ 3.2: ภาพจากระบบจริง - ชี้ตำแหน่งที่ต้องกรอกแต่ละช่องอย่างชัดเจน (จุดที่ 1 ถึง 7)</div>
      </div>

      <div class="step-grid">
        <div class="step-item">
          <span class="step-badge-num">1</span>
          <div class="step-content">
            <h4>จุดที่ 1: เลือกวัตถุประสงค์การใช้งาน (Use Target & Patient Safety Lock)</h4>
            <p>• <b>🧪 ฝึกปฏิบัติการกับหุ่นจำลอง (Sim-Lab) [แนะนำ]:</b> สำหรับซ้อมในห้องแล็บ ระบบอนุญาตให้ใช้เวชภัณฑ์หมดอายุได้เพื่อประหยัดงบประมาณ<br>
               • <b>🧑‍⚕️ ใช้งานกับคนจริง / คลินิก (Clinical Patient):</b> สำหรับใช้กับผู้ป่วยจริง <u>ระบบจะบล็อกล็อตหมดอายุ 100%</u> เพื่อความปลอดภัยสูงสุด</p>
          </div>
        </div>

        <div class="step-item">
          <span class="step-badge-num">2</span>
          <div class="step-content">
            <h4>จุดที่ 2: เลือกรหัสรายวิชาทางการพยาบาล</h4>
            <p>เลือกรหัสวิชาที่ขอใช้อุปกรณ์ เช่น <i>NS201 การพยาบาลพื้นฐาน</i> <b>ระบบจะดึงชื่ออาจารย์ผู้รับผิดชอบรายวิชาขึ้นให้อัตโนมัติ</b> นิสิตไม่ต้องพิมพ์เอง</p>
          </div>
        </div>

        <div class="step-item">
          <span class="step-badge-num">3</span>
          <div class="step-content">
            <h4>จุดที่ 3: ระบุวัน-เวลาที่รับของ และกำหนดวันส่งคืน</h4>
            <p>• <b>วัน-เวลาที่ต้องการรับของ:</b> วันเวลาที่นิสิตจะเดินทางมารับอุปกรณ์ที่เคาน์เตอร์ห้องแล็บ<br>
               • <b>กำหนดวันส่งคืนครุภัณฑ์:</b> วันเวลาที่ต้องนำครุภัณฑ์มาส่งคืนหลังเสร็จสิ้นการเรียนการสอน</p>
          </div>
        </div>

        <div class="step-item">
          <span class="step-badge-num">4</span>
          <div class="step-content">
            <h4>จุดที่ 4: ระบุวัตถุประสงค์และสถานที่ใช้งาน</h4>
            <p>พิมพ์ระบุหัตถการและห้องเรียน เช่น <i>"ฝึกทักษะการทำแผลปลอดเชื้อและตรวจวัดสัญญาณชีพ OSCE ห้อง Lab 101"</i></p>
          </div>
        </div>

        <div class="step-item">
          <span class="step-badge-num">5</span>
          <div class="step-content">
            <h4>จุดที่ 5: เลือกรายการครุภัณฑ์ที่ยืม (Equipment)</h4>
            <p>ค้นหาและเลือกอุปกรณ์ทางการแพทย์ เช่น หุ่นฝึก, เครื่องวัดความดัน, Stethoscope พร้อมระบุจำนวนที่ต้องการยืม</p>
          </div>
        </div>

        <div class="step-item">
          <span class="step-badge-num">6</span>
          <div class="step-content">
            <h4>จุดที่ 6: เลือกรายการเวชภัณฑ์สิ้นเปลืองที่ขอเบิก (Consumables)</h4>
            <p>ค้นหาวัสดุใช้หมดไป เช่น ถุงมือตรวจโรค, ผ้ากอซสเตอไรล์, สำลี พร้อมระบุจำนวนและหน่วยบรรจุ</p>
          </div>
        </div>

        <div class="step-item">
          <span class="step-badge-num" style="background: #0284c7;">7</span>
          <div class="step-content">
            <h4 style="color: #0284c7;">จุดที่ 7: กดปุ่ม "🚀 ยืนยันและส่งคำขอ One-Stop"</h4>
            <p>เมื่อตรวจสอบข้อมูลครบถ้วนแล้ว ให้กดปุ่มเพื่อส่งคำขอเข้าสู่ระบบเพื่อรออาจารย์และเจ้าหน้าที่อนุมัติ</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Chapter 4: Kits -->
    <div class="card">
      <h2 class="chapter-title">📦 บทที่ 4: การขอเบิกชุดฝึกปฏิบัติการสำเร็จรูป (Nursing Practice Kits)</h2>
      <p>ชุด Box Set สำเร็จรูปตามหัตถการทางการพยาบาล สะดวก รวดเร็ว ขอเบิกได้ในคลิกเดียว:</p>

      <div class="figure-box">
        <img src="./images/step_kits_guide.png" alt="ชุดฝึกปฏิบัติการสำเร็จรูป">
        <div class="figure-caption">รูปที่ 4.1: ภาพจากระบบจริง - หน้ารายการชุดฝึกปฏิบัติการสำเร็จรูป (Kits)</div>
      </div>

      <div class="step-grid">
        <div class="step-item">
          <span class="step-badge-num">1</span>
          <div class="step-content">
            <h4>ขั้นตอนที่ 1: เลือกชุด Box Set ตามหัตถการ</h4>
            <p>เลือกชุดที่ต้องการ เช่น ชุดทำแผลปลอดเชื้อ, ชุดฝึกสวนปัสสาวะ, ชุดตรวจสัญญาณชีพ</p>
          </div>
        </div>
        <div class="step-item">
          <span class="step-badge-num" style="background: #0284c7;">2</span>
          <div class="step-content">
            <h4 style="color: #0284c7;">ขั้นตอนที่ 2: กดปุ่ม "⚡ ขอเบิกชุดนี้ทันที (One-Click)"</h4>
            <p>ระบบจะดึงรายการอุปกรณ์และเวชภัณฑ์ทั้งหมดในชุดให้อัตโนมัติ สะดวก ไม่ต้องเลือกทีละชิ้น</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Chapter 5: Booking & QR -->
    <div class="card">
      <h2 class="chapter-title">📅 บทที่ 5: การขอเข้าฝึกปฏิบัติการด้วยตนเองและการ Check-in</h2>
      <p>นิสิตสามารถจองห้องแล็บและเตียงฝึกนอกเวลาเรียนเพื่อทบทวนหัตถการก่อนสอบ OSCE:</p>

      <div class="figure-box">
        <img src="./images/step_booking_guide.png" alt="การจองห้องปฏิบัติการ">
        <div class="figure-caption">รูปที่ 5.1: ภาพจากระบบจริง - หน้าจองห้องปฏิบัติการและรอบเวลา (Time Slots)</div>
      </div>

      <div class="figure-box">
        <img src="./images/ui_mockup_practice_ticket.png" alt="Digital E-Ticket พร้อม QR Code" style="max-width: 440px;">
        <div class="figure-caption">รูปที่ 5.2: บัตร Digital E-Ticket พร้อม QR Code Check-in หน้าห้องแล็บ</div>
      </div>

      <div class="step-grid">
        <div class="step-item">
          <span class="step-badge-num">1</span>
          <div class="step-content">
            <h4>ขั้นตอนที่ 1: เลือกห้องปฏิบัติการและวันที่ฝึก</h4>
            <p>เลือกห้องปฏิบัติการและวันที่ต้องการฝึกซ้อม</p>
          </div>
        </div>
        <div class="step-item">
          <span class="step-badge-num">2</span>
          <div class="step-content">
            <h4>ขั้นตอนที่ 2: เลือกรอบเวลา (Time Slot) ที่มีที่ว่าง</h4>
            <p>เลือกรอบเวลาฝึกที่เปิดให้บริการ โดยรอบที่ว่างจะแสดงจำนวนที่นั่งสีเขียว</p>
          </div>
        </div>
        <div class="step-item">
          <span class="step-badge-num">3</span>
          <div class="step-content">
            <h4>ขั้นตอนที่ 3: ยืนยันการจอง และรับบัตร Digital E-Ticket</h4>
            <p>ระบบจะออกบัตร E-Ticket พร้อม QR Code ประจำรอบการจอง</p>
          </div>
        </div>
        <div class="step-item">
          <span class="step-badge-num" style="background: #0284c7;">4</span>
          <div class="step-content">
            <h4 style="color: #0284c7;">ขั้นตอนที่ 4: สแกน QR Code Check-in หน้าห้องแล็บ</h4>
            <p>เดินทางมาถึงหน้าห้องก่อนเวลา 5 นาที แล้วนำ QR Code ไปสแกนเช็คอินเพื่อบันทึกชั่วโมงฝึก</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Chapter 6: Safety Rules -->
    <div class="card">
      <h2 class="chapter-title">🛡️ บทที่ 6: การส่งคืนอุปกรณ์และข้อพึงระวังความปลอดภัย</h2>
      <div class="callout callout-warn">
        <div>⚠️</div>
        <div>
          <b>ข้อพึงระวังด้านความปลอดภัยสูงสุด (Patient Safety Warning):</b>
          <p>ห้ามนำเวชภัณฑ์ที่มีป้ายกำกับ <b>"สำหรับฝึกกับหุ่นจำลองเท่านั้น (For Simulation Only)"</b> ไปใช้กับผู้ป่วยจริงบนหอผู้ป่วยโดยเด็ดขาด</p>
        </div>
      </div>
      <p>ขั้นตอนการส่งคืนครุภัณฑ์:</p>
      <ul>
        <li>ทำความสะอาดอุปกรณ์และจัดเก็บเข้าชุดให้เรียบร้อยตามตำแหน่งเดิม</li>
        <li>นำส่งคืน ณ เคาน์เตอร์ห้องปฏิบัติการตามกำหนดเวลา</li>
        <li>เจ้าหน้าที่ตรวจรับความสมบูรณ์และกดปิดสถานะเป็น <code>RETURNED</code> ในระบบ</li>
      </ul>
    </div>

    <footer style="text-align: center; font-size: 14px; color: #64748b; padding: 20px 0;">
      งานห้องปฏิบัติการและเทคโนโลยีการศึกษา คณะพยาบาลศาสตร์ มหาวิทยาลัย<br>
      Smart Nursing Lab Management System • ฟอนต์ TH Sarabun PSK 16pt
    </footer>
  </div>
</body>
</html>
"""
    with open(HTML_PATH, 'w', encoding='utf-8') as f:
        f.write(html_content)
    print(f"HTML manual saved: {HTML_PATH}")

# -------------------------------------------------------------
# 2. GENERATE FORMAL WORD (.DOCX) MANUAL (TH Sarabun PSK 16pt)
# -------------------------------------------------------------
def generate_docx_manual():
    print(f"Generating Word (.docx) manual using {FONT_NAME} {FONT_SIZE_BODY}pt...")
    doc = Document()

    # Configure Margins: 1 inch around
    for section in doc.sections:
        section.top_margin = Inches(1.0)
        section.bottom_margin = Inches(1.0)
        section.left_margin = Inches(1.0)
        section.right_margin = Inches(1.0)

    # Base style
    normal_style = doc.styles['Normal']
    normal_style.font.name = FONT_NAME
    normal_style.font.size = Pt(FONT_SIZE_BODY)
    normal_style.font.color.rgb = RGBColor(0x0f, 0x17, 0x2a)
    rPr = normal_style._element.get_or_add_rPr()
    rFonts = rPr.get_or_add_rFonts()
    rFonts.set(qn('w:ascii'), FONT_NAME)
    rFonts.set(qn('w:hAnsi'), FONT_NAME)
    rFonts.set(qn('w:cs'), FONT_NAME)

    # ---------------- COVER PAGE ----------------
    p_cov = doc.add_paragraph()
    p_cov.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_cov.paragraph_format.space_before = Pt(80)
    p_cov.paragraph_format.space_after = Pt(12)

    r = p_cov.add_run("คณะพยาบาลศาสตร์ มหาวิทยาลัย\nSMART NURSING LAB MANAGEMENT SYSTEM\n")
    apply_thai_font(r, size_pt=18, bold=True, color_rgb=RGBColor(0x0d, 0x94, 0x88))

    r = p_cov.add_run("คู่มือการใช้งานระบบห้องปฏิบัติการพยาบาลศาสตร์\n")
    apply_thai_font(r, size_pt=26, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))

    r = p_cov.add_run("สำหรับนิสิตพยาบาลศาสตร์ (Student User Manual)\n")
    apply_thai_font(r, size_pt=20, bold=True, color_rgb=RGBColor(0x02, 0x84, 0xc7))

    r = p_cov.add_run("ฉบับภาพหน้าจอจากระบบจริง พร้อมขั้นตอน 1 2 3 4 อย่างละเอียด\n")
    apply_thai_font(r, size_pt=16, italic=True, color_rgb=RGBColor(0x64, 0x74, 0x8b))

    p_div = doc.add_paragraph()
    p_div.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p_div.paragraph_format.space_after = Pt(120)
    r = p_div.add_run("____________________________________________________")
    apply_thai_font(r, size_pt=14, color_rgb=RGBColor(0xcc, 0xfb, 0xf1))

    p_foot = doc.add_paragraph()
    p_foot.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r = p_foot.add_run(
        "งานห้องปฏิบัติการและเทคโนโลยีการศึกษา คณะพยาบาลศาสตร์\n"
        "ฟอนต์มาตรฐาน TH Sarabun PSK ขนาด 16 pt • ผังงานเส้นตรงมาตรฐาน ISO 5807\n"
        "ฉบับปรับปรุง กันยายน 2569"
    )
    apply_thai_font(r, size_pt=14, color_rgb=RGBColor(0x47, 0x55, 0x69))

    doc.add_page_break()

    # ---------------- TABLE OF CONTENTS ----------------
    p_th = doc.add_paragraph()
    p_th.paragraph_format.space_after = Pt(14)
    r = p_th.add_run("สารบัญ (Table of Contents)")
    apply_thai_font(r, size_pt=FONT_SIZE_H1, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))

    toc_items = [
        ("บทที่ 1: การเข้าสู่ระบบ (Student Login) พร้อมขั้นตอน 1-2-3", "หน้า 3"),
        ("บทที่ 2: ผังงานขั้นตอนการทำงานมาตรฐาน (Standard Flowcharts เส้นตรง)", "หน้า 4"),
        ("   - 2.1 ผังงานภาพรวมการใช้งานของนิสิต (Overall Student Lifecycle)", "หน้า 5"),
        ("   - 2.2 ผังงานการยืม-เบิก One-Stop และระบบ Patient Safety Lock", "หน้า 6"),
        ("   - 2.3 ผังงานการจองห้องแล็บและ Check-in สแกนเข้าห้อง", "หน้า 7"),
        ("บทที่ 3: ภาพรวมรายการคำขอและขั้นตอนการยืม-เบิก One-Stop (ชี้จุดที่ 1 ถึง 7)", "หน้า 8"),
        ("บทที่ 4: การขอเบิกชุดฝึกปฏิบัติการสำเร็จรูป (Nursing Practice Kits)", "หน้า 10"),
        ("บทที่ 5: การขอเข้าฝึกปฏิบัติการด้วยตนเองและสแกน QR Code Check-in", "หน้า 11"),
        ("บทที่ 6: การส่งคืนอุปกรณ์และข้อพึงระวังความปลอดภัย (Safety Rules)", "หน้า 13")
    ]

    for title, pg in toc_items:
        pt = doc.add_paragraph()
        pt.paragraph_format.space_after = Pt(4)
        rt = pt.add_run(f"{title} ".ljust(65, '.'))
        apply_thai_font(rt, size_pt=15)
        rp = pt.add_run(f" {pg}")
        apply_thai_font(rp, size_pt=15, bold=True)

    doc.add_page_break()

    # ---------------- CHAPTER 1: LOGIN ----------------
    p_c1 = doc.add_paragraph()
    r = p_c1.add_run("บทที่ 1: การเข้าสู่ระบบ (Student Login)")
    apply_thai_font(r, size_pt=FONT_SIZE_H1, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))

    p = doc.add_paragraph()
    r = p.add_run(
        "นิสิตสามารถเข้าสู่ระบบผ่านเว็บเบราว์เซอร์ของมหาวิทยาลัยได้จากทุกอุปกรณ์ "
        "โดยกรอกข้อมูลตามลำดับขั้นตอนดังแสดงในรูปที่ 1.1:"
    )
    apply_thai_font(r)

    login_img = os.path.join(IMAGES_DIR, 'step_login_guide.png')
    if os.path.exists(login_img):
        doc.add_picture(login_img, width=Inches(5.8))
        pc = doc.add_paragraph()
        pc.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = pc.add_run("รูปที่ 1.1: ภาพจากระบบจริง - ขั้นตอนการกรอกข้อมูลเข้าสู่ระบบ (ขั้นตอน 1 - 3)")
        apply_thai_font(r, size_pt=14, italic=True, color_rgb=RGBColor(0x64, 0x74, 0x8b))

    doc.add_paragraph()
    steps_login = [
        ("ขั้นตอนที่ 1 (กรอกรหัสนิสิต):", " กรอกรหัสนิสิต 10 หลัก (เช่น 6811700661) หรืออีเมลมหาวิทยาลัย"),
        ("ขั้นตอนที่ 2 (กรอกรหัสผ่าน):", " กรอกรหัสผ่านบัญชีผู้ใช้งานของนิสิต"),
        ("ขั้นตอนที่ 3 (กดปุ่มเข้าสู่ระบบ):", " กดปุ่ม 'เข้าสู่ระบบ (Sign In)' เพื่อเข้าสู่หน้าจอหลักของนิสิต")
    ]
    for stitle, sdesc in steps_login:
        ps = doc.add_paragraph()
        ps.paragraph_format.space_after = Pt(4)
        r1 = ps.add_run(f"• {stitle}")
        apply_thai_font(r1, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))
        r2 = ps.add_run(sdesc)
        apply_thai_font(r2)

    doc.add_page_break()

    # ---------------- CHAPTER 2: FLOWCHARTS ----------------
    p_c2 = doc.add_paragraph()
    r = p_c2.add_run("บทที่ 2: ผังงานขั้นตอนการทำงานมาตรฐาน (Standard Flowcharts)")
    apply_thai_font(r, size_pt=FONT_SIZE_H1, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))

    p = doc.add_paragraph()
    r = p.add_run(
        "ผังงานในระบบใช้มาตรฐานสากล ISO 5807 / ANSI โดยใช้เส้นเชื่อมโยงแบบตรง (Linear Flow) "
        "ไม่มีลูกศรโค้งไปมา เพื่อความชัดเจนและเป็นทางการในการนำไปปฏิบัติงานจริง:"
    )
    apply_thai_font(r)

    # Symbol Table
    table = doc.add_table(rows=6, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = table.rows[0].cells
    hdr[0].text = "สัญลักษณ์"
    hdr[1].text = "ชื่อมาตรฐาน"
    hdr[2].text = "ความหมายและการใช้งานในระบบ"
    for c in hdr:
        set_cell_background(c, "E2E8F0")
        apply_thai_font(c.paragraphs[0].runs[0], bold=True, size_pt=14)

    sym_data = [
        ("🟢 วงรี/แคปซูล (Terminator)", "จุดเริ่มต้น / จุดสิ้นสุด", "ระบุจุดเริ่มต้นหรือจุดสิ้นสุดของกระบวนการ"),
        ("⬜ สี่เหลี่ยมผืนผ้า (Process)", "ขั้นตอนการปฏิบัติงาน", "การกระทำ เช่น บันทึกข้อมูล, ตรวจสอบสต็อก, จัดส่งพัสดุ"),
        ("🔶 สี่เหลี่ยมข้าวหลามตัด (Decision)", "จุดตัดสินใจเงื่อนไข", "การตรวจสอบเงื่อนไข มีกิ่ง Yes / No ชัดเจน"),
        ("🔷 สี่เหลี่ยมด้านขนาน (Data I/O)", "การรับ-แสดงข้อมูล", "การเลือกรายวิชา, การระบุจำนวนยืม-เบิก, แสดงตาราง"),
        ("📄 เอกสาร (Document)", "เอกสารและแจ้งเตือน", "การออกบัตร Digital E-Ticket และ QR Code")
    ]
    for idx, (s1, s2, s3) in enumerate(sym_data, start=1):
        row = table.rows[idx].cells
        row[0].text = s1
        row[1].text = s2
        row[2].text = s3
        for c in row:
            apply_thai_font(c.paragraphs[0].runs[0], size_pt=14)
            set_cell_margins(c, top=60, bottom=60, left=100, right=100)

    doc.add_paragraph()
    p = doc.add_paragraph()
    r = p.add_run("2.1 ผังงานภาพรวมการใช้งานของนิสิต (Overall Student Lifecycle)")
    apply_thai_font(r, size_pt=FONT_SIZE_H2, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))

    fc1 = os.path.join(FLOWCHART_DIR, 'flowchart_1_student_lifecycle.png')
    if os.path.exists(fc1):
        doc.add_picture(fc1, width=Inches(5.8))
        pc = doc.add_paragraph()
        pc.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = pc.add_run("ผังงานที่ 1: ภาพรวมกระบวนการใช้งานระบบของนิสิตพยาบาล (เส้นตรงมาตรฐาน ISO 5807)")
        apply_thai_font(r, size_pt=14, italic=True, color_rgb=RGBColor(0x64, 0x74, 0x8b))

    doc.add_page_break()

    p = doc.add_paragraph()
    r = p.add_run("2.2 ผังงานการยืม-เบิก One-Stop และระบบ Patient Safety Lock")
    apply_thai_font(r, size_pt=FONT_SIZE_H2, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))

    fc2 = os.path.join(FLOWCHART_DIR, 'flowchart_2_unified_borrow_requisition.png')
    if os.path.exists(fc2):
        doc.add_picture(fc2, width=Inches(5.8))
        pc = doc.add_paragraph()
        pc.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = pc.add_run("ผังงานที่ 2: ขั้นตอนการยืม-เบิก One-Stop พร้อมเงื่อนไขตรวจสอบความปลอดภัยคนจริง/หุ่น (เส้นตรงมาตรฐาน ISO 5807)")
        apply_thai_font(r, size_pt=14, italic=True, color_rgb=RGBColor(0x64, 0x74, 0x8b))

    doc.add_paragraph()
    p_f2_desc = doc.add_paragraph()
    r = p_f2_desc.add_run("คำอธิบายขั้นตอนการทำงานของผังงานที่ 2:")
    apply_thai_font(r, size_pt=FONT_SIZE_H3, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))

    f2_steps = [
        ("1. เลือกรหัสรายวิชา:", " เลือกรหัสวิชา ระบบจะดึงชื่ออาจารย์ผู้รับผิดชอบรายวิชาให้อัตโนมัติทันที"),
        ("2. ระบุวัน-เวลานัดหมายรับและส่งคืน:", " กำหนดวันเวลาที่มารับของ และกำหนดส่งคืน พร้อมระบุสถานที่และหัตถการ"),
        ("3. เลือกรายการครุภัณฑ์และเวชภัณฑ์:", " ค้นหาและระบุจำนวนอุปกรณ์ที่ต้องการยืมและเวชภัณฑ์ที่ขอเบิก"),
        ("4. ตรวจสอบเงื่อนไข Patient Safety Lock:",
         "\n     • กรณีใช้งานกับคนจริง / คลินิก: ระบบจะบล็อกเวชภัณฑ์ล็อตหมดอายุ 100% ตรวจสอบเฉพาะล็อตที่ยังไม่หมดอายุ หากไม่พอจะปฏิเสธคำขอทันทีเพื่อความปลอดภัยของผู้ป่วย"
         "\n     • กรณีฝึกปฏิบัติกับหุ่นจำลอง (Sim-Lab): ระบบอนุญาตให้ใช้เวชภัณฑ์หมดอายุได้เพื่อประหยัดงบประมาณ โดยตรวจสอบยอดสต็อกรวม"),
        ("5. ส่งคำขอและอนุมัติ:", " แจ้งเตือนอาจารย์รับทราบ และส่งให้เจ้าหน้าที่ห้องปฏิบัติการตรวจสอบอนุมัติและจ่ายพัสดุ")
    ]
    for stitle, sdesc in f2_steps:
        ps = doc.add_paragraph()
        ps.paragraph_format.space_after = Pt(4)
        r1 = ps.add_run(f"  • {stitle}")
        apply_thai_font(r1, bold=True, color_rgb=RGBColor(0x02, 0x84, 0xc7))
        r2 = ps.add_run(sdesc)
        apply_thai_font(r2)

    doc.add_page_break()

    p = doc.add_paragraph()
    r = p.add_run("2.3 ผังงานการจองห้องปฏิบัติการและ Check-in สแกนเข้าห้อง")
    apply_thai_font(r, size_pt=FONT_SIZE_H2, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))

    fc3 = os.path.join(FLOWCHART_DIR, 'flowchart_3_practice_booking.png')
    if os.path.exists(fc3):
        doc.add_picture(fc3, width=Inches(5.8))
        pc = doc.add_paragraph()
        pc.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = pc.add_run("ผังงานที่ 3: ขั้นตอนการจองห้องแล็บและ Check-in สแกนเข้าห้อง (เส้นตรงมาตรฐาน)")
        apply_thai_font(r, size_pt=14, italic=True, color_rgb=RGBColor(0x64, 0x74, 0x8b))

    doc.add_page_break()

    # ---------------- CHAPTER 3: REAL BORROWING (1, 2, 3, 4, 5, 6, 7) ----------------
    p_c3 = doc.add_paragraph()
    r = p_c3.add_run("บทที่ 3: ภาพรวมรายการคำขอและขั้นตอนการยืม-เบิก One-Stop (ภาพจากระบบจริง)")
    apply_thai_font(r, size_pt=FONT_SIZE_H1, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))

    p = doc.add_paragraph()
    r = p.add_run(
        "เมื่อนิสิตเข้าสู่เมนู 'ยืม-คืนอุปกรณ์' ระบบจะแสดงหน้าจอภาพรวม (Overview Dashboard) "
        "แสดงรายการประวัติคำขอของนิสิตพร้อมสถานะแบบเรียลไทม์ ดังแสดงในรูปที่ 3.1:"
    )
    apply_thai_font(r)

    overview_img = os.path.join(IMAGES_DIR, 'overview_student_dashboard_annotated.png')
    if os.path.exists(overview_img):
        doc.add_picture(overview_img, width=Inches(5.8))
        pc = doc.add_paragraph()
        pc.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = pc.add_run("รูปที่ 3.1: ภาพจากระบบจริง - ภาพรวมรายการคำขอยืม-คืนของนิสิต (Overview Dashboard พร้อมข้อมูลคำขอจริงและปุ่ม One-Stop)")
        apply_thai_font(r, size_pt=14, italic=True, color_rgb=RGBColor(0x64, 0x74, 0x8b))

    doc.add_paragraph()
    p_status = doc.add_paragraph()
    r = p_status.add_run("สถานะของคำขอในหน้าภาพรวม ประกอบด้วย 4 สถานะหลัก:")
    apply_thai_font(r, size_pt=FONT_SIZE_H3, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))

    statuses = [
        ("รออนุมัติ (PENDING):", " คำขอถูกส่งแล้ว อยู่ระหว่างรออาจารย์ประจำวิชารับทราบ และเจ้าหน้าที่ตรวจสอบความถูกต้อง"),
        ("อนุมัติแล้ว (APPROVED):", " คำขอผ่านการอนุมัติแล้ว นิสิตสามารถเดินทางมารับอุปกรณ์ได้ตามวัน-เวลาที่นัดหมาย"),
        ("รับอุปกรณ์แล้ว (DISPENSED):", " นิสิตรับอุปกรณ์ไปใช้งานในการเรียนการสอนแล้ว โดยต้องนำมาส่งคืนตามกำหนด"),
        ("คืนแล้ว (RETURNED):", " ครุภัณฑ์ได้รับการส่งคืนและเจ้าหน้าที่ตรวจรับความเรียบร้อยสมบูรณ์แล้ว")
    ]
    for stitle, sdesc in statuses:
        ps = doc.add_paragraph()
        ps.paragraph_format.space_after = Pt(4)
        r1 = ps.add_run(f"  • {stitle}")
        apply_thai_font(r1, bold=True, color_rgb=RGBColor(0x02, 0x84, 0xc7))
        r2 = ps.add_run(sdesc)
        apply_thai_font(r2)

    doc.add_paragraph()
    p = doc.add_paragraph()
    r = p.add_run(
        "เมื่อต้องการยืม-เบิกอุปกรณ์ ให้กดปุ่ม '+ ขอยืม-เบิกอุปกรณ์ (One-Stop)' ที่มุมขวาบนของหน้าจอ "
        "ระบบจะเปิดหน้าต่างฟอร์มรวม ดังแสดงในรูปที่ 3.2 ให้นิสิตกรอกข้อมูลตามหมายเลขกำกับจุดที่ 1 ถึง 7:"
    )
    apply_thai_font(r)

    borrow_img = os.path.join(IMAGES_DIR, 'step_borrow_one_stop_guide.png')
    if os.path.exists(borrow_img):
        doc.add_picture(borrow_img, width=Inches(5.8))
        pc = doc.add_paragraph()
        pc.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = pc.add_run("รูปที่ 3.2: ภาพจากระบบจริง - ชี้ตำแหน่งและสิ่งที่ต้องกรอกในแต่ละช่อง (จุดที่ 1 ถึง 7)")
        apply_thai_font(r, size_pt=14, italic=True, color_rgb=RGBColor(0x64, 0x74, 0x8b))

    doc.add_paragraph()
    p = doc.add_paragraph()
    r = p.add_run("รายละเอียดสิ่งที่ต้องกรอกในแต่ละช่อง (คำอธิบายตามหมายเลข):")
    apply_thai_font(r, size_pt=FONT_SIZE_H2, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))

    steps_borrow = [
        ("จุดที่ 1: เลือกวัตถุประสงค์การใช้งาน (Use Target & Safety Lock)",
         "นิสิตต้องเลือกระหว่าง:\n"
         "  • 🧪 ฝึกปฏิบัติการกับหุ่นจำลอง (Sim-Lab) [แนะนำ]: สำหรับการฝึกซ้อมในห้องแล็บ ระบบอนุญาตให้เบิกเวชภัณฑ์ที่หมดอายุแล้วสำหรับการฝึกซ้อมได้ เพื่อช่วยประหยัดงบประมาณของคณะ\n"
         "  • 🧑‍⚕️ ใช้งานกับคนจริง / คลินิก (Clinical Patient): สำหรับหัตถการกับผู้ป่วยจริงบนหอผู้ป่วย ระบบ Patient Safety Lock จะทำงานทันที โดยจะบล็อกล็อตหมดอายุ 100% และจ่ายเฉพาะเวชภัณฑ์ที่ยังไม่หมดอายุเท่านั้น"),

        ("จุดที่ 2: เลือกรหัสรายวิชาทางการพยาบาล",
         "กดเลือกรายวิชาที่นิสิตกำลังเรียน เช่น NS201 การพยาบาลพื้นฐาน จุดเด่นของระบบคือ: เมื่อเลือกวิชาแล้ว ระบบจะดึงชื่ออาจารย์ผู้รับผิดชอบรายวิชาขึ้นมาให้อัตโนมัติทันที นิสิตไม่ต้องพิมพ์ชื่ออาจารย์เอง"),

        ("จุดที่ 3: ระบุวันและเวลาที่รับของ และกำหนดวันส่งคืน",
         "  • วัน-เวลาที่ต้องการรับของ: ระบุวันและเวลาที่นิสิตจะเดินทางมารับอุปกรณ์ที่เคาน์เตอร์ห้องแล็บ\n"
         "  • กำหนดวันส่งคืนครุภัณฑ์: ระบุวันและเวลาที่ต้องนำครุภัณฑ์มาส่งคืนหลังเสร็จสิ้นการฝึกปฏิบัติ"),

        ("จุดที่ 4: ระบุวัตถุประสงค์และสถานที่ใช้งาน",
         "พิมพ์ระบุหัตถการและสถานที่ใช้งาน เช่น 'ฝึกทักษะการทำแผลปลอดเชื้อและตรวจวัดสัญญาณชีพ OSCE ณ ห้อง Lab Skill 101'"),

        ("จุดที่ 5: เลือกรายการครุภัณฑ์ที่ยืม (Equipment)",
         "ค้นหาและเลือกอุปกรณ์ทางการแพทย์ที่ต้องส่งคืน เช่น หุ่นฝึกทำแผล, เครื่องวัดความดันโลหิต, หูฟังแพทย์ Stethoscope พร้อมระบุจำนวนชิ้นที่ต้องการยืม"),

        ("จุดที่ 6: เลือกรายการเวชภัณฑ์สิ้นเปลืองที่ขอเบิก (Consumables)",
         "ค้นหาและเลือกเวชภัณฑ์ใช้หมดไป เช่น ถุงมือตรวจโรค, ผ้ากอซสเตอไรล์, สำลีก้อนปลอดเชื้อ พร้อมระบุจำนวนและหน่วยบรรจุที่ขอเบิก"),

        ("จุดที่ 7: กดปุ่มยืนยันส่งคำขอ One-Stop",
         "ตรวจสอบความถูกต้องของข้อมูลทั้งหมด แล้วกดปุ่ม '🚀 ยืนยันและส่งคำขอ One-Stop' ระบบจะส่งคำขอไปยังอาจารย์ประจำวิชาเพื่อรับทราบ และส่งต่อให้เจ้าหน้าที่ห้องแล็บตรวจสอบอนุมัติ")
    ]

    for stitle, sdesc in steps_borrow:
        ps = doc.add_paragraph()
        ps.paragraph_format.space_after = Pt(6)
        r1 = ps.add_run(f"• {stitle}\n")
        apply_thai_font(r1, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))
        r2 = ps.add_run(sdesc)
        apply_thai_font(r2)

    doc.add_page_break()

    # ---------------- CHAPTER 4: KITS ----------------
    p_c4 = doc.add_paragraph()
    r = p_c4.add_run("บทที่ 4: การขอเบิกชุดฝึกปฏิบัติการสำเร็จรูป (Nursing Practice Kits)")
    apply_thai_font(r, size_pt=FONT_SIZE_H1, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))

    p = doc.add_paragraph()
    r = p.add_run(
        "ชุด Box Set รวมอุปกรณ์มาตรฐานตามหัตถการทางการพยาบาล ช่วยให้นิสิตขอเบิกได้ครบชุดในคลิกเดียว (One-Click):"
    )
    apply_thai_font(r)

    kits_img = os.path.join(IMAGES_DIR, 'step_kits_guide.png')
    if os.path.exists(kits_img):
        doc.add_picture(kits_img, width=Inches(5.8))
        pc = doc.add_paragraph()
        pc.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = pc.add_run("รูปที่ 4.1: ภาพจากระบบจริง - หน้ารายการชุดฝึกสำเร็จรูป พร้อมขั้นตอน 1-2")
        apply_thai_font(r, size_pt=14, italic=True, color_rgb=RGBColor(0x64, 0x74, 0x8b))

    steps_kits = [
        ("ขั้นตอนที่ 1:", " เลือกชุด Box Set ตามหัตถการในบทเรียน เช่น ชุดทำแผลปลอดเชื้อ, ชุดฝึกสวนปัสสาวะ"),
        ("ขั้นตอนที่ 2:", " ตรวจสอบรายการเวชภัณฑ์ในชุด และกดปุ่ม '⚡ ขอเบิกชุดนี้ทันที (One-Click)'")
    ]
    for stitle, sdesc in steps_kits:
        ps = doc.add_paragraph()
        ps.paragraph_format.space_after = Pt(4)
        r1 = ps.add_run(f"• {stitle}")
        apply_thai_font(r1, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))
        r2 = ps.add_run(sdesc)
        apply_thai_font(r2)

    doc.add_page_break()

    # ---------------- CHAPTER 5: BOOKING & QR ----------------
    p_c5 = doc.add_paragraph()
    r = p_c5.add_run("บทที่ 5: การขอเข้าฝึกปฏิบัติการด้วยตนเองและการ Check-in")
    apply_thai_font(r, size_pt=FONT_SIZE_H1, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))

    p = doc.add_paragraph()
    r = p.add_run(
        "นิสิตสามารถจองห้องปฏิบัติการและเตียงฝึกซ้อมนอกเวลาเรียนเพื่อทบทวนทักษะ OSCE "
        "โดยเลือกรอบเวลาและรับ Digital E-Ticket พร้อม QR Code สำหรับ Check-in หน้าห้องแล็บ:"
    )
    apply_thai_font(r)

    bk_img = os.path.join(IMAGES_DIR, 'step_booking_guide.png')
    if os.path.exists(bk_img):
        doc.add_picture(bk_img, width=Inches(5.8))
        pc = doc.add_paragraph()
        pc.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = pc.add_run("รูปที่ 5.1: ภาพจากระบบจริง - หน้าจองห้องปฏิบัติการและรอบเวลา (Time Slots)")
        apply_thai_font(r, size_pt=14, italic=True, color_rgb=RGBColor(0x64, 0x74, 0x8b))

    tk_img = os.path.join(IMAGES_DIR, 'ui_mockup_practice_ticket.png')
    if os.path.exists(tk_img):
        doc.add_picture(tk_img, width=Inches(3.8))
        pc = doc.add_paragraph()
        pc.alignment = WD_ALIGN_PARAGRAPH.CENTER
        r = pc.add_run("รูปที่ 5.2: บัตรเข้าห้องปฏิบัติการ Digital E-Ticket พร้อม QR Code สำหรับสแกน Check-in")
        apply_thai_font(r, size_pt=14, italic=True, color_rgb=RGBColor(0x64, 0x74, 0x8b))

    steps_bk = [
        ("ขั้นตอนที่ 1:", " เลือกห้องปฏิบัติการและวันที่ต้องการฝึกซ้อม"),
        ("ขั้นตอนที่ 2:", " เลือกรอบเวลา (Time Slot) ที่เปิดให้บริการ โดยรอบที่มีที่นั่งว่างจะแสดงจำนวนสีเขียว"),
        ("ขั้นตอนที่ 3:", " ระบุรายวิชาและวัตถุประสงค์ จากนั้นกดยืนยันการจองเพื่อรับ Digital E-Ticket"),
        ("ขั้นตอนที่ 4 (Check-in):", " เดินทางมาถึงหน้าห้องก่อนเวลา 5 นาที และนำ QR Code บนสมาร์ทโฟนสแกนที่เครื่องสแกนหน้าห้องแล็บเพื่อเช็คอินและเริ่มสะสมชั่วโมงฝึกปฏิบัติ")
    ]
    for stitle, sdesc in steps_bk:
        ps = doc.add_paragraph()
        ps.paragraph_format.space_after = Pt(4)
        r1 = ps.add_run(f"• {stitle}")
        apply_thai_font(r1, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))
        r2 = ps.add_run(sdesc)
        apply_thai_font(r2)

    doc.add_page_break()

    # ---------------- CHAPTER 6: SAFETY ----------------
    p_c6 = doc.add_paragraph()
    r = p_c6.add_run("บทที่ 6: การส่งคืนอุปกรณ์และข้อพึงระวังความปลอดภัย")
    apply_thai_font(r, size_pt=FONT_SIZE_H1, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))

    tbl_warn = doc.add_table(rows=1, cols=1)
    tbl_warn.alignment = WD_TABLE_ALIGNMENT.CENTER
    c_w = tbl_warn.cell(0, 0)
    set_cell_background(c_w, "FFF1F2")
    set_cell_margins(c_w, top=140, bottom=140, left=200, right=200)
    p_w = c_w.paragraphs[0]
    r_wt = p_w.add_run("⚠️ ข้อพึงระวังด้านความปลอดภัยสูงสุด (Patient Safety Warning):\n")
    apply_thai_font(r_wt, bold=True, color_rgb=RGBColor(0xbe, 0x12, 0x3c))
    r_wb = p_w.add_run(
        "ห้ามนำเวชภัณฑ์หรืออุปกรณ์ที่มีป้ายเตือน 'สำหรับฝึกกับหุ่นจำลองเท่านั้น (For Simulation Only)' "
        "ไปใช้กับผู้ป่วยจริงบนหอผู้ป่วยหรือในคลินิกโดยเด็ดขาด เพื่อความปลอดภัยสูงสุดของผู้ป่วย"
    )
    apply_thai_font(r_wb, size_pt=15)

    doc.add_paragraph()
    p = doc.add_paragraph()
    r = p.add_run("ขั้นตอนการส่งคืนครุภัณฑ์:")
    apply_thai_font(r, size_pt=FONT_SIZE_H2, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))

    steps_ret = [
        ("1. ทำความสะอาดอุปกรณ์:", " เช็ดทำความสะอาดอุปกรณ์และจัดเก็บเข้ากล่องบรรจุให้เรียบร้อยตามตำแหน่งเดิม"),
        ("2. นำส่งคืน ณ เคาน์เตอร์แล็บ:", " ส่งคืนอุปกรณ์ตามวัน-เวลาที่กำหนดในระบบ"),
        ("3. ตรวจรับและปิดสถานะ:", " เจ้าหน้าที่แล็บตรวจนับความสมบูรณ์และกดรับคืน สถานะเปลี่ยนเป็น RETURNED"),
        ("4. กรณีชำรุดหรือสูญหาย:", " ให้รีบแจ้งเจ้าหน้าที่ทันทีเพื่อบันทึกประวัติการส่งซ่อมบำรุงตามระเบียบ")
    ]
    for stitle, sdesc in steps_ret:
        ps = doc.add_paragraph()
        ps.paragraph_format.space_after = Pt(4)
        r1 = ps.add_run(f"• {stitle}")
        apply_thai_font(r1, bold=True, color_rgb=RGBColor(0x0f, 0x76, 0x6e))
        r2 = ps.add_run(sdesc)
        apply_thai_font(r2)

    # Save Word document
    doc.save(DOCX_PATH)
    import shutil
    shutil.copyfile(DOCX_PATH, DOCX_ASCII)
    print(f"Word document saved successfully: {DOCX_PATH}")

if __name__ == '__main__':
    generate_html_manual()
    generate_docx_manual()

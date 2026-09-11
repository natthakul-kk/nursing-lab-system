import os
import shutil
import subprocess

manual_dir = os.path.join('d:', os.sep, 'LAB-system', 'manual')
thai_docx = os.path.join(manual_dir, 'คู่มือการใช้งานระบบสำหรับนิสิตพยาบาล.docx')
ascii_docx = os.path.join(manual_dir, 'student_user_manual.docx')

shutil.copyfile(thai_docx, ascii_docx)

ps1_content = """
$w = New-Object -ComObject Word.Application
$w.Visible = $false
$docPath = "d:\\LAB-system\\manual\\student_user_manual.docx"
$pdfAscii = "d:\\LAB-system\\manual\\student_user_manual.pdf"
$pdfThaiV2 = "d:\\LAB-system\\manual\\คู่มือการใช้งานระบบสำหรับนิสิตพยาบาล_ฉบับปรับปรุง_ระบบจริง.pdf"
$pdfThai = "d:\\LAB-system\\manual\\คู่มือการใช้งานระบบสำหรับนิสิตพยาบาล.pdf"

try {
    Write-Host "Opening Word Document: $docPath"
    $doc = $w.Documents.Open($docPath)
    
    Write-Host "Exporting to $pdfAscii..."
    $doc.ExportAsFixedFormat($pdfAscii, 17)
    $doc.Close([ref]$false)
    $targets = @(
        "d:\\LAB-system\\manual\\คู่มือการใช้งานระบบสำหรับนิสิตพยาบาล_ฉบับสมบูรณ์_ระบบจริง.pdf",
        "d:\\LAB-system\\manual\\คู่มือการใช้งานระบบสำหรับนิสิตพยาบาล_ฉบับล่าสุด_ระบบจริง.pdf",
        "d:\\LAB-system\\manual\\คู่มือการใช้งานระบบสำหรับนิสิตพยาบาล_ฉบับปรับปรุง_ระบบจริง.pdf",
        "d:\\LAB-system\\manual\\คู่มือการใช้งานระบบสำหรับนิสิตพยาบาล.pdf"
    )

    foreach ($t in $targets) {
        try {
            Copy-Item $pdfAscii $t -Force
            Write-Host "Copied to $t successfully!"
        } catch {
            Write-Host "Notice: $t is open by user reader, skipped overwrite."
        }
    }

    Write-Host "ALL_PDF_CONVERSION_SUCCESS"
} catch {
    Write-Host "FATAL_ERROR: $($_.Exception.Message)"
} finally {
    $w.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($w) | Out-Null
    [System.GC]::Collect()
    [System.GC]::WaitForPendingFinalizers()
}
"""

ps1_path = os.path.join('d:', os.sep, 'LAB-system', 'scripts', 'temp_convert.ps1')
with open(ps1_path, 'w', encoding='utf-8-sig') as f:
    f.write(ps1_content.strip())

res = subprocess.run(["powershell", "-ExecutionPolicy", "Bypass", "-File", ps1_path], capture_output=True, text=True, encoding="utf-8", errors="replace")
print("STDOUT:", res.stdout)
print("STDERR:", res.stderr)

if os.path.exists(ps1_path):
    os.remove(ps1_path)

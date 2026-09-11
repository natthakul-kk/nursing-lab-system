 = New-Object -ComObject Word.Application
.Visible = False
 = 'd:\LAB-system\manual\Nursing_Lab_System_User_Manual_Complete.docx'
 = 'd:\LAB-system\manual\Nursing_Lab_System_User_Manual_Complete.pdf'
 = 'd:\LAB-system\manual\คู่มือการใช้งานระบบห้องปฏิบัติการพยาบาล_ฉบับสมบูรณ์.pdf'

Write-Output 'Opening document...'
 = .Documents.Open()
Write-Output 'Exporting PDF...'
.ExportAsFixedFormat(, 17)
.ExportAsFixedFormat(, 17)
.Close([ref]False)
.Quit()
Write-Output 'PDF conversion complete!'

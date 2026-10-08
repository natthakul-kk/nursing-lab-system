const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function update() {
  const url11 = 'https://drive.google.com/file/d/1tuK7VZyzaVF0k8TcPancxcG9ZIVGOVKI/view?usp=drive_link';
  const url12 = 'https://drive.google.com/file/d/1tuK7VZyzaVF0k8TcPancxcG9ZIVGOVKI/view?usp=drive_link';
  const urlUrc = 'https://drive.google.com/file/d/14LvWKWvQuOa_B4OO4QOFRgdj338vXCha/view?usp=drive_link';

  // 1. Update EQ-OB-0008 (หุ่นฝึกอาบน้ำทารก เพศชาย)
  const it8 = await prisma.item.update({
    where: { code: 'EQ-OB-0008' },
    data: { imageUrl: url11 }
  });
  const res8 = await prisma.equipmentAsset.updateMany({
    where: { itemId: it8.id },
    data: { imageUrl: url11 }
  });
  console.log('✓ Updated EQ-OB-0008 (หุ่นฝึกอาบน้ำทารก เพศชาย):', res8.count, 'assets');

  // 2. Update EQ-OB-0010 (หุ่นฝึกอาบน้ำทารก เพศหญิง)
  const it10 = await prisma.item.update({
    where: { code: 'EQ-OB-0010' },
    data: { imageUrl: url12 }
  });
  const res10 = await prisma.equipmentAsset.updateMany({
    where: { itemId: it10.id },
    data: { imageUrl: url12 }
  });
  console.log('✓ Updated EQ-OB-0010 (หุ่นฝึกอาบน้ำทารก เพศหญิง):', res10.count, 'assets');

  // 3. Update EQ-URC-0001 (หุ่นฝึกการใส่สายสวนปัสสาวะ (สลับเพศ))
  const itUrc = await prisma.item.update({
    where: { code: 'EQ-URC-0001' },
    data: { imageUrl: urlUrc }
  });
  const resUrc = await prisma.equipmentAsset.updateMany({
    where: { itemId: itUrc.id },
    data: { imageUrl: urlUrc }
  });
  console.log('✓ Updated EQ-URC-0001 (หุ่นฝึกการใส่สายสวนปัสสาวะ (สลับเพศ)):', resUrc.count, 'assets');
}

update()
  .then(() => {
    console.log('Database updates complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

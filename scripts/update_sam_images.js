const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateSAM() {
  const urlSAM = 'https://drive.google.com/file/d/1LI1x5YY8n31UAw8_Z4AJmhrtLtEvQBmN/view?usp=drive_link';
  const samAssetCodes = [];
  for (let i = 1; i <= 10; i++) {
    samAssetCodes.push(`EQ-SAM-${String(i).padStart(4, '0')}`);
  }

  console.log('=== Updating EQ-SAM-0001 to 0010 ===');
  const res = await prisma.equipmentAsset.updateMany({
    where: { assetCode: { in: samAssetCodes } },
    data: { imageUrl: urlSAM }
  });
  console.log(`✓ Updated ${res.count} assets for SAM`);

  const item = await prisma.item.update({
    where: { code: 'EQ-SAM-0001' },
    data: { imageUrl: urlSAM }
  });
  console.log(`✓ Updated Item [${item.code}] ${item.name}`);
}

updateSAM()
  .then(() => {
    console.log('Update complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

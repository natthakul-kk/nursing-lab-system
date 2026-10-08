const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateNGImages() {
  const targetUrl = 'https://drive.google.com/file/d/1Ir_mPIWRqlIZ2YuAT4iKKy2gcWLzhm2E/view?usp=drive_link';
  const targetAssetCodes = [
    'EQ-NG-0001',
    'EQ-NG-0002',
    'EQ-NG-0003',
    'EQ-NG-0004',
    'EQ-NG-0005',
    'EQ-NG-0011'
  ];

  console.log('=== Updating EQ-NG Assets Image URLs ===');
  for (const assetCode of targetAssetCodes) {
    const updated = await prisma.equipmentAsset.update({
      where: { assetCode },
      data: { imageUrl: targetUrl }
    });
    console.log(`✓ Updated Asset ${assetCode} -> ${targetUrl}`);
  }

  // Update parent Items: EQ-NG-0001 and EQ-NG-0011
  const itemCodes = ['EQ-NG-0001', 'EQ-NG-0011'];
  for (const itemCode of itemCodes) {
    const item = await prisma.item.update({
      where: { code: itemCode },
      data: { imageUrl: targetUrl }
    });
    console.log(`✓ Updated Item [${item.code}] ${item.name} -> ${targetUrl}`);
  }
}

updateNGImages()
  .then(() => {
    console.log('NG image update complete.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error updating NG images:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

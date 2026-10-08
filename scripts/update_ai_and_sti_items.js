const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runUpdate() {
  console.log('=== Step 1: Updating STI Images in Database ===');
  // 1. EQ-STI-0024 to 0043
  const urlSkin = 'https://drive.google.com/file/d/1NODeU_bXayA8qoaU9lHnnHomnTzKrsxK/view?usp=drive_link';
  const skinAssetCodes = [];
  for (let i = 24; i <= 43; i++) {
    skinAssetCodes.push(`EQ-STI-${String(i).padStart(4, '0')}`);
  }
  const skinAssetsRes = await prisma.equipmentAsset.updateMany({
    where: { assetCode: { in: skinAssetCodes } },
    data: { imageUrl: urlSkin }
  });
  await prisma.item.update({
    where: { code: 'EQ-STI-0024' },
    data: { imageUrl: urlSkin }
  });
  console.log(`✓ Updated EQ-STI-0024 to 0043: ${skinAssetsRes.count} assets + parent item`);

  // 2. EQ-STI-0006 to 0009
  const urlArm = 'https://drive.google.com/file/d/1Apnn2Cv17dKLqEpoC880iie1yw0h0dWi/view?usp=drive_link';
  const armAssetCodes = ['EQ-STI-0006', 'EQ-STI-0007', 'EQ-STI-0008', 'EQ-STI-0009'];
  const armAssetsRes = await prisma.equipmentAsset.updateMany({
    where: { assetCode: { in: armAssetCodes } },
    data: { imageUrl: urlArm }
  });
  await prisma.item.update({
    where: { code: 'EQ-STI-0006' },
    data: { imageUrl: urlArm }
  });
  console.log(`✓ Updated EQ-STI-0006 to 0009: ${armAssetsRes.count} assets + parent item`);

  // 3. EQ-STI-0010 to 0013
  const urlLeg = 'https://drive.google.com/file/d/1zhlhxNTY-rzff8WTB56zfEyAOVqrt6Xe/view?usp=drive_link';
  const legAssetCodes = ['EQ-STI-0010', 'EQ-STI-0011', 'EQ-STI-0012', 'EQ-STI-0013'];
  const legAssetsRes = await prisma.equipmentAsset.updateMany({
    where: { assetCode: { in: legAssetCodes } },
    data: { imageUrl: urlLeg }
  });
  await prisma.item.update({
    where: { code: 'EQ-STI-0010' },
    data: { imageUrl: urlLeg }
  });
  console.log(`✓ Updated EQ-STI-0010 to 0013: ${legAssetsRes.count} assets + parent item`);

  console.log('\n=== Step 2: Renaming AI and FMS Items/Assets ===');
  // Get AI Category
  const aiCategory = await prisma.category.findFirst({
    where: { name: '(หุ่น AI) อุปกรณ์จำลองสถานการณ์และหุ่นฝึกปฏิบัติการ' }
  });
  if (!aiCategory) throw new Error('AI Category not found');

  // Step 2.1: Shift Tablet assets EQ-AI-0003, EQ-AI-0004 -> TEMP -> EQ-AI-0005, EQ-AI-0006
  // Also shift Item EQ-AI-0003 -> TEMP -> EQ-AI-0005
  console.log('Shifting Tablet EQ-AI-0003 -> EQ-AI-0005...');
  await prisma.item.update({
    where: { code: 'EQ-AI-0003' },
    data: { code: 'TEMP-ITEM-AI-0005' }
  });
  await prisma.equipmentAsset.update({
    where: { assetCode: 'EQ-AI-0004' },
    data: { assetCode: 'TEMP-ASSET-AI-0006', sequenceNumber: 2 }
  });
  await prisma.equipmentAsset.update({
    where: { assetCode: 'EQ-AI-0003' },
    data: { assetCode: 'TEMP-ASSET-AI-0005', sequenceNumber: 1 }
  });

  // Finalize Tablet codes
  await prisma.item.update({
    where: { code: 'TEMP-ITEM-AI-0005' },
    data: { code: 'EQ-AI-0005' }
  });
  await prisma.equipmentAsset.update({
    where: { assetCode: 'TEMP-ASSET-AI-0006' },
    data: { assetCode: 'EQ-AI-0006' }
  });
  await prisma.equipmentAsset.update({
    where: { assetCode: 'TEMP-ASSET-AI-0005' },
    data: { assetCode: 'EQ-AI-0005' }
  });
  console.log('✓ Tablet successfully shifted to Item EQ-AI-0005 (Assets EQ-AI-0005, EQ-AI-0006)');

  // Step 2.2: Shift LED Screen assets EQ-AI-0001, EQ-AI-0002 -> TEMP -> EQ-AI-0003, EQ-AI-0004
  // Also shift Item EQ-AI-0001 -> TEMP -> EQ-AI-0003
  console.log('Shifting LED Screen EQ-AI-0001 -> EQ-AI-0003...');
  await prisma.item.update({
    where: { code: 'EQ-AI-0001' },
    data: { code: 'TEMP-ITEM-AI-0003' }
  });
  await prisma.equipmentAsset.update({
    where: { assetCode: 'EQ-AI-0002' },
    data: { assetCode: 'TEMP-ASSET-AI-0004', sequenceNumber: 2 }
  });
  await prisma.equipmentAsset.update({
    where: { assetCode: 'EQ-AI-0001' },
    data: { assetCode: 'TEMP-ASSET-AI-0003', sequenceNumber: 1 }
  });

  // Finalize LED Screen codes
  await prisma.item.update({
    where: { code: 'TEMP-ITEM-AI-0003' },
    data: { code: 'EQ-AI-0003' }
  });
  await prisma.equipmentAsset.update({
    where: { assetCode: 'TEMP-ASSET-AI-0004' },
    data: { assetCode: 'EQ-AI-0004' }
  });
  await prisma.equipmentAsset.update({
    where: { assetCode: 'TEMP-ASSET-AI-0003' },
    data: { assetCode: 'EQ-AI-0003' }
  });
  console.log('✓ LED Screen successfully shifted to Item EQ-AI-0003 (Assets EQ-AI-0003, EQ-AI-0004)');

  // Step 2.3: Move FMS-0001 / FMS-0002 -> EQ-AI-0001
  // Item EQ-FMS-0001 -> EQ-AI-0001, name: "(AI) หุ่นฝึกทักษะการพยาบาลขั้นสูง", categoryId: aiCategory.id, imageUrl: urlAI
  // Asset EQ-FMS-0001 -> EQ-AI-0001, imageUrl: urlAI
  // Asset EQ-FMS-0002 -> EQ-AI-0002, imageUrl: urlAI
  console.log('Moving EQ-FMS-0001 to EQ-AI-0001...');
  const urlAI = 'https://drive.google.com/file/d/160g4PcsX-3XGAXL-EOawSV-chhNloiWr/view?usp=drive_link';
  const aiManikinName = '(AI) หุ่นฝึกทักษะการพยาบาลขั้นสูง';

  await prisma.item.update({
    where: { code: 'EQ-FMS-0001' },
    data: {
      code: 'EQ-AI-0001',
      name: aiManikinName,
      categoryId: aiCategory.id,
      imageUrl: urlAI
    }
  });

  await prisma.equipmentAsset.update({
    where: { assetCode: 'EQ-FMS-0001' },
    data: {
      assetCode: 'EQ-AI-0001',
      imageUrl: urlAI
    }
  });

  await prisma.equipmentAsset.update({
    where: { assetCode: 'EQ-FMS-0002' },
    data: {
      assetCode: 'EQ-AI-0002',
      imageUrl: urlAI
    }
  });
  console.log('✓ EQ-FMS-0001 and 0002 successfully converted to EQ-AI-0001 and EQ-AI-0002 with new name, category, and image!');
}

runUpdate()
  .then(() => {
    console.log('\n=== All Database Updates Completed Successfully ===');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

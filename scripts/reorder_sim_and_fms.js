const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

async function reorderSIMandFMS() {
  console.log('=== Step 1: Reordering SIM Group in Database ===');

  // Find SIM Category
  const simCategory = await prisma.category.findFirst({
    where: { name: '(SIM MAN) อุปกรณ์จำลองสถานการณ์และหุ่นฝึกปฏิบัติการ' }
  });
  if (!simCategory) throw new Error('SIM Category not found');

  // Current SIM Items:
  // EQ-SIM-0001 (Mini PC) -> will become EQ-SIM-0002
  // EQ-SIM-0003 (LED 32)  -> will become EQ-SIM-0004
  // EQ-SIM-0005 (Bed)     -> will become EQ-SIM-0006
  // EQ-SIM-0006 (SIM MAN Leonardo) -> will become EQ-SIM-0007
  // EQ-FMS-0003 (SIM MAN Gaumard)  -> will become EQ-SIM-0001

  // Use TEMP prefixes to avoid unique constraint violations
  console.log('Shifting existing SIM items/assets to TEMP...');
  
  // 1. Shift EQ-SIM-0006 (Leonardo) -> TEMP-SIM-0007
  await prisma.item.update({ where: { code: 'EQ-SIM-0006' }, data: { code: 'TEMP-ITEM-SIM-0007' } });
  await prisma.equipmentAsset.update({ where: { assetCode: 'EQ-SIM-0006' }, data: { assetCode: 'TEMP-ASSET-SIM-0007' } });

  // 2. Shift EQ-SIM-0005 (Bed) -> TEMP-SIM-0006
  await prisma.item.update({ where: { code: 'EQ-SIM-0005' }, data: { code: 'TEMP-ITEM-SIM-0006' } });
  await prisma.equipmentAsset.update({ where: { assetCode: 'EQ-SIM-0005' }, data: { assetCode: 'TEMP-ASSET-SIM-0006' } });

  // 3. Shift EQ-SIM-0003 (LED 32) -> TEMP-SIM-0004
  await prisma.item.update({ where: { code: 'EQ-SIM-0003' }, data: { code: 'TEMP-ITEM-SIM-0004' } });
  await prisma.equipmentAsset.update({ where: { assetCode: 'EQ-SIM-0004' }, data: { assetCode: 'TEMP-ASSET-SIM-0005', sequenceNumber: 2 } });
  await prisma.equipmentAsset.update({ where: { assetCode: 'EQ-SIM-0003' }, data: { assetCode: 'TEMP-ASSET-SIM-0004', sequenceNumber: 1 } });

  // 4. Shift EQ-SIM-0001 (Mini PC) -> TEMP-SIM-0002
  await prisma.item.update({ where: { code: 'EQ-SIM-0001' }, data: { code: 'TEMP-ITEM-SIM-0002' } });
  await prisma.equipmentAsset.update({ where: { assetCode: 'EQ-SIM-0002' }, data: { assetCode: 'TEMP-ASSET-SIM-0003', sequenceNumber: 2 } });
  await prisma.equipmentAsset.update({ where: { assetCode: 'EQ-SIM-0001' }, data: { assetCode: 'TEMP-ASSET-SIM-0002', sequenceNumber: 1 } });

  // 5. Move EQ-FMS-0003 (Gaumard) -> EQ-SIM-0001
  await prisma.item.update({
    where: { code: 'EQ-FMS-0003' },
    data: {
      code: 'EQ-SIM-0001',
      name: 'SIM MAN',
      categoryId: simCategory.id
    }
  });
  await prisma.equipmentAsset.update({
    where: { assetCode: 'EQ-FMS-0003' },
    data: {
      assetCode: 'EQ-SIM-0001',
      sequenceNumber: 1,
      note: 'SIM MAN (Gaumard Scientific)'
    }
  });

  // Finalize TEMP SIM to final EQ-SIM codes
  await prisma.item.update({ where: { code: 'TEMP-ITEM-SIM-0002' }, data: { code: 'EQ-SIM-0002' } });
  await prisma.equipmentAsset.update({ where: { assetCode: 'TEMP-ASSET-SIM-0002' }, data: { assetCode: 'EQ-SIM-0002' } });
  await prisma.equipmentAsset.update({ where: { assetCode: 'TEMP-ASSET-SIM-0003' }, data: { assetCode: 'EQ-SIM-0003' } });

  await prisma.item.update({ where: { code: 'TEMP-ITEM-SIM-0004' }, data: { code: 'EQ-SIM-0004' } });
  await prisma.equipmentAsset.update({ where: { assetCode: 'TEMP-ASSET-SIM-0004' }, data: { assetCode: 'EQ-SIM-0004' } });
  await prisma.equipmentAsset.update({ where: { assetCode: 'TEMP-ASSET-SIM-0005' }, data: { assetCode: 'EQ-SIM-0005' } });

  await prisma.item.update({ where: { code: 'TEMP-ITEM-SIM-0006' }, data: { code: 'EQ-SIM-0006' } });
  await prisma.equipmentAsset.update({ where: { assetCode: 'TEMP-ASSET-SIM-0006' }, data: { assetCode: 'EQ-SIM-0006' } });

  await prisma.item.update({ where: { code: 'TEMP-ITEM-SIM-0007' }, data: { code: 'EQ-SIM-0007' } });
  await prisma.equipmentAsset.update({ where: { assetCode: 'TEMP-ASSET-SIM-0007' }, data: { assetCode: 'EQ-SIM-0007' } });

  console.log('✓ SIM Group reordered successfully: EQ-SIM-0001 through 0007');

  console.log('\n=== Step 2: Reordering FMS Group in Database ===');
  // Current FMS Items:
  // EQ-FMS-0014 (3B Adult Manikin, 6 assets 0014-0019) -> will become EQ-FMS-0001 (assets 0001-0006)
  // EQ-FMS-0004 (CLA Male, 5 assets 0004-0008) -> will become EQ-FMS-0007 (assets 0007-0011)
  // EQ-FMS-0009 (CLA Female, 5 assets 0009-0013) -> will become EQ-FMS-0012 (assets 0012-0016)

  // Step 2.1: Move 3B Adult Manikin (EQ-FMS-0014) to TEMP
  await prisma.item.update({ where: { code: 'EQ-FMS-0014' }, data: { code: 'TEMP-ITEM-FMS-0001' } });
  for (let i = 14; i <= 19; i++) {
    const oldCode = `EQ-FMS-${String(i).padStart(4, '0')}`;
    const newSeq = i - 13; // 1 to 6
    const tempCode = `TEMP-ASSET-FMS-${String(newSeq).padStart(4, '0')}`;
    await prisma.equipmentAsset.update({
      where: { assetCode: oldCode },
      data: { assetCode: tempCode, sequenceNumber: newSeq }
    });
  }

  // Step 2.2: Move CLA Female (EQ-FMS-0009) to final EQ-FMS-0012 (assets 0012-0016)
  await prisma.item.update({ where: { code: 'EQ-FMS-0009' }, data: { code: 'TEMP-ITEM-FMS-0012' } });
  for (let i = 9; i <= 13; i++) {
    const oldCode = `EQ-FMS-${String(i).padStart(4, '0')}`;
    const targetNum = i + 3; // 12 to 16
    const newSeq = i - 8;    // 1 to 5
    const targetCode = `EQ-FMS-${String(targetNum).padStart(4, '0')}`;
    await prisma.equipmentAsset.update({
      where: { assetCode: oldCode },
      data: { assetCode: targetCode, sequenceNumber: newSeq }
    });
  }
  await prisma.item.update({ where: { code: 'TEMP-ITEM-FMS-0012' }, data: { code: 'EQ-FMS-0012' } });

  // Step 2.3: Move CLA Male (EQ-FMS-0004) to final EQ-FMS-0007 (assets 0007-0011)
  await prisma.item.update({ where: { code: 'EQ-FMS-0004' }, data: { code: 'TEMP-ITEM-FMS-0007' } });
  for (let i = 4; i <= 8; i++) {
    const oldCode = `EQ-FMS-${String(i).padStart(4, '0')}`;
    const targetNum = i + 3; // 7 to 11
    const newSeq = i - 3;    // 1 to 5
    const targetCode = `EQ-FMS-${String(targetNum).padStart(4, '0')}`;
    await prisma.equipmentAsset.update({
      where: { assetCode: oldCode },
      data: { assetCode: targetCode, sequenceNumber: newSeq }
    });
  }
  await prisma.item.update({ where: { code: 'TEMP-ITEM-FMS-0007' }, data: { code: 'EQ-FMS-0007' } });

  // Step 2.4: Move 3B Adult Manikin from TEMP to final EQ-FMS-0001 (assets 0001-0006)
  await prisma.item.update({ where: { code: 'TEMP-ITEM-FMS-0001' }, data: { code: 'EQ-FMS-0001' } });
  for (let newSeq = 1; newSeq <= 6; newSeq++) {
    const tempCode = `TEMP-ASSET-FMS-${String(newSeq).padStart(4, '0')}`;
    const targetCode = `EQ-FMS-${String(newSeq).padStart(4, '0')}`;
    await prisma.equipmentAsset.update({
      where: { assetCode: tempCode },
      data: { assetCode: targetCode }
    });
  }

  console.log('✓ FMS Group reordered successfully: EQ-FMS-0001 through 0016');
}

reorderSIMandFMS()
  .then(() => {
    console.log('\n=== Database Reordering Complete ===');
    process.exit(0);
  })
  .catch(err => {
    console.error('Error during reordering:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

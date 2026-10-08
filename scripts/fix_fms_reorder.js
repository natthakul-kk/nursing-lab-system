const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixFMS() {
  console.log('=== Resolving FMS Reordering ===');

  // 1. Move all FMS items to temporary codes
  const items = await prisma.item.findMany({
    where: {
      OR: [
        { code: { startsWith: 'EQ-FMS' } },
        { code: { startsWith: 'TEMP-ITEM-FMS' } }
      ]
    }
  });

  for (const it of items) {
    await prisma.item.update({
      where: { id: it.id },
      data: { code: `TEMP-FIX-${it.id}` }
    });
  }

  // 2. Move all FMS assets to temporary codes based on ID
  const assets = await prisma.equipmentAsset.findMany({
    where: {
      OR: [
        { assetCode: { startsWith: 'EQ-FMS' } },
        { assetCode: { startsWith: 'TEMP-ASSET-FMS' } }
      ]
    }
  });

  for (const a of assets) {
    await prisma.equipmentAsset.update({
      where: { id: a.id },
      data: { assetCode: `TEMP-FIX-${a.id}` }
    });
  }
  console.log(`✓ Cleared namespace: ${items.length} items and ${assets.length} assets temporarily renamed.`);

  // 3. Now assign exact desired codes based on govAssetCode:
  // Group A: 3B Scientific Adult Manikin (6 assets) -> Item EQ-FMS-0001, Assets EQ-FMS-0001..0006
  const groupAItem = items.find(i => i.name === 'หุ่นฝึกทักษะการพยาบาลผู้ใหญ่');
  if (groupAItem) {
    await prisma.item.update({
      where: { id: groupAItem.id },
      data: { code: 'EQ-FMS-0001' }
    });
  }

  for (let seq = 1; seq <= 6; seq++) {
    const govTarget = `2-B9701-FA17-65450010002/001-67 (5-${seq}/6)`;
    const asset = assets.find(a => a.govAssetCode === govTarget);
    if (asset) {
      const newCode = `EQ-FMS-${String(seq).padStart(4, '0')}`;
      await prisma.equipmentAsset.update({
        where: { id: asset.id },
        data: {
          assetCode: newCode,
          sequenceNumber: seq,
          itemId: groupAItem.id
        }
      });
      console.log(`✓ Assigned ${newCode} to gov ${govTarget} (Seq: ${seq})`);
    }
  }

  // Group B: CLA Male (5 assets: 034-68 to 038-68) -> Item EQ-FMS-0007, Assets EQ-FMS-0007..0011
  const groupBItem = items.find(i => i.name === 'หุ่นฝึกปฏิบัติการพยาบาลพื้นฐาน (ชาย)');
  if (groupBItem) {
    await prisma.item.update({
      where: { id: groupBItem.id },
      data: { code: 'EQ-FMS-0007' }
    });
  }

  for (let i = 0; i < 5; i++) {
    const num = 34 + i;
    const govTarget = `1-B9701-FT17-65450010004/0${num}-68`;
    const asset = assets.find(a => a.govAssetCode === govTarget);
    const newSeq = i + 1;
    const newCode = `EQ-FMS-${String(7 + i).padStart(4, '0')}`;
    if (asset) {
      await prisma.equipmentAsset.update({
        where: { id: asset.id },
        data: {
          assetCode: newCode,
          sequenceNumber: newSeq,
          itemId: groupBItem.id
        }
      });
      console.log(`✓ Assigned ${newCode} to gov ${govTarget} (Seq: ${newSeq})`);
    }
  }

  // Group C: CLA Female (5 assets: 039-68 to 043-68) -> Item EQ-FMS-0012, Assets EQ-FMS-0012..0016
  const groupCItem = items.find(i => i.name === 'หุ่นฝึกปฏิบัติการพยาบาลพื้นฐาน (หญิง)');
  if (groupCItem) {
    await prisma.item.update({
      where: { id: groupCItem.id },
      data: { code: 'EQ-FMS-0012' }
    });
  }

  for (let i = 0; i < 5; i++) {
    const num = 39 + i;
    const govTarget = `1-B9701-FT17-65450010004/0${num}-68`;
    const asset = assets.find(a => a.govAssetCode === govTarget);
    const newSeq = i + 1;
    const newCode = `EQ-FMS-${String(12 + i).padStart(4, '0')}`;
    if (asset) {
      await prisma.equipmentAsset.update({
        where: { id: asset.id },
        data: {
          assetCode: newCode,
          sequenceNumber: newSeq,
          itemId: groupCItem.id
        }
      });
      console.log(`✓ Assigned ${newCode} to gov ${govTarget} (Seq: ${newSeq})`);
    }
  }

  console.log('\n=== All FMS Items and Assets successfully reordered! ===');
}

fixFMS()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error fixing FMS:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

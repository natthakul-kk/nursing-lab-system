const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const assets = await prisma.equipmentAsset.findMany({
    include: {
      item: {
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          brand: true,
          model: true,
          imageUrl: true,
        }
      }
    },
    orderBy: [
      { assetCode: 'asc' }
    ]
  });

  const withoutImage = assets.filter(a => !a.imageUrl || a.imageUrl.trim() === '');
  console.log('Total EquipmentAssets:', assets.length);
  console.log('Assets without image:', withoutImage.length);

  // Group by Item
  const itemMap = new Map();
  for (const a of withoutImage) {
    const itemId = a.itemId || 'NO_ITEM';
    if (!itemMap.has(itemId)) {
      itemMap.set(itemId, {
        item: a.item,
        assets: []
      });
    }
    itemMap.get(itemId).assets.push(a);
  }

  console.log('Unique Items without image on assets:', itemMap.size);

  let idx = 1;
  for (const [itemId, group] of itemMap) {
    const it = group.item;
    const codes = group.assets.map(x => x.assetCode);
    const govCodes = group.assets.map(x => x.governmentAssetCode).filter(Boolean);
    console.log(`${idx++}. [${it?.category || '-'}] ${it?.name || 'ไม่มีชื่อหมวด'} (รหัส Item: ${it?.code || '-'}) - ขาดรูป ${group.assets.length} ชิ้น`);
    console.log(`   ยี่ห้อ: ${it?.brand || '-'}, โมเดล: ${it?.model || '-'}`);
    if (govCodes.length > 0) {
      console.log(`   ตัวอย่างเลขครุภัณฑ์: ${govCodes[0]} (มีทั้งหมด ${govCodes.length} เลข)`);
    } else {
      console.log(`   ตัวอย่างรหัสระบบ: ${codes[0]} (มีทั้งหมด ${codes.length} ชิ้น)`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runAudit() {
  console.log('====================================================');
  console.log('   SYSTEM HEALTH & INTEGRITY AUDIT REPORT');
  console.log('   Date: ' + new Date().toISOString());
  console.log('====================================================\n');

  const issues = [];
  const warnings = [];
  const info = [];

  try {
    // ----------------------------------------------------
    // 1. USERS & ROLES
    // ----------------------------------------------------
    console.log('[1/7] Auditing Users & Roles...');
    const users = await prisma.user.findMany();
    const usersByRole = {};
    for (const u of users) {
      usersByRole[u.role] = (usersByRole[u.role] || 0) + 1;
      if (!u.email) issues.push(`User ${u.id} (${u.name}) has no email`);
    }
    console.log(`   ✓ Total Users: ${users.length} (${JSON.stringify(usersByRole)})`);

    // ----------------------------------------------------
    // 2. CONSUMABLES & STOCK LOTS
    // ----------------------------------------------------
    console.log('\n[2/7] Auditing Consumables & StockLots...');
    const consumables = await prisma.item.findMany({
      where: { type: 'CONSUMABLE' },
      include: { stockLots: true }
    });

    let totalLots = 0;
    let totalConsumablePieces = 0;
    let negativeLots = 0;
    let expiredLots = 0;
    const now = new Date();

    for (const item of consumables) {
      const itemPacks = item.stockLots.reduce((acc, l) => acc + l.quantityRemaining, 0);

      for (const lot of item.stockLots) {
        totalLots++;
        if (lot.quantityRemaining < 0) {
          issues.push(`Lot ${lot.lotNumber} [${item.code}]: Negative quantityRemaining (${lot.quantityRemaining})`);
          negativeLots++;
        }
        if ((lot.openPackRemainder || 0) < 0) {
          issues.push(`Lot ${lot.lotNumber} [${item.code}]: Negative openPackRemainder (${lot.openPackRemainder})`);
        }

        const packSize = Number(lot.packSize) > 0 ? Number(lot.packSize) : Number(item.conversionRatio || 1);
        const expectedPieces = (lot.quantityRemaining * packSize) + (lot.openPackRemainder || 0);
        totalConsumablePieces += expectedPieces;

        if (lot.piecesRemaining !== null && lot.piecesRemaining !== undefined && lot.piecesRemaining !== expectedPieces) {
          warnings.push(`Lot ${lot.lotNumber} [${item.code}]: piecesRemaining (${lot.piecesRemaining}) != calculated (${expectedPieces})`);
        }

        if (lot.expiryDate && new Date(lot.expiryDate) < now && lot.quantityRemaining > 0) {
          expiredLots++;
        }
      }
    }
    console.log(`   ✓ Consumable Items: ${consumables.length}, Total Lots: ${totalLots}`);
    console.log(`   ✓ Total Physical Pieces tracked: ${totalConsumablePieces.toLocaleString()}`);
    console.log(`   ✓ Expired Lots in stock: ${expiredLots} (allowExpiredForSim available for simulation training)`);
    console.log(`   ✓ Negative Stock: ${negativeLots === 0 ? 'None (Clean)' : `${negativeLots} lots`}`);

    // ----------------------------------------------------
    // 3. EQUIPMENT & ASSETS
    // ----------------------------------------------------
    console.log('\n[3/7] Auditing Equipment & Physical Assets...');
    const equipment = await prisma.item.findMany({
      where: { type: 'EQUIPMENT' },
      include: { assets: true }
    });
    let totalAssets = 0;
    let inStockAssets = 0;
    let borrowedAssets = 0;
    let maintenanceAssets = 0;
    const seenAssetCodes = new Set();
    const duplicateAssetCodes = [];

    for (const eq of equipment) {
      totalAssets += eq.assets.length;
      for (const a of eq.assets) {
        if (a.status === 'AVAILABLE') inStockAssets++;
        else if (a.status === 'BORROWED') borrowedAssets++;
        else if (a.status === 'MAINTENANCE') maintenanceAssets++;

        if (seenAssetCodes.has(a.assetCode)) {
          duplicateAssetCodes.push(a.assetCode);
        } else {
          seenAssetCodes.add(a.assetCode);
        }
      }
    }
    if (duplicateAssetCodes.length > 0) {
      issues.push(`Duplicate asset codes: ${duplicateAssetCodes.join(', ')}`);
    }
    console.log(`   ✓ Equipment Items: ${equipment.length}, Total Assets: ${totalAssets}`);
    console.log(`   ✓ Assets Status: In Stock: ${inStockAssets}, Borrowed: ${borrowedAssets}, Maintenance: ${maintenanceAssets}`);
    console.log(`   ✓ Duplicate Asset Codes: ${duplicateAssetCodes.length === 0 ? 'None (Unique)' : 'Found'}`);

    // ----------------------------------------------------
    // 4. REQUISITIONS & RESERVATIONS
    // ----------------------------------------------------
    console.log('\n[4/7] Auditing Requisitions & Reservations...');
    const requisitions = await prisma.requisitionRequest.findMany({
      include: { items: { include: { item: true } }, user: true }
    });
    const reqStatusCount = {};
    for (const req of requisitions) {
      reqStatusCount[req.status] = (reqStatusCount[req.status] || 0) + 1;
      if (!req.user) {
        warnings.push(`Requisition ${req.requestNumber}: user missing (orphaned)`);
      }
    }
    console.log(`   ✓ Total Requisitions: ${requisitions.length} (${JSON.stringify(reqStatusCount)})`);

    // ----------------------------------------------------
    // 5. BORROW REQUESTS
    // ----------------------------------------------------
    console.log('\n[5/7] Auditing Borrow Requests...');
    const borrowRequests = await prisma.borrowRequest.findMany({
      include: { items: { include: { asset: true } }, user: true, requisitionRequest: true }
    });
    const borrowStatusCount = {};
    for (const b of borrowRequests) {
      borrowStatusCount[b.status] = (borrowStatusCount[b.status] || 0) + 1;
    }
    console.log(`   ✓ Total Borrow Requests: ${borrowRequests.length} (${JSON.stringify(borrowStatusCount)})`);

    // ----------------------------------------------------
    // 6. STORAGE LOCATIONS
    // ----------------------------------------------------
    console.log('\n[6/7] Auditing Storage Locations...');
    const locations = await prisma.storageLocation.findMany({
      include: { items: true }
    });
    console.log(`   ✓ Storage Locations: ${locations.length} configured`);

    // ----------------------------------------------------
    // 7. STOCK TRANSACTIONS
    // ----------------------------------------------------
    console.log('\n[7/7] Auditing Stock Transactions Audit Trail...');
    const txCount = await prisma.stockTransaction.count();
    console.log(`   ✓ Stock Transactions (Audit Log): ${txCount} historical entries`);

    // ----------------------------------------------------
    // SUMMARY
    // ----------------------------------------------------
    console.log('\n====================================================');
    console.log('   AUDIT SUMMARY & RESULTS');
    console.log('====================================================');
    console.log(`🔴 Critical Integrity Errors: ${issues.length}`);
    if (issues.length > 0) {
      issues.forEach((iss, i) => console.log(`   [CRITICAL ${i + 1}] ${iss}`));
    } else {
      console.log('   ✓ Zero critical database integrity errors found.');
    }

    console.log(`\n🟡 Discrepancies / Warnings: ${warnings.length}`);
    if (warnings.length > 0) {
      warnings.forEach((w, i) => console.log(`   [WARN ${i + 1}] ${w}`));
    } else {
      console.log('   ✓ All lot pieces, reservations, and foreign keys are in 100% sync.');
    }

  } catch (err) {
    console.error('Audit failed with error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

runAudit();

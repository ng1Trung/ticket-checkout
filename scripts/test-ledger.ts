import { prisma } from '../src/lib/prisma';
import { LedgerService } from '../src/services/ledger.service';
import { EntryType, OrderStatus } from '@prisma/client';

async function runTests() {
  console.log('=== [TEST] STARTING DOUBLE-ENTRY LEDGER ENGINE SUITE ===\n');

  // Test 1: Assert balanced transactions
  console.log('Test 1: Testing assertTransactionBalanced invariance...');
  try {
    LedgerService.assertTransactionBalanced([
      { amount: 100000, entryType: EntryType.DEBIT },
      { amount: 90000, entryType: EntryType.CREDIT }, // 10k imbalance
    ]);
    console.error('❌ Failed: Imbalanced transaction was not rejected!');
    process.exit(1);
  } catch (err: any) {
    console.log('✓ Success: Properly rejected imbalanced transaction:', err.message);
  }

  // Test 2: Simulate order payment and escrow recording with isolated test entities
  console.log('\nTest 2: Simulating order payment and executing recordOrderPayment...');
  const testSuffix = Date.now().toString().slice(-6);

  // Create isolated test seller & buyer to guarantee pristine initial balances (0 VND)
  const seller = await prisma.user.create({
    data: {
      id: `test_seller_${testSuffix}`,
      name: `Test Seller ${testSuffix}`,
      email: `seller_${testSuffix}@ledger-test.local`,
      role: 'SELLER',
    },
  });

  const buyer = await prisma.user.findFirst({
    where: { role: 'BUYER' },
  }) || await prisma.user.create({
    data: {
      id: `test_buyer_${testSuffix}`,
      name: `Test Buyer ${testSuffix}`,
      email: `buyer_${testSuffix}@ledger-test.local`,
      role: 'BUYER',
    },
  });

  // Create isolated test event & listing
  const event = await prisma.event.create({
    data: {
      title: `Automated Test Live Concert #${testSuffix}`,
      description: 'Temporary isolated event for testing double-entry ledger invariance',
      eventDate: new Date(Date.now() + 86400000 * 30),
      location: 'Test Arena Hall',
    },
  });

  const listing = await prisma.listing.create({
    data: {
      eventId: event.id,
      sellerId: seller.id,
      totalQuantity: 10,
      availableQuantity: 10,
      pricePerTicketVnd: 2500000,
    },
    include: { seller: true, event: true },
  });


  const quantity = 2;
  const unitPrice = listing.pricePerTicketVnd;
  const subtotal = unitPrice * quantity;
  const buyerFee = Math.round(subtotal * 0.10);     // 10% buyer fee
  const sellerFee = Math.round(subtotal * 0.05);    // 5% seller commission
  const totalAmount = subtotal + buyerFee;          // Buyer pays
  const sellerReceives = subtotal - sellerFee;      // Seller pending escrow
  const platformKeeps = buyerFee + sellerFee;       // Platform revenue

  // Verify formula balance
  if (totalAmount !== sellerReceives + platformKeeps) {
    throw new Error('Fee breakdown does not balance!');
  }

  const orderCode = BigInt(Date.now());
  const order = await prisma.order.create({
    data: {
      orderCode,
      eventId: listing.eventId,
      listingId: listing.id,
      buyerId: buyer.id,
      quantity,
      unitPrice,
      subtotal,
      buyerFee,
      sellerFee,
      totalAmount,
      sellerReceives,
      platformKeeps,
      status: OrderStatus.PAID,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      paidAt: new Date(),
    },
  });

  console.log(`Created Order #${order.orderCode} (Total: ${totalAmount} VND, Seller Receives: ${sellerReceives} VND, Platform: ${platformKeeps} VND)`);

  // Record payment in double-entry ledger
  await LedgerService.recordOrderPayment(order.id);

  // Test 3: Check derived seller balances
  console.log('\nTest 3: Checking derived seller balances from LedgerEntry...');
  const sellerBalances = await LedgerService.getUserBalances(listing.sellerId);
  console.log(`Seller Balances [${listing.seller.name}]:`, sellerBalances);

  if (sellerBalances.pendingBalance !== sellerReceives) {
    throw new Error(`Incorrect pending balance! Expected: ${sellerReceives}, Actual: ${sellerBalances.pendingBalance}`);
  }
  if (sellerBalances.availableBalance !== 0) {
    throw new Error(`Incorrect available balance! Expected: 0, Actual: ${sellerBalances.availableBalance}`);
  }
  console.log('✓ Pending balance matches net seller earnings perfectly!');

  // Test 4: Idempotency check
  console.log('\nTest 4: Testing idempotency on secondary recordOrderPayment call...');
  await LedgerService.recordOrderPayment(order.id);
  const sellerBalancesAfterRetry = await LedgerService.getUserBalances(listing.sellerId);
  if (sellerBalancesAfterRetry.pendingBalance !== sellerReceives) {
    throw new Error('Idempotency failed: Balance duplicated on webhook re-delivery!');
  }
  console.log('✓ Idempotency verified: Duplicate payment webhook safely skipped.');

  // Test 5: Release escrow when event completes
  console.log('\nTest 5: Testing escrow release on event completion (releaseEscrowForEvent)...');
  await LedgerService.releaseEscrowForEvent(listing.eventId);

  const balancesAfterRelease = await LedgerService.getUserBalances(listing.sellerId);
  console.log(`Seller Balances after event completion:`, balancesAfterRelease);

  if (balancesAfterRelease.pendingBalance !== 0) {
    throw new Error(`Pending balance must be 0 after release! Actual: ${balancesAfterRelease.pendingBalance}`);
  }
  if (balancesAfterRelease.availableBalance !== sellerReceives) {
    throw new Error(`Available balance incorrect! Expected: ${sellerReceives}, Actual: ${balancesAfterRelease.availableBalance}`);
  }
  console.log('✓ Escrow released successfully: Pending -> 0, Available -> ' + balancesAfterRelease.availableBalance + ' VND');

  // Test 6: System audit balance verification
  console.log('\nTest 6: Verifying system-wide ledger balance...');
  const audit = await LedgerService.getLedgerAuditReport();
  console.log('Audit Summary:', {
    isBalanced: audit.isBalanced,
    totalDebit: audit.totalDebit,
    totalCredit: audit.totalCredit,
    accountsCount: audit.accountBalances.length,
  });

  if (!audit.isBalanced) {
    throw new Error('System ledger is out of balance!');
  }
  console.log('✓ SYSTEM LEDGER IS STRICTLY BALANCED (TOTAL DEBIT === TOTAL CREDIT)!');

  console.log('\n=== ALL LEDGER TESTS PASSED (100%) ===');
}

runTests()
  .catch((e) => {
    console.error('Test suite failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

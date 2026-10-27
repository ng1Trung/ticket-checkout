import { PrismaClient, Role, AccountType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Seed Data Generation ---');

  // Clear existing records in reverse dependency order
  await prisma.ledgerEntry.deleteMany({});
  await prisma.ledgerTransaction.deleteMany({});
  await prisma.ledgerAccount.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.listing.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Seed Users (1 Admin, 2 Sellers, 1 Buyer)
  const admin = await prisma.user.create({
    data: {
      id: 'user_admin_01',
      name: 'System Administrator',
      email: 'admin@resalemarketplace.com',
      role: Role.ADMIN,
    },
  });

  const sellerA = await prisma.user.create({
    data: {
      id: 'user_seller_a',
      name: 'Alex Turner (TicketPro)',
      email: 'alex.seller@resalemarketplace.com',
      role: Role.SELLER,
    },
  });

  const sellerB = await prisma.user.create({
    data: {
      id: 'user_seller_b',
      name: 'Sarah Connor (FanZone Hub)',
      email: 'sarah.seller@resalemarketplace.com',
      role: Role.SELLER,
    },
  });

  const buyerC = await prisma.user.create({
    data: {
      id: 'user_buyer_c',
      name: 'David Miller (Concert Fan)',
      email: 'david.buyer@resalemarketplace.com',
      role: Role.BUYER,
    },
  });

  console.log('✓ Created 4 Users (1 Admin, 2 Sellers, 1 Buyer)');

  // 2. Chart of Accounts (COA) for Double-Entry Ledger
  // Asset Account: Funds held at payment gateway
  await prisma.ledgerAccount.create({
    data: {
      code: 'GATEWAY_RECEIVABLE',
      name: 'Asset: Payment Gateway Receivable (PayOS)',
      type: AccountType.ASSET,
    },
  });

  // Revenue Account: Platform service & seller commission revenue
  await prisma.ledgerAccount.create({
    data: {
      code: 'PLATFORM_FEE_REVENUE',
      name: 'Revenue: Platform Service Fee & Seller Commission',
      type: AccountType.REVENUE,
    },
  });

  // Liability Accounts: Escrow pending and available payout accounts per seller
  for (const seller of [sellerA, sellerB]) {
    await prisma.ledgerAccount.create({
      data: {
        code: `SELLER_ESCROW_PENDING_${seller.id}`,
        name: `Liability: Escrow Pending Payout for ${seller.name}`,
        type: AccountType.LIABILITY,
        userId: seller.id,
      },
    });

    await prisma.ledgerAccount.create({
      data: {
        code: `SELLER_AVAILABLE_${seller.id}`,
        name: `Liability: Available Payout for ${seller.name}`,
        type: AccountType.LIABILITY,
        userId: seller.id,
      },
    });
  }

  console.log('✓ Initialized Chart of Accounts (Assets, Revenue, Liabilities per Seller)');

  // 3. Seed 2 Events
  const event1 = await prisma.event.create({
    data: {
      id: 'event_01_world_tour',
      title: 'Neon Odyssey: World Stadium Tour 2026',
      description: 'An electrifying stadium concert featuring international pop artists, cutting-edge pyrotechnics, and immersive soundscapes.',
      eventDate: new Date('2026-11-20T19:30:00Z'),
      location: 'National Stadium, Zone A Arena',
      imageUrl: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80',
      isCompleted: false,
    },
  });

  const event2 = await prisma.event.create({
    data: {
      id: 'event_02_symphony_live',
      title: 'Grand Philharmonic: Cinematic Classics 25th Gala',
      description: 'A spectacular evening presenting iconic orchestral masterpieces and movie soundtracks performed by a 90-piece symphony orchestra.',
      eventDate: new Date('2026-12-15T20:00:00Z'),
      location: 'Grand Opera House & Symphony Hall',
      imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=80',
      isCompleted: false,
    },
  });

  console.log('✓ Created 2 Events');

  // 4. Seed 4 Listings across the 2 Sellers
  await prisma.listing.create({
    data: {
      id: 'listing_01',
      eventId: event1.id,
      sellerId: sellerA.id,
      section: 'SVIP Platinum - Front Row Stage Center',
      totalQuantity: 4,
      availableQuantity: 4,
      pricePerTicketVnd: 2500000, // 2,500,000 VND
    },
  });

  await prisma.listing.create({
    data: {
      id: 'listing_02',
      eventId: event1.id,
      sellerId: sellerB.id,
      section: 'VIP Gold - Standing Fanzone Area',
      totalQuantity: 6,
      availableQuantity: 6,
      pricePerTicketVnd: 1800000, // 1,800,000 VND
    },
  });

  await prisma.listing.create({
    data: {
      id: 'listing_03',
      eventId: event2.id,
      sellerId: sellerA.id,
      section: 'Royal Box - Premium Balcony Center',
      totalQuantity: 2,
      availableQuantity: 2,
      pricePerTicketVnd: 3200000, // 3,200,000 VND
    },
  });

  await prisma.listing.create({
    data: {
      id: 'listing_04',
      eventId: event2.id,
      sellerId: sellerB.id,
      section: 'Tier 1 Stalls - Center Stage View',
      totalQuantity: 8,
      availableQuantity: 8,
      pricePerTicketVnd: 1200000, // 1,200,000 VND
    },
  });

  console.log('✓ Created 4 Listings from 2 Sellers');
  console.log('--- Seed Data Completed Successfully! ---');
}

main()
  .catch((e) => {
    console.error('Seed execution error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

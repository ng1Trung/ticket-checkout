import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPaymentSession } from '@/lib/payos';
import { OrderStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { listingId, quantity, buyerId } = body;

    const parsedQty = parseInt(quantity, 10);
    if (!listingId || isNaN(parsedQty) || parsedQty <= 0) {
      return NextResponse.json(
        { error: 'Invalid payload. Please provide a valid ticket quantity.' },
        { status: 400 }
      );
    }

    if (!buyerId) {
      return NextResponse.json(
        { error: 'Buyer identity is required.' },
        { status: 400 }
      );
    }

    // Atomic inventory decrement and order creation within a database transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Concurrency safe decrement
      const updatedListings: any[] = await tx.$queryRaw`
        UPDATE "Listing"
        SET "availableQuantity" = "availableQuantity" - ${parsedQty},
            "updatedAt" = NOW()
        WHERE "id" = ${listingId} AND "availableQuantity" >= ${parsedQty}
        RETURNING *;
      `;

      if (!updatedListings || updatedListings.length === 0) {
        throw new Error('Not enough tickets available or listing was purchased by another buyer.');
      }

      const listing = updatedListings[0];

      const event = await tx.event.findUnique({
        where: { id: listing.eventId },
      });

      if (!event) {
        throw new Error('Event does not exist.');
      }

      // 2. Financial fee breakdown
      const unitPrice = listing.pricePerTicketVnd;
      const subtotal = unitPrice * parsedQty;
      const buyerFee = Math.round(subtotal * 0.10);      // 10% buyer service fee
      const sellerFee = Math.round(subtotal * 0.05);     // 5% seller commission
      const totalAmount = subtotal + buyerFee;           // Buyer total
      const sellerReceives = subtotal - sellerFee;       // Seller pending escrow
      const platformKeeps = buyerFee + sellerFee;        // Platform retained fee

      // Generate unique safe integer orderCode for gateway
      const timestampPart = Date.now() % 100000000;
      const randomPart = Math.floor(Math.random() * 90) + 10;
      const orderCode = Number(`${timestampPart}${randomPart}`);

      // 3. Create PENDING order with 10-minute hold TTL
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const order = await tx.order.create({
        data: {
          orderCode: BigInt(orderCode),
          eventId: event.id,
          listingId: listing.id,
          buyerId,
          quantity: parsedQty,
          unitPrice,
          subtotal,
          buyerFee,
          sellerFee,
          totalAmount,
          sellerReceives,
          platformKeeps,
          status: OrderStatus.PENDING,
          expiresAt,
        },
      });

      return {
        order,
        orderCode,
        totalAmount,
        unitPrice,
        parsedQty,
        eventTitle: event.title,
      };
    });

    // 4. Initialize payment session with gateway or sandbox simulator
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const paymentSession = await createPaymentSession({
      orderCode: result.orderCode,
      amount: result.totalAmount,
      description: `Tix #${result.orderCode}`,
      items: [
        {
          name: result.eventTitle.slice(0, 50),
          quantity: result.parsedQty,
          price: result.unitPrice,
        },
      ],
      returnUrl: `${baseUrl}/checkout/result?orderCode=${result.orderCode}`,
      cancelUrl: `${baseUrl}/checkout/result?orderCode=${result.orderCode}&cancel=true`,
    });

    await prisma.order.update({
      where: { id: result.order.id },
      data: {
        paymentUrl: paymentSession.checkoutUrl,
        paymentLinkId: paymentSession.paymentLinkId,
      },
    });

    return NextResponse.json({
      success: true,
      orderCode: result.orderCode,
      checkoutUrl: paymentSession.checkoutUrl,
      mode: paymentSession.mode,
    });
  } catch (error: any) {
    console.error('[Checkout API Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create checkout session' },
      { status: 400 }
    );
  }
}

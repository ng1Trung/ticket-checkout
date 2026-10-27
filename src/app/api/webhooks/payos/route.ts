import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { payos, isPayOSConfigured } from '@/lib/payos';
import { LedgerService } from '@/services/ledger.service';
import { OrderStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    console.log('[Webhook] Received gateway payload:', JSON.stringify(rawBody));

    let orderCode: number | null = null;
    let isSuccessPayment = false;

    // 1. Signature verification
    if (isPayOSConfigured && payos) {
      try {
        const verifiedData = await payos.webhooks.verify(rawBody);
        orderCode = verifiedData.orderCode;
        isSuccessPayment = rawBody.code === '00' || rawBody.desc === 'success';
      } catch (err: any) {
        console.error('[Webhook] Signature verification mismatch:', err.message);
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 400 }
        );
      }
    } else {
      orderCode = rawBody?.data?.orderCode || rawBody?.orderCode;
      isSuccessPayment = rawBody.code === '00' || rawBody.status === 'PAID' || rawBody.desc === 'success';
    }

    if (!orderCode) {
      return NextResponse.json(
        { error: 'Missing orderCode in webhook payload' },
        { status: 400 }
      );
    }

    if (!isSuccessPayment) {
      console.log(`[Webhook] Order #${orderCode} payment unsuccessful or canceled.`);
      return NextResponse.json({ received: true, status: 'ignored_unsuccessful' });
    }

    // 2. Fetch corresponding order
    const order = await prisma.order.findUnique({
      where: { orderCode: BigInt(orderCode) },
    });

    if (!order) {
      console.warn(`[Webhook] Order with code ${orderCode} not found`);
      return NextResponse.json(
        { error: `Order with code ${orderCode} not found` },
        { status: 404 }
      );
    }

    // 3. Idempotency check: If already PAID, acknowledge immediately
    if (order.status === OrderStatus.PAID) {
      console.log(`[Webhook] Order #${orderCode} was already settled. Skipping duplicate accounting.`);
      return NextResponse.json({ success: true, message: 'Already processed (idempotent)' });
    }

    // 4. Update order to PAID and record double-entry journal entries within transaction
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.PAID,
          paidAt: new Date(),
        },
      });

      await LedgerService.recordOrderPayment(order.id, tx);
    });

    console.log(`[Webhook] Successfully settled Order #${orderCode} and updated double-entry ledger.`);
    return NextResponse.json({ success: true, orderCode });
  } catch (error: any) {
    console.error('[Webhook Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Webhook processing error' },
      { status: 500 }
    );
  }
}

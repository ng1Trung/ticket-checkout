import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderCode: string }> }
) {
  try {
    const { orderCode } = await params;
    const codeNum = parseInt(orderCode, 10);

    if (isNaN(codeNum)) {
      return NextResponse.json({ error: 'Invalid order reference code' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { orderCode: BigInt(codeNum) },
      include: {
        event: true,
        listing: {
          include: {
            seller: true,
          },
        },
        buyer: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      orderCode: order.orderCode.toString(),
      status: order.status,
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      buyerFee: order.buyerFee,
      sellerFee: order.sellerFee,
      sellerReceives: order.sellerReceives,
      quantity: order.quantity,
      unitPrice: order.unitPrice,
      paidAt: order.paidAt,
      eventTitle: order.event.title,
      eventLocation: order.event.location,
      eventDate: order.event.eventDate,
      sellerName: order.listing.seller.name,
      buyerName: order.buyer.name,
      section: order.listing.section,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error querying order status' },
      { status: 500 }
    );
  }
}

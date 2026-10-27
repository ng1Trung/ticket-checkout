import { NextRequest, NextResponse } from 'next/server';
import { LedgerService } from '@/services/ledger.service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;

    if (!eventId) {
      return NextResponse.json({ error: 'Missing event ID' }, { status: 400 });
    }

    const result = await LedgerService.releaseEscrowForEvent(eventId);

    return NextResponse.json({
      success: true,
      message: 'Event completed and escrow funds released successfully.',
      ...result,
    });
  } catch (error: any) {
    console.error('[Admin Complete Event Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Error executing event completion and escrow release' },
      { status: 400 }
    );
  }
}

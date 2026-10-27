import { NextRequest, NextResponse } from 'next/server';
import { LedgerService } from '@/services/ledger.service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const balances = await LedgerService.getUserBalances(userId);
    return NextResponse.json(balances);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error querying derived user balances' },
      { status: 500 }
    );
  }
}

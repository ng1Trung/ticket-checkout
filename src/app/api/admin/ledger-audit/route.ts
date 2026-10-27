import { NextResponse } from 'next/server';
import { LedgerService } from '@/services/ledger.service';

export async function GET() {
  try {
    const report = await LedgerService.getLedgerAuditReport();
    return NextResponse.json(report);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error generating ledger audit report' },
      { status: 500 }
    );
  }
}

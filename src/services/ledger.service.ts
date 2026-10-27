import { prisma } from '../lib/prisma';
import { Prisma, TransactionType, EntryType, AccountType } from '@prisma/client';

export interface UserBalance {
  userId: string;
  pendingBalance: number;  // Escrow funds pending event completion
  availableBalance: number; // Cleared funds available for payout
}

export interface LedgerAuditReport {
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
  imbalanceDiff: number;
  accountBalances: Array<{
    code: string;
    name: string;
    type: AccountType;
    debitTotal: number;
    creditTotal: number;
    netBalance: number;
  }>;
}

export class LedgerService {
  /**
   * Enforces double-entry invariance: Total DEBIT must strictly equal Total CREDIT.
   */
  public static assertTransactionBalanced(
    entries: Array<{ amount: number; entryType: EntryType }>
  ): void {
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      if (entry.amount < 0) {
        throw new Error(`Ledger entry amount must be positive. Received: ${entry.amount}`);
      }
      if (entry.entryType === EntryType.DEBIT) {
        totalDebit += entry.amount;
      } else if (entry.entryType === EntryType.CREDIT) {
        totalCredit += entry.amount;
      }
    }

    if (totalDebit !== totalCredit) {
      throw new Error(
        `Double-entry ledger imbalance detected! Total DEBIT (${totalDebit}) !== Total CREDIT (${totalCredit}). Imbalance: ${totalDebit - totalCredit}`
      );
    }
  }

  /**
   * Records payment when an order is settled via payment gateway webhook.
   * 
   * Double-Entry Rules:
   * - DEBIT  [Asset]     GATEWAY_RECEIVABLE:            +order.totalAmount (Funds collected from buyer)
   * - CREDIT [Liability] SELLER_ESCROW_PENDING_<seller>: +order.sellerReceives (Listing subtotal - 5% commission)
   * - CREDIT [Revenue]   PLATFORM_FEE_REVENUE:          +order.platformKeeps (10% buyer fee + 5% seller fee)
   */
  public static async recordOrderPayment(
    orderId: string,
    externalTx?: Prisma.TransactionClient
  ): Promise<void> {
    const execute = async (tx: Prisma.TransactionClient) => {
      // 1. Idempotency Check: Prevent duplicate journal entries
      const existingTx = await tx.ledgerTransaction.findFirst({
        where: {
          orderId,
          type: TransactionType.PAYMENT_ESCROW,
        },
      });

      if (existingTx) {
        console.warn(`[Ledger] Order ${orderId} already has a PAYMENT_ESCROW transaction. Skipping.`);
        return;
      }

      // 2. Fetch full order context
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: {
          listing: true,
          buyer: true,
          event: true,
        },
      });

      if (!order) {
        throw new Error(`Order not found with ID: ${orderId}`);
      }

      const sellerId = order.listing.sellerId;

      // 3. Ensure ledger accounts exist
      const gatewayAccount = await this.ensureAccount(
        tx,
        'GATEWAY_RECEIVABLE',
        'Asset: Payment Gateway Receivable (PayOS)',
        AccountType.ASSET
      );

      const platformRevenueAccount = await this.ensureAccount(
        tx,
        'PLATFORM_FEE_REVENUE',
        'Revenue: Platform Service Fee & Seller Commission',
        AccountType.REVENUE
      );

      const sellerPendingAccount = await this.ensureAccount(
        tx,
        `SELLER_ESCROW_PENDING_${sellerId}`,
        `Liability: Escrow Pending Payout for Seller ${sellerId}`,
        AccountType.LIABILITY,
        sellerId
      );

      // 4. Prepare ledger entries
      const entriesToCreate = [
        {
          accountId: gatewayAccount.id,
          amount: order.totalAmount,
          entryType: EntryType.DEBIT,
        },
        {
          accountId: sellerPendingAccount.id,
          amount: order.sellerReceives,
          entryType: EntryType.CREDIT,
        },
        {
          accountId: platformRevenueAccount.id,
          amount: order.platformKeeps,
          entryType: EntryType.CREDIT,
        },
      ];

      // 5. Assert mathematical balance
      this.assertTransactionBalanced(entriesToCreate);

      // 6. Persist transaction and entries
      const ledgerTx = await tx.ledgerTransaction.create({
        data: {
          orderId: order.id,
          eventId: order.eventId,
          type: TransactionType.PAYMENT_ESCROW,
          description: `Order Payment #${order.orderCode.toString()} - Tickets for ${order.event.title} (Qty: ${order.quantity})`,
          entries: {
            create: entriesToCreate,
          },
        },
      });

      console.log(`[Ledger] Recorded PAYMENT_ESCROW for Order ${order.id}. Tx ID: ${ledgerTx.id}`);
    };

    if (externalTx) {
      await execute(externalTx);
    } else {
      await prisma.$transaction(execute);
    }
  }

  /**
   * Releases escrowed funds when an event is marked as completed.
   * 
   * Double-Entry Rules:
   * Transfers liabilities from pending escrow to available payouts for each seller:
   * - DEBIT  [Liability] SELLER_ESCROW_PENDING_<seller>: -amount (Decreases pending liability)
   * - CREDIT [Liability] SELLER_AVAILABLE_<seller>:      +amount (Increases available liability)
   */
  public static async releaseEscrowForEvent(
    eventId: string,
    externalTx?: Prisma.TransactionClient
  ): Promise<{ releasedSellersCount: number; totalReleasedAmount: number }> {
    const execute = async (tx: Prisma.TransactionClient) => {
      // 1. Verify event existence
      const event = await tx.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new Error(`Event not found with ID: ${eventId}`);
      }

      // 2. Prevent duplicate release
      const existingRelease = await tx.ledgerTransaction.findFirst({
        where: {
          eventId,
          type: TransactionType.ESCROW_RELEASE,
        },
      });

      if (existingRelease) {
        throw new Error(`Escrow money for event "${event.title}" has already been released.`);
      }

      // 3. Find all settled orders
      const paidOrders = await tx.order.findMany({
        where: {
          eventId,
          status: 'PAID',
        },
        include: {
          listing: true,
        },
      });

      if (paidOrders.length === 0) {
        await tx.event.update({
          where: { id: eventId },
          data: { isCompleted: true, completedAt: new Date() },
        });
        return { releasedSellersCount: 0, totalReleasedAmount: 0 };
      }

      // 4. Aggregate payout amounts per seller
      const sellerAmountsMap = new Map<string, number>();
      for (const order of paidOrders) {
        const sellerId = order.listing.sellerId;
        const currentAmount = sellerAmountsMap.get(sellerId) || 0;
        sellerAmountsMap.set(sellerId, currentAmount + order.sellerReceives);
      }

      let totalReleasedAmount = 0;
      const allEntries = [];

      // 5. Construct balanced debit/credit transfer entries
      for (const [sellerId, amount] of sellerAmountsMap.entries()) {
        if (amount <= 0) continue;

        const pendingAccount = await this.ensureAccount(
          tx,
          `SELLER_ESCROW_PENDING_${sellerId}`,
          `Liability: Escrow Pending Payout for Seller ${sellerId}`,
          AccountType.LIABILITY,
          sellerId
        );

        const availableAccount = await this.ensureAccount(
          tx,
          `SELLER_AVAILABLE_${sellerId}`,
          `Liability: Available Payout for Seller ${sellerId}`,
          AccountType.LIABILITY,
          sellerId
        );

        allEntries.push({
          accountId: pendingAccount.id,
          amount,
          entryType: EntryType.DEBIT,
        });

        allEntries.push({
          accountId: availableAccount.id,
          amount,
          entryType: EntryType.CREDIT,
        });

        totalReleasedAmount += amount;
      }

      // 6. Assert balance
      this.assertTransactionBalanced(allEntries);

      // 7. Commit ledger transaction
      await tx.ledgerTransaction.create({
        data: {
          eventId,
          type: TransactionType.ESCROW_RELEASE,
          description: `Escrow Release for completed event: ${event.title}`,
          entries: {
            create: allEntries,
          },
        },
      });

      // 8. Update event completion status
      await tx.event.update({
        where: { id: eventId },
        data: {
          isCompleted: true,
          completedAt: new Date(),
        },
      });

      console.log(
        `[Ledger] Released ${totalReleasedAmount} VND across ${sellerAmountsMap.size} sellers for event: ${event.title}`
      );

      return {
        releasedSellersCount: sellerAmountsMap.size,
        totalReleasedAmount,
      };
    };

    if (externalTx) {
      return await execute(externalTx);
    } else {
      return await prisma.$transaction(execute);
    }
  }

  /**
   * Derives user balances dynamically from the immutable ledger entries.
   * No balance columns are cached on the User model to guarantee zero drift.
   */
  public static async getUserBalances(userId: string): Promise<UserBalance> {
    const pendingCode = `SELLER_ESCROW_PENDING_${userId}`;
    const availableCode = `SELLER_AVAILABLE_${userId}`;

    const accounts = await prisma.ledgerAccount.findMany({
      where: {
        code: { in: [pendingCode, availableCode] },
      },
      include: {
        entries: true,
      },
    });

    let pendingBalance = 0;
    let availableBalance = 0;

    for (const acc of accounts) {
      // For liability accounts: Balance = Total CREDIT - Total DEBIT
      let balance = 0;
      for (const entry of acc.entries) {
        if (entry.entryType === EntryType.CREDIT) {
          balance += entry.amount;
        } else if (entry.entryType === EntryType.DEBIT) {
          balance -= entry.amount;
        }
      }

      if (acc.code === pendingCode) {
        pendingBalance = balance;
      } else if (acc.code === availableCode) {
        availableBalance = balance;
      }
    }

    return {
      userId,
      pendingBalance,
      availableBalance,
    };
  }

  /**
   * Generates a complete system-wide balance audit across all accounts.
   */
  public static async getLedgerAuditReport(): Promise<LedgerAuditReport> {
    const accounts = await prisma.ledgerAccount.findMany({
      include: {
        entries: true,
      },
      orderBy: { code: 'asc' },
    });

    let totalSystemDebit = 0;
    let totalSystemCredit = 0;

    const accountBalances = accounts.map((acc) => {
      let debitTotal = 0;
      let creditTotal = 0;

      for (const entry of acc.entries) {
        if (entry.entryType === EntryType.DEBIT) {
          debitTotal += entry.amount;
          totalSystemDebit += entry.amount;
        } else {
          creditTotal += entry.amount;
          totalSystemCredit += entry.amount;
        }
      }

      // Normal balance:
      // Asset / Expense: Debit - Credit
      // Liability / Revenue: Credit - Debit
      const isNormalDebit = acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE;
      const netBalance = isNormalDebit ? debitTotal - creditTotal : creditTotal - debitTotal;

      return {
        code: acc.code,
        name: acc.name,
        type: acc.type,
        debitTotal,
        creditTotal,
        netBalance,
      };
    });

    return {
      isBalanced: totalSystemDebit === totalSystemCredit,
      totalDebit: totalSystemDebit,
      totalCredit: totalSystemCredit,
      imbalanceDiff: totalSystemDebit - totalSystemCredit,
      accountBalances,
    };
  }

  private static async ensureAccount(
    tx: Prisma.TransactionClient,
    code: string,
    name: string,
    type: AccountType,
    userId?: string
  ) {
    let account = await tx.ledgerAccount.findUnique({
      where: { code },
    });

    if (!account) {
      account = await tx.ledgerAccount.create({
        data: {
          code,
          name,
          type,
          userId,
        },
      });
    }

    return account;
  }
}

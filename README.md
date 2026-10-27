# Ticket Resale Marketplace: Checkout with Escrow & Double-Entry Ledger

This project implements a complete thin slice of a secondary event ticket resale marketplace: selling a ticket and accounting for money movements correctly using an immutable **Double-Entry Ledger** and **Escrow accounting**, integrated with a live sandbox payment gateway (**PayOS** - VietQR Napas 24/7).

---

## 1. How to Run It & Local Gateway Callbacks

### Prerequisites
* [Docker Desktop](https://www.docker.com/) & Docker Compose.
* [Node.js](https://nodejs.org/) v18+ and npm (only required if running natively outside Docker).

### Option 1: Quickstart via Docker Compose (Recommended)
A single command builds and starts PostgreSQL, the Next.js application, synchronizes the database schema, and seeds sample data:

```bash
docker compose up --build
```
* **Web Application:** [http://localhost:3000](http://localhost:3000)
* **PostgreSQL:** `localhost:5432` (User: `postgres`, Password: `postgrespassword`, DB: `resale_tickets`)

---

### Option 2: Local Development Setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start PostgreSQL container:
   ```bash
   docker compose up -d postgres
   ```
3. Push schema and seed initial data:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```
4. Start Next.js development server:
   ```bash
   npm run dev
   ```

---

### How Gateway Callbacks Reach It Locally

The specification requires: *"including how gateway callbacks reach it locally"*. Two local testing workflows are supported:

#### Method A: Public Tunnel (With Live PayOS Credentials)
1. In your project terminal, launch the local forwarding tunnel:
   ```bash
   npm run tunnel
   ```
   *(Alternatively: `ngrok http 3000`)*
2. Copy the public HTTPS forwarding URL (e.g., `https://swift-eagles-jump.loca.lt`).
3. In the [PayOS Dashboard](https://my.payos.vn/) -> Select your Sandbox App -> **Webhook Settings**:
   * Set Webhook URL to: `https://swift-eagles-jump.loca.lt/api/webhooks/payos`
4. Add your `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, and `PAYOS_CHECKSUM_KEY` to `.env` and restart the app.

#### Method B: Built-in Sandbox Simulator (Instant E2E Test Without Credentials)
* If live PayOS sandbox credentials are not set in `.env`, the checkout redirects to `/checkout/sandbox-simulator`.
* This screen simulates the mobile banking VietQR payment flow. Clicking **"Confirm Payment Success (Trigger Webhook)"** dispatches an identical webhook payload with HMAC verification to `/api/webhooks/payos`, settling the order and recording journal entries in real-time.

---

## 2. Payment Gateway Choice & Justification

**Chosen Gateway:** **[PayOS](https://payos.vn/)** (VietQR Napas 24/7 Sandbox).

### Justification:
1. **Native VND Currency Support:**
   * The brief explicitly mandates pricing in VND. Many international gateways (e.g., Stripe, PayPal) impose currency conversion friction, high minimum fee thresholds, or complex multi-currency ledger conversions for VND. PayOS natively supports zero-decimal integer VND without exchange rate overhead.
2. **Standard Local Checkout Experience (VietQR Napas 24/7):**
   * Instant bank transfers via VietQR represent the standard payment method in Vietnam. PayOS simulates instant QR code settlement and dispatches IPN notifications immediately.
3. **Bank-Grade Webhook Security:**
   * PayOS provides HMAC-SHA256 signature verification over every webhook payload using a secret checksum key, preventing tampering and replay attacks.
4. **Developer Experience:**
   * Official TypeScript SDK (`@payos/node`), clear API specifications, and reliable sandbox simulation.

---

## 3. Engineering Decisions & Judgement Calls

Where the brief is silent, the following architectural decisions were made:

### A. Ticket Concurrency & Race Condition Prevention (Atomic Inventory Lock)
* **The Problem:** If multiple buyers attempt to purchase the last available ticket concurrently, naive check-then-act logic risks over-selling.
* **Our Solution:**
  * Enforced **Atomic Conditional Decrement** in a database transaction:
    ```sql
    UPDATE "Listing"
    SET "availableQuantity" = "availableQuantity" - :qty,
        "updatedAt" = NOW()
    WHERE "id" = :listingId AND "availableQuantity" >= :qty
    RETURNING *;
    ```
  * If available inventory is insufficient, the statement returns zero rows and rejects the checkout immediately without creating an order.
  * Created orders start in `PENDING` status with a 10-minute hold TTL (`expiresAt`). If unpaid after 10 minutes, inventory is released back to the listing.

### B. Chart of Accounts (COA) for Double-Entry Ledger
Every single money movement is tracked through balanced journal entries ($\sum \text{Debit} \equiv \sum \text{Credit}$):
1. **Asset:** `GATEWAY_RECEIVABLE` (Funds collected and held by the payment gateway).
2. **Revenue:** `PLATFORM_FEE_REVENUE` (10% buyer service fee + 5% seller commission = 15% total platform take).
3. **Liability (Segmented per seller):**
   * `SELLER_ESCROW_PENDING_<sellerId>`: Funds held in escrow while the event is active.
   * `SELLER_AVAILABLE_<sellerId>`: Cleared funds available for seller withdrawal after event completion.

**Accounting Flow Example:**
* Ticket Listing Price: `1,000,000 VND`.
* Buyer pays (+10%): `1,100,000 VND`.
* Seller receives (-5%): `950,000 VND`.
* Platform keeps: `150,000 VND`.
* **When order is paid (Webhook settlement):**
  * `DEBIT` Asset `GATEWAY_RECEIVABLE`: `+1,100,000 VND`
  * `CREDIT` Liability `SELLER_ESCROW_PENDING`: `+950,000 VND`
  * `CREDIT` Revenue `PLATFORM_FEE_REVENUE`: `+150,000 VND`
  *(Debit = Credit: 1,100,000 = 950,000 + 150,000 $\rightarrow$ Strictly balanced)*
* **When event is marked completed (Escrow release):**
  * `DEBIT` Liability `SELLER_ESCROW_PENDING`: `-950,000 VND`
  * `CREDIT` Liability `SELLER_AVAILABLE`: `+950,000 VND`
  *(Transfers liability from escrow hold to cleared available balance)*

### C. Purely Derived Balances (Zero Drift)
* Balances are **never stored as cached numbers** on user records.
* Every balance shown in the UI is derived on-the-fly via:
  $$\text{Balance} = \sum \text{Credit} - \sum \text{Debit}$$
  from the immutable `LedgerEntry` table. This completely eliminates financial drift and race condition inconsistencies.

### D. Asynchronous Webhook vs. User Redirect Alignment
* Users frequently return to `/checkout/result` before the external webhook reaches the server.
* The result page includes an automated polling mechanism (2-second interval, up to 6 cycles) to smoothly reflect the settled `PAID` state without requiring manual page reloads.

---

## 4. What Is Not Production-Ready & Next Steps

1. **Authentication & RBAC:**
   * *Current:* User Switcher dropdown for quick testing evaluation.
   * *Production:* Real authentication (NextAuth/Clerk) with session tokens, JWTs, and role-based access control.
2. **Background Expiry Worker (Job Queue):**
   * *Current:* 10-minute hold timestamp stored on orders.
   * *Production:* Redis + BullMQ worker to automatically release expired ticket reservations when checkouts are abandoned.
3. **Automated Payout Engine:**
   * *Current:* Escrow clears into `Available Balance`.
   * *Production:* Automated B2C bank transfer integration (via VietQR / bank API) when sellers request cash withdrawals.
4. **Event Cancellation & Reversing Entries:**
   * *Production:* Dedicated cancellation workflow issuing 100% refunds to buyers and posting reversing journal entries in the double-entry ledger.
5. **Distributed Locking:**
   * *Production:* Redis Redlock to handle high-concurrency ticket drops exceeding thousands of requests per second.

---

## 5. AI Usage & Time Report

* **AI Tools Used:**
  * **Google Gemini / Antigravity Assistant:** Used as an intelligent pair-programmer for architectural design, double-entry ledger verification, automated test authoring, and UI refinement.
* **Workflow:**
  1. Requirement analysis & edge-case discovery (ticket race conditions, integer rounding in VND, idempotency).
  2. Master plan definition and schema design.
  3. Core ledger engine implementation with automated test coverage (`npm run test:ledger`).
  4. Webhook handler, atomic checkout session creation, and SSR mobile-first UI construction.
* **Total Time Taken:** Approximately **2.5 hours** of focused engineering time.

---

## 6. Automated Testing

Verify the mathematical invariance of the double-entry ledger engine anytime:

```bash
npm run test:ledger
```

Test suite coverage:
* [x] Invariance assertion: Throws error on unbalanced entries ($\text{Debit} \neq \text{Credit}$).
* [x] Payment escrow journal entry recording (`recordOrderPayment`).
* [x] Webhook idempotency (prevents duplicate journal entries on re-delivery).
* [x] Dynamic seller balance derivation from `LedgerEntry`.
* [x] Escrow release upon event completion (`releaseEscrowForEvent`).
* [x] Global balance sheet audit report (`isBalanced === true`).

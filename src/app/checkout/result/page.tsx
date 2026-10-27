'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock, XCircle, ArrowLeft, RefreshCw, Ticket, ShieldCheck, Calendar, MapPin, UserCheck, Sparkles } from 'lucide-react';

interface OrderDetails {
  orderCode: string;
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED';
  totalAmount: number;
  subtotal: number;
  buyerFee: number;
  sellerFee: number;
  sellerReceives: number;
  quantity: number;
  unitPrice: number;
  paidAt: string | null;
  eventTitle: string;
  eventLocation: string;
  eventDate: string;
  sellerName: string;
  buyerName: string;
  section: string;
}

function ResultContent() {
  const searchParams = useSearchParams();
  const orderCode = searchParams.get('orderCode');
  const isCanceled = searchParams.get('cancel') === 'true';

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    if (!orderCode) return;
    try {
      const res = await fetch(`/api/orders/${orderCode}/status`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
        return data.status;
      }
    } catch (e) {
      console.error('Failed to fetch order status:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Polling mechanism: Poll every 2 seconds if order is not yet marked PAID (in case webhook lags slightly behind user redirect)
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      if (count > 6) {
        clearInterval(interval);
        return;
      }

      const currentStatus = await fetchStatus();
      if (currentStatus === 'PAID') {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [orderCode]);

  if (!orderCode) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center max-w-md shadow-2xl">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold">Order Not Found</h2>
          <p className="text-sm text-slate-400 mt-2">Please verify the link or return to the marketplace home.</p>
          <Link href="/" className="mt-5 inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-bold">
            <ArrowLeft className="w-4 h-4" /> Return to Home
          </Link>
        </div>
      </div>
    );
  }

  const isPaid = order?.status === 'PAID';
  const isPending = order?.status === 'PENDING' && !isCanceled;

  return (
    <div className="min-h-[85vh] bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div
          className={`absolute top-0 left-0 right-0 h-1.5 ${
            isPaid
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600'
              : isPending
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400 animate-pulse'
              : 'bg-gradient-to-r from-rose-500 to-red-600'
          }`}
        />

        {/* Status Header */}
        <div className="text-center pb-6 border-b border-slate-800">
          {loading ? (
            <div className="flex flex-col items-center py-4">
              <RefreshCw className="w-12 h-12 text-indigo-400 animate-spin mb-3" />
              <h2 className="text-xl font-bold text-white">Verifying order status...</h2>
            </div>
          ) : isPaid ? (
            <div className="flex flex-col items-center">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 mb-3 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-12 h-12" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-3.5 py-1 rounded-full border border-emerald-500/25 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" /> Payment Confirmed
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-white">Order Successfully Settled!</h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md">
                Payment has been credited to the double-entry escrow ledger. Your tickets are secured.
              </p>
            </div>
          ) : isPending ? (
            <div className="flex flex-col items-center">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20 mb-3">
                <Clock className="w-12 h-12 animate-pulse" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/25 mb-2">
                Awaiting Gateway Settlement
              </span>
              <h1 className="text-2xl font-black text-white">Awaiting Payment Confirmation</h1>
              <p className="text-xs text-slate-400 mt-1 max-w-md">
                Listening for gateway IPN/webhook callback... Status updates automatically.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20 mb-3">
                <XCircle className="w-12 h-12" />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 px-3 py-1 rounded-full border border-rose-500/25 mb-2">
                Checkout Canceled
              </span>
              <h1 className="text-2xl font-black text-white">Payment Was Not Completed</h1>
              <p className="text-xs text-slate-400 mt-1">This order was canceled or timed out.</p>
            </div>
          )}
        </div>

        {/* Order Ticket Details */}
        {order && (
          <div className="py-6 space-y-4">
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  Electronic Ticket Receipt
                </span>
                <span className="font-mono text-xs font-bold text-slate-400">
                  Order #{order.orderCode}
                </span>
              </div>

              <h3 className="text-lg font-black text-white">{order.eventTitle}</h3>

              <div className="mt-3 space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>{new Date(order.eventDate).toLocaleString('en-US')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500" />
                  <span>{order.eventLocation}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Seller: <strong className="text-slate-300 font-semibold">{order.sellerName}</strong></span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800 flex justify-between items-center text-xs">
                <span className="text-slate-400">Section / Tier:</span>
                <span className="font-bold text-white">{order.section}</span>
              </div>
              <div className="flex justify-between items-center text-xs mt-1.5">
                <span className="text-slate-400">Quantity:</span>
                <span className="font-bold text-white">{order.quantity} ticket(s)</span>
              </div>
            </div>

            {/* Financial Accounting Breakdown */}
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-5 space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Tickets Subtotal ({order.quantity} tickets):</span>
                <span className="font-mono">{order.subtotal.toLocaleString('en-US')} VND</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Buyer Service Fee (+10%):</span>
                <span className="text-amber-400 font-mono font-bold">+{order.buyerFee.toLocaleString('en-US')} VND</span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm">
                <span className="font-bold text-white">Total Amount Paid:</span>
                <span className="font-black text-emerald-400 text-lg font-mono">
                  {order.totalAmount.toLocaleString('en-US')} VND
                </span>
              </div>

              {isPaid && (
                <div className="mt-3 pt-3 border-t border-dashed border-slate-800 text-[11px] text-slate-400 space-y-1.5 bg-slate-900/60 p-3 rounded-xl">
                  <div className="flex justify-between">
                    <span>Seller Escrow Credit (Subtotal minus 5% fee):</span>
                    <span className="text-amber-300 font-mono font-bold">{order.sellerReceives.toLocaleString('en-US')} VND</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Retained Fee (10% buyer + 5% seller = 15%):</span>
                    <span className="text-indigo-300 font-mono font-bold">
                      {(order.buyerFee + order.sellerFee).toLocaleString('en-US')} VND
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-2 space-y-3">
          <Link
            href="/"
            className="w-full py-3.5 px-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl transition duration-200 flex items-center justify-center gap-2 text-xs shadow-lg shadow-indigo-950/40"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Marketplace
          </Link>

          {isPending && (
            <button
              onClick={fetchStatus}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Check Status Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CheckoutResultPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading order results...</div>}>
      <ResultContent />
    </Suspense>
  );
}

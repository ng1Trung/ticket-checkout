'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { QrCode, ShieldCheck, CheckCircle2, XCircle, Loader2, Sparkles } from 'lucide-react';

function SimulatorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const orderCode = searchParams.get('orderCode') || '';
  const amount = parseInt(searchParams.get('amount') || '0', 10);
  const desc = searchParams.get('desc') || `Tickets #${orderCode}`;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulatePayment = async () => {
    setLoading(true);
    setError(null);
    try {
      // Simulate real gateway webhook dispatch to local endpoint
      const res = await fetch('/api/webhooks/payos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: '00',
          desc: 'success',
          data: {
            orderCode: parseInt(orderCode, 10),
            amount,
            description: desc,
          },
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Webhook simulation failed');
      }

      router.push(`/checkout/result?orderCode=${orderCode}`);
    } catch (err: any) {
      setError(err.message || 'Payment simulation error');
      setLoading(false);
    }
  };

  const handleCancelPayment = () => {
    router.push(`/checkout/result?orderCode=${orderCode}&cancel=true`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 blur-sm" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Payment Gateway Sandbox</h2>
              <p className="text-xs text-slate-400">VietQR Napas 24/7 Simulator</p>
            </div>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Sandbox
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
            {error}
          </div>
        )}

        <div className="bg-slate-950/70 rounded-2xl p-4 border border-slate-800/80 mb-6 space-y-2.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Order Reference:</span>
            <span className="font-mono font-bold text-slate-200">#{orderCode}</span>
          </div>
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-400">Description:</span>
            <span className="text-slate-300 font-medium">{desc}</span>
          </div>
          <div className="flex justify-between items-center pt-2.5 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-300">Total Due:</span>
            <span className="text-lg font-black text-emerald-400 font-mono">
              {amount.toLocaleString('en-US')} VND
            </span>
          </div>
        </div>

        {/* QR Code Frame */}
        <div className="bg-white rounded-2xl p-6 flex flex-col items-center justify-center mb-6 shadow-inner">
          <div className="p-3 bg-slate-100 rounded-xl mb-2">
            <QrCode className="w-36 h-36 text-slate-900" />
          </div>
          <p className="text-xs text-slate-700 font-bold">VietQR Instant Transfer</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Scan with any mobile banking app</p>
        </div>

        {/* Action Controls */}
        <div className="space-y-3">
          <button
            onClick={handleSimulatePayment}
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold rounded-xl transition duration-200 shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 disabled:opacity-50 text-xs"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Simulating webhook confirmation...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Payment Success (Trigger Webhook)</span>
              </>
            )}
          </button>

          <button
            onClick={handleCancelPayment}
            disabled={loading}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl transition duration-200 flex items-center justify-center gap-1.5"
          >
            <XCircle className="w-4 h-4" />
            <span>Cancel Transaction</span>
          </button>
        </div>

        <p className="mt-5 text-center text-[10px] text-slate-500 leading-relaxed">
          * When live credentials are provided in `.env`, the checkout redirects directly to the official PayOS gateway page.
        </p>
      </div>
    </div>
  );
}

export default function SandboxSimulatorPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading payment simulator...</div>}>
      <SimulatorContent />
    </Suspense>
  );
}

'use client';

import React, { useState } from 'react';
import { useAppUser } from '@/context/UserContext';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AdminEventControlsProps {
  eventId: string;
  eventTitle: string;
  isCompleted: boolean;
}

export function AdminEventControls({ eventId, eventTitle, isCompleted }: AdminEventControlsProps) {
  const { currentUser, refreshBalances } = useAppUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (currentUser.role !== 'ADMIN') {
    return null;
  }

  const handleComplete = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/events/${eventId}/complete`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to release escrow funds');
      }

      setMessage(`Success! Released ${data.totalReleasedAmount.toLocaleString('en-US')} VND across ${data.releasedSellersCount} sellers.`);
      setShowConfirm(false);
      await refreshBalances();
      router.refresh();
    } catch (err: any) {
      alert(err.message || 'Error completing event');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 pt-3.5 border-t border-slate-800/80 bg-purple-950/20 border border-purple-800/30 rounded-2xl p-4 space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-bold text-purple-300">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span>Admin Controls</span>
        </div>

        {isCompleted ? (
          <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25 flex items-center gap-1.5 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5" /> Escrow Fully Cleared & Released
          </span>
        ) : showConfirm ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleComplete}
              disabled={loading}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 shadow-md shadow-emerald-950/50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              Confirm Escrow Release
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl transition shadow-lg shadow-purple-950/40 flex items-center gap-1.5 hover:scale-105 active:scale-95"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-purple-200" />
            <span>Mark as Completed & Release Escrow</span>
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-400 leading-relaxed">
        When an event concludes successfully, the administrator marks it as completed to execute journal entries releasing all pending escrow balances into available balances for all respective sellers.
      </p>

      {message && (
        <div className="text-xs font-bold text-emerald-400 bg-emerald-500/15 p-2.5 rounded-xl border border-emerald-500/25">
          {message}
        </div>
      )}
    </div>
  );
}

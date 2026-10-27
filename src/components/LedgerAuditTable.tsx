'use client';

import React, { useState } from 'react';
import { ShieldCheck, RefreshCw, AlertCircle, Scale, Database } from 'lucide-react';

interface AuditReport {
  isBalanced: boolean;
  totalDebit: number;
  totalCredit: number;
  imbalanceDiff: number;
  accountBalances: Array<{
    code: string;
    name: string;
    type: 'ASSET' | 'LIABILITY' | 'REVENUE' | 'EXPENSE';
    debitTotal: number;
    creditTotal: number;
    netBalance: number;
  }>;
}

export function LedgerAuditTable() {
  const [report, setReport] = useState<AuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const fetchAudit = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/ledger-audit');
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (e) {
      console.error('Failed to fetch ledger audit:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="mt-12 bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base flex items-center gap-2">
              Double-Entry Ledger Audit & Balance Sheet
              <span className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                Live Audit
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              All balances are derived dynamically from immutable ledger entries, upholding GAAP double-entry principles.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) fetchAudit();
          }}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center gap-2 border border-slate-700"
        >
          <Database className="w-4 h-4 text-indigo-400" />
          <span>{isOpen ? 'Collapse Ledger Audit' : 'Open Ledger Audit Table'}</span>
        </button>
      </div>

      {isOpen && (
        <div className="mt-5 space-y-4">
          {loading && !report ? (
            <div className="py-8 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
              Aggregating double-entry ledger balances...
            </div>
          ) : report ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
                  <span className="text-xs text-slate-400 block">Total System DEBIT:</span>
                  <span className="text-base font-extrabold text-slate-200 font-mono">
                    {report.totalDebit.toLocaleString('en-US')} VND
                  </span>
                </div>
                <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
                  <span className="text-xs text-slate-400 block">Total System CREDIT:</span>
                  <span className="text-base font-extrabold text-slate-200 font-mono">
                    {report.totalCredit.toLocaleString('en-US')} VND
                  </span>
                </div>
                <div
                  className={`p-4 rounded-2xl border ${
                    report.isBalanced
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                      : 'bg-rose-950/30 border-rose-500/30 text-rose-400'
                  }`}
                >
                  <span className="text-xs block opacity-80">Mathematical Invariance:</span>
                  <div className="text-base font-bold flex items-center gap-1.5 mt-0.5">
                    {report.isBalanced ? (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>STRICTLY BALANCED (100%)</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4" />
                        <span>IMBALANCE ({report.imbalanceDiff.toLocaleString('en-US')} VND)</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Accounts Table */}
              <div className="overflow-x-auto rounded-2xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Account Code</th>
                      <th className="py-3 px-4">Account Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4 text-right">Total Debit</th>
                      <th className="py-3 px-4 text-right">Total Credit</th>
                      <th className="py-3 px-4 text-right">Net Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 bg-slate-900/40 text-slate-300">
                    {report.accountBalances.map((acc) => (
                      <tr key={acc.code} className="hover:bg-slate-800/40 transition">
                        <td className="py-3 px-4 font-mono font-medium text-slate-200">{acc.code}</td>
                        <td className="py-3 px-4">{acc.name}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              acc.type === 'ASSET'
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                                : acc.type === 'LIABILITY'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {acc.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {acc.debitTotal.toLocaleString('en-US')} VND
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {acc.creditTotal.toLocaleString('en-US')} VND
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-100">
                          {acc.netBalance.toLocaleString('en-US')} VND
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={fetchAudit}
                  disabled={loading}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Refresh Ledger Audit
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}

'use client';

import React from 'react';
import { useAppUser, SEED_USERS } from '@/context/UserContext';
import { Ticket, Users, RefreshCw, Wallet, Clock, ShieldCheck, Sparkles, ChevronDown } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  const {
    currentUser,
    setCurrentUser,
    pendingBalance,
    availableBalance,
    refreshBalances,
    isLoadingBalances,
  } = useAppUser();

  const isSeller = currentUser.role === 'SELLER';
  const isAdmin = currentUser.role === 'ADMIN';

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/85 border-b border-slate-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3.5 group">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-2xl blur-sm opacity-70 group-hover:opacity-100 transition duration-300" />
            <div className="relative p-2.5 bg-slate-900 border border-slate-700/60 rounded-xl text-white shadow-xl flex items-center justify-center">
              <Ticket className="w-5 h-5 text-indigo-400 group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-xl tracking-tight text-white">
                Ticket<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400">Escrow</span>
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Safe Resale
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block font-medium">
              Event ticket resale marketplace secured by double-entry escrow
            </p>
          </div>
        </Link>

        {/* Right side: Balances & User Selector */}
        <div className="flex items-center gap-3">
          {/* Seller Escrow Badges */}
          {isSeller && (
            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800/90 shadow-inner rounded-2xl p-1.5 px-3">
              {/* Pending */}
              <div
                className="flex items-center gap-2 pr-3 border-r border-slate-800"
                title="Funds held in escrow, released to available balance once the event completes"
              >
                <div className="w-7 h-7 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-400 block leading-tight">Escrow Pending</span>
                  <span className="text-xs font-extrabold text-amber-300 font-mono">
                    {pendingBalance.toLocaleString('en-US')} VND
                  </span>
                </div>
              </div>

              {/* Available */}
              <div
                className="flex items-center gap-2 pr-1.5"
                title="Cleared funds available for withdrawal"
              >
                <div className="w-7 h-7 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] font-medium text-slate-400 block leading-tight">Available</span>
                  <span className="text-xs font-extrabold text-emerald-400 font-mono">
                    {availableBalance.toLocaleString('en-US')} VND
                  </span>
                </div>
              </div>

              {/* Reload Button */}
              <button
                onClick={() => refreshBalances()}
                disabled={isLoadingBalances}
                className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition duration-150 disabled:opacity-50"
                title="Refresh balances"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBalances ? 'animate-spin text-indigo-400' : ''}`} />
              </button>
            </div>
          )}

          {/* Admin Mode Pill */}
          {isAdmin && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-2xl text-purple-400 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Admin Mode</span>
            </div>
          )}

          {/* User Switcher Dropdown */}
          <div className="relative flex items-center bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-1.5 pl-3 transition shadow-md">
            <Users className="w-4 h-4 text-indigo-400 mr-2 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase tracking-wider font-bold text-slate-500 leading-none mb-0.5">
                Switch Test Role
              </span>
              <div className="flex items-center gap-1">
                <select
                  value={currentUser.id}
                  onChange={(e) => {
                    const selected = SEED_USERS.find((u) => u.id === e.target.value);
                    if (selected) setCurrentUser(selected);
                  }}
                  className="bg-transparent text-xs font-bold text-slate-200 outline-none cursor-pointer pr-4 appearance-none"
                >
                  {SEED_USERS.map((user) => (
                    <option key={user.id} value={user.id} className="bg-slate-900 text-slate-200">
                      [{user.role}] {user.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-slate-400 pointer-events-none -ml-3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

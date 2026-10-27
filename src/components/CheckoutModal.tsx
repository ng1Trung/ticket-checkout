'use client';

import React, { useState } from 'react';
import { useAppUser } from '@/context/UserContext';
import { X, ShieldCheck, Ticket, Plus, Minus, Loader2, AlertCircle, ExternalLink, Calendar, MapPin } from 'lucide-react';

export interface ListingItem {
  id: string;
  section: string | null;
  totalQuantity: number;
  availableQuantity: number;
  pricePerTicketVnd: number;
  seller: {
    id: string;
    name: string;
  };
}

export interface EventItem {
  id: string;
  title: string;
  location: string;
  eventDate: string | Date;
}

interface CheckoutModalProps {
  event: EventItem;
  listing: ListingItem;
  onClose: () => void;
}

export function CheckoutModal({ event, listing, onClose }: CheckoutModalProps) {
  const { currentUser } = useAppUser();
  const [quantity, setQuantity] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const maxAvailable = listing.availableQuantity;
  const unitPrice = listing.pricePerTicketVnd;
  const subtotal = unitPrice * quantity;
  const buyerFee = Math.round(subtotal * 0.10); // 10% buyer service fee
  const totalAmount = subtotal + buyerFee;

  const sellerFee = Math.round(subtotal * 0.05); // 5% seller commission
  const sellerReceives = subtotal - sellerFee;
  const platformRevenue = buyerFee + sellerFee; // 15% platform total revenue

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/checkout/create-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          quantity,
          buyerId: currentUser.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate checkout session');
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No redirect URL received from payment service');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected checkout error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative flex flex-col max-h-[92vh]">
        {/* Glow Header Accent */}
        <div className="h-1.5 bg-gradient-to-r from-indigo-500 via-violet-500 to-emerald-400" />

        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-base">Confirm Ticket Checkout</h3>
              <p className="text-xs text-slate-400">Secured transaction protected by double-entry escrow</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Event Ticket Stub Summary */}
          <div className="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                Event Details
              </span>
              <span className="text-xs font-bold text-slate-300">
                Tier: <strong className="text-indigo-300">{listing.section || 'General'}</strong>
              </span>
            </div>

            <h4 className="font-extrabold text-white text-base">{event.title}</h4>

            <div className="text-xs text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>{new Date(event.eventDate).toLocaleString('en-US')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>{event.location}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
              <span className="text-slate-400">Seller:</span>
              <span className="font-semibold text-slate-200">{listing.seller.name}</span>
            </div>
          </div>

          {/* Quantity Selector */}
          <div className="flex items-center justify-between p-4 bg-slate-950/50 rounded-2xl border border-slate-800">
            <div>
              <span className="text-sm font-bold text-white block">Select Quantity</span>
              <span className="text-xs text-slate-400">{maxAvailable} tickets available</span>
            </div>

            <div className="flex items-center gap-3 bg-slate-900 border border-slate-700/80 rounded-xl p-1.5">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || isLoading}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition flex items-center justify-center"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-base font-extrabold text-white w-6 text-center font-mono">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxAvailable, q + 1))}
                disabled={quantity >= maxAvailable || isLoading}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 transition flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Pricing Calculation Breakdown */}
          <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800 space-y-3 text-xs">
            <div className="flex justify-between text-slate-300">
              <span className="text-slate-400">Tickets Subtotal ({quantity} × {unitPrice.toLocaleString('en-US')} VND):</span>
              <span className="font-mono font-medium">{subtotal.toLocaleString('en-US')} VND</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1 text-slate-400">
                Buyer Service Fee (+10%):
              </span>
              <span className="text-amber-400 font-mono font-bold">+{buyerFee.toLocaleString('en-US')} VND</span>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm">
              <span className="font-bold text-white">Total Amount Due (VND):</span>
              <span className="font-black text-emerald-400 text-lg font-mono">
                {totalAmount.toLocaleString('en-US')} VND
              </span>
            </div>

            {/* Escrow Transparency Explainer */}
            <div className="mt-3 p-3.5 bg-indigo-950/40 border border-indigo-800/40 rounded-xl text-[11px] text-slate-300 space-y-1.5">
              <div className="flex items-center gap-1.5 text-indigo-400 font-bold">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>Transparent Escrow Ledger Accounting</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                • The seller is credited <strong className="text-amber-300 font-mono font-semibold">{sellerReceives.toLocaleString('en-US')} VND</strong> (after a 5% commission) into their <em className="text-amber-200">Pending Escrow Balance</em>. Funds are transferred to available balance only after event completion.
              </p>
              <p className="text-slate-400 leading-relaxed">
                • The platform retains a fee of <strong className="text-indigo-300 font-mono font-semibold">{platformRevenue.toLocaleString('en-US')} VND</strong> (10% buyer + 5% seller = 15%) to maintain transaction guarantees.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>Checkout Role:</span>
            <span className="font-semibold text-slate-200">[{currentUser.role}] {currentUser.name}</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-6 pt-4 border-t border-slate-800 bg-slate-950/60 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition text-xs"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={isLoading || maxAvailable === 0}
            className="flex-2 py-3 px-5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black rounded-xl transition shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 text-xs disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Reserving ticket & creating session...</span>
              </>
            ) : (
              <>
                <span>Pay Now ({totalAmount.toLocaleString('en-US')} VND)</span>
                <ExternalLink className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

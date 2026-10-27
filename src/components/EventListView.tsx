'use client';

import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  User,
  Ticket,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Lock,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { CheckoutModal, EventItem, ListingItem } from './CheckoutModal';
import { AdminEventControls } from './AdminEventControls';
import { LedgerAuditTable } from './LedgerAuditTable';
import { useAppUser } from '@/context/UserContext';

export interface EventWithListings {
  id: string;
  title: string;
  description: string | null;
  eventDate: string | Date;
  location: string;
  imageUrl: string | null;
  isCompleted: boolean;
  completedAt: string | Date | null;
  listings: Array<{
    id: string;
    section: string | null;
    totalQuantity: number;
    availableQuantity: number;
    pricePerTicketVnd: number;
    seller: {
      id: string;
      name: string;
    };
  }>;
}

interface EventListViewProps {
  events: EventWithListings[];
}

export function EventListView({ events }: EventListViewProps) {
  const { currentUser } = useAppUser();
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);

  const handleOpenCheckout = (event: EventWithListings, listing: EventWithListings['listings'][0]) => {
    setSelectedEvent({
      id: event.id,
      title: event.title,
      location: event.location,
      eventDate: event.eventDate,
    });
    setSelectedListing(listing);
  };

  const handleCloseCheckout = () => {
    setSelectedEvent(null);
    setSelectedListing(null);
  };

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950/60 to-slate-950 border border-slate-800 p-8 sm:p-12 shadow-2xl">
        {/* Glow ambient lights */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold mb-5 tracking-wide">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            <span>Secure Escrow Protection • Automated Double-Entry Ledger</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-[1.15]">
            Event Ticket Resale <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-300 to-emerald-400">
              Secured 100% by Escrow
            </span>
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            Buyers pay the listing price plus a 10% service fee. All funds are safely locked in escrow and only credited to the sellers available balance (minus a 5% commission) once the event successfully concludes.
          </p>

          {/* Quick Pillars */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Escrow Guarantee</h4>
                <p className="text-[11px] text-slate-400">Zero fraud or fake tickets</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">Double-Entry Ledger</h4>
                <p className="text-[11px] text-slate-400">Debits strictly equal credits</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 flex-shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-200">VND Gateway Integration</h4>
                <p className="text-[11px] text-slate-400">Real-time webhook settlement</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-2">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Featured Events</h2>
            <p className="text-xs sm:text-sm text-slate-400">Browse verified listings from trusted sellers</p>
          </div>
          <span className="text-xs font-bold bg-slate-900 border border-slate-800 text-slate-300 px-3.5 py-1.5 rounded-2xl">
            {events.length} Events Available
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {events.map((event) => {
            const totalAvailableTickets = event.listings.reduce((sum, l) => sum + l.availableQuantity, 0);

            return (
              <div
                key={event.id}
                className="group bg-slate-900/70 border border-slate-800 hover:border-slate-700/90 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-indigo-950/20 transition-all duration-300 flex flex-col justify-between"
              >
                {/* Event Cover Image */}
                <div>
                  <div className="relative h-60 w-full overflow-hidden bg-slate-950">
                    <img
                      src={event.imageUrl || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?auto=format&fit=crop&w=1200&q=80'}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent" />

                    {/* Status badge top bar */}
                    <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md border ${
                          event.isCompleted
                            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/30'
                            : 'bg-indigo-950/90 text-indigo-300 border-indigo-500/30'
                        }`}
                      >
                        {event.isCompleted ? '✓ Completed (Escrow Released)' : '● On Sale'}
                      </span>

                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-950/80 text-slate-300 border border-slate-800 backdrop-blur-md">
                        {totalAvailableTickets} tickets left
                      </span>
                    </div>

                    {/* Title overlay */}
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-black text-white leading-tight drop-shadow-md">
                        {event.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          {new Date(event.eventDate).toLocaleDateString('en-US', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-400" />
                          {event.location}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Description & Listings List */}
                  <div className="p-6 space-y-5">
                    <p className="text-xs sm:text-sm text-slate-400 leading-relaxed line-clamp-2">
                      {event.description}
                    </p>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Available Listings ({event.listings.length})
                        </span>
                      </div>

                      {event.listings.length === 0 ? (
                        <div className="p-4 bg-slate-950/60 rounded-2xl text-center text-xs text-slate-500 border border-slate-800">
                          No listings currently available for this event.
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {event.listings.map((listing) => {
                            const isSoldOut = listing.availableQuantity === 0;

                            return (
                              <div
                                key={listing.id}
                                className={`rounded-2xl p-4 border transition-all duration-200 flex flex-wrap items-center justify-between gap-3 ${
                                  isSoldOut
                                    ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 shadow-md'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white">
                                      {listing.section || 'General Admission'}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                        isSoldOut
                                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                      }`}
                                    >
                                      {isSoldOut ? 'Sold Out' : `${listing.availableQuantity}/${listing.totalQuantity} available`}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                    <User className="w-3 h-3 text-slate-500" />
                                    <span>Seller: <strong className="text-slate-300 font-semibold">{listing.seller.name}</strong></span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <span className="text-[10px] text-slate-400 block leading-tight font-medium">Price / Ticket</span>
                                    <span className="text-base font-extrabold text-emerald-400 font-mono">
                                      {listing.pricePerTicketVnd.toLocaleString('en-US')} VND
                                    </span>
                                  </div>

                                  <button
                                    onClick={() => handleOpenCheckout(event, listing)}
                                    disabled={isSoldOut || event.isCompleted}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition duration-200 flex items-center gap-1.5 shadow-md ${
                                      isSoldOut || event.isCompleted
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-950/50 hover:scale-105 active:scale-95'
                                    }`}
                                  >
                                    <Ticket className="w-3.5 h-3.5" />
                                    <span>{isSoldOut ? 'Sold Out' : 'Buy Ticket'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin Management Bar */}
                <div className="p-6 pt-0">
                  <AdminEventControls
                    eventId={event.id}
                    eventTitle={event.title}
                    isCompleted={event.isCompleted}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout Modal */}
      {selectedEvent && selectedListing && (
        <CheckoutModal
          event={selectedEvent}
          listing={selectedListing}
          onClose={handleCloseCheckout}
        />
      )}

      {/* Live Double-Entry Ledger Audit Section */}
      <LedgerAuditTable />
    </div>
  );
}

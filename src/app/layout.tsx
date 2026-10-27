import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { UserProvider } from '@/context/UserContext';
import { Header } from '@/components/Header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TicketEscrow - Resale Marketplace with Double-Entry Ledger',
  description: 'Secondary event ticket resale marketplace secured by double-entry escrow accounting and real-time payment gateway settlement.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${inter.className} min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white`}>
        <UserProvider>
          <Header />
          <div className="flex-1">{children}</div>
          <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
            <p>© 2026 Ticket Resale Marketplace with Escrow & Double-Entry Accounting.</p>
            <p className="mt-1 text-[11px] text-slate-600">Built for technical evaluation & code assessment.</p>
          </footer>
        </UserProvider>
      </body>
    </html>
  );
}

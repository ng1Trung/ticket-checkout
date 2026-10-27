'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SELLER' | 'BUYER';
}

export const SEED_USERS: AppUser[] = [
  {
    id: 'user_buyer_c',
    name: 'David Miller (Concert Fan)',
    email: 'david.buyer@resalemarketplace.com',
    role: 'BUYER',
  },
  {
    id: 'user_seller_a',
    name: 'Alex Turner (TicketPro)',
    email: 'alex.seller@resalemarketplace.com',
    role: 'SELLER',
  },
  {
    id: 'user_seller_b',
    name: 'Sarah Connor (FanZone Hub)',
    email: 'sarah.seller@resalemarketplace.com',
    role: 'SELLER',
  },
  {
    id: 'user_admin_01',
    name: 'System Administrator',
    email: 'admin@resalemarketplace.com',
    role: 'ADMIN',
  },
];

interface UserContextType {
  currentUser: AppUser;
  setCurrentUser: (user: AppUser) => void;
  pendingBalance: number;
  availableBalance: number;
  refreshBalances: () => Promise<void>;
  isLoadingBalances: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<AppUser>(SEED_USERS[0]);
  const [pendingBalance, setPendingBalance] = useState<number>(0);
  const [availableBalance, setAvailableBalance] = useState<number>(0);
  const [isLoadingBalances, setIsLoadingBalances] = useState<boolean>(false);

  const refreshBalances = useCallback(async () => {
    if (currentUser.role !== 'SELLER') {
      setPendingBalance(0);
      setAvailableBalance(0);
      return;
    }

    try {
      setIsLoadingBalances(true);
      const res = await fetch(`/api/users/${currentUser.id}/balances`);
      if (res.ok) {
        const data = await res.json();
        setPendingBalance(data.pendingBalance || 0);
        setAvailableBalance(data.availableBalance || 0);
      }
    } catch (e) {
      console.error('Failed to refresh balances:', e);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [currentUser.id, currentUser.role]);

  useEffect(() => {
    if (currentUser.role !== 'SELLER') return;

    let ignore = false;
    fetch(`/api/users/${currentUser.id}/balances`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!ignore && data) {
          setPendingBalance(data.pendingBalance || 0);
          setAvailableBalance(data.availableBalance || 0);
        }
      })
      .catch((e) => {
        console.error('Failed to refresh balances:', e);
      });

    return () => {
      ignore = true;
    };
  }, [currentUser.id, currentUser.role]);

  const isSeller = currentUser.role === 'SELLER';

  return (
    <UserContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        pendingBalance: isSeller ? pendingBalance : 0,
        availableBalance: isSeller ? availableBalance : 0,
        refreshBalances,
        isLoadingBalances,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useAppUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useAppUser must be used within a UserProvider');
  }
  return context;
}

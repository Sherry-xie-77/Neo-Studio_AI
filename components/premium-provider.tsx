"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type OrderStatus = "approved" | "rejected";

type LatestOrder = {
  id: string;
  status: OrderStatus;
  createdAt: string;
  receipt: string;
  expiresAt?: string;
  amountMinor?: number;
  currency?: string;
  productName?: string;
} | null;

type PremiumContextValue = {
  hasPremium: boolean;
  email: string | null;
  latestOrder: LatestOrder;
  isLoading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function PremiumProvider({ children }: { children: ReactNode }) {
  const [hasPremium, setHasPremium] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [latestOrder, setLatestOrder] = useState<LatestOrder>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) throw new Error("me fetch failed");
      const data = (await res.json()) as {
        email: string | null;
        hasPremium: boolean;
        latestOrder: LatestOrder;
      };
      setEmail(data.email);
      setHasPremium(Boolean(data.hasPremium));
      setLatestOrder(data.latestOrder);
    } catch {
      setEmail(null);
      setHasPremium(false);
      setLatestOrder(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/me", { method: "DELETE" });
    await refresh();
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <PremiumContext.Provider
      value={{ hasPremium, email, latestOrder, isLoading, refresh, signOut }}
    >
      {children}
    </PremiumContext.Provider>
  );
}

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) {
    throw new Error("usePremium must be used inside <PremiumProvider>");
  }
  return ctx;
}

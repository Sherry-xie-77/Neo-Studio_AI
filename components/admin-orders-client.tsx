"use client";

import { useCallback, useEffect, useState } from "react";

import { type Locale, type PremiumOrder } from "@/lib/types";

const TOKEN_STORAGE_KEY = "ns_admin_token";

export function AdminOrdersClient({ locale }: { locale: Locale }) {
  const zh = locale === "zh";
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [orders, setOrders] = useState<PremiumOrder[]>([]);
  const [filter, setFilter] = useState<"approved" | "rejected" | "all">("approved");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (nextToken: string, status: typeof filter) => {
      setError("");
      try {
        const url = status === "all" ? "/api/orders" : `/api/orders?status=${status}`;
        const res = await fetch(url, {
          headers: { "x-admin-token": nextToken },
          cache: "no-store",
        });
        if (res.status === 401) {
          setError(zh ? "ADMIN_TOKEN 错误" : "Invalid ADMIN_TOKEN");
          setAuthed(false);
          return;
        }
        if (!res.ok) throw new Error("load failed");
        const data = (await res.json()) as { orders: PremiumOrder[] };
        setOrders(data.orders);
        setAuthed(true);
      } catch {
        setError(zh ? "加载失败，请稍后重试" : "Failed to load orders");
      }
    },
    [zh],
  );

  useEffect(() => {
    const saved = window.localStorage.getItem(TOKEN_STORAGE_KEY) ?? "";
    if (saved) {
      setToken(saved);
      void load(saved, filter);
    }
  }, [filter, load]);

  async function handleLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
    await load(token, filter);
  }

  async function rejectOrder(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-admin-token": token,
        },
        body: JSON.stringify({ status: "rejected" }),
      });
      if (!res.ok) throw new Error("update failed");
      await load(token, filter);
    } catch {
      setError(zh ? "更新失败" : "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  if (!authed) {
    return (
      <form onSubmit={handleLogin} className="max-w-md rounded-[28px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-6">
        <label className="grid gap-2 text-sm">
          <span className="text-[var(--avp-text-muted)]">ADMIN_TOKEN</span>
          <input
            type="password"
            value={token}
            onChange={(event) => setToken(event.target.value)}
            className="rounded-[18px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm text-[var(--avp-text)] outline-none"
            autoFocus
          />
        </label>
        <button type="submit" className="mt-4 inline-flex min-h-[46px] items-center justify-center rounded-full bg-[linear-gradient(180deg,#ffffff_0%,#e7f1ff_100%)] px-5 text-sm font-semibold text-[#0d3d7b]">
          {zh ? "进入" : "Enter"}
        </button>
        {error ? <p className="mt-3 text-sm text-[#ff748f]">{error}</p> : null}
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["approved", "rejected", "all"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setFilter(key);
              void load(token, key);
            }}
            className={filter === key
              ? "rounded-full bg-[linear-gradient(180deg,#ffffff_0%,#e7f1ff_100%)] px-4 py-2 text-xs font-semibold text-[#0d3d7b]"
              : "rounded-full border border-[var(--avp-border)] bg-[rgba(255,255,255,0.04)] px-4 py-2 text-xs text-[var(--avp-text-muted)]"}
          >
            {zh
              ? key === "approved"
                ? "已开通"
                : key === "rejected"
                  ? "已驳回"
                  : "全部"
              : key}
          </button>
        ))}
      </div>

      {error ? <p className="text-sm text-[#ff748f]">{error}</p> : null}

      <div className="grid gap-3">
        {orders.length === 0 ? (
          <p className="text-sm text-[var(--avp-text-muted)]">{zh ? "暂无订单" : "No orders"}</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="rounded-[22px] border border-[var(--avp-border)] bg-[rgba(255,255,255,0.03)] p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-[var(--avp-text)]">{order.email}</p>
                  <p className="mt-1 text-xs text-[var(--avp-text-muted)]">{new Date(order.createdAt).toLocaleString()}</p>
                </div>
                <span className="rounded-full border border-[var(--avp-border)] px-3 py-1 text-xs text-[var(--avp-text-muted)]">
                  {order.status === "approved" ? (zh ? "已开通" : "Approved") : zh ? "已驳回" : "Rejected"}
                </span>
              </div>
              <p className="mt-3 text-xs text-[var(--avp-text-muted)]">
                {zh ? "订单号：" : "Receipt: "}
                <span className="font-mono text-[var(--avp-text)]">{order.receipt}</span>
              </p>
              {order.expiresAt ? (
                <p className="mt-2 text-xs text-[var(--avp-text-muted)]">
                  {zh ? "有效期至：" : "Expires: "}
                  <span className="text-[var(--avp-text)]">{new Date(order.expiresAt).toLocaleString()}</span>
                </p>
              ) : null}
              <p className="mt-2 text-xs text-[var(--avp-text-muted)]">
                {zh ? "来源：" : "Source: "}
                <span className="text-[var(--avp-text)]">{order.source ?? "manual"}</span>
              </p>
              {order.amountMinor ? (
                <p className="mt-2 text-xs text-[var(--avp-text-muted)]">
                  {zh ? "金额：" : "Amount: "}
                  <span className="text-[var(--avp-text)]">
                    {(order.amountMinor / 100).toFixed(2)} {(order.currency ?? "usd").toUpperCase()}
                  </span>
                </p>
              ) : null}
              {order.status === "approved" ? (
                <button
                  type="button"
                  disabled={busyId === order.id}
                  onClick={() => void rejectOrder(order.id)}
                  className="mt-3 rounded-full border border-[var(--avp-border)] px-3 py-1.5 text-xs text-[var(--avp-text-muted)] disabled:opacity-60"
                >
                  {zh ? "驳回并取消会员" : "Reject and revoke"}
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

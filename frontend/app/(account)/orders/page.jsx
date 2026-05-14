'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getPaymentHistory } from '@/lib/api';
import AccessDenied from '@/components/AccessDenied';

/* ── Status Badge ── */
function StatusBadge({ status }) {
  const isSuccess = status === 'success';
  return (
    <span
      className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest"
      style={{
        background: isSuccess ? 'rgba(134,219,100,0.1)' : 'rgba(239,68,68,0.1)',
        border: `1px solid ${isSuccess ? 'rgba(134,219,100,0.2)' : 'rgba(239,68,68,0.2)'}`,
        color: isSuccess ? '#86db64' : '#ef4444',
        fontFamily: 'JetBrains Mono',
      }}
    >
      {status}
    </span>
  );
}

/* ── Item Type Icon ── */
function TypeIcon({ type }) {
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (type) {
    case 'subscription':
      return (
        <div className="w-8 h-8 rounded-lg bg-[#45f0f4]/10 border border-[#45f0f4]/20 flex items-center justify-center text-[#45f0f4]">
          <svg {...props}><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
      );
    case 'course':
      return (
        <div className="w-8 h-8 rounded-lg bg-[#abc7ff]/10 border border-[#abc7ff]/20 flex items-center justify-center text-[#abc7ff]">
          <svg {...props}><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>
        </div>
      );
    default:
      return (
        <div className="w-8 h-8 rounded-lg bg-[#86db64]/10 border border-[#86db64]/20 flex items-center justify-center text-[#86db64]">
          <svg {...props}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </div>
      );
  }
}

export default function OrdersPage() {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  async function fetchOrders() {
    try {
      const data = await getPaymentHistory();
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError('Failed to load transaction history.');
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#45f0f4]/20 border-t-[#45f0f4] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !user.profile_exists) {
    return (
      <AccessDenied
        title="Orders & Purchases"
        message="Please sign in to view your transaction history."
      />
    );
  }

  return (
    <div className="relative-z pt-8 pb-32 section-container max-w-3xl">
      {/* ── Header ── */}
      <div className="mb-10">
        <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-2" style={{ fontFamily: 'JetBrains Mono' }}>
          Account
        </p>
        <h1 className="text-3xl font-bold text-on-surface">Orders & Purchases</h1>
        <p className="text-on-surface-variant mt-1 text-sm">
          A complete record of your subscriptions, course enrollments, and premium resource purchases.
        </p>
      </div>

      {error ? (
        <div className="glass-card rounded-2xl p-6 text-center border border-red-500/20 bg-red-500/5 text-red-400">
          {error}
        </div>
      ) : orders.length === 0 ? (
        <div className="glass-card rounded-2xl p-12 text-center" style={{ border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center" 
               style={{ background: 'rgba(69,240,244,0.06)', border: '1px solid rgba(69,240,244,0.12)' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#45f0f4" strokeWidth="1.5" opacity="0.6">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-on-surface mb-2">No transactions found</h2>
          <p className="text-sm text-[#6b7280] max-w-xs mx-auto">
            You haven't made any purchases yet. Start by exploring our premium plans or curated courses.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="glass-card rounded-2xl p-5 transition-all duration-300 hover:border-[#45f0f4]/30"
              style={{
                background: 'rgba(22, 27, 34, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <TypeIcon type={order.item_type} />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white truncate">{order.item_name}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <p className="text-[11px] text-[#6b7280] font-mono">
                        ID: <span className="text-[#8b919f]">{order.payment_id || order.id}</span>
                      </p>
                      <span className="text-[11px] text-[#414753]">•</span>
                      <p className="text-[11px] text-[#6b7280] font-mono">
                        {new Date(order.created_at).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-lg font-bold text-[#45f0f4]" style={{ fontFamily: 'JetBrains Mono' }}>
                      ₹{order.amount.toFixed(2)}
                    </p>
                    <p className="text-[9px] text-[#6b7280] uppercase tracking-tighter">Paid via Razorpay</p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Help / Contact ── */}
      <div className="mt-12 p-6 rounded-2xl border border-dashed border-[#414753]/40 text-center">
        <p className="text-xs text-[#6b7280] mb-3">Having issues with a purchase?</p>
        <a 
          href="/contact" 
          className="text-xs font-bold text-[#45f0f4] uppercase tracking-widest hover:underline underline-offset-4"
          style={{ fontFamily: 'JetBrains Mono' }}
        >
          Contact Support →
        </a>
      </div>
    </div>
  );
}

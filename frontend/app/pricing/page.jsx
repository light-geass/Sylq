'use client';
import { useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { createOrder, verifyPayment } from '@/lib/api';

const PLANS = [
  {
    name: 'Free',
    price: '₹0',
    period: 'forever',
    color: '#f8fafc',
    border: 'rgba(248,250,252,0.2)',
    cta: { label: 'Get started free', href: '/auth/signup', style: 'ghost' },
    features: [
      { text: 'AI-generated questions (all subjects)', included: true },
      { text: '3 custom tests per day', included: true },
      { text: 'Post-test AI analysis', included: true },
      { text: '1 AI Study Plan generation per day', included: true },
      { text: 'Topic-wise strength & weakness report', included: true },
      { text: 'AI chatbot (10 messages per test)', included: true },
      { text: 'Test history (last 30 days)', included: true },
      { text: 'Offline test mode', included: true },
      { text: 'PYQ-only test mode', included: false },
      { text: 'Unlimited Daily Study Plans', included: false },
    ],
  },
  {
    name: 'Premium',
    price: { monthly: '₹199', yearly: '₹1,999' },
    originalPrice: { monthly: '₹299', yearly: '₹3,599' },
    period: { monthly: 'per month', yearly: 'per year' },
    color: '#e2e8f0',
    border: 'rgba(226,232,240,0.3)',
    recommended: true,
    cta: { label: 'Upgrade to premium', href: '/auth/signup?plan=premium', style: 'primary' },
    features: [
      { text: 'Everything in Free', included: true },
      { text: '12 custom tests per day', included: true },
      { text: '10 AI Study Plan generations per day', included: true },
      { text: 'PYQ-only test mode', included: true },
      { text: 'Unlimited AI chatbot messages', included: true },
      { text: 'Full test history (all time)', included: true },
      { text: 'Priority question bank updates', included: true },
      { text: 'Detailed behavioral insights', included: true },
      { text: 'Sincerity score tracking', included: true },
      { text: 'Export results as PDF', included: true },
      { text: 'Email progress reports (weekly)', included: true },
    ],
  },
  {
    name: 'University',
    price: 'Custom',
    period: 'annual billing',
    color: '#d4d4d8',
    border: 'rgba(212, 212, 216, 0.3)',
    cta: { label: "Let's talk", href: '/contact', style: 'ghost' },
    features: [
      { text: 'Everything in Premium', included: true },
      { text: 'Bulk student access (Unlimited)', included: true },
      { text: 'Institutional dashboard', included: true },
      { text: 'Custom curriculum mapping', included: true },
      { text: 'Dedicated account manager', included: true },
      { text: 'Priority 24/7 support', included: true },
      { text: 'Advanced analytics & reporting', included: true },
      { text: 'Single Sign-On (SSO)', included: true },
    ],
  },
];

function Check({ included }) {
  return included ? (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="7" fill="rgba(248,250,252,0.15)" />
      <path d="M4 7l2 2 4-4" stroke="#f8fafc" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="7" cy="7" r="7" fill="rgba(139,145,159,0.1)" />
      <path d="M5 5l4 4M9 5l-4 4" stroke="#414753" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export default function PricingPage() {
  const router = useRouter();
  const [billingCycle, setBillingCycle] = useState('yearly'); // 'monthly' | 'yearly'

  async function handleUpgrade(planType) {
    // planType: 'premium_monthly' or 'premium_yearly'
    try {
      const { order_id, amount, key_id, user_email } = await createOrder(planType);

      const options = {
        key: key_id,
        amount,
        currency: 'INR',
        name: 'Sylq',
        description: `Premium Plan (${billingCycle})`,
        order_id,
        prefill: { email: user_email },
        handler: async (res) => {
          await verifyPayment(res);
          router.push('/dashboard?upgraded=1');
        },
        theme: { color: '#45f0f4' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      alert(`Payment failed to initiate: ${err.message}`);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" />
      <div className="relative-z pb-20 section-container">
        {/* Header */}
        <div className="text-center py-8">
          <p className="text-xs font-bold tracking-widest uppercase text-secondary mb-3"
            style={{ fontFamily: 'JetBrains Mono' }}>
            Pricing
          </p>
          <h1 className="text-4xl font-bold text-on-surface mb-4" style={{ letterSpacing: '-0.01em' }}>
            Simple, honest pricing
          </h1>
          <p className="text-on-surface-variant max-w-md mx-auto mb-10">
            Start free and upgrade when you need PYQs and unlimited AI. No hidden fees.
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PLANS.map((plan) => {
            const isPremium = plan.name === 'Premium';
            const price = typeof plan.price === 'object' ? plan.price[billingCycle] : plan.price;
            const originalPrice = typeof plan.originalPrice === 'object' ? plan.originalPrice[billingCycle] : plan.originalPrice;
            const period = typeof plan.period === 'object' ? plan.period[billingCycle] : plan.period;

            // Calculate discount percentage
            let discountPercent = 0;
            if (originalPrice && price) {
              const orig = parseInt(originalPrice.replace(/[^0-9]/g, ''));
              const curr = parseInt(price.replace(/[^0-9]/g, ''));
              discountPercent = Math.round(((orig - curr) / orig) * 100);
            }

            return (
              <div
                key={plan.name}
                className={`glass-card rounded-2xl p-7 flex flex-col relative transition-all duration-300 ${
                  isPremium ? 'ring-1 ring-[#45f0f4]/30 bg-[#45f0f4]/15' : ''
                }`}
                style={{ border: `1px solid ${plan.border}` }}
              >
                {plan.recommended && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full"
                    style={{
                      fontFamily: 'JetBrains Mono',
                      background: 'rgba(226,232,240,0.15)',
                      color: '#e2e8f0',
                      border: '1px solid rgba(226,232,240,0.3)',
                    }}
                  >
                    Recommended
                  </div>
                )}

                <div className="mb-5">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-bold tracking-widest uppercase"
                      style={{ fontFamily: 'JetBrains Mono', color: plan.color }}>
                      {plan.name}
                    </p>
                    
                    {discountPercent > 0 && (
                      <span className="px-2 py-0.5 rounded bg-[#86db64]/10 border border-[#86db64]/20 text-[9px] font-bold text-[#86db64] uppercase tracking-wider">
                        {discountPercent}% OFF
                      </span>
                    )}
                  </div>

                  <div className="flex items-baseline gap-2 mb-4 whitespace-nowrap">
                    <span className="text-4xl font-black" style={{ color: '#dfe2eb', fontFamily: 'JetBrains Mono' }}>
                      {price}
                    </span>
                    {originalPrice && (
                      <span className="text-base text-[#a1a1aa] line-through" style={{ fontFamily: 'JetBrains Mono' }}>
                        {originalPrice}
                      </span>
                    )}
                    <span className="text-sm text-[#cbd5e1]">/ {period}</span>
                  </div>

                  {/* Inner Toggle for Premium */}
                  {isPremium && (
                    <div className="flex p-1 bg-surface-container-high rounded-lg mb-6 border border-white/5">
                      <button
                        onClick={() => setBillingCycle('monthly')}
                        className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${
                          billingCycle === 'monthly' 
                          ? 'bg-[#45f0f4] text-[#002f65] shadow-lg shadow-[#45f0f4]/20' 
                          : 'text-outline hover:text-on-surface'
                        }`}
                        style={{ fontFamily: 'JetBrains Mono' }}
                      >
                        Monthly
                      </button>
                      <button
                        onClick={() => setBillingCycle('yearly')}
                        className={`flex-1 py-1.5 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${
                          billingCycle === 'yearly' 
                          ? 'bg-[#45f0f4] text-[#002f65] shadow-lg shadow-[#45f0f4]/20' 
                          : 'text-outline hover:text-on-surface'
                        }`}
                        style={{ fontFamily: 'JetBrains Mono' }}
                      >
                        Yearly
                      </button>
                    </div>
                  )}
                </div>

                <ul className="flex flex-col gap-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f.text} className="flex items-center gap-2.5">
                      <Check included={f.included} />
                      <span className={`text-sm ${f.included ? 'text-on-surface' : 'text-outline'}`}>
                        {f.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {plan.name === 'Premium' ? (
                  <button
                    onClick={() => handleUpgrade(`premium_${billingCycle}`)}
                    className="cyber-btn-primary w-full py-3 text-center"
                  >
                    {plan.cta.label}
                  </button>
                ) : (
                  <Link
                    href={plan.cta.href}
                    className="cyber-btn-ghost w-full py-3 text-center"
                  >
                    {plan.cta.label}
                  </Link>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-xl mx-auto mt-16">
          <h2 className="text-xl font-bold text-on-surface text-center mb-8">Common questions</h2>
          {[
            { q: 'Is there a limit on the free plan?', a: 'The free plan includes 3 custom tests per day and 30 days of history. Premium offers unlimited tests and lifetime history.' },
            { q: 'Are PYQs from official exam papers?', a: 'Yes — questions are sourced from official exam answer keys and past papers.' },
            { q: 'What payment methods are accepted?', a: 'UPI, debit/credit cards, and net banking via Razorpay.' },
            { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your account settings at any time with no lock-in or hidden fees.' },
          ].map(({ q, a }) => (
            <div key={q} className="mb-4 glass-card rounded-xl p-5">
              <p className="font-semibold text-on-surface mb-1">{q}</p>
              <p className="text-sm text-on-surface-variant">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

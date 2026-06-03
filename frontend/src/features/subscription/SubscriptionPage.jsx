import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { CreditCard, CheckCircle, Star, Zap, Building2, ArrowRight, Receipt } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const PLANS = [
  {
    id: 'basic', name: 'Basic', price: '₹199', period: '/month',
    icon: Star, color: 'blue',
    features: ['SOS Alerts', 'Live Tracking', '5 Emergency Contacts', '3 Safe Zones', 'Incident Reporting', 'SMS Notifications'],
  },
  {
    id: 'premium', name: 'Premium', price: '₹499', period: '/month',
    icon: Zap, color: 'primary', popular: true,
    features: ['Everything in Basic', '10 Emergency Contacts', '20 Safe Zones', 'AI Risk Analysis', 'Voice Activation', 'Priority Support'],
  },
  {
    id: 'enterprise', name: 'Enterprise', price: '₹999', period: '/month',
    icon: Building2, color: 'purple',
    features: ['Everything in Premium', 'Unlimited Contacts', 'Unlimited Zones', 'Admin Dashboard', 'Analytics Export', 'Dedicated Support'],
  },
];

const COLOR_MAP = {
  blue: { border: 'border-blue-200', badge: 'bg-blue-50 text-blue-700', btn: 'bg-blue-500 hover:bg-blue-600 text-white', icon: 'bg-blue-50 text-blue-600' },
  primary: { border: 'border-primary-300', badge: 'bg-primary-50 text-primary-700', btn: 'bg-primary-500 hover:bg-primary-600 text-white', icon: 'bg-primary-50 text-primary-600' },
  purple: { border: 'border-purple-200', badge: 'bg-purple-50 text-purple-700', btn: 'bg-purple-500 hover:bg-purple-600 text-white', icon: 'bg-purple-50 text-purple-600' },
};

export default function SubscriptionPage() {
  const { user } = useSelector((s) => s.auth);
  const [loading, setLoading] = useState(false);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(true);

  useEffect(() => {
    api.get('/subscriptions/transactions').then((r) => setTransactions(r.data.data.transactions)).finally(() => setTxLoading(false));
  }, []);

  const handleRazorpayPayment = async (planId) => {
    setProcessingPlan(planId);
    try {
      const { data } = await api.post('/subscriptions/razorpay/order', { plan: planId });
      const { orderId, amount, currency, key, txId } = data.data;

      const options = {
        key,
        amount,
        currency,
        name: 'SafeGuard',
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Subscription`,
        order_id: orderId,
        handler: async (response) => {
          try {
            await api.post('/subscriptions/razorpay/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              txId, plan: planId,
            });
            toast.success('Subscription activated!');
            window.location.reload();
          } catch { toast.error('Payment verification failed'); }
        },
        prefill: { name: user?.name, email: user?.email, contact: user?.phone },
        theme: { color: '#e53e3e' },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', () => toast.error('Payment failed'));
      rzp.open();
    } catch (err) {
  console.error('RAZORPAY ERROR:', err);
  console.error('RESPONSE:', err.response?.data);

  toast.error(
    err.response?.data?.message ||
    err.message ||
    'Failed to initiate payment'
  );
} finally {
      setProcessingPlan(null);
    }
  };

  const handleStripePayment = async (planId) => {
    setProcessingPlan(planId);
    try {
      const { data } = await api.post('/subscriptions/stripe/session', { plan: planId });
      window.location.href = data.data.url;
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initiate payment');
      setProcessingPlan(null);
    }
  };

  const sub = user?.subscription;
  const currentPlan = sub?.plan || 'free';

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="font-display font-bold text-2xl text-neutral-900">Subscription</h1>
        <p className="text-neutral-500 text-sm mt-0.5">Choose a plan that keeps you safe</p>
      </div>

      {/* Current status */}
      {currentPlan !== 'free' && sub?.status === 'active' && (
        <div className="card bg-green-50 border border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle size={22} className="text-green-600 flex-shrink-0" />
            <div>
              <p className="font-semibold text-green-800 capitalize">
                {currentPlan} Plan — Active
              </p>
              {sub.endDate && (
                <p className="text-sm text-green-600">
                  Renews {formatDistanceToNow(new Date(sub.endDate), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan) => {
          const colors = COLOR_MAP[plan.color];
          const isCurrent = currentPlan === plan.id && sub?.status === 'active';
          return (
            <div key={plan.id}
              className={`card relative flex flex-col border-2 ${isCurrent ? colors.border : 'border-neutral-100'} ${plan.popular ? 'shadow-lg' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
                </div>
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${colors.icon}`}>
                <plan.icon size={20} />
              </div>
              <h3 className="font-display font-bold text-xl text-neutral-900">{plan.name}</h3>
              <div className="flex items-end gap-0.5 mt-1 mb-5">
                <span className="text-3xl font-display font-black text-neutral-900">{plan.price}</span>
                <span className="text-neutral-400 text-sm mb-1">{plan.period}</span>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-neutral-700">
                    <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className={`text-center py-2.5 rounded-xl text-sm font-semibold ${colors.badge}`}>
                  ✓ Current Plan
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => handleRazorpayPayment(plan.id)}
                    disabled={processingPlan === plan.id}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${colors.btn} disabled:opacity-50`}>
                    <CreditCard size={15} />
                    {processingPlan === plan.id ? 'Processing…' : 'Pay with Razorpay'}
                  </button>
                  <button
                    onClick={() => handleStripePayment(plan.id)}
                    disabled={processingPlan === plan.id}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold border border-neutral-200 text-neutral-700 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    <ArrowRight size={15} /> Checkout with Stripe
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Transaction history */}
      <div className="card">
        <h2 className="font-display font-semibold text-lg text-neutral-900 mb-4 flex items-center gap-2">
          <Receipt size={20} className="text-primary-500" /> Transaction History
        </h2>
        {txLoading ? (
          <div className="space-y-2">{[1,2,3].map((i) => <div key={i} className="h-12 bg-neutral-100 rounded-xl animate-pulse" />)}</div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-6">No transactions yet</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx._id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-neutral-800">{tx.description || tx.type}</p>
                  <p className="text-xs text-neutral-500">{new Date(tx.createdAt).toLocaleDateString()} · {tx.gateway}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-neutral-900">{tx.currency} {tx.amount.toFixed(2)}</p>
                  <span className={`badge text-xs ${tx.status === 'completed' ? 'badge-safe' : tx.status === 'pending' ? 'badge-warn' : 'badge-danger'}`}>
                    {tx.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

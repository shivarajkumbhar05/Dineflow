import { api } from './api';

let loading;
export const loadRazorpay = () => {
  if (window.Razorpay) return Promise.resolve();
  if (!loading) {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    loading = new Promise((res, rej) => {
      s.onload = res;
      s.onerror = () => rej(new Error('Could not load the payment window. Check your connection.'));
    }).catch((e) => { loading = null; s.remove(); throw e; });
    document.body.appendChild(s);
  }
  return loading;
};

/** Opens Razorpay Checkout for an order created by the backend, then verifies the signature server-side. */
export async function payWithRazorpay({ keyId, razorpayOrderId, amount, currency }, { name, description, onPaid, onDismiss, onError }) {
  await loadRazorpay();
  const rzp = new window.Razorpay({
    key: keyId, order_id: razorpayOrderId, amount, currency, name, description,
    theme: { color: '#FFB020' },
    handler: async (r) => {
      try {
        const result = await api('/api/payments/razorpay/verify', { method: 'POST', auth: false, body: { razorpay_order_id: r.razorpay_order_id, razorpay_payment_id: r.razorpay_payment_id, razorpay_signature: r.razorpay_signature } });
        onPaid?.(result);
      } catch (e) {
        if (onError) onError(e);
        else throw e;
      }
    },
    modal: { ondismiss: () => onDismiss?.() },
  });
  rzp.open();
}

const Razorpay = require('razorpay');
const { UNIT_PRICE, MAX_QTY, getCouponDiscount } = require('./_lib/pricing');
const { sendMetaEvent, clientIpFrom } = require('./_lib/metaCapi');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { currency = 'INR', receipt, notes, quantity, coupon_code, event_id, event_source_url, fbp, fbc } = req.body;

  const qty        = Math.max(1, Math.min(MAX_QTY, parseInt(quantity, 10) || 1));
  const discount    = getCouponDiscount(coupon_code); // paise off per unit — 0 if invalid/absent
  const unitPrice   = UNIT_PRICE - discount;
  const amount      = unitPrice * qty;
  const appliedCode = discount ? String(coupon_code).trim().toUpperCase() : null;

  // Server-side mirror of the browser's InitiateCheckout, deduplicated via event_id.
  // Sent before the Razorpay call (and independent of whether it succeeds) — the
  // client already fired the pixel event on button click, so a downstream Razorpay
  // failure must not cause the server-side copy to go missing.
  if (event_id) {
    try {
      await sendMetaEvent({
        eventName:       'InitiateCheckout',
        eventId:         event_id,
        eventSourceUrl:  event_source_url,
        email:           notes?.customer_email,
        phone:           notes?.customer_phone,
        clientIp:        clientIpFrom(req),
        clientUserAgent: req.headers['user-agent'],
        fbp, fbc,
        value:           amount / 100,
        currency,
        contentIds:      ['fioren-cream'],
        contentName:     'FIOREN Advanced Anti-Ageing Renewal Cream',
        numItems:        qty,
      });
    } catch (err) {
      console.error('Meta CAPI InitiateCheckout failed:', err.message);
    }
  }

  const razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  let order;
  try {
    order = await razorpay.orders.create({
      amount,
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes:   { ...(notes || {}), quantity: String(qty), coupon_code: appliedCode || '' },
    });
  } catch (err) {
    console.error('Razorpay create-order error:', err);
    const status = err.statusCode === 401 ? 401 : 500;
    return res.status(status).json({ error: err.error?.description || 'Failed to create order' });
  }

  res.json({ order_id: order.id, amount: order.amount, currency: order.currency });
};

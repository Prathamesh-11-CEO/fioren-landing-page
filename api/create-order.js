const Razorpay = require('razorpay');

const UNIT_PRICE = 100; // TEST MODE ₹1 — revert to 159900 before going live
const MAX_QTY    = 10;

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { currency = 'INR', receipt, notes, quantity } = req.body;

  const qty    = Math.max(1, Math.min(MAX_QTY, parseInt(quantity, 10) || 1));
  const amount = UNIT_PRICE * qty;

  const razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

  try {
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
      notes:   { ...(notes || {}), quantity: String(qty) },
    });
    res.json({ order_id: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    console.error('Razorpay create-order error:', err);
    const status = err.statusCode === 401 ? 401 : 500;
    res.status(status).json({ error: err.error?.description || 'Failed to create order' });
  }
};

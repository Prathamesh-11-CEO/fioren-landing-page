require('dotenv').config();
const express = require('express');
const Razorpay = require('razorpay');
const crypto  = require('crypto');
const path    = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

const razorpay = new Razorpay({
  key_id:     process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/* ── /api/config — returns public key to frontend ── */
app.get('/api/config', (_req, res) => {
  res.json({ key_id: process.env.RAZORPAY_KEY_ID });
});

/* ── /api/create-order ── */
app.post('/api/create-order', async (req, res) => {
  const { amount, currency = 'INR', receipt } = req.body;

  if (!amount || amount < 100) {
    return res.status(400).json({ error: 'Amount must be at least 100 paise (₹1)' });
  }

  try {
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt: receipt || `rcpt_${Date.now()}`,
    });
    res.json({ order_id: order.id, amount: order.amount, currency: order.currency });
  } catch (err) {
    console.error('Razorpay create-order error:', err);
    const status = err.statusCode === 401 ? 401 : 500;
    res.status(status).json({ error: err.error?.description || 'Failed to create order' });
  }
});

/* ── /api/verify-payment ── */
app.post('/api/verify-payment', (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: 'Signature verification failed' });
  }

  res.json({ success: true, payment_id: razorpay_payment_id });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FIOREN server → http://localhost:${PORT}`);
});

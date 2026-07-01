const Razorpay = require('razorpay');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { amount, currency = 'INR', receipt } = req.body;

  if (!amount || amount < 100) {
    return res.status(400).json({ error: 'Amount must be at least 100 paise (₹1)' });
  }

  const razorpay = new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });

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
};

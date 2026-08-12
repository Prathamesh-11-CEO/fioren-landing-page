const { UNIT_PRICE, MAX_QTY } = require('./_lib/pricing');
const { sendLeadEmail } = require('./_lib/email');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    customer_name,
    customer_email,
    customer_phone,
    delivery_address,
    quantity,
  } = req.body;

  const name       = (customer_name || '').trim();
  const nameValid  = name.length >= 2;
  const phoneValid = /^\d{10}$/.test(customer_phone || '');
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email || '');

  if (!nameValid || !(phoneValid || emailValid)) {
    return res.status(400).json({ error: 'Insufficient contact info' });
  }

  const qty    = Math.max(1, Math.min(MAX_QTY, parseInt(quantity, 10) || 1));
  const amount = UNIT_PRICE * qty;

  // Best-effort — a lead notification must never disrupt the checkout flow it's observing
  try {
    await sendLeadEmail({
      name,
      email:   customer_email    || '—',
      phone:   customer_phone    || '—',
      address: delivery_address  || '—',
      qty,
      amount,
    });
  } catch (err) {
    console.error('Lead email failed:', err.message);
  }

  res.json({ success: true });
};

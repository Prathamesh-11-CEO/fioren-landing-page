const { UNIT_PRICE, MAX_QTY, getCouponDiscount } = require('./_lib/pricing');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { code, quantity } = req.body;
  const qty = Math.max(1, Math.min(MAX_QTY, parseInt(quantity, 10) || 1));

  const discountPerUnit = getCouponDiscount(code);
  if (!discountPerUnit) {
    return res.status(400).json({ valid: false, error: 'Invalid or expired coupon code' });
  }

  const unitPrice = UNIT_PRICE - discountPerUnit;
  res.json({
    valid:            true,
    code:             String(code).trim().toUpperCase(),
    discount_per_unit: discountPerUnit,
    unit_price:       unitPrice,
    amount:           unitPrice * qty,
  });
};

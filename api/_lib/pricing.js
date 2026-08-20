const UNIT_PRICE = 159900; // ₹1,599 in paise — server is authoritative, never trust client
const MAX_QTY    = 10;
const COD_FEE    = 0; // paise — added to order total for Cash on Delivery orders

// Coupon codes: value is the per-unit discount in paise. ₹1,599 − ₹610 = ₹989.
const COUPONS = {
  FIOREN610: 61000,
};

function getCouponDiscount(code) {
  if (!code) return 0;
  return COUPONS[String(code).trim().toUpperCase()] || 0;
}

module.exports = { UNIT_PRICE, MAX_QTY, COD_FEE, getCouponDiscount };

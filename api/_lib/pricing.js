const UNIT_PRICE = 159900; // ₹1,599 in paise — server is authoritative, never trust client
const MAX_QTY    = 10;
const COD_FEE    = 0; // paise — added to order total for Cash on Delivery orders

module.exports = { UNIT_PRICE, MAX_QTY, COD_FEE };

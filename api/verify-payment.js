const crypto     = require('crypto');
const Razorpay   = require('razorpay');
const { sendOrderEmail } = require('./_lib/email');
const { getShiprocketToken, createShiprocketOrder } = require('./_lib/shiprocket');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    customer_name,
    customer_email,
    customer_phone,
    billing_addr1,
    billing_addr2,
    billing_city,
    billing_state,
    billing_pincode,
    delivery_address,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 1. Verify Razorpay signature
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expected !== razorpay_signature) {
    return res.status(400).json({ error: 'Signature verification failed' });
  }

  // 2. Fetch authoritative order details from Razorpay (amount & qty from server, not client)
  let actualAmount = 0;
  let actualQty    = 1;
  try {
    const rzp      = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
    const rzpOrder = await rzp.orders.fetch(razorpay_order_id);
    actualAmount   = rzpOrder.amount;
    actualQty      = parseInt(rzpOrder.notes?.quantity, 10) || 1;
  } catch (fetchErr) {
    console.error('Razorpay order fetch failed:', fetchErr.message);
    // non-fatal — proceed with fallback (signature already verified above)
  }

  // 3. Send order notification email (non-blocking)
  try {
    await sendOrderEmail({
      name:          customer_name    || '—',
      email:         customer_email   || '—',
      phone:         customer_phone   || '—',
      address:       delivery_address || '—',
      qty:           actualQty,
      amount:        actualAmount,
      paymentMethod: 'Prepaid',
      paymentId:     razorpay_payment_id,
      orderId:       razorpay_order_id,
    });
  } catch (emailErr) {
    console.error('Order email failed:', emailErr.message);
  }

  // 4. Create Shiprocket order (non-blocking)
  try {
    const token    = await getShiprocketToken();
    const srResult = await createShiprocketOrder(token, {
      name:    customer_name    || '',
      email:   customer_email   || '',
      phone:   customer_phone   || '',
      addr1:   billing_addr1    || delivery_address || '',
      addr2:   billing_addr2    || '',
      city:    billing_city     || '',
      state:   billing_state    || '',
      pincode: billing_pincode  || '',
      qty:     actualQty,
      amount:  actualAmount,
      orderId: razorpay_payment_id,
      paymentMethod: 'Prepaid',
    });
    console.log('Shiprocket order created — order_id:', srResult.order_id, 'shipment_id:', srResult.shipment_id);
  } catch (srErr) {
    console.error('Shiprocket order failed:', srErr.message);
  }

  res.json({ success: true, payment_id: razorpay_payment_id });
};

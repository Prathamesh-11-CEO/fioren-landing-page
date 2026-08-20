const { UNIT_PRICE, MAX_QTY, COD_FEE, getCouponDiscount } = require('./_lib/pricing');
const { sendOrderEmail } = require('./_lib/email');
const { getShiprocketToken, createShiprocketOrder } = require('./_lib/shiprocket');
const { sendMetaEvent, clientIpFrom } = require('./_lib/metaCapi');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    quantity,
    coupon_code,
    customer_name,
    customer_email,
    customer_phone,
    delivery_address,
    billing_addr1,
    billing_addr2,
    billing_city,
    billing_state,
    billing_pincode,
    event_id,
    event_source_url,
    fbp,
    fbc,
  } = req.body;

  if (!customer_name || !customer_phone || !billing_addr1 || !billing_city || !billing_state || !billing_pincode) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const qty        = Math.max(1, Math.min(MAX_QTY, parseInt(quantity, 10) || 1));
  const discount    = getCouponDiscount(coupon_code); // paise off per unit — 0 if invalid/absent
  const unitPrice   = UNIT_PRICE - discount;
  const amount      = unitPrice * qty + COD_FEE; // paise — server is authoritative, never trust client
  const appliedCode = discount ? String(coupon_code).trim().toUpperCase() : '';
  const orderId = `COD_${Date.now()}`;

  const metaUserData = {
    email:           customer_email,
    phone:           customer_phone,
    clientIp:        clientIpFrom(req),
    clientUserAgent: req.headers['user-agent'],
    fbp, fbc,
  };

  // 1. Meta Conversions API — mirrors the browser's InitiateCheckout (client-generated
  // event_id). Sent before email/Shiprocket, and independent of whether they succeed —
  // the client already fired the pixel event on button click, so a downstream failure
  // here must not cause the server-side copy to go missing.
  if (event_id) {
    try {
      await sendMetaEvent({
        eventName:      'InitiateCheckout',
        eventId:        event_id,
        eventSourceUrl: event_source_url,
        ...metaUserData,
        value:          amount / 100,
        currency:       'INR',
        contentIds:     ['fioren-cream'],
        contentName:    'FIOREN Advanced Anti-Ageing Renewal Cream',
        numItems:       qty,
      });
    } catch (err) {
      console.error('Meta CAPI InitiateCheckout (COD) failed:', err.message);
    }
  }

  // 2. Send order notification email (blocking — this is the merchant's only order visibility, so a
  // failure here must surface to the customer via the 500 response rather than fail silently)
  try {
    await sendOrderEmail({
      name:          customer_name,
      email:         customer_email    || '—',
      phone:         customer_phone,
      address:       delivery_address  || '—',
      qty,
      amount,
      paymentMethod: 'COD',
      paymentId:     null,
      orderId,
      couponCode:    appliedCode,
    });
  } catch (emailErr) {
    console.error('COD order email failed:', emailErr.message);
    return res.status(500).json({ error: 'Could not place order. Please try again.' });
  }

  // 3. Create Shiprocket order (non-blocking — email already confirmed the order exists)
  try {
    const token    = await getShiprocketToken();
    const srResult = await createShiprocketOrder(token, {
      name:    customer_name,
      email:   customer_email   || '',
      phone:   customer_phone,
      addr1:   billing_addr1    || delivery_address || '',
      addr2:   billing_addr2    || '',
      city:    billing_city,
      state:   billing_state,
      pincode: billing_pincode,
      qty,
      amount,
      orderId,
      paymentMethod: 'COD',
    });
    console.log('Shiprocket COD order created — order_id:', srResult.order_id, 'shipment_id:', srResult.shipment_id);
  } catch (srErr) {
    console.error('Shiprocket COD order failed:', srErr.message);
  }

  // 4. Meta Conversions API — mirrors the browser's Purchase, gated on the order having
  // actually succeeded (matches the client, which only reaches thankyou.html on success)
  try {
    await sendMetaEvent({
      eventName:      'Purchase',
      eventId:        orderId,
      eventSourceUrl: event_source_url,
      ...metaUserData,
      value:          amount / 100,
      currency:       'INR',
      contentIds:     ['fioren-cream'],
      contentName:    'FIOREN Advanced Anti-Ageing Renewal Cream',
      numItems:       qty,
    });
  } catch (err) {
    console.error('Meta CAPI Purchase (COD) failed:', err.message);
  }

  res.json({ success: true, order_id: orderId, amount });
};

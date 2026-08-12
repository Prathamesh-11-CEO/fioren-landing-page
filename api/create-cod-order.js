const { UNIT_PRICE, MAX_QTY, COD_FEE } = require('./_lib/pricing');
const { sendOrderEmail } = require('./_lib/email');
const { getShiprocketToken, createShiprocketOrder } = require('./_lib/shiprocket');
const { sendMetaEvent, clientIpFrom } = require('./_lib/metaCapi');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    quantity,
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

  const qty    = Math.max(1, Math.min(MAX_QTY, parseInt(quantity, 10) || 1));
  const amount = UNIT_PRICE * qty + COD_FEE; // paise — server is authoritative, never trust client
  const orderId = `COD_${Date.now()}`;

  // 1. Send order notification email (blocking — this is the merchant's only order visibility, so a
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
    });
  } catch (emailErr) {
    console.error('COD order email failed:', emailErr.message);
    return res.status(500).json({ error: 'Could not place order. Please try again.' });
  }

  // 2. Create Shiprocket order (non-blocking — email already confirmed the order exists)
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

  // 3. Meta Conversions API — mirrors the browser's InitiateCheckout (client-generated
  // event_id) and Purchase (orderId, matching what thankyou.html will fire client-side)
  const metaUserData = {
    email:           customer_email,
    phone:           customer_phone,
    clientIp:        clientIpFrom(req),
    clientUserAgent: req.headers['user-agent'],
    fbp, fbc,
  };

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

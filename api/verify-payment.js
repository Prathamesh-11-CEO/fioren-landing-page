const crypto     = require('crypto');
const nodemailer = require('nodemailer');

// ── Email ────────────────────────────────────────────────────────────────────

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

function orderEmailHtml({ name, email, phone, address, qty, amount, paymentId, orderId }) {
  const rupees = (amount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#EDEAE6;font-family:'DM Sans',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#EDEAE6;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1C1614;padding:28px 40px;text-align:center;">
            <div style="font-family:Georgia,serif;font-size:22px;font-weight:800;letter-spacing:4px;color:#ffffff;">FIOREN<sup style="font-size:11px;">®</sup></div>
            <div style="font-size:12px;color:#8A7E79;letter-spacing:1px;margin-top:4px;">NEW ORDER RECEIVED</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">

            <h2 style="margin:0 0 4px;font-family:Georgia,serif;font-size:22px;color:#1C1614;">New Order 🎉</h2>
            <p style="margin:0 0 28px;font-size:14px;color:#6B5C55;">A new order has been placed and payment is confirmed.</p>

            <!-- Customer -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr><td style="background:#EDEAE6;border-radius:8px;padding:20px 24px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C4A897;margin-bottom:14px;">Customer Details</div>
                <table width="100%" cellpadding="4" cellspacing="0" style="font-size:13px;color:#1C1614;">
                  <tr><td style="color:#6B5C55;width:130px;">Name</td><td><strong>${name}</strong></td></tr>
                  <tr><td style="color:#6B5C55;">Email</td><td>${email}</td></tr>
                  <tr><td style="color:#6B5C55;">Phone</td><td>${phone}</td></tr>
                </table>
              </td></tr>
            </table>

            <!-- Address -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr><td style="background:#EDEAE6;border-radius:8px;padding:20px 24px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C4A897;margin-bottom:10px;">Delivery Address</div>
                <div style="font-size:13px;color:#1C1614;line-height:1.7;">${address}</div>
              </td></tr>
            </table>

            <!-- Order -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td style="background:#EDEAE6;border-radius:8px;padding:20px 24px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C4A897;margin-bottom:14px;">Order Details</div>
                <table width="100%" cellpadding="4" cellspacing="0" style="font-size:13px;color:#1C1614;">
                  <tr><td style="color:#6B5C55;width:130px;">Product</td><td>FIOREN® Advanced Anti-Ageing Renewal Cream (50g)</td></tr>
                  <tr><td style="color:#6B5C55;">Quantity</td><td>${qty}</td></tr>
                  <tr><td style="color:#6B5C55;">Amount Paid</td><td><strong style="color:#7D5C4E;">${rupees}</strong></td></tr>
                  <tr><td style="color:#6B5C55;">Payment ID</td><td style="font-size:12px;word-break:break-all;">${paymentId}</td></tr>
                  <tr><td style="color:#6B5C55;">Order ID</td><td style="font-size:12px;word-break:break-all;">${orderId}</td></tr>
                </table>
              </td></tr>
            </table>

            <p style="margin:0;font-size:12px;color:#6B5C55;text-align:center;">
              Fioren &mdash; <a href="https://www.bioreachpharma.com/" style="color:#7D5C4E;">Bioreach Pharma Exports Pvt. Ltd.</a>
            </p>

          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Shiprocket ────────────────────────────────────────────────────────────────

async function getShiprocketToken() {
  const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      email:    process.env.shiprocket_api_user,
      password: process.env.shiprocket_api_passowrd,
    }),
  });
  if (!res.ok) throw new Error(`Shiprocket auth failed: ${res.status}`);
  const data = await res.json();
  if (!data.token) throw new Error('Shiprocket auth returned no token');
  return data.token;
}

async function createShiprocketOrder(token, {
  name, email, phone,
  addr1, addr2, city, state, pincode,
  qty, amount, paymentId,
}) {
  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0];
  const lastName  = nameParts.slice(1).join(' ') || '.';

  const now       = new Date();
  const orderDate = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 5);

  const unitPriceRs = (amount / qty) / 100;
  const totalRs     = amount / 100;

  const payload = {
    order_id:              paymentId,
    order_date:            orderDate,
    pickup_location:       process.env.SHIPROCKET_PICKUP_LOCATION || 'Primary',

    billing_customer_name: firstName,
    billing_last_name:     lastName,
    billing_address:       addr1,
    billing_address_2:     addr2 || '',
    billing_city:          city,
    billing_pincode:       pincode,
    billing_state:         state,
    billing_country:       'India',
    billing_email:         email,
    billing_phone:         phone,

    shipping_is_billing:   1,

    order_items: [{
      name:          'FIOREN Advanced Anti-Ageing Renewal Cream (50g)',
      sku:           'FIOREN-CREAM-50G',
      units:         qty,
      selling_price: unitPriceRs,
      hsn:           330499,
    }],

    payment_method: 'Prepaid',
    sub_total:      totalRs,

    // Bottle: 58×58×98 mm → 5.8×5.8×9.8 cm; weight 90g = 0.09 kg
    length:  5.8,
    breadth: 5.8,
    height:  9.8,
    weight:  0.09,
  };

  const res = await fetch('https://apiv2.shiprocket.in/v1/external/orders/create/adhoc', {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json();
  if (!res.ok) throw new Error(`Shiprocket create-order failed: ${res.status} — ${JSON.stringify(body)}`);
  return body;
}

// ── Handler ───────────────────────────────────────────────────────────────────

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
    quantity,
    amount,
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

  // 2. Send order notification email (non-blocking)
  try {
    const transporter = createTransporter();
    await transporter.sendMail({
      from:    `"FIOREN® Orders" <${process.env.GMAIL_USER}>`,
      to:      process.env.GMAIL_USER,
      subject: `New Order — ${customer_name || 'Customer'} · ₹${((amount || 0) / 100).toLocaleString('en-IN')}`,
      html:    orderEmailHtml({
        name:      customer_name    || '—',
        email:     customer_email   || '—',
        phone:     customer_phone   || '—',
        address:   delivery_address || '—',
        qty:       quantity         || 1,
        amount:    amount           || 0,
        paymentId: razorpay_payment_id,
        orderId:   razorpay_order_id,
      }),
    });
  } catch (emailErr) {
    console.error('Order email failed:', emailErr.message);
  }

  // 3. Create Shiprocket order (non-blocking)
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
      qty:     quantity         || 1,
      amount:  amount           || 0,
      paymentId: razorpay_payment_id,
    });
    console.log('Shiprocket order created — order_id:', srResult.order_id, 'shipment_id:', srResult.shipment_id);
  } catch (srErr) {
    console.error('Shiprocket order failed:', srErr.message);
  }

  res.json({ success: true, payment_id: razorpay_payment_id });
};

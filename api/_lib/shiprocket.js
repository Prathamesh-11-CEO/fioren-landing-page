async function getShiprocketToken() {
  const res = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      email:    process.env.SHIPROCKET_API_USER,
      password: process.env.SHIPROCKET_API_PASSWORD,
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
  qty, amount, orderId, paymentMethod = 'Prepaid',
}) {
  const nameParts = name.trim().split(' ');
  const firstName = nameParts[0];
  const lastName  = nameParts.slice(1).join(' ') || '.';

  const now       = new Date();
  const orderDate = now.toISOString().slice(0, 10) + ' ' + now.toTimeString().slice(0, 5);

  const unitPriceRs = (amount / qty) / 100;
  const totalRs     = amount / 100;

  const payload = {
    order_id:              orderId,
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

    payment_method: paymentMethod,
    sub_total:      totalRs,
    // cod_amount tells the delivery agent how much cash to collect on a COD order
    ...(paymentMethod === 'COD' ? { cod_amount: totalRs } : {}),

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

module.exports = { getShiprocketToken, createShiprocketOrder };

const nodemailer = require('nodemailer');

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

function orderEmailHtml({ name, email, phone, address, qty, amount, paymentMethod, paymentId, orderId }) {
  const rupees = (amount / 100).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
  const isCod  = paymentMethod === 'COD';

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
            <p style="margin:0 0 28px;font-size:14px;color:#6B5C55;">${isCod ? 'A new Cash on Delivery order has been placed.' : 'A new order has been placed and payment is confirmed.'}</p>

            <!-- Payment -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr><td style="background:${isCod ? '#FCEFD8' : '#EDEAE6'};border-radius:8px;padding:20px 24px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C4A897;margin-bottom:10px;">Payment</div>
                <table width="100%" cellpadding="4" cellspacing="0" style="font-size:13px;color:#1C1614;">
                  <tr><td style="color:#6B5C55;width:170px;">Payment Method</td><td><strong>${isCod ? 'Cash on Delivery (COD)' : 'Prepaid'}</strong></td></tr>
                  ${isCod ? `<tr><td style="color:#6B5C55;">Amount to Collect</td><td><strong style="color:#7D5C4E;">${rupees}</strong></td></tr>` : ''}
                </table>
              </td></tr>
            </table>

            <!-- Customer -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr><td style="background:#EDEAE6;border-radius:8px;padding:20px 24px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C4A897;margin-bottom:14px;">Customer Details</div>
                <table width="100%" cellpadding="4" cellspacing="0" style="font-size:13px;color:#1C1614;">
                  <tr><td style="color:#6B5C55;width:130px;">Name</td><td><strong>${escHtml(name)}</strong></td></tr>
                  <tr><td style="color:#6B5C55;">Email</td><td>${escHtml(email)}</td></tr>
                  <tr><td style="color:#6B5C55;">Phone</td><td>${escHtml(phone)}</td></tr>
                </table>
              </td></tr>
            </table>

            <!-- Address -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
              <tr><td style="background:#EDEAE6;border-radius:8px;padding:20px 24px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C4A897;margin-bottom:10px;">Delivery Address</div>
                <div style="font-size:13px;color:#1C1614;line-height:1.7;">${escHtml(address)}</div>
              </td></tr>
            </table>

            <!-- Order -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
              <tr><td style="background:#EDEAE6;border-radius:8px;padding:20px 24px;">
                <div style="font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C4A897;margin-bottom:14px;">Order Details</div>
                <table width="100%" cellpadding="4" cellspacing="0" style="font-size:13px;color:#1C1614;">
                  <tr><td style="color:#6B5C55;width:130px;">Product</td><td>FIOREN® Advanced Anti-Ageing Renewal Cream (50g)</td></tr>
                  <tr><td style="color:#6B5C55;">Quantity</td><td>${escHtml(String(qty))}</td></tr>
                  <tr><td style="color:#6B5C55;">${isCod ? 'Order Total' : 'Amount Paid'}</td><td><strong style="color:#7D5C4E;">${rupees}</strong></td></tr>
                  ${paymentId ? `<tr><td style="color:#6B5C55;">Payment ID</td><td style="font-size:12px;word-break:break-all;">${escHtml(paymentId)}</td></tr>` : ''}
                  <tr><td style="color:#6B5C55;">Order ID</td><td style="font-size:12px;word-break:break-all;">${escHtml(orderId)}</td></tr>
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

async function sendOrderEmail({ name, email, phone, address, qty, amount, paymentMethod, paymentId, orderId }) {
  const transporter = createTransporter();
  const rupeesLabel  = (amount / 100).toLocaleString('en-IN');
  await transporter.sendMail({
    from:    `"FIOREN® Orders" <${process.env.GMAIL_USER}>`,
    to:      process.env.GMAIL_USER,
    subject: `New Order — ${name || 'Customer'} · ₹${rupeesLabel} · ${paymentMethod === 'COD' ? 'COD' : 'Prepaid'}`,
    html:    orderEmailHtml({ name, email, phone, address, qty, amount, paymentMethod, paymentId, orderId }),
  });
}

module.exports = { sendOrderEmail };

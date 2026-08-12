const crypto = require('crypto');

const PIXEL_ID  = '2243393852975173';
const GRAPH_URL = `https://graph.facebook.com/v19.0/${PIXEL_ID}/events`;

function sha256(value) {
  return crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');
}

// Meta expects phone digits only, with country code, no leading zero/plus.
// Every phone number collected on this site is a bare 10-digit Indian mobile number.
function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.length === 10 ? `91${digits}` : digits;
}

function clientIpFrom(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return fwd.split(',')[0].trim();
  return req.socket?.remoteAddress || '';
}

// Best-effort server-side mirror of a browser pixel event. Throws on failure —
// callers must wrap in try/catch, since a tracking failure must never break checkout.
async function sendMetaEvent({
  eventName,
  eventId,
  eventSourceUrl,
  email,
  phone,
  clientIp,
  clientUserAgent,
  fbp,
  fbc,
  value,
  currency,
  contentIds,
  contentName,
  numItems,
}) {
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) {
    console.error(`Meta CAPI: META_CAPI_ACCESS_TOKEN not set, skipping ${eventName}`);
    return;
  }

  const userData = {};
  if (email) userData.em = [sha256(email)];
  const normPhone = normalizePhone(phone);
  if (normPhone) userData.ph = [sha256(normPhone)];
  if (clientIp) userData.client_ip_address = clientIp;
  if (clientUserAgent) userData.client_user_agent = clientUserAgent;
  if (fbp) userData.fbp = fbp;
  if (fbc) userData.fbc = fbc;

  const customData = {};
  if (value != null) customData.value = value;
  if (currency) customData.currency = currency;
  if (contentIds) {
    customData.content_ids = contentIds;
    customData.content_type = 'product';
  }
  if (contentName) customData.content_name = contentName;
  if (numItems != null) customData.num_items = numItems;

  const payload = {
    data: [{
      event_name:        eventName,
      event_time:        Math.floor(Date.now() / 1000),
      event_id:          eventId,
      event_source_url:  eventSourceUrl,
      action_source:     'website',
      user_data:         userData,
      custom_data:        customData,
    }],
  };
  if (process.env.META_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_TEST_EVENT_CODE;
  }

  const res = await fetch(`${GRAPH_URL}?access_token=${encodeURIComponent(accessToken)}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Meta CAPI ${eventName} failed: ${res.status} — ${body}`);
  }
}

module.exports = { sendMetaEvent, clientIpFrom };

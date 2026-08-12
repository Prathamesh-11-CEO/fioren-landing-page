const { sendMetaEvent, clientIpFrom } = require('./_lib/metaCapi');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const { event_id, event_source_url, fbp, fbc } = req.body;
  if (!event_id) return res.status(400).json({ error: 'Missing event_id' });

  try {
    await sendMetaEvent({
      eventName:       'PageView',
      eventId:         event_id,
      eventSourceUrl:  event_source_url,
      clientIp:        clientIpFrom(req),
      clientUserAgent: req.headers['user-agent'],
      fbp,
      fbc,
    });
  } catch (err) {
    console.error('Meta CAPI PageView failed:', err.message);
  }

  res.json({ success: true });
};

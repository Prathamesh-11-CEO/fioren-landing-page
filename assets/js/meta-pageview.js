/* Fires PageView once — client pixel + server Conversions API mirror, same event_id.
   Requires the Meta base pixel snippet (fbq init) to already be loaded on the page,
   and must NOT be paired with an inline fbq('track', 'PageView') call — this replaces it. */
(function () {
  function getCookie(name) {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : '';
  }

  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  const eventId = uuid();

  if (typeof fbq === 'function') {
    fbq('track', 'PageView', {}, { eventID: eventId });
  }

  fetch('/api/track-pageview', {
    method:    'POST',
    headers:   { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      event_id:         eventId,
      event_source_url: window.location.href,
      fbp:              getCookie('_fbp'),
      fbc:              getCookie('_fbc'),
    }),
  }).catch(() => {});
})();

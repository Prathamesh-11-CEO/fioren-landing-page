/* Shared FIOREN610 urgency countdown — display-only, not enforced anywhere.
   Persists its deadline in sessionStorage so the same countdown carries
   through from the homepage to checkout instead of resetting per page. */
(function () {
  const DEADLINE_KEY = 'fioren_coupon_deadline';
  const DURATION_MS  = 2 * 60 * 60 * 1000; // 2 hours

  function getDeadline() {
    let deadline = parseInt(sessionStorage.getItem(DEADLINE_KEY), 10);
    if (!deadline || isNaN(deadline)) {
      deadline = Date.now() + DURATION_MS;
      sessionStorage.setItem(DEADLINE_KEY, String(deadline));
    }
    return deadline;
  }

  window.FiorenCouponTimer = {
    start(elId) {
      const el = document.getElementById(elId);
      if (!el) return;
      const deadline = getDeadline();
      let interval;

      function render() {
        const remaining = Math.max(0, Math.round((deadline - Date.now()) / 1000));
        el.style.display = 'block';
        if (remaining > 0) {
          const h = String(Math.floor(remaining / 3600)).padStart(2, '0');
          const m = String(Math.floor((remaining % 3600) / 60)).padStart(2, '0');
          const s = String(remaining % 60).padStart(2, '0');
          el.textContent = `⏰ Offer expires in ${h}:${m}:${s}`;
        } else {
          el.textContent = '⏰ Offer expired';
          clearInterval(interval);
        }
      }
      render();
      interval = setInterval(render, 1000);
    },
  };
})();

function getParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name) || '';
}
function formatRM(amount) {
  try {
    const n = Number(amount || 0);
    return `RM ${n.toFixed(2)}`;
  } catch (_) {
    return `RM 0.00`;
  }
}
document.addEventListener('DOMContentLoaded', () => {
  const orderId = getParam('order_id');
  const orderRef = getParam('order_ref');
  const amount = getParam('amount');
  const timeLeftEl = document.getElementById('pay-time-left');
  const refEl = document.getElementById('pay-order-ref');
  if (refEl) refEl.textContent = orderId || '—';
  const amtEl = document.getElementById('pay-amount');
  if (amtEl) amtEl.textContent = formatRM(amount);
  const copyBtn = document.getElementById('copy-order-ref');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const val = (refEl && refEl.textContent ? refEl.textContent : '').trim();
      if (!val) return;
      let ok = false;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try { await navigator.clipboard.writeText(val); ok = true; } catch (_) {}
      }
      if (!ok) {
        try {
          const ta = document.createElement('textarea');
          ta.value = val;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.focus();
          ta.select();
          ok = document.execCommand('copy');
          document.body.removeChild(ta);
        } catch (_) {}
      }
      if (ok) {
        const old = copyBtn.textContent;
        copyBtn.textContent = 'Copied';
        setTimeout(() => { copyBtn.textContent = old || 'Copy'; }, 1200);
      }
    });
  }
  const env = window.__ENV || {};
  const qrUrl = env.DUITNOW_QR_URL || 'public/duitnow-qr.jpg';
  const img = document.getElementById('duitnow-qr');
  const placeholder = document.getElementById('qr-placeholder');
  if (qrUrl && img) {
    img.src = qrUrl;
    img.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    img.onerror = () => {
      img.style.display = 'none';
      if (placeholder) {
        placeholder.textContent = 'QR image not found. Please contact support.';
        placeholder.style.display = 'block';
      }
    };
  }
  // bump cart badge to 0 on this page
  const badge = document.querySelector('.cart-link .badge');
  if (badge) badge.textContent = '0';
  // amount is already shown in the info section
  const client = window.supabaseClient;
  const ensureClient = () => {
    if (window.supabaseClient) return Promise.resolve(window.supabaseClient);
    return new Promise((resolve) => {
      window.addEventListener('supabase-ready', () => resolve(window.supabaseClient), { once: true });
    });
  };
  function fmt(ms) {
    if (!Number.isFinite(ms) || ms <= 0) return '00:00';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }
  async function cancelIfUnpaid(c, id) {
    try {
      const { data: payments } = await c.from('payments').select('status').eq('order_id', id).order('created_at', { ascending: false }).limit(1);
      const paid = Array.isArray(payments) && payments.length && String(payments[0].status || '').toLowerCase() === 'paid';
      if (paid) return false;
      await c.from('orders').update({ status: 'cancelled' }).eq('id', id);
      return true;
    } catch (_) { return false; }
  }
  async function isPaid(c, id) {
    try {
      const { data: payments } = await c.from('payments').select('status').eq('order_id', id).order('created_at', { ascending: false }).limit(1);
      const paid = Array.isArray(payments) && payments.length && String(payments[0].status || '').toLowerCase() === 'paid';
      if (paid) return true;
      const { data: order } = await c.from('orders').select('status').eq('id', id).single();
      return order && String(order.status || '').toLowerCase() === 'paid';
    } catch (_) { return false; }
  }
  function showPaidAndRedirect(id) {
    const img = document.getElementById('duitnow-qr');
    const placeholder = document.getElementById('qr-placeholder');
    const info = document.querySelector('.pay-info');
    const paid = document.getElementById('paid-wrap');
    if (img) img.style.display = 'none';
    if (placeholder) placeholder.style.display = 'none';
    if (info) info.style.display = 'none';
    if (paid) paid.style.display = 'block';
    setTimeout(() => {
      window.location.href = `order-status.html?id=${encodeURIComponent(id)}`;
    }, 1500);
  }
  (async () => {
    const c = await ensureClient();
    if (!c || !orderId) return;
    try {
      const { data: pays } = await c.from('payments').select('amount').eq('order_id', orderId).order('created_at', { ascending: false }).limit(1);
      let amt = 0;
      if (Array.isArray(pays) && pays.length && Number.isFinite(Number(pays[0].amount))) {
        amt = Number(pays[0].amount);
      } else {
        const { data: ord } = await c.from('orders').select('total_amount').eq('id', orderId).single();
        if (ord && Number.isFinite(Number(ord.total_amount))) amt = Number(ord.total_amount);
      }
      if (amtEl) amtEl.textContent = formatRM(amt);
    } catch (_) {}
    const { data: order } = await c.from('orders').select('id,created_at,status').eq('id', orderId).single();
    if (!order || !order.created_at) return;
    const refEl2 = document.getElementById('pay-order-ref');
    if (refEl2) refEl2.textContent = order.id || orderId;
    // immediate paid check
    if (await isPaid(c, orderId)) {
      showPaidAndRedirect(orderId);
      return;
    }
    const created = new Date(order.created_at).getTime();
    const TTL = 30 * 60 * 1000;
    function tick() {
      const now = Date.now();
      const left = created + TTL - now;
      if (timeLeftEl) timeLeftEl.textContent = fmt(left);
      // poll paid state
      isPaid(c, orderId).then((ok) => { if (ok) { clearInterval(intId); showPaidAndRedirect(orderId); } }).catch(() => {});
      if (left <= 0) {
        clearInterval(intId);
        cancelIfUnpaid(c, orderId).then((did) => {
          if (did) {
            const img = document.getElementById('duitnow-qr');
            const placeholder = document.getElementById('qr-placeholder');
            if (img) img.style.display = 'none';
            if (placeholder) {
              placeholder.textContent = 'Order cancelled: 30 minutes timeout.';
              placeholder.style.display = 'block';
            }
          }
        });
      }
    }
    tick();
    const intId = setInterval(tick, 1000);
  })();
});
